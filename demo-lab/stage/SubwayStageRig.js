
import {createStageLifecycle,StageLifecycle,hingeAudit} from './StageRig.js';
import {PAPER_STAGE_TIMING,phase,ripplePhase} from './StageTransitionTimeline.js';

export function createSubwayStageRig({stage,world,flags}={}){
  const lifecycle=createStageLifecycle('subway',StageLifecycle.ready);
  let anchorX=0;
  function setPiece(piece,fold,visible=true){
    const base=piece.baseRotationX??0;piece.group.rotation.x=base-fold*Math.PI*.5;piece.group.visible=!!visible&&fold<.9995;
  }
  function setAnchorX(value){
    if(Number.isFinite(value)){anchorX=value;stage.setAnchorX(value);world?.setAnchorX?.(value);}
  }
  function setLightWave(progress){
    progress=Math.max(0,Math.min(1,progress));
    for(const light of stage.lights??[]){
      const delay=Math.min(.20,Math.abs(light.position.x)/110*.20);
      const local=Math.max(0,Math.min(1,(progress-delay)/(1-delay||1)));
      light.intensity=(light.userData.baseIntensity??1.35)*local;light.visible=local>.01;
    }
  }
  function setLifecycle(next){lifecycle.set(next);stage.trainVehicle?.setEnabled?.(next===StageLifecycle.active);}
  function stableActive(){
    stage.root.visible=true;stage.floorCarrier.position.y=0;stage.backdropCarrier.position.y=0;stage.ceilingCarrier.position.y=0;
    for(const piece of stage.wallPieces)setPiece(piece,0,true);
    for(const piece of stage.fixturePieces)setPiece(piece,0,true);
    stage.trainGroup.visible=true;setLightWave(1);setLifecycle(StageLifecycle.active);
  }
  function stableDormant(){
    setLifecycle(StageLifecycle.dormant);stage.root.visible=false;setLightWave(0);
  }
  function poseEnter(t){
    setLifecycle(StageLifecycle.entering);const timing=PAPER_STAGE_TIMING.subway;stage.root.visible=t>.29;
    stage.floorCarrier.position.y=-3.25*(1-phase(t,timing.floor[0],timing.floor[1]));
    stage.backdropCarrier.position.y=-2.35*(1-phase(t,timing.backdrop[0],timing.backdrop[1]));
    stage.trainGroup.visible=t>.33;
    for(const piece of stage.wallPieces){
      const open=ripplePhase(t,piece.x,0,timing.walls[0],timing.walls[1],{range:96,spread:.11});setPiece(piece,1-open,open>.002);
    }
    for(const piece of stage.fixturePieces){
      const open=ripplePhase(t,piece.x,0,timing.fixtures[0],timing.fixtures[1],{range:96,spread:.12});setPiece(piece,1-open,open>.002);
    }
    stage.ceilingCarrier.position.y=(1-phase(t,timing.ceiling[0],timing.ceiling[1]))*3.45;
    setLightWave(phase(t,timing.lights[0],timing.lights[1]));
  }
  function poseExit(t){
    setLifecycle(StageLifecycle.exiting);stage.root.visible=true;setLightWave(1-phase(t,.00,.18));
    stage.ceilingCarrier.position.y=phase(t,.05,.25)*3.45;
    for(const piece of stage.fixturePieces){
      const fold=ripplePhase(t,piece.x,0,.13,.34,{range:96,spread:.10});setPiece(piece,fold,true);
    }
    for(const piece of stage.wallPieces){
      const fold=ripplePhase(t,piece.x,0,.19,.40,{range:96,spread:.10});setPiece(piece,fold,true);
    }
    stage.backdropCarrier.position.y=-2.35*phase(t,.30,.52);
    stage.floorCarrier.position.y=-3.25*phase(t,.38,.58);
    if(t>.62)stage.root.visible=false;
  }
  function updateDynamics(dt){
    if(lifecycle.state!==StageLifecycle.active)return false;
    const changed=stage.trainVehicle?.update?.(dt)??false;if(changed)flags.render=flags.depth=flags.ao=true;return changed;
  }
  function interaction(player){return lifecycle.state===StageLifecycle.active?stage.trainVehicle?.interaction?.(player)??null:null;}
  function board(){return stage.trainVehicle?.board?.()??null;}
  function disembark(){return stage.trainVehicle?.disembark?.()??null;}
  function updatePassenger(dt,input){return stage.trainVehicle?.updatePassenger?.(dt,input)??null;}
  function stats(){return {lifecycle:lifecycle.state,anchorX,...stage.stats(),vehicle:stage.trainVehicle?.stats?.()??null,
    pivotAudit:hingeAudit([stage.wallRoot,stage.fixtureRoot])};}
  return {stage,world,lifecycle,setAnchorX,setLifecycle,stableActive,stableDormant,poseEnter,poseExit,updateDynamics,interaction,board,disembark,updatePassenger,stats,
    get boarded(){return !!stage.trainVehicle?.boarded;}};
}

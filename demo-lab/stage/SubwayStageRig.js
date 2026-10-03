import {createStageLifecycle,StageLifecycle,hingeAudit} from './StageRig.js';
import {PAPER_STAGE_TIMING,phase,paperSettle,ripplePhase} from './StageTransitionTimeline.js';

export function createSubwayStageRig({stage,world,flags}={}){
  const lifecycle=createStageLifecycle('subway',StageLifecycle.ready);
  let anchorX=0;
  function responseFor(piece){
    const name=piece?.group?.name??'';
    if(name.includes('bench'))return .050;
    if(name.includes('Route map'))return .058;
    if(name.includes('pillar'))return .028;
    if(name.includes('Ticket'))return .034;
    if(name.includes('Emergency'))return .030;
    return .020;
  }
  function setPiece(piece,fold,visible=true){
    const base=piece.baseRotationX??0;piece.group.rotation.x=base-fold*Math.PI*.5;piece.group.visible=!!visible&&fold<1.055;
  }
  function setAnchorX(value){
    if(Number.isFinite(value)){anchorX=value;stage.setAnchorX(value);world?.setAnchorX?.(value);}
  }
  function setLightWave(progress){
    progress=Math.max(0,Math.min(1,progress));
    for(const light of stage.lights??[]){
      const distance=Math.abs(light.position.x);
      const delay=Math.min(.34,distance/110*.34);
      const local=Math.max(0,Math.min(1,(progress-delay)/(1-delay||1)));
      // Each paper lamp has a tiny ignition knee. It reads as a row of practical
      // stage lights waking up, not a global emissive fade.
      const lit=local<=.08?local/.08:1;
      light.intensity=(light.userData.baseIntensity??1.35)*lit;light.visible=local>.008;
    }
  }
  function setLifecycle(next){lifecycle.set(next);stage.trainVehicle?.setEnabled?.(next===StageLifecycle.active);}
  function stableActive(){
    stage.root.visible=true;stage.floorCarrier.position.y=0;stage.backdropCarrier.position.y=0;stage.ceilingCarrier.position.y=0;
    stage.floorGroup.visible=true;stage.backdropGroup.visible=true;
    for(const piece of stage.wallPieces)setPiece(piece,0,true);
    for(const piece of stage.fixturePieces)setPiece(piece,0,true);
    stage.trainGroup.visible=true;setLightWave(1);setLifecycle(StageLifecycle.active);
  }
  function stableDormant(){
    setLifecycle(StageLifecycle.dormant);stage.root.visible=false;setLightWave(0);
  }
  function poseEnter(t){
    setLifecycle(StageLifecycle.entering);const timing=PAPER_STAGE_TIMING.subway;
    stage.root.visible=t>timing.reveal;stage.floorCarrier.position.y=0;stage.backdropCarrier.position.y=0;
    stage.floorGroup.visible=t>timing.reveal;stage.backdropGroup.visible=t>timing.reveal+.035;
    // The deck already exists below the turning city page. The page reveals it;
    // the deck itself never rides upward.
    for(const piece of stage.wallPieces){
      const raw=ripplePhase(t,piece.x,0,timing.walls[0],timing.walls[1],{range:96,spread:.10});
      const open=paperSettle(raw,{overshoot:.018});setPiece(piece,1-open,raw>.002);
    }
    for(const piece of stage.fixturePieces){
      const raw=ripplePhase(t,piece.x,0,timing.fixtures[0],timing.fixtures[1],{range:96,spread:.11});
      const open=paperSettle(raw,{overshoot:responseFor(piece)});setPiece(piece,1-open,raw>.002);
    }
    stage.ceilingCarrier.position.y=(1-phase(t,timing.ceiling[0],timing.ceiling[1]))*3.15;
    setLightWave(phase(t,timing.lights[0],timing.lights[1]));
    // The first living object arrives only after the paper architecture and
    // practical lamps have explained the new space.
    stage.trainGroup.visible=t>timing.train;
  }
  function poseExit(t){
    setLifecycle(StageLifecycle.exiting);stage.root.visible=true;
    stage.floorCarrier.position.y=0;stage.backdropCarrier.position.y=0;
    stage.trainGroup.visible=t<.045;setLightWave(1-phase(t,.00,.15));
    stage.ceilingCarrier.position.y=phase(t,.055,.25)*3.15;
    for(const piece of stage.fixturePieces){
      const raw=ripplePhase(t,piece.x,0,.12,.35,{range:96,spread:.10});
      const fold=paperSettle(raw,{overshoot:responseFor(piece)});setPiece(piece,fold,true);
    }
    for(const piece of stage.wallPieces){
      const raw=ripplePhase(t,piece.x,0,.20,.43,{range:96,spread:.09});
      const fold=paperSettle(raw,{overshoot:.018});setPiece(piece,fold,true);
    }
    stage.floorGroup.visible=t<.60;stage.backdropGroup.visible=t<.57;
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
    paperMechanism:{deckLift:false,backdropLift:false,lightWave:'centre-out',materialSettle:true},
    pivotAudit:hingeAudit([stage.wallRoot,stage.fixtureRoot])};}
  return {stage,world,lifecycle,setAnchorX,setLifecycle,stableActive,stableDormant,poseEnter,poseExit,updateDynamics,interaction,board,disembark,updatePassenger,stats,
    get boarded(){return !!stage.trainVehicle?.boarded;}};
}

import {StageLifecycle} from './StageRig.js';
import {PAPER_STAGE_TIMING,phase} from './StageTransitionTimeline.js';

export function createStageDirector({THREE,scene,state,cityRig,subwayRig,cityWorld,subwayWorld,celestials,fog,backdrop,onInvalidate=()=>{}}={}){
  if(!scene||!cityRig||!subwayRig)throw new TypeError('StageDirector requires city and subway rigs.');
  const outdoorBackground=new THREE.Color(0x9ca1ad),subwayBackground=new THREE.Color(0x27333d);
  const transition={active:false,from:'city',to:'city',t:0,elapsed:0,duration:PAPER_STAGE_TIMING.duration,anchorX:0};
  let activeStage='city',currentPlayerX=0;
  function environmentFactor(outdoor){
    const factor=Math.max(0,Math.min(1,outdoor)),visible=factor>.08;
    scene.background.copy(subwayBackground).lerp(outdoorBackground,factor);
    const {sky,starField,starUniforms,sunDisc,moonDisc,sunGlow,moonGlow}=celestials;
    sky.visible=state.sky&&visible;starField.visible=state.sky&&visible&&starUniforms.strength.value>.002;
    sunGlow.visible=state.sky&&visible&&sunDisc.visible;moonGlow.visible=state.sky&&visible&&moonDisc.visible;
    fog.forestMist.visible=state.fog&&factor>.20;backdrop?.setSkyVisible?.(state.sky&&factor>.45);
  }
  function stable(){
    if(activeStage==='city'){cityRig.stableActive(currentPlayerX);subwayRig.stableDormant();environmentFactor(1);}
    else{cityRig.stableDormant();subwayRig.stableActive();environmentFactor(0);}
  }
  function switchTo(name,anchorX){
    if(!['city','subway'].includes(name)||transition.active||name===activeStage)return false;
    transition.active=true;transition.from=activeStage;transition.to=name;transition.t=0;transition.elapsed=0;
    transition.anchorX=Number.isFinite(anchorX)?anchorX:currentPlayerX;currentPlayerX=transition.anchorX;
    cityRig.capture(transition.anchorX);subwayRig.setAnchorX(transition.anchorX);
    cityRig.setLifecycle(name==='subway'?StageLifecycle.exiting:StageLifecycle.entering);
    subwayRig.setLifecycle(name==='subway'?StageLifecycle.entering:StageLifecycle.exiting);
    apply();onInvalidate();return true;
  }
  function apply(){
    if(!transition.active){stable();return;}
    const t=transition.t;
    if(transition.to==='subway'){
      cityRig.poseExit(t,transition.anchorX);subwayRig.poseEnter(t);
      // Keep the outdoor light until the street sheet is visibly turning.
      // Darkness belongs to the revealed underside, not to a pre-emptive fade.
      environmentFactor(1-phase(t,.40,.70));
    }else{
      subwayRig.poseExit(t);cityRig.poseEnter(t,transition.anchorX);
      environmentFactor(phase(t,.45,.76));
    }
  }
  function update(dt,playerX){
    if(Number.isFinite(playerX))currentPlayerX=playerX;
    if(transition.active){
      transition.elapsed+=Math.max(0,Number(dt)||0);transition.t=Math.min(1,transition.elapsed/transition.duration);apply();
      if(transition.t>=1){
        activeStage=transition.to;transition.active=false;state.activeStage=activeStage;stable();onInvalidate();
      }
      return true;
    }
    if(activeStage==='city')return cityRig.updateDynamics(dt,playerX);
    return subwayRig.updateDynamics(dt);
  }
  function getWorld(){return activeStage==='subway'?subwayWorld:cityWorld;}
  function getInteraction(player){
    if(transition.active||activeStage!=='subway')return null;
    return subwayRig.interaction(player);
  }
  function boardTrain(){return activeStage==='subway'&&!transition.active?subwayRig.board():null;}
  function disembarkTrain(){return activeStage==='subway'&&!transition.active?subwayRig.disembark():null;}
  function updateTrainPassenger(dt,input){return activeStage==='subway'&&!transition.active?subwayRig.updatePassenger(dt,input):null;}
  function stats(){
    return {activeStage,target:transition.active?transition.to:activeStage,transition:{...transition},
      city:cityRig.stats(),subway:subwayRig.stats(),trainBoarded:subwayRig.boarded};
  }
  transition.anchorX=0;state.activeStage='city';stable();
  return {switchTo,update,apply,getWorld,getInteraction,boardTrain,disembarkTrain,updateTrainPassenger,stats,
    get activeStage(){return activeStage;},get transitioning(){return transition.active;},get target(){return transition.active?transition.to:activeStage;},
    get transition(){return {...transition};},get trainBoarded(){return subwayRig.boarded;}};
}

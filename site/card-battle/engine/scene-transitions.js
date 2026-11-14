/* Reusable scene transition state machine: exit -> replace -> enter.
 * Owns timing only. The caller swaps world geometry/assets at the concealed
 * midpoint; gameplay/units/turn/decks remain authoritative and untouched.
 */
(function(root){
'use strict';
function create(config={}){
 const names=config.scenes||['forest','clearing'];
 if(!Array.isArray(names)||names.length<2)throw Error('Scene transitions need 2+ scenes');
 const exitDuration=Math.max(.05,config.exitDuration??.68);
 const enterDuration=Math.max(.05,config.enterDuration??1.12);
 let scene=config.initial||names[0],phase='idle',target=null,start=0,completed=0;
 if(!names.includes(scene))throw Error('Unknown initial scene');
 function snapshot(at=0){
  const duration=phase==='exiting'?exitDuration:phase==='entering'?enterDuration:0;
  const progress=duration?Math.min(1,Math.max(0,(at-start)/duration)):1;
  return{scene,target,phase,progress,busy:phase!=='idle',completed};
 }
 function begin(next,at=0){
  if(phase!=='idle'||!names.includes(next)||next===scene)return false;
  target=next;start=at;phase='exiting';
  config.onExit?.(scene,next,at);return true;
 }
 function toggle(at=0){const next=names[(names.indexOf(scene)+1)%names.length];return begin(next,at);}
 function update(at){
  if(phase==='exiting'&&at-start>=exitDuration){
   const old=scene;scene=target;
   // Never swap textures/meshes mid-draw. update is called at frame start.
   config.onSwap?.(old,scene,at);
   phase='entering';start=at;
   config.onEnter?.(old,scene,at);
  }else if(phase==='entering'&&at-start>=enterDuration){
   target=null;phase='idle';completed++;
   config.onComplete?.(scene,at);
  }
  return snapshot(at);
 }
 function reset(to=names[0]){
  if(!names.includes(to))throw Error('Unknown scene');
  scene=to;target=null;start=0;phase='idle';
 }
 return Object.freeze({begin,toggle,update,reset,snapshot,
  get phase(){return phase;},get scene(){return scene;},get busy(){return phase!=='idle';}});
}
root.PaperchalkSceneTransitions=Object.freeze({version:'1.0.0',create});
})(window);

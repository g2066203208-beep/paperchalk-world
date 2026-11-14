/* Physically readable reversible seven-bay card-case kinematics.
 * X0 is the full-width rear-edge hinge. X1 passes through the lid panel center.
 * Both axes are HORIZONTAL and PARALLEL; never twist the panel around Y.
 * The hand is permanently attached to the panel's same inner surface.
 */
(function(root){
'use strict';
const PI=Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const OPEN_ANGLE=2.49; // 142.7deg: leans behind the tray, cards stay legible
function create(options={}){
 const openSeconds=options.openSeconds??1.05;
 const closeSeconds=options.closeSeconds??1.38;
 const resetSeconds=options.resetSeconds??.60;
 let phase='closed',started=0,clock=0,cycle=0;
 const handCount=()=>Number(options.handCount?.()||0);
 function duration(p){return p==='opening'?openSeconds:p==='closing'?closeSeconds:p==='rewinding'?resetSeconds:0;}
 function samplePose(p,t=0){
  const u=smooth(t),opening=p==='opening',drawing=p==='drawing',
   closing=p==='closing',playing=p==='playing',rewinding=p==='rewinding';
  const hingeAngle=opening?OPEN_ANGLE*u:
   drawing?OPEN_ANGLE:closing?OPEN_ANGLE*(1-u):0;
  const panelAngle=closing?PI*u:playing?PI:rewinding?PI*(1-u):0;
  // In the second half the panel compensates for the rear hinge closure.
  // Thus cards never spin edge-on like a sword and never need repositioning.
  return{phase:p,angle:hingeAngle,faceSpin:panelAngle,hingeAngle,
   panelAngle,openAngle:OPEN_ANGLE,progress:u,
   open:opening||drawing||closing,canDraw:drawing,canPlay:playing,
   canOpen:p==='closed',busy:opening||closing||rewinding};
 }
 function snapshot(at=clock){
  const dur=duration(phase);
  const t=dur?clamp((at-started)/dur,0,1):phase==='drawing'||phase==='playing'?1:0;
  return{...samplePose(phase,t),cycle,handCount:handCount()};
 }
 function update(at){
  clock=Number.isFinite(at)?at:clock;
  let dur=duration(phase);
  if(dur&&clock-started>=dur){
   if(phase==='opening')phase='drawing';
   else if(phase==='closing')phase='playing';
   else if(phase==='rewinding')phase='closed';
   started=clock;dur=duration(phase);
  }
  return snapshot(clock);
 }
 function open(at=clock){update(at);if(phase!=='closed')return false;
  phase='opening';started=clock;return true;}
 function confirm(at=clock){update(at);if(phase!=='drawing'||handCount()===0||
  options.canConfirm?.()===false)return false;
  phase='closing';started=clock;return true;}
 function nextTurn(at=clock){update(at);if(phase!=='playing'||options.canEnd?.()===false)return false;
  phase='rewinding';started=clock;cycle++;return true;}
 function reset(at=clock){phase='closed';started=at;clock=at;cycle=0;}
 return Object.freeze({open,confirm,nextTurn,reset,update,snapshot,samplePose,
  get phase(){return phase;},get canDraw(){return phase==='drawing';},
  get canPlay(){return phase==='playing';},get openAngle(){return OPEN_ANGLE;}});
}
root.PaperchalkFlipCase=Object.freeze({version:'2.0.0',create,OPEN_ANGLE});
if(typeof module!=='undefined'&&module.exports)module.exports={create,OPEN_ANGLE};
})(typeof window!=='undefined'?window:globalThis);

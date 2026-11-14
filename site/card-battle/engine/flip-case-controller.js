/* Reversible flip-lid case: open to draft into inner lid, rotate face outward
 * while closing, then play directly from the SAME physical lid surface.
 * No card is copied, reordered, or sent into a separate HTML hand overlay.
 */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t*t*(3-2*t);
function create(options={}){
 const openSeconds=options.openSeconds??.88,closeSeconds=options.closeSeconds??1.06;
 let phase='closed',started=0,clock=0,cycle=0;
 const handCount=()=>Number(options.handCount?.()||0);
 function update(at){
  clock=Number.isFinite(at)?at:clock;
  if(phase==='opening'&&clock-started>=openSeconds){phase='drawing';started=clock;}
  if(phase==='closing'&&clock-started>=closeSeconds){phase='playing';started=clock;}
  return snapshot(clock);
 }
 function snapshot(at=clock){
  const t=phase==='opening'?ease(clamp((at-started)/openSeconds,0,1)):
    phase==='closing'?ease(clamp((at-started)/closeSeconds,0,1)):0;
  const opening=phase==='opening',drawing=phase==='drawing',closing=phase==='closing';
  const angle=opening?Math.PI*t:drawing?Math.PI:closing?Math.PI*(1-t):0;
  const faceSpin=closing?Math.PI*t:phase==='playing'?Math.PI:0;
  return{phase,angle,faceSpin,progress:t,cycle,handCount:handCount(),
   open:opening||drawing||closing,canDraw:drawing,canPlay:phase==='playing',
   canOpen:phase==='closed',busy:opening||closing};
 }
 function open(at=clock){
  update(at);if(phase!=='closed')return false;
  phase='opening';started=clock;return true;
 }
 function confirm(at=clock){
  update(at);if(phase!=='drawing'||handCount()===0||options.canConfirm?.()===false)return false;
  phase='closing';started=clock;return true;
 }
 function nextTurn(at=clock){
  update(at);
  if(phase!=='playing'||options.canEnd?.()===false)return false;
  phase='closed';started=clock;cycle++;return true;
 }
 function reset(at=clock){phase='closed';started=at;clock=at;cycle=0;}
 return Object.freeze({open,confirm,nextTurn,reset,update,snapshot,
  get phase(){return phase;},get canDraw(){return phase==='drawing';},
  get canPlay(){return phase==='playing';}});
}
root.PaperchalkFlipCase=Object.freeze({version:'1.0.0',create});
if(typeof module!=='undefined'&&module.exports)module.exports={create};
})(typeof window!=='undefined'?window:globalThis);

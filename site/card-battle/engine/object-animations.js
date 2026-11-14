/* Paperchalk reusable WORLD OBJECT entrance/exit animation controller.
 * Scene/game state stays authoritative. This only supplies reversible visual
 * scale and opacity for 3D meshes, cards, props and terrain cells.
 * Anchoring is the renderer's responsibility (floor pivot for terrain/trees).
 */
(function(root){
'use strict';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{const q=clamp(x);return q*q*(3-2*q);};
function create(options={}){
 const motion=options.reducedMotion===true?false:true;
 const tracks=new Map();
 const defaults=Object.freeze({
  appear:.52,disappear:.38,pulse:.40,overshoot:1.48
 });
 function enter(id,at=0,opts={}){
  if(!id)throw Error('Animated object requires a stable id');
  const duration=Number.isFinite(opts.duration)?Math.max(.01,opts.duration):defaults.appear;
  const delay=Math.max(0,opts.delay||0);
  tracks.set(id,{kind:'enter',start:at+delay,duration,
   overshoot:Number.isFinite(opts.overshoot)?opts.overshoot:defaults.overshoot});
  return id;
 }
 function exit(id,at=0,opts={}){
  if(!id)throw Error('Animated object requires a stable id');
  const duration=Number.isFinite(opts.duration)?Math.max(.01,opts.duration):defaults.disappear;
  const previous=sample(id,at);
  tracks.set(id,{kind:'exit',start:at,duration,from:previous.scale});
  return id;
 }
 function pulse(id,at=0,opts={}){
  if(!id)throw Error('Animated object requires a stable id');
  tracks.set(id,{kind:'pulse',start:at,duration:Math.max(.01,opts.duration??defaults.pulse),
   strength:clamp(opts.strength??.14,.01,.3)});
  return id;
 }
 function sample(id,at=0){
  const a=tracks.get(id);
  if(!a||!motion)return{scale:1,opacity:1,phase:'steady',done:true};
  if(at<a.start){
   return a.kind==='enter'
    ?{scale:.025,opacity:0,phase:'queued',done:false}
    :{scale:1,opacity:1,phase:'steady',done:false};
  }
  const q=clamp((at-a.start)/a.duration);
  if(a.kind==='enter'){
   if(q>=1)return{scale:1,opacity:1,phase:'steady',done:true};
   // Out-back ease: overshoot around 70%, then a soft return to 1.
   const c=a.overshoot,p=q-1;
   const s=clamp(1+(c+1)*p*p*p+c*p*p,.025,1.18);
   return{scale:s,opacity:smooth(q*3.2),phase:'enter',done:false};
  }
  if(a.kind==='exit'){
   if(q>=1)return{scale:.025,opacity:0,phase:'gone',done:true};
   return{scale:Math.max(.025,a.from*(1-smooth(q))*(1-.055*Math.sin(Math.PI*q))),
    opacity:1-smooth(Math.max(0,(q-.50)*2)),phase:'exit',done:false};
  }
  if(q>=1)return{scale:1,opacity:1,phase:'steady',done:true};
  return{scale:1+a.strength*Math.sin(Math.PI*q)*Math.cos(q*.75),
   opacity:1,phase:'pulse',done:false};
 }
 function state(id,at){return sample(id,at);}
 function finished(id,at){const a=tracks.get(id);return !!a&&a.kind==='exit'&&sample(id,at).done;}
 function clear(id){tracks.delete(id);}
 function reset(){tracks.clear();}
 function stats(at=0){
  let entering=0,leaving=0,pulsing=0;
  for(const [id,a] of tracks){const q=sample(id,at);if(q.done)continue;
   if(a.kind==='enter')entering++;else if(a.kind==='exit')leaving++;else pulsing++;
  }
  return{tracked:tracks.size,entering,leaving,pulsing,reducedMotion:!motion};
 }
 return Object.freeze({enter,exit,pulse,sample,state,finished,clear,reset,stats,
  version:'1.0.0'});
}
root.PaperchalkObjectAnimations=Object.freeze({version:'1.0.0',create});
})(window);

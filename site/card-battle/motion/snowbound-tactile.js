/*
 * Snowbound Journey: living-paper tactile hand.
 * Original scene and Anima art are unchanged. This module only presents
 * continuous time-based response to actual pointer input. Based on observed
 * Balatro/Wildfrost tactile principles, NOT falsely claimed source keyframes.
 * Original GIF timing applies to deal/flip in snowbound-motion.js instead.
 */
(function(root){
 "use strict";
 const app=document.getElementById("app");
 if(!app)return;
 const states=new Map();
 const TAU_IN=92,TAU_OUT=175; // experimental tuning, not original-game timing
 const MAX_RX=6.2,MAX_RY=8.4;
 let frame=0,last=0,revision=0;
 const reduce=()=>root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const select=(target)=>target instanceof Element ? target.closest(".battle-scene .battle-bottom .hand>button"):null;
 function state(el){
  let s=states.get(el);
  if(!s){s={el,rx:0,ry:0,tx:0,ty:0,lightX:50,lightY:45,targetX:50,targetY:45,
      active:false,moving:false,velocity:0,lastX:0,lastY:0,updates:0};
   states.set(el,s);
  }
  // Do not hijack the original card's ::before engraved frame: a separate
  // material foil lives inside it, preserving the carefully drawn rim.
  const paint=el.querySelector(".paint-card.compact");
  if(paint&&!paint.querySelector(".tactile-foil")){
    const foil=document.createElement("span");
    foil.className="tactile-foil";
    foil.setAttribute("aria-hidden","true");
    paint.append(foil);
  }
  return s;
 }
 function approach(current,target,alpha){return current+(target-current)*alpha}
 function update(timestamp){
  frame=0;
  if(document.hidden||reduce()){resetAll();return}
  const dt=last?clamp(timestamp-last,0,50):16.7;last=timestamp;
  let continuing=false;
  for(const [el,s] of states){
   if(!el.isConnected||!el.closest(".battle-scene")){
    states.delete(el);continue;
   }
   const a=1-Math.exp(-dt/(s.active?TAU_IN:TAU_OUT));
   s.rx=approach(s.rx,s.active?s.tx:0,a);
   s.ry=approach(s.ry,s.active?s.ty:0,a);
   s.lightX=approach(s.lightX,s.active?s.targetX:50,a);
   s.lightY=approach(s.lightY,s.active?s.targetY:45,a);
   s.velocity=approach(s.velocity,0,Math.min(.95,a*.65));
   const tilt=clamp(s.velocity*.11,-2.1,2.1);
   const paint=el.querySelector(".paint-card.compact");
   if(paint){
    paint.style.setProperty("--tactile-rx",s.rx.toFixed(2)+"deg");
    paint.style.setProperty("--tactile-ry",(s.ry+tilt).toFixed(2)+"deg");
    paint.style.setProperty("--tactile-light-x",s.lightX.toFixed(1)+"%");
    paint.style.setProperty("--tactile-light-y",s.lightY.toFixed(1)+"%");
    paint.style.setProperty("--tactile-sheen",s.active?".64":"0");
   }
   s.updates++;revision++;
   if(s.active||Math.abs(s.rx)+Math.abs(s.ry)>0.06||
      Math.abs(s.lightX-50)+Math.abs(s.lightY-45)>.18||
      Math.abs(s.velocity)>.05)continuing=true;
   else{
    if(paint){
     for(const name of ["--tactile-rx","--tactile-ry","--tactile-light-x",
       "--tactile-light-y","--tactile-sheen"])paint.style.removeProperty(name);
    }
    states.delete(el);
   }
  }
  if(continuing)frame=requestAnimationFrame(update);else last=0;
 }
 function start(){if(!frame&&!document.hidden&&!reduce())frame=requestAnimationFrame(update)}
 function reset(el){
  const s=states.get(el);if(!s)return;
  s.active=false;s.tx=s.ty=0;s.targetX=50;s.targetY=45;
  start();
 }
 function resetAll(){
  for(const [el,s] of states){
   const paint=el.querySelector(".paint-card.compact");
   if(paint)for(const name of ["--tactile-rx","--tactile-ry","--tactile-light-x",
     "--tactile-light-y","--tactile-sheen"])paint.style.removeProperty(name);
  }
  states.clear();frame=0;last=0;
 }
 function move(el,event){
  if(!el||reduce()||el.disabled)return;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const xx=clamp((event.clientX-r.left)/r.width,0,1);
  const yy=clamp((event.clientY-r.top)/r.height,0,1);
  const s=state(el);
  s.active=true;
  s.tx=(.5-yy)*2*MAX_RX;
  s.ty=(xx-.5)*2*MAX_RY;
  s.targetX=xx*100;
  s.targetY=yy*100;
  if(s.moving)s.velocity=clamp(event.clientX-s.lastX,-20,20);
  s.lastX=event.clientX;s.lastY=event.clientY;s.moving=true;
  start();
 }
 app.addEventListener("pointerover",event=>{
  if(event.pointerType==="touch")return;
  const el=select(event.target);
  if(el)move(el,event);
 },{passive:true});
 app.addEventListener("pointermove",event=>{
  if(event.pointerType==="touch")return;
  const el=select(event.target);
  if(el)move(el,event);
 },{passive:true});
 // A fast pointer move can skip the button's pointerout dispatch in
 // Chromium while an overlay/drag snapshot is being promoted. Monitor at
 // the window edge too, so card-tilt cannot remain permanently active.
 root.addEventListener("pointermove",event=>{
  if(event.pointerType==="touch")return;
  const hovered=select(event.target);
  for(const [el,s] of states){
   if(s.active&&el!==hovered)reset(el);
  }
 },{passive:true});
 root.addEventListener("pointerleave",()=>{
  for(const [el,s] of states)if(s.active)reset(el);
 },{passive:true});
 app.addEventListener("pointerout",event=>{
  const from=select(event.target),to=select(event.relatedTarget);
  if(from&&from!==to)reset(from);
 },{passive:true});
 app.addEventListener("pointerdown",event=>{
  const el=select(event.target);
  if(!el||event.button!==0)return;
  if(event.pointerType==="touch")move(el,event);
 },{passive:true});
 for(const evt of ["pointerup","pointercancel"])app.addEventListener(evt,event=>{
  const el=select(event.target);
  if(el&&event.pointerType==="touch")reset(el);
 },{passive:true});
 window.addEventListener("blur",resetAll,{passive:true});
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden)resetAll();else last=0;
 },{passive:true});
 const media=root.matchMedia?.("(prefers-reduced-motion: reduce)");
 media?.addEventListener?.("change",()=>{if(media.matches)resetAll()});
 root.PaperchalkTactile=Object.freeze({
  debug:()=>({active:states.size,frames:revision,reduced:reduce(),sample:[...states.values()].map(s=>({
    rx:s.rx,ry:s.ry,x:s.lightX,y:s.lightY,updates:s.updates,active:s.active}))})
 });
})(window);

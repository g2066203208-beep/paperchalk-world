/* Universal L2D game renderer. Every registered actor is painted onto an animated
   canvas; its <img> is an invisible asset/layout/DEV hit target, never the visual. */
(function(){
'use strict';
const rigs=new Map(),profiles=new Map();
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
function install(root){
 if(!root||rigs.has(root))return;
 const img=root.querySelector('[data-l2d-image]');
 const canvas=root.querySelector('[data-l2d-canvas]');
 if(!img||!canvas)return;
 const id=root.dataset.l2dActor;
 const obj={id,root,img,canvas,rig:null,loading:0,hasParts:false,lastSource:'',profile:{amplitude:.55,period:4.8,softness:1}};
 rigs.set(root,obj);
 img.addEventListener('load',()=>refresh(obj));
 img.addEventListener('error',()=>{root.dataset.l2dState='error';});
 if(img.complete&&img.naturalWidth)refresh(obj);
}
async function refresh(obj){
 const n=++obj.loading;
 if(!obj.img.naturalWidth)return;
 try{
  obj.root.dataset.l2dState='loading';
  if(!obj.rig){
   obj.rig=new window.PaperchalkL2DRig(obj.img,obj.canvas,{
    amplitude:obj.profile.amplitude,period:obj.profile.period,
    softness:obj.profile.softness,cleanup:true,playing:true
   });
   await obj.rig.ready;
   obj.rig.start();
  }else{
   await obj.rig.setImage(obj.img);
  }
  if(n!==obj.loading)return;
  obj.hasParts=false;
  obj.rig.animatedFrames=!!obj.animated;
  obj.root.dataset.l2dState='ready';
  obj.lastSource=obj.img.currentSrc||obj.img.src;
 }catch(error){
  obj.root.dataset.l2dState='error';
  console.warn('[L2D] source failed for',obj.id,error);
 }
}
function entries(){return [...rigs.values()];}
function target(slot){
 return entries().find(x=>x.id===slot)||entries().find(x=>x.root.id===slot)||null;
}
function setProfile(slot,values){
 const a=target(slot);if(!a)return false;
 for(const name of ['amplitude','period','softness']){
  if(values[name]!==undefined&&Number.isFinite(Number(values[name])))
   a.profile[name]=clamp(Number(values[name]),name==='period'?2:0,name==='period'?12:2);
 }
 if(a.rig){
  a.rig.setAmplitude(a.profile.amplitude);
  a.rig.setPeriod(a.profile.period);
  a.rig.setSoftness(a.profile.softness);
 }
 return true;
}
async function setLayers(slot,parts,canvasSize){
 const a=target(slot);if(!a||!a.rig)return false;
 const nonce=++a.loading;
 // Source parts are decoded independently, with the exact full-canvas
 // x/y coordinates supplied by the character's PSD / editing project.
 const layers=await Promise.all(parts.map(async p=>{
  if(p.canvas&&typeof p.canvas.getContext==='function')return {image:p.canvas,x:Number(p.x)||0,y:Number(p.y)||0,opacity:Number(p.opacity??1),visible:p.visible!==false,name:String(p.name||'')};
  if(typeof p.image!=='string'||!p.image.startsWith('data:image/'))return null;
  const im=new Image();
  await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=p.image;});
  return {image:im,x:Number(p.x)||0,y:Number(p.y)||0,
    opacity:Number(p.opacity??1),visible:p.visible!==false,name:String(p.name||'')};
 }));
 if(nonce!==a.loading)return false;
 await a.rig.setLayers(layers.filter(Boolean),canvasSize||[1024,1024]);
 if(nonce!==a.loading)return false;
 a.hasParts=true;a.root.dataset.l2dState='ready';return true;
}
function markAnimation(slot,enabled){
 const a=target(slot);if(!a)return;
 a.animated=!!enabled;
 if(a.rig)a.rig.animatedFrames=!!enabled;
}
function sync(){
 for(const a of entries()){
  // Original invisible image remains authoritative for the layout and
  // current DEV drag handles; the animated canvas follows its geometry.
  const w=a.img.offsetWidth,h=a.img.offsetHeight;
  if(a.canvas.style.left!==(a.img.offsetLeft+'px'))a.canvas.style.left=a.img.offsetLeft+'px';
  if(a.canvas.style.top!==(a.img.offsetTop+'px'))a.canvas.style.top=a.img.offsetTop+'px';
  if(a.canvas.style.width!==(w+'px'))a.canvas.style.width=w+'px';
  if(a.canvas.style.height!==(h+'px'))a.canvas.style.height=h+'px';
  if(a.rig)a.rig.setPaused(document.hidden||a.root.hidden||a.img.hidden||!a.img.getAttribute('src'));
 }
 requestAnimationFrame(sync);
}
function scan(){
 document.querySelectorAll('[data-l2d-actor]').forEach(install);
}
scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
requestAnimationFrame(sync);
window.PaperchalkL2D={
 get:slot=>target(slot),
 getLoaded:()=>entries().filter(a=>!!a.img.getAttribute('src')),
 setProfile,setLayers,markAnimation,
 refresh:slot=>{const a=target(slot);return a?refresh(a):Promise.resolve(false)}
};
})();
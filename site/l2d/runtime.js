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
 const obj={id,root,img,canvas,rig:null,clip:null,clipFrame:0,loading:0,hasParts:false,lastSource:'',profile:{amplitude:.55,period:4.8,softness:1}};
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
    softness:obj.profile.softness,cleanup:true,playing:true,
    featurePreset:obj.img.dataset.characterId==='protagonist'&&obj.img.dataset.characterSide==='front'?'heroine-front':'generic'
   });
   await obj.rig.ready;
   if(!obj.clip)obj.rig.start();
  }else{
   await obj.rig.setImage(obj.img);
  }
  if(n!==obj.loading)return;
  obj.hasParts=false;
  obj.rig.featurePreset=obj.img.dataset.characterId==='protagonist'&&obj.img.dataset.characterSide==='front'?'heroine-front':'generic';
  obj.rig.blinkEnabled=obj.rig.featurePreset==='heroine-front';
  obj.rig.animatedFrames=!!obj.animated;
  if(obj.clip)obj.rig.stop();
  obj.root.dataset.l2dState='ready';
  if(!obj.clip)obj.root.dataset.l2dMode='procedural-multinode';
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
  a.rig.featurePreset=a.img.dataset.characterId==='protagonist'&&a.img.dataset.characterSide==='front'?'heroine-front':'generic';
  a.rig.blinkEnabled=a.rig.featurePreset==='heroine-front';
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
/* V4 source clips are animated transparent WebP generated from original
   PSD parts, not a static rear image. They are positioned at the exact
   1024x1024 crop origin used by the approved V4 render: (351,9). */
async function setAnimationSource(slot,uri,opts={}){
 const obj=target(slot);if(!obj)return false;
 // New selection invalidates any pending asynchronous frame from the old actor.
 const nonce=++obj.loading;
 if(obj.clip?.decoder)try{obj.clip.decoder.close()}catch(_){}
 if(obj.clip?.img?.parentElement)obj.clip.img.remove();
 obj.clip=null;
 if(!uri){
  obj.root.dataset.l2dMode='procedural-multinode';
  if(obj.rig){obj.rig.setAmplitude(obj.profile.amplitude);obj.rig.start()}
  return true;
 }
 const origin={x:Number(opts.x??351),y:Number(opts.y??9),w:Number(opts.w??335),h:Number(opts.h??1013)};
 // Decode the original V4 128-frame WebP on the game clock. Unlike relying
 // on an <img> with hidden/low opacity or drawImage(img), this guarantees
 // independent frames in Chromium, incl. headless browser tests.
 if(typeof ImageDecoder==='function'){
  let decoder=null;
  try{
   const resp=await fetch(uri);
   if(!resp.ok)throw Error('V4 WebP HTTP '+resp.status);
   const bytes=await resp.arrayBuffer();
   if(nonce!==obj.loading)return false;
   decoder=new ImageDecoder({data:bytes,type:'image/webp',preferAnimation:true});
   await decoder.tracks.ready;
   const count=decoder.tracks.selectedTrack?.frameCount||0;
   if(count>1){
    obj.clip={type:'decoder',decoder,count,frame:-1,decoding:false,start:undefined,nonce,...origin};
    if(obj.rig)obj.rig.stop();
    obj.canvas.getContext('2d').clearRect(0,0,obj.canvas.width,obj.canvas.height);
    obj.root.dataset.l2dState='ready';obj.root.dataset.l2dMode='v4-decoder';
    return true;
   }
   decoder.close();decoder=null;
  }catch(e){
   if(decoder)try{decoder.close()}catch(_){}
   console.warn('[L2D] frame decoder unavailable, using visible animated WebP',e);
  }
 }
 const img=new Image();
 await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=uri;});
 if(nonce!==obj.loading)return false;
 img.setAttribute('data-l2d-v4','');
 img.setAttribute('aria-hidden','true');
 img.style.cssText='position:absolute;display:block;object-fit:fill;opacity:1;visibility:visible;pointer-events:none;user-select:none;image-rendering:auto;max-width:none;max-height:none;z-index:1;';
 obj.root.appendChild(img);
 obj.clip={type:'native',img,...origin};
 if(obj.rig)obj.rig.stop();
 placeClip(obj);
 obj.root.dataset.l2dState='ready';obj.root.dataset.l2dMode='v4-native';
 return true;
}
function placeClip(obj){
 if(obj.clip?.type!=='native')return;
 const {img,x,y,w,h}=obj.clip;
 const W=obj.img.offsetWidth,H=obj.img.offsetHeight;
 const css={left:(obj.img.offsetLeft+x*W/1024)+'px',
   top:(obj.img.offsetTop+y*H/1024)+'px',
   width:(w*W/1024)+'px',height:(h*H/1024)+'px'};
 for(const [key,value] of Object.entries(css))
  if(img.style[key]!==value)img.style[key]=value;
}
function advanceV4(obj,now){
 const clip=obj.clip;
 if(!clip||clip.type!=='decoder')return;
 if(document.hidden||obj.root.hidden||obj.img.hidden){
  // Freeze the timeline when the actor is not shown. The scene manager
  // controls actor visibility; no invisible animation overhead.
  clip.start=undefined;
  return;
 }
 if(clip.start===undefined)clip.start=now;
 const index=Math.floor((now-clip.start)*20/1000)%clip.count;
 if(index===clip.frame||clip.decoding)return;
 clip.decoding=true;
 clip.decoder.decode({frameIndex:index}).then(({image})=>{
  if(obj.clip!==clip){image.close();return;}
  const ctx=obj.canvas.getContext('2d',{alpha:true});
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,obj.canvas.width,obj.canvas.height);
  ctx.drawImage(image,clip.x,clip.y,clip.w,clip.h);
  image.close();
  clip.frame=index;
  obj.root.dataset.l2dFrame=String(index);
 }).catch(e=>{console.warn('[L2D] V4 frame decoding error',e)})
 .finally(()=>{clip.decoding=false;});
}

function markAnimation(slot,enabled){
 const a=target(slot);if(!a)return;
 a.animated=!!enabled;
 if(a.rig)a.rig.animatedFrames=!!enabled;
}
function sync(t){
 for(const a of entries()){
  // Original invisible image remains authoritative for the layout and
  // current DEV drag handles; the animated canvas follows its geometry.
  const w=a.img.offsetWidth,h=a.img.offsetHeight;
  if(a.canvas.style.left!==(a.img.offsetLeft+'px'))a.canvas.style.left=a.img.offsetLeft+'px';
  if(a.canvas.style.top!==(a.img.offsetTop+'px'))a.canvas.style.top=a.img.offsetTop+'px';
  if(a.canvas.style.width!==(w+'px'))a.canvas.style.width=w+'px';
  if(a.canvas.style.height!==(h+'px'))a.canvas.style.height=h+'px';
  if(a.rig&&!a.clip)a.rig.setPaused(document.hidden||a.root.hidden||a.img.hidden||!a.img.getAttribute('src'));
  if(a.clip?.type==='decoder')advanceV4(a,t||performance.now());
  if(a.clip?.type==='native')placeClip(a);
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
 setProfile,setLayers,markAnimation,setAnimationSource,
 refresh:slot=>{const a=target(slot);return a?refresh(a):Promise.resolve(false)}
};
})();
/* Universal L2D game renderer. Every registered actor is painted onto an animated
   canvas; its <img> is an invisible asset/layout/DEV hit target, never the visual. */
(function(){
'use strict';
const rigs=new Map();
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const GEOMETRY_INTERVAL=1000/30;
let lastGeometryFrame=0;
function install(root){
 if(!root||rigs.has(root))return;
 const img=root.querySelector('[data-l2d-image]');
 const canvas=root.querySelector('[data-l2d-canvas]');
 if(!img||!canvas)return;
 const id=root.dataset.l2dActor;
 const obj={id,root,img,canvas,rig:null,clip:null,clipFrame:0,loading:0,hasParts:false,lastSource:'',overlay:null,partPatch:null,overlayFrames:new Map(),overlayFrameUrls:new Map(),overlayPending:new Set(),profile:{amplitude:.55,period:4.8,softness:1}};
 rigs.set(root,obj);
 // Canvas 2D context loss differs from WebGL loss. Supported browsers
 // restore 2D backing storage automatically, after which we must repaint.
 canvas.addEventListener?.('contextlost',()=>{
  obj.contextLost=true;obj.root.dataset.l2dContext='lost';
 });
 canvas.addEventListener?.('contextrestored',()=>{
  obj.contextLost=false;obj.root.dataset.l2dContext='ready';
  if(obj.clip?.type==='decoder')obj.clip.frame=-1;
  if(!obj.clip&&!obj.libraryPlayer&&obj.rig)
   obj.rig.render(performance.now(),true);
 });
 img.addEventListener('load',()=>refresh(obj));
 img.addEventListener('error',()=>{root.dataset.l2dState='error';});
 if(img.complete&&img.naturalWidth)refresh(obj);
}
async function refresh(obj){
 const n=++obj.loading;
 if(!obj.img.naturalWidth)return;
 // The procedural fallback uses the SAME canvas as the authored PartRig.
 // Never call rig.setImage() while the real published renderer is drawing:
 // setImage() paints immediately and would flash the old/new bitmap over
 // the canonical PSD layers on every source-load event.
 if(obj.libraryPlayer||obj.clip){
  obj.pendingRigSource=obj.img;
  obj.lastSource=obj.img.currentSrc||obj.img.src;
  return;
 }
 try{
  obj.root.dataset.l2dState='loading';
  if(!obj.rig){
   obj.rig=new window.PaperchalkL2DRig(obj.img,obj.canvas,{
    amplitude:obj.profile.amplitude,period:obj.profile.period,
    softness:obj.profile.softness,cleanup:true,playing:true,
    featurePreset:obj.img.dataset.characterId==='protagonist'&&obj.img.dataset.characterSide==='front'?'heroine-front':'generic'
   });
   await obj.rig.ready;
   // The protagonist is rebound to her actual source-part rig or V4.
   // Never flash a stale procedural breathing mesh during bootstrap.
   if(!obj.clip&&obj.id!=='player')obj.rig.start();
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
  if(!obj.clip&&!obj.libraryPlayer)obj.root.dataset.l2dMode='procedural-multinode';
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
   a.profile[name]=clamp(Number(values[name]),name==='period'?2:0,name==='period'?12:name==='amplitude'?4:2.4);
 }
 if(a.rig){
  if(a.libraryPlayer||a.clip){
   // Updating fallback parameters cannot render into the live ArtMesh canvas.
   Object.assign(a.rig,{amplitude:a.profile.amplitude,
    period:a.profile.period,softness:a.profile.softness});
  }else{
   a.rig.setAmplitude(a.profile.amplitude);
   a.rig.setPeriod(a.profile.period);
   a.rig.setSoftness(a.profile.softness);
  }
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
 obj.clip=null;obj.v4Composite=null;
 if(!uri){
  if(obj.rig){
   if(opts.suspendFallback){
    // Module attach first decodes EVERY original part. The temporary
    // fallback must not paint a procedural bitmap onto the previous rig.
    obj.rig.amplitude=obj.profile.amplitude;
    obj.rig.stop();
   }else{
    // Refresh any source that changed while an authored renderer was active.
    // Only do this when the fallback is actually going to be visible.
    if(obj.pendingRigSource){
     await obj.rig.setImage(obj.pendingRigSource);
     if(nonce!==obj.loading)return false;
     obj.pendingRigSource=null;
    }
    obj.rig.setAmplitude(obj.profile.amplitude);
    obj.rig.start();
   }
  }
  obj.root.dataset.l2dMode='procedural-multinode';
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
 if(document.hidden||obj.root.hidden||obj.img.hidden||obj.contextLost){
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
   const canvas=obj.canvas,ctx=canvas.getContext('2d',{alpha:true});
  // Compose the authentic V4 frame + PSD pixel corrections in source
  // coordinates. Only THEN skin the chest locally into the visible frame.
  // Never apply a transform to the whole actor canvas.
  let source=obj.v4Composite;
  if(!source){source=document.createElement('canvas');obj.v4Composite=source;}
  if(source.width!==canvas.width||source.height!==canvas.height){
   source.width=canvas.width;source.height=canvas.height;
  }
  const paint=source.getContext('2d',{alpha:true});
  paint.setTransform(1,0,0,1,0,0);
  paint.clearRect(0,0,source.width,source.height);
  paint.imageSmoothingEnabled=true;paint.imageSmoothingQuality='high';
  // Draw from native 335×1013 directly to device pixels: no intermediate
  // upsample to 1024 followed by CSS downsample.
  const sx=canvas.width/1024,sy=canvas.height/1024;
  paint.drawImage(image,clip.x*sx,clip.y*sy,clip.w*sx,clip.h*sy);
  image.close();
  // Apply only pixels changed in the original PSD source. The approved
  // 128-frame V4 remains dynamic everywhere outside the edited region.
  if(obj.partPatch?.erase&&obj.partPatch.paint){
   paint.save();
   paint.globalCompositeOperation='destination-out';
   paint.drawImage(obj.partPatch.erase,0,0,canvas.width,canvas.height);
   paint.restore();
   paint.drawImage(obj.partPatch.paint,0,0,canvas.width,canvas.height);
  }
  if(obj.overlay)paint.drawImage(obj.overlay,0,0,canvas.width,canvas.height);
  let correction=obj.overlayFrames.get(index);
  const correctionUrl=obj.overlayFrameUrls.get(index);
  if(!correction&&correctionUrl&&!obj.overlayPending.has(index)){
   obj.overlayPending.add(index);
   const frameId=index,ref=obj.clip,im=new Image();
   im.onload=()=>{
    obj.overlayPending.delete(frameId);
    if(obj.clip!==ref)return;
    obj.overlayFrames.set(frameId,im);
    // Bound the decoded correction cache on mobile; keep raw PNG data in
    // IndexedDB, but never retain 128 full-size RGBA images in RAM.
    while(obj.overlayFrames.size>6)obj.overlayFrames.delete(obj.overlayFrames.keys().next().value);
    ref.frame=-1;
   };
   im.onerror=()=>obj.overlayPending.delete(frameId);
   im.src=correctionUrl;
  }
  if(correction)paint.drawImage(correction,0,0,canvas.width,canvas.height);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // No artificial chest breathing: render the original V4 pixels directly.
  // The original heroine's hair/skirt/arms now articulate in the separate
  // true-source-PartRig player, not by warping this composited frame.
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  clip.frame=index;
  obj.root.dataset.l2dFrame=String(index);
 }).catch(e=>{console.warn('[L2D] V4 frame decoding error',e)})
 .finally(()=>{clip.decoding=false;});
}

async function setCorrections(slot,general,frames={}){
 const obj=target(slot);if(!obj)return false;
 const decode=src=>new Promise((ok,no)=>{
  if(!src)return ok(null);
  const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(Error('修正图层解码失败'));im.src=src;
 });
 const revision=(obj.correctionRevision||0)+1;
 obj.correctionRevision=revision;
 const owner=obj.loading;
 const generalImg=await decode(general);
 if(revision!==obj.correctionRevision||owner!==obj.loading)return false;
 const list=Object.entries(frames||{})
  .filter(([k,url])=>/^\d{1,3}$/.test(k)&&Number(k)<256&&typeof url==='string'&&url.startsWith('data:image/'));
 obj.overlay=generalImg;
 obj.overlayFrames.clear();obj.overlayPending.clear();
 obj.overlayFrameUrls=new Map(list.map(([k,url])=>[Number(k),url]));
 if(obj.clip?.type==='decoder')obj.clip.frame=-1;
 return true;
}

async function setComponentPatch(slot,patch){
 const obj=target(slot);if(!obj)return false;
 const token=obj.loading;
 const revision=(obj.patchRevision||0)+1;
 obj.patchRevision=revision;
 if(!patch?.erase||!patch?.paint){obj.partPatch=null;return true;}
 const decode=uri=>new Promise((ok,no)=>{
  const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(Error('部件修补图片损坏'));im.src=uri;
 });
 const [erase,paint]=await Promise.all([decode(patch.erase),decode(patch.paint)]);
 if(token!==obj.loading||revision!==obj.patchRevision)return false;
 obj.partPatch={erase,paint,changes:Number(patch.changes)||0};
 if(obj.clip?.type==='decoder')obj.clip.frame=-1;
 return true;
}
function markAnimation(slot,enabled){
 const a=target(slot);if(!a)return;
 a.animated=!!enabled;
 if(a.rig)a.rig.animatedFrames=!!enabled;
}
function sync(t){
 // Running geometry readbacks at 60/120Hz parallel to the 30Hz rig loop
 // forces redundant style/layout calculations in the main game UI.
 if(t&&lastGeometryFrame&&t-lastGeometryFrame<GEOMETRY_INTERVAL-.5){
  requestAnimationFrame(sync);return;
 }
 lastGeometryFrame=t||performance.now();
 for(const a of entries()){
  // Original invisible image remains authoritative for the layout and
  // current DEV drag handles; the animated canvas follows its geometry.
  const w=a.img.offsetWidth,h=a.img.offsetHeight;
  if(a.clip?.type==='decoder'&&w>0&&h>0){
   const {width:W,height:H}=window.PaperchalkL2DCanvasBudget.backingSize(
    w,h,window.devicePixelRatio||1,{maxDpr:2.5});
   if(a.canvas.width!==W||a.canvas.height!==H){
    a.canvas.width=W;a.canvas.height=H;
    if(a.clip)a.clip.frame=-1; // freshly resized buffer needs a new frame
   }
  }
  if(a.canvas.style.left!==(a.img.offsetLeft+'px'))a.canvas.style.left=a.img.offsetLeft+'px';
  if(a.canvas.style.top!==(a.img.offsetTop+'px'))a.canvas.style.top=a.img.offsetTop+'px';
  if(a.canvas.style.width!==(w+'px'))a.canvas.style.width=w+'px';
  if(a.canvas.style.height!==(h+'px'))a.canvas.style.height=h+'px';
  // Breathing is now a localized image-space deformation in advanceV4().
  // Undo any old whole-image rocking transform left by a cached version.
  const surface=a.clip?.type==='native'?a.clip.img:a.canvas;
  // Sole-anchored distance zoom is owned by l2d-ground-binding and must
  // survive the 60Hz runtime sync. Unbound legacy rocking transforms still
  // need clearing, as before.
  if(surface?.style.transform&&!a.root.dataset.groundAttached)
   surface.style.transform='';
  // Keep the sole pivot owned by the ground/perspective binder. Erasing it
  // on every frame made scaled characters drift off the floor and churn styles.
  if(surface?.style.transformOrigin&&!a.root.dataset.groundAttached)
   surface.style.transformOrigin='';
  if(a.rig&&!a.clip&&!a.libraryPlayer)
   a.rig.setPaused(document.hidden||a.root.hidden||a.img.hidden||!a.img.getAttribute('src'));
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
 setProfile,setLayers,markAnimation,setAnimationSource,setCorrections,setComponentPatch,
 refresh:slot=>{const a=target(slot);return a?refresh(a):Promise.resolve(false)}
};
})();
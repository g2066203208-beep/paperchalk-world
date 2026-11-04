/* Game adapter for distributable, independently textured PartRig L2D modules.
 * No image splitting or whole-character warp. A module must pass the Python
 * build validator before appearing in the catalog.
 * Approved V4 remains the unchanged runtime for the existing heroines.
 */
(function(root){
'use strict';
const ACTIVE=new Map(),VERSIONS=new Map();
const MODEL_CACHE=new Map(),TEXTURE_CACHE=new Map();
const cacheStats={hits:0,misses:0,evictions:0};
const nextVersion=slot=>{const n=(VERSIONS.get(slot)||0)+1;VERSIONS.set(slot,n);return n};
function memo(cache,key,create,limit){
 if(cache.has(key)){
  const promise=cache.get(key);cache.delete(key);cache.set(key,promise);
  cacheStats.hits++;return promise;
 }
 cacheStats.misses++;
 const promise=Promise.resolve().then(create);
 cache.set(key,promise);
 promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key)});
 while(cache.size>limit){cache.delete(cache.keys().next().value);cacheStats.evictions++}
 return promise;
}
const valid=(path)=>typeof path==='string'&&/^\.\/assets\/l2d\/library\/[a-z0-9_-]+\//.test(path);
async function getJSON(url){
 if(!valid(url))throw Error('非法 L2D 绑定地址');
 const raw=await memo(MODEL_CACHE,url,async()=>{
  const r=await fetch(url,{cache:'default'});
  if(!r.ok)throw Error('无法获取 L2D 绑定 '+r.status);
  return r.json();
 },8);
 // Never share mutable bones, animations and local masks across actors.
 return JSON.parse(JSON.stringify(raw));
}
function imageData(uri){
 if(typeof uri!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(uri)||uri.length>14000000)
  return Promise.reject(Error('本机 PNG 部件数据无效'));
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error('本机 PNG 部件解码失败'));
  img.src=uri;
 });
}
function image(url){
 if(!valid(url))return Promise.reject(Error('非法 L2D 图层地址'));
 return memo(TEXTURE_CACHE,url,()=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error('无法解码原始 L2D 图层 '+url));
  img.src=url;
 }),24);
}
function dispose(slot){
 const old=ACTIVE.get(slot);
 if(old){
  old.disposed=true;cancelAnimationFrame(old.frame||0);ACTIVE.delete(slot);
  if(old.onContextLost)old.actor.canvas.removeEventListener?.('contextlost',old.onContextLost);
  if(old.onContextRestored)old.actor.canvas.removeEventListener?.('contextrestored',old.onContextRestored);
 }
 const actor=root.PaperchalkL2D?.get(slot);
 if(actor?.libraryPlayer===old)actor.libraryPlayer=null;
}
function stop(slot){nextVersion(slot);dispose(slot)}
async function attach(slot,characterId,face,rigSpec,localDraft=null,localArt=null){
 if(!rigSpec?.url||!rigSpec?.textures)throw Error('模块缺少可播放的逐层 ArtMesh');
 if(!root.PaperchalkPartRigCore)throw Error('未加载独立部件网格渲染器');
 const version=nextVersion(slot);
 // Prepare all assets BEFORE mutating the existing game actor.
 const [model,...imgs]=await Promise.all([
  getJSON(rigSpec.url),
  ...Object.values(rigSpec.textures).map(url=>image(url))
 ]);
 if(VERSIONS.get(slot)!==version)return false;
 // Explicitly authorize ONLY the original heroine using her own
 // published 25-part rig model. Do not trust arbitrary cross-character aliases.
 const approvedOriginal=characterId==='protagonist'&&
  ['protagonist-rig-v1','protagonist-unified-v1'].some(alias=>
   rigSpec.sourceCharacterId===alias&&model?.characterId===alias&&
   rigSpec.url.startsWith('./assets/l2d/library/'+alias+'/'));
 // The one canonical female-two is backed by the author's actual Photoshop
 // PSD rather than the retired artificial seven-region preview.
 const approvedSecondary=characterId==='char-002'&&face==='front'&&
   rigSpec.sourceCharacterId==='char-002-psd-v1'&&
   model?.characterId==='char-002-psd-v1'&&
   model?.provenance==='original-psd'&&
   Object.keys(model.parts||{}).length===18&&
   ['front_hair','back_hair','face','eyewhite','irides','eyelash',
    'hand_raised','hand_lowered','bottomwear','legwear','footwear'].every(id=>!!model.parts[id])&&
   rigSpec.url.startsWith('./assets/l2d/library/char-002-psd-v1/');
 if(model?.format!=='paperchalk-part-rig-v1'||
    (model.characterId!==characterId&&!approvedOriginal&&!approvedSecondary)||model.face!==face)
  throw Error('L2D 绑定文件与人物 ID/方向不一致');
 // Every playable module (including the ORIGINAL heroine actor) has a
 // deterministic gentle idle preset. A saved local editor profile overrides it.
 const ids=Object.keys(rigSpec.textures);
 // Stale 7/17-mesh drafts must not contaminate the corrected 18-part PSD
 // PSD rig (including speed, amplitudes and 'saved' pseudo-joints).
 const deleted=(Array.isArray(localDraft?.deletedParts)?
  [...new Set(localDraft.deletedParts.filter(id=>typeof id==='string'))]:[]);
 const validDeleted=deleted.every(id=>ids.includes(id)&&!!model.parts[id]);
 const activeIds=ids.filter(id=>!deleted.includes(id));
 const draftMatches=localDraft?.format==='paperchalk-part-rig-v1'&&
   localDraft.characterId===characterId&&localDraft.face===face&&validDeleted&&
   Object.keys(localDraft.parts||{}).length===activeIds.length&&
   activeIds.every(id=>localDraft.parts[id]&&model.parts[id]);
 model.idleProfile=root.PaperchalkPartRigCore.sanitizeIdleProfile(
   (draftMatches?localDraft.idleProfile:null)||model.idleProfile||
   root.PaperchalkPartRigCore.defaultIdleProfile());
 // Merge ONLY the user's explicitly saved rig for this exact actor and
 // direction. Art assets, layer IDs, published positions and original V4
 // remain authoritative; malformed drafts cannot modify a published model.
 if(draftMatches){
   for(const id of activeIds){
    const original=model.parts[id],edit=localDraft.parts[id];
    model.parts[id]=root.PaperchalkPartRigCore.sanitize(edit,original);
   }
   // A deleted original PNG remains in the immutable library, but not
   // the user's playable actor; never re-display it from the hosted rig.
   for(const id of deleted)model.parts[id].enabled=false;
 }
 // Load the same independently saved Z-stack as the editor. Previously
 // only joint values were merged, so arms/weapons reverted on game return.
 if(draftMatches&&Array.isArray(localDraft.layerOrder)){
  const order=localDraft.layerOrder.map(String);
  if(order.length===activeIds.length&&new Set(order).size===activeIds.length&&
     order.every(id=>activeIds.includes(id)))model.layerOrder=[...order];
 }
 // The editor and game share the same non-destructive, bidirectional
 // local depth rules. Preserve old single-target/front masks as-is.
 if(draftMatches&&Array.isArray(localDraft.occlusionMasks)){
  model.occlusionMasks=localDraft.occlusionMasks.filter(m=>{
   const targets=Array.isArray(m?.targets)?m.targets:[m?.target];
   return typeof m?.source==='string'&&activeIds.includes(m.source)&&
    targets.some(t=>t!==m.source&&activeIds.includes(t))&&
    typeof m.png==='string'&&m.png.startsWith('data:image/png;base64,')&&
    m.png.length<8_000_000;
  }).map(m=>{
   const targets=[...new Set((Array.isArray(m.targets)?m.targets:[m.target])
    .filter(t=>t!==m.source&&activeIds.includes(t)))];
   return {source:m.source,target:targets[0],targets,
    direction:m.direction==='behind'?'behind':'front',
    png:m.png,enabled:m.enabled!==false};
  });
 }
 if(!ids.length||ids.length!==Object.keys(model.parts||{}).length)
  throw Error('L2D 贴图与绑定层数量不一致');
 // User-painted source PNGs replace the correct ArtMesh TEXTURES, never
 // become an independent screen-space patch. Validate every exact part ID,
 // RGBA dimensions and a bounded original-canvas position before applying.
 const artLayers=Array.isArray(localArt)?localArt.filter(p=>p?.sourcePart&&p.partId):[];
 const artIndex=new Map(artLayers.map(p=>[String(p.partId),p]));
 const artValid=artIndex.size===activeIds.length&&
  artLayers.length===activeIds.length&&
  activeIds.every(id=>artIndex.get(id)?.img?.startsWith('data:image/png;base64,'));
 let drawings=imgs,personalised=false;
 if(artValid){
  try{
   const edited=await Promise.all(ids.map((id,i)=>
    activeIds.includes(id)?imageData(artIndex.get(id).img):imgs[i]));
   if(ids.every((id,i)=>edited[i].width===model.parts[id].w&&
       edited[i].height===model.parts[id].h&&
       (!activeIds.includes(id)||(Number.isFinite(Number(artIndex.get(id).x))&&
        Number.isFinite(Number(artIndex.get(id).y)))))){
    drawings=edited;personalised=true;
    activeIds.forEach(id=>{
     model.parts[id].x=Math.max(-1024,Math.min(2048,Number(artIndex.get(id).x)));
     model.parts[id].y=Math.max(-1024,Math.min(2048,Number(artIndex.get(id).y)));
    });
   }
  }catch(e){console.warn('[L2D] 本机分层纹理校验失败，保留已发布素材',e);}
 }
 if(VERSIONS.get(slot)!==version)return false;
 // Restore runtime-only bone ancestry AFTER published parts and local artwork
 // positions are finalized. Every drawn layer shares the same ground anchors.
 root.PaperchalkPartRigCore.bindBodyHierarchy(model);
 const layers=ids.map((id,i)=>{
  const p=model.parts[id],im=drawings[i];
  if(!p||p.id!==id||p.w!==im.width||p.h!==im.height)
   throw Error('L2D 独立贴图尺寸或部件 ID 错误：'+id);
  // Keep personal source visibility and alpha consistent with editor preview.
  const artwork=personalised?artIndex.get(id):null;
  const alpha=Number(artwork?.opacity);
  return {sourcePart:true,partId:id,canvas:im,
   visible:p.enabled!==false&&artwork?.visible!==false,
   opacity:artwork&&Number.isFinite(alpha)?Math.max(0,Math.min(1,alpha)):1};
 });
 const actor=root.PaperchalkL2D?.get(slot);
 if(!actor)throw Error('游戏缺少人物渲染槽 '+slot);
 if(VERSIONS.get(slot)!==version)return false;
 dispose(slot);
 await root.PaperchalkL2D.setAnimationSource(slot,null,{suspendFallback:true});
 if(VERSIONS.get(slot)!==version)return false;
 actor.rig?.stop();
 const state={disposed:false,frame:0,actor,model,layers,slot,last:-1,
  elapsedMs:0,previousTime:0,contextLost:false,contextRestores:0,
  personalised,renderedFrames:0};
 state.onContextLost=()=>{
  state.contextLost=true;state.previousTime=0;state.last=-1;
 };
 state.onContextRestored=()=>{
  state.contextLost=false;state.contextRestores++;
  state.previousTime=0;state.last=-1; // next RAF restores the REAL PSD mesh
 };
 actor.canvas.addEventListener?.('contextlost',state.onContextLost);
 actor.canvas.addEventListener?.('contextrestored',state.onContextRestored);
 const actionOptions=root.PaperchalkPartRigCore.actionNames?.(model)||[];
 const initialAction=model.actionProfiles?.default||actionOptions[0]?.id;
 if(initialAction)model.actionState={to:initialAction};
 if(initialAction)actor.root.dataset.l2dAction=initialAction;
 else delete actor.root.dataset.l2dAction;
 ACTIVE.set(slot,state);actor.libraryPlayer=state;
 actor.root.dataset.l2dMode='library-part-mesh';
 actor.root.dataset.l2dEdition=personalised?'locally-edited-part-mesh':'published-part-mesh';
 actor.root.dataset.l2dAnimated='true';
 actor.root.dataset.l2dState='ready';
 function tick(t){
  if(state.disposed)return;
  state.frame=requestAnimationFrame(tick);
  if(document.hidden||actor.root.hidden||actor.img.hidden){
   state.previousTime=0;state.last=-1;return;
  }
  if(t-state.last<33)return;
  const size=root.PaperchalkL2DCanvasBudget.backingSize(
   actor.img.offsetWidth,actor.img.offsetHeight,root.devicePixelRatio||1);
  if(!size.width||!size.height)return;
  const {width:w,height:h}=size;
  // Losing a 2D context is possible after memory/driver errors. Let the
  // browser restore it, then redraw this model on the very next RAF.
  const ctx=actor.canvas.getContext('2d',{alpha:true});
  if(!ctx||state.contextLost||ctx.isContextLost?.())return;
  if(actor.canvas.width!==w||actor.canvas.height!==h){
   actor.canvas.width=w;actor.canvas.height=h;
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
  ctx.setTransform(w/1024,0,0,h/1024,0,0);
  if(state.previousTime)state.elapsedMs+=Math.min(80,Math.max(0,t-state.previousTime));
  state.previousTime=t;
  // Clock pauses while hidden: waking a phone cannot jump hair/skirt phase.
  root.PaperchalkPartRigCore.draw(ctx,layers,model,state.elapsedMs*Math.PI*2/3600);
  // Existing hand-painted correction layers must remain visible when the
  // original heroine switches from V4 to articulated parts. These overlays
  // are stored separately; none of the original source PNGs are modified.
  if(!state.personalised&&actor.partPatch?.erase&&actor.partPatch?.paint){
   ctx.save();ctx.globalCompositeOperation='destination-out';
   ctx.drawImage(actor.partPatch.erase,0,0,1024,1024);ctx.restore();
   ctx.drawImage(actor.partPatch.paint,0,0,1024,1024);
  }
  ctx.setTransform(1,0,0,1,0,0);
  actor.root.dataset.l2dFrame=String(Math.floor(state.elapsedMs/50)%128);
  state.last=t;state.renderedFrames++;
 }
 state.frame=requestAnimationFrame(tick);
 return {id:characterId,face,parts:layers.length};
}
// Change only targeted PART transforms/visibility in the already loaded
// ArtMesh actor. Never detach the actor, re-decode PSD, or restart its phase.
function setAction(slot,name){
 const state=ACTIVE.get(slot);
 if(!state||state.disposed)return false;
 if(!root.PaperchalkPartRigCore.setAction(state.model,name))return false;
 state.actor.root.dataset.l2dAction=name;
 return true;
}
function getAction(slot){return ACTIVE.get(slot)?.model?.actionState?.to||null;}
root.PaperchalkL2DLibrary={attach,detach:stop,setAction,getAction,
 actions:slot=>root.PaperchalkPartRigCore.actionNames?.(ACTIVE.get(slot)?.model)||[],
 get:slot=>ACTIVE.get(slot)||null,
 inspect:slot=>{
  const a=ACTIVE.get(slot);
  return {slot,version:VERSIONS.get(slot)||0,active:!!a&&!a.disposed,
   parts:a?.layers.length||0,renderedFrames:a?.renderedFrames||0,
   source:a?.model.characterId||null,phaseMs:a?.elapsedMs||0,
   contextLost:!!a?.contextLost,contextRestores:a?.contextRestores||0,
   backing:a?{width:a.actor.canvas.width,height:a.actor.canvas.height}:null,
   textureCache:TEXTURE_CACHE.size,modelCache:MODEL_CACHE.size,...cacheStats};
 }};
})(typeof window!=='undefined'?window:globalThis);

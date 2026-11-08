/* Single game DEV entry to the all-character L2D authoring studio.
 * The game displays ONLY L2D canvases (site/l2d/runtime.js). Source images
 * are invisible layout anchors and can be PNG or user-edited composites.
 * All imported character IDs share the same IndexedDB as the studio. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const loaded=$('dev-character-list'),library=$('dev-character-library');
const side=$('dev-character-angle'),picker=$('dev-layer'),status=$('dev-character-status');
if(!loaded||!library||!window.PaperchalkL2D)return;
const catalog=new Map(),assigned={player:{id:'protagonist',side:'back'},
  ally2:{id:'char-003',side:'front'},ally3:{id:'char-004',side:'front'},ally4:{id:'char-006',side:'front'},
  enemy:{id:'char-002',side:'front'},enemy2:{id:'char-003',side:'front'},enemy3:{id:'char-006',side:'front'},enemy4:{id:'char-004',side:'front'}};
const GAME_SLOTS=['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4'];
const DB='paperchalk-dev-characters-v1';
const assignmentVersions=Object.fromEntries(GAME_SLOTS.map(id=>[id,0]));
let battleRestoration=null;
const isArena=()=>document.getElementById('scene')?.dataset.scene==='ring-arena';
let slot='player',ready=false,heroineRenderer=
  (sessionStorage.getItem('paperchalk-heroine-renderer-mode')==='v4'?'v4':'bones');
function note(s){status.textContent=s;}
const valid=id=>/^[A-Za-z0-9_-]{1,80}$/.test(String(id));
async function storage(mode,key,value){
 const db=await new Promise((ok,no)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
 });
 try{return await new Promise((ok,no)=>{
  const tx=db.transaction('kv',mode),q=tx.objectStore('kv');
  const task=mode==='readonly'?q.get(key):q.put(value,key);
  let result;
  task.onsuccess=()=>{result=task.result};
  task.onerror=()=>no(task.error);
  tx.oncomplete=()=>ok(result);
  tx.onabort=()=>no(tx.error||Error('L2D storage aborted'));
  tx.onerror=()=>no(tx.error||Error('L2D storage failed'));
 });}finally{db.close();}
}
const get=key=>storage('readonly',key).catch(()=>null);
// The painting editor stores each original RGBA texture in a separate DB.
// This is NOT a flattened screenshot and cannot cross character identities.
async function getLocalArtwork(id,face){
 if(!valid(id))return null;
 try{
  const db=await new Promise((ok,no)=>{
   const r=indexedDB.open('pixelatelier-character-v1',1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('art'))r.result.createObjectStore('art')};
   r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
  });
  try{
   const record=await new Promise((ok,no)=>{
    const r=db.transaction('art','readonly').objectStore('art').get('character:'+id);
    r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
   });
   return Array.isArray(record?.[face])?record[face]:null;
  }finally{db.close();}
 }catch(error){console.warn('[L2D] 本机美术层读取失败',error);return null;}
}
const put=(key,v)=>storage('readwrite',key,v);
// Every mounted role is assignable, even when its original invisible image
// has no src yet. The enemy slot starts empty and is populated by the
// validated CHAR-002 library module during init.
const actualActors=()=>GAME_SLOTS.map(id=>window.PaperchalkL2D.get(id))
 .filter(a=>a?.root?.isConnected&&a.img&&a.canvas);
function refreshList(){
 // The explicitly selected actor wins. The old dropdown value must not
 // silently reset enemy/NPC selection to the protagonist during refresh.
 const previous=slot||loaded.value;loaded.replaceChildren();
 for(const a of actualActors()){
  const bind=assigned[a.id]||{id:a.img.dataset.characterId||a.id,side:a.img.dataset.characterSide||'front'};
  assigned[a.id]=bind;
  const desc=catalog.get(bind.id)?.label||bind.id;
  const zone=a.id==='player'?'主角区':a.id==='ally2'?'我方二':a.id==='ally3'?'我方三':a.id==='ally4'?'我方四':
    a.id==='enemy'?'敌人一':a.id==='enemy2'?'敌人二':a.id==='enemy3'?'敌人三':'敌人四';
  loaded.add(new Option(desc+' · '+zone,a.id));
 }
 if([...loaded.options].some(x=>x.value===previous))slot=loaded.value=previous;
 else if(loaded.options.length)slot=loaded.value=loaded.options[0].value;
 library.replaceChildren();
 // Group each person's regular artwork and action variants in ONE collection.
 const families=new Map();
 for(const c of catalog.values()){
  const family=c.familyId||c.id;
  if(!families.has(family))families.set(family,[]);
  families.get(family).push(c);
 }
 for(const [family,variants] of families){
  const parent=document.createElement('optgroup');
  parent.label=catalog.get(family)?.label||family;
  for(const c of variants){
   // The old full battle PSD is retained only for SOURCE inspection inside
   // the Studio; the playable heroine uses the unified canonical part swap.
   if(c.id==='protagonist-battle-front')continue;
   const modes=Object.values(c.l2dModule||{}).map(x=>x.renderer);
   const kind=modes.includes('part-mesh')?' · 网格 L2D':modes.includes('v4-webp')?' · V4 L2D':'';
   const label=c.id===family?'基本立绘':c.variantCategory==='combat'?'战斗动作':(c.label||c.id);
   const option=new Option(label+kind,c.id);
   option.disabled=!c.front&&!c.back;
   parent.append(option);
  }
  library.append(parent);
 }
 const bind=assigned[slot];
 if(bind){
  library.value=bind.id;
  side.value=bind.side;
 }
 syncFaceAvailability();
 refreshActionOptions();
}
function syncFaceAvailability(){
 const c=catalog.get(library.value);
 const front=side.querySelector('option[value="front"]');
 const back=side.querySelector('option[value="back"]');
 if(front)front.disabled=!!c&&!c.front;
 if(back)back.disabled=!!c&&!c.back;
 if(c&&side.value==='back'&&!c.back)side.value='front';
 else if(c&&side.value==='front'&&!c.front&&c.back)side.value='back';
}
function selectSlot(value){
 if(!assigned[value])return;
 slot=value;refreshList();
 if((value==='player'||value==='enemy')&&picker.value!==value){
  picker.value=value;picker.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
async function assign(target,id,face='front',save=true){
 const c=catalog.get(id);if(!c)throw Error('未找到角色 '+id);
 const actor=window.PaperchalkL2D.get(target);if(!actor)throw Error('人物图层未加载 '+target);
 // A complete user-painted L2D may be present locally even before a GitHub
 // portrait was published. Validate the exact requested view below, after
 // checking its saved 1024px composite (never substitute the opposite side).
 // A newer scene/person selection supersedes earlier asynchronous decodes.
 const revision=(assignmentVersions[target]||0)+1;
 assignmentVersions[target]=revision;
 const current=()=>assignmentVersions[target]===revision;
 const checked=async promise=>{
  const result=await promise;
  if(!current())throw Error('L2D 角色切换已被后续操作取代');
  return result;
 };
 const src=await checked(get('render:'+id+':'+face))||c[face];
 if(!src)throw Error('人物缺少独立的 '+face+' 方向素材；不会使用另一面冒充');
 const currentBinding=assigned[target];
 const previousAction=currentBinding?.id===id&&currentBinding?.side===face
  ?window.PaperchalkL2DLibrary?.getAction(target):null;
 // Live 3D arena is composited from this slot's actual drawing surface.
 // A handover from a different person/view must not carry one SINGLE frame
 // of the previous model into the newly labeled heroine texture. The old
 // Studio PartRig may normally remain until decode, but never in an arena.
 if(target==='player'&&isArena()&&
    (currentBinding?.id!==id||currentBinding?.side!==face)){
  actor.root.dataset.l2dState='loading';
  window.PaperchalkL2DLibrary?.detach(target);
  await checked(window.PaperchalkL2D.setAnimationSource(target,null,
    {suspendFallback:true}));
  actor.rig?.stop();
  actor.canvas.getContext('2d').clearRect(0,0,actor.canvas.width,actor.canvas.height);
  delete actor.root.dataset.l2dFrame;
 }
 const img=actor.img;assigned[target]={id,side:face};
 img.dataset.characterId=id;img.dataset.characterSide=face;
 if(img.src!==new URL(src,location.href).href){
  // A new NPC source image fires an asynchronous 'load' event that calls
  // runtime.refresh() and invalidates any V4 decoder installed too early.
  // Wait for the real source image AND its L2D rig before installing the clip.
  img.src=src;
  await checked(img.decode());
  await checked(window.PaperchalkL2D.refresh(target));
 }
 img.hidden=false;
 // Keep the old authored PartRig visible while fetching the new model.
 // The library player will dispose it atomically AFTER the new PNGs decode.
 const rig=await checked(get('l2d:'+id+':'+face))||{amplitude:.55,period:4.8,softness:1};
 window.PaperchalkL2D.setProfile(target,rig);
 window.PaperchalkL2D.markAnimation(target,!!c.animated?.[face]);
 const clip=await checked(get('clip:'+id+':'+face));
 // The approved V4 is built into GitHub Pages, not an optional browser upload.
 // Explicit per-character V4 imports may override it; other actors keep
 // their own dynamic mesh rig and NEVER display the hidden static source.
 const originalPsdLayers=await checked(get('skeletal:'+id+':'+face));
 const usesPsdRig=Array.isArray(originalPsdLayers)&&originalPsdLayers.length>=12;
 const published=c.l2dModule?.[face];
 // Studio and game share the canonical actor/face keys in IndexedDB.
 // Read user-authored bones and per-part artwork BEFORE selecting a renderer.
 const [savedRig,savedArt]=await checked(Promise.all([
  get('part-rig:'+id+':'+face),getLocalArtwork(id,face)
 ]));
 // A published test/special module may have fewer than eight original
 // meshes; only unpublished user projects require a substantial source rig.
 const minimumParts=published?.rig?.textures?1:8;
 const localRigAvailable=savedRig?.format==='paperchalk-part-rig-v1'&&
  savedRig.characterId===id&&savedRig.face===face&&
  Object.keys(savedRig.parts||{}).length>=minimumParts;
 if(savedRig&&!localRigAvailable)
  throw Error('发现本机 L2D 骨骼编辑稿，但人物/方向/格式不匹配；拒绝换回旧模型：'+id+'/'+face);
 // The artist can add/split/remove meshes without publishing binaries.
 // When the editor has persisted all actual RGBA layers, the exact edited
 // PartRig is authoritative over the GitHub module's old part inventory.
 const sourceParts=Array.isArray(savedArt)?savedArt.filter(p=>p?.sourcePart&&p.partId):[];
 const savedIds=localRigAvailable?Object.keys(savedRig.parts):[];
 const localComplete=localRigAvailable&&sourceParts.length===savedIds.length&&
  new Set(sourceParts.map(p=>String(p.partId))).size===savedIds.length&&
  savedIds.every(name=>sourceParts.some(p=>String(p.partId)===name&&
   typeof p.img==='string'&&p.img.startsWith('data:image/png;base64,')));
 // Explicit studio edits always win over the legacy heroine V4 toggle.
 const hasStudioEdits=localRigAvailable||sourceParts.length>0;
 const publishedRig=published?.renderer==='part-mesh'&&
  (id!=='protagonist'||heroineRenderer==='bones'||hasStudioEdits)?published.rig:null;
 // CHAR-002's hosted 18-part PSD ArtMesh is authoritative. The studio also
 // saves a legacy 'skeletal' compatibility record; it must NOT hijack the
 // runtime renderer and silently discard the user's PartRig bone edits.
 // Keep the legacy path for other characters with no dedicated published rig.
 // Any authenticated published ArtMesh is authoritative over the older
 // 'skeletal' compatibility cache. Studio saves BOTH; the cache must never
 // steal renderer priority and discard the real 20-part heroine rig.
 const preferPublishedArtMesh=!!publishedRig;
 const deployedClip=c.clips?.[face];
 const installedV4=deployedClip?.url||(id==='protagonist'?'./assets/l2d/v4/'+face+'.webp':'');
 const source=(clip?.data?.startsWith('data:image/webp;base64,')?clip.data:installedV4);
 const shape=clip?.crop||deployedClip?.crop||{x:351,y:9,w:335,h:1013};
 // Non-library modes own their own rendering driver; let the previous
 // library complete its final frame right up to this selected handoff.
 if(!publishedRig&&!localRigAvailable)window.PaperchalkL2DLibrary?.detach(target);
 if(usesPsdRig&&!preferPublishedArtMesh&&!localRigAvailable){
  // Genuine Photoshop layers without an authoritative PartRig take precedence over the old baked
  // flat-PNG WebP. Each image has a separate source texture and bone.
  await checked(window.PaperchalkL2D.setAnimationSource(target,null));
  const loaded=await checked(window.PaperchalkL2D.setLayers(target,originalPsdLayers,[1024,1024]));
  if(!loaded)throw Error('真实 PSD 独立骨骼图层载入中断');
  const obj=window.PaperchalkL2D.get(target);
  if(obj){obj.root.dataset.l2dEdition='psd-layer-skeletal';obj.root.dataset.l2dMode='psd-layer-skeletal';obj.root.dataset.l2dAnimated='true';}
 }else if(publishedRig||localRigAvailable){
  try{
   if(!window.PaperchalkL2DLibrary)throw Error('游戏未安装模块化 ArtMesh 播放器');
   // If no GitHub module exists, the SAME complete saved PartRig and
   // original PNGs are used; do not degrade to the old simplified PSD rig.
   const attached=await checked(window.PaperchalkL2DLibrary.attach(
    target,id,face,localComplete?null:(publishedRig||null),savedRig,savedArt));
   if(!attached)throw Error('L2D 模块加载已被后续操作取消');
   if(previousAction)window.PaperchalkL2DLibrary.setAction(target,previousAction);
   if(id==='protagonist')actor.root.dataset.l2dBreath='joint-parented';
  }catch(error){
   if(!current())throw error;
   // Never lie that the editor's changes were applied when a saved user
   // model or painted PSD layer cannot be loaded. Preserve the active actor
   // and surface the exact failure instead of silently showing old V4.
   if(hasStudioEdits)throw Error('工作室 L2D 同步失败，已保留你的编辑数据：'+error.message);
   if(id!=='protagonist'||!source)throw error;
   console.warn('[L2D] Original approved animation retained: independent character rig unavailable',error);
   window.PaperchalkL2DLibrary?.detach(target);
   await checked(window.PaperchalkL2D.setAnimationSource(target,source,shape));
   actor.root.dataset.l2dEdition='V4-fallback';
   actor.root.dataset.l2dBreath='disabled';
  }
 }else if(source){
  try{
   await checked(window.PaperchalkL2D.setAnimationSource(target,source,shape));
   const obj=window.PaperchalkL2D.get(target);
   if(obj){obj.root.dataset.l2dEdition=clip?.data?'V4-imported':'V4-official';obj.root.dataset.l2dAnimated='true'}
  }catch(e){
   if(!current())throw e;
   console.error('[L2D] Failed to decode approved V4; retaining live mesh animation',e);
   await checked(window.PaperchalkL2D.setAnimationSource(target,null));
   note('V4 视频资源加载异常：'+e.message);
  }
 }else{
  await checked(window.PaperchalkL2D.setAnimationSource(target,null));
  const obj=window.PaperchalkL2D.get(target);
  if(obj){obj.root.dataset.l2dEdition='mesh';obj.root.dataset.l2dAnimated='true'}
 }
 // Sparse corrected frames remain owned by THIS selection only.
 // An older slow IndexedDB read cannot overwrite the newer actor's masks.
 if(source&&!usesPsdRig&&!window.PaperchalkL2DLibrary?.get(target)){
  const [general,frames]=await checked(Promise.all([
   get('overlay:'+id+':'+face),get('frames:'+id+':'+face)
  ]));
  await checked(window.PaperchalkL2D.setCorrections(target,general,frames||{}));
 }else{
  await checked(window.PaperchalkL2D.setCorrections(target,null,{}));
 }
 const patch=(usesPsdRig||(publishedRig&&id!=='protagonist'))
  ?null:await checked(get('parts-patch:'+id+':'+face));
 await checked(window.PaperchalkL2D.setComponentPatch(target,patch));
 if(save)await checked(put('slot:'+target,{id,side:face}));
 refreshList();
 const live=window.PaperchalkL2DLibrary?.get(target);
 note('✓ 已加载 '+c.label+' · '+(face==='back'?'背面':'正面')+
   (live?(live.model?.characterId===id?' · 工作室/游戏同一 PartRig':' · 发布版 PartRig'):
    usesPsdRig?' · 简化 PSD 骨骼':source?' · V4 备份':' · 通用程序网格'));
}
// In the ring battle, all four visible same-art placeholders now use
// female-07's ACTUAL separate back PartRig canvas from the SAME studio.
// Never overwrite a user's slot choices in IndexedDB. Restore all four
// original actor assignments on leaving the battle scene.
async function ensureBattleHero(){
 if(!ready||!isArena())return false;
 if(!catalog.get('female-07')?.l2dModule?.back?.rig?.textures)
  throw Error('女七背面 14 层 PSD L2D 尚未发布：拒绝用静态图片冒充');
 const keys=['player','ally2','ally3','ally4'];
 if(!battleRestoration)battleRestoration=Object.fromEntries(
  keys.map(key=>[key,{...assigned[key]}]));
 for(const key of keys){
  if(assigned[key]?.id==='female-07'&&assigned[key]?.side==='back'&&
     window.PaperchalkL2DLibrary?.get(key)?.model?.characterId==='female-07')
   continue;
  await assign(key,'female-07','back',false);
 }
 return true;
}
async function restoreBattleHero(){
 if(!ready||isArena()||!battleRestoration)return false;
 const saved=battleRestoration;battleRestoration=null;
 for(const [key,actor] of Object.entries(saved)){
  if(actor?.id&&catalog.has(actor.id)&&
   (assigned[key]?.id!==actor.id||assigned[key]?.side!==actor.side))
   await assign(key,actor.id,actor.side,false);
 }
 return true;
}
async function setHeroineRenderer(mode){
 if(mode!=='bones'&&mode!=='v4')throw Error('只能选择逐部件骨骼或原版 V4 备份');
 heroineRenderer=mode;
 sessionStorage.setItem('paperchalk-heroine-renderer-mode',mode);
 const active=Object.entries(assigned).filter(([,record])=>record?.id==='protagonist');
 for(const [target,record] of active)await assign(target,'protagonist',record.side,false);
 const toggle=document.getElementById('dev-heroine-renderer');
 if(toggle)toggle.textContent=mode==='bones'?'女主：骨骼摆动中 · 切到V4备份':'女主：V4备份中 · 恢复骨骼摆动';
 return mode;
}
async function openStudio(){
 // DEV always navigates to the ONE shared studio, no iframe and no
 // separate heroine-only page. Studio itself offers all imported characters.
 const current=assigned[slot]||{id:library.value||'protagonist',side:side.value||'front'};
 try{localStorage.setItem('paperchalk-studio-last',JSON.stringify(current))}catch(e){}
 const url=new URL('./character-editor/',location.href);
 url.searchParams.set('character',current.id);
 url.searchParams.set('side',current.side);
 url.searchParams.set('slot',slot);
 url.searchParams.set('from','game');
 location.assign(url.href);
}
async function fileData(file){return new Promise((ok,no)=>{
 const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=()=>no(fr.error);fr.readAsDataURL(file);
});}
async function importImages(files){
 const groups=new Map();
 for(const f of files){
  if(!/^image\/(png|webp|jpeg)$/.test(f.type))continue;
  const m=f.name.match(/^(.*?)(?:[-_ ](front|back|正面|背面))?\.(png|webp|jpe?g)$/i);
  if(!m)continue;
  const name=m[1]||'新角色',face=/^(back|背面)$/.test(m[2]||'')?'back':'front';
  let item=groups.get(name)||[...catalog.values()].find(x=>x.localFamily===name);
  if(!item){
   item={id:'local-'+crypto.randomUUID().slice(0,12),label:name,front:'',back:'',localFamily:name};
   catalog.set(item.id,item);
  }
  item[face]=await fileData(f);groups.set(name,item);
 }
 if(!groups.size)throw Error('只支持 PNG/WebP/JPEG；分层 PSD 在工作室导入');
 await put('imported',[...catalog.values()].filter(x=>x.id.startsWith('local-')));
 const item=[...groups.values()].at(-1);
 await assign(slot,item.id,item.back&&!item.front?'back':'front');
 note('已导入 '+item.label+'。点击「打开全人物 L2D 编辑工作室」编辑分层/动作。');
}
async function init(){
 catalog.set('protagonist',{id:'protagonist',label:'女主角',front:'./assets/characters/protagonist-front.webp',back:'./assets/characters/protagonist-back.webp'});
 try{
  const response=await fetch('./characters.catalog.json',{cache:'no-store'});
  if(response.ok)for(const p of (await response.json()).characters||[]){
   if(valid(p.id))catalog.set(p.id,{id:p.id,label:p.label||p.id,front:p.front||'',back:p.back||'',clips:p.clips||{},animated:p.animated||{},l2dModule:p.l2dModule||{},
    familyId:p.familyId||p.id,variantCategory:p.variantCategory||'default'});
  }
 }catch(e){console.warn('L2D catalog offline',e);}
 const imported=await get('imported');if(Array.isArray(imported))for(const c of imported){
  if(valid(c?.id))catalog.set(c.id,c);
 }
 const overrides=await get('overrides');if(Array.isArray(overrides))for(const c of overrides){
  if(valid(c?.id)&&catalog.has(c.id))Object.assign(catalog.get(c.id),c);
 }
 // Local, independently rigged character views are playable without a
 // published PNG. Only expose a face once BOTH authentic source PNGs and
 // the saved PartRig exist; no blank draft or opposite-side substitution.
 for(const c of catalog.values()){
  for(const face of ['front','back']){
   if(c[face])continue;
   const [rig,composite,art]=await Promise.all([
    get('part-rig:'+c.id+':'+face),get('render:'+c.id+':'+face),getLocalArtwork(c.id,face)
   ]);
   if(rig?.format==='paperchalk-part-rig-v1'&&
      rig.characterId===c.id&&rig.face===face&&
      Object.keys(rig.parts||{}).length>=8&&
      Array.isArray(art)&&art.filter(p=>p?.sourcePart&&p.partId).length>=8&&
      typeof composite==='string'&&composite.startsWith('data:image/png;base64,'))
    c[face]=composite;
  }
 }
 for(const key of GAME_SLOTS){
  const old=await get('slot:'+key);
  if(old?.id&&catalog.has(old.id))assigned[key]={id:old.id,side:old.side==='back'?'back':'front'};
 }
 // Prefer existing published L2D actors and never introduce placeholder art.
 for(const key of GAME_SLOTS){
  const a=assigned[key];
  if(a&&!catalog.has(a.id)){
   const fallback=['char-004','char-003','char-002','protagonist'].find(id=>catalog.get(id)?.front);
   if(fallback)assigned[key]={id:fallback,side:'front'};
  }
 }
 // The ring scene renders 4v4, not five actors with hidden reserve allies.
 // Assign all eight REAL source rigs with at most TWO concurrent decoders.
 // The old serial pass left ally4 permanently absent in slow Chromium after
 // 85s. Bounded concurrency avoids both that queue starvation and mobile
 // RGBA spikes; every role still keeps its original source/person identity.
 const visibleFirst=['player','enemy','ally4','enemy2','ally2','enemy3','ally3','enemy4'];
 const queue=visibleFirst.slice();
 async function loadBattleRole(key){
  const a=assigned[key];if(a?.id&&catalog.has(a.id)){
   try{await assign(key,a.id,a.side,false)}
   catch(e){console.error('[L2D] 游戏启动同步失败 '+key,e);
    note('L2D 加载失败 '+key+'：'+e.message);}
  }
 }
 const worker=async()=>{while(queue.length)await loadBattleRole(queue.shift())};
 await Promise.all([worker(),worker()]);
 ready=true;
 // The scene can already be rendering before the asynchronous catalog boot.
 // Correct an old local player-slot assignment before the next battle frame.
 if(isArena())await ensureBattleHero();
 // Match the scene DEV layer already selected before this script boots.
 // Previously the scene could say "enemy" while the actor selector kept
 // editing "player", leading to edits landing in the wrong slot.
 if(picker.value==='player'||picker.value==='enemy')slot=picker.value;
 refreshList();
}
loaded.onchange=()=>selectSlot(loaded.value);
library.onchange=()=>{
 syncFaceAvailability();
 note('已选择素材 '+(catalog.get(library.value)?.label||library.value)+'。点击切换可替换当前图层角色。');
};
$('dev-character-use').onclick=()=>assign(slot,library.value,side.value).catch(e=>note(e.message));
const rendererToggle=document.createElement('button');
rendererToggle.id='dev-heroine-renderer';rendererToggle.type='button';
rendererToggle.textContent=heroineRenderer==='bones'?'女主：骨骼摆动中 · 切到V4备份':'女主：V4备份中 · 恢复骨骼摆动';
rendererToggle.title='只切换女主渲染器；不覆盖原始V4、贴图或本机PSD修改';
$('dev-character-use').insertAdjacentElement('afterend',rendererToggle);
rendererToggle.onclick=()=>setHeroineRenderer(heroineRenderer==='bones'?'v4':'bones').catch(e=>note(e.message));
const actionRow=document.createElement('label');
actionRow.id='dev-l2d-action-row';
actionRow.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 0;font-size:12px;flex-wrap:wrap';
actionRow.textContent='当前人物动作 · 不换 L2D';
const actionPicker=document.createElement('select');
actionPicker.id='dev-l2d-action';
actionPicker.setAttribute('aria-label','同一人物局部动作');
actionRow.append(actionPicker);
rendererToggle.insertAdjacentElement('afterend',actionRow);
function refreshActionOptions(){
 const choices=window.PaperchalkL2DLibrary?.actions(slot)||[];
 actionRow.hidden=choices.length<2;
 actionPicker.replaceChildren();
 for(const c of choices)actionPicker.add(new Option(c.label,c.id));
 const selected=window.PaperchalkL2DLibrary?.getAction(slot);
 if(choices.some(c=>c.id===selected))actionPicker.value=selected;
}
actionPicker.onchange=()=>{
 const chosen=actionPicker.value;
 if(window.PaperchalkL2DLibrary?.setAction(slot,chosen)){
  note('✓ 已在当前人物网格内过渡到「'+actionPicker.selectedOptions[0]?.textContent+'」；未重新加载 L2D');
 }else note('该角色没有可用的局部动作。');
};

$('dev-character-open').onclick=()=>openStudio().catch(e=>note(e.message));
$('dev-character-import').onchange=e=>{
 const files=[...e.target.files];e.target.value='';
 importImages(files).catch(x=>note('导入失败：'+x.message));
};
picker.addEventListener('change',()=>{if(assigned[picker.value])selectSlot(picker.value);});
// A studio Save & Apply updates this exact browser-origin game slot. Ongoing
// slider auto-saves only reload actors ALREADY bound to the same identity/view.
// Notifications contain no artwork; source pixels and rigs remain in IndexedDB.
const gameSync=typeof BroadcastChannel==='function'
 ?new BroadcastChannel('paperchalk-l2d-live-v1'):null;
async function ensureRecentlySavedLocalActor(id){
 if(catalog.has(id))return;
 const imports=await get('imported');
 const entry=Array.isArray(imports)?imports.find(c=>c?.id===id):null;
 if(entry&&valid(entry.id)&&(entry.front||entry.back))
  catalog.set(id,{...entry});
}
let syncQueue=Promise.resolve();
if(gameSync)gameSync.onmessage=event=>{
 const msg=event.data||{};
 if(msg.type!=='paperchalk:l2d-saved'||!valid(msg.id)||
    !['front','back'].includes(msg.face)||
    !['rig-saved','applied'].includes(msg.kind))return;
 if(msg.kind==='applied'&&!GAME_SLOTS.includes(msg.slot))return;
 syncQueue=syncQueue.then(async()=>{
  if(!ready)return;
  if(msg.kind==='applied'){
   // Ignore stale messages and never change an unrelated actor: the originating
   // studio must have committed this slot assignment before notifying us.
   const binding=await get('slot:'+msg.slot);
   if(binding?.id!==msg.id||binding?.side!==msg.face)return;
   // A complete new wardrobe/actor may have been registered by Studio
   // seconds ago; don't require a full page reload to discover its identity.
   await ensureRecentlySavedLocalActor(msg.id);
   await assign(msg.slot,msg.id,msg.face,false);
  }else{
   for(const [target,binding] of Object.entries(assigned)){
    if(binding.id===msg.id&&binding.side===msg.face)
     await assign(target,msg.id,msg.face,false);
   }
  }
 }).catch(error=>note('L2D 实时同步失败：'+error.message));
};
window.PaperchalkCharacterDev={
 get ready(){return ready},
 get characters(){return [...catalog.values()]},
 get assigned(){return assigned},
 get loaded(){return actualActors().map(a=>a.id)},
 assign,ensureBattleHero,restoreBattleHero,chooseLoaded:selectSlot,openEditor:openStudio,
 setHeroineRenderer,get heroineRenderer(){return heroineRenderer},
 setAction:(action,target=slot)=>window.PaperchalkL2DLibrary?.setAction(target,action)||false,
 openFileUpload:()=>$('dev-character-import').click()
};
init().catch(e=>note('全人物 L2D 资源库初始化失败：'+e.message));
})();
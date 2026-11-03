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
const catalog=new Map(),assigned={player:{id:'protagonist',side:'back'},enemy:{id:'char-002',side:'front'}};
const DB='paperchalk-dev-characters-v1';
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
  const q=db.transaction('kv',mode).objectStore('kv');
  const task=mode==='readonly'?q.get(key):q.put(value,key);
  task.onsuccess=()=>ok(task.result);task.onerror=()=>no(task.error);
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
const actualActors=()=>['player','enemy'].map(id=>window.PaperchalkL2D.get(id))
 .filter(a=>a?.root?.isConnected&&a.img&&a.canvas);
function refreshList(){
 // The explicitly selected actor wins. The old dropdown value must not
 // silently reset enemy/NPC selection to the protagonist during refresh.
 const previous=slot||loaded.value;loaded.replaceChildren();
 for(const a of actualActors()){
  const bind=assigned[a.id]||{id:a.img.dataset.characterId||a.id,side:a.img.dataset.characterSide||'front'};
  assigned[a.id]=bind;
  const desc=catalog.get(bind.id)?.label||bind.id;
  loaded.add(new Option(desc+' · '+(a.id==='player'?'主角区':'敌人区'),a.id));
 }
 if([...loaded.options].some(x=>x.value===previous))slot=loaded.value=previous;
 else if(loaded.options.length)slot=loaded.value=loaded.options[0].value;
 library.replaceChildren();
 for(const c of catalog.values()){
  const modes=Object.values(c.l2dModule||{}).map(x=>x.renderer);
  const kind=modes.includes('part-mesh')?' · 独立网格 L2D':modes.includes('v4-webp')?' · V4 L2D':'';
  const option=new Option((c.label||c.id)+kind,c.id);
  // Unimported concepts do not have playable art; they must not become
  // a silently blank character when assigned to either game slot.
  option.disabled=!c.front&&!c.back;
  library.add(option);
 }
 const bind=assigned[slot];
 if(bind){
  library.value=bind.id;
  side.value=bind.side;
 }
 syncFaceAvailability();
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
 if(face==='back'&&!c.back)throw Error('该角色还没有真正的背面素材，不能用正面冒充背面：'+c.label);
 if(face==='front'&&!c.front)throw Error('该角色还没有真正的正面素材：'+c.label);
 const src=await get('render:'+id+':'+face)||c[face]||c.front||c.back;
 if(!src)throw Error('人物缺少 '+face+' 方向素材');
 const img=actor.img;assigned[target]={id,side:face};
 img.dataset.characterId=id;img.dataset.characterSide=face;
 if(img.src!==new URL(src,location.href).href){
  // A new NPC source image fires an asynchronous 'load' event that calls
  // runtime.refresh() and invalidates any V4 decoder installed too early.
  // Wait for the real source image AND its L2D rig before installing the clip.
  img.src=src;
  await img.decode();
  await window.PaperchalkL2D.refresh(target);
 }
 img.hidden=false;
 // Unmount previously installed authored mesh before choosing a new actor.
 window.PaperchalkL2DLibrary?.detach(target);
 const rig=await get('l2d:'+id+':'+face)||{amplitude:.55,period:4.8,softness:1};
 window.PaperchalkL2D.setProfile(target,rig);
 window.PaperchalkL2D.markAnimation(target,!!c.animated?.[face]);
 const clip=await get('clip:'+id+':'+face);
 // The approved V4 is built into GitHub Pages, not an optional browser upload.
 // Explicit per-character V4 imports may override it; other actors keep
 // their own dynamic mesh rig and NEVER display the hidden static source.
 const originalPsdLayers=await get('skeletal:'+id+':'+face);
 const usesPsdRig=Array.isArray(originalPsdLayers)&&originalPsdLayers.length>=12;
 const published=c.l2dModule?.[face];
 const publishedRig=published?.renderer==='part-mesh'&&(id!=='protagonist'||heroineRenderer==='bones')?published.rig:null;
 // CHAR-002's hosted 18-part PSD ArtMesh is authoritative. The studio also
 // saves a legacy 'skeletal' compatibility record; it must NOT hijack the
 // runtime renderer and silently discard the user's PartRig bone edits.
 // Keep the legacy path for other characters with no dedicated published rig.
 const preferFemale2ArtMesh=id==='char-002'&&face==='front'&&!!publishedRig;
 const deployedClip=c.clips?.[face];
 const installedV4=deployedClip?.url||(id==='protagonist'?'./assets/l2d/v4/'+face+'.webp':'');
 const source=(clip?.data?.startsWith('data:image/webp;base64,')?clip.data:installedV4);
 const shape=clip?.crop||deployedClip?.crop||{x:351,y:9,w:335,h:1013};
 if(usesPsdRig&&!preferFemale2ArtMesh){
  // Genuine Photoshop layers without an authoritative PartRig take precedence over the old baked
  // flat-PNG WebP. Each image has a separate source texture and bone.
  await window.PaperchalkL2D.setAnimationSource(target,null);
  const loaded=await window.PaperchalkL2D.setLayers(target,originalPsdLayers,[1024,1024]);
  if(!loaded)throw Error('真实 PSD 独立骨骼图层载入中断');
  const obj=window.PaperchalkL2D.get(target);
  if(obj){obj.root.dataset.l2dEdition='psd-layer-skeletal';obj.root.dataset.l2dMode='psd-layer-skeletal';obj.root.dataset.l2dAnimated='true';}
 }else if(publishedRig){
  try{
   if(!window.PaperchalkL2DLibrary)throw Error('游戏未安装模块化 ArtMesh 播放器');
   // PROTAGONIST: her original actor automatically renders independent
   // animated hair, pleats and both arms. No separate experimental selection.
   const [savedRig,savedArt]=await Promise.all([
    get('part-rig:'+id+':'+face),getLocalArtwork(id,face)
   ]);
   await window.PaperchalkL2DLibrary.attach(target,id,face,publishedRig,savedRig,savedArt);
   if(id==='protagonist')actor.root.dataset.l2dBreath='joint-parented';
  }catch(error){
   // Fail safe: preserve the existing approved V4 when any PNG/rig is
   // corrupted or unavailable, rather than removing the heroine from scene.
   if(id!=='protagonist'||!source)throw error;
   console.warn('[L2D] Original approved animation retained: independent character rig unavailable',error);
   await window.PaperchalkL2D.setAnimationSource(target,source,shape);
   actor.root.dataset.l2dEdition='V4-fallback';
   actor.root.dataset.l2dBreath='disabled';
  }
 }else if(source){
  try{
   await window.PaperchalkL2D.setAnimationSource(target,source,shape);
   const obj=window.PaperchalkL2D.get(target);
   if(obj){obj.root.dataset.l2dEdition=clip?.data?'V4-imported':'V4-official';obj.root.dataset.l2dAnimated='true'}
  }catch(e){
   console.error('[L2D] Failed to decode approved V4; retaining live mesh animation',e);
   await window.PaperchalkL2D.setAnimationSource(target,null);
   note('V4 视频资源加载异常：'+e.message);
  }
 }else{
  await window.PaperchalkL2D.setAnimationSource(target,null);
  const obj=window.PaperchalkL2D.get(target);
  if(obj){obj.root.dataset.l2dEdition='mesh';obj.root.dataset.l2dAnimated='true'}
 }
 // V4 corrections are independent of the approved source animation.
 // Sparse frame overlays are composited on top at the exact frame index.
 if(source&&!usesPsdRig&&!window.PaperchalkL2DLibrary?.get(target)){
  await window.PaperchalkL2D.setCorrections(target,
   await get('overlay:'+id+':'+face),
   await get('frames:'+id+':'+face)||{});
 }else{
  await window.PaperchalkL2D.setCorrections(target,null,{});
 }
 // The same source artwork edited in DEV is used on the game actor.
 // No ZIP re-import and no separate heroine-only database.
 await window.PaperchalkL2D.setComponentPatch(target,usesPsdRig||(publishedRig&&id!=='protagonist')
  ?null:await get('parts-patch:'+id+':'+face));
 if(save)await put('slot:'+target,{id,side:face});
 refreshList();
 note('正在加载 '+c.label+' · '+(face==='back'?'背面':'正面')+
   (usesPsdRig?' · 本机独立 PSD':window.PaperchalkL2DLibrary?.get(target)?
      ' · 真实部件头发/裙摆/手臂独立摆动（无呼吸）':source?' · V4 备份（无额外呼吸）':' · 通用程序网格'));
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
   if(valid(p.id))catalog.set(p.id,{id:p.id,label:p.label||p.id,front:p.front||'',back:p.back||'',clips:p.clips||{},animated:p.animated||{},l2dModule:p.l2dModule||{}});
  }
 }catch(e){console.warn('L2D catalog offline',e);}
 const imported=await get('imported');if(Array.isArray(imported))for(const c of imported){
  if(valid(c?.id))catalog.set(c.id,c);
 }
 const overrides=await get('overrides');if(Array.isArray(overrides))for(const c of overrides){
  if(valid(c?.id)&&catalog.has(c.id))Object.assign(catalog.get(c.id),c);
 }
 for(const key of ['player','enemy']){
  const old=await get('slot:'+key);
  if(old?.id&&catalog.has(old.id))assigned[key]={id:old.id,side:old.side==='back'?'back':'front'};
 }
 for(const key of ['player','enemy']){
  const a=assigned[key];if(a?.id&&catalog.has(a.id)){
   try{await assign(key,a.id,a.side,false)}catch(e){console.warn(e);}
  }
 }
 ready=true;
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
let syncQueue=Promise.resolve();
if(gameSync)gameSync.onmessage=event=>{
 const msg=event.data||{};
 if(msg.type!=='paperchalk:l2d-saved'||!valid(msg.id)||
    !['front','back'].includes(msg.face)||
    !['rig-saved','applied'].includes(msg.kind))return;
 if(msg.kind==='applied'&&!['player','enemy'].includes(msg.slot))return;
 syncQueue=syncQueue.then(async()=>{
  if(!ready)return;
  if(msg.kind==='applied'){
   // Ignore stale messages and never change an unrelated actor: the originating
   // studio must have committed this slot assignment before notifying us.
   const binding=await get('slot:'+msg.slot);
   if(binding?.id!==msg.id||binding?.side!==msg.face)return;
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
 assign,chooseLoaded:selectSlot,openEditor:openStudio,setHeroineRenderer,get heroineRenderer(){return heroineRenderer},
 openFileUpload:()=>$('dev-character-import').click()
};
init().catch(e=>note('全人物 L2D 资源库初始化失败：'+e.message));
})();
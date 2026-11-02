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
const catalog=new Map(),assigned={player:{id:'protagonist',side:'back'},enemy:{id:'',side:'front'}};
const DB='paperchalk-dev-characters-v1';
let slot='player',ready=false;
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
const put=(key,v)=>storage('readwrite',key,v);
const actualActors=()=>window.PaperchalkL2D.getLoaded().filter(a=>a.root.isConnected&&a.img.getAttribute('src'));
function refreshList(){
 const previous=loaded.value||slot;loaded.replaceChildren();
 for(const a of actualActors()){
  const bind=assigned[a.id]||{id:a.img.dataset.characterId||a.id,side:a.img.dataset.characterSide||'front'};
  assigned[a.id]=bind;
  const desc=catalog.get(bind.id)?.label||bind.id;
  loaded.add(new Option(desc+' · '+(a.id==='player'?'主角':'NPC'),a.id));
 }
 if([...loaded.options].some(x=>x.value===previous))slot=loaded.value=previous;
 else if(loaded.options.length)slot=loaded.value=loaded.options[0].value;
 library.replaceChildren();
 for(const c of catalog.values())library.add(new Option(c.label||c.id,c.id));
 const bind=assigned[slot];
 if(bind){
  library.value=bind.id;side.value=bind.side;
 }
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
 const src=await get('render:'+id+':'+face)||c[face]||c.front||c.back;
 if(!src)throw Error('人物缺少 '+face+' 方向素材');
 const img=actor.img;assigned[target]={id,side:face};
 img.dataset.characterId=id;img.dataset.characterSide=face;
 if(img.src!==new URL(src,location.href).href)img.src=src;
 img.hidden=false;
 const rig=await get('l2d:'+id+':'+face)||{amplitude:.55,period:4.8,softness:1};
 window.PaperchalkL2D.setProfile(target,rig);
 window.PaperchalkL2D.markAnimation(target,!!c.animated?.[face]);
 const clip=await get('clip:'+id+':'+face);
 // The approved V4 is built into GitHub Pages, not an optional browser upload.
 // Explicit per-character V4 imports may override it; other actors keep
 // their own dynamic mesh rig and NEVER display the hidden static source.
 const installedV4=id==='protagonist' ? './assets/l2d/v4/'+face+'.webp' : '';
 const source=(clip?.data?.startsWith('data:image/webp;base64,')?clip.data:installedV4);
 const shape=clip?.crop||{x:351,y:9,w:335,h:1013};
 if(source){
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
 if(source){
  await window.PaperchalkL2D.setCorrections(target,
   await get('overlay:'+id+':'+face),
   await get('frames:'+id+':'+face)||{});
 }else{
  await window.PaperchalkL2D.setCorrections(target,null,{});
 }
 // The same source artwork edited in DEV is used on the game actor.
 // No ZIP re-import and no separate heroine-only database.
 await window.PaperchalkL2D.setComponentPatch(target,await get('parts-patch:'+id+':'+face));
 if(save)await put('slot:'+target,{id,side:face});
 refreshList();
 note('正在 L2D 渲染 '+c.label+' · '+(face==='back'?'背面':'正面'));
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
   if(valid(p.id))catalog.set(p.id,{id:p.id,label:p.label||p.id,front:p.front||'',back:p.back||''});
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
 ready=true;refreshList();
}
loaded.onchange=()=>selectSlot(loaded.value);
library.onchange=()=>note('已选择素材 '+(catalog.get(library.value)?.label||library.value)+'。点击切换可替换当前图层角色。');
$('dev-character-use').onclick=()=>assign(slot,library.value,side.value).catch(e=>note(e.message));
$('dev-character-open').onclick=()=>openStudio().catch(e=>note(e.message));
$('dev-character-import').onchange=e=>{
 const files=[...e.target.files];e.target.value='';
 importImages(files).catch(x=>note('导入失败：'+x.message));
};
picker.addEventListener('change',()=>{if(assigned[picker.value])selectSlot(picker.value);});
window.PaperchalkCharacterDev={
 get ready(){return ready},
 get characters(){return [...catalog.values()]},
 get assigned(){return assigned},
 get loaded(){return actualActors().map(a=>a.id)},
 assign,chooseLoaded:selectSlot,openEditor:openStudio,
 openFileUpload:()=>$('dev-character-import').click()
};
init().catch(e=>note('全人物 L2D 资源库初始化失败：'+e.message));
})();
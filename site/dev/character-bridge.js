/* Paperchalk DEV character library/editor bridge.
   Works entirely inside the published game; browser edits are local until the
   user exports a layered ZIP. GitHub Pages cannot accept source commits. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const root=$('dev-character-controls'), list=$('dev-character-list'), angle=$('dev-character-angle');
const openButton=$('dev-character-open'), upload=$('dev-character-import');
const overlay=$('dev-character-overlay'), frame=$('dev-character-frame');
const status=$('dev-character-status'), picker=$('dev-layer');
if(!root||!list||!frame)return;
const DB='paperchalk-dev-characters-v1',version=1;
const characters=new Map();
let currentSlot='player',activeID='protagonist',activeAngle='back',ready=false,frameReady=false;
const assigned={player:{id:'protagonist',side:'back'},enemy:{id:'',side:'front'}};
const pendingPreview=new Map();
function note(x){status.textContent=x;}
function openDB(){return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,version);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv');};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
async function kvGet(key){const db=await openDB();try{return await new Promise((res,rej)=>{
 const q=db.transaction('kv','readonly').objectStore('kv').get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);
});}finally{db.close();}}
async function kvSet(key,val){const db=await openDB();try{return await new Promise((res,rej)=>{
 const q=db.transaction('kv','readwrite').objectStore('kv').put(val,key);q.onsuccess=()=>res(true);q.onerror=()=>rej(q.error);
});}finally{db.close();}}
function normalizeId(s){return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);}
function selectSlot(){return picker.value==='enemy'?'enemy':'player';}
function changeSlot(){currentSlot=selectSlot();root.hidden=!['player','enemy'].includes(picker.value);if(root.hidden)return;
 const a=assigned[currentSlot];activeID=a.id||'protagonist';activeAngle=a.side||'front';
 renderControls();}
function renderControls(){
 list.replaceChildren();
 for(const c of characters.values()){const o=document.createElement('option');o.value=c.id;o.textContent=c.label;list.append(o);}
 if(!characters.has(activeID))activeID='protagonist';
 list.value=activeID;angle.value=activeAngle;
}
function imageFor(id,side){
 const c=characters.get(id);if(!c)return '';
 return c[side]||c.front||c.back||'';
}
async function renderedFor(id,side){
 const draft=pendingPreview.get(id+':'+side);
 if(draft)return draft;
 const edited=await kvGet('render:'+id+':'+side);
 return edited||imageFor(id,side);
}
function setCharacterImage(slot,url){
 const img=$(slot==='player'?'actor-player':'actor-enemy');
 if(!img)return;
 if(url){img.src=url;img.hidden=false;}else if(slot==='enemy'){img.hidden=true;img.removeAttribute('src');}
}
async function assign(slot,id,side,store=true){
 if(!characters.has(id))return;
 const url=await renderedFor(id,side);
 if(!url){note('此方向还没有素材；请进入分层编辑器导入图片或 PSD');return;}
 const was=assigned[slot];assigned[slot]={id,side};
 setCharacterImage(slot,url);
 if(store)await kvSet('slot:'+slot,{id,side});
 if(slot===currentSlot){activeID=id;activeAngle=side;renderControls();}
 note('已在游戏'+(slot==='player'?'主角':'敌人')+'图层使用：'+characters.get(id).label+' · '+(side==='back'?'背面':'正面'));
 window.dispatchEvent(new CustomEvent('paperchalk:character-assigned',{detail:{slot,id,side}}));
}
async function loadCatalog(){
 characters.set('protagonist',{id:'protagonist',label:'女主角',front:'./assets/characters/protagonist-front.webp',back:'./assets/characters/protagonist-back.webp'});
 try{
  const res=await fetch('./characters.catalog.json',{cache:'no-cache'});
  if(res.ok){const j=await res.json();for(const row of j.characters||[]){
   if(!/^[a-zA-Z0-9_-]{1,80}$/.test(row.id))continue;
   characters.set(row.id,{id:row.id,label:String(row.label||row.id),front:String(row.front||''),back:String(row.back||'')});
  }}
 }catch(err){console.warn('Using built-in characters manifest',err);}
 try{
  const imported=await kvGet('imported');
  if(Array.isArray(imported))for(const item of imported){
   if(item&&/^[a-zA-Z0-9_-]{1,80}$/.test(item.id))characters.set(item.id,item);
  }
 }catch(e){note('本浏览器无法访问 IndexedDB，无法永久保存编辑');}
 for(const slot of ['player','enemy']){
  try{
   const a=await kvGet('slot:'+slot);
   if(a&&characters.has(a.id))assigned[slot]={id:a.id,side:a.side==='back'?'back':'front'};
  }catch(_){}
 }
 renderControls();ready=true;
 // Do not erase an unset enemy slot: game may intentionally hide it.
 for(const slot of ['player','enemy']){
  const a=assigned[slot];
  if(a.id)try{await assign(slot,a.id,a.side,false);}catch(e){console.warn(e);}
 }
 changeSlot();
}
function buildExport(){return Array.from(characters.values()).map(x=>({id:x.id,label:x.label,front:x.front,back:x.back}));}
async function fileAsURL(file){return await new Promise((res,rej)=>{
 const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(file);
});}
async function onFiles(files){
 for(const f of files){
  if(!/^image\/(png|webp|jpeg)$/.test(f.type)){note('上传新人物需要 PNG / WebP。PSD 请进入编辑器导入分层。');continue;}
  const base=f.name.replace(/\.(png|webp|jpg|jpeg)$/i,'');
  const targetSide=/(?:back|rear|背面|背)$/i.test(base)?'back':angle.value;
  const family=base.replace(/[-_ ]?(?:front|back|rear|正面|背面)$/i,'');
  let found=[...characters.values()].find(c=>c.localFamily===family);
  const data=await fileAsURL(f);
  if(!found){
   const id='local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
   found={id,label:family||'导入人物',front:'',back:'',localFamily:family};
   characters.set(id,found);
  }
  found[targetSide]=data;activeID=found.id;activeAngle=targetSide;
 }
 await kvSet('imported',Array.from(characters.values()).filter(c=>c.id.startsWith('local-')));
 renderControls();await assign(currentSlot,activeID,activeAngle);
 note('已导入游戏人物，可点击「分层补画 / PSD」继续修改并保存');
}
function editorSources(id){
 const c=characters.get(id)||{};
 return {id, label:c.label||id,
  front:imageFor(id,'front'),back:imageFor(id,'back')};
}
function sendTarget(){
 if(!frameReady)return;
 const info=editorSources(activeID);
 frame.contentWindow.postMessage({
  type:'PAPERCHALK_LOAD_CHARACTER',target:info,side:activeAngle
 },location.origin);
}
function openEditor(){
 if(!characters.has(activeID)){note('请先选择或导入一个人物');return;}
 overlay.hidden=false;document.body.classList.add('character-editing');
 const desired=new URL('./character-editor/?embed=1',location.href);
 if(!frame.src||!new URL(frame.src).pathname.endsWith('/character-editor/')){
  frameReady=false;frame.src=desired.href;
 }else sendTarget();
}
function closeEditor(){
 overlay.hidden=true;document.body.classList.remove('character-editing');
 if(assigned[currentSlot]?.id)assign(currentSlot,assigned[currentSlot].id,assigned[currentSlot].side,false);
}
async function publishEdit(event){
 if(!event||event.source!==frame.contentWindow||event.origin!==location.origin)return;
 const message=event.data;
 if(!message||!/^PAPERCHALK_EDITOR_/.test(message.type))return;
 if(message.type==='PAPERCHALK_EDITOR_READY'){frameReady=true;sendTarget();return;}
 if(message.type==='PAPERCHALK_EDITOR_LOADED'){note('正在编辑 '+message.label+'，图层修改按人物独立保存');return;}
 if(message.id!==activeID)return;
 if(message.type==='PAPERCHALK_EDITOR_PREVIEW'){
  if(!['front','back'].includes(message.side)||typeof message.image!=='string')return;
  if(!message.image.startsWith('data:image/png;base64,'))return;
  pendingPreview.set(message.id+':'+message.side,message.image);
  for(const slot of ['player','enemy'])if(assigned[slot].id===message.id&&assigned[slot].side===message.side)
    setCharacterImage(slot,message.image);
  note('画面已实时回显；点击「应用到游戏」保存角色渲染图');
 }else if(message.type==='PAPERCHALK_EDITOR_APPLY'){
  const imgs=message.images||{};
  for(const side of ['front','back']){
   if(typeof imgs[side]==='string'&&imgs[side].startsWith('data:image/png;base64,')){
    await kvSet('render:'+message.id+':'+side,imgs[side]);
    pendingPreview.delete(message.id+':'+side);
   }
  }
  for(const slot of ['player','enemy'])if(assigned[slot].id===message.id)
    await assign(slot,message.id,assigned[slot].side,false);
  note('已应用并保存：'+(characters.get(message.id)?.label||message.id)+'（本浏览器 IndexedDB）');
 }
}
window.addEventListener('message',e=>{publishEdit(e).catch(error=>note('应用失败：'+error.message));});
$('dev-character-open').addEventListener('click',openEditor);
$('dev-character-close').addEventListener('click',closeEditor);
$('dev-character-apply').addEventListener('click',()=>frame.contentWindow.postMessage({type:'PAPERCHALK_EDITOR_REQUEST_APPLY'},location.origin));
$('dev-character-export').addEventListener('click',()=>frame.contentWindow.postMessage({type:'PAPERCHALK_EDITOR_REQUEST_EXPORT'},location.origin));
$('dev-character-reset').addEventListener('click',async()=>{
 if(!confirm('恢复此角色当前方向在网站中的原始素材？不会删除已导出的 ZIP。'))return;
 await kvSet('render:'+activeID+':'+activeAngle,'');pendingPreview.delete(activeID+':'+activeAngle);
 await assign(currentSlot,activeID,activeAngle,false);
 frameReady&&sendTarget();
 note('已恢复原始素材；其他角色不受影响');
});
list.addEventListener('change',()=>{activeID=list.value;renderControls();});
angle.addEventListener('change',()=>{activeAngle=angle.value;renderControls();});
$('dev-character-use').addEventListener('click',()=>assign(currentSlot,activeID,activeAngle).catch(e=>note('无法切换人物：'+e.message)));
upload.addEventListener('change',e=>{
 const files=[...e.target.files];upload.value='';
 if(files.length)onFiles(files).catch(err=>note('导入失败：'+err.message));
});
picker.addEventListener('change',changeSlot);
document.getElementById('dev-character-close').addEventListener('keydown',e=>{if(e.key==='Escape')closeEditor();});
window.PaperchalkCharacterDev={
 get characters(){return buildExport()},get assigned(){return assigned},
 assign,openEditor,closeEditor,openFileUpload:()=>upload.click(),
 get ready(){return ready}
};
loadCatalog().catch(err=>note('人物资源库启动失败：'+err.message));
})();
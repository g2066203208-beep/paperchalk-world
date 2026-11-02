/* Unified all-character game DEV. Selection comes from actors actually loaded
   into the game, not a hard-coded "heroine" launcher. Every character remains
   an L2D canvas, with per-character/side project storage and animation profile. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const controls=$('dev-character-controls'),loaded=$('dev-character-list'),library=$('dev-character-library');
const direction=$('dev-character-angle'),picker=$('dev-layer'),frame=$('dev-character-frame');
const overlay=$('dev-character-overlay'),status=$('dev-character-status');
if(!controls||!loaded||!library||!frame)return;
const catalog=new Map();
const assigned={player:{id:'protagonist',side:'back'},enemy:{id:'',side:'front'}};
const previews=new Map();
const DB='paperchalk-dev-characters-v1';
let slot='player',activeID='protagonist',side='back',frameReady=false,ready=false;
const defaultProfile=()=>({amplitude:.55,period:4.8,softness:1});
function note(t){status.textContent=t;}
function db(){return new Promise((ok,no)=>{
 const q=indexedDB.open(DB,1);
 q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('kv'))q.result.createObjectStore('kv')};
 q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
});}
async function get(key){const d=await db();try{return await new Promise((ok,no)=>{
 const q=d.transaction('kv','readonly').objectStore('kv').get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);
});}finally{d.close();}}
async function put(key,val){const d=await db();try{return await new Promise((ok,no)=>{
 const q=d.transaction('kv','readwrite').objectStore('kv').put(val,key);q.onsuccess=()=>ok();q.onerror=()=>no(q.error);
});}finally{d.close();}}
function base(id,side){const c=catalog.get(id);return c?.[side]||c?.front||c?.back||'';}
function actor(key){return window.PaperchalkL2D?.get(key);}
function loadedActors(){
 const live=window.PaperchalkL2D?.getLoaded()||[];
 return live.filter(a=>a.img?.getAttribute('src')&&a.root.isConnected);
}
function refreshList(){
 const prev=slot;loaded.replaceChildren();
 for(const a of loadedActors()){
  const value=a.id;
  if(!assigned[value])assigned[value]={id:a.root.dataset.characterId||value,side:'front'};
  const item=assigned[value],c=catalog.get(item.id);
  const option=new Option((c?.label||item.id||value)+(value==='player'?' · 主角':' · '+(value==='enemy'?'NPC':'角色')),(value));
  loaded.appendChild(option);
 }
 if(loaded.options.length){
  if([...loaded.options].some(x=>x.value===prev))loaded.value=prev;
  else slot=loaded.value=loaded.options[0].value;
 }else note('当前场景没有加载任何人物');
 library.replaceChildren();
 for(const c of catalog.values())library.add(new Option(c.label||c.id,c.id));
 const target=assigned[slot];
 if(target){
  activeID=target.id||activeID;side=target.side||'front';
  if(catalog.has(activeID))library.value=activeID;
  direction.value=side;
 }
}
function imageNode(key){return actor(key)?.img||$(key==='player'?'actor-player':'actor-enemy');}
async function currentImage(id,face){
 return previews.get(id+':'+face)||await get('render:'+id+':'+face).catch(()=>null)||base(id,face);
}
async function setupL2D(key,id,face){
 const profile=await get('l2d:'+id+':'+face).catch(()=>null)||defaultProfile();
 window.PaperchalkL2D?.setProfile(key,profile);
 const c=catalog.get(id);
 window.PaperchalkL2D?.markAnimation(key,!!c?.animated?.[face]);
}
async function assign(key,id,face='front',store=true){
 if(!catalog.has(id))throw Error('角色不存在：'+id);
 const url=await currentImage(id,face);
 if(!url)throw Error('角色没有 '+face+' 素材，请先导入 PNG/PSD');
 const img=imageNode(key);if(!img)throw Error('场景图层尚未加载：'+key);
 assigned[key]={id,side:face};
 img.dataset.characterId=id;img.dataset.characterSide=face;
 img.hidden=false;
 const previous=img.src;
 if(previous!==new URL(url,location.href).href&&previous!==url)img.src=url;
 if(store)await put('slot:'+key,assigned[key]).catch(e=>console.warn(e));
 await setupL2D(key,id,face);
 refreshList();
 window.dispatchEvent(new CustomEvent('paperchalk:character-assigned',{detail:{slot:key,id,side:face}}));
 note('正在以 L2D 渲染：'+(catalog.get(id)?.label||id)+' · '+(face==='back'?'背面':'正面'));
}
async function begin(){
 catalog.set('protagonist',{id:'protagonist',label:'女主角',front:'./assets/characters/protagonist-front.webp',back:'./assets/characters/protagonist-back.webp'});
 try{
  const res=await fetch('./characters.catalog.json',{cache:'no-cache'});
  if(res.ok)for(const item of (await res.json()).characters||[]){
   if(!/^[\w-]{1,80}$/.test(item.id))continue;
   catalog.set(item.id,{id:item.id,label:String(item.label||item.id),front:item.front||'',back:item.back||''});
  }
 }catch(e){console.warn('Using built-in L2D character catalog',e);}
 const imported=await get('imported').catch(()=>null);
 if(Array.isArray(imported))for(const c of imported)if(c&&/^[\w-]{1,80}$/.test(c.id))catalog.set(c.id,c);
 const overrides=await get('overrides').catch(()=>null);
 if(Array.isArray(overrides))for(const c of overrides)if(c&&catalog.has(c.id))Object.assign(catalog.get(c.id),c);
 for(const key of ['player','enemy']){
  const prev=await get('slot:'+key).catch(()=>null);
  if(prev&&catalog.has(prev.id))assigned[key]={id:prev.id,side:prev.side==='back'?'back':'front'};
 }
 ready=true;
 for(const key of ['player','enemy']){
  const a=assigned[key];
  if(a.id&&catalog.has(a.id))try{await assign(key,a.id,a.side,false)}catch(e){console.warn('L2D assignment:',e);}
 }
 refreshList();
}
function chooseLoaded(key){
 if(!assigned[key])return;
 slot=key;const a=assigned[key];activeID=a.id;side=a.side;
 if([...loaded.options].some(x=>x.value===key))loaded.value=key;
 if([...library.options].some(x=>x.value===activeID))library.value=activeID;
 direction.value=side;
 if(['player','enemy'].includes(key)&&picker.value!==key){
  picker.value=key;picker.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
function sources(id){
 const c=catalog.get(id)||{};
 return {id,label:c.label||id,front:c.front||'',back:c.back||''};
}
function sendTarget(){
 if(!frameReady)return;
 frame.contentWindow.postMessage({type:'PAPERCHALK_LOAD_CHARACTER',
   target:sources(activeID),side},location.origin);
}
function openEditor(){
 chooseLoaded(slot);
 if(!catalog.has(activeID)){note('先选择一个已加载的人物');return;}
 if(overlay.parentElement!==document.body)document.body.appendChild(overlay);
 overlay.hidden=false;document.body.classList.add('character-editing');
 const url=new URL('./character-editor/?embed=1',location.href);
 if(!frame.src||new URL(frame.src).pathname!==url.pathname){
  frameReady=false;frame.src=url.href;
 }else sendTarget();
}
function closeEditor(){
 overlay.hidden=true;document.body.classList.remove('character-editing');
}
async function applyEditor(){
 if(!frameReady)return;frame.contentWindow.postMessage({type:'PAPERCHALK_EDITOR_REQUEST_APPLY'},location.origin);
}
async function onMessage(event){
 if(event.source!==frame.contentWindow||event.origin!==location.origin)return;
 const msg=event.data||{};
 if(msg.type==='PAPERCHALK_EDITOR_READY'){frameReady=true;sendTarget();return;}
 if(msg.type==='PAPERCHALK_EDITOR_CLOSE'){closeEditor();return;}
 if(msg.type==='PAPERCHALK_EDITOR_LOADED'){note('已载入 '+msg.label+' 分层工程 · L2D 动态预览');return;}
 if(msg.type==='PAPERCHALK_EDITOR_L2D_PROFILE'){
  if(!catalog.has(msg.id))return;
  for(const face of ['front','back']){
   const profile=msg.profiles?.[face];if(profile)await put('l2d:'+msg.id+':'+face,profile);
  }
  for(const [key,item] of Object.entries(assigned))
   if(item.id===msg.id)window.PaperchalkL2D?.setProfile(key,msg.profiles?.[item.side]||msg.profile||defaultProfile());
  return;
 }
 if(msg.id!==activeID)return;
 if(msg.type==='PAPERCHALK_EDITOR_PREVIEW'){
  if(!['front','back'].includes(msg.side)||!/^data:image\/png;base64,/.test(msg.image||''))return;
  previews.set(msg.id+':'+msg.side,msg.image);
  for(const [key,item] of Object.entries(assigned))
   if(item.id===msg.id&&item.side===msg.side){
    const img=imageNode(key);if(img)img.src=msg.image;
    window.PaperchalkL2D?.setProfile(key,msg.profile||defaultProfile());
   }
  note('正在游戏 L2D 中预览 '+(catalog.get(msg.id)?.label||msg.id));
 }else if(msg.type==='PAPERCHALK_EDITOR_APPLY'){
  for(const face of ['front','back']){
   const img=msg.images?.[face];
   if(typeof img==='string'&&img.startsWith('data:image/png;base64,')){
    await put('render:'+msg.id+':'+face,img);
    previews.delete(msg.id+':'+face);
   }
   if(msg.profiles?.[face])await put('l2d:'+msg.id+':'+face,msg.profiles[face]);
  }
  for(const [key,item] of Object.entries(assigned)){
   if(item.id!==msg.id)continue;
   await assign(key,msg.id,item.side,false);
   const currentImage=imageNode(key);
   if(currentImage?.decode)await currentImage.decode().catch(()=>{});
   const project=frame.contentWindow.characterEditor;
   const layers=project?.S?.layers?.[item.side];
   if(Array.isArray(layers)&&layers.length&&window.PaperchalkL2D?.get(key)?.rig)
    await window.PaperchalkL2D.setLayers(key,layers.map(p=>({
      canvas:p.canvas,x:p.x,y:p.y,name:p.name,visible:p.visible,opacity:p.opacity
    })),[1024,1024]);
   if(msg.profiles?.[item.side])window.PaperchalkL2D?.setProfile(key,msg.profiles[item.side]);
  }
  note('已保存：'+(catalog.get(msg.id)?.label||msg.id)+'，游戏使用实时 L2D 而非静态贴图');
 }
}
window.addEventListener('message',event=>{onMessage(event).catch(e=>note('L2D 同步失败：'+e.message));});
function readFile(file){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(file);});}
async function persistAssets(){
 await put('imported',[...catalog.values()].filter(c=>c.id.startsWith('local-')));
 await put('overrides',[...catalog.values()].filter(c=>!c.id.startsWith('local-')&&(c.override===true)));
}
async function onImages(files){
 const families=new Map();
 for(const file of files){
  if(!/^image\/(png|webp|jpeg)$/.test(file.type))continue;
  const match=file.name.match(/^(.*?)(?:[-_ ](front|back|正面|背面))?\.(png|webp|jpg|jpeg)$/i);
  if(!match)continue;
  const label=match[1]||'新人物';
  const face=['back','背面'].includes((match[2]||'').toLowerCase())?'back':'front';
  let row=families.get(label);
  if(!row){row=[...catalog.values()].find(c=>c.localFamily===label);
    if(!row){row={id:'local-'+crypto.randomUUID().slice(0,12),label,front:'',back:'',localFamily:label,animated:{}};catalog.set(row.id,row);}
    families.set(label,row);
  }
  row[face]=await readFile(file);
 }
 if(!families.size){note('只支持 PNG / WebP / JPEG，PSD 请在分层编辑器导入');return;}
 await persistAssets();
 const last=[...families.values()].at(-1);await assign(slot,last.id,direction.value||'front');
 note('已把新人物载入游戏 L2D；切换到分层编辑器可继续补画与绑定');
}
async function unzip(f){
 const bytes=new Uint8Array(await f.arrayBuffer()),view=new DataView(bytes.buffer);
 let at=0;const out=new Map();
 while(at+30<bytes.length&&view.getUint32(at,true)===0x04034b50){
  const flags=view.getUint16(at+6,true),method=view.getUint16(at+8,true),
   len=view.getUint32(at+18,true),n=view.getUint16(at+26,true),ext=view.getUint16(at+28,true);
  if(flags&8)throw Error('ZIP 使用流式描述符，请重新导出普通 ZIP');
  const name=new TextDecoder().decode(bytes.subarray(at+30,at+30+n));
  const start=at+30+n+ext;
  if(start+len>bytes.length)throw Error('ZIP 文件不完整');
  let data=bytes.slice(start,start+len);
  if(method===8){
   if(!window.DecompressionStream)throw Error('浏览器不支持 ZIP 解压');
   const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   data=new Uint8Array(await new Response(stream).arrayBuffer());
  }else if(method!==0)throw Error('ZIP 使用不支持的压缩算法 '+method);
  if(!name.includes('..'))out.set(name.split('/').at(-1).toLowerCase(),data);
  at=start+len;
 }
 return out;
}
async function onArchive(file){
 if(!file)return;
 const files=await unzip(file);
 let count=0;const chosen=catalog.get(assigned[slot]?.id);
 if(!chosen)throw Error('先选择一个在游戏中已加载的人物');
 for(const face of ['front','back']){
  for(const ext of ['webp','png']){
   const bin=files.get(face+'.'+ext);
   if(!bin)continue;
   const blob=new Blob([bin],{type:'image/'+ext});
   chosen[face]=await readFile(blob);
   const prefix=new TextDecoder('latin1').decode(bin.subarray(0,Math.min(2048,bin.length)));
   chosen.animated??={};chosen.animated[face]=ext==='webp'&&/ANIM|ANMF/.test(prefix);
   await put('render:'+chosen.id+':'+face,'');
   previews.delete(chosen.id+':'+face);
   count++;break;
  }
 }
 if(!count)throw Error('该工程 ZIP 没有 front.png/back.png 或 front.webp/back.webp');
 chosen.override=true;await persistAssets();
 await assign(slot,chosen.id,chosen[side]?side:'front');
 note('导入原位 L2D 工程：'+count+' 个方向；已在当前游戏角色中动态播放');
}
loaded.addEventListener('change',()=>chooseLoaded(loaded.value));
library.addEventListener('change',()=>{activeID=library.value;});
direction.addEventListener('change',()=>{side=direction.value;});
$('dev-character-use').onclick=()=>assign(slot,library.value,direction.value).catch(e=>note(e.message));
$('dev-character-open').onclick=openEditor;
$('dev-character-apply').onclick=applyEditor;
$('dev-character-close').onclick=async()=>{await applyEditor();closeEditor();};
$('dev-character-export').onclick=()=>frame.contentWindow.postMessage({type:'PAPERCHALK_EDITOR_REQUEST_EXPORT'},location.origin);
$('dev-character-reset').onclick=async()=>{
 if(!confirm('恢复选中人物方向的原始素材？'))return;
 await put('render:'+activeID+':'+side,'');previews.delete(activeID+':'+side);
 await assign(slot,activeID,side,false);if(frameReady)sendTarget();
};
$('dev-character-import').onchange=e=>{const files=[...e.target.files];e.target.value='';onImages(files).catch(x=>note(x.message));};
$('dev-character-archive').onchange=e=>{const f=e.target.files?.[0];e.target.value='';onArchive(f).catch(x=>note('工程导入失败：'+x.message));};
picker.addEventListener('change',()=>{if(assigned[picker.value])chooseLoaded(picker.value)});
new MutationObserver(()=>refreshList()).observe(document.getElementById('camera-player-root'),{attributes:true,attributeFilter:['hidden'],subtree:false});
window.PaperchalkCharacterDev={
 get ready(){return ready},get characters(){return [...catalog.values()]},
 get assigned(){return assigned},get loaded(){return loadedActors().map(a=>a.id)},
 assign,openEditor,closeEditor,chooseLoaded,
 openFileUpload:()=>$('dev-character-import').click()
};
begin().catch(e=>note('人物列表初始化失败：'+e.message));
})();
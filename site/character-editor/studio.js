/* Single all-imported character L2D studio, shared with the game via IndexedDB. */
(()=>{
'use strict';
const ed=window.characterEditor;if(!ed)return;
const $=id=>document.getElementById(id), DB='paperchalk-dev-characters-v1';
const list=new Map();
const args=new URLSearchParams(location.search);
const slot=args.get('slot')==='enemy'?'enemy':'player';
let currentId='',side='front',v4=null,frameAt=0,showOriginalV4=true;
let playing=false,frameIndex=0,playingSince=0,switchNonce=0,activePaintFrame=0;
let frameFrames={},globalLayer=null,frameLayer=null,correctionTimer=0,decodeBusy=false;
const okId=v=>/^[\w-]{1,80}$/.test(v);
const message=s=>$('studio-status').textContent=s;
function openDB(){return new Promise((ok,no)=>{
 const r=indexedDB.open(DB,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};
 r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
});}
async function kv(mode,key,data){
 const db=await openDB();
 try{return await new Promise((ok,no)=>{
  const q=db.transaction('kv',mode).objectStore('kv'),r=mode==='readonly'?q.get(key):q.put(data,key);
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);
 });}finally{db.close();}
}
const get=k=>kv('readonly',k).catch(()=>null),put=(k,v)=>kv('readwrite',k,v);
const fileURL=file=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(file)});
const section=document.createElement('section');section.id='studio-library';
section.innerHTML=[
 '<div class="studio-row"><label for="studio-character">所有已导入人物</label>',
 '<select id="studio-character" aria-label="全部已导入角色"></select>',
 '<label for="studio-side">方向</label><select id="studio-side"><option value="front">正面</option><option value="back">背面</option></select>',
 '<button id="studio-back" type="button">返回游戏 DEV</button></div>',
 '<div class="studio-row"><button id="studio-save" type="button">保存到游戏 · L2D</button>',
 '<label class="studio-import">导入新人物<input id="studio-import" type="file" accept="image/png,image/webp,image/jpeg" multiple></label>',
 '<label class="studio-import">导入 V4 动态工程 ZIP<input id="studio-v4zip" type="file" accept=".zip,application/zip"></label>',
 '<output id="studio-status" role="status">读取人物资源库…</output></div>',
 '<div id="studio-v4-wrap" hidden><canvas id="studio-v4-canvas" width="1024" height="1024"></canvas>',
 '<div class="studio-v4-tools"><strong>V4 原动画 · 主画布直接绘制</strong>',
 '<p>可在 V4 动画上修补全帧或选定单帧，原始 128 帧不被破坏。原版为逐帧 WebP，并非可反解的 Cubism 骨骼工程。</p>',
 '<label>绘画范围 <select id="studio-edit-scope"><option value="all">全部帧（通用修补）</option><option value="frame">仅当前帧</option></select></label>',
 '<label>帧 <output id="studio-frame-label">0 / 127</output><input id="studio-frame" type="range" min="0" max="127" value="0" step="1"></label>',
 '<div class="studio-row"><button id="studio-play" type="button">播放</button><button id="studio-v4-mode" type="button">查看静态分层</button>',
 '<button id="studio-patch-export" type="button">导出修补备份</button><label class="studio-import">导入修补备份<input id="studio-patch-import" type="file" accept="application/json,.json"></label></div>',
 '<small>按人物、正背面、帧分别保存；首次打开默认暂停，方便精修。</small></div></div>'
].join('');
const style=document.createElement('style');
style.textContent=[
 '#studio-library{margin:8px;padding:10px;border:1px solid #42556c;border-radius:9px;background:#182234}',
 '.studio-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0}',
 '.studio-row label{font-size:12px;color:#d6e4f5}',
 '.studio-row select{max-width:270px;padding:7px}',
 '.studio-row button{padding:7px 11px}',
 '.studio-import{cursor:pointer;border:1px solid #4a6079;border-radius:7px;padding:8px;background:#243449}',
 '.studio-import input{display:none}',
 '#studio-status{flex:1;min-width:190px;color:#abd5fc;font-size:12px}',
 '#studio-v4-wrap{display:flex;gap:12px;align-items:center;margin-top:8px;color:#b9c9de;font-size:12px}',
 '#studio-v4-wrap[hidden]{display:none}',
 '#studio-v4-canvas{width:110px;height:180px;object-fit:contain;flex-shrink:0;background:#1b2634;border:1px solid #52657e}',
 '.studio-v4-tools{flex:1;min-width:210px;display:grid;gap:5px}.studio-v4-tools p{font-size:11px;color:#b7c9dc;margin:4px 0}.studio-v4-tools label{font-size:12px}.studio-v4-tools input[type=range]{width:100%}',
 '#studio-frame-label{font-size:11px;color:#96cfff}',
 'body.studio-page .layout{height:calc(100dvh - 170px);min-height:430px}',
 '@media(max-width:710px){.studio-row select{max-width:100%;flex:1}body.studio-page .layout{height:auto}}'
].join('\n');
document.head.append(style);
document.querySelector('header').after(section);
document.body.classList.add('studio-page');
const selector=$('studio-character'),direction=$('studio-side');
function options(){
 const old=selector.value;
 selector.replaceChildren();
 for(const c of list.values())selector.add(new Option(c.label||c.id,c.id));
 if(list.has(currentId))selector.value=currentId;
 else if(list.has(old))selector.value=old;
}
let switchQueue=Promise.resolve();
function change(id,face='front'){
 // Serialise character changes so two rapid UI selections cannot load
 // two different IndexedDB projects over the same working layer stack.
 const pending=switchQueue.then(()=>changeCore(id,face),()=>changeCore(id,face));
 switchQueue=pending.catch(()=>{});
 return pending;
}
async function changeCore(id,face='front'){
 if(!list.has(id))throw Error('角色不在已导入列表中：'+id);
 currentId=id;side=face==='back'?'back':'front';
 options();direction.value=side;
 const c=list.get(id);
 await ed.switchCharacter({id:c.id,label:c.label,front:c.front||'',back:c.back||''},side);
 window.dispatchEvent(new CustomEvent('paperchalk:studio-character-loaded',{detail:{id,side}}));
 try{localStorage.setItem('paperchalk-studio-last',JSON.stringify({id,side}));}catch(e){}
 const override=await get('clip:'+id+':'+side);
 const builtin=id==='protagonist'?{url:new URL('../assets/l2d/v4/'+side+'.webp',location.href).href,
   crop:{x:351,y:9,w:335,h:1013},edition:'V4-official'}:null;
 await showClip(override||builtin);
 message('已选择 '+(c.label||id)+' · '+(side==='back'?'背面':'正面')+'，本人物独立保存图层及骨骼参数');
 history.replaceState(null,'','?character='+encodeURIComponent(id)+'&side='+side+'&slot='+slot+'&from=game');
}
async function loadList(){
 list.set('protagonist',{id:'protagonist',label:'女主角',front:'../assets/characters/protagonist-front.webp',back:'../assets/characters/protagonist-back.webp'});
 try{
  const res=await fetch('../characters.catalog.json',{cache:'no-store'});
  if(res.ok)for(const c of (await res.json()).characters||[]){
   if(!okId(c.id))continue;
   list.set(c.id,{id:c.id,label:c.label||c.id,
    front:c.front?new URL(c.front,new URL('../',location.href)).href:'',
    back:c.back?new URL(c.back,new URL('../',location.href)).href:''});
  }
 }catch(e){console.warn('Character catalog offline',e)}
 const imported=await get('imported');
 if(Array.isArray(imported))for(const c of imported)if(okId(c?.id))list.set(c.id,c);
 const overrides=await get('overrides');
 if(Array.isArray(overrides))for(const c of overrides)if(list.has(c?.id))Object.assign(list.get(c.id),c);
 let last=null;try{last=JSON.parse(localStorage.getItem('paperchalk-studio-last')||'null')}catch(e){}
 const id=args.get('character')||last?.id||'protagonist';
 await change(list.has(id)?id:'protagonist',args.get('side')||last?.side||'front');
}
async function saveToGame(){
 if(!currentId)return;
 await ed.applyToGame();
 const motion=ed.motion?.()||{};
 for(const face of ['front','back']){
  await put('render:'+currentId+':'+face,ed.composite(face).toDataURL('image/png'));
  if(motion[face])await put('l2d:'+currentId+':'+face,motion[face]);
 }
 const binding=await get('slot:'+slot);
 if(binding?.id===currentId)await put('slot:'+slot,{id:currentId,side});
 message('✓ 已保存 '+(list.get(currentId)?.label||currentId)+' 到游戏，下次打开游戏继续使用动态 L2D。');
}
async function importImages(files){
 const groups=new Map();
 for(const file of files){
  if(!/^image\/(png|webp|jpeg)$/.test(file.type))continue;
  const m=file.name.match(/^(.*?)(?:[-_ ](front|back|正面|背面))?\.(png|webp|jpe?g)$/i);
  if(!m)continue;
  const label=m[1]||'新人物',face=/^(back|背面)$/i.test(m[2]||'')?'back':'front';
  let c=groups.get(label)||[...list.values()].find(v=>v.localFamily===label);
  if(!c){c={id:'local-'+crypto.randomUUID().slice(0,12),label,localFamily:label,front:'',back:''};list.set(c.id,c);}
  c[face]=await fileURL(file);groups.set(label,c);
 }
 if(!groups.size)throw Error('请选择 PNG/WebP 图片');
 await put('imported',[...list.values()].filter(c=>c.id.startsWith('local-')));
 const c=[...groups.values()].at(-1);await change(c.id,c.back&&!c.front?'back':'front');
}
async function zipFiles(file){
 const buf=new Uint8Array(await file.arrayBuffer()),v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
 let cursor=0;const files=new Map();
 while(cursor+30<=buf.length&&v.getUint32(cursor,true)===0x04034b50){
  if(v.getUint16(cursor+6,true)&8)throw Error('ZIP 不支持数据描述符，请用标准 ZIP');
  const method=v.getUint16(cursor+8,true),size=v.getUint32(cursor+18,true),
   nameLen=v.getUint16(cursor+26,true),extra=v.getUint16(cursor+28,true);
  const name=new TextDecoder().decode(buf.slice(cursor+30,cursor+30+nameLen));
  const start=cursor+30+nameLen+extra;
  if(start+size>buf.length)throw Error('ZIP 损坏');
  let bytes=buf.slice(start,start+size);
  if(method===8){
   const resp=new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')));
   bytes=new Uint8Array(await resp.arrayBuffer());
  }else if(method!==0)throw Error('不支持的 ZIP 压缩方式：'+method);
  if(!name.includes('..'))files.set(name,bytes);
  cursor=start+size;
 }
 return files;
}
async function importV4(file){
 if(!currentId)throw Error('先选择人物');
 message('读取 V4 原版动画工程…');
 const files=await zipFiles(file);
 let count=0;
 for(const face of ['front','back']){
  const bytes=files.get(face+'.webp');
  if(!bytes)continue;
  const data=await fileURL(new Blob([bytes],{type:'image/webp'}));
  await put('clip:'+currentId+':'+face,{
   data,crop:{x:351,y:9,w:335,h:1013},source:'PSD V4',updatedAt:Date.now()
  });count++;
 }
 if(!count)throw Error('不是 V4 完整工程 ZIP：找不到 front.webp / back.webp');
 await showClip(await get('clip:'+currentId+':'+side));
 message('✓ '+count+' 个 V4 动态方向已导入当前人物；游戏使用原版动态帧，不再使用静态背面。');
}
async function showClip(info){
 v4=null;
 const uri=info?.data||info?.url||'';
 $('studio-v4-wrap').hidden=!uri;
 if(!uri){ed.l2dRig?.()?.start();return;}
 const img=new Image();
 await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=uri});
 v4={img,crop:info.crop||{x:351,y:9,w:335,h:1013},edition:info.edition||'V4-imported'};
 if(showOriginalV4)ed.l2dRig?.()?.stop();
 $('studio-v4-mode').textContent=showOriginalV4?'切换到图层实时变形':'切换到原版 V4 动画';
}
function loop(t){
 if(v4&&t-frameAt>=48){
  frameAt=t;
  const {img,crop}=v4;
  if(img.complete&&img.naturalWidth){
   const draw=canvas=>{
    if(!canvas)return;
    const g=canvas.getContext('2d');
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1024,1024);
    g.drawImage(img,crop.x,crop.y,crop.w,crop.h);
   };
   draw($('studio-v4-canvas'));
   if(showOriginalV4)draw($('l2d-live-canvas'));
  }
 }
 requestAnimationFrame(loop);
}
$('studio-v4-mode').onclick=()=>{
 showOriginalV4=!showOriginalV4;
 $('studio-v4-mode').textContent=showOriginalV4?'切换到图层实时变形':'切换到原版 V4 动画';
 const rig=ed.l2dRig?.();
 if(showOriginalV4)rig?.stop();else rig?.start();
 window.dispatchEvent(new Event('paperchalk:studio-mode-changed'));
};
selector.onchange=()=>change(selector.value,direction.value).catch(e=>message(e.message));
direction.onchange=()=>change(selector.value,direction.value).catch(e=>message(e.message));
$('studio-save').onclick=()=>saveToGame().catch(e=>message('保存失败：'+e.message));
$('studio-back').onclick=()=>location.assign(new URL('../?dev=1',location.href).href);
$('studio-import').onchange=e=>{const files=[...e.target.files];e.target.value='';importImages(files).catch(x=>message('导入失败：'+x.message));};
$('studio-v4zip').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)importV4(f).catch(x=>message('导入V4失败：'+x.message));};
window.PaperchalkStudio={list,change,saveToGame,useV4:()=>!!v4&&showOriginalV4,get current(){return currentId},get edition(){return v4?.edition||'mesh'}};
requestAnimationFrame(loop);loadList().catch(e=>message('人物列表加载失败：'+e.message));
})();
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
 if(currentId&&v4&&frameLayer)await persistCorrections();
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
 await loadCorrectionLayers();
 window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{detail:{id,side}}));
 message('已选择 '+(c.label||id)+' · '+(side==='back'?'背面':'正面')+'，本人物独立保存图层及骨骼参数');
 history.replaceState(null,'','?character='+encodeURIComponent(id)+'&side='+side+'&slot='+slot+'&from=game');
}
async function loadList(){
 list.set('protagonist',{id:'protagonist',label:'女主角',front:'../assets/characters/protagonist-front.webp',back:'../assets/characters/protagonist-back.webp'});
 try{
  const res=await fetch('../characters.catalog.json',{cache:'no-store'});
  if(res.ok)for(const c of (await res.json()).characters||[]){
   if(!okId(c.id))continue;
   list.set(c.id,{id:c.id,label:(c.label||c.id)+(c.draft?' · 未导入立绘':''),draft:!!c.draft,
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
 clearTimeout(correctionTimer);
 await ed.save();
 if(v4)await persistCorrections();
 const motion=ed.motion?.()||{};
 for(const face of ['front','back']){
  // Rendering reference is separate from the V4 animation itself; do NOT
  // replace the approved 128-frame WebP with a flattened still image.
  if(!v4||face!==side)await put('render:'+currentId+':'+face,ed.composite(face).toDataURL('image/png'));
  if(motion[face])await put('l2d:'+currentId+':'+face,motion[face]);
 }
 const binding=await get('slot:'+slot);
 if(binding?.id===currentId)await put('slot:'+slot,{id:currentId,side});
 message('✓ 已保存 '+(list.get(currentId)?.label||currentId)+'：V4 原始动画保留；当前方向存有 '+Object.keys(frameFrames).length+' 个修补关键帧。可导出备份。');
}
async function importImages(files){
 const groups=new Map();
 // When an existing GitHub draft is selected, attach the supplied art
 // to that canonical ID instead of generating a duplicate person.
 const draft=list.get(currentId);
 if(draft?.draft&&files.length){
  for(const f of files){
   if(!/^image\/(png|webp|jpeg)$/.test(f.type))continue;
   const direction=/\b(back|背面)\b/i.test(f.name)?'back':'front';
   draft[direction]=await fileURL(f);
  }
  draft.draft=false;draft.label=draft.label.replace(' · 未导入立绘','');
  await put('overrides',[...list.values()].filter(c=>c.draft===false&&!c.id.startsWith('local-')&&(c.front?.startsWith('data:')||c.back?.startsWith('data:'))));
  await change(currentId,side);
  message('✓ 已将新素材导入现有人物档案（未创建重复人物）');
  return;
 }
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
 const previous=v4;
 v4=null;
 if(previous?.decoder)try{previous.decoder.close()}catch(_){}
 const uri=info?.data||info?.url||'';
 $('studio-v4-wrap').hidden=!uri;
 document.body.classList.toggle('v4-authoring',!!uri);
 const legacyRig=document.getElementById('dev-l2d-preview-controls');
 if(legacyRig)legacyRig.hidden=!!uri;
 if(!uri){globalLayer=null;frameLayer=null;ed.l2dRig?.()?.start();ed.render();return;}
 const token=++switchNonce;
 const surface=ed.make(1024,1024),crop=info.crop||{x:351,y:9,w:335,h:1013};
 let decoder=null,img=null,count=128;
 try{
  if(typeof ImageDecoder!=='function')throw Error('此浏览器未提供 ImageDecoder');
  const res=await fetch(uri);
  if(!res.ok)throw Error('V4 动画请求失败 HTTP '+res.status);
  decoder=new ImageDecoder({data:await res.arrayBuffer(),type:'image/webp',preferAnimation:true});
  await decoder.tracks.ready;
  count=decoder.tracks.selectedTrack?.frameCount||128;
 }catch(e){
  if(decoder)try{decoder.close()}catch(_){}
  decoder=null;
  img=await new Promise((ok,no)=>{
   const element=new Image();element.onload=()=>ok(element);element.onerror=()=>no(Error('V4 图片加载失败'));element.src=uri;
  });
  message('注意：此浏览器不能精确解码 V4 帧。请使用支持 WebCodecs 的浏览器精修逐帧动画。');
 }
 if(token!==switchNonce){if(decoder)decoder.close();return;}
 v4={decoder,img,count,crop,surface,frame:-1,busy:false,edition:info.edition||'V4-imported'};
 frameIndex=0;activePaintFrame=0;playing=false;playingSince=0;
 $('studio-frame').max=String(Math.max(0,count-1));
 $('studio-frame').value='0';$('studio-frame-label').textContent='0 / '+(count-1);
 $('studio-play').textContent='播放';
 ed.l2dRig?.()?.stop();
 await drawFrame(0);
}
function drawBackdrop(ctx){
 if(!v4||!showOriginalV4)return;
 ctx.drawImage(v4.surface,0,0);
 // During playback, paint corrections for the *actual* V4 frame.
 if(playing&&frameFrames[frameIndex]){
  const cached=frameImageCache.get(frameIndex);
  if(cached)ctx.drawImage(cached,0,0);
 }
}
const frameImageCache=new Map();
async function drawFrame(index){
 const clip=v4;
 if(!clip||clip.busy)return;
 clip.busy=true;
 try{
  const g=clip.surface.getContext('2d',{alpha:true});
  let image=null;
  if(clip.decoder){
   const decoded=await clip.decoder.decode({frameIndex:index});
   image=decoded.image;
  }else image=clip.img;
  if(v4!==clip){if(clip.decoder)image?.close();return;}
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1024,1024);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(image,clip.crop.x,clip.crop.y,clip.crop.w,clip.crop.h);
  if(clip.decoder)image.close();
  clip.frame=index;
  const thumb=$('studio-v4-canvas'),t=thumb.getContext('2d');
  t.clearRect(0,0,1024,1024);t.drawImage(clip.surface,0,0);
  ed.render();
 }catch(e){console.warn('V4 frame error',e);message('V4 解码失败：'+e.message);}
 finally{clip.busy=false;}
}
function originalLayer(p){
 return /^(原始素材|原始角色合成参考|原网站合成参考)/.test(p.name);
}
function blankOrSaved(data){
 const c=ed.make();
 if(data){
  const im=new Image();
  im.onload=()=>{c.getContext('2d').clearRect(0,0,1024,1024);c.getContext('2d').drawImage(im,0,0);ed.render();};
  im.src=data;
 }
 return c;
}
async function loadCorrectionLayers(){
 if(!v4){globalLayer=null;frameLayer=null;frameFrames={};return;}
 const arr=ed.S.layers[side];
 for(const part of arr)if(originalLayer(part))part.visible=false;
 globalLayer=arr.find(x=>x.name==='V4 · 全帧修补');
 if(!globalLayer){
  globalLayer=ed.layer('V4 · 全帧修补',null,0,0,false);
  arr.push(globalLayer);
 }
 frameLayer=arr.find(x=>x.name==='V4 · 当前帧修补');
 if(!frameLayer){
  frameLayer=ed.layer('V4 · 当前帧修补',null,0,0,false);
  arr.push(frameLayer);
 }
 frameFrames=await get('frames:'+currentId+':'+side)||{};
 frameImageCache.clear();
 frameLayer.canvas.getContext('2d').clearRect(0,0,1024,1024);
 const scope=$('studio-edit-scope').value||'all';
 frameLayer.visible=scope==='frame'&&!playing;
 ed.S.sel=Math.max(0,arr.indexOf(scope==='frame'?frameLayer:globalLayer));
 await loadFrameImage(0);
 ed.renderList();ed.render();
}
function hasPaint(canvas){
 const arr=canvas.getContext('2d',{willReadFrequently:true})
  .getImageData(0,0,canvas.width,canvas.height).data;
 for(let i=3;i<arr.length;i+=4)if(arr[i])return true;
 return false;
}
function snapshotFrame(){
 if(!frameLayer||!v4||playing)return;
 if(hasPaint(frameLayer.canvas)){
  const url=frameLayer.canvas.toDataURL('image/png');
  frameFrames[activePaintFrame]=url;
  const im=new Image();
  im.src=url;frameImageCache.set(activePaintFrame,im);
 }else{delete frameFrames[activePaintFrame];frameImageCache.delete(activePaintFrame);}
}
async function loadFrameImage(idx){
 if(!frameLayer)return;
 const c=frameLayer.canvas,g=c.getContext('2d');
 g.clearRect(0,0,c.width,c.height);
 const data=frameFrames[idx];
 if(data){
  const img=new Image();
  await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=data;});
  g.drawImage(img,0,0);frameImageCache.set(idx,img);
 }
 activePaintFrame=idx;ed.render();
}
async function seek(index){
 if(!v4)return;
 if(!playing)snapshotFrame();
 frameIndex=Math.max(0,Math.min(v4.count-1,Number(index)||0));
 $('studio-frame').value=String(frameIndex);
 $('studio-frame-label').textContent=frameIndex+' / '+(v4.count-1);
 if(!playing)await loadFrameImage(frameIndex);
 await drawFrame(frameIndex);
}
function collectGlobalOverlay(){
 const c=ed.make(),g=c.getContext('2d');
 for(const p of ed.S.layers[side]){
  if(!p.visible||p===frameLayer||originalLayer(p))continue;
  g.globalAlpha=p.opacity;
  g.drawImage(p.canvas,p.x,p.y);
 }
 g.globalAlpha=1;return c;
}
async function persistCorrections(){
 if(!v4||!currentId||!globalLayer)return;
 if(!playing)snapshotFrame();
 const c=collectGlobalOverlay();
 const general=hasPaint(c)?c.toDataURL('image/png'):null;
 await put('overlay:'+currentId+':'+side,general);
 await put('frames:'+currentId+':'+side,frameFrames);
}
function frameLoop(t){
 if(v4&&!document.hidden){
  if(playing){
   const idx=Math.floor((t-playingSince)/50)%v4.count;
   if(frameIndex!==idx&&!v4.busy){
    frameIndex=idx;$('studio-frame').value=String(idx);
    $('studio-frame-label').textContent=idx+' / '+(v4.count-1);
    drawFrame(idx);
   }
  }
 }
 requestAnimationFrame(frameLoop);
}
$('studio-frame').oninput=e=>{if(playing){playing=false;$('studio-play').textContent='播放';}
 seek(Number(e.target.value)).catch(err=>message(err.message));};
$('studio-play').onclick=async()=>{
 if(!v4)return;
 if(!playing){
  snapshotFrame();
  playing=true;frameLayer.visible=false;
  playingSince=performance.now()-frameIndex*50;
  $('studio-play').textContent='暂停';
 }else{
  playing=false;
  frameLayer.visible=$('studio-edit-scope').value==='frame';
  $('studio-play').textContent='播放';
  await loadFrameImage(frameIndex);
 }
 ed.renderList();ed.render();
};
$('studio-edit-scope').onchange=()=>{
 if(!v4)return;
 if(!playing)snapshotFrame();
 frameLayer.visible=$('studio-edit-scope').value==='frame'&&!playing;
 ed.S.sel=ed.S.layers[side].indexOf(frameLayer.visible?frameLayer:globalLayer);
 ed.renderList();ed.render();
};
$('studio-v4-mode').onclick=()=>{
 showOriginalV4=!showOriginalV4;
 $('studio-v4-mode').textContent=showOriginalV4?'隐藏 V4 背景':'显示 V4 背景';
 ed.render();
};
let suspendAutobackup=false;
window.addEventListener('paperchalk:art-dirty',()=>{
 if(suspendAutobackup||!v4)return;
 clearTimeout(correctionTimer);
 correctionTimer=setTimeout(()=>persistCorrections().catch(e=>message('自动存档失败：'+e.message)),2100);
});
$('studio-patch-export').onclick=async()=>{
 if(!v4)return;
 await persistCorrections();
 const front=await Promise.all(['front','back'].map(async face=>({
  side:face,overlay:await get('overlay:'+currentId+':'+face),
  frames:await get('frames:'+currentId+':'+face)||{}
 })));
 const out={format:'paperchalk-v4-corrections-v1',characterId:currentId,profile:ed.motion?.(),sides:front,createdAt:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(out)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='l2d-v4-'+currentId+'-corrections.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 message('✓ 已导出 V4 精修备份（含独立正背面及关键帧）。');
};
$('studio-patch-import').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';
 if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data.format!=='paperchalk-v4-corrections-v1'||data.characterId!==currentId)throw Error('角色或文件格式不一致');
  for(const face of data.sides||[]){
   if(!['front','back'].includes(face.side))continue;
   await put('overlay:'+currentId+':'+face.side,face.overlay||null);
   await put('frames:'+currentId+':'+face.side,face.frames||{});
  }
  await loadCorrectionLayers();
  message('✓ 已导入当前人物 V4 修补备份。');
 }catch(e){message('导入失败：'+e.message)}
};

selector.onchange=()=>change(selector.value,direction.value).catch(e=>message(e.message));
direction.onchange=()=>change(selector.value,direction.value).catch(e=>message(e.message));
$('studio-save').onclick=()=>saveToGame().catch(e=>message('保存失败：'+e.message));
$('studio-back').onclick=()=>location.assign(new URL('../?dev=1',location.href).href);
$('studio-import').onchange=e=>{const files=[...e.target.files];e.target.value='';importImages(files).catch(x=>message('导入失败：'+x.message));};
$('studio-v4zip').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)importV4(f).catch(x=>message('导入V4失败：'+x.message));};
window.PaperchalkStudio={list,change,saveToGame,drawBackdrop,useV4:()=>!!v4&&showOriginalV4,get isV4(){return !!v4},get frame(){return frameIndex},get editSide(){return side},get correctedFrames(){return Object.keys(frameFrames)},get activePaintFrame(){return activePaintFrame},get frameHasPaint(){return !!frameLayer&&hasPaint(frameLayer.canvas)},get current(){return currentId},get edition(){return v4?.edition||'mesh'}};
requestAnimationFrame(frameLoop);loadList().catch(e=>message('人物列表加载失败：'+e.message));
})();
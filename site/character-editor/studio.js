/* Single all-imported character L2D studio, shared with the game via IndexedDB. */
(()=>{
'use strict';
const ed=window.characterEditor;if(!ed)return;
const $=id=>document.getElementById(id), DB='paperchalk-dev-characters-v1';
const list=new Map();
const BATTLE_FRONT_ID='protagonist-battle-front';
const args=new URLSearchParams(location.search);
const slot=args.get('slot')==='enemy'?'enemy':'player';
let currentId='',side='front',v4=null,frameAt=0,showOriginalV4=true;
let playing=false,frameIndex=0,playingSince=0,switchNonce=0,activePaintFrame=0;
let frameFrames={},globalLayer=null,frameLayer=null,correctionTimer=0,decodeBusy=false;
// This is the very same baked V4 clip loaded by game/dev/character-bridge.js.
// Source layers only author pixel patches; they are not a substitute animation.
let previewPatch=null;
const okId=v=>/^[\w-]{1,80}$/.test(v);
const message=s=>$('studio-status').textContent=s;
// Live game tabs share this origin and the exact same IndexedDB records.
// Broadcast only a reload notification AFTER the corresponding write commits;
// never send image pixels, change a second actor, or publish user art to GitHub.
const gameSync=typeof BroadcastChannel==='function'
 ?new BroadcastChannel('paperchalk-l2d-live-v1'):null;
function notifyGame(id=currentId,face=side,kind='rig-saved'){
 if(!gameSync||!okId(id)||!['front','back'].includes(face))return;
 gameSync.postMessage({type:'paperchalk:l2d-saved',id,face,slot,kind});
}
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
async function dropDraft(key){
 const db=await openDB();
 try{await new Promise((resolve,reject)=>{
  const r=db.transaction('kv','readwrite').objectStore('kv').delete(key);
  r.onsuccess=resolve;r.onerror=()=>reject(r.error);
 });}finally{db.close();}
}
const female2PsdIds=['head_reference','back_hair','legwear','footwear','neck',
 'bottomwear','topwear','ears','face','hand_raised','hand_lowered','mouth','eyebrow',
 'eyewhite','irides','eyelash','nose','front_hair'];
const hasFemale2Psd=ids=>ids.length===18&&female2PsdIds.every(id=>ids.includes(id));
const fileURL=file=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(file)});
const section=document.createElement('section');section.id='studio-library';
section.innerHTML=[
 '<div class="studio-row"><label for="studio-character">所有已导入人物</label>',
 '<select id="studio-character" aria-label="全部已导入角色"></select>',
 '<label for="studio-side">方向</label><select id="studio-side"><option value="front">正面</option><option value="back">背面</option></select>',
 '<button id="studio-back" type="button">返回游戏 DEV</button></div>',
 '<div class="studio-row"><button id="studio-save" type="button" hidden aria-hidden="true">保存到游戏 · L2D</button>',
 '<label class="studio-import">导入新人物<input id="studio-import" type="file" accept="image/png,image/webp,image/jpeg" multiple></label>',
 '<label class="studio-import">导入 V4 动态工程 ZIP<input id="studio-v4zip" type="file" accept=".zip,application/zip"></label>',
 '<label class="studio-import">导入全部真实部件（PSD / V4 ZIP）<input id="studio-parts-import" type="file" accept=".zip,.psd,application/zip"></label>',
 '<output id="studio-status" role="status">读取人物资源库…</output></div>',
 '<div id="studio-battle-import-row" class="studio-row" hidden>',
 '<strong>女主·战斗正面｜独立 PSD 拆分工程</strong>',
 '<label class="studio-import studio-battle-picker">导入已整理的 24 层战斗正面 ZIP<input id="studio-battle-import" type="file" accept=".zip,application/zip"></label>',
 '<span class="studio-battle-note">保留源图层原位与独立 L2D 绑定。上方重复斧头默认隐藏；本工程不会覆盖原版女主或自动替换游戏站位。</span>',
 '</div>',
 '<div id="studio-v4-wrap" hidden><canvas id="studio-v4-canvas" width="1024" height="1024" aria-hidden="true" hidden></canvas>',
 '<div class="studio-v4-tools"><strong>游戏实际 V4 动画 · 同一人物、同一帧源</strong>',
 '<p>中央画布默认播放游戏实际使用的 V4 WebP；选中真实分层并落笔时才暂时展示静态源部件，保存后将像素修补叠回同一 V4 动画。不是另造一套网格动画。</p>',
 '<output id="studio-parts-status" role="status">未导入原始分层时只能做 V4 动画修补。</output>',
 '<label>绘画范围 <select id="studio-edit-scope"><option value="all">全部帧（通用修补）</option><option value="frame">仅当前帧</option></select></label>',
 '<label>帧 <output id="studio-frame-label">0 / 127</output><input id="studio-frame" type="range" min="0" max="127" value="0" step="1"></label>',
 '<div class="studio-row"><button id="studio-play" type="button">播放</button>',
 '<button id="studio-patch-export" type="button">导出修补备份</button><label class="studio-import">导入修补备份<input id="studio-patch-import" type="file" accept="application/json,.json"></label></div>',
 '<small>只修改现有角色的原版动画与对应修补图层；数据在本站 IndexedDB 保存，跨设备需导出修补备份。</small></div></div>'
].join('');
const style=document.createElement('style');
style.textContent=[
 '#studio-library{margin:8px;padding:10px;border:1px solid #42556c;border-radius:9px;background:#182234}',
 'body.studio-loading .layout{pointer-events:none;opacity:.58;filter:saturate(.6)}',
 '.studio-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0}',
 '.studio-row label{font-size:12px;color:#d6e4f5}',
 '.studio-row select{max-width:270px;padding:7px}',
 '.studio-row button{padding:7px 11px}',
 '.studio-import{cursor:pointer;border:1px solid #4a6079;border-radius:7px;padding:8px;background:#243449}',
 '.studio-import input{display:none}',
 '#studio-status{flex:1;min-width:190px;color:#abd5fc;font-size:12px}',
 '#studio-battle-import-row[hidden]{display:none!important}',
 '#studio-battle-import-row{padding:10px 11px;border:1px solid #6a6753;background:#2d2a28;border-radius:7px}',
 '#studio-battle-import-row strong{font-size:13px;color:#ead6b3}',
 '#studio-battle-import-row .studio-battle-picker{background:#685037;border-color:#b09168;color:#f8ead1}',
 '.studio-battle-note{color:#c8c5b9;font-size:11px;line-height:1.5}',
 '#studio-v4-wrap{display:none!important} /* Legacy clip tools remain for old imports, not a user-facing animation mode */',
 '#studio-v4-wrap[hidden]{display:none}',
 '#studio-v4-canvas{display:none!important} /* Internal decoded frame: central game V4 viewport is the sole visible preview */',
 '.studio-v4-tools{flex:1;min-width:210px;display:grid;gap:5px}.studio-v4-tools p{font-size:11px;color:#b7c9dc;margin:4px 0}.studio-v4-tools label{font-size:12px}.studio-v4-tools input[type=range]{width:100%}',
 '#studio-frame-label{font-size:11px;color:#96cfff}',
 '#studio-parts-status{font-size:12px;color:#c7d7e9}',
 'body.studio-page{display:flex;flex-direction:column;height:100dvh;min-height:0;overflow:hidden}',
 'body.studio-page>header,body.studio-page>#studio-library{flex:0 0 auto}',
 'body.studio-page>#studio-library{max-height:34dvh;overflow-y:auto}',
 'body.studio-page .layout{flex:1 1 0;height:0;min-height:0;overflow:hidden}',
 'body.studio-page .stage{min-height:0}',
 '@media(max-width:710px){body.studio-page{display:block;height:auto;min-height:100dvh;overflow:visible}body.studio-page>#studio-library{max-height:none;overflow:visible}.studio-row select{max-width:100%;flex:1}body.studio-page .layout{display:flex;flex-direction:column;height:auto;min-height:0;overflow:visible}body.studio-page .stage{height:62dvh;min-height:400px}}'
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
 document.body.classList.add('studio-loading');
 try{
 if(currentId){
  // Flush the current character's independent mesh draft BEFORE changing
  // currentId/side, otherwise it could be written under the next character.
  if(window.PaperchalkPartRigStudio?.state?.dirty)
   await window.PaperchalkPartRigStudio.save();
  if(v4&&frameLayer)await persistCorrections();
  for(const f of ['front','back'])await persistEditedComponents(f);
  for(const f of ['front','back'])await persistSkeleton(f);
  await ed.save();
 }
 if(!list.has(id))throw Error('角色不在已导入列表中：'+id);
 const chosen=list.get(id);
 if(face==='back'&&!chosen.back&&!chosen.clips?.back)
  throw Error('角色 '+chosen.label+' 尚无真实背面，禁止用正面冒充');
 currentId=id;side=face==='back'?'back':'front';
 options();direction.value=side;
 $('studio-battle-import-row').hidden=id!==BATTLE_FRONT_ID;
 const c=list.get(id);
 direction.querySelector('option[value="back"]').disabled=!c.back&&!c.clips?.back;
 await ed.switchCharacter({id:c.id,label:c.label,front:c.front||'',back:c.back||''},side);
 window.dispatchEvent(new CustomEvent('paperchalk:studio-character-loaded',{detail:{id,side}}));
 try{localStorage.setItem('paperchalk-studio-last',JSON.stringify({id,side}));}catch(e){}
 const override=await get('clip:'+id+':'+side);
 const deployed=c.clips?.[side];
 const builtin=deployed?{
   url:new URL(deployed.url,new URL('../',location.href)).href,
   crop:deployed.crop,edition:'V4-official'
  }:id==='protagonist'?{
   url:new URL('../assets/l2d/v4/'+side+'.webp',location.href).href,
   crop:{x:351,y:9,w:335,h:1013},edition:'V4-official'
  }:null;
 await showClip(override||builtin);
 await loadCorrectionLayers();
 await ensureHostedParts(id);
 updatePartStatus();
 // A hosted model and its layers may increase the top library height after
 // switchCharacter() has fitted the old geometry. Fit again once the final
 // responsive layout is measured; never clip feet on desktop first open.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(currentId===id&&document.getElementById('fit'))document.getElementById('fit').click();
 }));
 window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{detail:{id,side}}));
 message('已选择 '+(c.label||id)+' · '+(side==='back'?'背面':'正面')+'，本人物独立保存图层及骨骼参数');
 history.replaceState(null,'','?character='+encodeURIComponent(id)+'&side='+side+'&slot='+slot+'&from=game'+
  (args.get('idle')==='1'?'&idle=1':''));
 }finally{document.body.classList.remove('studio-loading')}
}
async function loadList(){
 list.set('protagonist',{id:'protagonist',label:'女主角',front:'../assets/characters/protagonist-front.webp',back:'../assets/characters/protagonist-back.webp'});
 // A separate, local-only authoring slot; the published protagonist model,
 // DEV assignment and original textures remain strictly untouched.
 // Transparent placeholder is intentional until the genuine PSD ZIP is imported.
 const blank= 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><text x="512" y="493" text-anchor="middle" font-size="29" fill="#b9b0a3">女主 · 战斗正面</text><text x="512" y="545" text-anchor="middle" font-size="20" fill="#92877b">请导入原位分层 ZIP</text></svg>');
 list.set(BATTLE_FRONT_ID,{id:BATTLE_FRONT_ID,label:'女主·战斗正面（独立工程）',front:blank,back:''});
 try{
  const res=await fetch('../characters.catalog.json',{cache:'no-store'});
  if(res.ok)for(const c of (await res.json()).characters||[]){
   if(!okId(c.id))continue;
   list.set(c.id,{id:c.id,label:(c.label||c.id)+(c.draft?' · 未导入立绘':''),draft:!!c.draft,
    front:c.front?new URL(c.front,new URL('../',location.href)).href:'',
    back:c.back?new URL(c.back,new URL('../',location.href)).href:'',
    clips:c.clips||{},animated:c.animated||{},l2dModule:c.l2dModule||{}});
  }
 }catch(e){console.warn('Character catalog offline',e)}
 const canonicalFemale2=list.get('char-002');
 const imported=await get('imported');
 if(Array.isArray(imported))for(const c of imported)if(okId(c?.id))list.set(c.id,c);
 const overrides=await get('overrides');
 if(Array.isArray(overrides))for(const c of overrides)if(list.has(c?.id))Object.assign(list.get(c.id),c);
 if(canonicalFemale2)list.set('char-002',canonicalFemale2);
 let last=null;try{last=JSON.parse(localStorage.getItem('paperchalk-studio-last')||'null')}catch(e){}
 const id=args.get('character')||last?.id||'protagonist';
 await change(list.has(id)?id:'protagonist',args.get('side')||last?.side||'front');
}
const decodedPristine=new Map();
async function originalComposite(face){
 const key=currentId+':'+face,record=await get('baseline:'+key)||[];
 if(!record.length)return null;
 const cached=decodedPristine.get(key);
 if(cached&&cached.count===record.length)return cached.canvas;
 const canvas=ed.make(),ctx=canvas.getContext('2d',{alpha:true});
 for(const part of record){
  if(part.visible===false||!part.image)continue;
  const image=await ed.imgFrom(part.image);
  ctx.globalAlpha=Number(part.opacity??1);
  ctx.drawImage(image,Number(part.x)||0,Number(part.y)||0);
 }
 ctx.globalAlpha=1;
 decodedPristine.set(key,{canvas,count:record.length});
 return canvas;
}
function editedComposite(face){
 const canvas=ed.make(),ctx=canvas.getContext('2d',{alpha:true});
 for(const part of ed.S.layers[face]){
  if(!part.sourcePart||!part.visible)continue;
  ctx.globalAlpha=Number(part.opacity??1);
  ctx.drawImage(part.canvas,Number(part.x)||0,Number(part.y)||0);
 }
 ctx.globalAlpha=1;return canvas;
}
async function persistEditedComponents(face){
 if(!ed.S.layers[face].some(p=>p.sourcePart))return;
 const original=await originalComposite(face);
 if(!original)return;
 const newer=editedComposite(face),a=original.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1024,1024).data,
 b=newer.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1024,1024).data;
 const mask=ed.make(),paint=ed.make();
 const maskData=mask.getContext('2d').createImageData(1024,1024);
 const paintData=paint.getContext('2d').createImageData(1024,1024);
 let changes=0;
 for(let i=0;i<a.length;i+=4){
  if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3])continue;
  maskData.data[i+3]=255;
  paintData.data[i]=b[i];paintData.data[i+1]=b[i+1];
  paintData.data[i+2]=b[i+2];paintData.data[i+3]=b[i+3];changes++;
 }
 if(!changes){
  if(face===side){previewPatch=null;ed.render();}
  await put('parts-patch:'+currentId+':'+face,null);return;
 }
 mask.getContext('2d').putImageData(maskData,0,0);
 paint.getContext('2d').putImageData(paintData,0,0);
 if(face===side){previewPatch={erase:mask,paint};ed.render();}
 await put('parts-patch:'+currentId+':'+face,{
  erase:mask.toDataURL('image/png'),paint:paint.toDataURL('image/png'),
  changes,updatedAt:Date.now(),mode:'v4-layer-delta'
 });
}

// Keep original PSD bitmaps independently editable AND animated in game.
// A 7-region mask derived from a flat PNG is intentionally never promoted.
async function persistSkeleton(face){
 if(!currentId)return;
 const original=ed.S.layers[face].filter(p=>p.sourcePart&&p.role==='psd-part');
 if(original.length<12){
  // A previous real rig must not survive a manual removal of its source layers.
  if(await get('skeletal:'+currentId+':'+face))
   await put('skeletal:'+currentId+':'+face,null);
  return;
 }
 const parts=original.map(p=>({
  name:String(p.partId||p.name),x:Number(p.x)||0,y:Number(p.y)||0,
  opacity:Number(p.opacity??1),visible:p.visible!==false,
  image:p.canvas.toDataURL('image/png')
 }));
 await put('skeletal:'+currentId+':'+face,parts);
}
// The experimental editable PartRig is deliberately a separate, versioned
// draft. It MUST NOT replace the user's approved V4 clips or overwrite PNGs.
async function readPartRig(id=currentId,face=side){
 if(!id||!['front','back'].includes(face))return null;
 const local=await get('part-rig:'+id+':'+face);
 if(local){
  if(id!=='char-002'||hasFemale2Psd(Object.keys(local.parts||{})))return local;
  await dropDraft('part-rig:'+id+':'+face);
 }
 const pub=list.get(id)?.l2dModule?.[face]?.rig;
 if(!pub?.url)return null;
 const url=new URL(pub.url,new URL('../',location.href));
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('模块绑定文件加载失败：HTTP '+response.status);
 const model=await response.json();
 const sourceId=pub.sourceCharacterId;
 const validAlias=(id==='protagonist'&&sourceId==='protagonist-rig-v1'&&
  model.characterId==='protagonist-rig-v1'&&
  pub.url.startsWith('./assets/l2d/library/protagonist-rig-v1/'))||
  (id==='char-002'&&face==='front'&&sourceId==='char-002-psd-v1'&&
  model.characterId==='char-002-psd-v1'&&model.provenance==='original-psd'&&
  hasFemale2Psd(Object.keys(model.parts||{}))&&
  pub.url.startsWith('./assets/l2d/library/char-002-psd-v1/'));
 if(model.format!=='paperchalk-part-rig-v1'||
    (model.characterId!==id&&!validAlias)||model.face!==face)
  throw Error('当前人物的模块绑定文件格式或方向错误');
 // The copy is ONLY an authoring basis. The official published JSON remains
 // immutable, and local edits stay under the original heroine's own ID.
 return {...model,characterId:id};
}
async function storePartRig(rig){
 if(!rig||rig.format!=='paperchalk-part-rig-v1'||rig.characterId!==currentId||
    !['front','back'].includes(rig.face)||!rig.parts||typeof rig.parts!=='object')
  throw Error('绑定工程人物或方向不一致，拒绝覆盖');
 const layers=ed.S.layers[rig.face].filter(p=>p.sourcePart);
 const ids=new Set(layers.map(p=>String(p.partId||p.name)));
 const keys=Object.keys(rig.parts);
 if(!keys.length||keys.some(k=>!ids.has(k)))
  throw Error('绑定工程部件与真实源图层不一致，拒绝覆盖');
 await put('part-rig:'+currentId+':'+rig.face,JSON.parse(JSON.stringify(rig)));
 return true;
}
async function saveToGame(){
 if(!currentId)return;
 // Save the original edited ArtMesh textures BEFORE the rig snapshot. The
 // committed rig is the save marker after images are durable: navigating
 // immediately to the game cannot race ahead and load stale source PNGs.
 const rig=window.PaperchalkPartRigStudio;
 clearTimeout(correctionTimer);
 await ed.save();
 if(rig?.state?.active||rig?.state?.dirty)await rig.save();
 if(v4)await persistCorrections();
 for(const f of ['front','back'])await persistEditedComponents(f);
 for(const f of ['front','back'])await persistSkeleton(f);
 const motion=ed.motion?.()||{};
 for(const face of ['front','back']){
  // Rendering reference is separate from the V4 animation itself; do NOT
  // replace the approved 128-frame WebP with a flattened still image.
  if(!v4||face!==side)await put('render:'+currentId+':'+face,ed.composite(face).toDataURL('image/png'));
  if(motion[face])await put('l2d:'+currentId+':'+face,motion[face]);
 }
 // This battle-front model is a separate authoring review, NOT a published
 // game character. Save locally, but never poison the canonical hero slot.
 if(currentId===BATTLE_FRONT_ID){
  message('✓ 战斗正面分层与骨骼已保存到独立工作室档案；原版女主、游戏槽位不变。');
  return;
 }
 // This button explicitly says "save AND apply to game". Bind the
 // selected actor/view to the originating game slot even when the user
 // selected a different character inside the studio. Merely keeping the
 // previous binding made the editor report success while game still showed
 // the protagonist (or a different NPC) after returning.
 // Only touch this slot key: original artwork and every other actor stay safe.
 await put('slot:'+slot,{id:currentId,side});
 // Explicit Save & Apply: update any concurrently open game tab immediately.
 // Pages without a game tab still load this exact saved version on return.
 notifyGame(currentId,side,'applied');
 const native=await get('skeletal:'+currentId+':'+side);
 message('✓ 已保存：'+(list.get(currentId)?.label||currentId)+
  (rig?.state?.model?.characterId===currentId?'，新版独立骨骼已同步到本机游戏。':
   native?.length>=12?'，独立分层工程已保存。':'，素材已保存（需要导入独立分层才能启用新版骨骼）。'));
}
async function importImages(files){
 await switchQueue;
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

const partLabels={rear_hair:'后发',front_hair:'前发',hair_clip:'发夹',
 hand_raised:'举起的左手及衣袖',hand_lowered:'垂下的右手及衣袖',
 sleeves_and_hands:'袖子与双手',sleeve_left:'左袖',sleeve_right:'右袖',
 legs:'双腿',shoes:'鞋',neck:'脖颈',skirt:'裙子',jacket:'整件外套',
 brows:'眉毛',ears:'双耳',face:'脸',nose:'鼻子',mouth:'嘴',
 eye_white:'眼白',irises:'虹膜',lashes:'睫毛',back_hair:'背面头发',hair_over_jacket:'衣服前头发'};
function countSourceParts(){return ed.S.layers[side].filter(p=>p.sourcePart).length;}
function hasNativePSD(face=side){return (ed.S.layers[face]||[]).filter(p=>p.sourcePart&&p.role==='psd-part').length>=12;}
function updatePartStatus(){
 const count=countSourceParts(),output=$('studio-parts-status');
 if(output)output.textContent=count?
  (hasNativePSD()?'已载入 '+count+' 个真实 PSD 独立纹理：后发、刘海、校服、手臂、裙摆、眼睛、嘴等采用实时关节及网格驱动。':currentId==='char-002'?'旧合并手臂正在替换为独立左右手臂…':
   '本方向已有 '+count+' 个原位分层部件，可在左侧逐个选择编辑。'):
  '该方向没有独立分层。烘焙 V4 WebP 不能直接拆成部件，请导入 PSD 或原始分层 ZIP。';
}
function shouldDrawLayer(part){
 if(hasNativePSD())return !!part.sourcePart&&part.role==='psd-part';
 if(!v4)return true;
 if(originalLayer(part))return false;
 // Real V4 remains visible at rest even when 25 source PSD parts exist.
 // Source editing deliberately switches only the temporary paint view.
 return sourceInspect()?!!part.sourcePart:!part.sourcePart;
}
async function importComponentFiles(files,options={}){
 const manifestBytes=files.get('assets.json')||files.get('layers.json');
 if(!manifestBytes)throw Error('需要原始分层工程的 assets.json 或 layers.json；单独动画 WebP 不含独立部件');
 const meta=JSON.parse(new TextDecoder().decode(manifestBytes));
 const defs={front:[],back:[]};
 if(meta.views){
  for(const face of ['front','back'])
   defs[face]=Object.values(meta.views[face]||{}).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>({
    id:p.name,name:partLabels[p.name]||p.name,role:p.role||'',x:p.x,y:p.y,
    file:'assets/'+p.filename,locked:false,visible:true,opacity:1
   }));
 }else if(meta.layers){
  for(const face of ['front','back'])defs[face]=(meta.layers[face]||[]).map(p=>({
   ...p,id:p.partId||p.id||p.name,name:p.name||p.id||p.file
  }));
 }else throw Error('工程缺少图层清单');
 const restored={front:[],back:[]},pristine={front:[],back:[]};
 let count=0;
 for(const face of ['front','back']){
  for(const part of defs[face]||[]){
   const path=part.file||part.filename;
   if(!path||path.includes('..'))continue;
   const bytes=files.get(path)||files.get('assets/'+path)||files.get(face+'/'+path);
   if(!bytes)continue;
   const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
   let im;
   try{im=await ed.imgFrom(url)}finally{URL.revokeObjectURL(url)}
   const q=ed.layer(String(part.name||part.id),im,Number(part.x)||0,Number(part.y)||0,!!part.locked);
   q.visible=part.visible!==false;
   q.opacity=Number(part.opacity??1);
   q.sourcePart=true;
   q.partId=String(part.id||part.name);
   q.role=String(part.role||'');
   restored[face].push(q);count++;
   pristine[face].push({partId:q.partId,name:q.name,x:q.x,y:q.y,
      visible:q.visible,opacity:q.opacity,image:await fileURL(new Blob([bytes],{type:'image/png'}))});
  }
 }
 if(!count)throw Error('分层工程中没有可读取的真实 PNG 部件');
 // Source-mode must switch BEFORE asynchronous baseline DB writes.
 // Otherwise a fully loaded PSD stack can briefly still render the baked
 // static V4 frame, misleading the editor and browser automation.
 showOriginalV4=true;
 // Replace only the source stack. Keep the two animation-correction
 // tracks separate. Never create neck/collar duplicate objects.
 for(const face of ['front','back']){
  if(!restored[face].length||(options.missingOnly&&ed.S.layers[face].some(p=>p.sourcePart)))continue;
  ed.S.layers[face]=[
   ...ed.S.layers[face].filter(p=>!p.sourcePart&&!/^(PSD ·|原始角色 ·)/.test(p.name)),
   ...restored[face]];
  if(!options.missingOnly||!await get('baseline:'+currentId+':'+face))
   await put('baseline:'+currentId+':'+face,pristine[face]);
 }
 showOriginalV4=!hasNativePSD();
 await loadCorrectionLayers();
 ed.renderList();ed.render();
 await ed.save();
 if(ed.S.layers[side].filter(p=>p.sourcePart&&p.role==='psd-part').length>=12)
  await persistSkeleton(side);
 updatePartStatus();
 window.dispatchEvent(new Event('paperchalk:studio-source-parts-loaded'));
 if(!options.quiet)message('✓ 已载入 '+count+' 个真实部件，原始像素、原位坐标和图层顺序保留。可直接选任何部件编辑。');
 return count;
}
const hostedPartsURLs={
 protagonist:'../assets/l2d/v4/protagonist-original-parts.zip'
};
const hostedPartsCache=new Map();
const siteURL=path=>new URL(path,new URL('../',location.href)).href;
async function hostedParts(id,face=side){
 const view=list.get(id)?.l2dModule?.[face];
 const packed=view?.sourceParts?.url;
 if(packed){
  const url=siteURL(packed),cacheKey='archive:'+url;
  if(!hostedPartsCache.has(cacheKey)){
   const promise=fetch(url).then(async r=>{
    if(!r.ok)throw Error('L2D 素材包未部署：HTTP '+r.status);
    return zipBytes(new Uint8Array(await r.arrayBuffer()));
   }).catch(e=>{hostedPartsCache.delete(cacheKey);throw e});
   hostedPartsCache.set(cacheKey,promise);
  }
  return hostedPartsCache.get(cacheKey);
 }
 // Approved PartMesh modules may ship independent PNGs instead of a ZIP.
 // Turn those *same bytes* into the existing importComponentFiles interface
 // without baking, cropping, recoloring, or fabricating separate pieces.
 const published=view?.rig;
 if(published?.url&&published.textures){
  const cacheKey='rig:'+id+':'+face+':'+published.url;
  if(!hostedPartsCache.has(cacheKey)){
   const promise=(async()=>{
    const response=await fetch(siteURL(published.url));
    if(!response.ok)throw Error('无法读取 L2D 模块关节文件：HTTP '+response.status);
    const rig=await response.json();
    if(rig.format!=='paperchalk-part-rig-v1'||rig.characterId!==id||rig.face!==face)
     throw Error('当前人物绑定与独立图层不一致');
    const manifest={canvas:[1024,1024],provenance:'published-part-mesh',layers:{front:[],back:[]}};
    const files=new Map(),pairs=Object.entries(published.textures);
    for(const [partId,uri] of pairs){
     const p=rig.parts?.[partId];if(!p)throw Error('找不到部件 '+partId);
     const file=face+'/'+partId+'.png';
     const data=await fetch(siteURL(uri));
     if(!data.ok)throw Error('无法加载独立 L2D 部件 '+partId);
     files.set(file,new Uint8Array(await data.arrayBuffer()));
     manifest.layers[face].push({file,id:partId,name:p.name||partId,
      x:p.x,y:p.y,visible:true,locked:false,opacity:1,role:'module-mesh-part'});
    }
    files.set('layers.json',new TextEncoder().encode(JSON.stringify(manifest)));
    return files;
   })().catch(e=>{hostedPartsCache.delete(cacheKey);throw e});
   hostedPartsCache.set(cacheKey,promise);
  }
  return hostedPartsCache.get(cacheKey);
 }
 const legacy=hostedPartsURLs[id];
 if(!legacy)throw Error('当前人物尚未提供真实独立 L2D 图层素材');
 const url=new URL(legacy,location.href),cacheKey='legacy:'+url.href;
 if(!hostedPartsCache.has(cacheKey)){
  const promise=fetch(url).then(async r=>{
   if(!r.ok)throw Error('人物分层资源未部署：HTTP '+r.status);
   return zipBytes(new Uint8Array(await r.arrayBuffer()));
  }).catch(e=>{hostedPartsCache.delete(cacheKey);throw e});
  hostedPartsCache.set(cacheKey,promise);
 }
 return hostedPartsCache.get(cacheKey);
}
async function zipBytes(buf){
 return zipFiles(new File([buf],'original-psd-parts.zip',{type:'application/zip'}));
}
async function ensureHostedParts(id){
 if(!hostedPartsURLs[id]&&!list.get(id)?.l2dModule?.[side]?.sourceParts&&!list.get(id)?.l2dModule?.[side]?.rig)return;
 const front=ed.S.layers.front.some(p=>p.sourcePart);
 const back=ed.S.layers.back.some(p=>p.sourcePart);
 const currentSource=ed.S.layers.front.filter(p=>p.sourcePart).map(p=>String(p.partId||p.name));
 const upgrade=id==='char-002'&&!hasFemale2Psd(currentSource);
 if(front&&!upgrade&&(id==='char-002'||back))return;
 message(id==='char-002'?'载入女二 PSD：17 个源层、18 个独立部件（举起的左手已分开）…':'载入真实原位分层…');
 try{
  const source=await hostedParts(id,side);
  if(currentId!==id)return;
  await importComponentFiles(source,{missingOnly:!upgrade,quiet:true});
  message(id==='char-002'?
   '✓ 女二已加载 24 层原始记录和 18 个可动部件，两只手臂独立绑定。':
   '已载入原位PSD独立部件。');
 }catch(error){
  console.error('[L2D] hosted source parts failed',error);
  message('原始部件在线加载失败：'+error.message+'；动画帧仍可编辑');
 }
}
async function importComponentArchive(file){
 if(!file)return;
 await switchQueue; // Do not import into a half-loaded character or direction.
 if(/\.psd$/i.test(file.name)){
  if(currentId===BATTLE_FRONT_ID)
   throw Error('战斗正面请导入已整理的 24 层 ZIP；原始 PSD 把两把斧头合在同一层，直接导入会失去正确拆分。');
  if(currentId==='char-002'&&side!=='front')throw Error('女二只有真实正面 PSD，尚无背面分层');
  await ed.importPsd(file);
  if(currentId==='char-002'&&ed.S.layers[side].length<17)
   throw Error('女二原始PSD包含24层记录、17个有内容的部件；当前读取不完整');
  for(const part of ed.S.layers[side]){
   part.sourcePart=true;
   part.partId=part.name;part.role='psd-part';
  }
  showOriginalV4=true;
  await loadCorrectionLayers();
  ed.renderList();ed.render();await ed.save();
  await persistSkeleton(side);updatePartStatus();
  window.dispatchEvent(new Event('paperchalk:studio-source-parts-loaded'));
  message('✓ 已按原 PSD 导入真实 '+ed.S.layers[side].filter(p=>p.sourcePart).length+' 层。保存并返回游戏后使用独立网格/骨骼，不再使用扁平 V4。');
  return;
 }
 message('读取原始分层工程所有部件…');
 const files=await zipFiles(file);
 if(currentId===BATTLE_FRONT_ID){
  const manifest=files.get('layers.json');
  if(!manifest)throw Error('战斗正面必须使用含 layers.json 的真实原位分层 ZIP');
  const data=JSON.parse(new TextDecoder().decode(manifest));
  const ids=(data.layers?.front||[]).map(p=>String(p.partId||p.id||p.name));
  if(data.characterId!==BATTLE_FRONT_ID||ids.length!==24||
      !ids.includes('axe_overhead')||!ids.includes('axe_held'))
   throw Error('工程身份或图层不匹配：需要女主战斗正面 24 层独立工程');
 }
 await importComponentFiles(files);
 if(currentId===BATTLE_FRONT_ID){
  const bytes=files.get('front.rig.json');
  if(bytes){
   const binding=JSON.parse(new TextDecoder().decode(bytes));
   await storePartRig(binding);
  }
  updatePartStatus();
  // Character-loaded fires only on a selector switch. After first ZIP import
  // the independent L2D editor must initialize without switching characters.
  window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{
   detail:{id:currentId,side}
  }));
  message('✓ 战斗正面：24 层原位组装完成，已启动独立 L2D 骨骼预览。原版女主没有被覆盖。');
 }
}

async function importV4(file){
 await switchQueue; // Wait for character changes before installing a V4 clip.
 if(!currentId)throw Error('先选择人物');
 message('读取 V4 原版动画工程…');
 const files=await zipFiles(file);
 if(files.has('assets.json')||files.has('layers.json'))await importComponentFiles(files);
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
 if(legacyRig)legacyRig.hidden=false; // Static painting, dynamic preview stays live.
 if(!uri){playing=false;globalLayer=null;frameLayer=null;ed.l2dRig?.()?.start();ed.render();return;}
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
 frameIndex=0;activePaintFrame=0;playing=true;playingSince=performance.now();
 $('studio-frame').max=String(Math.max(0,count-1));
 $('studio-frame').value='0';$('studio-frame-label').textContent='0 / '+(count-1);
 $('studio-play').textContent='暂停';
 window.dispatchEvent(new CustomEvent('paperchalk:studio-play-changed',{detail:{playing:true}}));
 // The preview rig continues running independently while V4 frames decode.
 await drawFrame(0);
}
function sourceInspect(){
 // Genuine source components always use the new independent-mesh workflow.
 if(countSourceParts()>0)return true;
 const selected=ed.S.layers[side]?.[ed.S.sel];
 const stage=window.PaperchalkStageMotion?.state;
 return !showOriginalV4 || (!!selected?.sourcePart &&
   (ed.S.only || stage?.editing || stage?.enabled===false));
}
function drawBackdrop(ctx){
 if(!v4||sourceInspect())return;
 // Match the live game compositor: original decoded frame, source-part
 // erasure/paint, all-frame overlays, then selected frame correction.
 ctx.drawImage(v4.surface,0,0);
 if(previewPatch?.erase&&previewPatch?.paint){
  ctx.save();ctx.globalCompositeOperation='destination-out';
  ctx.drawImage(previewPatch.erase,0,0);ctx.restore();
  ctx.drawImage(previewPatch.paint,0,0);
 }
}
function drawFrameCorrection(ctx){
 if(!v4||sourceInspect())return;
 // During a paused single-frame edit, the editable frame layer is drawn
 // by the painter itself; otherwise show its saved pixels, including paused.
 if(!playing&&frameLayer?.visible)return;
 const uri=frameFrames[frameIndex];
 if(!uri)return;
 let cached=frameImageCache.get(frameIndex);
 if(!cached){
  cached=new Image();cached.onload=()=>ed.render();cached.src=uri;
  frameImageCache.set(frameIndex,cached);
 }
 if(cached.complete&&cached.naturalWidth)ctx.drawImage(cached,0,0);
}
// One compositing path for editor and game: V4 pixel frame + source edits
// + corrections, followed by CHEST-ONLY deformation. The canvas itself is
// never zoomed, rotated, or rocked as a fake breathing substitute.
const breathComposite=document.createElement('canvas');
breathComposite.width=1024;breathComposite.height=1024;
function drawComposedV4(ctx,S){
 if(!v4||sourceInspect()||S.only)return false;
 const g=breathComposite.getContext('2d');
 g.setTransform(1,0,0,1,0,0);
 g.clearRect(0,0,1024,1024);
 g.drawImage(v4.surface,0,0);
 if(previewPatch?.erase&&previewPatch?.paint){
  g.save();g.globalCompositeOperation='destination-out';
  g.drawImage(previewPatch.erase,0,0);g.restore();
  g.drawImage(previewPatch.paint,0,0);
 }
 for(const layer of S.layers[side]){
  if(!layer.visible||layer.sourcePart||originalLayer(layer))continue;
  g.globalAlpha=layer.opacity;
  g.drawImage(layer.canvas,layer.x,layer.y);
 }
 g.globalAlpha=1;
 if(playing||!frameLayer?.visible){
  const uri=frameFrames[frameIndex];
  if(uri){
   let image=frameImageCache.get(frameIndex);
   if(!image){
    image=new Image();image.onload=()=>ed.render();image.src=uri;
    frameImageCache.set(frameIndex,image);
   }
   if(image.complete&&image.naturalWidth)g.drawImage(image,0,0);
  }
 }
 // Never add a second synthetic breathing warp to any character.
 // Actual strands/pleats/sleeves are animated by their own joint chains.
 ctx.drawImage(breathComposite,0,0);
 return true;
}
function applyGameMotion(ctx){
 // Legacy call kept for compatibility. Never transform the entire character.
 return ctx;
}
const frameImageCache=new Map();
async function drawFrame(index){
 const clip=v4;
 if(clip)index=Math.max(0,Math.min(Math.max(0,clip.count-1),Number.isFinite(index)?Math.trunc(index):0));
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
 const hasSources=arr.some(p=>p.sourcePart);
 showOriginalV4=!hasNativePSD();
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
 const selected=hasSources?arr.findLast(p=>p.sourcePart):(scope==='frame'?frameLayer:globalLayer);
 ed.S.sel=Math.max(0,arr.indexOf(selected));
 await loadFrameImage(0);
 const savedPatch=await get('parts-patch:'+currentId+':'+side);
 if(savedPatch?.erase&&savedPatch?.paint){
  try{
   const [erase,paint]=await Promise.all([ed.imgFrom(savedPatch.erase),ed.imgFrom(savedPatch.paint)]);
   previewPatch={erase,paint};
  }catch(e){previewPatch=null;message('原始部件修补读取失败：'+e.message);}
 }else previewPatch=null;
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
  if(!p.visible||p===frameLayer||p.sourcePart||originalLayer(p))continue;
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
   const idx=Math.floor(Math.max(0,t-playingSince)/50)%Math.max(1,v4.count);
   if(frameIndex!==idx&&!v4.busy){
    frameIndex=idx;$('studio-frame').value=String(idx);
    $('studio-frame-label').textContent=idx+' / '+(v4.count-1);
    drawFrame(idx);
   }
  }
 }
 requestAnimationFrame(frameLoop);
}
async function setPlaying(next){
 if(!v4)return;
 if(playing===!!next)return;
 if(next){
  snapshotFrame();
  playing=true;
  if(frameLayer)frameLayer.visible=false;
  playingSince=performance.now()-frameIndex*50;
 }else{
  playing=false;
  if(frameLayer){
   frameLayer.visible=$('studio-edit-scope').value==='frame';
   await loadFrameImage(frameIndex);
  }
 }
 $('studio-play').textContent=playing?'暂停':'播放';
 ed.renderList();ed.render();
 window.dispatchEvent(new CustomEvent('paperchalk:studio-play-changed',{detail:{playing}}));
}
$('studio-frame').oninput=e=>{
 if(playing){
  playing=false;$('studio-play').textContent='播放';
  window.dispatchEvent(new CustomEvent('paperchalk:studio-play-changed',{detail:{playing:false}}));
 }
 seek(Number(e.target.value)).catch(err=>message(err.message));
};
$('studio-play').onclick=()=>setPlaying(!playing).catch(err=>message('播放控制异常：'+err.message));
$('studio-edit-scope').onchange=()=>{
 if(!v4)return;
 if(!playing)snapshotFrame();
 frameLayer.visible=$('studio-edit-scope').value==='frame'&&!playing;
 ed.S.sel=ed.S.layers[side].indexOf(frameLayer.visible?frameLayer:globalLayer);
 ed.renderList();ed.render();
};
let suspendAutobackup=false;
window.addEventListener('paperchalk:art-dirty',()=>{
 if(suspendAutobackup||!v4)return;
 clearTimeout(correctionTimer);
 correctionTimer=setTimeout(async()=>{
  try{
   await persistCorrections();
   if(!playing)await persistEditedComponents(side);
  }catch(e){message('自动存档失败：'+e.message)}
 },2100);
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
  await switchQueue;
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
$('studio-save').onclick=()=>$('btnSave').click();
$('studio-back').onclick=async()=>{
 const button=$('studio-back');
 button.disabled=true;button.textContent='正在保存并返回游戏…';
 try{
  await saveToGame();
  location.assign(new URL('../?dev=1',location.href).href);
 }catch(e){
  button.disabled=false;button.textContent='返回游戏 DEV';
  message('保存失败，已留在编辑器保护你的修改：'+e.message);
 }
};
$('studio-import').onchange=e=>{const files=[...e.target.files];e.target.value='';importImages(files).catch(x=>message('导入失败：'+x.message));};
$('studio-v4zip').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)importV4(f).catch(x=>message('导入V4失败：'+x.message));};
$('studio-parts-import').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)importComponentArchive(f).catch(x=>message('导入真实部件失败：'+x.message));};
$('studio-battle-import').onchange=e=>{
 const f=e.target.files?.[0];e.target.value='';
 if(!f)return;
 if(currentId!==BATTLE_FRONT_ID){
  message('请先选择女主·战斗正面独立工程。');return;
 }
 importComponentArchive(f).catch(x=>message('战斗正面导入失败：'+x.message));
};
$('zipImport').onchange=e=>{const f=e.target.files?.[0];e.target.value='';if(f)importComponentArchive(f).catch(x=>message('导入原位分层失败：'+x.message));};
window.PaperchalkStudio={list,change,saveToGame,notifyGame,readPartRig,storePartRig,drawBackdrop,drawFrameCorrection,drawComposedV4,applyGameMotion,shouldDrawLayer,importComponentArchive,importComponentFiles,countSourceParts,hasNativePSD,useV4:()=>!!v4&&countSourceParts()===0,get isV4(){return !!v4},get frame(){return frameIndex},get editSide(){return side},get correctedFrames(){return Object.keys(frameFrames)},get activePaintFrame(){return activePaintFrame},get frameHasPaint(){return !!frameLayer&&hasPaint(frameLayer.canvas)},get current(){return currentId},get edition(){return v4?.edition||'mesh'},get isPlaying(){return playing},setPlaying};
requestAnimationFrame(frameLoop);loadList().catch(e=>message('人物列表加载失败：'+e.message));
})();
/* Single all-imported character L2D studio, shared with the game via IndexedDB. */
(()=>{
'use strict';
const ed=window.characterEditor;if(!ed)return;
const $=id=>document.getElementById(id), DB='paperchalk-dev-characters-v1';
const list=new Map();
const BATTLE_FRONT_ID='protagonist-battle-front';
const SEETHROUGH_QA_ID='seethrough-qa-2048';
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
/* Female-six baseline restore: scoped to this one actor and its local
 * editing records. The original PSD-derived hosted textures stay immutable.
 * ?character=female-06&reset-original=1 deliberately performs the restore
 * before any local overrides or canvas drafts are loaded. */
async function resetFemale06OriginalIfRequested(){
 if(args.get('reset-original')!=='1'||args.get('character')!=='female-06')return false;
 const id='female-06',face='front',canonical=list.get(id);
 const published=canonical?.l2dModule?.front?.rig;
 if(!canonical?.front||!published?.url||!published?.textures)
  throw Error('女6原版模块尚未部署，未删除任何本地修改');
 // Fetch AND validate all source textures before any destructive write.
 const files=await hostedParts(id,face);
 const bytes=files.get('layers.json');
 if(!bytes)throw Error('女6原始 PSD 分层清单缺失，未删除本地修改');
 const manifest=JSON.parse(new TextDecoder().decode(bytes));
 const original=manifest.layers?.front||[],ids=Object.keys(published.textures);
 if(original.length<10||original.length!==ids.length||
    new Set(original.map(p=>p.id||p.partId)).size!==ids.length||
    !ids.every(key=>original.some(p=>(p.id||p.partId)===key)))
  throw Error('女6原始网格/分层未通过检查，保留本地修改');
 // All the following keys belong ONLY to female-06. Other characters,
 // browser preferences, and game actor slots are preserved.
 const db=await openDB();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('kv','readwrite'),store=tx.objectStore('kv');
   const cursor=store.openCursor();
   cursor.onsuccess=()=>{
    const row=cursor.result;if(!row)return;
    const key=String(row.key);
    if(key==='female-06'||key.startsWith('female-06:')||
       key.endsWith(':female-06')||key.includes(':female-06:'))
     row.delete();
    row.continue();
   };
   for(const key of ['imported','overrides']){
    const request=store.get(key);
    request.onsuccess=()=>{
     if(Array.isArray(request.result)){
      const kept=request.result.filter(row=>row?.id!==id);
      if(kept.length!==request.result.length)store.put(kept,key);
     }
    };
   }
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('角色草稿重置失败'));
   tx.onabort=()=>reject(tx.error||Error('角色草稿重置被中断'));
  });
 }finally{db.close();}
 // The painting editor uses a DIFFERENT IndexedDB database from the
 // bones/patches store. Both must be reset or old painted pixels come back.
 const paintDb=await new Promise((resolve,reject)=>{
  const req=indexedDB.open('pixelatelier-character-v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('art'))
   req.result.createObjectStore('art');};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 try{
  await new Promise((resolve,reject)=>{
   const tx=paintDb.transaction('art','readwrite');
   tx.objectStore('art').delete('character:'+id);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('绘画图层重置失败'));
   tx.onabort=()=>reject(tx.error||Error('绘画图层重置被中断'));
  });
 }finally{paintDb.close();}
 try{localStorage.setItem('paperchalk-studio-last',JSON.stringify({id,side:face}));}catch(_){}
 message('✓ 女6旧绘画、图层、骨骼和遮挡缓存已清除；正在重新导入 GitHub 原版 PSD 部件。');
 return true;
}
const female2PsdIds=['head_reference','back_hair','legwear','footwear','neck',
 'bottomwear','topwear','ears','face','hand_raised','hand_lowered','mouth','eyebrow',
 'eyewhite','irides','eyelash','nose','front_hair'];
const hasFemale2Psd=ids=>ids.length===18&&female2PsdIds.every(id=>ids.includes(id));
// Exact 21 original CHAR-004 PSD layer IDs in ORIGINAL back-to-front order.
const female3OriginalLayerIds=["back_hair","footwear","legwear","neck","topwear","eyebrow_r","ears_r","ears_l","face","nose","mouth","handwear_l","eyebrow_l","eyelash_r","eyelash_l","eyewhite_r","eyewhite_l","irides_l","irides_r","handwear_r","front_hair"];
// 21 authentic PSD parts is a VALID working model; 23 was an optional
// coat-panel experiment. Neither model is corrupt just because Z was edited.
const hasFemale3Psd=ids=>Array.isArray(ids)&&ids.length===21&&
 new Set(ids).size===ids.length&&female3OriginalLayerIds.every(key=>ids.includes(key));
const female3CoatLayerIds=(()=>{const ids=[...female3OriginalLayerIds],i=ids.indexOf('topwear')+1;
 ids.splice(i,0,'coat_left','coat_right');return ids})();
// A rig has the correct parts regardless of its author-edited Z order.
// Previously equality against the original array classified EVERY reorder as
// broken, forcing re-import and permanently deleting the user's Z edits.
const hasFemale3CoatRig=ids=>Array.isArray(ids)&&
 ids.length===female3CoatLayerIds.length&&new Set(ids).size===ids.length&&
 female3CoatLayerIds.every(key=>ids.includes(key));
const hasFemale3SourceRig=ids=>hasFemale3Psd(ids)||hasFemale3CoatRig(ids);
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
 '<strong>女主角 / 战斗子动作｜已部署 PSD · 24 层</strong>',
 '<label class="studio-import studio-battle-picker">重新导入本地 ZIP（可选）<input id="studio-battle-import" type="file" accept=".zip,application/zip"></label>',
 '<span class="studio-battle-note">24 张原始 PNG 与骨骼来自同一个女主角动作资源库；在「角色动作」中切换站立/战斗只调整手臂与斧头，不重新载入整个人物。默认隐藏重复的头顶斧头，原版立绘仍保留。</span>',
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
// Files, less common selectors and import utilities belong with the person
// library, not as a second full-width toolbar above the canvas.
document.querySelector('.layout .left')?.append(section);
const returnToGame=document.getElementById('studio-back');
if(returnToGame){
 returnToGame.title='返回游戏';
 document.querySelector('body>header .actions')?.prepend(returnToGame);
}
document.body.classList.add('studio-page');
// Mobile keeps the character preview fixed and exposes one focused inspector
// at a time; no kilometre-long stacked list of unrelated advanced controls.
const mobileTabs=document.createElement('nav');
mobileTabs.id='mobile-studio-tabs';mobileTabs.setAttribute('aria-label','移动端工作区');
mobileTabs.innerHTML='<button type="button" data-studio-pane="characters">人物</button><button type="button" data-studio-pane="layers">图层</button><button type="button" data-studio-pane="motion">动画</button><button type="button" data-studio-pane="paint">绘画</button>';
document.querySelector('body>header')?.after(mobileTabs);
function setMobilePane(name){
 if(!['characters','layers','motion','paint'].includes(name))name='layers';
 document.body.dataset.studioPane=name;
 for(const b of mobileTabs.querySelectorAll('button')){
  b.classList.toggle('active',b.dataset.studioPane===name);
  b.setAttribute('aria-pressed',String(b.dataset.studioPane===name));
 }
}
mobileTabs.addEventListener('click',e=>{
 const button=e.target.closest('button[data-studio-pane]');
 if(button)setMobilePane(button.dataset.studioPane);
});
document.getElementById('idle-open')?.addEventListener('click',()=>setMobilePane('motion'),true);
const head=document.querySelector('body>header');
if(head&&typeof ResizeObserver==='function'){
 new ResizeObserver(()=>document.documentElement.style.setProperty('--studio-header-height',head.getBoundingClientRect().height+'px')).observe(head);
}
setMobilePane('characters');
const selector=$('studio-character'),direction=$('studio-side');
const female06ResetBtn=document.createElement('button');
female06ResetBtn.id='studio-reset-female06';female06ResetBtn.type='button';
female06ResetBtn.hidden=true;
female06ResetBtn.textContent='恢复女6原版';
female06ResetBtn.title='仅清除女6在本浏览器的绘画、图层、遮挡、骨骼修改；重新载入最初上传的 PSD 原位部件，不影响其他人物';
$('studio-save')?.after(female06ResetBtn);
female06ResetBtn.addEventListener('click',()=>{
 if(currentId!=='female-06')return;
 if(!confirm('恢复女6原版拆分？这会清除本浏览器中女6的绘画、图层顺序、局部遮挡和骨骼调整；其他人物不受影响。'))return;
 const url=new URL(location.href);
 url.searchParams.set('character','female-06');
 url.searchParams.set('side','front');
 url.searchParams.set('reset-original','1');
 location.assign(url.href);
});

// Tree has a single PERSON root. Actions and outfits are descendants of that
// person, never competing full-body actors in the primary navigation.
const characterTree=document.createElement('section');
characterTree.id='studio-character-tree';
characterTree.innerHTML='<h3>人物资源库</h3><div id="character-tree-items" role="tree" aria-label="按人物组织立绘、动作与服装"></div>';
document.querySelector('.layout .left')?.prepend(characterTree);
const openedFamilies=new Set(['protagonist']);
const treeCSS=document.createElement('style');
treeCSS.textContent=`
 #studio-character-tree{margin:0 0 12px}
 #studio-character-tree>h3{font-size:13px;margin:4px 0 10px}
 #character-tree-items{display:grid;gap:5px}
 .character-family{border:1px solid #35546c;background:#162436;border-radius:10px;overflow:hidden}
 .character-family[open]{border-color:#5682a0}
 .character-family>summary{cursor:pointer;padding:10px 9px;font-size:12px;font-weight:650;list-style-position:inside;line-height:1.5}
 .character-family.active>summary{background:#23415a;color:#e0f5ff}
 .character-family-children{padding:5px 7px 8px;display:grid;gap:4px;border-top:1px solid #29455e}
 .character-family-children button{display:block;text-align:left;width:100%;min-width:0;min-height:34px;padding:7px 9px;font-size:11px;white-space:normal}
 .character-family-children button.active{background:#275c7e;border-color:#74b9ea}
 .character-family-children small{display:block;color:#a7c3d5;font-size:10px;margin-top:3px}
 #studio-person-search{display:block;width:100%;padding:8px 10px;margin:1px 0 10px;
  background:#111d2a;border:1px solid #3e546a;border-radius:8px;color:#e1eaf5;
  font-size:12px;outline-offset:2px}
 .character-resource-section{display:flex;flex-direction:column;gap:4px;margin:4px 0 9px}
 .character-resource-heading{font-size:11px;font-weight:650;color:#a6c3d7;
  padding:4px 5px 3px;letter-spacing:.04em;border-bottom:1px solid #304b5d}
 .character-resource-section button{padding-left:12px}
 .character-resource-section[data-category="action"] button{border-left:2px solid #8daed3}
 .character-resource-section[data-category="outfit"] button{border-left:2px solid #9c9bb9}
 #studio-person-import-bar{display:flex;flex-direction:column;gap:5px;
  padding:8px 9px;margin:0 0 9px;background:#122337;
  border:1px solid #3c5a71;border-radius:9px}
 #studio-person-import{width:100%;font-size:12px;font-weight:650;
  min-height:35px;text-align:center}
 #studio-person-import-target{display:block;overflow-wrap:anywhere;
  color:#a9c3d8;font-size:10px;line-height:1.4}
 .character-source-archive{margin:9px 1px 2px;border-top:1px solid #35516a;padding-top:7px}
 .character-source-archive>summary{font-size:11px;color:#adc1d4;cursor:pointer;
  padding:7px 4px;line-height:1.5}
 .character-source-archive>button{font-size:11px;min-height:30px;opacity:.82;
  margin:3px 0;background:#182533;border-color:#354557}
 .character-resource-empty,.character-search-empty{color:#9aafc5;font-size:11px;
  line-height:1.6;margin:5px 7px}
 .character-family button[aria-current="true"]{background:#275c7e;border-color:#74b9ea}
 .character-family>summary:focus-visible,.character-family button:focus-visible{
  outline:2px solid #97d3ff;outline-offset:1px}
 .character-tree-legend{font-size:10px;color:#91adbf;line-height:1.5;margin:7px 2px 0}
 @media(max-width:710px){#studio-character-tree{margin-bottom:8px}#character-tree-items{grid-template-columns:1fr;gap:5px}}
`;
document.head.append(treeCSS);
const workspaceCSS=document.createElement('style');
workspaceCSS.textContent=`
 body.studio-page{--studio-pane-border:#3b5367}
 body.studio-page .layout{gap:10px}
 body.studio-page .left,body.studio-page .right{scrollbar-width:thin;scrollbar-color:#415c70 transparent}
 @media(min-width:711px){
  body.studio-page #studio-character-tree{min-height:270px;max-height:49dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
  body.studio-page .left .layerlist{max-height:30dvh;overflow-y:auto;scrollbar-width:thin}
 }
 body.studio-page .stage{box-shadow:0 7px 24px #0004;border-color:#3b5568}
 body.studio-page .stage-toolbar{
  top:8px;right:8px;left:auto;width:156px;max-width:156px;
  display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;
  padding:5px;gap:4px;background:#0e1b28e8
 }
 body.studio-page .stage-toolbar button{
  width:100%;min-height:30px;padding:5px 6px;text-overflow:ellipsis;
  overflow:hidden;white-space:nowrap;text-align:center;font-size:11px
 }
 body.studio-page #main-motion-status{display:none!important}
 body.studio-page #studio-library{border-radius:9px}
 body.studio-page .layer{transition:background-color .12s,border-color .12s}
 body.studio-page .layer:hover{background:#273a4c}
 body.studio-page .layer.selected{border-color:#7dc6ef}
 body.studio-page .left>.section{margin-bottom:10px}
 #mobile-studio-tabs{display:none}
 @media(min-width:1121px){
  body.studio-page .layout{grid-template-columns:minmax(320px,26vw) minmax(0,1fr) minmax(260px,22vw)}
  body.studio-page.rig-authoring .layout{grid-template-columns:250px minmax(0,1fr) 340px}
 }
 @media(max-width:710px){
  body.studio-page #studio-library>.studio-row:nth-child(2){display:none}
  body.studio-page #studio-library{margin:4px 6px;padding:6px}
  #mobile-studio-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:4px 6px;background:#101a25;border-bottom:1px solid #324b5d}
  #mobile-studio-tabs button{min-height:40px;padding:6px 4px;border-radius:8px;font-size:12px}
  #mobile-studio-tabs button.active{background:#2b5672;border-color:#84cbef;color:white;font-weight:650}
  body.studio-page .layout{gap:5px;padding:5px;overflow:visible!important}
  body.studio-page .stage,body.studio-page.easy-mode .stage,body.studio-page.rig-authoring .stage{
   order:0!important;position:sticky!important;top:var(--studio-header-height,60px)!important;
   height:48dvh!important;min-height:345px!important;max-height:460px!important;
   z-index:9;border-radius:9px
  }
  body.studio-page .left,body.studio-page .right{order:1!important;min-height:160px!important}
  body.studio-page[data-studio-pane="characters"] .right,
  body.studio-page[data-studio-pane="layers"] .right,
  body.studio-page[data-studio-pane="motion"] .left,
  body.studio-page[data-studio-pane="paint"] .left{display:none!important}
  body.studio-page[data-studio-pane="characters"] .left>section:not(#studio-character-tree),
  body.studio-page[data-studio-pane="layers"] #studio-character-tree{display:none!important}
  body.studio-page[data-studio-pane="motion"] .right>section:not(#part-rig-panel):not(#rig-quick-panel),
  body.studio-page[data-studio-pane="paint"] #rig-quick-panel,
  body.studio-page[data-studio-pane="paint"] #part-rig-panel{display:none!important}
  body.studio-page .left,body.studio-page .right{padding:10px!important}
  body.studio-page .layerlist,body.studio-page.easy-mode .layerlist{max-height:none!important}
  body.studio-page.easy-mode #easy-quickbar{display:flex!important;grid-template-columns:none!important;grid-template-rows:none!important;overflow-x:auto!important;justify-content:flex-start!important;white-space:nowrap}
  body.studio-page.easy-mode #easy-quickbar button{min-width:64px;min-height:40px;white-space:nowrap}
  body.studio-page.rig-authoring #easy-quickbar{display:none!important}
  body.studio-page .stage-toolbar{top:5px;right:5px;width:94px;max-width:94px;padding:3px;gap:3px}body.studio-page .stage-toolbar button{font-size:10px;padding:5px 2px;min-height:30px}
 }
`;

workspaceCSS.textContent+=`
body.studio-page #studio-character-tree{
 display:block!important;margin:0 0 8px!important;padding:0 0 6px!important
}
body.studio-page #studio-character-tree>h3{font-size:15px;font-weight:750;margin:0 0 7px}
body.studio-page .character-family>summary{font-size:13px;min-height:39px;padding:9px 10px}
body.studio-page .character-family-children{padding:5px 8px;gap:3px}
body.studio-page .character-family-children button{font-size:12px;min-height:35px;padding:7px 9px}
body.studio-page .character-family-children small{display:none!important}
body.studio-page .character-family-children .studio-outfit-import{
 background:#255043;border:1px solid #428971;color:#e1fff0;
 font-weight:650;min-height:38px;font-size:12px
}
body.studio-page .character-family-children .male2-direct-import{
 background:#205049;border:1px solid #3e947d;color:#e2fff3;font-weight:650;
 min-height:40px;font-size:12px
}
body.studio-page #easy-layer-guide,
body.studio-page #studio-character-tree .character-tree-legend{display:none!important}
body.studio-page #easy-selection{padding:4px 7px!important;margin:0 0 5px!important;font-size:11px;min-height:23px}
body.studio-page aside.left>section:has(#layers)>h3{font-size:12px;line-height:1.25;margin:0 0 6px}
body.studio-page aside.left>section:has(#layers)>.row button{font-size:11px;padding:5px 6px}
body.studio-page aside.left>section .tip{display:none!important}
body.studio-page #studio-library{padding:6px!important;margin:5px 0!important}
body.studio-page #studio-library>.studio-row:first-child{display:none!important}
body.studio-page #studio-battle-import-row{display:none!important}
body.studio-page .left{min-width:0;overflow-y:auto}
body.studio-page .right,body.studio-page .stage{min-width:0}
@media(max-width:710px){
 body.studio-page #studio-character-tree{min-height:260px!important;max-height:none!important}
 body.studio-page .character-family>summary{font-size:14px;min-height:41px}
 body.studio-page .character-family-children button{font-size:13px;min-height:41px}
 body.studio-page .stage{height:43dvh!important;min-height:295px!important}
}
`;
workspaceCSS.textContent+=`
@media(min-width:711px){
 body.studio-page.easy-mode #easy-quickbar{
  left:6px!important;right:auto!important;top:50%!important;
  bottom:auto!important;transform:translateY(-50%)!important;
  width:76px!important;max-width:76px!important;
  display:flex!important;flex-direction:column!important;
  gap:3px!important;padding:4px!important
 }
 body.studio-page.easy-mode #easy-quickbar button{
  min-width:0!important;width:100%!important;min-height:32px!important;
  font-size:11px!important;padding:5px 2px!important
 }
}
body.studio-page .character-family>summary{
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
`;
document.head.append(workspaceCSS);

/* The registry contains source rigs, wardrobe and old local imports.  These
 * are files/variants of a PERSON, not separate people.  Do not delete the
 * underlying data: this normalises the navigation surface only. */
/* One character identity → base views / canonical actions / real outfits.
 * Raw PSDs and old imports live in the collapsed advanced source archive.
 * Organization never affects the source ArtMesh hierarchy or Z-order. */
const personModel=window.PaperchalkCharacterLibrary;
if(!personModel)throw Error('人物资源分类模块未加载');
let personFilter='';
const personSearch=document.createElement('input');
personSearch.id='studio-person-search';
personSearch.type='search';personSearch.autocomplete='off';
personSearch.placeholder='搜索人物、服装、动作';
personSearch.setAttribute('aria-label','搜索人物、服装和动作');
personSearch.oninput=()=>{
 personFilter=personSearch.value.trim().toLocaleLowerCase('zh-CN');
 renderFamilyTree();
};
characterTree.querySelector('h3')?.after(personSearch);
// One consistent PSD/ZIP import for every selected character and outfit.
const personImportBar=document.createElement('div');
personImportBar.id='studio-person-import-bar';
const personImportBtn=document.createElement('button');
personImportBtn.id='studio-person-import';personImportBtn.type='button';
personImportBtn.textContent='＋ 导入 PSD / 分层 ZIP';
personImportBtn.title='导入到当前选中的角色正面或背面；先切换人物再导入素材';
const personImportTarget=document.createElement('span');
personImportTarget.id='studio-person-import-target';
personImportBar.append(personImportBtn,personImportTarget);
// A generic See-through ZIP is not proof of any existing actor's identity.
// The safe comparison viewer does not pollute the character roster or save
// someone else's body into the currently selected canonical character.
const seethroughQaLink=document.createElement('a');
seethroughQaLink.href='./seethrough-qa.html';
seethroughQaLink.textContent='🔍 See-through 清晰度对照';
seethroughQaLink.title='原图 / 重建图 / 逐层合成，100%/200% 查看；不会覆盖游戏人物';
seethroughQaLink.style.cssText='display:inline-flex;align-items:center;padding:7px 9px;border:1px solid #4b8499;border-radius:7px;color:#a6e5f3;text-decoration:none;font-size:12px';
personImportBar.append(seethroughQaLink);
personSearch.after(personImportBar);
personImportBtn.onclick=()=>{
 const input=$('studio-parts-import');
 if(!currentId||!input){message('请先选择人物，再导入 PSD / 分层 ZIP');return;}
 input.click();
};
function updatePersonImportLabel(){
 const actor=list.get(currentId);
 const family=actor?personModel.familyOf(actor):'';
 const person=actor?personModel.displayName(actor,family):'未选择人物';
 const isVariant=!!actor&&actor.id!==family;
 personImportTarget.textContent='导入到：'+person+' / '+
  (side==='back'?'背面':'正面')+
  (isVariant?' · '+actor.label:'');
 personImportBtn.disabled=!actor;
}
const duplicatedImport=$('studio-parts-import')?.closest('label');
if(duplicatedImport)duplicatedImport.hidden=true;
function visibleFamilyGroups(){
 return personModel.makeTree([...list.values()],currentId);
}
function familyDisplayName(person,family){
 return personModel.displayName(person,family);
}
function activeAction(){
 const rig=window.PaperchalkPartRigStudio?.state;
 return rig?.active&&rig.model?.characterId===currentId&&rig.model?.face===side
  ?(rig.model.actionState?.to||'idle'):'idle';
}
function updatePersonTreeActive(){
 const current=personModel.familyOf(list.get(currentId)||{id:currentId});
 const pose=activeAction();
 for(const family of document.querySelectorAll('#character-tree-items .character-family')){
  family.classList.toggle('active',family.dataset.family===current);
  for(const btn of family.querySelectorAll('button[data-character]')){
   const id=btn.dataset.character,face=btn.dataset.face||'front';
   const action=btn.dataset.action||'';
   const selected=id===currentId&&face===side&&
    (action?pose===action:
     btn.dataset.role==='base'?pose==='idle':true);
   btn.classList.toggle('active',selected);
   if(selected)btn.setAttribute('aria-current','true');
   else btn.removeAttribute('aria-current');
  }
 }
}
function navButton(title,{id,face='front',action='',role='source',hint=''},activate){
 const btn=document.createElement('button');btn.type='button';
 btn.textContent=title;btn.dataset.character=id;btn.dataset.face=face;
 btn.dataset.role=role;
 if(action)btn.dataset.action=action;
 if(hint)btn.title=hint;
 btn.onclick=()=>Promise.resolve().then(activate)
  .catch(error=>message('切换资源失败：'+error.message));
 return btn;
}
async function setPersonAction(id,action){
 if(currentId!==id||side!=='front')await change(id,'front');
 // The PartRig mounts asynchronously after switchCharacter loads source PNGs.
 // Retry only until the matching actor is ready; never touch another actor.
 const select=$('rig-character-action');
 for(let frame=0;frame<100;frame++){
  if(currentId!==id||side!=='front')return;
  const state=window.PaperchalkPartRigStudio?.state;
  if(state?.active&&state.model?.characterId===id&&state.model?.face==='front'&&
    select&&[...select.options].some(opt=>opt.value===action)){
   if(select.value!==action){
    select.value=action;
    select.dispatchEvent(new Event('change',{bubbles:true}));
   }
   updatePersonTreeActive();
   return;
  }
  await new Promise(resolve=>requestAnimationFrame(resolve));
 }
 throw Error('人物动作尚未加载完成，请在右侧动作菜单中重试');
}
function appendPersonSection(target,label,role){
 const section=document.createElement('div');
 section.className='character-resource-section';
 section.dataset.category=role;
 const heading=document.createElement('div');heading.className='character-resource-heading';
 heading.textContent=label;section.append(heading);
 target.append(section);return section;
}
function renderFamilyTree(){
 const root=$('character-tree-items');if(!root)return;
 root.replaceChildren();
 const groups=visibleFamilyGroups(),matches=[];
 for(const actor of groups){
  const searchable=[
   actor.name,actor.family,...actor.outfits.map(x=>x.label),
   ...actor.actions.map(x=>x.label)
  ].join(' ').toLocaleLowerCase('zh-CN');
  if(personFilter&&!searchable.includes(personFilter))continue;
  matches.push(actor.family);
  const {family,name,primary,faces,actions,outfits}=actor;
  const group=document.createElement('details');
  group.dataset.family=family;
  group.className='character-family';
  const isCurrent=personModel.familyOf(list.get(currentId)||{id:currentId})===family;
  group.open=!!personFilter||openedFamilies.has(family)||isCurrent;
  const summary=document.createElement('summary');summary.textContent=name;
  group.append(summary);
  group.addEventListener('toggle',()=>{
   if(personFilter)return;
   if(group.open)openedFamilies.add(family);
   else openedFamilies.delete(family);
  });
  const children=document.createElement('div');
  children.className='character-family-children';

  // Every actor has ONE base rig. The standing idle is not a separate
  // 20-part/24-part character; combat changes only the action parameter.
  const basic=appendPersonSection(children,'基础立绘','base');
  if(faces.front){
   basic.append(navButton(
     family==='protagonist'?'正面 · 站立':'正面 · 基础模型',
     {id:primary.id,face:'front',role:'base',
      hint:'加载正式基础模型；女主站立动作会恢复到默认姿态'},
     ()=>family==='protagonist'&&
       primary.l2dModule?.front?.actions?.includes('idle')
        ?setPersonAction(primary.id,'idle'):change(primary.id,'front')
   ));
  }
  if(faces.back){
   basic.append(navButton('基础模型 · 背面',
    {id:primary.id,face:'back',role:'base'},
    ()=>change(primary.id,'back')));
  }
  if(!faces.front&&!faces.back){
   const empty=document.createElement('p');empty.className='character-resource-empty';
   empty.textContent='暂无正式立绘';basic.append(empty);
  }

  if(actions.length){
   const section=appendPersonSection(children,'动作','action');
   for(const entry of actions){
    const isCanonical=entry.canonical===true;
    section.append(navButton(entry.label,{
      id:isCanonical?primary.id:entry.id,face:'front',
      action:isCanonical?entry.action:'',
      role:isCanonical?'canonical-action':'variant-action',
      hint:isCanonical?'沿用同一人物骨骼，只切换需要动作的部件':'独立动作源工程'
    },()=>isCanonical?
      setPersonAction(primary.id,entry.action):change(entry.id,'front')));
   }
  }

  if(outfits.length){
   const section=appendPersonSection(children,'服装','outfit');
   for(const item of outfits){
    section.append(navButton(item.label+' · 正面',
     {id:item.id,role:'outfit',hint:'这是一套独立服装资源，不是新的角色'},
     ()=>change(item.id,'front')));
    if(item.record.back)section.append(navButton(item.label+' · 背面',
     {id:item.id,face:'back',role:'outfit'},()=>change(item.id,'back')));
   }
  }

  group.append(children);root.append(group);
 }
 if(!matches.length){
  const empty=document.createElement('p');empty.className='character-search-empty';
  empty.textContent='没有匹配人物或资源';root.append(empty);
 }
 updatePersonTreeActive();
}
function options(){
 selector.replaceChildren();
 for(const {family,name,primary,outfits,actions} of visibleFamilyGroups()){
  const group=document.createElement('optgroup');group.label=name;
  group.append(new Option('基础立绘 · '+name,primary.id));
  for(const entry of outfits)
   group.append(new Option('服装 · '+entry.label,entry.id));
  for(const entry of actions.filter(a=>!a.canonical))
   group.append(new Option('动作 · '+entry.label,entry.id));
  // Old direct project URLs still work. They are not listed under a
  // misleading "source/history" category in normal character navigation.
  if(personModel.familyOf(list.get(currentId)||{id:currentId})===family&&
     ![...group.querySelectorAll('option')].some(o=>o.value===currentId)&&
     list.has(currentId)){
   const current=list.get(currentId);
   group.append(new Option('当前工程 · '+String(current.label||currentId),currentId));
  }
  selector.append(group);
 }
 if([...selector.options].some(option=>option.value===currentId))
  selector.value=currentId;
 else selector.value=visibleFamilyGroups()[0]?.primary?.id||'';
 updatePersonImportLabel();
 renderFamilyTree();
}
window.addEventListener('paperchalk:studio-action-changed',updatePersonTreeActive);
window.addEventListener('paperchalk:studio-ready-to-edit',()=>{
 requestAnimationFrame(updatePersonTreeActive);
});
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
  // Moving between characters should NOT flatten/re-encode every unchanged
  // 1024x1024 layer or recompute a 4M-pixel V4 diff. The editor tracks source
  // edits separately from harmless selection, idle animation and camera moves.
  if(ed.S.derivedDirty){
   for(const f of ['front','back'])await persistEditedComponents(f);
   for(const f of ['front','back'])await persistSkeleton(f);
   ed.S.derivedDirty=false;
  }
  if(ed.S.sourceDirty)await ed.save();
 }
 if(!list.has(id))throw Error('角色不在已导入列表中：'+id);
 const chosen=list.get(id);
 if(face==='back'&&!chosen.back&&!chosen.clips?.back)
  throw Error('角色 '+chosen.label+' 尚无真实背面，禁止用正面冒充');
 currentId=id;side=face==='back'?'back':'front';
 female06ResetBtn.hidden=id!=='female-06';
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
 // Keep the approved V4 asset untouched, but stop decoding its 128
 // hidden frames once a real independently skinned PartRig is available.
 // Otherwise the protagonist decodes frames at ~20fps while her 20 meshes
 // also render at ~30fps, competing for the same main thread.
 if(ed.S.layers[side].some(p=>p.sourcePart))await showClip(null);
 else await showClip(override||builtin);
 await loadCorrectionLayers();
 await ensureHostedParts(id);
 if(ed.S.layers[side].some(p=>p.sourcePart)&&v4)await showClip(null);
 updatePartStatus();
 // A hosted model and its layers may increase the top library height after
 // switchCharacter() has fitted the old geometry. Fit again once the final
 // responsive layout is measured; never clip feet on desktop first open.
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(currentId===id&&document.getElementById('fit'))document.getElementById('fit').click();
 }));
 window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{detail:{id,side}}));
 renderFamilyTree();
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
 list.set(BATTLE_FRONT_ID,{id:BATTLE_FRONT_ID,familyId:'protagonist',variantCategory:'combat',label:'女主·战斗正面（动作子集）',front:blank,back:''});
 // A NEW source-verified male-second slot. Do not revive the deleted char-016
 // assets, or substitute the older accidental male-second art. The authentic
 // SeeThrough ZIP is imported verbatim in-browser into this isolated actor.
 const newMale2Blank='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><text x="512" y="480" fill="#bbc8da" font-size="28" text-anchor="middle">男二 · 新拆分</text><text x="512" y="520" fill="#8294a9" font-size="18" text-anchor="middle">导入 SeeThrough ZIP 后显示真实立绘</text></svg>');
 list.set('male2',{id:'male2',label:'男二',front:newMale2Blank,back:'',familyId:'male2',variantCategory:'default'});
 // Separate authoring-only See-through 2048→1024 resolution QA slot.
 // The uploaded reference is a TWO-PERSON illustration, never substitute it
 // for the approved protagonist or for the genuine male2 actor.
 const seethroughQaBlank='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><text x="512" y="480" fill="#bbc8da" font-size="26" text-anchor="middle">See-through 1024 · 双人测试模型</text><text x="512" y="530" fill="#8294a9" font-size="19" text-anchor="middle">导入原始 See-through ZIP 后查看自动装配</text></svg>');
 list.set(SEETHROUGH_QA_ID,{id:SEETHROUGH_QA_ID,
  label:'See-through 2048→1024 · 双人测试（不进游戏）',
  front:seethroughQaBlank,back:'',familyId:SEETHROUGH_QA_ID,
  variantCategory:'source',editorOnly:true});
 try{
  const res=await fetch('../characters.catalog.json',{cache:'no-store'});
  if(res.ok)for(const c of (await res.json()).characters||[]){
   if(!okId(c.id))continue;
   list.set(c.id,{id:c.id,label:(c.label||c.id)+(c.draft?' · 未导入立绘':''),draft:!!c.draft,
    front:c.front?new URL(c.front,new URL('../',location.href)).href:'',
    back:c.back?new URL(c.back,new URL('../',location.href)).href:'',
    clips:c.clips||{},animated:c.animated||{},l2dModule:c.l2dModule||{},
    familyId:c.familyId||c.id,variantCategory:c.variantCategory||'default',actions:c.actions||[]});
  }
 }catch(e){console.warn('Character catalog offline',e)}
 // Clothing is a child of the canonical actor, never another NPC or a
 // replacement for its approved standing art. These fallback editor slots
 // become real published modules when binary art is installed in the library.
 const wardrobePlaceholder=(label)=>'data:image/svg+xml;charset=utf-8,'+
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">'+
   '<text x="512" y="488" font-family="sans-serif" fill="#bfd1e7" font-size="26" text-anchor="middle">'+label+'</text>'+
   '<text x="512" y="527" font-family="sans-serif" fill="#9cacc5" font-size="18" text-anchor="middle">请导入原始分层 ZIP / PSD</text></svg>');
 // The formerly named char-003-outfit-02 is the CANONICAL male lead FRONT.
 // Do not create a second local wardrobe node for an existing base pose.
 if(!list.has('char-008-outfit-02')){
  list.set('char-008-outfit-02',{id:'char-008-outfit-02',
   label:'女五 · 女老师新衣服（待导入）',front:wardrobePlaceholder('女五 · 新衣服'),back:'',
   familyId:'char-006',variantCategory:'outfit',editorOnly:true});
 }
 const canonicalFemale2=list.get('char-002');
 await resetFemale06OriginalIfRequested();
 const imported=await get('imported');
 // Never let a stale local import overwrite an official character identity.
 if(Array.isArray(imported))for(const record of imported)if(okId(record?.id)){
  const published=list.get(record.id);
  if(!published)list.set(record.id,record);
  else if(published.draft&&!published.l2dModule?.front?.rig)
   list.set(record.id,{...published,...record});
 }
 const overrides=await get('overrides');
 if(Array.isArray(overrides))for(const record of overrides){
  const existing=list.get(record?.id);
  if(existing&&!existing.l2dModule?.front?.rig)
   Object.assign(existing,record);
 }
 if(canonicalFemale2)list.set('char-002',canonicalFemale2);
 let last=null;try{last=JSON.parse(localStorage.getItem('paperchalk-studio-last')||'null')}catch(e){}
 const requestedId=args.get('character')||last?.id||'protagonist';
 // Preserve historical deep links while opening the one true male-lead
 // front model instead of creating a duplicate "new outfit" project.
 const id=requestedId==='class-teacher-geography-candidate'?'char-006':
  requestedId==='char-003-outfit-02'?'char-003':requestedId;
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
 const needsUnified=id==='protagonist'&&face==='front'&&
  list.get(id)?.l2dModule?.front?.rig?.sourceCharacterId==='protagonist-unified-v1';
 const intentionalDeletion=Array.isArray(local?.deletedParts)&&local.deletedParts.length>0;
 const staleBase=needsUnified&&local&&!intentionalDeletion&&
  !['battle_handwear_r','battle_handwear_l','battle_axe'].every(x=>!!local.parts?.[x]);
 // CHAR-004 v2 has 21 source Photoshop layers but 23 REAL playing parts:
 // coat-left and coat-right are losslessly partitioned from topwear.
 // Rebuild old 19/21-layer drafts so wrists and cloth share actual parents.
 const staleFemale3=id==='char-004'&&face==='front'&&local&&!intentionalDeletion&&
  !hasFemale3SourceRig(Object.keys(local.parts||{}));
 // IMPORTANT: do not delete a perfectly valid 21-source user model just
 // because it lacks a special coat-grip version marker. Published char-004
 // itself has 21 ArtMeshes, so such deletion lost the user's Z edits.
 if(staleFemale3){
  const backupKey='legacy-part-rig:char-004:front:pre-coat-grip-v1';
  if(!await get(backupKey))await put(backupKey,local);
  await dropDraft('part-rig:'+id+':'+face);
 }
 if(local&&!staleBase&&!staleFemale3){
  if(id!=='char-002'||intentionalDeletion||hasFemale2Psd(Object.keys(local.parts||{})))return local;
  await dropDraft('part-rig:'+id+':'+face);
 }
 const pub=list.get(id)?.l2dModule?.[face]?.rig;
 if(!pub?.url)return null;
 const url=new URL(pub.url,new URL('../',location.href));
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('模块绑定文件加载失败：HTTP '+response.status);
 const model=await response.json();
 const sourceId=pub.sourceCharacterId;
 const validAlias=(id==='protagonist'&&
   ['protagonist-rig-v1','protagonist-unified-v1'].some(variant=>
    sourceId===variant&&model.characterId===variant&&
    pub.url.startsWith('./assets/l2d/library/'+variant+'/')))||
  (id==='char-002'&&face==='front'&&sourceId==='char-002-psd-v1'&&
  model.characterId==='char-002-psd-v1'&&model.provenance==='original-psd'&&
  hasFemale2Psd(Object.keys(model.parts||{}))&&
  pub.url.startsWith('./assets/l2d/library/char-002-psd-v1/'))||
  (id==='char-006'&&face==='front'&&sourceId==='class-teacher-geography-candidate'&&
   model.characterId==='class-teacher-geography-candidate'&&
   pub.url.startsWith('./assets/l2d/library/class-teacher-geography-candidate/'))||
  // The approved "new outfit" is the male lead's actual 17-part FRONT,
  // while the immutable source archive keeps its original module identity.
  (id==='char-003'&&face==='front'&&sourceId==='char-003-outfit-02'&&
   model.characterId==='char-003-outfit-02'&&
   Object.keys(model.parts||{}).length===17&&
   ['handwear_left','handwear_right','topwear','face','legwear','footwear'].every(key=>!!model.parts[key])&&
   pub.url.startsWith('./assets/l2d/library/char-003-outfit-02/'));
 if(model.format!=='paperchalk-part-rig-v1'||
    (model.characterId!==id&&!validAlias)||model.face!==face)
  throw Error('当前人物的模块绑定文件格式或方向错误');
 // The copy is ONLY an authoring basis. The official published JSON remains
 // immutable, and local edits stay under the original heroine's own ID.
 // Preserve earlier local standing-art rig settings when adding battle parts.
 if(staleBase){
  for(const [key,value] of Object.entries(local.parts||{}))
   if(model.parts[key])model.parts[key]={...model.parts[key],...value};
  if(local.idleProfile)model.idleProfile=local.idleProfile;
 }
 return {...model,characterId:id};
}
async function storePartRig(rig){
 if(!rig||rig.format!=='paperchalk-part-rig-v1'||rig.characterId!==currentId||
    !['front','back'].includes(rig.face)||!rig.parts||typeof rig.parts!=='object')
  throw Error('绑定工程人物或方向不一致，拒绝覆盖');
 const layers=ed.S.layers[rig.face].filter(p=>p.sourcePart);
 const ids=new Set(layers.map(p=>String(p.partId||p.name)));
 const keys=Object.keys(rig.parts);
 const removed=Array.isArray(rig.deletedParts)?rig.deletedParts:[];
 const deployed=new Set(Object.keys(list.get(currentId)?.l2dModule?.[rig.face]?.rig?.textures||{}));
 if(keys.some(k=>!ids.has(k))||keys.length!==ids.size||
    new Set(keys).size!==keys.length||removed.some(k=>typeof k!=='string'||
      keys.includes(k)||(deployed.size&&!deployed.has(k)))||
    (!keys.length&&!removed.length))
  throw Error('绑定工程部件、删除记录与真实源图层不一致，拒绝覆盖');
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
 ed.S.derivedDirty=false;
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
  return {applied:false};
 }
 const selected=list.get(currentId);
 if(selected?.editorOnly&&!selected?.l2dModule?.[side]?.rig){
  // A missing teacher/outfit source is NOT a valid game actor. Save the draft
  // locally while preserving the previously selected playable character.
  message('✓ 分层草稿已保存在本浏览器；此服装尚无已发布的 L2D 模块，未替换游戏人物。');
  return {applied:false};
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
 return {applied:true};
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
  (currentId==='char-004'&&count===23?
    '女三：21 张原始 PSD 图层＋2 张从真实外套分离的可动布片；双手各有肩／肘／腕父级，衣摆跟随握持点。':
   hasNativePSD()?'已载入 '+count+' 个真实 PSD 独立纹理：后发、刘海、校服、手臂、裙摆、眼睛、嘴等采用实时关节及网格驱动。':currentId==='char-002'?'旧合并手臂正在替换为独立左右手臂…':
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
  const existing=options.appendMissingParts
   ?new Map(ed.S.layers[face].filter(p=>p.sourcePart).map(p=>[String(p.partId||p.name),p]))
   :new Map();
  // Existing painted standing parts win; only missing battle PNGs are imported.
  const ordered=restored[face].map(p=>existing.get(String(p.partId||p.name))||p);
  const auxiliary=ed.S.layers[face].filter(p=>!p.sourcePart&&!/^(PSD ·|原始角色 ·)/.test(p.name));
  // The previous 19-layer import left behind an untouched auto-created
  // “未命名透明层”, producing a fake 22nd item in the 21-layer original PSD.
  // Never remove user-authored content; drop ONLY the exactly empty starter.
  const keepAuxiliary=(currentId==='char-004'||currentId==='male2'||currentId===SEETHROUGH_QA_ID)&&face==='front'
   ?auxiliary.filter(p=>!/^原始素材 · 正面$/.test(p.name)&&
      !(p.name==='未命名透明层'&&p.canvas&&!hasPaint(p.canvas)))
   :auxiliary;
  ed.S.layers[face]=[
   ...keepAuxiliary,
   ...(options.appendMissingParts&&existing.size?ordered:restored[face])];
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
 // Approved standing-first front rig contains 20 parts; the V4 ZIP has only 17.
 const packed=id==='protagonist'&&face==='front'&&
  view?.rig?.sourceCharacterId==='protagonist-unified-v1'
  ?null:view?.sourceParts?.url;
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
    const originalAlias=id==='protagonist'&&
     ['protagonist-rig-v1','protagonist-unified-v1'].some(alias=>
      published.sourceCharacterId===alias&&rig.characterId===alias&&
      published.url.startsWith('./assets/l2d/library/'+alias+'/'));
    const femaleFiveAlias=id==='char-006'&&face==='front'&&
      published.sourceCharacterId==='class-teacher-geography-candidate'&&
      rig.characterId==='class-teacher-geography-candidate'&&
      published.url.startsWith('./assets/l2d/library/class-teacher-geography-candidate/');
    const maleLeadAlias=id==='char-003'&&face==='front'&&
      published.sourceCharacterId==='char-003-outfit-02'&&
      rig.characterId==='char-003-outfit-02'&&
      published.url.startsWith('./assets/l2d/library/char-003-outfit-02/')&&
      Object.keys(rig.parts||{}).length===17;
    if(rig.format!=='paperchalk-part-rig-v1'||
       (rig.characterId!==id&&!originalAlias&&!femaleFiveAlias&&!maleLeadAlias)||rig.face!==face)
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
      x:p.x,y:p.y,visible:p.enabled!==false,locked:false,opacity:1,role:'psd-part'});
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
/* One-way, lossless migration of previously saved female-six projects.
 * Her published 17-part source and user-painted edits stay in IndexedDB;
 * only the new PSD-authentic shorts is installed, not an entire new actor.
 * The updated 18th module part is loaded from its published standalone PNG. */
async function appendFemale06FittedPantsIfMissing(id){
 if(id!=='female-06'||side!=='front'||currentId!==id)return false;
 const layers=ed.S.layers.front||[];
 if(!layers.some(p=>p.sourcePart)||layers.some(p=>
   p.sourcePart&&String(p.partId||p.name)==='pants_overlay'))return false;
 const view=list.get(id)?.l2dModule?.front;
 const imageUrl=view?.rig?.textures?.pants_overlay;
 if(!imageUrl||!view?.rig?.url)return false;
 const saved=await get('part-rig:'+id+':front');
 if(saved?.deletedParts?.includes('pants_overlay'))return false;
 const [imageRes,rigRes]=await Promise.all([
  fetch(siteURL(imageUrl)),fetch(siteURL(view.rig.url))
 ]);
 if(!imageRes.ok||!rigRes.ok)
  throw Error('女6短裤增量加载失败：缺少正式发布 PNG/骨骼');
 const rig=await rigRes.json(),def=rig.parts?.pants_overlay;
 if(rig.characterId!==id||!def||
    def.kind!=='pants-bound'||def.skinBinding?.target!=='legwear')
  throw Error('女6短裤绑定版本不匹配；保留原工程不覆盖');
 const bytes=new Uint8Array(await imageRes.arrayBuffer());
 const blob=new Blob([bytes],{type:'image/png'});
 const sourceURL=URL.createObjectURL(blob);
 let image;try{image=await ed.imgFrom(sourceURL)}
 finally{URL.revokeObjectURL(sourceURL)}
 if(image.width!==def.w||image.height!==def.h)
  throw Error('短裤源图尺寸与骨骼面积绑定不一致');
 // Do not mutate an existing actor until the source PNG and rig BOTH pass.
 if(currentId!==id||side!=='front'||ed.S.layers.front.some(p=>
  p.sourcePart&&String(p.partId||p.name)==='pants_overlay'))return false;
 const part=ed.layer('女六 · 黑色短裤',image,def.x,def.y,false);
 part.sourcePart=true;part.partId='pants_overlay';part.role='psd-part';
 const current=ed.S.layers.front;
 const torsoAt=current.findIndex(p=>p.sourcePart&&(p.partId||p.name)==='topwear');
 const legsAt=current.findIndex(p=>p.sourcePart&&(p.partId||p.name)==='legwear');
 const index=(torsoAt>=0?torsoAt:legsAt)+1;
 current.splice(Math.max(0,index),0,part);
 // Keep the per-character immutable source comparison baseline additive.
 const key='baseline:'+id+':front';
 const baseline=await get(key);
 if(Array.isArray(baseline)&&!baseline.some(p=>p.partId==='pants_overlay'))
  await put(key,[...baseline,{
   partId:'pants_overlay',name:part.name,x:def.x,y:def.y,
   visible:true,opacity:1,image:await fileURL(blob)
  }]);
 ed.renderList();ed.render();await ed.save();
 await persistSkeleton('front');
 updatePartStatus();
 window.dispatchEvent(new Event('paperchalk:studio-source-parts-loaded'));
 message('✓ 保留女6旧工程全部编辑，已增量加入随双腿变形的黑色短裤');
 return true;
}
async function ensureHostedParts(id){
 // Migrate a locally saved 17-mesh female-six without replacing drawings,
 // authored occlusion masks, rig transforms, or other character data.
 if(await appendFemale06FittedPantsIfMissing(id))return;
 // A deliberate deletion of ALL local source parts must not trigger an
 // automatic re-import of the original PNGs on the next visit.
 const draft=await get('part-rig:'+id+':'+side);
 if(draft?.deletedParts?.length&&ed.S.layers[side].some(p=>p.sourcePart))return;
 if(draft?.deletedParts?.length&&Object.keys(draft.parts||{}).length===0&&
    !ed.S.layers[side].some(p=>p.sourcePart))return;
 if(!hostedPartsURLs[id]&&!list.get(id)?.l2dModule?.[side]?.sourceParts&&!list.get(id)?.l2dModule?.[side]?.rig)return;
 const front=ed.S.layers.front.some(p=>p.sourcePart);
 const back=ed.S.layers.back.some(p=>p.sourcePart);
 const currentSource=ed.S.layers.front.filter(p=>p.sourcePart).map(p=>String(p.partId||p.name));
 const heroUnified=id==='protagonist'&&side==='front'&&
  list.get(id)?.l2dModule?.front?.rig?.sourceCharacterId==='protagonist-unified-v1';
 const needsHeroArms=heroUnified&&front&&
  !['battle_handwear_r','battle_handwear_l','battle_axe'].every(x=>currentSource.includes(x));
 const repairFemale3=id==='char-004'&&side==='front'&&
  !hasFemale3SourceRig(currentSource);
 const upgrade=id==='char-002'&&!hasFemale2Psd(currentSource);
 // Authored CHAR-004 layers are not "broken" merely because the user
 // moved a mesh forward/backward. Never fetch and replace a valid local stack.
 if(front&&!upgrade&&!needsHeroArms&&
    (id==='char-002'||back||id===BATTLE_FRONT_ID||heroUnified||
      (id==='char-004'&&hasFemale3SourceRig(currentSource))))return;
 message(id==='char-002'?'载入女二 PSD：17 个源层、18 个独立部件（举起的左手已分开）…':'载入真实原位分层…');
 try{
  const source=await hostedParts(id,side);
  if(currentId!==id)return;
  await importComponentFiles(source,{missingOnly:!upgrade&&!needsHeroArms&&!repairFemale3,
   appendMissingParts:needsHeroArms,quiet:true});
  message(id==='char-002'?
   '✓ 女二已加载 24 层原始记录和 18 个可动部件，两只手臂独立绑定。':
   id==='char-004'?'✓ 女三 21 原始 PSD 层＋2 张原画外套分区：双臂→手腕→外套抓握点为真实父子动态，裤腰与领口遮挡不变。':
   id===BATTLE_FRONT_ID?'✓ 女主战斗正面已自动加载：原始 PSD 24 层、原位部件和骨骼绑定，无需再导入 ZIP。':
   '已载入原位PSD独立部件。');
 }catch(error){
  console.error('[L2D] hosted source parts failed',error);
  message('原始部件在线加载失败：'+error.message+'；动画帧仍可编辑');
 }
}
// Raw SeeThrough archives contain original 1024px RGBA part PNGs and optional
// *_depth.png layers, but no layers.json. Reject transparent placeholders and
// oversized reference portraits; retain the exact pixels WITHIN the crop.
const SEETHROUGH_Z=[
 'nose','head','back_hair','ears','footwear','legwear','neck',
 'topwear','handwear','face','eyewhite','irides','eyelash','eyebrow',
 'mouth','front_hair'
];
const SEETHROUGH_QA_Z=[
 'back_hair','legwear','bottomwear','topwear','neck','handwear',
 'head','ears','face','eyewhite','irides','eyebrow','eyelash',
 'nose','mouth','front_hair','headwear'
];
// This review mode is deliberately not the old male2 preset. Bare feet
// and a two-person image do not have a usable "footwear" layer.
const SEETHROUGH_QA_LABELS={
 back_hair:'后发',legwear:'双腿',bottomwear:'泳装下装',
 topwear:'上半身与泳装',neck:'颈部',handwear:'手臂与双手',
 head:'头部',ears:'兽耳',face:'脸部',eyewhite:'眼白',
 irides:'虹膜',eyebrow:'眉毛',eyelash:'睫毛',nose:'鼻',
 mouth:'嘴',front_hair:'前发与刘海',headwear:'头饰'
};
const SEETHROUGH_LABELS={
 nose:'鼻子',head:'头部参考层',back_hair:'后发',ears:'耳朵',footwear:'鞋',
 legwear:'长裤与双腿',neck:'颈部',topwear:'西装外套 / 衬衫 / 领带',
 handwear:'双臂与交握双手',face:'脸部',eyewhite:'眼白',
 irides:'瞳孔',eyelash:'睫毛',eyebrow:'眉毛',mouth:'嘴',
 front_hair:'前发'};
async function convertSeethroughArchive(raw,actorId='male2'){
 const names=[...raw.keys()].filter(n=>/^[^/]+\.png$/i.test(n));
 const norm=n=>n.trim().toLowerCase().replace(/\s+/g,'_');
 const ids=new Map(names.map(n=>[norm(n.slice(0,-4)),n]));
 if(!ids.has('reconstruction')||!ids.has('src_img')||
    !ids.has('handwear')||!ids.has('topwear'))
  return null;
 const result=new Map(),layers=[],used=new Set(),tiny=[];
 const isQa=actorId===SEETHROUGH_QA_ID;
 const sequence=isQa?SEETHROUGH_QA_Z:SEETHROUGH_Z;
 const manifest={schema:1,canvas:[1024,1024],characterId:actorId,
  provenance:'authentic-seethrough-rgba',sourceImage:'src_img.png',
  sourceLayerGroups:24,layers:{front:layers,back:[]}};
 for(const id of sequence){
  const path=ids.get(id);
  if(!path)continue;
  const bytes=raw.get(path),url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
  let img;
  try{img=await ed.imgFrom(url)}finally{URL.revokeObjectURL(url)}
  if(img.width!==1024||img.height!==1024)
   throw Error('SeeThrough 部件尺寸必须是 1024×1024：'+path);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(img,0,0);
  const data=context.getImageData(0,0,1024,1024).data;
  let minX=1024,minY=1024,maxX=-1,maxY=-1,pixels=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
   if(data[(y*1024+x)*4+3]<=16)continue;
   pixels++;if(x<minX)minX=x;if(x>maxX)maxX=x;
   if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  if(pixels<16){tiny.push(id);continue}
  // Keep the original source RGBA samples (no synthesized limbs, no upscaling).
  const crop=document.createElement('canvas');
  crop.width=maxX-minX+1;crop.height=maxY-minY+1;
  crop.getContext('2d').drawImage(img,-minX,-minY);
  const blob=await new Promise(resolve=>crop.toBlob(resolve,'image/png'));
  if(!blob)throw Error('无法编码有效的 SeeThrough 真实部件：'+id);
  const file='front/'+id+'.png';
  result.set(file,new Uint8Array(await blob.arrayBuffer()));
  layers.push({id,partId:id,name:(isQa?SEETHROUGH_QA_LABELS:SEETHROUGH_LABELS)[id]||id,
   role:'psd-part',sourceType:'seethrough',file,x:minX,y:minY,
   w:crop.width,h:crop.height,visible:true,opacity:1,locked:false});
  used.add(id);
 }
 if(layers.length<12||!used.has('handwear')||!used.has('legwear')||
    !used.has('topwear')||(isQa?!used.has('bottomwear'):!used.has('footwear')))
  throw Error('SeeThrough 有效源部件不足，拒绝创建错误 L2D');
 result.set('layers.json',new TextEncoder().encode(JSON.stringify(manifest)));
 result.set('seethrough-report.json',new TextEncoder().encode(JSON.stringify({
  retained:layers.map(p=>p.id),emptyOrNearlyEmpty:tiny,
  discardedReference:['src_head.png','src_img.png','reconstruction.png'],
  limitations:isQa?['原图包含两个人：头发、手臂和腿仍为跨人物语义层','不能冒充独立左右手臂 IK','没有原始背面拆分']:
   ['双臂当前共用一个真实 handwear PNG','没有原始背面拆分'],
 },null,2)));
 return result;
}
async function importComponentArchive(file){
 if(!file)return;
 await switchQueue; // Do not import into a half-loaded character or direction.
 if(/\.psd$/i.test(file.name)){
  if(currentId===BATTLE_FRONT_ID)
   throw Error('战斗正面请导入已整理的 24 层 ZIP；原始 PSD 把两把斧头合在同一层，直接导入会失去正确拆分。');
  if(currentId==='char-002'&&side!=='front')throw Error('女二只有真实正面 PSD，尚无背面分层');
  const oldSource=ed.S.layers[side],beforeCount=oldSource.length;
  await ed.importPsd(file);
  if(ed.S.layers[side]===oldSource||ed.S.layers[side].length<8)
   throw Error('PSD 没有成功解析为真实独立图层，请检查文件或使用打包好的 L2D 模块 ZIP');
  if(currentId==='char-002'&&ed.S.layers[side].length<17)
   throw Error('女二原始PSD包含24层记录、17个有内容的部件；当前读取不完整');
  const seen=new Set();
  for(const [index,part] of ed.S.layers[side].entries()){
   part.sourcePart=true;
   const raw=part.name.trim().toLowerCase().replace(/\s+/g,'_');
   let ident=/^[a-z][a-z0-9_-]{0,79}$/.test(raw)?raw:'layer_'+String(index+1).padStart(2,'0');
   while(seen.has(ident))ident=ident+'_dup';
   seen.add(ident);
   part.partId=ident;part.role='psd-part';
  }
  showOriginalV4=true;
  await loadCorrectionLayers();
  ed.renderList();ed.render();await ed.save();
  await persistSkeleton(side);updatePartStatus();
  window.dispatchEvent(new Event('paperchalk:studio-source-parts-loaded'));
  // A new outfit has no pre-existing rig; activate the same universal editor
  // immediately instead of leaving its layer panel static until navigation.
  window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{
   detail:{id:currentId,side}
  }));
  message('✓ 已按原 PSD 导入真实 '+ed.S.layers[side].filter(p=>p.sourcePart).length+' 层，启动独立 L2D 骨骼预览。');
  return;
 }
 message('读取原始分层工程所有部件…');
 const zipped=await zipFiles(file);
 // A ready-to-use independent PartRig module ZIP is importable by any
 // named actor or wardrobe child. It retains its original authored bones and
 // textures; never confuse one person's module with another's actor slot.
 const packageIds=[...zipped.keys()].filter(n=>/^[a-z][a-z0-9_-]{0,79}\/module\.json$/.test(n))
  .map(n=>n.split('/')[0]).filter(id=>zipped.has(id+'/front-rig-editable-parts.zip')&&
   zipped.has(id+'/front.rig.json'));
 if(packageIds.length>1)throw Error('ZIP 内有多个模型，请分别导入');
 const packagedId=packageIds[0]||null;
 const seethrough=packagedId?null:await convertSeethroughArchive(zipped,
  currentId===SEETHROUGH_QA_ID?SEETHROUGH_QA_ID:'male2');
 if(seethrough&&currentId!=='male2'&&currentId!==SEETHROUGH_QA_ID)
  throw Error('原始 See-through ZIP 必须导入专用测试槽位或男二；不允许覆盖现有女主 / 其他人物');
 if(packagedId&&packagedId!==currentId)throw Error('ZIP 的人物标识为 '+packagedId+'，当前是 '+currentId+'；请先选正确人物或服装');
 const files=packagedId?await zipBytes(zipped.get(packagedId+'/front-rig-editable-parts.zip')):
  (seethrough||zipped);
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
 if(currentId===SEETHROUGH_QA_ID){
  // This isolated import has no published skeleton; start a real PartRig
  // directly after all RGBA source layers are committed.
  window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{
   detail:{id:SEETHROUGH_QA_ID,side:'front'}
  }));
  message('✓ See-through 双人测试：真实分层已载入，骨骼编辑已启动；原版角色及游戏槽位不变。');
 }
 if(packagedId){
  const binding=JSON.parse(new TextDecoder().decode(zipped.get(packagedId+'/front.rig.json')));
  const sourceIds=ed.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId);
  if(binding.format!=='paperchalk-part-rig-v1'||binding.characterId!==currentId||
     binding.face!=='front'||sourceIds.length<8||
     Object.keys(binding.parts||{}).length!==sourceIds.length||
     sourceIds.some(id=>!binding.parts[id]))
   throw Error('模块骨骼/人物/真实图层不一致，拒绝覆盖');
  await storePartRig(binding);
 }
 if(seethrough||packagedId){
  // No second character and no fake static mesh. PartRig will build a new
  // per-source skeleton for the SAME male2 family as soon as this is emitted.
  window.dispatchEvent(new CustomEvent('paperchalk:studio-ready-to-edit',{
   detail:{id:currentId,side:'front'}
  }));
  message('✓ '+(list.get(currentId)?.label||currentId)+'：'+
   ed.S.layers.front.filter(p=>p.sourcePart).length+' 个真实部件已装入 L2D；模型与骨骼可编辑并保存。');
 }
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
 if(!uri){
  playing=false;globalLayer=null;frameLayer=null;
  if(!ed.S.layers[side].some(p=>p.sourcePart))ed.l2dRig?.()?.start();
  ed.render();return;
 }
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
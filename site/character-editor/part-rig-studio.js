/* Single editable L2D: quick movement sliders and an optional bone inspector. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,panelOpen:false,model:null,visualIdle:null,selected:'',bone:'',drag:null,phase:0,playing:true,dirty:false,showGuides:false,fitMode:false,fitDrag:null};
const panel=document.createElement('section');panel.id='part-rig-panel';panel.hidden=true;
panel.innerHTML=`<header class="rig-h"><strong>部件与骨骼</strong><button id="rig-close" type="button" hidden aria-hidden="true">关闭</button></header>
<p id="rig-source">直接拖动画布中的关节，或修改所选部件的高级参数。</p>
<label>部件<select id="rig-part"></select></label>
<label class="rig-part-amount">本部件摆动倍率 <output id="rig-part-amount-value">100%</output>
 <input id="rig-part-amount" type="range" min="0" max="2000" value="100" step="5"></label>
<div id="rig-sliders"></div>
<div class="rig-joints"><label>当前骨骼<select id="rig-bone" aria-label="选择当前部件的独立骨骼"></select></label><div id="rig-bone-sliders"></div><p id="rig-bone-tip">每条骨骼有自己的关节、角度、速度、相位与蒙皮半径；不同部件互不影响。</p></div>
<div class="rig-buttons"><button id="rig-pause" type="button">暂停</button><button id="rig-zero" type="button">本层归零</button><button id="rig-save" type="button">保存绑定草稿</button><button id="rig-export" type="button">↓ 备份绑定 JSON</button><button id="rig-module-export" type="button">↓ 一键打包游戏模块 ZIP</button></div>
<p id="rig-status" role="status">绿色轴点、黄色末端均可在主画布直接拖动。</p>`;
// Dock the inspector beside the character; never cover the preview.
const dock=document.querySelector('.layout .right')||stage;
dock.prepend(panel);
// Secondary exports stay under a single collapsed file section, not in the top toolbar.
const rigFiles=document.createElement('details');
rigFiles.id='rig-file-actions';rigFiles.className='single-workspace-files';
rigFiles.innerHTML='<summary>骨骼文件与模块导出</summary>';
for(const id of ['rig-export','rig-module-export']){
 const button=$(id);if(button)rigFiles.append(button);
}
panel.append(rigFiles);
for(const id of ['rig-save','rig-quick-save','rig-pause','rig-close']){
 const element=$(id);if(element)element.hidden=true;
}
// One simple tool: pick a part → choose one/many other parts → front/back → paint.
// Unlike the old front-only control there is no "move layer first" prerequisite.
const maskPanel=document.createElement('section');
maskPanel.id='rig-mask-panel';
maskPanel.innerHTML="<div class=\"rig-mask-head\"><strong>局部遮挡</strong><span>选部件 · 选对象 · 涂抹</span></div><div class=\"rig-mask-source\">当前部件：<output id=\"rig-mask-source\">未选择</output></div><div class=\"rig-mask-object\"><label>相对对象 <select id=\"rig-mask-target\" aria-label=\"选定需要遮挡的对象\"></select></label><button id=\"rig-mask-more\" type=\"button\" title=\"一块蒙版可以同时对多个部件生效\">＋ 多选</button></div><div id=\"rig-mask-multiple\" hidden><div id=\"rig-mask-target-list\" class=\"rig-mask-target-list\"></div></div><div class=\"rig-mask-directions\" role=\"group\" aria-label=\"画出的区域相对对象的位置\"><button type=\"button\" id=\"rig-mask-front\" aria-pressed=\"true\">在对象前面</button><button type=\"button\" id=\"rig-mask-back\" aria-pressed=\"false\">在对象后面</button></div><div class=\"rig-mask-actions\"><button type=\"button\" id=\"rig-mask-paint\">✎ 涂抹</button><button type=\"button\" id=\"rig-mask-erase\">橡皮擦</button><button type=\"button\" id=\"rig-mask-toggle\" hidden>完成</button></div><label class=\"rig-mask-size\">大小 <input id=\"rig-mask-size\" type=\"range\" min=\"2\" max=\"96\" value=\"12\" step=\"2\"><output id=\"rig-mask-size-value\">12</output></label><div class=\"rig-mask-actions rig-mask-secondary\"><button type=\"button\" id=\"rig-mask-undo\">撤销</button><button type=\"button\" id=\"rig-mask-redo\">重做</button><button type=\"button\" id=\"rig-mask-clear\">清空</button></div><details id=\"rig-mask-relations\"><summary>已做的遮挡 <span id=\"rig-mask-relation-count\"></span></summary><div id=\"rig-mask-relation-list\"></div></details><small id=\"rig-mask-hint\">只改选中的局部，不修改原图。</small><small id=\"rig-mask-conflict\" hidden role=\"status\"></small>";


panel.querySelector('.rig-part-amount').before(maskPanel);
// The crouching heroine is one dedicated action rig, NOT a new NPC/wardrobe.
// Four safe, bounded coupled-motion strengths share the exact engine used
// by the game. They can be saved without editing or redrawing PSD layers.
const crouchPanel=document.createElement('section');
crouchPanel.id='rig-crouch-motion';
crouchPanel.hidden=true;
crouchPanel.innerHTML=`<div class="rig-crouch-head"><strong>蹲下 · 持斧动态</strong><span>双手握柄绑定 · 鞋底锁定</span></div>
<div class="rig-crouch-sliders">
<label>裙摆／外套下摆 <output data-out="cloth">100%</output>
<input type="range" data-crouch="cloth" min="0" max="150" step="5" value="100" aria-label="蹲姿裙摆和外套下摆摆动强度"></label>
<label>斧头＋双手同步 <output data-out="axe">100%</output>
<input type="range" data-crouch="axe" min="0" max="150" step="5" value="100" aria-label="蹲姿斧头与两只手同步动态强度"></label>
<label>左右大腿承重 <output data-out="legs">100%</output>
<input type="range" data-crouch="legs" min="0" max="150" step="5" value="100" aria-label="蹲姿左右腿承重动态强度"></label>
<label>鞋面微弯（鞋底固定） <output data-out="feet">100%</output>
<input type="range" data-crouch="feet" min="0" max="150" step="5" value="100" aria-label="蹲姿鞋面弯曲强度"></label>
</div>
<small>始终保持原始蹲姿；根部固定，末端渐变。动态参数保存到当前 L2D 与游戏，不改原图。</small>`;
panel.querySelector('#rig-source').after(crouchPanel);
const crouchCSS=document.createElement('style');
crouchCSS.textContent=`
#rig-crouch-motion{margin:10px 0;padding:11px;border:1px solid #47657a;
 border-radius:10px;background:#172a39}
#rig-crouch-motion .rig-crouch-head{display:flex;gap:8px;flex-wrap:wrap;
 align-items:baseline;justify-content:space-between;font-size:12px;margin-bottom:9px}
#rig-crouch-motion .rig-crouch-head span{color:#a6c3d7;font-size:10px}
#rig-crouch-motion .rig-crouch-sliders{display:grid;grid-template-columns:1fr;gap:10px}
#rig-crouch-motion label{display:grid;grid-template-columns:minmax(0,1fr) auto;
 align-items:center;gap:5px;font-size:11px}
#rig-crouch-motion label input{grid-column:1/-1;width:100%}
#rig-crouch-motion output{font-variant-numeric:tabular-nums;color:#94d5ee}
#rig-crouch-motion small{display:block;color:#a7bbc9;font-size:10px;
 margin-top:10px;line-height:1.55}`;
document.head.append(crouchCSS);
function syncCrouchUI(){
 const enabled=state.model?.characterId==='protagonist-crouch-axe'&&state.model?.face==='front';
 crouchPanel.hidden=!enabled;
 if(!enabled)return;
 const profile=core.sanitizeCrouchDynamics(state.model.crouchDynamics);
 state.model.crouchDynamics=profile;
 core.bindCrouchDynamics(state.model);
 for(const input of crouchPanel.querySelectorAll('input[data-crouch]')){
  const value=Math.round(profile[input.dataset.crouch]*100);
  input.value=String(value);
  crouchPanel.querySelector('[data-out="'+input.dataset.crouch+'"]').textContent=value+'%';
 }
}
for(const input of crouchPanel.querySelectorAll('input[data-crouch]')){
 input.addEventListener('input',()=>{
  if(!state.active||state.model?.characterId!=='protagonist-crouch-axe')return;
  const amount=Number(input.value)/100;
  state.model.crouchDynamics[input.dataset.crouch]=amount;
  core.bindCrouchDynamics(state.model);
  crouchPanel.querySelector('[data-out="'+input.dataset.crouch+'"]').textContent=
   Math.round(amount*100)+'%';
  changed();
 });
}

const fitPanel=document.createElement('section');
fitPanel.id='rig-fit-panel';
fitPanel.innerHTML=`
<div class="rig-fit-heading"><strong>↖ 直接在画布调整</strong><span>选择图层后自动出现四角手柄</span></div>
<small id="rig-fit-help">点选人物上的部件 → 直接拖动位置；拖四角调整大小。无需填参数。完成后点顶部「保存并应用到游戏」。</small>
<div class="rig-fit-actions"><button type="button" id="rig-fit-handles" aria-pressed="true">🔓 拖动已开启</button><button type="button" id="rig-fit-reset">↶ 恢复该部件原位</button></div>
<details id="rig-fit-precise"><summary>精确数字微调（可选）</summary>
 <div class="rig-fit-grid">
 <label>宽度 <input id="rig-fit-width" data-fit="scaleX" type="number" inputmode="decimal" min="25" max="400" step="1" value="100"> %</label>
 <label>高度 <input id="rig-fit-height" data-fit="scaleY" type="number" inputmode="decimal" min="25" max="400" step="1" value="100"> %</label>
 <label>水平偏移 <input id="rig-fit-x" data-fit="offsetX" type="number" inputmode="decimal" min="-1024" max="1024" step="1" value="0"> px</label>
 <label>垂直偏移 <input id="rig-fit-y" data-fit="offsetY" type="number" inputmode="decimal" min="-1024" max="1024" step="1" value="0"> px</label>
 </div>
 <label class="rig-fit-lock"><input id="rig-fit-lock" type="checkbox"> 保持宽高比例</label>
</details>`;
maskPanel.before(fitPanel);
const fitCSS=document.createElement('style');
fitCSS.textContent=`
#rig-fit-panel{padding:10px;margin:8px 0;border:1px solid #41677b;border-radius:9px;background:#172734}
.rig-fit-heading{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;font-size:12px}
.rig-fit-heading span{font-size:10px;color:#a8c2d0}
.rig-fit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.rig-fit-grid label{font-size:11px;color:#c9daea;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.rig-fit-grid input{min-width:0;max-width:100%;width:80px;padding:6px;text-align:right;font-variant-numeric:tabular-nums}
.rig-fit-lock{display:flex;gap:6px;align-items:center;font-size:11px;margin:8px 0}
.rig-fit-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px}
.rig-fit-actions button{padding:7px 5px;white-space:normal;min-height:38px;font-size:11px}
#rig-fit-handles[aria-pressed="true"]{background:#21536e;border-color:#7cd0f4}
#rig-fit-help{display:block;font-size:10px;line-height:1.55;color:#a9c4d4;margin-top:7px}
#rig-fit-help{font-size:12px;color:#d0eaff;margin:8px 0 10px}
#rig-fit-precise{margin-top:9px;border-top:1px solid #3b556b;padding-top:7px}
#rig-fit-precise summary{cursor:pointer;color:#91afc4;font-size:11px;padding:7px 3px}
#rig-fit-precise:not([open]) .rig-fit-grid{display:none}
#rig-fit-panel .rig-fit-actions button[aria-pressed="true"]{background:#1d5b54;border-color:#78c9aa;color:#eafff4}
#rig-fit-panel .rig-fit-actions button{touch-action:manipulation}
#stage #view{touch-action:none}
`;
document.head.append(fitCSS);
const maskState={enabled:false,erase:false,direction:'front',targets:new Set(),
 pointer:null,touches:new Map(),blockedTouches:new Set(),pinch:null,
 restorePlaying:null,history:[],redo:[],editingEntry:null};
const maskTarget=$('rig-mask-target'),maskLabel=$('rig-mask-hint'),maskSize=$('rig-mask-size');
function maskTargets(entry){
 return Array.isArray(entry?.targets)?entry.targets:(entry?.target?[entry.target]:[]);
}
function getMask(){
 const entries=state.model?.occlusionMasks||[],focused=maskState.editingEntry;
 if(focused&&entries.includes(focused)&&focused.source===state.selected&&
  (focused.direction||'front')===maskState.direction&&
  maskTargets(focused).includes(maskTarget.value))return focused;
 return entries.find(m=>m.source===state.selected&&
  (m.direction||'front')===maskState.direction&&
  maskTargets(m).includes(maskTarget.value));
}
function maskCanvas(entry,source){
 if(entry._canvas)return entry._canvas;
 const c=document.createElement('canvas');c.width=source.w;c.height=source.h;
 Object.defineProperty(entry,'_canvas',{value:c,enumerable:false,configurable:true,writable:true});
 if(entry.png?.startsWith('data:image/png;base64,')){
  entry._pending=true;
  const image=new Image();
  image.onload=()=>{
   if(entry._canvas===c&&image.width===c.width&&image.height===c.height)
    c.getContext('2d').drawImage(image,0,0);
   else maskLabel.textContent='旧蒙版尺寸不一致，已保留原数据';
   entry._pending=false;entry._revision=(entry._revision||0)+1;ed.render();
  };
  image.onerror=()=>{entry._pending=false;maskLabel.textContent='旧蒙版加载失败，未覆盖原文件'};
  image.src=entry.png;
 }
 return c;
}
function ensureMask(){
 const part=state.model?.parts[state.selected],target=maskTarget.value;
 if(!part||!target||target===state.selected||!state.model.parts[target])return null;
 let entry=getMask();
 if(!entry){
  const n=(state.model.occlusionMasks||[]).filter(x=>x.source===state.selected).length+1;
  entry={source:state.selected,target,targets:[...maskState.targets],direction:maskState.direction,
   enabled:true,png:'',name:'局部'+n};
  if(!entry.targets.length)entry.targets=[target];
  (state.model.occlusionMasks ||= []).push(entry);
  const c=document.createElement('canvas');c.width=part.w;c.height=part.h;
  Object.defineProperty(entry,'_canvas',{value:c,enumerable:false,configurable:true,writable:true});
 }
 maskState.editingEntry=entry;
 return entry;
}
function serializeMask(entry){
 if(!entry?._canvas||entry._pending)return;
 entry.png=entry._canvas.toDataURL('image/png');
 entry._revision=(entry._revision||0)+1;
 changed(false);
}
function paintMaskLine(a,b){
 const entry=ensureMask(),source=state.model?.parts[state.selected];
 if(!entry||!source||entry._pending)return;
 // Brush in the actual warped/placed ArtMesh, but write to ORIGINAL
 // source-local mask pixels. Resizing must never shift painted occlusions.
 const art=parts().find(p=>key(p)===state.selected);
 const localA=art?mapToSource(a,art):null,localB=art?mapToSource(b,art):null;
 if(!localA||!localB)return;
 const g=maskCanvas(entry,source).getContext('2d');
 g.save();
 g.globalCompositeOperation=maskState.erase?'destination-out':'source-over';
 g.strokeStyle='#fff';g.fillStyle='#fff';
 const scale=(source.placement?.scaleX||1)+(source.placement?.scaleY||1);
 g.lineWidth=Number(maskSize.value)*2/Math.max(.5,scale);
 g.lineCap='round';g.lineJoin='round';
 g.beginPath();g.moveTo(localA.x-source.x,localA.y-source.y);
 g.lineTo(localB.x-source.x,localB.y-source.y);g.stroke();
 if(Math.hypot(localA.x-localB.x,localA.y-localB.y)<.01){
  g.beginPath();g.arc(localA.x-source.x,localA.y-source.y,g.lineWidth/2,0,Math.PI*2);g.fill();
 }
 g.restore();entry._revision=(entry._revision||0)+1;ed.render();
}
function setMaskMode(enabled){
 enabled=!!enabled&&!!state.model?.parts[state.selected];
 if(enabled===maskState.enabled){
  $('rig-mask-paint').setAttribute('aria-pressed',String(enabled&&!maskState.erase));
  $('rig-mask-erase').setAttribute('aria-pressed',String(enabled&&maskState.erase));
  maskLabel.textContent=maskHint();ed.render();return;
 }
 maskState.enabled=enabled;
 if(enabled){
  maskState.restorePlaying=state.playing;state.playing=false;
  ed.setTool('mask');
 }else{
  maskState.pointer=null;maskState.touches.clear();maskState.blockedTouches.clear();
  maskState.pinch=null;
  if(maskState.restorePlaying!==null)state.playing=maskState.restorePlaying;
  maskState.restorePlaying=null;
  if(S.tool==='mask')ed.setTool('select');
 }
 $('rig-mask-toggle').hidden=!enabled;
 $('rig-mask-paint').setAttribute('aria-pressed',String(enabled&&!maskState.erase));
 $('rig-mask-erase').setAttribute('aria-pressed',String(enabled&&maskState.erase));
 maskPanel.classList.toggle('painting',enabled);
 ed.render();
}
function maskHint(){
 const part=state.model?.parts[state.selected];
 if(!part)return '先选一个部件。';
 if(maskState.enabled)return (maskState.erase?'擦除':'涂抹')+'：'+
  (maskState.direction==='behind'?'橙色部分会在对象后面':'蓝色部分会在对象前面');
 const targets=[...maskState.targets].length;
 return targets>1?'当前选择 '+targets+' 个对象，画一次同时应用':'不伤原图 · 点「涂抹」开始，点「完成」退出';
}
function drawTargetList(){
 const list=$('rig-mask-target-list');list.replaceChildren();
 for(const p of parts()){
  const id=key(p);if(id===state.selected)continue;
  const label=document.createElement('label');label.className='rig-mask-target-check';
  const input=document.createElement('input');input.type='checkbox';
  input.value=id;input.checked=maskState.targets.has(id);
  input.disabled=id===maskTarget.value; // Primary target is changed via dropdown.
  input.onchange=()=>{
   if(input.checked)maskState.targets.add(id);else maskState.targets.delete(id);
   maskState.targets.add(maskTarget.value);
   const entry=getMask();
   if(entry){entry.targets=[...maskState.targets];entry.target=maskTarget.value;changed(false)}
   $('rig-mask-more').textContent='对象 '+maskState.targets.size;
   maskLabel.textContent=maskHint();
   drawRelationList();
  };
  label.append(input,document.createTextNode(p.name));
  list.append(label);
 }
 $('rig-mask-more').textContent=maskState.targets.size>1?'对象 '+maskState.targets.size:'＋ 多选';
}
function drawRelationList(){
 const list=$('rig-mask-relation-list');list.replaceChildren();
 const entries=(state.model?.occlusionMasks||[]).filter(e=>e.source===state.selected);
 $('rig-mask-relation-count').textContent=entries.length?String(entries.length):'';
 for(const entry of entries){
  const item=document.createElement('div');item.className='rig-mask-relation';
  const name=document.createElement('span');
  const targets=maskTargets(entry);
  name.textContent=(entry.direction==='behind'?'后面':'前面')+' · '+
    targets.map(id=>parts().find(p=>key(p)===id)?.name||id).join('、');
  const edit=document.createElement('button');edit.type='button';edit.textContent='修改';
  edit.onclick=()=>{
   setMaskMode(false);
   const available=targets.find(t=>[...maskTarget.options].some(x=>x.value===t));
   if(available)maskTarget.value=available;
   maskState.direction=entry.direction==='behind'?'behind':'front';
   maskState.targets=new Set(targets);
   maskState.editingEntry=entry;
   maskState.history=[];maskState.redo=[];syncDirection();drawTargetList();maskLabel.textContent=maskHint();
  };
  const remove=document.createElement('button');remove.type='button';remove.textContent='删除';
  remove.title='删除遮挡关系；保留原部件贴图';
  remove.onclick=()=>{
   setMaskMode(false);
   if(!confirm('删除这条局部遮挡关系？原始图片不会变。'))return;
   state.model.occlusionMasks=state.model.occlusionMasks.filter(m=>m!==entry);
   if(maskState.editingEntry===entry)maskState.editingEntry=null;
   changed(false);ed.renderList();drawRelationList();maskLabel.textContent=maskHint();
  };
  item.append(name,edit,remove);list.append(item);
 }
}
function syncDirection(){
 $('rig-mask-front').setAttribute('aria-pressed',String(maskState.direction==='front'));
 $('rig-mask-back').setAttribute('aria-pressed',String(maskState.direction==='behind'));
}
function updateMaskControls(){
 const part=state.model?.parts[state.selected],prev=maskTarget.value;
 maskTarget.replaceChildren();
 for(const p of parts()){const id=key(p);if(id!==state.selected)maskTarget.add(new Option(p.name,id))}
 const entries=(state.model?.occlusionMasks||[]).filter(e=>e.source===state.selected);
 const preferred=entries.find(e=>maskTargets(e).some(t=>[...maskTarget.options].some(o=>o.value===t)));
 const isCollar=/topwear|collar|coat|jacket|lapel/i.test(state.selected);
 const isGrip=/hand|arm|glove/i.test(state.selected);
 const suggested=isCollar?'neck':isGrip?'battle_axe':'';
 const choice=[prev,maskTargets(preferred)[0],suggested].find(id=>
  id&&[...maskTarget.options].some(o=>o.value===id));
 if(choice)maskTarget.value=choice;
 maskState.direction=preferred?.direction==='behind'?'behind':'front';
 maskState.editingEntry=preferred||null;
 maskState.targets=new Set(preferred?maskTargets(preferred):maskTarget.value?[maskTarget.value]:[]);
 maskState.history=[];maskState.redo=[];
 $('rig-mask-source').textContent=part?.name||'未选择';
 maskPanel.hidden=!state.active||!part;
 if(preferred?.png&&part)maskCanvas(preferred,part);
 syncDirection();drawTargetList();drawRelationList();maskLabel.textContent=maskHint();
}
$('rig-mask-more').onclick=()=>{
 const pop=$('rig-mask-multiple');
 pop.hidden=!pop.hidden;
 if(!pop.hidden)drawTargetList();
};
maskTarget.onchange=()=>{
 setMaskMode(false);
 const e=(state.model?.occlusionMasks||[]).find(m=>m.source===state.selected&&
  maskTargets(m).includes(maskTarget.value));
 maskState.direction=e?.direction==='behind'?'behind':'front';
 maskState.editingEntry=e||null;
 maskState.targets=new Set(e?maskTargets(e):[maskTarget.value]);
 maskState.history=[];maskState.redo=[];syncDirection();drawTargetList();drawRelationList();
 maskLabel.textContent=maskHint();ed.render();
};
for(const [button,direction] of [['rig-mask-front','front'],['rig-mask-back','behind']]){
 $(button).onclick=()=>{
  setMaskMode(false);maskState.direction=direction;maskState.history=[];maskState.redo=[];
  maskState.editingEntry=null;
  const entry=getMask();maskState.editingEntry=entry||null;
  if(entry){maskState.targets=new Set(maskTargets(entry));maskCanvas(entry,state.model.parts[state.selected])}
  syncDirection();drawTargetList();maskLabel.textContent=maskHint();ed.render();
 };
}
$('rig-mask-paint').onclick=()=>{maskState.erase=false;setMaskMode(true)};
$('rig-mask-erase').onclick=()=>{maskState.erase=true;setMaskMode(true)};
$('rig-mask-toggle').onclick=()=>setMaskMode(false);
maskSize.oninput=()=>{$('rig-mask-size-value').textContent=maskSize.value};
function maskHistoryStep(redo){
 const entry=getMask(),source=state.model?.parts[state.selected];
 if(!entry||!source||entry._pending)return;
 const src=redo?maskState.redo:maskState.history,
  dst=redo?maskState.history:maskState.redo,prior=src.pop();
 if(!prior)return;
 const c=maskCanvas(entry,source),g=c.getContext('2d');
 dst.push(g.getImageData(0,0,c.width,c.height));
 g.putImageData(prior,0,0);serializeMask(entry);ed.render();
}
$('rig-mask-undo').onclick=()=>maskHistoryStep(false);
$('rig-mask-redo').onclick=()=>maskHistoryStep(true);
window.addEventListener('keydown',e=>{
 if(!maskState.enabled||(e.target instanceof HTMLInputElement&&
  ['text','number','search'].includes(e.target.type)))return;
 if(!(e.ctrlKey||e.metaKey)||!['z','y'].includes(e.key.toLowerCase()))return;
 e.preventDefault();e.stopImmediatePropagation();
 maskHistoryStep(e.key.toLowerCase()==='y'||e.shiftKey);
},true);
$('rig-mask-clear').onclick=()=>{
 const entry=getMask();if(!entry)return;
 if(!confirm('清空这一块遮挡？原始部件不会改变。'))return;
 const c=maskCanvas(entry,state.model.parts[state.selected]);
 if(entry._pending)return;
 maskState.history.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
 maskState.redo=[];c.getContext('2d').clearRect(0,0,c.width,c.height);
 serializeMask(entry);ed.render();
};
const quickPanel=document.createElement('section');
quickPanel.id='rig-quick-panel';
quickPanel.hidden=true;
quickPanel.innerHTML="<div class=\"rig-quick-heading\"><strong>待机动态</strong><span>实时预览</span></div>\n<p class=\"rig-quick-tip\">胸部呼吸单独调节，肩、手臂、脖子和头部自动跟随；脚鞋固定。</p>\n<div id=\"rig-quick-sliders\">\n <label class=\"rig-quick-row\" data-quick-row=\"fringe\"><span>刘海摆幅</span><output>130%</output><input data-quick=\"fringe\" aria-label=\"刘海摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"130\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"rear\"><span>后发摆幅</span><output>140%</output><input data-quick=\"rear\" aria-label=\"后发摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"140\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"skirt\"><span>裙摆摆幅</span><output>150%</output><input data-quick=\"skirt\" aria-label=\"裙摆摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"150\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"coat-left\"><span>画面左侧外套翻摆</span><output>160%</output><input data-quick=\"coat-left\" aria-label=\"画面左侧外套翻摆幅度\" type=\"range\" min=\"0\" max=\"280\" step=\"5\" value=\"160\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"coat-right\"><span>画面右侧外套翻摆</span><output>185%</output><input data-quick=\"coat-right\" aria-label=\"画面右侧外套翻摆幅度\" type=\"range\" min=\"0\" max=\"280\" step=\"5\" value=\"185\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hands\"><span>双手／手臂</span><output>70%</output><input data-quick=\"hands\" aria-label=\"双手手臂摆动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"70\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hand-left\"><span>画面左手腕动作</span><output>115%</output><input data-quick=\"hand-left\" aria-label=\"画面左手腕活动幅度\" type=\"range\" min=\"0\" max=\"280\" step=\"5\" value=\"115\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hand-right\"><span>画面右手腕动作</span><output>125%</output><input data-quick=\"hand-right\" aria-label=\"画面右手腕活动幅度\" type=\"range\" min=\"0\" max=\"280\" step=\"5\" value=\"125\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"shoulders\"><span>肩部活动</span><output>30%</output><input data-quick=\"shoulders\" aria-label=\"肩部活动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"30\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hips\"><span>胯部活动</span><output>20%</output><input data-quick=\"hips\" aria-label=\"胯部活动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"20\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"breath\"><span>胸部呼吸</span><output>60%</output><input data-quick=\"breath\" aria-label=\"胸部呼吸幅度\" type=\"range\" min=\"0\" max=\"300\" step=\"5\" value=\"60\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"speed\"><span>摆动速度</span><output>80%</output><input data-quick=\"speed\" aria-label=\"摆动速度\" type=\"range\" min=\"25\" max=\"250\" step=\"5\" value=\"80\"></label>\n</div>\n<button id=\"rig-quick-save\" type=\"button\">✓ 保存到游戏</button>\n<p id=\"rig-quick-status\" role=\"status\">拖动滑块后点击保存。</p>";
dock.prepend(quickPanel);
$('rig-quick-save').hidden=true; // One save control in the header.
const actionRow=document.createElement('label');
actionRow.className='rig-action-row';
actionRow.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:9px 10px;margin:8px 0;background:#172938;border:1px solid #426078;border-radius:8px';
actionRow.innerHTML='<strong>角色动作 · 同一套 L2D</strong> <select id="rig-character-action" aria-label="切换同一人物的局部动作"></select>';
actionRow.hidden=true;
quickPanel.querySelector('.rig-quick-tip').after(actionRow);
const gripExplanation=document.createElement('p');
gripExplanation.id='rig-parent-chain-summary';
gripExplanation.style.cssText='font-size:12px;line-height:1.55;color:#b9d0e0;padding:5px 3px';
gripExplanation.textContent='父级：脚/胯 → 躯干 → 左右肩 → 肘 → 手腕；外套左右片以躯干为父级，抓握处跟随对应手腕，衣摆滞后自然摆动。';
gripExplanation.hidden=true;
quickPanel.querySelector('.rig-quick-tip').after(gripExplanation);
const actionSelect=$('rig-character-action');
actionSelect.addEventListener('change',()=>{
 if(!state.model)return;
 if(core.setAction(state.model,actionSelect.value)){
  // The action is NOT a new actor or a replacement PSD.
  try{localStorage.setItem('paperchalk-action:'+studio.current+':'+S.side,actionSelect.value);}catch(e){}
  info('已切换 '+actionSelect.selectedOptions[0]?.textContent+'：局部过渡，其余部件连续播放');
  window.dispatchEvent(new CustomEvent('paperchalk:studio-action-changed',{detail:{characterId:studio.current,face:S.side,action:actionSelect.value}}));
  ed.render();
 }
});
// One concise, CLOSED guide; no second workflow, animation preset or overlay.
const workflow=document.createElement('details');
workflow.id='l2d-production-guide';
workflow.innerHTML=`<summary>制作流程与素材检查</summary>
<div class="rig-workflow-body">
<p><b>① 原画分层</b>：确认独立 PNG、透明遮挡补画、1024 原位坐标；合成图裁剪必须标注为“原画分区”。</p>
<p><b>② 绑定骨骼</b>：脚鞋固定 → 膝胯 → 腰胸肩 → 手臂 → 颈头五官；发根与裙腰固定。</p>
<p><b>③ 调滑块</b>：看实时动作和接缝，不创建多个待机/风力版本。</p>
<p><b>④ 保存</b>：保存到本机游戏；跨设备发布需导出模块 ZIP 并提交 GitHub，通过自动验证后上线。</p>
<a href="https://github.com/g2066203208-beep/paperchalk-world/blob/main/docs/l2d/L2D_STUDIO_CANONICAL_WORKFLOW_20261103.md" target="_blank" rel="noopener noreferrer">查看完整 L2D 制作规范与验收清单</a>
</div>`;
dock.append(workflow);
// Keep Play/Pause visible in the rig header, outside the animated portrait.
panel.querySelector('.rig-h').insertBefore($('rig-pause'),$('rig-close'));
const sliders=$('rig-sliders');
const fields=[['pivot.x','轴点 X',0,100,1],['pivot.y','轴点 Y',0,100,1],
 ['tip.x','末端 X',0,100,1],['tip.y','末端 Y',0,100,1],
 ['motion.x','横向位移',-80,80,1],['motion.y','纵向位移',-80,80,1],
 ['motion.angle','骨骼角度',-25,25,1],['motion.frequency','动作频率',.25,4,.05]];
for(const [path,label,min,max,step] of fields){
 const row=document.createElement('label');row.className='rig-field';
 const span=document.createElement('span');span.textContent=label;
 const out=document.createElement('output');out.id='rig-out-'+path.replace('.','-');
 const input=document.createElement('input');input.type='range';input.dataset.rig=path;
 input.min=min;input.max=max;input.step=step;
 row.append(span,out,input);sliders.append(row);
}
const boneFields=[
 ['head.x','根部 X',0,100,1],['head.y','根部 Y',0,100,1],
 ['tail.x','关节末端 X',0,100,1],['tail.y','关节末端 Y',0,100,1],
 ['amplitude','关节摆动角度',-40,40,.5],
 ['frequency','独立摆动速度',.1,4,.05],
 ['phase','动作相位',-3.14,3.14,.05],
 ['radius','蒙皮影响半径',6,80,1]
];
const boneSliders=$('rig-bone-sliders');
for(const [field,label,min,max,step] of boneFields){
 const row=document.createElement('label');row.className='rig-field';
 const span=document.createElement('span');span.textContent=label;
 const out=document.createElement('output');out.id='rig-bone-out-'+field.replace('.','-');
 const input=document.createElement('input');input.type='range';input.dataset.bone=field;
 input.min=min;input.max=max;input.step=step;
 row.append(span,out,input);boneSliders.append(row);
}
const advanced=document.createElement('details');
advanced.id='rig-advanced';
advanced.innerHTML='<summary>高级绑定 · 轴点、网格与关节</summary>';
const guideLabel=document.createElement('label');
guideLabel.className='rig-guide-toggle';
guideLabel.innerHTML='<input type="checkbox" id="rig-guides"> 显示关节与网格（仅用于绑骨）';
advanced.append(guideLabel,sliders,panel.querySelector('.rig-joints'));
panel.querySelector('.rig-buttons').before(advanced);
$('rig-guides').addEventListener('change',event=>{
 state.showGuides=!!event.target.checked;
 ed.render();
});
// The simple live sliders edit the exact shared rig played by the game.
const quickGroups={
 fringe:['front_hair','hair'],
 rear:['rear_hair','back_hair','hair_over_jacket'],
 skirt:['skirt','bottomwear','cloth'],
 'coat-left':['coat_left'],
 'coat-right':['coat_right'],
 'hand-left':['handwear_r'],
 'hand-right':['handwear_l'],
 hands:['sleeves_and_hands','battle_handwear_l','battle_handwear_r','handwear_l','handwear_r','handwear','sleeve_left','sleeve_right','wave_hand','free_hand','hand_raised','hand_lowered'],
 shoulders:['sleeves_and_hands','battle_handwear_l','battle_handwear_r','handwear_l','handwear_r','handwear','sleeve_left','sleeve_right','wave_hand','free_hand','hand_raised','hand_lowered','jacket','topwear'],
 hips:['skirt','bottomwear','legs','legwear']
};
const available=id=>(quickGroups[id]||[]).filter(key=>!!state.model?.parts[key]);
function quickInfo(message){$('rig-quick-status').textContent=message;}
function syncIdle(){
 const idle=state.model?.idleProfile;if(!idle)return;
 for(const input of quickPanel.querySelectorAll('[data-quick]')){
  const id=input.dataset.quick,row=input.closest('.rig-quick-row');
  if(id==='breath'){
   row.hidden=!state.model?.bodyHierarchy;
   if(row.hidden)continue;
   input.value=String(Math.round(idle.breath.amount*100/5)*5);
  }else if(id==='speed'){
   input.value=String(Math.round((idle.hair.speed+idle.cloth.speed)*50/5)*5);
   row.hidden=false;
  }else if(Object.hasOwn(idle.joints||{},id)){
   row.hidden=!available(id).length;
   if(row.hidden)continue;
   input.value=String(Math.round(idle.joints[id]*100/5)*5);
  }else{
   const ids=available(id);row.hidden=!ids.length;
   if(!ids.length)continue;
   const label=row.querySelector('span');
   if(id==='fringe')label.textContent=ids.includes('hair')&&!ids.includes('front_hair')?'头发摆幅':'刘海摆幅';
   if(id==='skirt')label.textContent=ids.includes('cloth')&&!ids.includes('skirt')?'衣摆摆幅':'裙摆摆幅';
   const mean=ids.reduce((sum,key)=>sum+(idle.parts[key]??1),0)/ids.length;
   input.value=String(Math.round(mean*100/5)*5);
  }
  row.querySelector('output').textContent=input.value+'%';
 }
 const amount=$('rig-part-amount');
 const mult=idle.parts?.[state.selected]??1;
 amount.value=String(Math.round(mult*100));
 $('rig-part-amount-value').textContent=Math.round(mult*100)+'%';
}
quickPanel.addEventListener('input',event=>{
 const input=event.target.closest('[data-quick]');
 if(!input||!state.model)return;
 const id=input.dataset.quick,value=Number(input.value);
 const idle=state.model.idleProfile;
 if(id==='breath'){
  idle.breath.amount=value/100;
 }else if(id==='speed'){
  for(const group of ['hair','cloth','sleeves'])idle[group].speed=value/100;
  idle.breath.speed=value/100;
 }else if(Object.hasOwn(idle.joints||{},id)){
  idle.joints[id]=value/100;
 }else{
  for(const key of available(id))idle.parts[key]=value/100;
 }
 state.model.idleProfile=core.sanitizeIdleProfile(idle);
 syncIdle();
 changed(false);
});
$('rig-part-amount').addEventListener('input',event=>{
 if(!state.model||!state.selected)return;
 state.model.idleProfile.parts[state.selected]=Number(event.target.value)/100;
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 syncIdle();changed();
});
$('rig-quick-save').onclick=async()=>{
 const button=$('rig-quick-save');
 if(button.disabled||!state.active)return;
 button.disabled=true;button.textContent='正在保存…';
 try{
  await studio.saveToGame();
  quickInfo('✓ 已保存，本机游戏直接读取这些参数。');
 }catch(error){
  quickInfo('保存失败：'+error.message);
 }finally{
  button.disabled=false;button.textContent='✓ 保存到游戏';
 }
};
const parts=()=>S.layers[S.side].filter(p=>p.sourcePart&&p.canvas);
const key=p=>String(p.partId||p.name);
const current=()=>state.model?.parts[state.selected];
const currentBone=()=>current()?.bones?.find(b=>b.id===state.bone);
const fitClamp=(v,low,high,defaultValue)=>Number.isFinite(v)?Math.max(low,Math.min(high,v)):defaultValue;
function fitBounds(part){return core.placedBounds(part)}
function fitValues(){
 const p=current(),t=p?.placement||{};
 const values={scaleX:Math.round((t.scaleX??1)*1000)/10,
  scaleY:Math.round((t.scaleY??1)*1000)/10,
  offsetX:Math.round((t.offsetX??0)*100)/100,
  offsetY:Math.round((t.offsetY??0)*100)/100};
 for(const [id,key] of [['rig-fit-width','scaleX'],['rig-fit-height','scaleY'],
  ['rig-fit-x','offsetX'],['rig-fit-y','offsetY']]){
  const input=$(id);input.disabled=!p;input.value=String(values[key]);
 }
 $('rig-fit-reset').disabled=!p;
 $('rig-fit-handles').disabled=!p;
}
fitPanel.addEventListener('change',event=>{
 const k=event.target?.dataset?.fit,p=current();if(!k||!p)return;
 const ratio=k.startsWith('scale')?100:1;
 const currentValue=p.placement[k],v=Number(event.target.value)/ratio;
 p.placement[k]=fitClamp(v,k.startsWith('scale')?.25:-1024,
  k.startsWith('scale')?4:1024,currentValue);
 if(k.startsWith('scale')&&$('rig-fit-lock').checked){
  const other=k==='scaleX'?'scaleY':'scaleX';
  const multiplier=p.placement[k]/Math.max(.001,currentValue);
  p.placement[other]=fitClamp(p.placement[other]*multiplier,.25,4,p.placement[other]);
 }
 fitValues();changed();
});
$('rig-fit-reset').onclick=()=>{
 const p=current();if(!p)return;
 // Reset restores each character's approved base fit, not a previously
 // rejected raw shorts placement. All other parts reset to native 100%.
 p.placement=studio.current==='female-06'&&p.id==='pants_overlay'?
  {scaleX:.92,scaleY:.80,offsetX:-7,offsetY:-12}:
  {scaleX:1,scaleY:1,offsetX:0,offsetY:0};
 fitValues();changed();
};
function setFitMode(value){
 state.fitMode=!!value&&state.active&&!!current();
 state.fitDrag=null;
 if(state.fitMode){
  setMaskMode(false);
  document.querySelector('#tools [data-tool="select"]')?.click();
  setPlaying(false);
 }
 $('rig-fit-handles').setAttribute('aria-pressed',String(state.fitMode));
 $('rig-fit-handles').textContent=state.fitMode?'🔓 拖动已开启':'🔒 锁定部件';
 $('rig-fit-help').textContent=state.fitMode?
  '点击部件直接选中，拖动移动，拉四角改大小；支持手机触摸，数字输入只是可选的高级微调。':
  '当前部件已锁定；点击「锁定部件」恢复直接拖动。';
 ed.render();
}
$('rig-fit-handles').onclick=()=>setFitMode(!state.fitMode);
window.addEventListener('paperchalk:studio-tool-changed',e=>{
 if(state.fitMode&&e.detail?.tool!=='select')setFitMode(false);
});
const info=s=>{$('rig-status').textContent=s;};
function values(){
 const p=current();if(!p)return;
 for(const input of sliders.querySelectorAll('input')){
  const [group,prop]=input.dataset.rig.split('.');
  const ratio=group==='pivot'||group==='tip'?100:1;
  const val=p[group][prop]*ratio;
  input.value=String(val);
  $('rig-out-'+group+'-'+prop).textContent=Number(val.toFixed(2))+(ratio===100?'%':'');
 }
}
function boneValues(){
 const b=currentBone();
 const section=panel.querySelector('.rig-joints');
 section.hidden=!b;
 if(!b)return;
 for(const input of boneSliders.querySelectorAll('input')){
  const field=input.dataset.bone;
  const segments=field.split('.');
  const val=segments.length===2?b[segments[0]][segments[1]]:b[field];
  const scale=field==='radius'||segments.length===2?100:1;
  input.value=String(val*scale);
  $('rig-bone-out-'+field.replace('.','-')).textContent=
   Number((val*scale).toFixed(2))+(scale===100?'%':'');
 }
}
function selectBone(id){
 const p=current();if(!p)return;
 state.bone=p.bones?.some(b=>b.id===id)?id:p.bones?.[0]?.id||'';
 $('rig-bone').value=state.bone;boneValues();ed.render();
}
function refreshBones(){
 const list=$('rig-bone');list.replaceChildren();
 const p=current();
 for(const b of p?.bones||[])list.add(new Option(b.id,b.id));
 selectBone(p?.bones?.some(b=>b.id===state.bone)?state.bone:p?.bones?.[0]?.id);
}
function adjustBoneJoint(b,key,axis,value){
 b[key][axis]=value;
 const p=current(),bones=p.bones||[];
 if(key==='head'&&b.parent){
  const parent=bones.find(x=>x.id===b.parent);
  if(parent)parent.tail[axis]=value;
 }
 if(key==='tail'){
  for(const child of bones)if(child.parent===b.id)child.head[axis]=value;
 }
}
function clearSelection(){
 state.selected='';state.bone='';state.drag=null;state.fitDrag=null;
 $('rig-part').value='';$('rig-bone').value='';
 fitValues();ed.render();
}
function select(id){
 if(!state.model?.parts[id])return;
 if(maskState.enabled)setMaskMode(false);
 state.fitDrag=null;
 state.selected=id;$('rig-part').value=id;
 const ix=S.layers[S.side].findIndex(x=>x.sourcePart&&key(x)===id);
 if(ix>=0){S.sel=ix;ed.renderList();}
 values();fitValues();refreshBones();syncIdle();updateMaskControls();ed.render();
}
let saveTimer=null,saveQueue=Promise.resolve(),revision=0;
async function save(){
 if(!state.model)return false;
 if(state.model.characterId!==studio.current||state.model.face!==S.side)
  throw Error('人物或方向已切换，拒绝覆盖错误工程');
 clearTimeout(saveTimer);saveTimer=null;
 syncLayerMetadata(false);
 const model=state.model,version=revision;
 const snapshot=JSON.parse(JSON.stringify(model));
 delete snapshot.actionState; // do not persist ephemeral animation timing
 // Queue immutable snapshots: a late autosave cannot overwrite the primary Save.
 const pending=saveQueue.then(()=>studio.storePartRig(snapshot));
 saveQueue=pending.catch(()=>{});
 try{
  await pending;
  if(state.model===model&&revision===version){
   state.dirty=false;
   // Slider and bone edits take effect in any open game tab once this
   // immutable snapshot is durably written, without reimporting the model.
   studio.notifyGame?.(model.characterId,model.face,'rig-saved');
  }
  info('✓ 已保存新版 L2D 骨骼参数，返回游戏后同步加载。');
  return true;
 }catch(error){
  state.dirty=true;
  info('保存失败，当前修改仍在编辑器：'+error.message);
  throw error;
 }
}
// Keep the editor's visible painter order, ArtMesh render order and saved
// game model identical. Auxiliary paint layers are not independent ArtMeshes.
function syncLayerMetadata(markDirty=true){
 if(!state.active||!state.model||state.model.face!==S.side)return;
 let different=false;
 for(const art of parts()){
  const p=state.model.parts[key(art)];if(!p)continue;
  const enabled=art.visible!==false,x=Number(art.x)||0,y=Number(art.y)||0;
  if(p.enabled!==enabled||p.x!==x||p.y!==y){
   p.enabled=enabled;p.x=x;p.y=y;different=true;
  }
 }
 if(different&&markDirty)changed(false);
}
window.addEventListener('paperchalk:studio-part-metadata-changed',()=>syncLayerMetadata(true));
function syncLayerOrder(){
 if(!state.active||!state.model||state.model.face!==S.side)return;
 const ids=parts().map(p=>key(p)),previous=state.model.layerOrder||[];
 if(ids.length!==Object.keys(state.model.parts).length||
    ids.some(id=>!state.model.parts[id])||new Set(ids).size!==ids.length){
  info('无法同步 Z 顺序：源部件与骨骼绑定不一致');return;
 }
 if(previous.length===ids.length&&ids.every((id,i)=>id===previous[i]))return;
 state.model.layerOrder=ids;
 changed(false);
}

/* Layer deletion must update real ArtMesh state, not merely the painter list.
 * Keep a reversible snapshot of removed joints; authored PSD PNGs are never
 * deleted from the published library. deletedParts is respected in-game. */
function reconcileSourceParts(removedId=''){
 if(!state.model||state.model.characterId!==studio.current||state.model.face!==S.side)return;
 if(maskState.enabled)setMaskMode(false);
 const old=state.model,source=parts(),ids=source.map(key),present=new Set(ids);
 const oldDeleted=new Set(Array.isArray(old.deletedParts)?old.deletedParts:[]);
 const backups={...(old.deletedPartBackups||{})};
 const maskBackups={...(old.deletedMaskBackups||{})};
 if(removedId){
  const before=old.parts?.[removedId];
  if(before)backups[removedId]=JSON.parse(JSON.stringify(before));
  const linked=(old.occlusionMasks||[]).filter(mask=>
   mask.source===removedId||
   (Array.isArray(mask.targets)?mask.targets:[mask.target]).includes(removedId));
  if(linked.length)maskBackups[removedId]=JSON.parse(JSON.stringify(linked));
  oldDeleted.add(removedId);
 }
 const candidates=[...(old.occlusionMasks||[])];
 for(const [removed,masks] of Object.entries(maskBackups)){
  if(!present.has(removed))continue;
  for(const mask of masks)if(!candidates.some(existing=>
   existing.source===mask.source&&existing.name===mask.name&&
   existing.direction===mask.direction&&existing.png===mask.png))
   candidates.push(mask);
 }
 // Never retain an orphan front/back relation against a removed layer.
 const validMasks=candidates.flatMap(mask=>{
  if(!present.has(mask.source))return [];
  const targets=[...new Set((Array.isArray(mask.targets)?mask.targets:[mask.target])
   .filter(id=>id!==mask.source&&present.has(id)))];
  return targets.length?[{...mask,target:targets[0],targets}]:[];
 });
 const previous={...old,parts:{...backups,...(old.parts||{})},
  occlusionMasks:validMasks};
 const next=core.project(source,studio.current,S.side,previous);
 next.deletedMaskBackups=maskBackups;
 // Undo/Redo restores the artwork stack, not a separate rig history.
 // Remember every removed source from its snapshot, so Redo re-applies the
 // deletion tombstone and the game cannot resurrect the missing PNG.
 next.deletedParts=[...new Set([...oldDeleted,...Object.keys(backups),
  ...Object.keys(old.parts||{})])].filter(id=>!present.has(id));
 next.deletedPartBackups=backups;
 next.layerOrder=ids;
 state.model=next;
 state.visualIdle=JSON.parse(JSON.stringify(next.idleProfile));
 state.selected=present.has(state.selected)?state.selected:(ids[0]||'');
 state.bone='';
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const item of source)selectNode.add(new Option(item.name,key(item)));
 if(state.selected)selectNode.value=state.selected;
 state.active=true;
 if(!source.length){quickPanel.hidden=true;setInspectorOpen();}
 else{quickPanel.hidden=false;setInspectorOpen();values();fitValues();refreshBones();syncIdle();updateMaskControls();}
 changed();ed.renderList();ed.render();
}
window.addEventListener('paperchalk:studio-part-removed',event=>{
 const detail=event.detail||{};
 if(detail.id!==studio.current||detail.face!==S.side||!detail.partId)return;
 reconcileSourceParts(String(detail.partId));
});
window.addEventListener('paperchalk:studio-source-stack-restored',event=>{
 if(event.detail?.side!==S.side)return;
 reconcileSourceParts();
});
window.addEventListener('paperchalk:studio-layer-order-changed',syncLayerOrder);
function changed(autosave=true){
 revision++;state.dirty=true;
 info('有尚未保存的骨骼调整');
 quickInfo('已实时预览，点击「保存到游戏」应用。');
 clearTimeout(saveTimer);
 if(autosave)saveTimer=setTimeout(()=>save().catch(()=>{}),1200);
 ed.render();
}
function syncOpenState(){
 const primary=$('idle-open');
 if(primary)primary.setAttribute('aria-expanded',String(state.panelOpen));
}
function setInspectorOpen(){
 // A single permanent workspace: the inspector is always docked when a real
 // mesh exists. Do not switch UI layouts or change canvas zoom on selection.
 state.panelOpen=!!state.active;
 panel.hidden=!state.panelOpen;
 document.body.classList.remove('rig-authoring');
 syncOpenState();
 ed.render();
}
async function deactivate(){
 if(maskState.enabled)setMaskMode(false);
 if(state.dirty)await save();
 state.active=false;state.model=null;state.panelOpen=false;state.drag=null;state.bone='';state.fitMode=false;state.fitDrag=null;
 quickPanel.hidden=true;
 setInspectorOpen(false);
}
async function activate(openPanel=false){
 if(!studio.current)return;
 const src=parts();
 if(!src.length){info('此人物没有独立源图层');return;}
 const id=studio.current,face=S.side,saved=await studio.readPartRig(id,face);
 if(studio.current!==id||S.side!==face)return;
 state.model=core.project(src,id,face,saved);
 syncCrouchUI();
 // Store absent source parts as actual deletions, even when reopening a draft.
 state.model.deletedParts=[...new Set((saved?.deletedParts||[])
  .filter(key=>typeof key==='string'&&!src.some(p=>(p.partId||p.name)===key)))];
 state.model.deletedPartBackups=saved?.deletedPartBackups||{};
 state.model.deletedMaskBackups=saved?.deletedMaskBackups||{};

 gripExplanation.hidden=!(id==='char-004'&&face==='front'&&state.model?.parts?.coat_left&&state.model?.parts?.coat_right);
 // Published rigs sometimes store their exact Z order independently of
 // original ZIP insertion order. Align the layer panel at load, not on
 // the first user click (which would otherwise visibly jump the actor).
 const expected=state.model.layerOrder;
 if(Array.isArray(expected)&&expected.length===src.length){
  const index=new Map(expected.map((name,i)=>[String(name),i]));
  const indices=S.layers[face].map((p,i)=>p.sourcePart?i:-1).filter(i=>i>=0);
  if(indices.every(i=>index.has(key(S.layers[face][i])))){
   const arranged=indices.map(i=>S.layers[face][i]).sort((a,b)=>index.get(key(a))-index.get(key(b)));
   indices.forEach((at,i)=>{S.layers[face][at]=arranged[i]});
   ed.renderList();
  }
 }
 if(!Array.isArray(state.model.layerOrder))state.model.layerOrder=parts().map(key);
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 const supported=core.actionNames(state.model);
 actionRow.hidden=supported.length<2;
 actionSelect.replaceChildren();
 for(const action of supported)actionSelect.add(new Option(action.label,action.id));
 if(supported.length){
  let preferred='';
  try{preferred=localStorage.getItem('paperchalk-action:'+id+':'+face)||'';}catch(e){}
  const initial=supported.some(x=>x.id===preferred)?preferred:
   (state.model.actionProfiles?.default||'combat');
  actionSelect.value=initial;
  state.model.actionState={to:initial}; // initial pose immediate, next switches blend
  queueMicrotask(()=>window.dispatchEvent(new CustomEvent('paperchalk:studio-action-changed',{detail:{characterId:id,face,action:initial}})));
 }
 state.visualIdle=JSON.parse(JSON.stringify(state.model.idleProfile));
 state.model.occlusionMasks=Array.isArray(state.model.occlusionMasks)?state.model.occlusionMasks:[];
 state.active=true;state.phase=0;state.playing=true;state.showGuides=false;state.fitMode=true;state.fitDrag=null;
 $('rig-fit-handles').setAttribute('aria-pressed','true');
 $('rig-fit-handles').textContent='🔓 拖动已开启';
 quickPanel.hidden=false;
 $('rig-guides').checked=false;
 setInspectorOpen();
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 const startingPart=id==='female-06'&&face==='front'&&state.model.parts.pants_overlay?
  'pants_overlay':(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 select(startingPart);
 $('rig-source').textContent=id==='char-002'?
  '女二原始 PSD：24个图层记录，17个实际可见、独立运动的部件。':
  '真实源图层 '+src.length+' 个，使用新版独立部件骨骼动画。';
 quickInfo(id==='char-002'?
  '原始PSD举起的左手和下垂的右手已独立拆出并分别绑定；调节「双手／手臂」实时查看左手动作。':
  '拖动滑块后点击保存，实时预览不会改变身体站姿。');
 info('新版独立部件骨骼已载入。');
 // The part tree owns the permanent base Z stack; masks are children of
 // their ArtMesh and must reappear immediately after model rehydration.
 ed.renderList();
 ed.render();
}
function toggleIdle(){
 if(state.active){setInspectorOpen();return;}
 const primary=$('idle-open');
 if(primary)primary.disabled=true;
 activate(true).catch(e=>{
  info('无法打开动画设置：'+e.message);
  const note=$('studio-status')||$('status');
  if(note)note.textContent='新版 L2D 加载失败：'+e.message;
 }).finally(()=>{if(primary)primary.disabled=false;syncOpenState();});
}
$('idle-open').onclick=toggleIdle;
syncOpenState();
$('rig-close').onclick=()=>setInspectorOpen();
$('rig-part').onchange=e=>select(e.target.value);
$('rig-save').onclick=()=>save().catch(()=>{});
$('rig-export').onclick=()=>{
 if(!state.model)return;
 const clone=JSON.parse(JSON.stringify(state.model));
 clone.exportedAt=new Date().toISOString();
 const data=new Blob([JSON.stringify(clone,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(data),a=document.createElement('a');
 a.href=url;a.download=state.model.characterId+'-'+state.model.face+'-part-rig.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
 info('已导出当前人物 '+Object.keys(clone.parts).length+' 个独立部件的绑定备份，不包含或修改原始图片');
};

$('rig-zero').onclick=()=>{const p=current();if(!p)return;
 p.motion.x=0;p.motion.y=0;p.motion.angle=0;p.motion.phase=0;
 for(const b of p.bones||[])b.amplitude=0;
 boneValues();
 values();changed();};
function setPlaying(value){
 state.playing=!!value;
 $('rig-pause').textContent=state.playing?'暂停':'播放';
 window.dispatchEvent(new CustomEvent('paperchalk:rig-play-changed',{detail:{paused:!state.playing}}));
}
$('rig-pause').onclick=()=>setPlaying(!state.playing);
sliders.addEventListener('input',e=>{
 const path=e.target.dataset.rig;if(!path)return;
 const p=current();if(!p)return;
 const [group,prop]=path.split('.');
 p[group][prop]=Number(e.target.value)/(group==='tip'||group==='pivot'?100:1);
 values();changed();
});
async function exportGameModule(newId){
 // A packaged module is a NEW explicit release. It cannot overwrite the
 // protected published heroines or anyone's locally edited V4/corrections.
 if(!state.active||!state.model)throw Error('请先进入逐件绑定并加载真实部件');
 const sourceId=studio.current;
 if(!/^[a-z][a-z0-9_-]{0,79}$/.test(String(newId||''))||
    newId==='protagonist'||newId==='char-002')
  throw Error('请设置新的小写角色 ID，例如 protagonist-rig-v1（禁止覆盖女主或女二）');
 if(!ed.zip||!ed.toBlob||!ed.make)throw Error('工作室未提供 ZIP 导出功能');
 const enc=new TextEncoder(),files=[],views={};
 const add=(path,data)=>files.push({path,data});
 let hasMotion=false;
 for(const face of ['front','back']){
  const layers=(S.layers[face]||[]).filter(p=>p.sourcePart&&p.canvas);
  if(!layers.length)continue;
  const seen=new Set(),origin=face===S.side?state.model:await studio.readPartRig(sourceId,face);
  const model=core.project(layers,sourceId,face,origin);
  model.characterId=newId;
  const textures={},portrait=ed.make(1024,1024);
  const g=portrait.getContext('2d',{alpha:true});
  for(const layer of layers){
   const id=String(layer.partId||layer.name);
   if(!/^[a-z][a-z0-9_-]{0,79}$/.test(id)||seen.has(id))
    throw Error('当前层 ID 不符合可安装 L2D 规范或重复：'+id);
   if(layer.role==='derived-source-region')
    throw Error('这个人物当前只是合成图分区，不是真实独立 PSD；不能冒充完整 L2D 模块。请先导入原始 PSD。');
   seen.add(id);
   const p=model.parts[id];
   if(!p)throw Error('缺少源部件的绑定：'+id);
   p.enabled=layer.visible!==false;
   // Individual bones can visibly animate even when whole-layer motion=0.
   const group=core.idleGroup(p),idle=model.idleProfile||{};
   const strength=(idle[group]?.amount||0)*(idle.parts?.[id]??1);
   const jointsActive=(p.bones||[]).some(b=>b.enabled!==false&&
    Math.abs(b.amplitude)>0.001&&core.jointGainFor(p,b,idle)>0);
   if(jointsActive||(strength>0.0001&&(
    Math.abs(p.motion?.x||0)+Math.abs(p.motion?.y||0)+Math.abs(p.motion?.angle||0)>0.001||
    (p.bones||[]).some(b=>b.enabled!==false&&Math.abs(b.amplitude)>0.001)
   )))hasMotion=true;
   const file='parts/'+face+'/'+id+'.png';
   textures[id]=file;
   const blob=await ed.toBlob(layer.canvas);
   add(newId+'/'+file,new Uint8Array(await blob.arrayBuffer()));
   if(layer.visible){g.globalAlpha=layer.opacity??1;
   g.drawImage(layer.canvas,layer.x,layer.y);}
  }
  g.globalAlpha=1;
  if(model.characterId!==newId||Object.keys(textures).length!==Object.keys(model.parts).length)
   throw Error('游戏模块模型与贴图数量不一致');
  add(newId+'/'+face+'.rig.json',enc.encode(JSON.stringify(model,null,2)));
  const preview=await ed.toBlob(portrait);
  add(newId+'/'+face+'.png',new Uint8Array(await preview.arrayBuffer()));
  views[face]={portrait:face+'.png',rig:{
   type:'part-mesh',file:face+'.rig.json',textures}};
 }
 if(!views.front)throw Error('游戏角色至少需要真实正面分层；不能假造正面');
 if(!hasMotion)throw Error('当前全部有效动画已关闭，请启用骨骼或提高待机强度再发布');
 const old=studio.list.get(sourceId);
 const module={schema:1,id:newId,label:(old?.label||sourceId)+' · 独立 L2D',views};
 add(newId+'/module.json',enc.encode(JSON.stringify(module,null,2)));
 const file=ed.zip(files);
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=newId+'.zip';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
 info('✓ 已打包 '+Object.keys(views).join('/')+' 原始独立部件，可作为新版 L2D 游戏模块发布。');
 return {id:newId,views:Object.keys(views),files:files.length,blob:file};
}
$('rig-module-export').onclick=async()=>{
 const suggestion=studio.current==='protagonist'?'protagonist-rig-v1':
  studio.current==='char-002'?'char-002-personal-rig':studio.current+'-rig-v1';
 const id=prompt('新模块 ID（新建独立角色，不覆盖现有游戏人物）',suggestion);
 if(id===null)return;
 try{await exportGameModule(id.trim());}catch(error){info('无法打包：'+error.message);}
};
$('rig-bone').onchange=e=>selectBone(e.target.value);
boneSliders.addEventListener('input',e=>{
 const field=e.target.dataset.bone;if(!field)return;
 const b=currentBone();if(!b)return;
 const value=Number(e.target.value);
 if(field.includes('.')){
  const [joint,axis]=field.split('.');
  adjustBoneJoint(b,joint,axis,value/100);
 }else b[field]=field==='radius'?value/100:value;
 boneValues();changed();
});
function drawPreview(ctx){
 const motion=window.PaperchalkStageMotion?.state;
 if(!state.active||!state.model||S.only)return false; // Editing retains the actual frozen mesh.
 // Wireframe and yellow skeletal handles are strictly opt-in.
 const previewModel=state.visualIdle?
  {...state.model,idleProfile:state.visualIdle}:state.model;
 core.draw(ctx,parts(),previewModel,state.phase,state.showGuides?state.selected:'');
 // A full alpha-mask collision scan involves large RGBA buffers. Run it
 // only during mask authoring; never on every idle frame of the heroine.
 const trouble=$('rig-mask-conflict');
 if(trouble){
  if(maskState.enabled){
   const issue=core.occlusionDiagnostics?.(parts(),previewModel)
    .find(row=>row.source===state.selected&&row.conflicts>0);
   trouble.hidden=!issue;
   if(issue)trouble.textContent='⚠ '+issue.conflicts+
    ' 个像素的前后关系冲突；擦除重叠区域即可修复';
  }else trouble.hidden=true;
 }
 // Editor-only translucent cyan preview. Shows exactly which source pixels
 // become foreground, while the game sees only the natural original colors.
 if(maskState.enabled){
  const entry=getMask(),part=state.model.parts[state.selected];
  if(entry&&part){
   const source=maskCanvas(entry,part);
   if(!entry._pending){
    const tint=document.createElement('canvas');tint.width=source.width;tint.height=source.height;
    const g=tint.getContext('2d');
    g.drawImage(source,0,0);
    g.globalCompositeOperation='source-in';
    g.fillStyle=maskState.direction==='behind'?'#ff9e59':'#46d8ff';g.fillRect(0,0,tint.width,tint.height);
    const motion=core.actionPart(previewModel,part.id);
    const mounted=(part.id==='battle_axe'||part.id==='axe_held')&&
      previewModel.parts[part.parentId]?previewModel.parts[part.parentId]:part;
    const over=mounted===part?motion:core.actionPart(previewModel,part.parentId);
    ctx.save();
    if(over.x||over.y||over.angle){
     const ax=mounted.x+mounted.w*mounted.pivot.x,ay=mounted.y+mounted.h*mounted.pivot.y;
     ctx.translate(ax+over.x,ay+over.y);
     ctx.rotate(over.angle*Math.PI/180);
     ctx.translate(-ax,-ay);
    }
    core.drawPart(ctx,{canvas:tint,opacity:.48},part,state.phase,false,previewModel.idleProfile);
    ctx.restore();
   }
  }
 }
 if(state.fitMode&&current()){
  // Selection outline uses the exact REST-space layout transform.
  const b=fitBounds(current()),z=Math.max(.2,S.zoom),size=6/z;
  ctx.save();ctx.strokeStyle='#80e0f3';ctx.lineWidth=1.8/z;
  ctx.setLineDash([7/z,4/z]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);
  ctx.fillStyle='#eaffff';ctx.strokeStyle='#247b98';
  for(const x of [b.x,b.x+b.w])for(const y of [b.y,b.y+b.h]){
   ctx.fillRect(x-size,y-size,2*size,2*size);
   ctx.strokeRect(x-size,y-size,2*size,2*size);
  }
  const p=current(),at=core.placedRestPoint(p,{
   x:p.x+p.w*p.pivot.x,y:p.y+p.h*p.pivot.y});
  ctx.fillStyle='#ffdb82';ctx.beginPath();
  ctx.arc(at.x,at.y,4/z,0,2*Math.PI);ctx.fill();
  ctx.restore();
 }
 if(!state.showGuides)return true;
 const p=current();if(p){
  const P=core.placedRestPoint(p,{x:p.x+p.w*p.pivot.x,y:p.y+p.h*p.pivot.y});
  const T=core.placedRestPoint(p,{x:p.x+p.w*p.tip.x,y:p.y+p.h*p.tip.y});
  ctx.save();ctx.strokeStyle='#dbe7ff';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(T.x,T.y);ctx.stroke();
  for(const [point,color] of [[P,'#5defa0'],[T,'#ffdf81']]){
   ctx.fillStyle=color;ctx.beginPath();ctx.arc(point.x,point.y,7,0,Math.PI*2);ctx.fill();
  }ctx.restore();
  const joint=currentBone();
  if(joint){
   const all=core.bonePoses(p,state.phase,state.model.idleProfile);
   const bone=all.find(b=>b.id===joint.id);
   if(bone){
    ctx.save();ctx.strokeStyle='#faf1a6';ctx.lineWidth=2.5;
    const head=core.placedRestPoint(p,{x:p.x+bone.headPos.x,y:p.y+bone.headPos.y});
    const tail=core.placedRestPoint(p,{x:p.x+bone.tailPos.x,y:p.y+bone.tailPos.y});
    ctx.beginPath();ctx.moveTo(head.x,head.y);
    ctx.lineTo(tail.x,tail.y);ctx.stroke();
    ctx.fillStyle='#fbcb70';ctx.beginPath();
    ctx.arc(head.x,head.y,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6ff2ff';ctx.beginPath();
    ctx.arc(tail.x,tail.y,6,0,Math.PI*2);ctx.fill();
    ctx.restore();
   }
  }
 }
 return true;
}
// Invert the very same deformed triangles used by the on-screen ArtMesh.
// Painting in the current pose must target ORIGINAL per-part PNG pixels;
// no separate static snapshot is shown and no detached overlay is created.
function mapToSource(point,layer){
 if(!state.active||!state.model||!layer?.sourcePart)return null;
 const id=key(layer),part=state.model.parts[id];
 if(!part||part.enabled===false||!part.mesh)return null;
 const idle=state.visualIdle||state.model.idleProfile,phase=state.phase;
 const pose=core.actionPart(state.model,id);
 if(pose.opacity<=0.001)return null;
 let px=point.x,py=point.y;
 const mount=(id==='battle_axe'||id==='axe_held')&&
  state.model.parts[part.parentId]?state.model.parts[part.parentId]:part;
 const motion=mount===part?pose:core.actionPart(state.model,part.parentId);
 if(motion.x||motion.y||motion.angle){
  const cx=mount.x+mount.w*mount.pivot.x,cy=mount.y+mount.h*mount.pivot.y;
  const angle=-motion.angle*Math.PI/180,dx=px-cx-motion.x,dy=py-cy-motion.y;
  px=cx+dx*Math.cos(angle)-dy*Math.sin(angle);
  py=cy+dx*Math.sin(angle)+dy*Math.cos(angle);
 }
 const cols=Math.max(1,part.mesh.columns||5),rows=Math.max(1,part.mesh.rows||6);
 const bones=core.bonePoses(part,phase,idle);
 // Use the same finer tessellation as the renderer for larger hair/skirt moves.
 const weather=idle?.weather||idle?.preset;
 const amount=(idle?.[core.idleGroup(part)]?.amount||0)*
  Math.max(0,Math.min(20,Number(idle?.parts?.[id]??1)));
 const windy=weather==='windy'||((part.kind==='hair'||part.kind==='skirt')&&amount>1.2);
 const nx=windy&&part.kind==='hair'?Math.max(cols,12):
  windy&&part.kind==='skirt'?Math.max(cols,10):cols;
 const ny=windy&&part.kind==='hair'?Math.max(rows,15):
  windy&&part.kind==='skirt'?Math.max(rows,12):rows;
 const verts=[];
 for(let j=0;j<=ny;j++){
  const line=[];
  for(let i=0;i<=nx;i++)line.push(core.warpPoint(part,i/nx,j/ny,phase,bones,idle));
  verts.push(line);
 }
 function triangle(a,b,c,ta,tb,tc){
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<1e-6)return null;
  const wa=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/den;
  const wb=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/den;
  const wc=1-wa-wb;
  if(Math.min(wa,wb,wc)<-0.0005)return null;
  return {x:part.x+part.w*(ta.x*wa+tb.x*wb+tc.x*wc),
          y:part.y+part.h*(ta.y*wa+tb.y*wb+tc.y*wc)};
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const u=i/nx,v=j/ny,U=(i+1)/nx,V=(j+1)/ny;
  const a=verts[j][i],b=verts[j][i+1],c=verts[j+1][i],d=verts[j+1][i+1];
  const hit=triangle(a,b,c,{x:u,y:v},{x:U,y:v},{x:u,y:V})||
   triangle(b,d,c,{x:U,y:v},{x:U,y:V},{x:u,y:V});
  if(hit)return hit;
 }
 return null;
}
function loc(e){
 const b=stage.getBoundingClientRect();
 return {x:(e.clientX-b.left-S.px)/S.zoom,y:(e.clientY-b.top-S.py)/S.zoom};
}
// Editing is deliberate: only mask tool captures strokes; safe Select does not.
function maskWorld(e){return loc(e)}
function maskPoint(e){
 const layer=parts().find(p=>key(p)===state.selected);
 if(!layer)return null;
 return window.PaperchalkPartRigStudio?.mapToSource?.(maskWorld(e),layer);
}
function maskCancelStroke(rollback){
 const d=maskState.pointer;
 if(!d)return;
 if(rollback&&d.entry?._canvas&&d.snapshot){
  d.entry._canvas.getContext('2d').putImageData(d.snapshot,0,0);
  d.entry._revision=(d.entry._revision||0)+1;
  maskState.history.pop();ed.render();
 }
 maskState.pointer=null;
}
stage.addEventListener('pointerdown',e=>{
 if(!maskState.enabled||S.tool!=='mask'||e.target!==$('view'))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.pointerType==='touch'){
  maskState.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  stage.setPointerCapture(e.pointerId);
  if(maskState.touches.size>1){
   maskCancelStroke(true);
   maskState.blockedTouches=new Set(maskState.touches.keys());
   if(maskState.touches.size===2){
    const [a,b]=[...maskState.touches.values()];
    maskState.pinch={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,
     midpoint:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},
     zoom:S.zoom,px:S.px,py:S.py};
   }
   return;
  }
 }
 if(maskState.pointer!==null||!state.model?.parts[state.selected])return;
 const point=maskPoint(e),entry=point&&ensureMask();
 if(!point||!entry)return;
 const source=state.model.parts[state.selected],canvas=maskCanvas(entry,source);
 if(entry._pending){
  maskLabel.textContent='正在读取旧蒙版，稍后才能涂抹';
  return;
 }
 const snapshot=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
 maskState.history.push(snapshot);maskState.redo=[];if(maskState.history.length>24)maskState.history.shift();
 maskState.pointer={id:e.pointerId,entry,point,start:point,snapshot,moved:false,
  isTouch:e.pointerType==='touch'};
 if(!stage.hasPointerCapture(e.pointerId))stage.setPointerCapture(e.pointerId);
 if(e.pointerType!=='touch')paintMaskLine(point,point);
},true);
stage.addEventListener('pointermove',e=>{
 if(!maskState.enabled||S.tool!=='mask')return;
 if(maskState.touches.has(e.pointerId)){
  maskState.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(maskState.pinch&&maskState.touches.size>=2){
   e.preventDefault();e.stopImmediatePropagation();
   const [a,b]=[...maskState.touches.values()],base=maskState.pinch;
   const distance=Math.hypot(a.x-b.x,a.y-b.y)||1;
   const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const rect=stage.getBoundingClientRect();
   const sx=base.midpoint.x-rect.x,sy=base.midpoint.y-rect.y;
   S.zoom=Math.max(.15,Math.min(20,base.zoom*distance/base.distance));
   S.px=middle.x-rect.x-(sx-base.px)*S.zoom/base.zoom;
   S.py=middle.y-rect.y-(sy-base.py)*S.zoom/base.zoom;
   ed.render();return;
  }
 }
 if(maskState.blockedTouches.has(e.pointerId))return;
 const d=maskState.pointer;
 if(!d||d.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const point=maskPoint(e);if(!point)return;
 if(!d.moved&&Math.hypot(point.x-d.start.x,point.y-d.start.y)<3)return;
 d.moved=true;paintMaskLine(d.point,point);d.point=point;
},true);
for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,e=>{
 if(!maskState.enabled||S.tool!=='mask')return;
 const touched=maskState.touches.has(e.pointerId);
 if(touched){maskState.touches.delete(e.pointerId);maskState.blockedTouches.delete(e.pointerId)}
 if(maskState.pinch){
  if(touched){e.preventDefault();e.stopImmediatePropagation()}
  if(maskState.touches.size<2)maskState.pinch=null;
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  return;
 }
 const d=maskState.pointer;
 if(!d||d.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(type==='pointercancel')maskCancelStroke(true);
 else{
  if(!d.moved&&d.isTouch)paintMaskLine(d.point,d.point);
  serializeMask(d.entry);maskState.pointer=null;
  ed.renderList();drawRelationList();maskLabel.textContent=maskHint();ed.render();
 }
 if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
},true);
window.addEventListener('paperchalk:studio-tool-changed',event=>{
 if(maskState.enabled&&event.detail?.tool!=='mask')setMaskMode(false);
});
// SELECT is itself the immediate transform tool. There is no modal
// step or numeric input prerequisite: click painted pixels to select,
// drag painted pixels to move, drag corners to size. A transparent wing
// rectangle must NEVER intercept a different visible body/garment part.
function hitPaintedPixel(layer,point){
 if(!layer?.sourcePart||layer.visible===false||layer.opacity<=0)return false;
 const rig=state.model?.parts[key(layer)];
 if(!rig||rig.enabled===false)return false;
 const uv=mapToSource(point,layer);
 if(!uv)return false;
 const x=Math.floor(uv.x-layer.x),y=Math.floor(uv.y-layer.y);
 if(x<0||y<0||x>=layer.canvas.width||y>=layer.canvas.height)return false;
 try{
  return layer.canvas.getContext('2d',{willReadFrequently:true})
   .getImageData(x,y,1,1).data[3]>=18;
 }catch(_){return false;}
}
function paintedTopLayer(point){
 const ordered=parts();
 // Drawn Z order is preserved by the original source stack.
 return ordered.slice().reverse().find(layer=>hitPaintedPixel(layer,point))||null;
}
const fitTouches=new Map();
let fitPinch=null;
function fitPinchStart(){
 const v=[...fitTouches.values()];if(v.length!==2)return;
 const a=v[0],b=v[1];
 const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
 fitPinch={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,
  midpoint:{x:cx,y:cy},zoom:S.zoom,px:S.px,py:S.py};
 state.fitDrag=null;
}
stage.addEventListener('pointerdown',e=>{
 if(!state.fitMode||!state.active||S.tool!=='select'||e.target!==$('view')||
   (e.pointerType==='mouse'&&e.button!==0))return;
 const pos=loc(e),p=current();
 if(e.pointerType==='touch'){
  fitTouches.set(e.pointerId,pos);
  if(fitTouches.size>=2){
   e.stopImmediatePropagation();e.preventDefault();
   fitPinchStart();
   stage.setPointerCapture(e.pointerId);
   return;
  }
 }
 if(!p)return;
 const b=fitBounds(p),radius=16/Math.max(.2,S.zoom);
 let corner='';
 for(const [id,x,y] of [['tl',b.x,b.y],['tr',b.x+b.w,b.y],
  ['bl',b.x,b.y+b.h],['br',b.x+b.w,b.y+b.h]]){
  if(Math.hypot(pos.x-x,pos.y-y)<radius){corner=id;break;}
 }
 if(!corner){
  const top=paintedTopLayer(pos);
  if(top&&key(top)!==p.id){
   e.stopImmediatePropagation();e.preventDefault();
   select(key(top));if(e.pointerType==='touch')fitTouches.delete(e.pointerId);
   return;
  }
  if(!top)return; // Empty alpha area: let the existing canvas pan/select run.
 }
 e.stopImmediatePropagation();e.preventDefault();
 if(state.playing)setPlaying(false); // edits use a stable unanimated viewport
 state.fitDrag={pointerId:e.pointerId,corner,id:p.id,start:pos,bounds:b,
  old:{...p.placement},moved:false};
 stage.setPointerCapture(e.pointerId);
},true);
stage.addEventListener('pointermove',e=>{
 if(fitTouches.has(e.pointerId)){
  fitTouches.set(e.pointerId,loc(e));
  if(fitPinch&&fitTouches.size>=2){
   e.stopImmediatePropagation();e.preventDefault();
   const [a,b]=[...fitTouches.values()];
   const distance=Math.hypot(a.x-b.x,a.y-b.y)||1;
   const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2},base=fitPinch;
   S.zoom=Math.max(.1,Math.min(20,base.zoom*distance/base.distance));
   S.px=middle.x-(base.midpoint.x-base.px)*S.zoom/base.zoom;
   S.py=middle.y-(base.midpoint.y-base.py)*S.zoom/base.zoom;
   ed.render();return;
  }
 }
 const drag=state.fitDrag;
 if(!drag||drag.pointerId!==e.pointerId||!state.active)return;
 e.stopImmediatePropagation();e.preventDefault();
 const p=state.model?.parts[drag.id];if(!p)return;
 const pt=loc(e),dx=pt.x-drag.start.x,dy=pt.y-drag.start.y;
 if(Math.hypot(dx,dy)<.7&&!drag.moved)return;
 drag.moved=true;
 if(!drag.corner){
  p.placement.offsetX=fitClamp(drag.old.offsetX+dx,-1024,1024,drag.old.offsetX);
  p.placement.offsetY=fitClamp(drag.old.offsetY+dy,-1024,1024,drag.old.offsetY);
 }else{
  const right=drag.corner.includes('r'),bottom=drag.corner.includes('b');
  const anchorX=right?drag.bounds.x:drag.bounds.x+drag.bounds.w;
  const anchorY=bottom?drag.bounds.y:drag.bounds.y+drag.bounds.h;
  let sx=fitClamp((right?pt.x-anchorX:anchorX-pt.x)/p.w,.25,4,drag.old.scaleX);
  let sy=fitClamp((bottom?pt.y-anchorY:anchorY-pt.y)/p.h,.25,4,drag.old.scaleY);
  if($('rig-fit-lock').checked){
   const changeX=Math.abs(sx-drag.old.scaleX),changeY=Math.abs(sy-drag.old.scaleY);
   const factor=changeX>=changeY?sx/drag.old.scaleX:sy/drag.old.scaleY;
   sx=fitClamp(drag.old.scaleX*factor,.25,4,drag.old.scaleX);
   sy=fitClamp(drag.old.scaleY*factor,.25,4,drag.old.scaleY);
  }
  const px=p.x+p.w*p.pivot.x,py=p.y+p.h*p.pivot.y;
  p.placement.scaleX=sx;p.placement.scaleY=sy;
  p.placement.offsetX=fitClamp(
   (right?anchorX+p.w*p.pivot.x*sx:anchorX-p.w*(1-p.pivot.x)*sx)-px,
   -1024,1024,drag.old.offsetX);
  p.placement.offsetY=fitClamp(
   (bottom?anchorY+p.h*p.pivot.y*sy:anchorY-p.h*(1-p.pivot.y)*sy)-py,
   -1024,1024,drag.old.offsetY);
 }
 fitValues();changed(false);
},true);
for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,e=>{
 const wasTouch=fitTouches.delete(e.pointerId);
 if(wasTouch&&fitPinch){
  e.stopImmediatePropagation();e.preventDefault();
  if(fitTouches.size<2)fitPinch=null;
  state.fitDrag=null;
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
  return;
 }
 const drag=state.fitDrag;
 if(!drag||drag.pointerId!==e.pointerId)return;
 e.stopImmediatePropagation();e.preventDefault();state.fitDrag=null;
 if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
 if(drag.moved&&event==='pointerup')changed();
},true);
// Cursor previews make every handle discoverable without opening settings.
stage.addEventListener('pointermove',e=>{
 if(!state.fitMode||!state.active||state.fitDrag||S.tool!=='select'||e.target!==$('view'))return;
 const p=current(),pos=loc(e);
 let cursor='crosshair';
 if(p){
  const b=fitBounds(p),r=14/Math.max(.2,S.zoom);
  if(Math.hypot(pos.x-b.x,pos.y-b.y)<r||
     Math.hypot(pos.x-(b.x+b.w),pos.y-(b.y+b.h))<r)cursor='nwse-resize';
  else if(Math.hypot(pos.x-(b.x+b.w),pos.y-b.y)<r||
          Math.hypot(pos.x-b.x,pos.y-(b.y+b.h))<r)cursor='nesw-resize';
  else if(hitPaintedPixel(parts().find(x=>key(x)===p.id),pos))cursor='grab';
 }
 $('view').style.cursor=cursor;
},true);
window.addEventListener('keydown',e=>{
 if(!state.fitMode||!state.active||e.altKey||e.ctrlKey||e.metaKey||
  e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||
  !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
 const p=current();if(!p)return;
 const d=e.shiftKey?10:1;
 if(e.key==='ArrowLeft')p.placement.offsetX-=d;
 else if(e.key==='ArrowRight')p.placement.offsetX+=d;
 else if(e.key==='ArrowUp')p.placement.offsetY-=d;
 else p.placement.offsetY+=d;
 p.placement.offsetX=fitClamp(p.placement.offsetX,-1024,1024,0);
 p.placement.offsetY=fitClamp(p.placement.offsetY,-1024,1024,0);
 e.preventDefault();fitValues();changed();
},true);
stage.addEventListener('pointerdown',e=>{
 if(!state.active||!state.panelOpen||!state.showGuides||['select','mask'].includes(S.tool)||e.target!==$('view'))return;
 e.stopImmediatePropagation();e.preventDefault();
 const p=current();if(!p)return;
 const o=loc(e),a=core.placedRestPoint(p,{
  x:p.x+p.pivot.x*p.w,y:p.y+p.pivot.y*p.h});
 const b=core.placedRestPoint(p,{
  x:p.x+p.tip.x*p.w,y:p.y+p.tip.y*p.h});
 const radius=20/Math.max(.1,S.zoom);
 const bone=currentBone();
 if(bone){
  const poses=core.bonePoses(p,state.phase,state.model.idleProfile);
  const active=poses.find(x=>x.id===bone.id);
  if(active){
   const head=core.placedRestPoint(p,{x:p.x+active.headPos.x,y:p.y+active.headPos.y}),
    tail=core.placedRestPoint(p,{x:p.x+active.tailPos.x,y:p.y+active.tailPos.y});
   if(Math.hypot(o.x-head.x,o.y-head.y)<radius)state.drag='bone-head';
   else if(Math.hypot(o.x-tail.x,o.y-tail.y)<radius)state.drag='bone-tail';
  }
 }
 if(!state.drag&&Math.hypot(o.x-a.x,o.y-a.y)<radius)state.drag='pivot';
 else if(!state.drag&&Math.hypot(o.x-b.x,o.y-b.y)<radius)state.drag='tip';
 else if(!state.drag){for(const layer of parts().slice().reverse()){
  const q=state.model.parts[key(layer)];
  if(o.x>=q.x&&o.x<=q.x+q.w&&o.y>=q.y&&o.y<=q.y+q.h){select(q.id);break;}
 }}
 if(state.drag){state.playing=false;$('rig-pause').textContent='播放';stage.setPointerCapture(e.pointerId);}
},true);
stage.addEventListener('pointermove',e=>{
 if(!state.active||!state.drag)return;
 e.stopImmediatePropagation();e.preventDefault();
 const p=current(),pos=loc(e);if(!p)return;
 const original=core.unplacedRestPoint(p,pos);
 const x=Math.max(0,Math.min(1,(original.x-p.x)/p.w));
 const y=Math.max(0,Math.min(1,(original.y-p.y)/p.h));
 if(state.drag.startsWith('bone-')){
  const b=currentBone();if(!b)return;
  // Pointer edits the rest-space joints; the animation is frozen while
  // adjusting joint positions so pointer coordinates remain predictable.
  adjustBoneJoint(b,state.drag.slice(5),'x',x);
  adjustBoneJoint(b,state.drag.slice(5),'y',y);
  boneValues();
 }else{
  p[state.drag].x=x;p[state.drag].y=y;values();
 }
 changed();
},true);
for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,e=>{
 if(!state.drag)return;
 e.stopImmediatePropagation();state.drag=null;
 if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
},true);
// The independent mesh editor owns the ONLY live animation redraw loop.
// Cap refresh rate to the actual browser budget; do not flood the main thread
// with overlapping mesh renders on devices with slow Canvas2D triangle clips.
let last=0,lastDraw=0,renderCost=0;
function tick(now){
 if(state.active&&S.ready&&!document.hidden&&window.PaperchalkStageMotion?.state?.enabled!==false){
  if(!last)last=now;
  const dt=Math.min(.07,Math.max(0,(now-last)/1000));
  if(state.playing)state.phase+=dt*2*Math.PI/3.6;
  state.visualIdle=core.approachIdle(state.visualIdle,state.model.idleProfile,dt);
  last=now;
  const mobile=window.innerWidth<=710;
  const baseBudget=mobile?50:33;
  const budget=Math.max(baseBudget,
   renderCost>47?75:renderCost>29?50:baseBudget);
  if(now-lastDraw>=budget){
   const start=performance.now();
   lastDraw=now;
   ed.render();
   const sample=performance.now()-start;
   renderCost=renderCost?renderCost*.8+sample*.2:sample;
   state.previewRenderMs=Math.round(renderCost*10)/10;
   state.previewFrameBudgetMs=budget;
  }
 }else last=0;
 requestAnimationFrame(tick);
}
window.addEventListener('paperchalk:studio-character-loaded',()=>{
 crouchPanel.hidden=true;
 // changeCore flushes the previous rig before emitting this event.
 state.active=false;state.model=null;state.panelOpen=false;state.selected='';
 state.drag=null;state.fitDrag=null;state.fitMode=false;state.dirty=false;quickPanel.hidden=true;actionRow.hidden=true;
 setInspectorOpen(false);
});
// These scripts load in order, but the catalog and PNG fetches are async.
// A fast cached page can finish character loading BEFORE the rig editor
// registers its event listener.  Catch up on boot as well as future changes.
let autoActivation=null;
function ensureReadyRig(){
 if(state.active||!studio.current||!parts().length||autoActivation)return;
 autoActivation=activate(true).catch(e=>{
  info('独立 L2D 初始化失败：'+e.message);
  const notice=$('studio-status');
  if(notice)notice.textContent='L2D 骨骼自动加载失败：'+e.message;
 }).finally(()=>{autoActivation=null});
}
window.addEventListener('paperchalk:studio-ready-to-edit',ensureReadyRig);
queueMicrotask(ensureReadyRig);
function getMaskRelations(source){
 return (state.model?.occlusionMasks||[]).map((entry,index)=>({
  index,source:entry.source,direction:entry.direction==='behind'?'behind':'front',
  name:entry.name||'局部遮罩',targets:maskTargets(entry)
 })).filter(e=>e.source===source);
}
function selectMaskRelation(source,index){
 const entry=state.model?.occlusionMasks?.[index];
 if(!entry||entry.source!==source)return false;
 if(state.selected!==source)select(source);
 setMaskMode(false);
 const first=maskTargets(entry).find(t=>[...maskTarget.options].some(o=>o.value===t));
 if(first)maskTarget.value=first;
 maskState.direction=entry.direction==='behind'?'behind':'front';
 maskState.targets=new Set(maskTargets(entry));
 maskState.editingEntry=entry;
 maskState.history=[];maskState.redo=[];
 syncDirection();drawTargetList();drawRelationList();
 maskLabel.textContent=maskHint();
 $('rig-mask-relations').open=true;
 ed.render();return true;
}
window.PaperchalkPartRigStudio={state,activate,deactivate,drawPreview,save,select,setPlaying,exportGameModule,syncLayerOrder,syncLayerMetadata,mapToSource,clearSelection,getMaskRelations,selectMaskRelation};
requestAnimationFrame(tick);
})();

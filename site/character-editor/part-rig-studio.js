/* Single editable L2D: quick movement sliders and an optional bone inspector. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,panelOpen:false,model:null,visualIdle:null,selected:'',bone:'',drag:null,phase:0,playing:true,dirty:false,showGuides:false};
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
// Any source component can be painted over any target. No extra model, layer
// or mode-switching workspace is created: this lives inside the rig inspector.
const maskPanel=document.createElement('section');
maskPanel.id='rig-mask-panel';
maskPanel.innerHTML=`<div class="rig-mask-head"><strong>部件遮挡蒙版</strong>
 <button type="button" id="rig-mask-toggle">画蒙版</button></div>
 <label>前景部件 <output id="rig-mask-source"></output></label>
 <label>遮挡对象 <select id="rig-mask-target" aria-label="蒙版覆盖哪个部件"></select></label>
 <div class="rig-mask-row">
  <button id="rig-mask-paint" type="button" aria-pressed="true">＋ 画前景</button>
  <button id="rig-mask-erase" type="button" aria-pressed="false">－ 擦蒙版</button>
 </div>
 <label>画笔大小 <output id="rig-mask-size-value">12 px</output>
  <input id="rig-mask-size" type="range" min="2" max="96" step="2" value="12"></label>
 <div class="rig-mask-row"><button id="rig-mask-undo" type="button">↶ 撤销</button>
  <button id="rig-mask-clear" type="button">清空蒙版</button></div>
 <button id="rig-mask-behind" type="button" hidden>将当前部件放到遮挡对象后面</button>
 <small id="rig-mask-hint">选部件，再选要被它遮挡的对象；蒙版不修改原图。</small>`;
panel.querySelector('.rig-part-amount').before(maskPanel);
const maskState={enabled:false,erase:false,pointer:null,restorePlaying:null,
 history:[],pair:'',touches:new Map(),pinch:null};
const maskTarget=$('rig-mask-target');
const maskLabel=$('rig-mask-hint');
const maskSize=$('rig-mask-size');
function maskKey(){return state.selected+'|'+maskTarget.value;}
function getMask(){
 return state.model?.occlusionMasks?.find(m=>m.source===state.selected&&m.target===maskTarget.value);
}
function maskCanvas(mask,source){
 if(mask._canvas)return mask._canvas;
 const c=document.createElement('canvas');c.width=source.w;c.height=source.h;
 Object.defineProperty(mask,'_canvas',{value:c,writable:true,configurable:true,enumerable:false});
 if(mask.png?.startsWith('data:image/png;base64,')){
  mask._pending=true;
  const image=new Image();
  image.onload=()=>{
   if(mask._canvas===c&&image.width===c.width&&image.height===c.height){
    c.getContext('2d').drawImage(image,0,0);mask._revision=(mask._revision||0)+1;ed.render();
   }
   mask._pending=false;
  };
  image.onerror=()=>{mask._pending=false;maskLabel.textContent='旧蒙版图片加载失败，未覆盖保存内容'};
  image.src=mask.png;
 }
 return c;
}
function ensureMask(){
 const src=state.model?.parts[state.selected],target=maskTarget.value;
 if(!src||!target||target===state.selected||!state.model.parts[target])return null;
 let mask=getMask();
 if(!mask){
  mask={source:state.selected,target,png:'',enabled:true};
  (state.model.occlusionMasks ||= []).push(mask);
  const c=document.createElement('canvas');c.width=src.w;c.height=src.h;
  Object.defineProperty(mask,'_canvas',{value:c,configurable:true,writable:true,enumerable:false});
 }
 return mask;
}
function updateMaskControls(){
 const part=state.model?.parts[state.selected],before=maskTarget.value;
 maskTarget.replaceChildren();
 for(const p of parts()){
  const id=key(p);if(id!==state.selected)maskTarget.add(new Option(p.name,id));
 }
 const prefers=part&&(state.model.occlusionMasks||[]).find(m=>m.source===state.selected)?.target;
 const weapon=['battle_axe','axe_held'].find(id=>state.model.parts[id]&&id!==state.selected);
 const next=[before,prefers,weapon].find(id=>id&&[...maskTarget.options].some(o=>o.value===id));
 if(next)maskTarget.value=next;
 $('rig-mask-source').textContent=part?.name||'未选择';
 const existing=getMask();
 if(existing?.png&&part)maskCanvas(existing,part);
 maskLabel.textContent=existing?.png?'已保存蒙版 · 修改只影响当前遮挡对象':
  '画白色区域表示此部件出现在目标前面；擦除则恢复后景。';
 maskState.pair=maskKey();maskState.history=[];
 const order=state.model?.layerOrder||parts().map(p=>key(p));
 const behind=order.indexOf(state.selected)>=order.indexOf(maskTarget.value)&&
  order.includes(state.selected)&&order.includes(maskTarget.value);
 $('rig-mask-behind').hidden=!behind;
 if(behind)maskLabel.textContent='需要先把此部件放到对象后方，再画前景蒙版。';
 maskPanel.hidden=!state.active||!part;
}
$('rig-mask-behind').onclick=()=>{
 const layers=S.layers[S.side],from=layers.findIndex(p=>p.sourcePart&&key(p)===state.selected),
  target=layers.findIndex(p=>p.sourcePart&&key(p)===maskTarget.value);
 if(from<0||target<0||from<target)return;
 const [part]=layers.splice(from,1);
 const dest=layers.findIndex(p=>p.sourcePart&&key(p)===maskTarget.value);
 layers.splice(dest,0,part);S.sel=dest;
 window.dispatchEvent(new Event('paperchalk:studio-layer-order-changed'));
 ed.renderList();ed.autosave();updateMaskControls();ed.render();
};
function serializeMask(mask){
 if(!mask?._canvas)return;
 mask.png=mask._canvas.toDataURL('image/png');
 mask._revision=(mask._revision||0)+1;
 changed(false);
}
function setMaskMode(enable){
 if(enable&&!state.model?.parts[state.selected])return;
 if(enable===maskState.enabled)return;
 maskState.enabled=enable;
 if(enable){
  maskState.restorePlaying=state.playing;
  state.playing=false;ed.setTool('mask');
 }else{
  if(maskState.pointer)maskState.pointer=null;
  maskState.touches.clear();maskState.pinch=null;
  if(maskState.restorePlaying!==null)state.playing=maskState.restorePlaying;
  maskState.restorePlaying=null;
  if(S.tool==='mask')ed.setTool('select');
 }
 $('rig-mask-toggle').textContent=enable?'✓ 结束画蒙版':'画蒙版';
 $('rig-mask-toggle').setAttribute('aria-pressed',String(enable));
 maskPanel.classList.toggle('painting',enable);
 ed.render();
}
$('rig-mask-toggle').onclick=()=>setMaskMode(!maskState.enabled);
for(const [id,erase] of [['rig-mask-paint',false],['rig-mask-erase',true]]){
 $(id).onclick=()=>{
  maskState.erase=erase;
  $('rig-mask-paint').setAttribute('aria-pressed',String(!erase));
  $('rig-mask-erase').setAttribute('aria-pressed',String(erase));
  setMaskMode(true);
 };
}
maskTarget.onchange=()=>{maskState.history=[];updateMaskControls()};
maskSize.oninput=()=>{$('rig-mask-size-value').textContent=maskSize.value+' px'};
$('rig-mask-undo').onclick=()=>{
 const mask=getMask();
 if(mask?._pending){maskLabel.textContent='蒙版仍在加载，暂时不能撤销';return;}
 const snapshot=maskState.history.pop();
 if(!mask||!snapshot)return;
 maskCanvas(mask,state.model.parts[state.selected]).getContext('2d').putImageData(snapshot,0,0);
 serializeMask(mask);
};
$('rig-mask-clear').onclick=()=>{
 const mask=getMask();if(!mask||!confirm('清空当前部件对这个对象的前景蒙版？原始图片不会改变。'))return;
 const c=maskCanvas(mask,state.model.parts[state.selected]);
 if(mask._pending){maskLabel.textContent='蒙版仍在加载，暂时不能清空';return;}
 maskState.history.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
 c.getContext('2d').clearRect(0,0,c.width,c.height);serializeMask(mask);
};
function maskStroke(a,b){
 const mask=ensureMask(),source=state.model?.parts[state.selected];
 if(!mask||!source)return;
 const c=maskCanvas(mask,source),g=c.getContext('2d');
 g.save();g.globalCompositeOperation=maskState.erase?'destination-out':'source-over';
 g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=Number(maskSize.value);
 g.lineCap='round';g.lineJoin='round';
 g.beginPath();g.moveTo(a.x-source.x,a.y-source.y);g.lineTo(b.x-source.x,b.y-source.y);g.stroke();
 if(Math.hypot(a.x-b.x,a.y-b.y)<.01){
  g.beginPath();g.arc(a.x-source.x,a.y-source.y,g.lineWidth/2,0,2*Math.PI);g.fill();
 }
 g.restore();mask._revision=(mask._revision||0)+1;ed.render();
}
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
 state.selected='';state.bone='';state.drag=null;
 $('rig-part').value='';$('rig-bone').value='';
 ed.render();
}
function select(id){
 if(!state.model?.parts[id])return;
 if(maskState.enabled)setMaskMode(false);
 state.selected=id;$('rig-part').value=id;
 const ix=S.layers[S.side].findIndex(x=>x.sourcePart&&key(x)===id);
 if(ix>=0){S.sel=ix;ed.renderList();}
 values();refreshBones();syncIdle();updateMaskControls();ed.render();
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
 state.active=false;state.model=null;state.panelOpen=false;state.drag=null;state.bone='';
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
 }
 state.visualIdle=JSON.parse(JSON.stringify(state.model.idleProfile));
 state.model.occlusionMasks=Array.isArray(state.model.occlusionMasks)?state.model.occlusionMasks:[];
 state.active=true;state.phase=0;state.playing=true;state.showGuides=false;
 quickPanel.hidden=false;
 $('rig-guides').checked=false;
 setInspectorOpen();
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 select(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 $('rig-source').textContent=id==='char-002'?
  '女二原始 PSD：24个图层记录，17个实际可见、独立运动的部件。':
  '真实源图层 '+src.length+' 个，使用新版独立部件骨骼动画。';
 quickInfo(id==='char-002'?
  '原始PSD举起的左手和下垂的右手已独立拆出并分别绑定；调节「双手／手臂」实时查看左手动作。':
  '拖动滑块后点击保存，实时预览不会改变身体站姿。');
 info('新版独立部件骨骼已载入。');
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
    g.fillStyle='#46d8ff';g.fillRect(0,0,tint.width,tint.height);
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
 if(!state.showGuides)return true;
 const p=current();if(p){
  const P={x:p.x+p.w*p.pivot.x,y:p.y+p.h*p.pivot.y};
  const T={x:p.x+p.w*p.tip.x,y:p.y+p.h*p.tip.y};
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
    ctx.beginPath();ctx.moveTo(p.x+bone.headPos.x,p.y+bone.headPos.y);
    ctx.lineTo(p.x+bone.tailPos.x,p.y+bone.tailPos.y);ctx.stroke();
    ctx.fillStyle='#fbcb70';ctx.beginPath();
    ctx.arc(p.x+bone.headPos.x,p.y+bone.headPos.y,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6ff2ff';ctx.beginPath();
    ctx.arc(p.x+bone.tailPos.x,p.y+bone.tailPos.y,6,0,Math.PI*2);ctx.fill();
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
// Mask brush is captured before the base editor's pixel brush. Edits are in
// source texture coordinates via live ArtMesh inverse mapping; masks stay at
// the chosen source part even if the rendered character is animated.
stage.addEventListener('pointerdown',e=>{
 if(!maskState.enabled||S.tool!=='mask'||e.target!==$('view'))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.pointerType==='touch'){
  maskState.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  stage.setPointerCapture(e.pointerId);
  if(maskState.touches.size>=2){
   // Undo any tentative first-finger paint when it becomes a two-finger gesture.
   if(maskState.pointer){
    const prior=maskState.history.pop(),entry=maskState.pointer.entry;
    if(prior&&entry?._canvas){
     entry._canvas.getContext('2d').putImageData(prior,0,0);
     entry._revision=(entry._revision||0)+1;ed.render();
    }
    maskState.pointer=null;
   }
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
 const partLayer=parts().find(p=>key(p)===state.selected);
 if(!partLayer)return;
 const local=loc(e),source=ed.S;
 const world={x:local.x,y:local.y};
 const mapped=ed.S.only?world:window.PaperchalkPartRigStudio?.mapToSource?.(world,partLayer);
 if(!mapped)return;
 const entry=ensureMask();if(!entry)return;
 const c=maskCanvas(entry,state.model.parts[state.selected]);
 if(entry._pending){
  maskLabel.textContent='正在读取原有蒙版，加载完成后才能落笔，避免覆盖旧内容';return;
 }
 maskState.history.push(c.getContext('2d').getImageData(0,0,c.width,c.height));
 if(maskState.history.length>20)maskState.history.shift();
 maskState.pointer={id:e.pointerId,point:mapped,start:mapped,entry,hasMoved:false};
 stage.setPointerCapture(e.pointerId);
 // Touch painting begins only after movement or intentional release, not on
 // the first finger of an attempted two-finger zoom.
 if(e.pointerType==='mouse')maskStroke(mapped,mapped);
},true);
stage.addEventListener('pointermove',e=>{
 if(maskState.touches.has(e.pointerId)){
  maskState.touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(maskState.pinch&&maskState.touches.size>=2){
   e.preventDefault();e.stopImmediatePropagation();
   const [a,b]=[...maskState.touches.values()];
   const distance=Math.hypot(a.x-b.x,a.y-b.y)||1;
   const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const base=maskState.pinch,stageBox=stage.getBoundingClientRect();
   const sx=base.midpoint.x-stageBox.x,sy=base.midpoint.y-stageBox.y;
   S.zoom=Math.max(.1,Math.min(20,base.zoom*distance/base.distance));
   S.px=mid.x-stageBox.x-(sx-base.px)*S.zoom/base.zoom;
   S.py=mid.y-stageBox.y-(sy-base.py)*S.zoom/base.zoom;
   ed.render();return;
  }
 }
 if(maskState.touches.has(e.pointerId)){
  maskState.touches.delete(e.pointerId);
  if(maskState.pinch){
   e.preventDefault();e.stopImmediatePropagation();
   if(maskState.touches.size<2)maskState.pinch=null;
   if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
   return;
  }
 }
 const d=maskState.pointer;
 if(!d||d.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const layer=parts().find(p=>key(p)===state.selected);if(!layer)return;
 const q=window.PaperchalkPartRigStudio?.mapToSource?.(loc(e),layer);
 if(!q)return;
 if(!d.hasMoved&&Math.hypot(q.x-d.start.x,q.y-d.start.y)<2)return;
 d.hasMoved=true;maskStroke(d.point,q);d.point=q;
},true);
for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,e=>{
 const d=maskState.pointer;
 if(!d||d.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!d.hasMoved&&type==='pointerup'&&e.pointerType!=='mouse')maskStroke(d.point,d.point);
 if(type==='pointercancel'&&maskState.history.length){
  const before=maskState.history.pop(),c=maskCanvas(d.entry,state.model.parts[state.selected]);
  c.getContext('2d').putImageData(before,0,0);
 }
 serializeMask(d.entry);
 maskState.pointer=null;
 if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
},true);
window.addEventListener('paperchalk:studio-tool-changed',e=>{
 if(maskState.enabled&&e.detail?.tool!=='mask')setMaskMode(false);
});
stage.addEventListener('pointerdown',e=>{
 if(!state.active||!state.panelOpen||!state.showGuides||['select','mask'].includes(S.tool)||e.target!==$('view'))return;
 e.stopImmediatePropagation();e.preventDefault();
 const p=current();if(!p)return;
 const o=loc(e),a={x:p.x+p.pivot.x*p.w,y:p.y+p.pivot.y*p.h};
 const b={x:p.x+p.tip.x*p.w,y:p.y+p.tip.y*p.h};
 const radius=20/Math.max(.1,S.zoom);
 const bone=currentBone();
 if(bone){
  const poses=core.bonePoses(p,state.phase,state.model.idleProfile);
  const active=poses.find(x=>x.id===bone.id);
  if(active){
   const head={x:p.x+active.headPos.x,y:p.y+active.headPos.y},
    tail={x:p.x+active.tailPos.x,y:p.y+active.tailPos.y};
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
 const x=Math.max(0,Math.min(1,(pos.x-p.x)/p.w));
 const y=Math.max(0,Math.min(1,(pos.y-p.y)/p.h));
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
let last=0,lastDraw=0;
function tick(now){
 if(state.active&&S.ready&&!document.hidden&&window.PaperchalkStageMotion?.state?.enabled!==false){
  if(!last)last=now;
  const dt=Math.min(.07,Math.max(0,(now-last)/1000));
  if(state.playing)state.phase+=dt*2*Math.PI/3.6;
  state.visualIdle=core.approachIdle(state.visualIdle,state.model.idleProfile,dt);
  last=now;
  if(now-lastDraw>32){lastDraw=now;ed.render();}
 }else last=0;
 requestAnimationFrame(tick);
}
window.addEventListener('paperchalk:studio-character-loaded',()=>{
 // changeCore flushes the previous rig before emitting this event.
 state.active=false;state.model=null;state.panelOpen=false;state.selected='';
 state.drag=null;state.dirty=false;quickPanel.hidden=true;actionRow.hidden=true;
 setInspectorOpen(false);
});
window.addEventListener('paperchalk:studio-ready-to-edit',()=>{
 // New independent mesh is the default whenever genuine component art exists.
 if(parts().length)activate(true).catch(e=>info('独立 L2D 初始化失败：'+e.message));
});
window.PaperchalkPartRigStudio={state,activate,deactivate,drawPreview,save,select,setPlaying,exportGameModule,syncLayerOrder,syncLayerMetadata,mapToSource,clearSelection};
requestAnimationFrame(tick);
})();

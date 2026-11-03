/* Single editable L2D: quick movement sliders and an optional bone inspector. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,panelOpen:false,model:null,visualIdle:null,selected:'',bone:'',drag:null,phase:0,playing:true,dirty:false,showGuides:false};
const panel=document.createElement('section');panel.id='part-rig-panel';panel.hidden=true;
panel.innerHTML=`<header class="rig-h"><strong>逐件骨骼细调</strong><button id="rig-close" type="button">关闭高级设置</button></header>
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
const quickPanel=document.createElement('section');
quickPanel.id='rig-quick-panel';
quickPanel.hidden=true;
quickPanel.innerHTML="<div class=\"rig-quick-heading\"><strong>待机动态</strong><span>实时预览</span></div>\n<p class=\"rig-quick-tip\">胸部呼吸单独调节，肩、手臂、脖子和头部自动跟随；脚鞋固定。</p>\n<div id=\"rig-quick-sliders\">\n <label class=\"rig-quick-row\" data-quick-row=\"fringe\"><span>刘海摆幅</span><output>130%</output><input data-quick=\"fringe\" aria-label=\"刘海摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"130\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"rear\"><span>后发摆幅</span><output>140%</output><input data-quick=\"rear\" aria-label=\"后发摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"140\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"skirt\"><span>裙摆摆幅</span><output>150%</output><input data-quick=\"skirt\" aria-label=\"裙摆摆幅\" type=\"range\" min=\"0\" max=\"2000\" step=\"5\" value=\"150\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hands\"><span>双手／手臂</span><output>70%</output><input data-quick=\"hands\" aria-label=\"双手手臂摆动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"70\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"shoulders\"><span>肩部活动</span><output>30%</output><input data-quick=\"shoulders\" aria-label=\"肩部活动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"30\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"hips\"><span>胯部活动</span><output>20%</output><input data-quick=\"hips\" aria-label=\"胯部活动\" type=\"range\" min=\"0\" max=\"800\" step=\"5\" value=\"20\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"breath\"><span>胸部呼吸</span><output>60%</output><input data-quick=\"breath\" aria-label=\"胸部呼吸幅度\" type=\"range\" min=\"0\" max=\"300\" step=\"5\" value=\"60\"></label>\n <label class=\"rig-quick-row\" data-quick-row=\"speed\"><span>摆动速度</span><output>80%</output><input data-quick=\"speed\" aria-label=\"摆动速度\" type=\"range\" min=\"25\" max=\"250\" step=\"5\" value=\"80\"></label>\n</div>\n<button id=\"rig-quick-save\" type=\"button\">✓ 保存到游戏</button>\n<p id=\"rig-quick-status\" role=\"status\">拖动滑块后点击保存。</p>";
dock.prepend(quickPanel);
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
 hands:['sleeves_and_hands','handwear','sleeve_left','sleeve_right','wave_hand','free_hand'],
 shoulders:['sleeves_and_hands','handwear','sleeve_left','sleeve_right','wave_hand','free_hand','jacket','topwear'],
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
function select(id){
 if(!state.model?.parts[id])return;
 state.selected=id;$('rig-part').value=id;
 const ix=S.layers[S.side].findIndex(x=>x.sourcePart&&key(x)===id);
 if(ix>=0){S.sel=ix;ed.renderList();}
 values();refreshBones();syncIdle();ed.render();
}
let saveTimer=null,saveQueue=Promise.resolve(),revision=0;
async function save(){
 if(!state.model)return false;
 if(state.model.characterId!==studio.current||state.model.face!==S.side)
  throw Error('人物或方向已切换，拒绝覆盖错误工程');
 clearTimeout(saveTimer);saveTimer=null;
 const model=state.model,version=revision;
 const snapshot=JSON.parse(JSON.stringify(model));
 // Queue immutable snapshots: a late autosave cannot overwrite the primary Save.
 const pending=saveQueue.then(()=>studio.storePartRig(snapshot));
 saveQueue=pending.catch(()=>{});
 try{
  await pending;
  if(state.model===model&&revision===version)state.dirty=false;
  info('✓ 已保存新版 L2D 骨骼参数，返回游戏后同步加载。');
  return true;
 }catch(error){
  state.dirty=true;
  info('保存失败，当前修改仍在编辑器：'+error.message);
  throw error;
 }
}
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
 if(primary){
  primary.setAttribute('aria-expanded',String(state.panelOpen));
  primary.textContent=state.panelOpen?'✦ 关闭骨骼细调':'✦ 骨骼细调';
 }
}
function setInspectorOpen(open){
 state.panelOpen=!!open&&state.active;
 panel.hidden=!state.panelOpen;
 document.body.classList.toggle('rig-authoring',state.panelOpen);
 syncOpenState();
 ed.render();
 if(state.panelOpen)requestAnimationFrame(()=>$('fit')?.click());
}
async function deactivate(){
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
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 state.visualIdle=JSON.parse(JSON.stringify(state.model.idleProfile));
 state.active=true;state.phase=0;state.playing=true;state.showGuides=false;
 quickPanel.hidden=false;
 $('rig-guides').checked=false;
 setInspectorOpen(openPanel);
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 select(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 $('rig-source').textContent=id==='char-002'?
  '女二原始 PSD：24个图层记录，17个实际可见、独立运动的部件。':
  '真实源图层 '+src.length+' 个，使用新版独立部件骨骼动画。';
 quickInfo(id==='char-002'?
  '原始PSD分层：刘海、后发、脸和眼睛独立，左右手目前同属手袖层。拖动实时预览，保存到游戏。':
  '拖动滑块后点击保存，实时预览不会改变身体站姿。');
 info('新版独立部件骨骼已载入。');
 ed.render();
}
function toggleIdle(){
 if(state.active){setInspectorOpen(!state.panelOpen);return;}
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
$('rig-close').onclick=()=>setInspectorOpen(false);
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
 if(!state.active||!state.model||motion?.enabled===false||motion?.editing||S.only)return false;
 // Wireframe and yellow skeletal handles are strictly opt-in.
 const previewModel=state.visualIdle?
  {...state.model,idleProfile:state.visualIdle}:state.model;
 core.draw(ctx,parts(),previewModel,state.phase,state.showGuides?state.selected:'');
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
function loc(e){
 const b=stage.getBoundingClientRect();
 return {x:(e.clientX-b.left-S.px)/S.zoom,y:(e.clientY-b.top-S.py)/S.zoom};
}
stage.addEventListener('pointerdown',e=>{
 if(!state.active||!state.panelOpen||!state.showGuides||e.target!==$('view'))return;
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
 state.drag=null;state.dirty=false;quickPanel.hidden=true;
 setInspectorOpen(false);
});
window.addEventListener('paperchalk:studio-ready-to-edit',()=>{
 // New independent mesh is the default whenever genuine component art exists.
 if(parts().length)activate(false).catch(e=>info('独立 L2D 初始化失败：'+e.message));
});
window.PaperchalkPartRigStudio={state,activate,deactivate,drawPreview,save,select,setPlaying,exportGameModule};
requestAnimationFrame(tick);
})();

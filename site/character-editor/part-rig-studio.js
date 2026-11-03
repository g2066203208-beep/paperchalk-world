/* Non-destructive PartRig authoring UI: opt-in; original V4 unaffected. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,model:null,visualIdle:null,selected:'',bone:'',drag:null,phase:0,playing:true,dirty:false,showGuides:false};
const toggle=document.createElement('button');toggle.id='part-rig-toggle';
toggle.textContent='逐件绑骨';toggle.type='button';toggle.title='选择独立骨骼与精细蒙皮控制';
stage.querySelector('.stage-toolbar')?.append(toggle);
const panel=document.createElement('section');panel.id='part-rig-panel';panel.hidden=true;
panel.innerHTML=`<header class="rig-h"><strong>独立部件 ArtMesh 草稿</strong><button id="rig-close" type="button">返回原版 V4</button></header>
<p id="rig-source">独立骨骼待机 · 原始 V4 完整保留，无额外呼吸。</p>
<section id="rig-idle-controls" aria-label="真人待机控制">
 <strong>真人待机 · 总控</strong>
 <div id="rig-presets" class="rig-presets">
  <button type="button" data-idle-preset="realistic">恢复基础站立</button>
 </div>
 <p id="rig-preset-description" aria-live="polite">只有一个基础站立待机：身体和五官保持稳定，无左右摇摆、无风力，发梢与衣摆微动，保留眨眼。</p>
 <div id="rig-idle-sliders"></div>
</section>
<label>部件<select id="rig-part"></select></label>
<label class="rig-part-amount">本部件摆动倍率 <output id="rig-part-amount-value">100%</output>
 <input id="rig-part-amount" type="range" min="0" max="125" value="100" step="5"></label>
<div id="rig-sliders"></div>
<div class="rig-joints"><label>当前骨骼<select id="rig-bone" aria-label="选择当前部件的独立骨骼"></select></label><div id="rig-bone-sliders"></div><p id="rig-bone-tip">每条骨骼有自己的关节、角度、速度、相位与蒙皮半径；不同部件互不影响。</p></div>
<div class="rig-buttons"><button id="rig-pause" type="button">暂停</button><button id="rig-zero" type="button">本层归零</button><button id="rig-save" type="button">保存绑定草稿</button><button id="rig-export" type="button">↓ 备份绑定 JSON</button><button id="rig-module-export" type="button">↓ 一键打包游戏模块 ZIP</button></div>
<p id="rig-status" role="status">绿色轴点、黄色末端均可在主画布直接拖动。</p>`;
// Dock the inspector beside the character; never cover the preview.
const dock=document.querySelector('.layout .right')||stage;
dock.prepend(panel);
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
// User-facing controls mutate the exact model read by the game renderer.
// No copy of animation coefficients in the UI; all presets/limits live in core.
const idleFields=[
 ['hair.amount','发梢微动',0,30,1,100],
 ['hair.speed','头发速度',20,200,5,100],
 ['hair.lag','头发滞后',0,200,5,100],
 ['cloth.amount','衣摆微动',0,22,1,100],
 ['cloth.speed','衣物速度',20,200,5,100],
 ['cloth.lag','衣物滞后',0,200,5,100],
 ['sleeves.amount','袖口微动',0,12,1,100],
 ['sleeves.speed','袖子速度',20,200,5,100]
];
const idleSliders=$('rig-idle-sliders');
for(const [field,label,min,max,step] of idleFields){
 const row=document.createElement('label');row.className='rig-field';
 const title=document.createElement('span');title.textContent=label;
 const value=document.createElement('output');value.id='idle-val-'+field.replace('.','-');
 const input=document.createElement('input');input.type='range';input.dataset.idle=field;
 input.min=min;input.max=max;input.step=step;
 row.append(title,value,input);idleSliders.append(row);
}
// Keep four core controls visible; advanced settings remain one click away.
const quick=new Set(['hair.amount','cloth.amount']);
const idleAdvanced=document.createElement('details');
idleAdvanced.id='rig-idle-extra';
idleAdvanced.innerHTML='<summary>进阶待机 · 速度与惯性</summary>';
for(const row of [...idleSliders.querySelectorAll('.rig-field')]){
 const input=row.querySelector('[data-idle]');
 if(input&&!quick.has(input.dataset.idle))idleAdvanced.append(row);
}
$('rig-idle-controls').append(idleAdvanced);
const advanced=document.createElement('details');
advanced.id='rig-advanced';
advanced.innerHTML='<summary>高级绑定 · 轴点、网格与关节</summary>';
const guideLabel=document.createElement('label');
guideLabel.className='rig-guide-toggle';
guideLabel.innerHTML='<input type="checkbox" id="rig-guides"> 显示网格与关节线（仅用于绑骨）';
advanced.append(guideLabel,sliders,panel.querySelector('.rig-joints'));
panel.querySelector('.rig-buttons').before(advanced);
$('rig-guides').addEventListener('change',e=>{
 state.showGuides=!!e.target.checked;
 ed.render();
});
// Easy controls for a moving fringe and skirt, independent of whole coat/head.
const spotlight=document.createElement('div');
spotlight.id='rig-spotlight';
spotlight.innerHTML='<strong>重点飘动 · 单独调节</strong>';
for(const [id,label] of [
 ['front_hair','刘海摆幅'],['back_hair','后发摆幅'],
 ['hair_over_jacket','背面外披发'],['skirt','裙摆摆幅']
]){
 const row=document.createElement('label');
 row.className='rig-field';
 row.dataset.spotlightRow=id;
 row.innerHTML='<span>'+label+'</span><output>100%</output><input type="range" min="0" max="125" step="5" data-spotlight="'+id+'">';
 spotlight.append(row);
}
$('rig-idle-controls').insertBefore(spotlight,idleAdvanced);
spotlight.addEventListener('input',e=>{
 const id=e.target?.dataset?.spotlight;
 if(!id||!state.model?.parts[id])return;
 state.model.idleProfile.parts[id]=Number(e.target.value)/100;
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 syncIdle();changed();
});
function syncIdle(){
 const idle=state.model?.idleProfile;if(!idle)return;
 for(const input of idleSliders.querySelectorAll('[data-idle]')){
  const [group,key]=input.dataset.idle.split('.');
  const n=idle[group][key];
  input.value=String(Math.round(n*100));
  $('idle-val-'+group+'-'+key).textContent=(n*100).toFixed(0)+'%';
 }
 for(const b of panel.querySelectorAll('[data-idle-preset]')){
  b.classList.add('active');
  b.setAttribute('aria-pressed','true');
 }
 $('rig-preset-description').textContent='基础站立：无风力、无身体左右摆动；仅有微弱发梢、裙摆与袖口活动，原始眨眼保持。';
 const amount=$('rig-part-amount');
 const mult=idle.parts?.[state.selected]??1;
 amount.value=String(Math.round(mult*100));
 $('rig-part-amount-value').textContent=Math.round(mult*100)+'%';
 for(const input of spotlight.querySelectorAll('[data-spotlight]')){
  const id=input.dataset.spotlight,row=input.closest('.rig-field');
  row.hidden=!state.model.parts[id];
  if(row.hidden)continue;
  const weight=idle.parts?.[id]??1;
  input.value=String(Math.round(weight*100));
  row.querySelector('output').textContent=Math.round(weight*100)+'%';
 }
}
idleSliders.addEventListener('input',e=>{
 const field=e.target.dataset.idle;if(!field||!state.model)return;
 const [group,key]=field.split('.');
 const idle=state.model.idleProfile;
 idle[group][key]=Number(e.target.value)/100;
 state.model.idleProfile=core.sanitizeIdleProfile(idle);
 syncIdle();changed();
});
panel.querySelector('#rig-presets').addEventListener('click',e=>{
 const name=e.target?.dataset?.idlePreset;
 if(!name||!state.model)return;
 state.model.idleProfile=core.presetIdle(name,state.model.idleProfile);
 syncIdle();changed();
});
$('rig-part-amount').addEventListener('input',e=>{
 if(!state.model||!state.selected)return;
 state.model.idleProfile.parts[state.selected]=Number(e.target.value)/100;
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 syncIdle();changed();
});
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
  info('✓ 已保存骨骼参数；返回游戏后同步加载（GitHub 发布需另外提交资源）');
  return true;
 }catch(error){
  state.dirty=true;
  info('保存失败，当前修改仍在编辑器：'+error.message);
  throw error;
 }
}
function changed(){
 revision++;state.dirty=true;info('正在保存当前骨骼设置…');
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(()=>{}),600);
 ed.render();
}
function syncOpenState(){
 const primary=$('idle-open');
 if(primary){
  primary.setAttribute('aria-expanded',String(state.active));
  primary.textContent=state.active?'✦ 待机调节中 · 收起':'✦ 待机与飘动';
 }
 toggle.setAttribute('aria-pressed',String(state.active));
 toggle.textContent=state.active?'关闭骨骼预览':'逐件绑骨';
}
async function deactivate(){
 try{if(state.dirty)await save();}catch{return;}
 state.active=false;state.drag=null;state.bone='';panel.hidden=true;
 document.body.classList.remove('rig-authoring');
 syncOpenState();ed.render();
 requestAnimationFrame(()=>document.getElementById('fit')?.click());
}
async function activate(){
 if(!studio.current)return;
 const src=parts();
 if(!src.length){info('此人物没有独立源图层');return;}
 const id=studio.current,face=S.side,saved=await studio.readPartRig(id,face);
 if(studio.current!==id||S.side!==face)return;
 state.model=core.project(src,id,face,saved);
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 state.visualIdle=JSON.parse(JSON.stringify(state.model.idleProfile));
 state.active=true;state.phase=0;state.playing=true;state.showGuides=false;
 $('rig-guides').checked=false;
 document.body.classList.add('rig-authoring');
 panel.hidden=false;syncOpenState();
 requestAnimationFrame(()=>document.getElementById('fit')?.click());
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 select(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 $('rig-source').textContent=id==='char-002'&&src.length<12
  ?'女二当前只有 '+src.length+' 个扁平图分区，不是真 PSD。可以试验分区，但不能冒充完整分层绑定。'
  :'真实源图层 '+src.length+' 个。逐层查看轴点、网格；不替换你认可的 V4 动画。';
 info('已只保留基础站立：身体不再左右摇摆，关闭风力和夸张变形，仅保留非常轻微的发梢、衣摆动态与眨眼。');
 ed.render();
}
function toggleIdle(){
 if(state.active){deactivate().catch(e=>info(e.message));return;}
 const primary=$('idle-open');
 if(primary){primary.disabled=true;primary.textContent='正在打开待机控制…';}
 activate().then(()=>{
  if(state.active&&matchMedia('(max-width:710px)').matches){
   // Fixed panel on phones stays in view even if the editor was scrolled.
   panel.scrollTop=0;
  }
 }).catch(e=>{
  info('无法打开待机控制：'+e.message);
  const note=$('studio-status')||$('status');
  if(note)note.textContent='待机控制加载失败：'+e.message;
 }).finally(()=>{if(primary)primary.disabled=false;syncOpenState();});
}
toggle.onclick=toggleIdle;
if($('idle-open'))$('idle-open').onclick=toggleIdle;
// The direct entry opens the REAL controls, not merely the V4 preview.
const direct=new URLSearchParams(location.search).get('idle')==='1';
if(direct){
 const autoOpen=()=>{
  if(!state.active&&studio.current&&S.ready)toggleIdle();
 };
 window.addEventListener('paperchalk:studio-ready-to-edit',autoOpen);
 // Handles browser revisits where the character loaded before this script.
 requestAnimationFrame(()=>{if(studio.current&&S.ready)autoOpen();});
}
syncOpenState();
$('rig-close').onclick=()=>deactivate().catch(e=>info(e.message));
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
$('rig-pause').onclick=()=>{state.playing=!state.playing;
 $('rig-pause').textContent=state.playing?'暂停':'播放';};
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
   if(strength>0.0001&&(
    Math.abs(p.motion?.x||0)+Math.abs(p.motion?.y||0)+Math.abs(p.motion?.angle||0)>0.001||
    (p.bones||[]).some(b=>b.enabled!==false&&Math.abs(b.amplitude)>0.001)
   ))hasMotion=true;
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
 info('✓ 已打包 '+Object.keys(views).join('/')+' 原始独立部件。将 '+newId+
   '.zip 上传到 GitHub site/assets/l2d/inbox/，即可自动进入游戏人物库。旧 V4 未改。');
 return {id:newId,views:Object.keys(views),files:files.length,blob:file};
}
$('rig-module-export').onclick=async()=>{
 const suggestion=studio.current==='protagonist'?'protagonist-rig-v1':
  studio.current==='char-002'?'char-002-rig-v1':studio.current+'-rig-v1';
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
 if(!state.active||!state.model)return false;
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
 if(!state.active||e.target!==$('view'))return;
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
 if(state.active&&S.ready&&!document.hidden){
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
 if(state.active)deactivate();state.model=null;state.selected='';
});
window.PaperchalkPartRigStudio={state,activate,deactivate,drawPreview,save,select,exportGameModule};
requestAnimationFrame(tick);
})();

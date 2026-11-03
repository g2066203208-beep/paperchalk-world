/* Non-destructive PartRig authoring UI: opt-in; original V4 unaffected. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,model:null,selected:'',bone:'',drag:null,phase:0,playing:true,dirty:false};
const toggle=document.createElement('button');toggle.id='part-rig-toggle';
toggle.textContent='逐件绑定';toggle.type='button';
stage.querySelector('.stage-toolbar')?.append(toggle);
const panel=document.createElement('section');panel.id='part-rig-panel';panel.hidden=true;
panel.innerHTML=`<header class="rig-h"><strong>独立部件 ArtMesh 草稿</strong><button id="rig-close" type="button">返回原版 V4</button></header>
<p id="rig-source">独立骨骼待机 · 原始 V4 完整保留，无额外呼吸。</p>
<section id="rig-idle-controls" aria-label="真人待机控制">
 <strong>真人待机 · 总控</strong>
 <div id="rig-presets" class="rig-presets">
  <button type="button" data-idle-preset="still">静止</button>
  <button type="button" data-idle-preset="realistic">真人待机</button>
  <button type="button" data-idle-preset="breeze">轻风</button>
  <button type="button" data-idle-preset="windy">强风</button>
 </div>
 <div id="rig-idle-sliders"></div>
</section>
<label>部件<select id="rig-part"></select></label>
<label class="rig-part-amount">本部件摆动倍率 <output id="rig-part-amount-value">100%</output>
 <input id="rig-part-amount" type="range" min="0" max="200" value="100" step="5"></label>
<div id="rig-sliders"></div>
<div class="rig-joints"><label>当前骨骼<select id="rig-bone" aria-label="选择当前部件的独立骨骼"></select></label><div id="rig-bone-sliders"></div><p id="rig-bone-tip">每条骨骼有自己的关节、角度、速度、相位与蒙皮半径；不同部件互不影响。</p></div>
<div class="rig-buttons"><button id="rig-pause" type="button">暂停</button><button id="rig-zero" type="button">本层归零</button><button id="rig-save" type="button">保存绑定草稿</button><button id="rig-export" type="button">↓ 备份绑定 JSON</button><button id="rig-module-export" type="button">↓ 一键打包游戏模块 ZIP</button></div>
<p id="rig-status" role="status">绿色轴点、黄色末端均可在主画布直接拖动。</p>`;
stage.append(panel);
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
 ['body.amount','身体微动',0,60,1,100],
 ['body.speed','身体速度',20,200,5,100],
 ['hair.amount','头发摆幅',0,150,5,100],
 ['hair.speed','头发速度',20,200,5,100],
 ['hair.lag','头发滞后',0,200,5,100],
 ['cloth.amount','裙子/外套摆幅',0,150,5,100],
 ['cloth.speed','衣物速度',20,200,5,100],
 ['cloth.lag','衣物滞后',0,200,5,100],
 ['sleeves.amount','袖子/手臂摆幅',0,150,5,100],
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
function syncIdle(){
 const idle=state.model?.idleProfile;if(!idle)return;
 for(const input of idleSliders.querySelectorAll('[data-idle]')){
  const [group,key]=input.dataset.idle.split('.');
  const n=idle[group][key];
  input.value=String(Math.round(n*100));
  $('idle-val-'+group+'-'+key).textContent=(n*100).toFixed(0)+'%';
 }
 for(const b of panel.querySelectorAll('[data-idle-preset]'))
  b.classList.toggle('active',b.dataset.idlePreset===idle.preset);
 const amount=$('rig-part-amount');
 const mult=idle.parts?.[state.selected]??1;
 amount.value=String(Math.round(mult*100));
 $('rig-part-amount-value').textContent=Math.round(mult*100)+'%';
}
idleSliders.addEventListener('input',e=>{
 const field=e.target.dataset.idle;if(!field||!state.model)return;
 const [group,key]=field.split('.');
 const idle=state.model.idleProfile;
 idle[group][key]=Number(e.target.value)/100;
 idle.preset='custom';
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
 state.model.idleProfile.preset='custom';
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
let saveTimer;
async function save(){
 if(!state.model||state.model.characterId!==studio.current||state.model.face!==S.side)return;
 clearTimeout(saveTimer);saveTimer=null;
 try{await studio.storePartRig(state.model);state.dirty=false;
 info('绑定草稿已保存到本机；原始 V4、PNG 和游戏均未改变');}
 catch(e){info('保存失败：'+e.message);}
}
function changed(){
 state.dirty=true;info('本部件参数已改变，其他部件不受影响');
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(console.error),600);
 ed.render();
}
function deactivate(){
 if(state.dirty)save().catch(console.error);
 state.active=false;state.drag=null;state.bone='';panel.hidden=true;
 toggle.textContent='逐件绑定';ed.render();
}
async function activate(){
 if(!studio.current)return;
 const src=parts();
 if(!src.length){info('此人物没有独立源图层');return;}
 const id=studio.current,face=S.side,saved=await studio.readPartRig(id,face);
 if(studio.current!==id||S.side!==face)return;
 state.model=core.project(src,id,face,saved);
 state.model.idleProfile=core.sanitizeIdleProfile(state.model.idleProfile);
 state.active=true;state.phase=0;state.playing=true;
 toggle.textContent='返回 V4';panel.hidden=false;
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 select(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 $('rig-source').textContent=id==='char-002'&&src.length<12
  ?'女二当前只有 '+src.length+' 个扁平图分区，不是真 PSD。可以试验分区，但不能冒充完整分层绑定。'
  :'真实源图层 '+src.length+' 个。逐层查看轴点、网格；不替换你认可的 V4 动画。';
 info('实时待机总控与逐件倍率已连接同一套游戏骨骼。默认身体极轻微、发梢柔性摆动，不叠加呼吸。');
 ed.render();
}
toggle.onclick=()=>state.active?deactivate():activate().catch(e=>info(e.message));
$('rig-close').onclick=deactivate;
$('rig-part').onchange=e=>select(e.target.value);
$('rig-save').onclick=()=>save();
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
   if(Object.values(p.motion||{}).some((v,i)=>i<3&&Math.abs(v)>0.001))hasMotion=true;
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
 if(!hasMotion)throw Error('全部部件形变量仍为零，请先调整至少一个部件的动作再发布');
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
 core.draw(ctx,parts(),state.model,state.phase,state.selected);
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
  if(state.playing)state.phase+=Math.min(.07,(now-last)/1000)*2*Math.PI/3.6;
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

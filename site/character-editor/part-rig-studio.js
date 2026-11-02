/* Non-destructive PartRig authoring UI: opt-in; original V4 unaffected. */
(()=>{
'use strict';
const ed=window.characterEditor,core=window.PaperchalkPartRigCore,studio=window.PaperchalkStudio;
if(!ed||!core||!studio)return;
const $=id=>document.getElementById(id),S=ed.S,stage=$('stage');
const state={active:false,model:null,selected:'',drag:null,phase:0,playing:true,dirty:false};
const toggle=document.createElement('button');toggle.id='part-rig-toggle';
toggle.textContent='逐件绑定';toggle.type='button';
stage.querySelector('.stage-toolbar')?.append(toggle);
const panel=document.createElement('section');panel.id='part-rig-panel';panel.hidden=true;
panel.innerHTML=`<header class="rig-h"><strong>独立部件 ArtMesh 草稿</strong><button id="rig-close" type="button">返回原版 V4</button></header>
<p id="rig-source">仅试验独立纹理；不修改原始 V4。</p>
<label>部件<select id="rig-part"></select></label>
<div id="rig-sliders"></div>
<div class="rig-buttons"><button id="rig-pause" type="button">暂停</button><button id="rig-zero" type="button">本层归零</button><button id="rig-save" type="button">保存绑定草稿</button><button id="rig-export" type="button">↓ 备份绑定 JSON</button></div>
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
const parts=()=>S.layers[S.side].filter(p=>p.sourcePart&&p.canvas);
const key=p=>String(p.partId||p.name);
const current=()=>state.model?.parts[state.selected];
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
function select(id){
 if(!state.model?.parts[id])return;
 state.selected=id;$('rig-part').value=id;
 const ix=S.layers[S.side].findIndex(x=>x.sourcePart&&key(x)===id);
 if(ix>=0){S.sel=ix;ed.renderList();}
 values();ed.render();
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
 state.active=false;state.drag=null;panel.hidden=true;
 toggle.textContent='逐件绑定';ed.render();
}
async function activate(){
 if(!studio.current)return;
 const src=parts();
 if(!src.length){info('此人物没有独立源图层');return;}
 const id=studio.current,face=S.side,saved=await studio.readPartRig(id,face);
 if(studio.current!==id||S.side!==face)return;
 state.model=core.project(src,id,face,saved);
 state.active=true;state.phase=0;state.playing=true;
 toggle.textContent='返回 V4';panel.hidden=false;
 const selectNode=$('rig-part');selectNode.replaceChildren();
 for(const p of src)selectNode.add(new Option(p.name,p.partId||p.name));
 const preferred=S.layers[S.side][S.sel];
 select(state.model.parts[key(preferred||{})]?key(preferred):key(src[0]));
 $('rig-source').textContent=id==='char-002'&&src.length<12
  ?'女二当前只有 '+src.length+' 个扁平图分区，不是真 PSD。可以试验分区，但不能冒充完整分层绑定。'
  :'真实源图层 '+src.length+' 个。逐层查看轴点、网格；不替换你认可的 V4 动画。';
 info('已进入独立部件预览。拖动绿色 P 轴点和黄色 T 末端，或调整当前层参数。');
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
 if(Math.hypot(o.x-a.x,o.y-a.y)<radius)state.drag='pivot';
 else if(Math.hypot(o.x-b.x,o.y-b.y)<radius)state.drag='tip';
 else{for(const layer of parts().slice().reverse()){
  const q=state.model.parts[key(layer)];
  if(o.x>=q.x&&o.x<=q.x+q.w&&o.y>=q.y&&o.y<=q.y+q.h){select(q.id);break;}
 }}
 if(state.drag)stage.setPointerCapture(e.pointerId);
},true);
stage.addEventListener('pointermove',e=>{
 if(!state.active||!state.drag)return;
 e.stopImmediatePropagation();e.preventDefault();
 const p=current(),pos=loc(e);if(!p)return;
 p[state.drag].x=Math.max(0,Math.min(1,(pos.x-p.x)/p.w));
 p[state.drag].y=Math.max(0,Math.min(1,(pos.y-p.y)/p.h));
 values();changed();
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
window.PaperchalkPartRigStudio={state,activate,deactivate,drawPreview,save,select};
requestAnimationFrame(tick);
})();

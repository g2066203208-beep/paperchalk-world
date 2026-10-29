import {TYPES,generateRig,validateRig,poseRig,bounds,findBone,rigToJSON,clamp} from './rig.js';
import {buildEnvelope} from './surface.js';
import {paintSurface,pathsToSVG} from './surface-renderer.js';
const $=s=>document.querySelector(s);
const cv=$('#rig-canvas'),wrap=$('#canvas-wrap'),ctx=cv.getContext('2d');
const colors={core:'#8ed7cc',spine:'#8ed7cc',head:'#e9b4ae',leg:'#e9c58e',arm:'#e9c58e',tail:'#aaaedb'};
const names={core:'身体核心',spine:'脊柱',head:'头部结构',arm:'前肢 / 手臂',leg:'支撑肢体',tail:'尾椎'};
const state={type:'quadruped',seed:2048,size:100,limbs:100,playing:true,labels:false,ghost:true,zoom:1,rig:null,pose:null,selected:null,drag:null,time:0,last:0,camera:null,dirty:true,lastPaint:0,surface:null,surfaceOn:true,bonesOn:true,thickness:1.15,blend:12};
function labelMessage(text){$('#message').textContent=text;}
function readControls(){
 state.size=Number($('#size-range').value);
 state.limbs=Number($('#limbs-range').value);
 state.seed=clamp(Number($('#seed-input').value)||1,1,4294967295);
 $('#seed-input').value=String(state.seed);
 $('#size-output').textContent=state.size+'%';
 $('#limbs-output').textContent=state.limbs+'%';
}
function rebuild(){
 readControls();
 state.rig=generateRig(state.type,state.seed,{size:state.size,limbs:state.limbs});
 const check=validateRig(state.rig);
 state.drag=null;state.selected=null;state.time=0;state.dirty=true;state.surface=null;
 state.zoom=1;
 $('#stat-nodes').textContent=check.bones;
 $('#stat-chains').textContent=check.chains;
 $('#stat-roots').textContent=check.roots;
 $('#bone-count-a').textContent=check.bones;
 $('#joint-count').textContent=check.bones;
 $('#specimen-title').textContent=state.rig.label+' · 骨骼结构';
 $('#specimen-id').textContent=String(state.seed).padStart(5,'0').slice(-6);
 document.querySelectorAll('[data-type]').forEach(button=>{
  const active=button.dataset.type===state.type;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',active?'true':'false');
 });
 refreshHierarchy();updateInspector();
 labelMessage(state.rig.label+'骨骼生成完成 · '+check.bones+' 个节点');
}
function depthOf(bone){
 let d=0,par=bone.parent;
 while(par&&d<50){d++;par=findBone(state.rig,par)?.parent;}
 return d;
}
function refreshHierarchy(){
 const box=$('#bone-list');
 box.replaceChildren();
 for(const bone of state.rig.bones){
  const row=document.createElement('button');
  row.type='button';row.className='bone-row';
  row.dataset.boneId=bone.id;
  row.style.paddingLeft=(9+depthOf(bone)*10)+'px';
  const square=document.createElement('span');
  square.className='bone-square';square.style.background=colors[bone.group]||colors.spine;
  const span=document.createElement('span');span.textContent=bone.id;
  row.append(square,span);
  row.addEventListener('click',()=>{
   state.selected=bone.id;
   updateInspector();
  });
  box.append(row);
 }
}
function updateInspector(){
 state.dirty=true;
 document.querySelectorAll('.bone-row').forEach(row=>
  row.classList.toggle('active',row.dataset.boneId===state.selected));
 const bone=findBone(state.rig,state.selected);
 if(!bone){
  $('#selected-name').textContent='未选中关节';
  $('#selected-info').textContent='点击画布中的圆形关节节点，查看其上级骨骼、长度与位置。';
  return;
 }
 $('#selected-name').textContent=bone.id;
 const pos=state.pose?.get(bone.id)||bone;
 const end=state.rig.chains.some(c=>c.end===bone.id);
 $('#selected-info').textContent='类型：'+(names[bone.group]||bone.group)+
  '  ·  父级：'+(bone.parent||'ROOT')+
  '  ·  骨长：'+bone.length.toFixed(1)+
  '  ·  当前：('+pos.x.toFixed(1)+', '+pos.y.toFixed(1)+')'+
  (end?'  ·  可拖动 IK 末端':'');
}
function resize(){
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
 }
 return {w,h,dpr};
}
function cameraFor(w,h){
 const box=bounds(state.rig);
 const fullW=Math.max(160,box.maxX-box.minX+95);
 const fullH=Math.max(170,box.maxY-box.minY+95);
 const scale=Math.max(.55,Math.min((w-105)/fullW,(h-105)/fullH))*state.zoom;
 const mx=(box.maxX+box.minX)/2,my=(box.maxY+box.minY)/2;
 return {scale,tx:w/2-mx*scale,ty:h/2-my*scale,w,h};
}
const project=(pt,cam)=>({x:cam.tx+pt.x*cam.scale,y:cam.ty+pt.y*cam.scale});
function unproject(point,cam){return {x:(point.x-cam.tx)/cam.scale,y:(point.y-cam.ty)/cam.scale};}
function background(w,h){
 ctx.fillStyle='#16222c';ctx.fillRect(0,0,w,h);
 // Scale-neutral editorial grid; reference axes remain consistent while zooming.
 ctx.save();ctx.strokeStyle='#30424a';ctx.lineWidth=.5;ctx.globalAlpha=.37;
 for(let x=0;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=0;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 ctx.restore();
 const glow=ctx.createRadialGradient(w*.49,h*.52,20,w*.49,h*.52,Math.min(w,h)*.75);
 glow.addColorStop(0,'#29404a55');glow.addColorStop(1,'#10192100');
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#3f656640';ctx.lineWidth=1;ctx.beginPath();
 ctx.arc(w/2,h/2,Math.min(w,h)*.37,0,Math.PI*2);ctx.stroke();
 ctx.beginPath();ctx.arc(w/2,h/2,Math.min(w,h)*.44,0,Math.PI*2);ctx.stroke();
 ctx.font='10px monospace';ctx.fillStyle='#59747d';ctx.textBaseline='middle';
 ctx.fillText('ANATOMY GRID  /  01',31,h*.16);
}
function originRulers(camera){
 const zero=project({x:0,y:0},camera);
 ctx.save();ctx.setLineDash([4,7]);ctx.strokeStyle='#819ba42d';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(zero.x,0);ctx.lineTo(zero.x,camera.h);
 ctx.moveTo(0,zero.y);ctx.lineTo(camera.w,zero.y);ctx.stroke();ctx.restore();
}
function drawBoneLines(pose,camera,ghost=false){
 const nodes=state.rig.bones;
 // Guide lines: thinner ghost pose and structural bones differ from frontmost nodes.
 for(const b of nodes){
  if(!b.parent)continue;
  const a=project(pose.get(b.parent),camera),end=project(pose.get(b.id),camera);
  const color=ghost?'#96a9b1':(colors[b.group]||'#acc6c3');
  const width=clamp(b.radius*camera.scale*.42,3,14);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(end.x,end.y);
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=ghost?'#78858b2a':'#081318';ctx.lineWidth=width+5;
  ctx.stroke();
  ctx.strokeStyle=ghost?'#98a6b137':color;
  ctx.lineWidth=ghost?Math.max(1,width/2):width;
  ctx.stroke();
  if(!ghost){
   ctx.strokeStyle='#eff6e85e';ctx.lineWidth=Math.max(1,width*.18);ctx.stroke();
  }
 }
}
function drawSkeletonNodes(pose,camera){
 for(const bone of state.rig.bones){
  const pt=project(pose.get(bone.id),camera);
  const color=colors[bone.group]||'#a9c9c4';
  const selected=state.selected===bone.id;
  const r=selected?9:clamp(bone.radius*camera.scale*.5,4,8);
  ctx.beginPath();ctx.arc(pt.x,pt.y,r+3,0,Math.PI*2);
  ctx.fillStyle='#10202a';ctx.fill();
  ctx.strokeStyle=selected?'#f2dfaa':'#cfe7dc77';ctx.lineWidth=selected?2.5:1.1;ctx.stroke();
  ctx.beginPath();ctx.arc(pt.x,pt.y,r-1.3,0,Math.PI*2);
  ctx.fillStyle=selected?'#f4da9b':color;ctx.fill();
  ctx.beginPath();ctx.arc(pt.x-1,pt.y-1,1.4,0,Math.PI*2);
  ctx.fillStyle='#fff5e5';ctx.fill();
  if(selected){
   ctx.beginPath();ctx.arc(pt.x,pt.y,17,0,Math.PI*2);
   ctx.setLineDash([4,4]);ctx.strokeStyle='#eacfa0aa';ctx.stroke();ctx.setLineDash([]);
  }
  if(state.labels||selected){
   ctx.font=(selected?'bold ':'')+'10px monospace';
   ctx.fillStyle='#d6e3db';ctx.textAlign='left';ctx.textBaseline='middle';
   ctx.fillText(bone.id,pt.x+11,pt.y-11);
  }
 }
}
function drawAnnotations(camera){
 const box=bounds(state.rig);
 const left=project({x:box.minX,y:box.minY},camera);
 const right=project({x:box.maxX,y:box.maxY},camera);
 ctx.save();ctx.strokeStyle='#688e8a70';ctx.setLineDash([3,6]);ctx.lineWidth=1;
 const y=clamp(right.y+37,26,camera.h-37);
 ctx.beginPath();ctx.moveTo(clamp(left.x,30,camera.w-30),y);
 ctx.lineTo(clamp(right.x,30,camera.w-30),y);ctx.stroke();
 ctx.setLineDash([]);ctx.fillStyle='#6d9798';ctx.font='10px monospace';
 ctx.textAlign='center';ctx.fillText('REST SPAN  '+Math.round(box.maxX-box.minX)+' u',
  clamp((left.x+right.x)*.5,80,camera.w-80),y+16);
 ctx.restore();
}
function render(now){
 requestAnimationFrame(render);
 if(!state.playing&&!state.drag&&!state.dirty)return;
 // Live implicit contours are CPU-evaluated; cap redrawing at ~25 FPS.
 if(state.playing&&!state.dirty&&!state.drag&&now-state.lastPaint<40)return;
 state.lastPaint=now;
 state.dirty=false;
 const dt=state.last?Math.min(.05,(now-state.last)/1000):0;state.last=now;
 if(state.playing&&!state.drag)state.time+=dt;
 if(!state.rig)return;
 const {w,h,dpr}=resize();
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);background(w,h);
 const camera=cameraFor(w,h);state.camera=camera;
 originRulers(camera);
 const pose=poseRig(state.rig,state.time,{play:state.playing,drag:state.drag});
 state.pose=pose;
 if(state.surfaceOn){
  state.surface=buildEnvelope(state.rig,pose,{
   thickness:state.thickness,blend:state.blend,step:3
  });
  const rings=paintSurface(ctx,state.surface,camera,{opacity:1});
  $('#contour-count').textContent=String(rings);
 }else{
  state.surface=null;
  $('#contour-count').textContent='—';
 }
 if(state.bonesOn){
  if(state.ghost)drawBoneLines(poseRig(state.rig,0,{play:false}),camera,true);
  drawBoneLines(pose,camera);
  drawSkeletonNodes(pose,camera);
 }
 drawAnnotations(camera);
 $('#anim-progress').style.width=(state.time*.85%1*100).toFixed(1)+'%';
 $('#zoom-label').textContent=Math.round(state.zoom*100)+'%';
 if(state.selected&&Math.floor(now/400)!==Math.floor((now-16)/400)){
  // Inspector info is updated by interactions, not every paint tick.
 }
}
function canvasPoint(event){const box=cv.getBoundingClientRect();return {x:event.clientX-box.left,y:event.clientY-box.top};}
function nearest(point){
 const threshold=19;let closest=null,best=threshold;
 for(const b of state.rig.bones){
  const p=project(state.pose.get(b.id),state.camera);
  const d=Math.hypot(p.x-point.x,p.y-point.y);
  if(d<best){best=d;closest=b;}
 }
 return closest;
}
cv.addEventListener('pointerdown',event=>{
 if(!state.pose)return;
 const found=nearest(canvasPoint(event));
 if(!found){state.selected=null;state.drag=null;updateInspector();return;}
 state.selected=found.id;updateInspector();
 if(state.rig.chains.some(c=>c.end===found.id)){
  const p=unproject(canvasPoint(event),state.camera);
  state.drag={id:found.id,x:p.x,y:p.y};
  cv.setPointerCapture(event.pointerId);cv.classList.add('dragging');
  labelMessage('IK 拖动中 · 骨长锁定');
 }else labelMessage(found.id+' 已选中 · 拖动腕部/踝部关节测试 IK');
});
cv.addEventListener('pointermove',event=>{
 if(!state.drag)return;
 const p=unproject(canvasPoint(event),state.camera);
 state.drag.x=p.x;state.drag.y=p.y;
});
function finishDrag(){
 if(state.drag){state.drag=null;state.dirty=true;cv.classList.remove('dragging');labelMessage('骨长约束测试完成');}
}
cv.addEventListener('pointerup',finishDrag);
cv.addEventListener('pointercancel',finishDrag);
cv.addEventListener('lostpointercapture',finishDrag);
cv.addEventListener('wheel',event=>{
 event.preventDefault();
 state.zoom=clamp(state.zoom*Math.exp(-event.deltaY*.001),.5,3);state.dirty=true;
},{passive:false});
document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{
 state.type=b.dataset.type;rebuild();
}));
$('#size-range').addEventListener('input',rebuild);
$('#limbs-range').addEventListener('input',rebuild);
$('#seed-input').addEventListener('change',rebuild);
$('#regenerate').addEventListener('click',()=>{
 $('#seed-input').value=String((state.seed*1664525+1013904223)>>>0||1);rebuild();
});
$('#generate').addEventListener('click',()=>{rebuild();labelMessage('已重新生成并重置骨架');});
function updatePlaying(){
 state.playing=$('#play-switch').checked;state.dirty=true;
 $('#play-button').innerHTML=state.playing?'Ⅱ <span>暂停</span>':'▶ <span>播放</span>';
 $('#play-button').setAttribute('aria-label',state.playing?'暂停动画':'播放动画');
 $('#mode-label').textContent=state.playing?'实时模拟':'静止检查';
}
$('#play-switch').addEventListener('change',updatePlaying);
$('#play-button').addEventListener('click',()=>{
 $('#play-switch').checked=!state.playing;updatePlaying();
});
$('#labels-switch').addEventListener('change',e=>{state.labels=e.target.checked;state.dirty=true;});
$('#ghost-switch').addEventListener('change',e=>{state.ghost=e.target.checked;state.dirty=true;});
$('#surface-switch').addEventListener('change',e=>{state.surfaceOn=e.target.checked;state.dirty=true;});
$('#bones-switch').addEventListener('change',e=>{state.bonesOn=e.target.checked;state.dirty=true;});
$('#thickness-range').addEventListener('input',e=>{
 state.thickness=Number(e.target.value)/100;
 $('#thickness-output').textContent=e.target.value+'%';state.dirty=true;
});
$('#blend-range').addEventListener('input',e=>{
 state.blend=Number(e.target.value);
 $('#blend-output').textContent=e.target.value+' u';state.dirty=true;
});
$('#fit-view').addEventListener('click',()=>{state.zoom=1;state.dirty=true;labelMessage('视图已适配');});
function download(name,blob){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function currentName(ext){return 'bonelab-'+state.type+'-'+state.seed+'.'+ext;}
$('#export-json').addEventListener('click',()=>{
 download(currentName('json'),new Blob([JSON.stringify({...JSON.parse(rigToJSON(state.rig)),skin:{method:'smooth-capsule-sdf',thickness:state.thickness,blend:state.blend}},null,2)],{type:'application/json;charset=utf-8'}));
 labelMessage('已导出完整父子层级 / 骨长 JSON');
});
function svgScene(){
 const b=bounds(state.rig,state.pose),padding=80;
 const minX=b.minX-padding,minY=b.minY-padding,w=b.maxX-b.minX+padding*2,h=b.maxY-b.minY+padding*2;
 const lines=state.rig.bones.filter(node=>node.parent).map(node=>{
  const a=state.pose.get(node.parent),c=state.pose.get(node.id),color=colors[node.group]||colors.spine;
  return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+c.x+'" y2="'+c.y+
   '" stroke="'+color+'" stroke-width="'+Math.max(2,node.radius*.7)+'" stroke-linecap="round"/>';
 }).join('');
 const nodes=state.rig.bones.map(node=>{
  const pt=state.pose.get(node.id),color=colors[node.group]||colors.spine;
  return '<circle cx="'+pt.x+'" cy="'+pt.y+'" r="'+Math.max(2,node.radius*.46)+
   '" fill="'+color+'" stroke="#23303a" stroke-width="1"/>';
 }).join('');
 const surface=state.surfaceOn?buildEnvelope(state.rig,state.pose,{thickness:state.thickness,blend:state.blend,step:2.5}):null;
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+minX+' '+minY+' '+w+' '+h+
  '" width="'+Math.round(w*3)+'" height="'+Math.round(h*3)+'">'+
  (surface?pathsToSVG(surface):'')+
  (state.bonesOn?lines+nodes:'')+'</svg>';
}
$('#export-svg').addEventListener('click',()=>{
 download(currentName('svg'),new Blob([svgScene()],{type:'image/svg+xml;charset=utf-8'}));
 labelMessage('已导出当前姿态矢量 SVG');
});
$('#export-png').addEventListener('click',()=>{
 cv.toBlob(blob=>{if(blob)download(currentName('png'),blob);},'image/png');
 labelMessage('已导出当前画布 PNG');
});
window.addEventListener('resize',()=>{state.dirty=true;});
rebuild();
window.__BONE_LAB__={
 get rig(){return state.rig;},
 get pose(){return state.pose;},
 get camera(){return state.camera;},
 get surface(){return state.surface;},
 get skin(){return {enabled:state.surfaceOn,showBones:state.bonesOn,thickness:state.thickness,blend:state.blend};},
 get state(){return {type:state.type,seed:state.seed,selected:state.selected,playing:state.playing,zoom:state.zoom,dragging:!!state.drag,surfaceOn:state.surfaceOn,contours:state.surface?.contours.length??0};},
 generate:(type,seed)=>{state.type=type;$('#seed-input').value=String(seed);rebuild();return state.rig;},
 inspect:()=>validateRig(state.rig)
};
requestAnimationFrame(render);

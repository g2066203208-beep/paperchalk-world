/* WORK · 03 unified object museum. A single page and selection surface:
   original CoinTable on 'coin'; card planchet renderer for the six real
   character paintings. No iframe, no second character-card page. */
(()=>{'use strict';
const $=s=>document.querySelector(s),T=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const root=$('#objectPicker'),coinPane=$('#coin-pane'),cardPane=$('#card-pane');
const P=window.WorkCardProbe;
if(!root||!coinPane||!cardPane||!P)throw Error('Work museum: original renderer or unified page missing');
const chars=[
{id:'hunter',name:'猎人团长',group:'怪物猎人',symbol:'✦',accent:'#887a54',src:'../../../assets/characters/monster-hunters/01-legendary-hunter.png'},
{id:'doctor',name:'猎人医生',group:'怪物猎人',symbol:'✚',accent:'#67746a',src:'../../../assets/characters/monster-hunters/02-blood-physician.png'},
{id:'farmer',name:'农耕工程师',group:'农民组织',symbol:'⚙',accent:'#74804d',src:'../../../assets/characters/farmer-faction/engineer/01-farmer.png'},
{id:'vampire',name:'吸血鬼公主',group:'吸血鬼',symbol:'☾',accent:'#76526b',src:'../../../assets/characters/crimson-vampires/vampire-princess.png'},
{id:'ringmaster',name:'马戏团团长',group:'马戏团',symbol:'✧',accent:'#94634e',src:'../../../assets/characters/wonder-circus/ringmaster.png'},
{id:'warrior',name:'伐木少女',group:'农民组织',symbol:'⚒',accent:'#85724f',src:'../../../assets/characters/farmer-faction/warrior/01-loli-lumberjack.png'},
].map((c,index)=>({...c,index}));
const all=[{id:'coin',name:'原版金币',group:'Work · 铸造黄铜',kind:'coin'},...chars];
const stage=$('#cardStage'),c=stage.getContext('2d',{alpha:false}),wire=$('#cardWire'),w=wire.getContext('2d');
const card=P.makeCard(20261121);
const state={item:'coin',selected:chars[0],ready:false,artwork:false,auto:true,yaw:-7,pitch:-9,roll:0,wire:true,dirty:true,last:0,drawAt:0,renders:0};
const images=new Map();let choiceSerial=0;
const deg=x=>x*Math.PI/180;
function q(){card.q=P.product(P.axis(0,1,0,deg(state.yaw)),P.product(P.axis(1,0,0,deg(state.pitch)),P.axis(0,0,1,deg(state.roll))));card.matrix=P.basis(card.q);card.cache='';state.dirty=true;}
function syncSliders(){
 $('#cardYaw').value=clamp(state.yaw,-180,180);
 $('#cardPitch').value=clamp(state.pitch,-75,75);
 $('#cardYawOut').textContent=Math.round(state.yaw)+'°';
 $('#cardPitchOut').textContent=Math.round(state.pitch)+'°';
}
function pause(){state.auto=false;$('#cardAuto').textContent='▶ 自动展示';$('#cardAuto').setAttribute('aria-pressed','false');}
function art(item){
 if(images.has(item.id))return images.get(item.id);
 const promise=new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
  img.src=item.src;
 });
 images.set(item.id,promise);return promise;
}
function buildPicker(){
 root.textContent='';
 for(const item of all){
  const b=document.createElement('button');b.type='button';b.className='object-option';b.id='object-'+item.id;
  b.setAttribute('aria-pressed',String(item.id==='coin'));b.setAttribute('aria-label','展示 '+item.name);
  const pic=document.createElement('span');pic.className='object-picture';
  if(item.kind==='coin'){const coinIcon=document.createElement('span');coinIcon.className='coin-icon';coinIcon.textContent='◈';pic.appendChild(coinIcon);}
  else{const img=document.createElement('img');img.src=item.src;img.alt='';img.decoding='async';img.loading='lazy';pic.appendChild(img);}
  const detail=document.createElement('span');detail.className='object-data';
  const name=document.createElement('strong');name.textContent=item.name;
  const group=document.createElement('span');group.textContent=item.group;
  detail.append(name,group);
  b.append(pic,detail);b.addEventListener('click',()=>select(item.id,true));root.appendChild(b);
 }
}
function updatePicker(id){
 for(const b of root.querySelectorAll('.object-option'))b.setAttribute('aria-pressed',String(b.id==='object-'+id));
 const item=all.find(x=>x.id===id);
 $('#selectionInfo').textContent=item?.kind==='coin'?'原版 Work 金币模型 · 保留全部研究工具':item?.group+' · 原始人物立绘 · Work 金属实体卡';
 $('#objectIndex').textContent=String(all.findIndex(x=>x.id===id)+1).padStart(2,'0')+' / '+String(all.length).padStart(2,'0');
}
async function select(id,writeHistory=false){
 const item=all.find(x=>x.id===id)||all[0];
 state.item=item.id;
 const ticket=++choiceSerial;
 const isCoin=item.id==='coin';
 coinPane.hidden=!isCoin;cardPane.hidden=isCoin;
 updatePicker(item.id);
 if(writeHistory){
  const url=new URL(location.href);
  if(isCoin)url.searchParams.delete('item');else url.searchParams.set('item',item.id);
  history.replaceState(null,'',url);
 }
 if(isCoin)return;
 state.selected=item;state.ready=false;
 $('#cardName').textContent=item.name;
 $('#cardGroup').textContent=item.group+' / 原画';
 $('#cardInfo').textContent=item.group+' · '+item.src.slice(item.src.lastIndexOf('/')+1);
 $('#cardStatus').textContent='载入 GitHub 立绘…';
 const img=await art(item);if(ticket!==choiceSerial)return;
 P.setItem(item,img);
 card.cache='';card.sprite=null;state.ready=true;state.artwork=!!img?.naturalWidth;
 $('#cardStatus').textContent=state.artwork?'原画已载入 · 原版 Work 金属光照':'原画不可用 · 当前显示工艺卡芯';
 state.dirty=true;
 draw();
}
function background(){
 const W=stage.width,H=stage.height;
 const g=c.createRadialGradient(W*.49,H*.36,8,W*.5,H*.5,H*.63);
 g.addColorStop(0,'#344331');g.addColorStop(.45,'#1d2a20');g.addColorStop(1,'#101a13');
 c.fillStyle=g;c.fillRect(0,0,W,H);
 c.strokeStyle='rgba(210,185,123,.065)';c.lineWidth=1;
 for(let rad=110;rad<530;rad+=100){c.beginPath();c.ellipse(W/2,H/2,rad,rad*.77,0,0,T);c.stroke();}
 c.strokeStyle='rgba(241,215,156,.07)';
 c.beginPath();c.moveTo(W/2,32);c.lineTo(W/2,H-32);c.moveTo(32,H/2);c.lineTo(W-32,H/2);c.stroke();
}
function draw(){
 if(state.item==='coin'||!state.ready)return;
 state.dirty=false;
 background();
 const W=stage.width,H=stage.height,time=performance.now()*.001;
 // Reuse the unchanged Work CPU metal lighting; only the model silhouette,
 // detailed normal field, and restrained original painting are different.
 P.rasterCard(card,211+36*Math.sin(time*.36),91+24*Math.cos(time*.39),.33);
 const scale=W<600&&H>W ? 1.55 : Math.min(W/610,H/520)*1.11;
 const side=P.tileSize*scale,cx=W*.50,cy=H*.50;
 c.save();c.shadowColor='rgba(0,0,0,.72)';c.shadowBlur=29;c.shadowOffsetY=19;
 c.imageSmoothingEnabled=true;
 c.drawImage(card.sprite,cx-side*.5,cy-side*.5,side,side);
 c.restore();
 P.drawBloom(c,card,cx,cy,side);
 c.fillStyle='rgba(222,207,164,.75)';c.font='11px monospace';
 if(W<600){c.fillText('WORK · ORIGINAL 3D / '+P.mesh.points.length+' VERTICES',16,H-17);}
 else{c.fillText('WORK · REAL 3D PLANCHET / '+P.mesh.points.length+' VERTICES',20,H-18);
 c.textAlign='right';c.fillText(P.tileSize+' px · CPU RASTER',W-20,H-18);c.textAlign='left';}
 const front=card.matrix[8]>=0;$('#cardSide').textContent=front?'正面 · 原画':'背面 · 压印';
 drawWire();state.renders++;state.drawAt=performance.now();
}
function drawWire(){
 const mesh=P.mesh,m=card.matrix,WW=wire.width,HH=wire.height;
 w.clearRect(0,0,WW,HH);w.fillStyle='#132019';w.fillRect(0,0,WW,HH);
 const scale=72;
 const verts=mesh.points.map(v=>{
  const x=m[0]*v[0]+m[1]*v[1]+m[2]*v[2],y=m[3]*v[0]+m[4]*v[1]+m[5]*v[2],z=m[6]*v[0]+m[7]*v[1]+m[8]*v[2];
  return [WW/2+x*scale,HH/2+(y*.82-z*.67)*scale,y*.67+z*.82];
 });
 const faces=mesh.faces.map(face=>({...face,depth:face.ids.reduce((sum,i)=>sum+verts[i][2],0)/face.ids.length}))
  .sort((a,b)=>a.depth-b.depth);
 for(const face of faces){
  w.beginPath();face.ids.forEach((id,i)=>{const v=verts[id];if(!i)w.moveTo(v[0],v[1]);else w.lineTo(v[0],v[1])});w.closePath();
  w.fillStyle=face.material<2?'rgba(69,82,58,.70)':'rgba(148,123,72,.67)';w.fill();
  if(state.wire){w.strokeStyle=face.material<2?'#c9b77e':'#9c885e';w.lineWidth=.74;w.stroke();}
 }
}
function animate(t){
 const dt=Math.min(.05,Math.max(0,(t-state.last)/1000||0));state.last=t;
 if(state.item!=='coin'&&state.ready){
  if(state.auto){state.yaw=-8+9*Math.sin(t*.00042);state.pitch=-9+3*Math.sin(t*.00033);
   state.roll=1.6*Math.sin(t*.00047);q();
  }
  if(state.dirty&&t-state.drawAt>110){draw();syncSliders();}
 }
 requestAnimationFrame(animate);
}
function resizeStage(){
 const narrow=window.matchMedia('(max-width: 780px)').matches;
 const W=narrow?540:820,H=narrow?650:620;
 if(stage.width!==W||stage.height!==H){stage.width=W;stage.height=H;state.dirty=true;}
 if(state.item!=='coin'&&state.ready)draw();
}
function bind(){
 window.addEventListener('resize',resizeStage,{passive:true});
 const canvas=stage;let drag=null;
 canvas.addEventListener('pointerdown',e=>{pause();drag={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;
  state.yaw=clamp(drag.yaw+(e.clientX-drag.x)*.77,-180,180);
  state.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.64,-75,75);
  q();syncSliders();
 });
 canvas.addEventListener('pointerup',()=>drag=null);
 canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('dblclick',()=>$('#cardReset').click());
 $('#cardYaw').addEventListener('input',e=>{pause();state.yaw=Number(e.target.value);q();syncSliders();});
 $('#cardPitch').addEventListener('input',e=>{pause();state.pitch=Number(e.target.value);q();syncSliders();});
 $('#cardAuto').addEventListener('click',()=>{state.auto=!state.auto;$('#cardAuto').textContent=state.auto?'Ⅱ 暂停自动展示':'▶ 自动展示';$('#cardAuto').setAttribute('aria-pressed',String(state.auto));});
 $('#cardFlip').addEventListener('click',()=>{pause();state.yaw=((state.yaw+360)%360)-180;q();syncSliders();});
 $('#cardReset').addEventListener('click',()=>{pause();state.yaw=-7;state.pitch=-9;state.roll=0;q();syncSliders();});
 $('#cardWireButton').addEventListener('click',()=>{state.wire=!state.wire;$('#cardWireButton').textContent=state.wire?'线框 · 开':'线框 · 关';drawWire();});
 window.addEventListener('popstate',()=>select(new URLSearchParams(location.search).get('item')||'coin',false));
}
buildPicker();bind();resizeStage();q();syncSliders();
select(new URLSearchParams(location.search).get('item')||'coin',false);
requestAnimationFrame(animate);
window.WorkMuseumQA={
 state:()=>({selected:state.item,count:all.length,coinVisible:!coinPane.hidden,cardVisible:!cardPane.hidden,
  cardReady:state.ready,artwork:state.artwork,vertices:P.mesh.points.length,faces:P.mesh.faces.length,
  meshAspect:(()=>{const xs=P.mesh.points.map(p=>p[0]),ys=P.mesh.points.map(p=>p[1]);return (Math.max(...xs)-Math.min(...xs))/(Math.max(...ys)-Math.min(...ys));})(),
  canvasSize:[stage.width,stage.height],yaw:state.yaw,back:card.matrix[8]<0,painted:card.buf?[...card.buf.data].filter((v,i)=>i%4===3&&v>0).length:0,renders:state.renders}),
 select:(id)=>select(id,true),setCardAngles:(yaw,pitch)=>{pause();state.yaw=yaw;state.pitch=pitch;q();draw();syncSliders();}
};
})();
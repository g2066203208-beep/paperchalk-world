/* Dungeon Elevator / V0.3 — paper plane scene + synchronized PC/mobile UI.
 * Two cameras share ONE 3D transform space, but scenery is strictly 2D planes.
 * Hand-painted SVG assets can be replaced with transparent PNGs without
 * changing transforms. No BoxGeometry, stones, prisms, or mesh modeling.
 */
import * as THREE from '../sphere-maze/vendor/three.module.js';
import {createShaftExterior} from './shaft-exterior.js';
const $=id=>document.getElementById(id);
const stage=$('viewport');
const previewStage=$('mini-viewport');
const state={depth:0,power:100,integrity:100,weight:0,capacity:350,passengers:0,seats:4,coins:150,serviceOpen:false,securityOpen:false,view:'door',emergencyUsed:false,moving:false,targetDepth:null,motionDirection:0};
const SIZE={w:7.2,h:3.85,d:6.6};
const MATERIAL={wall:0xa69a99,metal:0x756d70,trim:0x574f51,rust:0x9d7066,light:0xe8e0d2};
let renderer,previewRenderer,scene,camera,previewCamera,highLeaves=[],lowLeaves=[],renderPending=false,previous=0;
let exterior=null,ride=null;
const GOODS=[
 {id:'potion',name:'恢复药水',symbol:'◈',qty:5,mass:2,cost:12,price:30},
 {id:'food',name:'旅行干粮',symbol:'☷',qty:4,mass:1,cost:6,price:15},
 {id:'torch',name:'火把',symbol:'♜',qty:3,mass:2,cost:8,price:21},
 {id:'bandage',name:'绷带',symbol:'▥',qty:3,mass:1,cost:5,price:12},
 {id:'stone',name:'魔力矿石',symbol:'✦',qty:2,mass:4,cost:18,price:44},
 {id:'rope',name:'绳索',symbol:'⌁',qty:2,mass:3,cost:9,price:24}
];
let selectedGood='potion',cargoOverride=null,request=null,orderServed=false;
const doorView={position:new THREE.Vector3(0,1.85,0.35),target:new THREE.Vector3(0,1.65,-3.35),fov:64};
const cabinView={position:new THREE.Vector3(0,1.83,-3.06),target:new THREE.Vector3(0,1.65,2.45),fov:67};
let cameraTarget=doorView;
const cameraAim=new THREE.Vector3().copy(doorView.target);
function notice(message){$('notice').textContent=message}
const $good=id=>GOODS.find(g=>g.id===id);
function cargoUnits(){return GOODS.reduce((sum,g)=>sum+g.qty,0)}
function syncLoad(){
 if(cargoOverride!==null){state.weight=cargoOverride;return}
 state.weight=GOODS.reduce((sum,g)=>sum+g.qty*g.mass,0)+state.passengers*70;
}
function repaintHUD(){
 syncLoad();
 $('floor-label').textContent=state.depth===0?'地表 B0':'B'+String(state.depth).padStart(3,'0');
 $('power-label').textContent=state.power+'%';
 $('health-label').textContent=state.integrity+'%';
 $('weight-label').textContent=state.weight+' / '+state.capacity+' kg';
 $('weight-label').style.color=state.weight>state.capacity?'#a34137':'';
 $('weight-meter').style.width=Math.min(100,100*state.weight/state.capacity)+'%';
 $('weight-meter').style.background=state.weight>state.capacity?'#a34137':'#ae8c65';
 $('power-meter').style.width=state.power+'%';
 $('seats-label').textContent=state.passengers+' / '+state.seats;
 $('passenger-short').textContent=state.passengers+'/'+state.seats;
 $('money-label').textContent=state.coins+' G';
 $('cargo-label').textContent='库存 '+cargoUnits()+' / 24';
 $('service-label').textContent=(state.serviceOpen?'关闭':'开启')+'半高营业门';
 $('security-label').textContent=(state.securityOpen?'关闭':'开启')+'全高安全门';
 $('service-gate').setAttribute('aria-pressed',String(state.serviceOpen));
 $('security-gate').setAttribute('aria-pressed',String(state.securityOpen));
 $('door-status').textContent=state.serviceOpen||state.securityOpen?'门未锁闭 · 停止运行':'双门已锁闭';
 $('door-status').style.color=state.serviceOpen||state.securityOpen?'#924e40':'';
 $('emergency').disabled=(state.depth===0&&!state.moving)||state.emergencyUsed;
 for(const id of ['up','down','service-gate','security-gate'])$(id).disabled=state.moving;
 $('scene-floor').textContent=state.moving?((state.motionDirection>0?'↓ 下潜中':'↑ 上行中')+' · B'+String(state.targetDepth).padStart(3,'0')):(state.depth===0?'地表 · 补货站':'B'+String(state.depth).padStart(3,'0')+' · 地牢营业');
}
function repaintGoods(){
 const grid=$('stock-grid');grid.replaceChildren();
 for(const good of GOODS){
  const button=document.createElement('button');button.type='button';
  button.className='stock-item'+(good.id===selectedGood?' selected':'');
  button.dataset.good=good.id;button.setAttribute('aria-pressed',String(good.id===selectedGood));
  const icon=document.createElement('span');icon.className='goods-icon';icon.textContent=good.symbol;
  const label=document.createElement('span');label.className='goods-label';
  const name=document.createElement('span');name.className='goods-name';name.textContent=good.name;
  const qty=document.createElement('span');qty.className='goods-qty';qty.textContent='×'+good.qty+' · '+good.mass+'kg/件';
  label.append(name,qty);button.append(icon,label);
  button.addEventListener('click',()=>{selectedGood=good.id;repaintGoods();repaintRequest()});
  grid.append(button);
 }
}
const CUSTOMERS=['见习女剑士','地牢魔女','猫耳斥候','受伤圣职者','冒险者少女','巡逻女骑士'];
function prepareRequest(){
 orderServed=false;
 if(state.depth===0){request=null}
 else{
  const idx=(state.depth-1)%GOODS.length,good=GOODS[idx];
  const count=1+(state.depth%4===0?1:0);
  const price=count*(good.price+Math.floor(state.depth/3)*3);
  request={id:good.id,qty:count,price,customer:CUSTOMERS[(state.depth-1)%CUSTOMERS.length]};
 }
 repaintRequest();
}
function repaintRequest(){
 const good=$good(selectedGood);
 $('request-floor').textContent='B'+state.depth;
 if(state.depth===0){
  $('customer-name').textContent='地表补货站';
  $('customer-request').textContent='选中'+good.name+'，进货单价 '+good.cost+'G · 上限24件';
 }else if(orderServed){
  $('customer-name').textContent=request.customer;
  $('customer-request').textContent='这层的交易已结束，继续上行或下行。';
 }else{
  const want=$good(request.id);
  $('customer-name').textContent=request.customer;
  $('customer-request').textContent='需要 '+want.name+' ×'+request.qty+' · 收购报价 '+request.price+'G';
 }
 $('sell-request').disabled=state.moving||state.depth===0||orderServed||!request||$good(request.id).qty<request.qty;
 $('sell-request').textContent=state.depth===0?'等待顾客':orderServed?'已处理':request&&$good(request.id).qty<request.qty?'库存不足':'成交 +'+(request?.price||0)+'G';
 $('buy-selected').disabled=state.moving||state.depth!==0||state.coins<good.cost||cargoUnits()>=24||state.weight+good.mass>state.capacity;
 $('buy-selected').textContent=state.depth===0?'进货 -'+good.cost+'G':'地表进货';
 $('skip-request').disabled=state.moving||state.depth===0||orderServed;
}
function trade(){
 if(state.moving||!request||orderServed||state.depth===0)return;
 const good=$good(request.id);
 if(good.qty<request.qty){notice('库存不足，无法完成交易。');return}
 good.qty-=request.qty;state.coins+=request.price;orderServed=true;
 repaintHUD();repaintGoods();repaintRequest();
 notice('交易完成：'+request.customer+' 支付 '+request.price+' G。');
}
function buy(){
 if(state.moving||state.depth!==0)return;
 const good=$good(selectedGood);
 if(state.coins<good.cost){notice('金币不足。');return}
 if(cargoUnits()>=24||state.weight+good.mass>state.capacity){notice('货舱已满或超过电梯承重。');return}
 good.qty++;state.coins-=good.cost;cargoOverride=null;repaintHUD();repaintGoods();repaintRequest();
 notice('进货成功：'+good.name+' +1，花费 '+good.cost+' G。');
}
function skip(){
 if(state.moving||!request||orderServed)return;
 orderServed=true;repaintRequest();notice('已拒绝本层交易。');
}
function utility(title,message){
 $('utility-title').textContent=title;$('utility-content').textContent=message;$('utility-popover').hidden=false;
}
/* The scene is genuinely 3D space, but ALL its visible scenery is
 * zero-thickness, hand-painted 2D artwork on PlaneGeometry surfaces. */
const artStatus=new Map();
function loadedArt(name,ok){
 artStatus.set(name,ok?'ready':'failed');
 if(renderer&&previewRenderer)requestRender();
}
function artPaint(name,transparent=false){
 const texture=new THREE.TextureLoader().load('./paint/'+name,()=>loadedArt(name,true),undefined,()=>loadedArt(name,false));
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 return new THREE.MeshBasicMaterial({
  map:texture,transparent,alphaTest:transparent?.025:0,
  depthWrite:!transparent,side:THREE.DoubleSide,toneMapped:false
 });
}
function paper(parent,w,h,x,y,z,material,name,rx=0,ry=0){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
 mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,0);
 mesh.name=name;parent.add(mesh);return mesh;
}
function makeCabin(){
 const {w:W,h:H,d:D}=SIZE;
 const wall=artPaint('wall.svg'),floor=artPaint('floor.svg'),ceiling=artPaint('ceiling.svg');
 paper(scene,W,D,0,.012,0,floor,'paper-floor',-Math.PI/2);
 paper(scene,W,D,0,H-.008,0,ceiling,'paper-ceiling',Math.PI/2);
 paper(scene,W,H,0,H/2,D/2-.008,wall,'paper-back-wall');
 for(const sign of [-1,1]){
  paper(scene,D,H,sign*(W/2-.007),H/2,0,wall,sign===-1?'paper-left-wall':'paper-right-wall',0,Math.PI/2);
 }
 // The doorway has no volumetric arch or 3D beams; two 2D gate planes.
 const bright=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
 paper(scene,35,22,0,1.8,-9.7,bright,'paper-surface-white-fallback');
}
function makeHighGate(){
 const material=artPaint('high-gate-leaf.svg',true);
 const leafW=(SIZE.w-.32)/2;
 for(const sign of [-1,1]){
  const group=new THREE.Group();
  group.position.set(sign*leafW/2,0,-SIZE.d/2-.11);
  group.name='paper-security-leaf-'+sign;scene.add(group);
  paper(group,leafW,3.72,0,1.86,0,material,'flat-security-leaf-'+sign);
  highLeaves.push({group,base:sign*leafW/2,sign});
 }
}
function makeLowGate(){
 const material=artPaint('service-gate-leaf.svg',true);
 const leafW=(SIZE.w-.32)/2;
 for(const sign of [-1,1]){
  const group=new THREE.Group();
  group.position.set(sign*leafW/2,0,-SIZE.d/2+.17);
  group.name='paper-service-leaf-'+sign;scene.add(group);
  paper(group,leafW,1.72,0,.86,0,material,'flat-service-leaf-'+sign);
  lowLeaves.push({group,base:sign*leafW/2,sign});
 }
}
function setup(){
 if(!stage||!previewStage||!window.WebGL2RenderingContext)throw new Error('浏览器没有可用的 WebGL2 环境');
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
 const coarse=window.matchMedia('(pointer:coarse)').matches;
 const pixelRatio=Math.min(window.devicePixelRatio||1,coarse?1.25:1.55);
 for(const r of [renderer,previewRenderer]){
  r.setPixelRatio(r===previewRenderer?Math.min(pixelRatio,1.0):pixelRatio);
  r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor(0xffffff);
 }
 scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
 camera=new THREE.PerspectiveCamera(doorView.fov,1,.06,80);
 camera.position.copy(doorView.position);
 previewCamera=new THREE.PerspectiveCamera(cabinView.fov,1,.06,80);
 previewCamera.position.copy(cabinView.position);previewCamera.lookAt(cabinView.target);
 scene.add(new THREE.HemisphereLight(0xe8e1dc,0xaaa2a0,2));
 const sun=new THREE.DirectionalLight(0xffffff,1.1);sun.position.set(-2.3,5.5,2.1);scene.add(sun);
 makeCabin();makeHighGate();makeLowGate();
 exterior=createShaftExterior(THREE,scene,loadedArt);exterior.setFloor(state.depth);
 stage.appendChild(renderer.domElement);previewStage.appendChild(previewRenderer.domElement);
 prepareRequest();bindControls();repaintHUD();repaintGoods();resize();requestRender();
}
function resize(){
 if(!renderer||!previewRenderer)return;
 for(const [r,c,element] of [[renderer,camera,stage],[previewRenderer,previewCamera,previewStage]]){
  const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);
  r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix();
 }
 requestRender();
}
function frame(now){
 renderPending=false;
 const dt=Math.min(.05,previous?(now-previous)/1000:.016);previous=now;
 const k=Math.min(1,dt*10);
 let active=false;
 for(const leaf of highLeaves){
  const end=leaf.base+(state.securityOpen?leaf.sign*3.62:0);
  leaf.group.position.x+=(end-leaf.group.position.x)*k;
  if(Math.abs(end-leaf.group.position.x)>.008)active=true;else leaf.group.position.x=end;
 }
 for(const leaf of lowLeaves){
  const end=leaf.base+(state.serviceOpen?leaf.sign*3.62:0);
  leaf.group.position.x+=(end-leaf.group.position.x)*k;
  if(Math.abs(end-leaf.group.position.x)>.008)active=true;else leaf.group.position.x=end;
 }
 if(ride){exterior.update(dt);if(now-ride.started>=ride.duration){finishRide()}else active=true;}
 camera.position.lerp(cameraTarget.position,k);
 cameraAim.lerp(cameraTarget.target,k);
 camera.fov+=(cameraTarget.fov-camera.fov)*k;
 if(camera.position.distanceTo(cameraTarget.position)>.005||cameraAim.distanceTo(cameraTarget.target)>.005||Math.abs(camera.fov-cameraTarget.fov)>.03)active=true;
 camera.lookAt(cameraAim);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 previewRenderer.render(scene,previewCamera);
 if(active)requestRender();
}
function requestRender(){if(renderPending||!renderer||!previewRenderer)return;renderPending=true;requestAnimationFrame(frame)}
function switchView(view){
 state.view=view==='cabin'?'cabin':'door';
 cameraTarget=state.view==='door'?doorView:cabinView;
 const other=state.view==='door'?cabinView:doorView;
 previewCamera.position.copy(other.position);previewCamera.fov=other.fov;
 previewCamera.lookAt(other.target);previewCamera.updateProjectionMatrix();
 $('main-camera-label').textContent=state.view==='door'?'01 / 电梯门':'02 / 电梯内部';
 $('preview-camera-label').textContent=state.view==='door'?'02 / 电梯内部':'01 / 电梯门';
 document.querySelector('.main-camera-help').textContent=state.view==='door'?'电梯营业窗口':'电梯乘客空间';
 $('scene-camera-hint').textContent=state.view==='door'?'停靠看上下岩层；行驶时岩土连续滚动':'空电梯3D方盒子，人员与货物素材暂未加入';
 notice(state.view==='door'?'已切换：左侧门口主镜头，右上内部小镜头。':'已切换：左侧电梯内部主镜头，右上门口小镜头。');
 requestRender();
}
function toggleService(){if(state.moving)return;state.serviceOpen=!state.serviceOpen;repaintHUD();notice(state.serviceOpen?'半高营业门已打开，电梯禁止行驶。':'半高营业门已关闭。');requestRender()}
function toggleSecurity(){if(state.moving)return;state.securityOpen=!state.securityOpen;repaintHUD();notice(state.securityOpen?'全高安全门已打开，危险层请谨慎！':'全高安全门已关闭。');requestRender()}
function beginRide(target,direction,duration,emergencyRide=false){
 state.moving=true;state.targetDepth=target;state.motionDirection=direction;
 ride={target,direction,duration,started:performance.now(),emergencyRide};
 exterior.setTraveling(true,direction);
 repaintHUD();repaintRequest();
 $('scene-camera-hint').textContent='门外岩土正沿电梯行驶的反方向移动';
 notice(emergencyRide?'紧急回收绞盘启动：岩层正在向下掠过门外。':direction>0?'电梯下潜中：门外地层正在向上掠过。':'电梯上行中：门外地层正在向下掠过。');
 requestRender();return true;
}
function finishRide(){
 if(!ride)return;
 const result=ride;ride=null;
 state.depth=result.target;state.moving=false;state.targetDepth=null;state.motionDirection=0;
 exterior.setTraveling(false);exterior.setFloor(state.depth);
 prepareRequest();repaintHUD();
 $('scene-camera-hint').textContent=state.depth===0?'地表外景仍保持纯白':'门外只保留停靠层的上、下岩壁与空出入口';
 notice(result.emergencyRide?'紧急返回地表成功，耗损耐久8点，本次应急装置已使用。':'已停靠 '+(state.depth===0?'地表':'B'+String(state.depth).padStart(3,'0'))+'。打开门可观察本层岩土开口。');
 requestRender();
}
function travel(delta){
 if(state.moving){notice('电梯正在运行，请等待到站。');return false}
 if(state.serviceOpen||state.securityOpen){notice('请先关闭半高营业门和全高安全门。');return false}
 if(state.weight>state.capacity||state.passengers>state.seats){notice('电梯超载，无法运行。');return false}
 if(state.integrity<=0){notice('电梯耐久不足，请先维修。');return false}
 if(delta<0&&state.depth===0){notice('已经抵达地表。');return false}
 const next=Math.max(0,state.depth+delta),cost=2+Math.floor(next/12);
 if(state.power<cost){notice('电力不足，无法移动。可使用紧急回地表。');return false}
 state.power-=cost;return beginRide(next,delta,1750);
}
function emergency(){
 if(state.depth===0||state.emergencyUsed)return false;
 state.emergencyUsed=true;state.serviceOpen=false;state.securityOpen=false;
 state.integrity=Math.max(1,state.integrity-8);state.power=Math.max(0,state.power-15);
 return beginRide(0,-1,2300,true);
}
function bindControls(){
 $('up').addEventListener('click',()=>travel(-1));$('down').addEventListener('click',()=>travel(1));
 $('service-gate').addEventListener('click',toggleService);$('security-gate').addEventListener('click',toggleSecurity);
 $('emergency').addEventListener('click',emergency);
 $('swap-camera').addEventListener('click',()=>switchView(state.view==='door'?'cabin':'door'));
 $('sell-request').addEventListener('click',trade);$('buy-selected').addEventListener('click',buy);
 $('skip-request').addEventListener('click',skip);
 $('utility-passengers').addEventListener('click',()=>utility('电梯乘客','乘客 '+state.passengers+'/'+state.seats+' 名。可承载乘客的静态立绘与任务将在后续版本接入。'));
 $('utility-quests').addEventListener('click',()=>utility('委托任务','后续将接入救援、载客和送货委托。当前尚未生成可接取的任务。'));
 $('utility-repair').addEventListener('click',()=>{
  if(state.moving||state.depth!==0){utility('维修','只能在地表停靠后维修。');return}
  if(state.integrity===100){notice('电梯耐久已满，无需维修。');return}
  if(state.coins<20){notice('维修需要20G，金币不足。');return}
  state.coins-=20;state.integrity=Math.min(100,state.integrity+20);
  repaintHUD();notice('地表维修完成，耐久恢复20点，花费20G。');
 });
 $('utility-info').addEventListener('click',()=>utility('游玩说明','左侧为电梯主画面；点击右上角实时小镜头交换内外视角。\n双门关闭才能运行，↓ 下潜、↑ 上行，每层有顾客需求。右侧货舱可以查看库存，地表可以点货格进货。\n按 V 也可切换镜头。'));
 $('utility-close').addEventListener('click',()=>$('utility-popover').hidden=true);
 $('game-fullscreen')?.addEventListener('click',async()=>{
  const target=document.documentElement;
  try{
   if(document.fullscreenElement){await document.exitFullscreen();}
   else if(target.requestFullscreen){await target.requestFullscreen({navigationUI:'hide'});}
   else notice('本设备请将游戏添加到主屏幕以全屏游玩。');
   if(screen.orientation?.lock&&document.fullscreenElement){await screen.orientation.lock('landscape').catch(()=>{});}
  }catch(_){notice('请使用手机横屏，或将游戏添加到主屏幕启动。');}
 });

 window.addEventListener('resize',resize,{passive:true});
 window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.code==='ArrowUp'){e.preventDefault();travel(-1)}
  if(e.code==='ArrowDown'){e.preventDefault();travel(1)}
  if(e.code==='KeyV')switchView(state.view==='door'?'cabin':'door');
  if(e.code==='Escape')$('utility-popover').hidden=true;
 });
 document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)requestRender()});
}
window.DungeonElevatorDemo=Object.freeze({
 getState:()=>({...state,goods:GOODS.map(g=>({id:g.id,qty:g.qty})),request:request?{...request}:null,orderServed}),
 getShaftState:()=>exterior?.getState()??null,
 getRenderStats:()=>{const types={};let count=0;scene?.traverse(node=>{if(node.isMesh){count++;types[node.geometry.type]=(types[node.geometry.type]||0)+1}});return {meshes:count,geometries:types,art:Object.fromEntries(artStatus),rendererCount:2}},
 setLoad:(weight,passengers)=>{cargoOverride=Math.max(0,Math.floor(Number(weight)||0));state.passengers=Math.max(0,Math.floor(Number(passengers)||0));repaintHUD();repaintRequest()},
 setView:switchView,
 swap:()=>switchView(state.view==='door'?'cabin':'door')
});
try{setup()}catch(error){
 console.error('[dungeon-elevator] 3D scene startup failed',error);
 $('fallback').hidden=false;$('fallback').textContent='3D 电梯无法启动：'+(error?.message||'浏览器渲染失败');
 $('notice').textContent='场景渲染不可用；请检查 WebGL2 与浏览器兼容性。';
}
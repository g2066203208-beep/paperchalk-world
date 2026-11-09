/* Dungeon Elevator / V0.1 — genuine Three.js box-room prototype.
 * Two static-look cameras share ONE 3D cabin. The service half-gate and the
 * full-height security gate are separate meshes with separate controls.
 * Character/shop scenes intentionally remain empty until artwork is approved.
 * The outside is WHITE, by design; floor art is not fabricated.
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
function seeded(seed){let s=seed|0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%10000)/10000}}
function texture(type){
 const c=document.createElement('canvas');c.width=1024;c.height=512;
 const g=c.getContext('2d');const r=seeded(type==='floor'?1557:type==='wall'?6007:1991);
 if(type==='floor'){g.fillStyle='#a19a98';g.fillRect(0,0,1024,512);
  g.strokeStyle='#736f73';g.lineWidth=4;
  for(let x=0;x<=1024;x+=256){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke()}
  for(let y=0;y<=512;y+=128){g.beginPath();g.moveTo(0,y);g.lineTo(1024,y);g.stroke()}
  g.fillStyle='#c1aaa0';for(let y=9;y<512;y+=32)for(let x=11;x<1024;x+=38){g.beginPath();g.arc(x,y,1.4,0,7);g.fill()}
 }else if(type==='half'){g.fillStyle='#b7aaa6';g.fillRect(0,0,1024,512);
  g.fillStyle='#b3a08f';g.fillRect(0,30,1024,75);
  g.fillStyle='#807778';g.fillRect(0,27,1024,8);g.fillRect(0,105,1024,8);
  for(let x=-120;x<1100;x+=92){g.fillStyle=x%2?'#c8aa74':'#8f8080';g.beginPath();g.moveTo(x,33);g.lineTo(x+45,33);g.lineTo(x-18,102);g.lineTo(x-63,102);g.fill()}
  g.strokeStyle='#6e6869';g.lineWidth=3;g.strokeRect(9,7,1006,498);
 }else{g.fillStyle='#b3a8a5';g.fillRect(0,0,1024,512);
  g.strokeStyle='#807a7d';g.lineWidth=4;
  for(let x=4;x<1024;x+=256){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke()}
  g.strokeStyle='#d2c1b5';g.lineWidth=2;
  for(let x=8;x<1024;x+=256){g.beginPath();g.moveTo(x,0);g.lineTo(x,512);g.stroke()}
 }
 // Authored 2D weathering: subtle paint chips rather than glossy fantasy PBR.
 for(let i=0;i<190;i++){let x=r()*1024,y=r()*512,w=2+r()*23,h=1+r()*7;
  g.fillStyle=i%4===0?'rgba(130,76,65,.17)':'rgba(239,217,199,.19)';
  g.beginPath();g.moveTo(x,y);g.lineTo(x+w,y-2);g.lineTo(x+w*.71,y+h);g.lineTo(x,y+h*.55);g.fill();
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function flat(color){return new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide})}
function cube(parent,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
function panel(parent,w,h,x,y,z,rot,tex){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide}));
 mesh.position.set(x,y,z);mesh.rotation.y=rot||0;parent.add(mesh);return mesh;
}
function beam(parent,x1,y1,x2,y2,depth,z,mat){
 const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
 const el=cube(parent,depth,len,.07,(x1+x2)/2,(y1+y2)/2,z,mat);
 el.rotation.z=-Math.atan2(dx,dy);return el;
}
function makeCabin(){
 const W=SIZE.w,H=SIZE.h,D=SIZE.d;
 const walltex=texture('wall'),floortex=texture('floor');
 const wallMat=new THREE.MeshLambertMaterial({map:walltex,side:THREE.DoubleSide});
 const floorMat=new THREE.MeshLambertMaterial({map:floortex,side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),floorMat);
 floor.rotation.x=-Math.PI/2;floor.position.y=.012;scene.add(floor);
 const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,D),wallMat);
 ceil.rotation.x=Math.PI/2;ceil.position.y=H;scene.add(ceil);
 const back=new THREE.Mesh(new THREE.PlaneGeometry(W,H),wallMat);
 back.position.set(0,H/2,D/2);scene.add(back);
 for(let sign of [-1,1]){
  const side=new THREE.Mesh(new THREE.PlaneGeometry(D,H),wallMat);
  side.rotation.y=Math.PI/2;side.position.set(sign*W/2,H/2,0);scene.add(side);
  const dark=flat(MATERIAL.trim),metal=flat(MATERIAL.metal);
  cube(scene,.13,H,.13,sign*(W/2-.08),H/2,D/2-.06,dark);
  cube(scene,.13,H,.13,sign*(W/2-.08),H/2,-D/2+.07,dark);
  cube(scene,.12,.07,D,sign*(W/2-.045),.98,0,metal);
  // The interior camera should show an EMPTY floor, not crates, shelves, or a counter.
 }
 const trim=flat(MATERIAL.metal),dark=flat(MATERIAL.trim);
 cube(scene,W,.12,.17,0,H-.06,-D/2,trim);
 cube(scene,W,.13,.19,0,.065,-D/2,dark);
 for(let sign of [-1,1])cube(scene,.17,H,.21,sign*(W/2-.06),H/2,-D/2,trim);
 // One practical industrial ceiling fixture, drawn as a flat non-glossy fitting.
 cube(scene,1.22,.07,.4,0,H-.10,-.35,dark);
 cube(scene,1.03,.035,.3,0,H-.145,-.35,flat(0xf0dfbe));
 const out=new THREE.Mesh(new THREE.PlaneGeometry(35,22),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));
 out.position.set(0,1.8,-9.2);scene.add(out);
}
function makeHighGate(){
 const metal=flat(MATERIAL.metal),trim=flat(MATERIAL.trim),rust=flat(MATERIAL.rust);
 const leafW=(SIZE.w-.32)/2;
 for(let sign of [-1,1]){
  const group=new THREE.Group();group.position.set(sign*leafW/2,0,-SIZE.d/2-.11);scene.add(group);
  const left=-leafW/2+.05,right=leafW/2-.05,low=.10,high=3.64;
  for(let x of [left,right])cube(group,.075,high-low,.09,x,(low+high)/2,0,trim);
  for(let y of [low,1.35,2.55,high])cube(group,leafW,.07,.08,0,y,0,metal);
  for(let x=left+.42;x<right-.1;x+=.55)cube(group,.045,high-low,.055,x,(low+high)/2,0,metal);
  for(let y=.17;y<3.5;y+=1.1){
   for(let x=left;x<right-.16;x+=1.1){beam(group,x,y,x+1.1,y+1.0,.06,0.045,rust);
    beam(group,x,y+1,x+1.1,y,.06,0.045,metal);}
  }
  cube(group,.13,.38,.11,sign<0?right-.12:left+.12,1.7,.12,rust);
  highLeaves.push({group,base:sign*leafW/2,sign});
 }
}
function makeLowGate(){
 const m=flat(MATERIAL.metal),dark=flat(MATERIAL.trim),panelTex=texture('half');
 const W=(SIZE.w-.32)/2;
 for(const sign of [-1,1]){
  const group=new THREE.Group();group.position.set(sign*W/2,0,-SIZE.d/2+.17);scene.add(group);
  panel(group,W-.09,.91,0,.49,.015,0,panelTex);
  for(let x of [-W/2+.03,W/2-.03])cube(group,.07,1.65,.10,x,.825,0,dark);
  for(let y of [.06,.94,1.62])cube(group,W,.075,.1,0,y,0,m);
  for(let x=-W/2+.35;x<W/2-.1;x+=.45)cube(group,.052,.65,.07,x,1.28,.03,m);
  cube(group,.25,.16,.12,sign<0?W/2-.16:-W/2+.16,.97,.12,dark);
  lowLeaves.push({group,base:sign*W/2,sign});
 }
}
function setup(){
 if(!stage||!previewStage||!window.WebGL2RenderingContext)throw new Error('浏览器没有可用的 WebGL2 环境');
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 previewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
 const pixelRatio=Math.min(window.devicePixelRatio||1,1.55);
 for(const r of [renderer,previewRenderer]){
  r.setPixelRatio(pixelRatio);r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor(0xffffff);
 }
 scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
 camera=new THREE.PerspectiveCamera(doorView.fov,1,.06,80);
 camera.position.copy(doorView.position);
 previewCamera=new THREE.PerspectiveCamera(cabinView.fov,1,.06,80);
 previewCamera.position.copy(cabinView.position);previewCamera.lookAt(cabinView.target);
 scene.add(new THREE.HemisphereLight(0xe8e1dc,0xaaa2a0,2));
 const sun=new THREE.DirectionalLight(0xffffff,1.1);sun.position.set(-2.3,5.5,2.1);scene.add(sun);
 makeCabin();makeHighGate();makeLowGate();
 exterior=createShaftExterior(THREE,scene);exterior.setFloor(state.depth);
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
 setLoad:(weight,passengers)=>{cargoOverride=Math.max(0,Math.floor(Number(weight)||0));state.passengers=Math.max(0,Math.floor(Number(passengers)||0));repaintHUD();repaintRequest()},
 setView:switchView,
 swap:()=>switchView(state.view==='door'?'cabin':'door')
});
try{setup()}catch(error){
 console.error('[dungeon-elevator] 3D scene startup failed',error);
 $('fallback').hidden=false;$('fallback').textContent='3D 电梯无法启动：'+(error?.message||'浏览器渲染失败');
 $('notice').textContent='场景渲染不可用；请检查 WebGL2 与浏览器兼容性。';
}
/* Paperchalk World — real Three.js model of three independently moving
 * concentric spherical mazes. Standalone /sphere-maze/, not the game scene.
 * Geometry = connected icosphere tiles + radial raised maze walls +
 * navigable path graph + two physical inter-shell docking shafts.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';

const M=window.SphericalMazeCore;
if(!M)throw new Error('SphericalMazeCore not loaded');
const $=id=>document.getElementById(id);
const stage=$('stage');
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
const clock=new THREE.Clock();
const CUT_DIR=new THREE.Vector3(.45,.37,.81).normalize();
const RING_COLORS=[0x8bd1cf,0xe3bb91,0xb8a6e0];
const RING_DARK=[0x376a6d,0x87674a,0x62588e];
const GATE_DIRECTIONS=[
 new THREE.Vector3(-.34,.54,.77).normalize(),
 new THREE.Vector3(.47,-.46,.76).normalize()
];
const config={day:1,seed:43057,cutaway:true,paths:true,spin:false,separation:0,isolated:-1};
const layerObjects=[];
const floorPickers=[];
let worldAnimation=null,selected=null,renderedFrames=0,clickStart=null;
let fallback=null;
let renderer,scene,camera,controls,centralCore;
const bridges=[];

function startup(){
 try{
  if(!stage||!window.WebGL2RenderingContext)throw Error('当前浏览器未启用 WebGL 2，无法显示真正的三维模型。');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.4;
  renderer.setClearColor(0x070e16,0);
  renderer.setSize(stage.clientWidth||window.innerWidth,stage.clientHeight||window.innerHeight);
  stage.appendChild(renderer.domElement);
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(42,1,.15,200);
  camera.position.set(29,18,37);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,0,0);
  controls.enableDamping=true;controls.dampingFactor=.085;
  controls.enablePan=false;
  controls.minDistance=18;
  controls.maxDistance=95;
  controls.minPolarAngle=.12;
  controls.maxPolarAngle=Math.PI-.12;
  controls.update();
  const ambient=new THREE.HemisphereLight(0xbedfe4,0x223343,1.45);
  scene.add(ambient);
  const key=new THREE.DirectionalLight(0xe6ffff,2.1);
  key.position.set(17,23,32);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8e96db,1.2);
  rim.position.set(-22,-4,-20);scene.add(rim);
  scene.add(new THREE.AmbientLight(0xb8c6dd,.15));
  makeStars();
  centralCore=makeCore();
  for(let i=0;i<M.LEVELS;i++){
   const pivot=new THREE.Group();
   pivot.name='SHELL_'+(i+1);
   scene.add(pivot);
   layerObjects.push({pivot,content:null,info:null,gateMarkers:{},floor:null});
  }
  makeBridges();
  buildDay(false);
  bind();
  resize();
  new ResizeObserver(resize).observe(stage);
  requestAnimationFrame(frame);
  $('loading').hidden=true;
  window.SphericalMazeViewer=Object.freeze({
   get state(){return {...config}},
   get model(){return layerObjects.map(x=>x.info)},
   nextDay,resetWorld,selectLayer,resetCamera,
   get renderCount(){return renderedFrames}
  });
 }catch(error){
  console.error('[Spherical maze] failed:',error);
  $('loading').hidden=true;
  $('load-error').textContent='模型无法启动：'+error.message;
  $('load-error').hidden=false;
 }
}
function disposeGroup(group){
 if(!group)return;
 group.traverse(object=>{
  if(object.geometry)object.geometry.dispose();
  if(object.material){
   for(const m of Array.isArray(object.material)?object.material:[object.material])
    if(m?.dispose)m.dispose();
  }
 });
 group.removeFromParent();
}
function vec(arr){return new THREE.Vector3(arr[0],arr[1],arr[2])}
function scale(arr,r){return new THREE.Vector3(arr[0]*r,arr[1]*r,arr[2]*r)}
function qFor(index,day){
 return new THREE.Quaternion().setFromAxisAngle(vec(M.AXES[index]).normalize(),M.dailyAngles(day)[index]);
}
function makeStars(){
 let seed=1876;
 function rand(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296}
 const points=[];
 for(let i=0;i<430;i++){
  const a=rand()*Math.PI*2,c=rand()*2-1,r=48+rand()*44;
  points.push(r*Math.sqrt(1-c*c)*Math.cos(a),r*c,r*Math.sqrt(1-c*c)*Math.sin(a));
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const stars=new THREE.Points(geometry,new THREE.PointsMaterial({
  color:0xb4d3d5,size:.07,transparent:true,opacity:.49,sizeAttenuation:true,
  depthWrite:false
 }));
 stars.name='DISTANT_DUST';scene.add(stars);
}
function makeCore(){
 const grp=new THREE.Group();
 const dark=new THREE.Mesh(new THREE.IcosahedronGeometry(2.05,3),
  new THREE.MeshStandardMaterial({color:0x161a2a,metalness:.72,roughness:.36,
   flatShading:true,emissive:0x302238,emissiveIntensity:.43}));
 grp.add(dark);
 const wire=new THREE.LineSegments(new THREE.EdgesGeometry(
  new THREE.IcosahedronGeometry(2.10,1)),
  new THREE.LineBasicMaterial({color:0xe8b28c,transparent:true,opacity:.58}));
 grp.add(wire);
 const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.42),
  new THREE.MeshBasicMaterial({color:0xf5bc8f}));
 crystal.name='CORE_CRYSTAL';
 grp.add(crystal);
 const aura=new THREE.Mesh(new THREE.SphereGeometry(2.35,24,16),
  new THREE.MeshBasicMaterial({color:0xa06977,transparent:true,opacity:.055,
   depthWrite:false,side:THREE.BackSide}));
 grp.add(aura);
 grp.name='WORLD_CORE';
 scene.add(grp);
 return grp;
}
function surfaceVisible(cell){
 return !config.cutaway||M.dot(cell.center,CUT_DIR.toArray())<=.47;
}
function makeFloor(layer,info,group){
 const positions=[],colors=[],faceIds=[];
 const color1=new THREE.Color();
 const base=new THREE.Color(RING_COLORS[layer]);
 for(const cell of info.cells){
  if(!surfaceVisible(cell))continue;
  const tint=new THREE.Color(M.COLORS[cell.district]);
  color1.copy(base).lerp(tint,.27);
  const modulation=.86+((cell.id*37+info.day*29)%17)*.011;
  color1.multiplyScalar(modulation);
  for(const v of cell.vertices){
   const p=scale(v,info.radius);
   positions.push(p.x,p.y,p.z);
   colors.push(color1.r,color1.g,color1.b);
  }
  faceIds.push(cell.id);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
  vertexColors:true,side:THREE.DoubleSide,transparent:true,
  opacity:config.cutaway?.37:.24,depthWrite:false,
  metalness:.48,roughness:.56,emissive:new THREE.Color(RING_DARK[layer]),
  emissiveIntensity:.10,flatShading:true
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name='WALKABLE_ICO_FLOOR_'+(layer+1);
 mesh.userData.layer=layer;
 mesh.userData.faceIds=faceIds;
 mesh.userData.isMazeFloor=true;
 mesh.renderOrder=10-layer;
 group.add(mesh);
 return mesh;
}
function makeWalls(layer,info,group){
 const h=[.75,.62,.52][layer];
 const thickness=[.13,.12,.095][layer];
 const walls=info.edges.filter(e=>!e.open&&
  surfaceVisible(info.cells[e.left])&&surfaceVisible(info.cells[e.right]));
 const material=new THREE.MeshStandardMaterial({
  color:RING_COLORS[layer],metalness:.52,roughness:.36,
  emissive:RING_DARK[layer],emissiveIntensity:.42,
  transparent:true,opacity:config.cutaway?.91:.73,side:THREE.DoubleSide,
  depthWrite:true
 });
 const geo=new THREE.BoxGeometry(1,1,1);
 const inst=new THREE.InstancedMesh(geo,material,walls.length);
 inst.name='RAISED_RADIAL_MAZE_WALLS_'+(layer+1);
 inst.frustumCulled=false;
 const dummy=new THREE.Object3D(),a=new THREE.Vector3(),b=new THREE.Vector3();
 const x=new THREE.Vector3(),y=new THREE.Vector3(),z=new THREE.Vector3();
 const basis=new THREE.Matrix4();
 walls.forEach((e,i)=>{
  a.copy(scale(e.a,info.radius));b.copy(scale(e.b,info.radius));
  x.copy(b).sub(a).normalize();
  y.copy(a).add(b).normalize();
  z.copy(x).cross(y).normalize();
  x.copy(y).cross(z).normalize();
  basis.makeBasis(x,y,z);
  dummy.position.copy(y).multiplyScalar(info.radius+h*.48);
  dummy.quaternion.setFromRotationMatrix(basis);
  dummy.scale.set(a.distanceTo(b)*.91,h,thickness);
  dummy.updateMatrix();
  inst.setMatrixAt(i,dummy.matrix);
 });
 inst.instanceMatrix.needsUpdate=true;
 group.add(inst);
 return inst;
}
function makeOpenPaths(layer,info,group){
 const verts=[];
 const r=info.radius+.065;
 for(const edge of info.edges){
  if(!edge.open||
   !surfaceVisible(info.cells[edge.left])||
   !surfaceVisible(info.cells[edge.right]))continue;
  const a=scale(info.cells[edge.left].center,r);
  const b=scale(info.cells[edge.right].center,r);
  const center=scale(edge.center,r);
  verts.push(a.x,a.y,a.z,center.x,center.y,center.z,
   center.x,center.y,center.z,b.x,b.y,b.z);
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 const lines=new THREE.LineSegments(geom,new THREE.LineBasicMaterial({
  color:RING_COLORS[layer],transparent:true,opacity:.75,depthWrite:false
 }));
 lines.name='OPEN_MAZE_PASSAGES_'+(layer+1);
 lines.renderOrder=16;
 lines.visible=config.paths;
 group.add(lines);
 return lines;
}
function makeArcGrid(info,group){
 // A fine secondary rim makes the orientation of each sphere visible.
 const radius=info.radius+.1;
 const pieces=[];
 const N=90;
 for(let i=0;i<N;i++){
  const t=i*2*Math.PI/N,u=(i+1)*2*Math.PI/N;
  pieces.push(radius*Math.cos(t),0,radius*Math.sin(t),
   radius*Math.cos(u),0,radius*Math.sin(u));
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(pieces,3));
 const line=new THREE.LineSegments(geom,new THREE.LineBasicMaterial({
  color:RING_COLORS[info.layer],transparent:true,opacity:.22,depthWrite:false
 }));
 line.rotation.set(.49,.31,-.18);
 line.name='SHELL_ORIENTATION_GUIDE';
 group.add(line);
}
function makeDistrictPins(layer,info,group){
 const representative=new Map();
 for(const cell of info.cells){
  if(!surfaceVisible(cell))continue;
  if(!representative.has(cell.zone))representative.set(cell.zone,cell);
 }
 const shape=new THREE.OctahedronGeometry(.12,0);
 const material=new THREE.MeshBasicMaterial({color:RING_COLORS[layer]});
 const inst=new THREE.InstancedMesh(shape,material,representative.size);
 const obj=new THREE.Object3D();
 let n=0;
 for(const cell of representative.values()){
  obj.position.copy(scale(cell.center,info.radius+.20));
  obj.scale.setScalar(.75+cell.district*.10);
  obj.updateMatrix();inst.setMatrixAt(n++,obj.matrix);
 }
 inst.instanceMatrix.needsUpdate=true;
 inst.name='MOVING_DISTRICT_MARKERS';
 group.add(inst);
}
function addPortal(layer,info,group,id,kind){
 const cell=info.cells[id];
 const normal=vec(cell.center);
 const holder=new THREE.Group();
 holder.position.copy(normal).multiplyScalar(info.radius+.18);
 holder.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
 holder.name='PORTAL_'+kind+'_'+(layer+1);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.38,.085,7,28),
  new THREE.MeshBasicMaterial({
   color:kind==='entrance'?0xf7d4a0:0x91ece1,
   transparent:true,opacity:.98,depthWrite:false
  }));
 ring.name='PORTAL_HOOP';holder.add(ring);
 const pin=new THREE.Mesh(new THREE.CylinderGeometry(.085,.14,.35,8),
  new THREE.MeshStandardMaterial({color:0xffffff,emissive:kind==='entrance'?0xd9a46d:0x5fc2b8,
   emissiveIntensity:1.8,metalness:.45,roughness:.25}));
 pin.rotation.x=Math.PI*.5;
 holder.add(pin);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.54,.016,5,36),
  new THREE.MeshBasicMaterial({color:kind==='entrance'?0xd5b389:0x76c9c4,
   transparent:true,opacity:.50,depthWrite:false}));
 holder.add(halo);
 group.add(holder);
 return holder;
}
function nearestFace(info,level,worldDirection){
 const quaternion=qFor(level,info.day);
 const p=new THREE.Vector3(),wanted=worldDirection;
 let best=-Infinity,id=0;
 for(const cell of info.cells){
  p.copy(vec(cell.center)).applyQuaternion(quaternion);
  const score=p.dot(wanted);
  if(score>best){best=score;id=cell.id;}
 }
 return id;
}
function pathBetween(info,startId,finishId){
 const prior=new Int32Array(info.cells.length);
 prior.fill(-1);
 const queue=[startId],seen=new Uint8Array(info.cells.length);
 seen[startId]=1;
 for(let q=0;q<queue.length;q++){
  const cell=info.cells[queue[q]];
  if(cell.id===finishId)break;
  for(const eid of cell.neighborEdges){
   const edge=info.edges[eid];
   if(!edge.open)continue;
   const next=edge.left===cell.id?edge.right:edge.left;
   if(seen[next])continue;
   seen[next]=1;prior[next]=cell.id;queue.push(next);
  }
 }
 if(!seen[finishId])throw Error('Generated maze has no route to next layer');
 const route=[finishId];
 while(route[0]!==startId)route.unshift(prior[route[0]]);
 return route;
}
function routeGeometry(info,ids,group){
 if(!ids||ids.length<2)return;
 const points=[];
 for(const id of ids){
  const center=vec(info.cells[id].center);
  const shifted=center.multiplyScalar(info.radius+.22);
  points.push(shifted);
 }
 // The highlighted thread is actual graph edges, never straight through walls.
 const geom=new THREE.BufferGeometry().setFromPoints(points);
 const thread=new THREE.Line(geom,new THREE.LineBasicMaterial({
  color:0xf3d49b,transparent:true,opacity:.95,depthWrite:false
 }));
 thread.name='VERIFIED_ROUTE_TO_CENTER';
 thread.visible=config.paths;
 thread.renderOrder=20;
 group.add(thread);
 const start=points[0],end=points[points.length-1];
 for(const p of [start,end]){
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.18),
   new THREE.MeshBasicMaterial({color:0xf5d298}));
  marker.position.copy(p);marker.visible=config.paths;group.add(marker);
 }
 return thread;
}
function createLayerContent(index,day){
 const slot=layerObjects[index],info=M.generateLayer({day,layer:index,seed:config.seed});
 if(slot.content)disposeGroup(slot.content);
 const content=new THREE.Group();
 content.name='DAY_'+day+'_LAYER_'+(index+1);
 slot.pivot.add(content);
 slot.content=content;slot.info=info;
 slot.floor=makeFloor(index,info,content);
 makeWalls(index,info,content);
 makeOpenPaths(index,info,content);
 makeArcGrid(info,content);
 makeDistrictPins(index,info,content);
 slot.gateMarkers={};
 return slot;
}
function makeBridges(){
 for(let i=0;i<2;i++){
  const material=new THREE.MeshStandardMaterial({
   color:0x87ddd1,emissive:0x58d6bf,emissiveIntensity:1.65,
   metalness:.32,roughness:.2,transparent:true,opacity:.85
  });
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1,10),material);
  shaft.name='RADIAL_GATE_'+(i+1);
  scene.add(shaft);
  const sleeving=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1,10,1,true),
   new THREE.MeshBasicMaterial({color:0x74aeb8,transparent:true,opacity:.15,
    depthWrite:false,side:THREE.DoubleSide}));
  sleeving.name='BRIDGE_GLOW';scene.add(sleeving);
  bridges.push({shaft,sleeving,outer:null,inner:null,connected:false});
 }
}
function attachGatesAndRoutes(){
 const infos=layerObjects.map(slot=>slot.info);
 const exit0=nearestFace(infos[0],0,GATE_DIRECTIONS[0]);
 const enter1=nearestFace(infos[1],1,GATE_DIRECTIONS[0]);
 const exit1=nearestFace(infos[1],1,GATE_DIRECTIONS[1]);
 const enter2=nearestFace(infos[2],2,GATE_DIRECTIONS[1]);
 const start0=nearestFace(infos[0],0,new THREE.Vector3(-.22,-.73,-.63).normalize());
 const end2=nearestFace(infos[2],2,new THREE.Vector3(.13,.82,-.57).normalize());
 const gates=[
  {entrance:start0,exit:exit0},
  {entrance:enter1,exit:exit1},
  {entrance:enter2,exit:end2}
 ];
 layerObjects.forEach((slot,i)=>{
  const g=gates[i];
  slot.gateMarkers.entrance=addPortal(i,slot.info,slot.content,g.entrance,'entrance');
  slot.gateMarkers.exit=addPortal(i,slot.info,slot.content,g.exit,'exit');
  const route=pathBetween(slot.info,g.entrance,g.exit);
  slot.routeLength=route.length;
  routeGeometry(slot.info,route,slot.content);
 });
 bridges[0].outer=layerObjects[0].gateMarkers.exit;
 bridges[0].inner=layerObjects[1].gateMarkers.entrance;
 bridges[1].outer=layerObjects[1].gateMarkers.exit;
 bridges[1].inner=layerObjects[2].gateMarkers.entrance;
}
function buildDay(animate=true){
 const starts=layerObjects.map(x=>x.pivot.quaternion.clone());
 for(let i=0;i<M.LEVELS;i++)createLayerContent(i,config.day);
 attachGatesAndRoutes();
 if(animate){
  worldAnimation={
   start:performance.now(),duration:1800,
   begin:starts,end:layerObjects.map((_,i)=>qFor(i,config.day))
  };
  $('next-day').disabled=true;
 }else{
  worldAnimation=null;
  layerObjects.forEach((x,i)=>x.pivot.quaternion.copy(qFor(i,config.day)));
  $('next-day').disabled=false;
 }
 applyVisibility();
 updateReadout();
 selected=null;
 $('inspect-title').textContent='第 '+String(config.day).padStart(2,'0')+' 天 · 空间已重排';
 $('inspect-text').textContent='每层 320 个连通空间单元；廊道与隔墙、区域分布均已按今日规则更新。';
}
function applyVisibility(){
 const showAll=config.isolated===-1;
 layerObjects.forEach((x,i)=>{
  x.pivot.visible=showAll||config.isolated===i;
  x.pivot.scale.setScalar(1+config.separation*([.37,.21,0][i]));
  if(x.content){
   x.content.traverse(obj=>{
    if(obj.name?.startsWith('OPEN_MAZE_PASSAGES')||
       obj.name==='VERIFIED_ROUTE_TO_CENTER')obj.visible=config.paths;
   });
  }
 });
 bridges.forEach(b=>{
  b.shaft.visible=showAll&&config.paths;
  b.sleeving.visible=showAll&&config.paths;
 });
 $('center-label').style.display=showAll&&config.cutaway?'flex':'none';
}
function updateReadout(){
 const visible=config.isolated===-1?layerObjects:[layerObjects[config.isolated]];
 let rooms=0,walls=0,roads=0;
 for(const layer of visible){
  if(!layer?.info)continue;
  const stats=M.stats(layer.info);
  rooms+=stats.rooms;walls+=stats.walls;roads+=stats.passages;
 }
 $('geometry-count').textContent=rooms+' 空间单元 / '+visible.length+' 层';
 $('wall-count').textContent=walls+' 段隔墙 · '+roads+' 条通路';
 $('day-number').textContent='DAY '+String(config.day).padStart(2,'0');
 $('cycle-note').textContent='每日球壳分别转动 +73° / −47° / +61°；20 个区域分区重新分配，墙体通路重新生成。';
}
function updateBridges(){
 if(!bridges.length)return;
 let open=0;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3();
 const yAxis=new THREE.Vector3(0,1,0);
 for(const bridge of bridges){
  if(!bridge.outer||!bridge.inner)continue;
  bridge.outer.getWorldPosition(a);bridge.inner.getWorldPosition(b);
  const dirA=a.clone().normalize(),dirB=b.clone().normalize();
  const aligned=dirA.angleTo(dirB)<.26;
  bridge.connected=aligned;
  bridge.shaft.visible=aligned&&config.paths&&config.isolated===-1;
  bridge.sleeving.visible=bridge.shaft.visible;
  if(!aligned)continue;
  open++;
  delta.subVectors(b,a);
  const length=delta.length();
  const center=a.clone().add(b).multiplyScalar(.5);
  const q=new THREE.Quaternion().setFromUnitVectors(yAxis,delta.normalize());
  for(const item of [bridge.shaft,bridge.sleeving]){
   item.position.copy(center);
   item.quaternion.copy(q);
   item.scale.set(1,length,1);
  }
 }
 $('connection-state').textContent='相邻球壳接口 '+open+' / 2 组对接';
 const light=$('foot').querySelector('.signal');
 if(light)light.style.background=open===2?'#91cfb9':open===1?'#e2c28d':'#dc9a88';
}
function selectLayer(index){
 config.isolated=index;
 document.querySelectorAll('.ring-choice').forEach(btn=>{
  const selected=Number(btn.dataset.layer)===index;
  btn.classList.toggle('active',selected);
  btn.setAttribute('aria-pressed',String(selected));
 });
 applyVisibility();updateReadout();
 if(index>=0){
  $('inspect-title').textContent=['第一层 · 外壳','第二层 · 中壳','第三层 · 内壳'][index];
  $('inspect-text').textContent='可拖动观察球壳全表面，点击一个三角单元查看所在分区与通路。';
 }else{
  $('inspect-title').textContent='三重同心球壳 · 结构总览';
  $('inspect-text').textContent='三层独立旋转，两个径向通道逐层通向球心。';
 }
}
function nextDay(){
 if(worldAnimation)return;
 config.day++;
 buildDay(true);
}
function resetWorld(){
 config.day=1;
 config.spin=false;
 $('auto-spin').checked=false;
 buildDay(false);
}
function resetCamera(){
 camera.position.set(29,18,37);
 controls.target.set(0,0,0);
 controls.update();
}
function recompose(){
 const poses=layerObjects.map(x=>x.pivot.quaternion.clone());
 for(let i=0;i<3;i++)createLayerContent(i,config.day);
 attachGatesAndRoutes();
 layerObjects.forEach((x,i)=>x.pivot.quaternion.copy(poses[i]));
 applyVisibility();
 updateReadout();
}
function selectCell(layer,cellId){
 const entry=layerObjects[layer];const cell=entry.info.cells[cellId];
 if(!cell)return;
 $('inspect-title').textContent='球壳 0'+(layer+1)+' · 单元 '+String(cellId+1).padStart(3,'0');
 const paths=cell.neighborEdges.filter(id=>entry.info.edges[id].open).length;
 $('inspect-text').textContent=M.DISTRICTS[cell.district]+' / 第 '+config.day+
  ' 天 · '+paths+' 条开放通路，'+(3-paths)+' 面隔墙 · 区块 '+String(cell.zone+1).padStart(2,'0');
 if(selected?.marker){selected.marker.removeFromParent();selected.marker.geometry.dispose();selected.marker.material.dispose();}
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),
  new THREE.MeshBasicMaterial({color:0xf9e2b5,depthTest:false}));
 marker.renderOrder=80;
 marker.position.copy(scale(cell.center,entry.info.radius+.32));
 entry.content.add(marker);
 selected={layer,cellId,marker};
}
function bind(){
 document.querySelectorAll('.ring-choice').forEach(button=>
  button.addEventListener('click',()=>selectLayer(Number(button.dataset.layer))));
 $('next-day').addEventListener('click',nextDay);
 $('reset-world').addEventListener('click',resetWorld);
 $('reset-camera').addEventListener('click',resetCamera);
 $('cutaway').addEventListener('change',event=>{
  config.cutaway=event.target.checked;recompose();
 });
 $('show-paths').addEventListener('change',event=>{
  config.paths=event.target.checked;applyVisibility();
 });
 $('auto-spin').addEventListener('change',event=>{config.spin=event.target.checked;});
 $('separation').addEventListener('input',event=>{
  config.separation=Number(event.target.value)/100;
  $('separation-value').textContent=config.separation===0?'原始比例':
   '展开 '+Math.round(config.separation*100)+'%';
  applyVisibility();
 });
 // OrbitControls use pointer events; raycast only on a real, non-drag click.
 renderer.domElement.addEventListener('pointerdown',e=>{
  clickStart={x:e.clientX,y:e.clientY};
 });
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!clickStart)return;
  const moved=Math.hypot(e.clientX-clickStart.x,e.clientY-clickStart.y);
  clickStart=null;
  if(moved>6)return;
  const box=renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX-box.left)/box.width)*2-1,
   -((e.clientY-box.top)/box.height)*2+1);
  raycaster.setFromCamera(mouse,camera);
  const objects=layerObjects.filter(x=>x.pivot.visible).map(x=>x.floor).filter(Boolean);
  const hits=raycaster.intersectObjects(objects);
  if(!hits.length)return;
  const hit=hits[0],index=hit.object.userData.layer;
  const id=hit.object.userData.faceIds[hit.faceIndex];
  if(Number.isInteger(id))selectCell(index,id);
 });
}
function resize(){
 if(!renderer||!camera)return;
 const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
 camera.aspect=w/h;camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
function frame(){
 const dt=Math.min(.045,clock.getDelta());
 const now=performance.now();
 if(worldAnimation){
  const a=Math.min(1,(now-worldAnimation.start)/worldAnimation.duration);
  const eased=a<.5?4*a*a*a:1-Math.pow(-2*a+2,3)/2;
  layerObjects.forEach((entry,i)=>{
   entry.pivot.quaternion.copy(worldAnimation.begin[i]).slerp(worldAnimation.end[i],eased);
  });
  if(a>=1){worldAnimation=null;$('next-day').disabled=false;}
 }else if(config.spin){
  layerObjects.forEach((entry,i)=>{
   const axis=vec(M.AXES[i]).normalize();
   const sign=i===1?-1:1;
   entry.pivot.rotateOnWorldAxis(axis,sign*dt*.17);
  });
 }
 controls.update();
 if(centralCore){
  const gem=centralCore.getObjectByName('CORE_CRYSTAL');
  if(gem){gem.rotation.y+=dt*.25;gem.rotation.x+=dt*.14;}
 }
 updateBridges();
 renderer.render(scene,camera);
 renderedFrames++;
 requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});
else startup();

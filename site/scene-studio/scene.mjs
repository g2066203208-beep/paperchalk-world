import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildBuilding,updateBuildingDisplay,ROOMS,LEVEL_H,roomCenter} from './building-model.mjs';
const $=id=>document.getElementById(id);
const host=$('viewport'),error=$('viewportError');
let renderer,scene,camera,controls,model,refs,mode='building',floor=3,night=false,selectedRoom='genkan';
let desiredCamera=null,desiredTarget=null;
const parts={walls:$('toggleWalls'),furniture:$('toggleFurniture'),roof:$('toggleRoof'),labels:$('toggleLabels')};
const metadata={
 building:['整栋建筑剖切总览','五层 · 每层四户 · 楼梯、电梯与走廊均有真实空间'],
 floor:['标准层三维平面','按楼层切换 · 标准四户、一条公共走廊'],
 apartment:['302室完整房间结构','玄关 / 客厅 / 厨房 / 卧室 / 卫生间'],
 foyer:['302室 · 玄关正对房门','第一人称室内机位 · 门正前方约 2 米'],
 hallway:['三楼公共走廊','门外反向观看302 · 可见邻居与核心筒'],
 peephole:['门内猫眼 · 看向走廊','同一扇302入户门 · 贴门中央望向公共区域']
};
function init3D(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x202a30);
 scene.fog=new THREE.FogExp2(0x202a30,.012);
 camera=new THREE.PerspectiveCamera(46,host.clientWidth/Math.max(1,host.clientHeight),.06,240);
 camera.position.set(42,39,48);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.28;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 host.appendChild(renderer.domElement);
 const hemi=new THREE.HemisphereLight(0xd4dfd9,0x625852,2.25);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe0b9,2.15);
 sun.position.set(-13,32,25);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);
 sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;
 sun.shadow.normalBias=.025;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.MeshStandardMaterial({color:0x25313a,roughness:1}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.67;ground.receiveShadow=true;scene.add(ground);
 const grid=new THREE.GridHelper(90,90,0x6a817b,0x3f535a);grid.position.y=-.64;
 grid.material.opacity=.14;grid.material.transparent=true;scene.add(grid);
 model=buildBuilding();scene.add(model.root);refs=model.refs;
 controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.075;
 controls.minDistance=1;controls.maxDistance=125;
 controls.target.set(0,6.2,0);controls.maxPolarAngle=Math.PI*.49;
 controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;controls.mouseButtons.MIDDLE=THREE.MOUSE.DOLLY;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
 controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
 renderer.domElement.addEventListener('click',pickScene);
 renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
 window.addEventListener('resize',resize);
 const observer=new ResizeObserver(resize);observer.observe(host);
 applyLighting(hemi,sun,ground);
 updateMode('building',{instant:true});
 const clock=new THREE.Clock();
 function render(){
  const d=clock.getDelta();
  if(desiredCamera&&desiredTarget){
   // Smooth camera travel without leaving controls behind the actual look direction.
   camera.position.lerp(desiredCamera,1-Math.pow(.00002,d));
   controls.target.lerp(desiredTarget,1-Math.pow(.00002,d));
   if(camera.position.distanceTo(desiredCamera)<.05&&controls.target.distanceTo(desiredTarget)<.05){
    camera.position.copy(desiredCamera);controls.target.copy(desiredTarget);desiredCamera=null;desiredTarget=null;
   }
  }
  controls.update();renderer.render(scene,camera);requestAnimationFrame(render);
 }
 requestAnimationFrame(render);
}
let pointerStart={x:0,y:0};
function resize(){if(!renderer||!camera)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
function pickScene(e){
 if(mode==='peephole'||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>7)return;
 const bounds=host.getBoundingClientRect();
 const p=new THREE.Vector2(((e.clientX-bounds.left)/bounds.width)*2-1,-((e.clientY-bounds.top)/bounds.height)*2+1);
 const ray=new THREE.Raycaster();ray.setFromCamera(p,camera);
 for(const hit of ray.intersectObjects(model.root.children,true)){
  if(!hit.object.visible||!hit.object.parent?.visible)continue;
  const id=hit.object.userData.room;
  if(id){
   if(id.startsWith('unit-'))selectInfo('公寓 '+id.slice(5),'其他房屋暂按结构白盒表示。302室是已详细搭建的首个场景。');
   else if(id==='floor')selectInfo('楼层结构','标准层高 3.1m；楼板、走廊与房屋在每层重复排列。');
   else if(id==='stairs')selectInfo('西侧楼梯间','连接全部五层。生存游戏中的步行逃生通道。');
   else if(id==='elevator')selectInfo('东侧电梯','沿走廊向东可以抵达电梯间。');
   else focusRoom(id,false);
   break;
  }
 }
}
function applyLighting(hemi,sun,ground){
 if(!hemi)return;
 hemi.intensity=night?1.1:2.25;sun.intensity=night?.32:2.15;
 sun.color.setHex(night?0x8ca8c2:0xffe0b9);
 scene.background.setHex(night?0x0b1119:0x202a30);
 scene.fog.color.setHex(night?0x0b1119:0x202a30);
 renderer.toneMappingExposure=night?.98:1.28;
 if(refs?.entranceLamp)refs.entranceLamp.intensity=night?25:12;
 $('dayButton').classList.toggle('active',!night);$('nightButton').classList.toggle('active',night);
 $('sceneChip').textContent=night?'NIGHT / 3D':'SECTION / 3D';
}
function showModel(){
 if(!refs)return;
 updateBuildingDisplay(refs,{mode,floor,walls:parts.walls.checked,furniture:parts.furniture.checked,roof:parts.roof.checked,labels:parts.labels.checked});
 $('peepholeMask').hidden=mode!=='peephole';
 controls.enabled=mode!=='peephole';
 controls.enablePan=!['foyer','hallway'].includes(mode);
 controls.maxPolarAngle=['foyer','hallway','peephole'].includes(mode)?Math.PI*.86:Math.PI*.49;
}
function targetFor(mode,f=floor){
 const y=(f-1)*LEVEL_H;
 const elev=6.2;
 switch(mode){
  case 'building':return [[42,41,49],[0,7.2,0]];
  case 'floor':return [[22,y+27,27],[0,y,0]];
  case 'apartment':return [[18,elev+17,8],[5.9,elev,-4.8]];
  case 'foyer':return [[6,elev+1.61,-4.45],[6,elev+1.61,-1.42]];
  case 'hallway':return [[6,elev+1.65,.82],[6,elev+1.65,-1.46]];
  case 'peephole':return [[6,elev+1.61,-1.31],[6,elev+1.61,3.15]];
  default:return [[19,y+18,19],[0,y,0]];
 }
}
function updateMode(next,{instant=false}={}){
 mode=next;
 if(['apartment','foyer','hallway','peephole'].includes(mode))floor=3;
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 document.querySelectorAll('[data-floor]').forEach(b=>b.classList.toggle('active',Number(b.dataset.floor)===floor));
 showModel();
 const title=metadata[mode];
 $('viewTitle').textContent=title[0]+(mode==='floor'?' · '+floor+'F':'');
 $('viewSubtitle').textContent=title[1];
 const [pos,look]=targetFor(mode);desiredCamera=new THREE.Vector3(...pos);desiredTarget=new THREE.Vector3(...look);
 camera.fov=mode==='peephole'?85:mode==='foyer'?66:mode==='hallway'?70:46;camera.updateProjectionMatrix();
 if(instant){camera.position.copy(desiredCamera);controls.target.copy(desiredTarget);desiredCamera=null;desiredTarget=null}
 if(mode==='peephole')selectInfo('302室猫眼','这是门本身的真实位置。视线朝向三楼走廊，不是另一张独立生成的走廊图。');
 else if(mode==='foyer')selectInfo('302室玄关','镜头在门内约 3 m 处，对准真正的入户门。房屋与走廊的连接关系始终不变。');
 else if(mode==='hallway')selectInfo('三楼走廊','镜头站在门外，反向看向302室。往西为楼梯，往东为电梯。');
 refreshPlan();
}
function selectInfo(name,desc){$('selectedName').textContent=name;$('selectedText').textContent=desc;$('objectInfo').textContent=name+' · '+desc.slice(0,35)}
function focusRoom(id,fly=true){
 selectedRoom=id;
 const room=ROOMS.find(r=>r.id===id);
 if(!room){
  if(id==='stairs'){updateMode('floor');selectInfo('楼梯间','每层西侧同轴的楼梯核心，连接到一楼出口。')}
  if(id==='elevator'){updateMode('floor');selectInfo('电梯间','每层东端的电梯，连接楼层。')}
  return;
 }
 if(fly){
  if(id==='corridor')updateMode('hallway');
  else if(id==='genkan')updateMode('foyer');
  else{
   updateMode('apartment');
   desiredTarget=new THREE.Vector3(room.x,7.1,room.z);
   desiredCamera=new THREE.Vector3(room.x+5.5,15.2,room.z+6.3);
  }
 }
 selectInfo(room.name,room.desc);
 document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===id));
}
function svgRect(x,z,w,d,fill,attrs=''){
 const X=310+x*17,Z=175+z*17;
 return '<rect x="'+X.toFixed(1)+'" y="'+Z.toFixed(1)+'" width="'+(w*17).toFixed(1)+'" height="'+(d*17).toFixed(1)+'" fill="'+fill+'" stroke="#a2b0ae" stroke-width="1.2" '+attrs+'/>';
}
function svgText(x,z,t,size=10){
 return '<text x="'+(310+x*17).toFixed(1)+'" y="'+(175+z*17).toFixed(1)+'" text-anchor="middle" font-size="'+size+'">'+t+'</text>';
}
function refreshPlan(){
 $('planTitle').textContent=(floor===3?'3F · 302室与标准层':'F'+floor+' · 结构层级关系');
 let t='<svg viewBox="0 0 620 350" role="img" aria-label="四户平面布局及302室内部房间"><g>';
 t+=svgRect(-15.35,-4.65,3.2,9.3,'#636e6a','data-room="stairs" class="clickable"');
 t+=svgRect(12.1,-2.6,3.15,5.2,'#636e6a','data-room="elevator" class="clickable"');
 t+=svgRect(-12,-1.4,24,2.8,'#607c86','data-room="corridor" class="clickable"');
 t+=svgRect(-12,-9,12,7.6,'#475b61');
 t+=svgRect(0,-9,12,7.6,floor===3?'#99886d':'#475b61','data-room="living" class="clickable"');
 t+=svgRect(-12,1.4,12,7.6,'#475b61');
 t+=svgRect(0,1.4,12,7.6,'#475b61');
 if(floor===3){
  const items=[
   [3.9,-3.25,4.3,1.85,'#b59c76','genkan'],
   [8.2,-3.25,3.8,1.85,'#a89773','kitchen'],
   [3.9,-9,8.1,5.75,'#867568','living'],
   [0,-9,3.9,4.35,'#726f67','bedroom'],
   [0,-4.65,3.9,3.25,'#718787','bathroom']
  ];
  for(const [x,z,w,d,color,id] of items)t+=svgRect(x,z,w,d,color,'data-room="'+id+'" class="clickable"');
  for(const r of ROOMS.slice(0,5))t+=svgText(r.x,r.z+.2,r.name);
  t+=svgText(6,-.1,'三楼公共走廊');
 }else{
  t+=svgText(6,-5.25,floor+'02');
  t+=svgText(0,0,'公共走廊');
 }
 t+=svgText(-6,-5.2,floor+'01');t+=svgText(-6,5.2,floor+'03');
 t+=svgText(6,5.2,floor+'04');t+=svgText(-13.7,0,'楼梯');t+=svgText(13.7,0,'电梯');
 // Yellow doorway marks are exactly aligned with the physical doors.
 for(const x of [-6,6])for(const z of [-1.4,1.4]){
  t+='<line x1="'+(310+(x-.51)*17)+'" y1="'+(175+z*17)+'" x2="'+(310+(x+.51)*17)+'" y2="'+(175+z*17)+'" stroke="#f4d79b" stroke-width="4"/>';
 }
 t+='</g></svg>';$('plan').innerHTML=t;
 $('plan').querySelectorAll('[data-room]').forEach(el=>el.addEventListener('click',()=>focusRoom(el.getAttribute('data-room'))));
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>updateMode(b.dataset.mode)));
document.querySelectorAll('[data-floor]').forEach(b=>b.addEventListener('click',()=>{
 floor=Number(b.dataset.floor);
 updateMode('floor');
 selectInfo(floor+'F 楼层','该层为标准四户结构示意，302室所在的3F拥有完整室内白盒建模。');
}));
document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>focusRoom(b.dataset.room)));
for(const item of Object.values(parts))item.addEventListener('change',showModel);
$('dayButton').onclick=()=>{night=false;applyLighting(scene.getObjectByName(''),sunLight,groundMesh)};
$('nightButton').onclick=()=>{night=true;applyLighting(scene.getObjectByName(''),sunLight,groundMesh)};
let sunLight=null,hemiLight=null,groundMesh=null;
$('resetView').onclick=()=>updateMode(mode);
try{
 init3D();
 // Retain references to lights for theme switching without recreating the scene.
 hemiLight=scene.children.find(o=>o.type==='HemisphereLight');
 sunLight=scene.children.find(o=>o.type==='DirectionalLight');
 groundMesh=scene.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry');
 $('dayButton').onclick=()=>{night=false;applyLighting(hemiLight,sunLight,groundMesh)};
 $('nightButton').onclick=()=>{night=true;applyLighting(hemiLight,sunLight,groundMesh)};
 window.__SCENE_STUDIO__={
  version:1,ready:true,
  getState:()=>({mode,floor,night,rooms:ROOMS.length,levels:refs.floors.length,hasDoor:!!refs.entryDoor,
   roomWallsVisible:refs.interiorWalls.visible,propsVisible:refs.furniture.visible,roofVisible:refs.floors[2].roof.visible,
   peephole:!$('peepholeMask').hidden}),
  setView:(value)=>{if(metadata[value])updateMode(value)},
  selectFloor:f=>{if(f>=1&&f<=5){floor=f;updateMode('floor')}},
  selectRoom:focusRoom
 };
}catch(e){
 console.error(e);error.hidden=false;
 error.textContent='三维引擎无法启动：'+(e?.message||e)+
 '。请在支持 WebGL 的现代浏览器中打开，检查网络是否允许加载 Three.js。';
}

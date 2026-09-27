const RUNTIME=window.PaperchalkRuntime;
const WORLD=document.getElementById('world');
const HOST=document.getElementById('threeWorldLayer');
const TOGGLE_BUTTON=document.getElementById('threeTestBtn');
const THREE_MODULE='../../vendor/three/three.module.js';
const FIXED_DT=1/60;
const MAX_STEPS=4;
const TEST_LIMIT=42;

let THREE=null;
let renderer=null;
let scene=null;
let camera=null;
let sceneRoot=null;
let playerRoot=null;
let voxelGroup=null;
let selectionBox=null;
let hud=null;
let statusEl=null;
let initPromise=null;
let raf=0;
let active=false;
let requestedActive=false;
let worldSessionActive=false;
let lastNow=0;
let accumulator=0;
let fpsWindowAt=0;
let fpsFrames=0;
let selectedVoxel=null;
let voxelMode='mine';
let pointerState=null;
let cars=[];
let obstacles=[];
let voxelGeometry=null;
let voxelMaterial=null;
let nextVoxelSerial=1;
let runtimeState=RUNTIME?.getSnapshot?.()||null;

const keys=new Set();
const raycasterState={raycaster:null,pointer:null};
const cameraRig={yaw:.72,pitch:.42,distance:15,minDistance:5,maxDistance:28};
const player={
  x:0,y:0,z:7,
  vx:0,vy:0,vz:0,
  grounded:true,
  speed:5.2,
  jumpSpeed:6.6,
  gravity:18
};
const stats={
  engine:'three-r180-webgl',
  ready:false,
  active:false,
  error:'',
  renderer:'',
  resolution:1,
  frames:0,
  fps:0,
  drawCalls:0,
  triangles:0,
  sceneChildren:0,
  voxelCount:0,
  carCount:0,
  fixedSteps:0,
  lastFrameMs:0
};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function emitChange(){
  stats.active=active;
  TOGGLE_BUTTON?.classList.toggle('is-active',active);
  if(TOGGLE_BUTTON){
    TOGGLE_BUTTON.textContent=active?'退出3D':'3D测试';
    TOGGLE_BUTTON.setAttribute('aria-pressed',active?'true':'false');
  }
  window.dispatchEvent(new CustomEvent('paperchalk-3d-change',{detail:snapshot()}));
}

function setStatus(message){
  if(statusEl)statusEl.textContent=String(message||'');
}

function snapshot(){
  return {
    active,
    requestedActive,
    worldSessionActive,
    ready:stats.ready,
    error:stats.error,
    voxelMode,
    player:{x:player.x,y:player.y,z:player.z,vy:player.vy,grounded:player.grounded},
    camera:{...cameraRig},
    stats:{...stats}
  };
}

function buildHud(){
  if(hud||!HOST)return;
  hud=document.createElement('section');
  hud.className='three-test-hud';
  hud.setAttribute('aria-label','3D测试场景控制');
  hud.innerHTML=
    '<div class="three-test-title">THREE.JS R180 · 真实 WebGL 3D 测试场景</div>'+
    '<div class="three-test-actions">'+
      '<button type="button" data-three-action="mine" class="is-active">挖方块</button>'+
      '<button type="button" data-three-action="place">放方块</button>'+
      '<button type="button" data-three-action="reset">重置角色</button>'+
      '<button type="button" data-three-action="close">返回2D</button>'+
    '</div>'+
    '<div class="three-test-help">WASD移动 · Space跳跃 · 拖动旋转镜头 · 滚轮缩放 · 点方块挖/放</div>'+
    '<div class="three-test-status" aria-live="polite"></div>';
  statusEl=hud.querySelector('.three-test-status');
  hud.addEventListener('click',event=>{
    const action=event.target.closest('[data-three-action]')?.dataset.threeAction;
    if(!action)return;
    if(action==='mine'||action==='place')setVoxelMode(action);
    else if(action==='reset')resetPlayer();
    else if(action==='close')disable();
  });
  HOST.appendChild(hud);
}

function updateHud(){
  if(!statusEl)return;
  statusEl.textContent=
    'FPS '+stats.fps+
    ' · Draw '+stats.drawCalls+
    ' · Tri '+stats.triangles+
    ' · Voxels '+stats.voxelCount+
    ' · XYZ '+player.x.toFixed(1)+', '+player.y.toFixed(1)+', '+player.z.toFixed(1);
}

function setVoxelMode(mode){
  voxelMode=mode==='place'?'place':'mine';
  hud?.querySelectorAll('[data-three-action="mine"],[data-three-action="place"]').forEach(button=>{
    button.classList.toggle('is-active',button.dataset.threeAction===voxelMode);
  });
  setStatus(voxelMode==='mine'?'模式：挖方块':'模式：放方块');
  return voxelMode;
}

function makeMat(color,roughness=.84,metalness=0){
  return new THREE.MeshStandardMaterial({color,roughness,metalness});
}

function shadow(mesh,{cast=true,receive=true}={}){
  mesh.castShadow=cast;
  mesh.receiveShadow=receive;
  return mesh;
}

function addBox({x=0,y=.5,z=0,w=1,h=1,d=1,color=0xb59a72,material=null,root=sceneRoot}={}){
  const mesh=shadow(new THREE.Mesh(
    new THREE.BoxGeometry(w,h,d),
    material||makeMat(color)
  ));
  mesh.position.set(x,y,z);
  root.add(mesh);
  return mesh;
}

function addCylinder({x=0,y=.5,z=0,r=.5,h=1,color=0x8b7658,segments=18,root=sceneRoot}={}){
  const mesh=shadow(new THREE.Mesh(
    new THREE.CylinderGeometry(r,r,h,segments),
    makeMat(color)
  ));
  mesh.position.set(x,y,z);
  root.add(mesh);
  return mesh;
}

function buildPlayer(){
  playerRoot=new THREE.Group();
  const coat=makeMat(0x506d83,.78);
  const skin=makeMat(0xe7c8aa,.82);
  const dark=makeMat(0x2d3440,.72);
  const body=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,1.15,16),coat));
  body.position.y=.86;
  const head=shadow(new THREE.Mesh(new THREE.SphereGeometry(.34,20,14),skin));
  head.position.y=1.62;
  const legL=shadow(new THREE.Mesh(new THREE.BoxGeometry(.20,.72,.22),dark));
  const legR=legL.clone();
  legL.position.set(-.15,.30,0);
  legR.position.set(.15,.30,0);
  playerRoot.add(body,head,legL,legR);
  playerRoot.position.set(player.x,player.y,player.z);
  sceneRoot.add(playerRoot);
}

function buildRoadAndBuildings(){
  const ground=shadow(new THREE.Mesh(
    new THREE.PlaneGeometry(96,54,1,1),
    makeMat(0x728563,1)
  ),{cast:false,receive:true});
  ground.rotation.x=-Math.PI/2;
  sceneRoot.add(ground);

  const roadMat=makeMat(0x4d5960,.96);
  const road=addBox({x:0,y:.03,z:-6,w:90,h:.06,d:7,material:roadMat});
  road.receiveShadow=true;

  const lineMat=makeMat(0xe7dcc2,.82);
  for(let x=-39;x<=39;x+=5){
    addBox({x,y:.075,z:-6,w:2.7,h:.025,d:.12,material:lineMat});
  }

  const sidewalk=makeMat(0xa9a391,.98);
  addBox({x:0,y:.12,z:-1.95,w:90,h:.24,d:1.1,material:sidewalk});
  addBox({x:0,y:.12,z:-10.05,w:90,h:.24,d:1.1,material:sidewalk});

  const buildingColors=[0x9f8068,0x847a71,0x9d9a83,0x7d8c91,0x9a7568];
  for(let i=0;i<10;i++){
    const side=i<5?-1:1;
    const x=-28+(i%5)*14;
    const z=side<0?-16:5.5;
    const h=4.2+(i%3)*1.5;
    const mesh=addBox({x,y:h/2,z,w:8.5,h,d:7.5,color:buildingColors[i%buildingColors.length]});
    obstacles.push({x:x-4.25,z:z-3.75,w:8.5,d:7.5});
    for(let row=0;row<2;row++){
      for(let col=-1;col<=1;col++){
        const windowMesh=addBox({
          x:x+col*2.1,y:1.6+row*1.55,z:z+(side<0?3.78:-3.78),
          w:1.05,h:.72,d:.05,color:0xb9d2da
        });
        windowMesh.castShadow=false;
      }
    }
  }

  const trunk=makeMat(0x70543c,1),leaf=makeMat(0x496b4d,.95);
  for(const x of [-34,-21,-8,8,21,34]){
    addCylinder({x,y:1,z:1.1,r:.22,h:2,color:0x70543c});
    const crown=shadow(new THREE.Mesh(new THREE.SphereGeometry(1.05,14,10),leaf));
    crown.position.set(x,2.35,1.1);
    sceneRoot.add(crown);
  }

  const ramp=shadow(new THREE.Mesh(new THREE.BoxGeometry(6,.5,4),makeMat(0xa68d6b)));
  ramp.position.set(13,.65,13);
  ramp.rotation.z=-.18;
  sceneRoot.add(ramp);
  obstacles.push({x:10,z:11,w:6,d:4});

  const sphere=shadow(new THREE.Mesh(new THREE.SphereGeometry(1.25,28,18),makeMat(0x8b6276,.45,.08)));
  sphere.position.set(-11,1.25,13);
  sceneRoot.add(sphere);
}

function makeCar(color,x,z,dir){
  const root=new THREE.Group();
  const body=shadow(new THREE.Mesh(new THREE.BoxGeometry(2.6,.72,1.25),makeMat(color,.55,.05)));
  body.position.y=.62;
  const cabin=shadow(new THREE.Mesh(new THREE.BoxGeometry(1.35,.58,1.05),makeMat(0x9bb1b8,.28,.05)));
  cabin.position.set(-.15,1.18,0);
  root.add(body,cabin);
  for(const sx of [-.85,.85])for(const sz of [-.56,.56]){
    const wheel=shadow(new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.16,14),makeMat(0x25282b,.92)),{receive:false});
    wheel.rotation.x=Math.PI/2;
    wheel.position.set(sx,.34,sz);
    root.add(wheel);
  }
  root.position.set(x,0,z);
  sceneRoot.add(root);
  cars.push({root,x,z,dir,speed:3.7+(cars.length%3)*.55});
}

function buildTraffic(){
  cars=[];
  makeCar(0x8b4742,-18,-4.5,1);
  makeCar(0x4c6e8d,5,-4.5,1);
  makeCar(0x887d55,21,-7.5,-1);
  makeCar(0x5a8067,-4,-7.5,-1);
}

function voxelKey(x,y,z){return x+'|'+y+'|'+z}
const voxels=new Map();

function addVoxel(x,y,z){
  x=Math.round(x);y=Math.round(y);z=Math.round(z);
  if(y<0||y>8)return null;
  const key=voxelKey(x,y,z);
  if(voxels.has(key))return voxels.get(key);
  const mesh=shadow(new THREE.Mesh(voxelGeometry,voxelMaterial));
  mesh.position.set(x,y+.5,z);
  mesh.userData.voxel={x,y,z,key,serial:nextVoxelSerial++};
  voxelGroup.add(mesh);
  voxels.set(key,mesh);
  stats.voxelCount=voxels.size;
  return mesh;
}

function removeVoxel(mesh){
  const data=mesh?.userData?.voxel;
  if(!data)return false;
  voxels.delete(data.key);
  if(selectedVoxel===mesh)selectVoxel(null);
  mesh.removeFromParent();
  stats.voxelCount=voxels.size;
  return true;
}

function selectVoxel(mesh){
  selectedVoxel=mesh||null;
  if(!selectionBox)return;
  selectionBox.visible=!!mesh;
  if(mesh)selectionBox.position.copy(mesh.position);
}

function buildVoxels(){
  voxelGroup=new THREE.Group();
  voxelGroup.name='interactive-voxels';
  voxelGeometry=new THREE.BoxGeometry(1,1,1);
  voxelMaterial=makeMat(0x81966d,.94);
  selectionBox=new THREE.Mesh(
    new THREE.BoxGeometry(1.04,1.04,1.04),
    new THREE.MeshBasicMaterial({color:0xf2d37d,wireframe:true,transparent:true,opacity:.95})
  );
  selectionBox.visible=false;
  sceneRoot.add(voxelGroup,selectionBox);
  for(let x=-5;x<=5;x++){
    for(let z=17;z<=22;z++)addVoxel(x,0,z);
  }
  for(let y=1;y<=3;y++)addVoxel(-5,y,22);
}

function buildLighting(){
  scene.add(new THREE.HemisphereLight(0xdce8f0,0x4a5144,2.0));
  const sun=new THREE.DirectionalLight(0xfff1d5,3.1);
  sun.position.set(-11,22,12);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-38;
  sun.shadow.camera.right=38;
  sun.shadow.camera.top=30;
  sun.shadow.camera.bottom=-30;
  sun.shadow.camera.near=.5;
  sun.shadow.camera.far=70;
  scene.add(sun);
}

function buildScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0xb9cbd4);
  scene.fog=new THREE.Fog(0xb9cbd4,38,88);
  camera=new THREE.PerspectiveCamera(55,1,.08,180);
  sceneRoot=new THREE.Group();
  sceneRoot.name='paperchalk-3d-test-root';
  scene.add(sceneRoot);
  buildLighting();
  buildRoadAndBuildings();
  buildTraffic();
  buildVoxels();
  buildPlayer();

  const grid=new THREE.GridHelper(80,80,0x5f655c,0x899080);
  grid.position.y=.011;
  grid.material.transparent=true;
  grid.material.opacity=.18;
  sceneRoot.add(grid);

  raycasterState.raycaster=new THREE.Raycaster();
  raycasterState.pointer=new THREE.Vector2();
  stats.sceneChildren=sceneRoot.children.length;
  stats.carCount=cars.length;
}

function resize(){
  if(!renderer||!camera||!HOST)return;
  const rect=HOST.getBoundingClientRect();
  const w=Math.max(1,Math.round(rect.width||window.innerWidth||1280));
  const h=Math.max(1,Math.round(rect.height||window.innerHeight||720));
  renderer.setSize(w,h,false);
  camera.aspect=w/Math.max(1,h);
  camera.updateProjectionMatrix();
}

function resetPlayer(){
  player.x=0;player.y=0;player.z=7;
  player.vx=0;player.vy=0;player.vz=0;player.grounded=true;
  if(playerRoot)playerRoot.position.set(player.x,player.y,player.z);
  cameraRig.yaw=.72;cameraRig.pitch=.42;cameraRig.distance=15;
  setStatus('角色和镜头已重置');
}

function collidesAt(x,z){
  const radius=.38;
  for(const o of obstacles){
    if(x+radius>o.x&&x-radius<o.x+o.w&&z+radius>o.z&&z-radius<o.z+o.d)return true;
  }
  return false;
}

function updatePlayer(dt){
  let ix=0,iz=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))ix-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight'))ix+=1;
  if(keys.has('KeyW')||keys.has('ArrowUp'))iz-=1;
  if(keys.has('KeyS')||keys.has('ArrowDown'))iz+=1;
  const mag=Math.hypot(ix,iz);
  if(mag>0){ix/=mag;iz/=mag}
  const sin=Math.sin(cameraRig.yaw),cos=Math.cos(cameraRig.yaw);
  const worldX=ix*cos+iz*sin;
  const worldZ=-ix*sin+iz*cos;
  player.vx=worldX*player.speed;
  player.vz=worldZ*player.speed;

  const nx=clamp(player.x+player.vx*dt,-TEST_LIMIT,TEST_LIMIT);
  const nz=clamp(player.z+player.vz*dt,-24,28);
  if(!collidesAt(nx,player.z))player.x=nx;
  if(!collidesAt(player.x,nz))player.z=nz;

  player.vy-=player.gravity*dt;
  player.y+=player.vy*dt;
  if(player.y<=0){
    player.y=0;player.vy=0;player.grounded=true;
  }

  if(playerRoot){
    playerRoot.position.set(player.x,player.y,player.z);
    if(mag>.01)playerRoot.rotation.y=Math.atan2(player.vx,player.vz);
  }
}

function updateCars(dt){
  for(const car of cars){
    car.x+=car.dir*car.speed*dt;
    if(car.x>44)car.x=-44;
    if(car.x<-44)car.x=44;
    car.root.position.x=car.x;
    car.root.rotation.y=car.dir<0?Math.PI:0;
  }
}

function fixedUpdate(dt){
  updatePlayer(dt);
  updateCars(dt);
  stats.fixedSteps++;
}

function updateCamera(){
  if(!camera)return;
  const target=new THREE.Vector3(player.x,player.y+1.15,player.z);
  const cp=Math.cos(cameraRig.pitch);
  camera.position.set(
    target.x+Math.sin(cameraRig.yaw)*cp*cameraRig.distance,
    target.y+Math.sin(cameraRig.pitch)*cameraRig.distance,
    target.z+Math.cos(cameraRig.yaw)*cp*cameraRig.distance
  );
  camera.lookAt(target);
}

function renderFrame(now){
  if(!active||!renderer||!scene||!camera){raf=0;return}
  const started=performance.now();
  const dt=Math.min(.05,lastNow?(now-lastNow)/1000:FIXED_DT);
  lastNow=now;
  accumulator=Math.min(.1,accumulator+dt);
  let steps=0;
  while(accumulator>=FIXED_DT&&steps<MAX_STEPS){
    fixedUpdate(FIXED_DT);
    accumulator-=FIXED_DT;
    steps++;
  }
  updateCamera();
  renderer.render(scene,camera);
  stats.frames++;
  fpsFrames++;
  if(!fpsWindowAt)fpsWindowAt=now;
  if(now-fpsWindowAt>=500){
    stats.fps=Math.round(fpsFrames*1000/(now-fpsWindowAt));
    fpsFrames=0;fpsWindowAt=now;
    updateHud();
  }
  const info=renderer.info?.render;
  stats.drawCalls=Number(info?.calls)||0;
  stats.triangles=Number(info?.triangles)||0;
  stats.lastFrameMs=performance.now()-started;
  raf=requestAnimationFrame(renderFrame);
}

function startLoop(){
  if(raf||!active)return;
  lastNow=0;accumulator=0;fpsWindowAt=0;fpsFrames=0;
  raf=requestAnimationFrame(renderFrame);
}

function stopLoop(){
  if(raf)cancelAnimationFrame(raf);
  raf=0;lastNow=0;accumulator=0;
  keys.clear();
}

function pointerToNdc(event){
  const rect=renderer.domElement.getBoundingClientRect();
  raycasterState.pointer.set(
    ((event.clientX-rect.left)/Math.max(1,rect.width))*2-1,
    -((event.clientY-rect.top)/Math.max(1,rect.height))*2+1
  );
}

function voxelHit(event){
  if(!renderer||!camera||!voxelGroup)return null;
  pointerToNdc(event);
  raycasterState.raycaster.setFromCamera(raycasterState.pointer,camera);
  return raycasterState.raycaster.intersectObjects(voxelGroup.children,false)[0]||null;
}

function interactVoxel(event){
  const hit=voxelHit(event);
  if(!hit){selectVoxel(null);return false}
  selectVoxel(hit.object);
  const v=hit.object.userData.voxel;
  if(voxelMode==='mine'){
    removeVoxel(hit.object);
    return true;
  }
  const n=hit.face?.normal;
  if(!n)return false;
  addVoxel(v.x+Math.round(n.x),v.y+Math.round(n.y),v.z+Math.round(n.z));
  return true;
}

function installInput(){
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{
    if(!active)return;
    pointerState={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};
    try{canvas.setPointerCapture(event.pointerId)}catch{}
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active||!pointerState||event.pointerId!==pointerState.id)return;
    const dx=event.clientX-pointerState.lastX,dy=event.clientY-pointerState.lastY;
    pointerState.lastX=event.clientX;pointerState.lastY=event.clientY;
    if(Math.hypot(event.clientX-pointerState.x,event.clientY-pointerState.y)>6)pointerState.moved=true;
    if(pointerState.moved){
      cameraRig.yaw-=dx*.006;
      cameraRig.pitch=clamp(cameraRig.pitch+dy*.004,.12,1.18);
    }
  });
  const finish=event=>{
    if(!pointerState||event.pointerId!==pointerState.id)return;
    const shouldInteract=!pointerState.moved;
    pointerState=null;
    if(shouldInteract)interactVoxel(event);
  };
  canvas.addEventListener('pointerup',finish);
  canvas.addEventListener('pointercancel',()=>{pointerState=null});
  canvas.addEventListener('lostpointercapture',()=>{pointerState=null});
  canvas.addEventListener('wheel',event=>{
    if(!active)return;
    event.preventDefault();
    cameraRig.distance=clamp(cameraRig.distance+Math.sign(event.deltaY)*1.2,cameraRig.minDistance,cameraRig.maxDistance);
  },{passive:false});
}

async function ensureReady(){
  if(stats.ready)return true;
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    if(!RUNTIME||!WORLD||!HOST)throw new Error('3D runtime host unavailable');
    THREE=await import(THREE_MODULE);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    const coarse=matchMedia('(pointer:coarse)').matches;
    const dpr=Math.max(1,Math.min(Number(devicePixelRatio)||1,coarse?1.25:1.6));
    renderer.setPixelRatio(dpr);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.02;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.className='three-world-canvas';
    renderer.domElement.setAttribute('aria-label','Paperchalk 3D WebGL 测试场景');
    HOST.replaceChildren(renderer.domElement);
    buildHud();
    buildScene();
    installInput();
    resize();
    stats.ready=true;
    stats.renderer=renderer.constructor?.name||'WebGLRenderer';
    stats.resolution=dpr;
    stats.error='';
    return true;
  })().catch(error=>{
    stats.error=String(error?.message||error);
    stats.ready=false;
    console.error('[paperchalk-3d] initialization failed',error);
    setStatus('3D 初始化失败：'+stats.error);
    return false;
  });
  return initPromise;
}

async function enable(){
  requestedActive=true;
  if(!worldSessionActive){
    setStatus('进入世界后启动 3D 测试');
    emitChange();
    return false;
  }
  window.PaperchalkCameraSettings?.close?.();
  const ok=await ensureReady();
  if(!ok){emitChange();return false}
  active=true;
  stats.active=true;
  HOST.hidden=false;
  WORLD.classList.add('three-test-active');
  resize();
  startLoop();
  setStatus('3D 已启动：真实透视相机 + 灯光/阴影 + 固定步长运动 + Raycaster 方块交互');
  emitChange();
  return true;
}

function disable({keepRequest=false}={}){
  if(!keepRequest)requestedActive=false;
  active=false;
  stats.active=false;
  stopLoop();
  pointerState=null;
  if(HOST)HOST.hidden=true;
  WORLD?.classList.remove('three-test-active');
  emitChange();
  return true;
}

function toggle(){
  return active?Promise.resolve(disable()):enable();
}

function jump(){
  if(!active||!player.grounded)return false;
  player.vy=player.jumpSpeed;
  player.grounded=false;
  return true;
}

function debugAddVoxel(){
  const x=Math.round(player.x);
  const z=Math.round(player.z-3);
  return !!addVoxel(x,1,z);
}

function debugRemoveVoxel(){
  const mesh=voxels.values().next().value;
  return mesh?removeVoxel(mesh):false;
}

window.addEventListener('keydown',event=>{
  if(!active)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(event.code)){
    keys.add(event.code);
    event.preventDefault();
  }else if(event.code==='Space'){
    if(!event.repeat)jump();
    event.preventDefault();
  }else if(event.code==='Escape'){
    disable();
    event.preventDefault();
  }
});
window.addEventListener('keyup',event=>{
  if(!active)return;
  keys.delete(event.code);
});
window.addEventListener('blur',()=>keys.clear());
window.addEventListener('resize',()=>{if(stats.ready)resize()},{passive:true});

RUNTIME?.subscribe?.(next=>{runtimeState=next});

TOGGLE_BUTTON?.addEventListener('click',()=>toggle());

const forceFromQuery=new URL(location.href).searchParams.get('scene3d')==='1';
window.addEventListener('paperchalk-world-enter',()=>{
  worldSessionActive=true;
  if(forceFromQuery||requestedActive)enable();
});
window.addEventListener('paperchalk-world-leave',()=>{
  worldSessionActive=false;
  disable({keepRequest:false});
});
window.addEventListener('pagehide',()=>{
  worldSessionActive=false;
  disable({keepRequest:false});
});

window.Paperchalk3D=Object.freeze({
  version:1,
  engine:'three-r180-webgl',
  enable,disable,toggle,resetPlayer,setVoxelMode,jump,
  debugAddVoxel,debugRemoveVoxel,
  get active(){return active},
  get ready(){return stats.ready},
  get stats(){
    return {
      ...stats,
      active,
      loopActive:!!raf,
      voxelCount:voxels.size,
      player:{x:player.x,y:player.y,z:player.z,grounded:player.grounded},
      runtimeRoute:runtimeState?.route?.id||''
    };
  },
  snapshot
});

emitChange();

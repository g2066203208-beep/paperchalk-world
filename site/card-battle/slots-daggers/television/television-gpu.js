/* WORK CRT / shared Three.js GPU scene and original Slots & Daggers pixel assets.
 * No per-pixel CPU metal shader, depth-buffer copy, or 1280x720 JS rasterizer.
 * Real meshes run on WebGL; original CabinetArt / WorldArt / SlotStudy artists
 * supply wood, screen art and pixel typography. */
import * as THREE from '../../vendor/three.module.js';

const canvas=document.getElementById('scene');
const status=document.getElementById('sr');
const renderer=new THREE.WebGLRenderer({
 canvas,alpha:false,antialias:false,powerPreference:'high-performance',
 preserveDrawingBuffer:false
});
renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.16;
renderer.setClearColor(0x11141a,1);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#11141a');
const camera=new THREE.OrthographicCamera(-7,7,4,-4,.1,80);
const root=new THREE.Group();scene.add(root);
scene.add(new THREE.HemisphereLight(0xcad7e3,0x6f5340,2.15));
const key=new THREE.DirectionalLight(0xffe1b6,2.65);
key.position.set(-5,9,8);scene.add(key);
const cool=new THREE.DirectionalLight(0x8ea6ce,1.15);
cool.position.set(7,4,-7);scene.add(cool);
const screenLight=new THREE.PointLight(0x8bc6ea,.68,9);
screenLight.position.set(-.4,.1,1.5);scene.add(screenLight);

const state={yaw:-22,pitch:11,power:true,channel:0,showGuide:false,
 transition:'boot',transitionAt:performance.now()/1000,pressCount:0,
 dragging:false,meshFaces:0,fps:0,frames:0,renderMs:0,programFrames:0,
 lastProgramAt:0,pixelSize:[0,0],viewport:[0,0],drawCalls:0,errors:[]};
const mat=(color,roughness=.64,metalness=.05,extra={})=>
 new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const enamel=mat('#bbb5a6',.65,.10);
const sideEnamel=mat('#89877e',.69,.08);
const dark=mat('#22282c',.80,.06);
const gasket=mat('#11191f',.81,.04);
const nickel=mat('#a29e91',.33,.50);
const dialMetal=mat('#d1c7ad',.36,.44);
const blackMetal=mat('#333a3d',.48,.32);
const woodEdge=mat('#8b5b39',.79,.01);
const woodLeg=mat('#765035',.81,.00);
const stemMat=mat('#49784e',.91,.00);
const leafMat=[mat('#729751',.92,0,{side:THREE.DoubleSide}),
 mat('#8cac68',.91,0,{side:THREE.DoubleSide}),
 mat('#4d784d',.91,0,{side:THREE.DoubleSide})];

function add(mesh,name,parent=root){mesh.name=name||'';parent.add(mesh);
 state.meshFaces+=mesh.geometry?.index?
 mesh.geometry.index.count/3:mesh.geometry?.attributes?.position?.count/3||0;return mesh;}
function box(w,h,d,x,y,z,material,name){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);return add(mesh,name);}
function rounded(path,x,y,w,h,r){
 const a=w*.5,b=h*.5,rad=Math.min(r,a*.6,b*.6);
 path.moveTo(x-a+rad,y-b);
 path.lineTo(x+a-rad,y-b);
 path.quadraticCurveTo(x+a,y-b,x+a,y-b+rad);
 path.lineTo(x+a,y+b-rad);
 path.quadraticCurveTo(x+a,y+b,x+a-rad,y+b);
 path.lineTo(x-a+rad,y+b);
 path.quadraticCurveTo(x-a,y+b,x-a,y+b-rad);
 path.lineTo(x-a,y-b+rad);
 path.quadraticCurveTo(x-a,y-b,x-a+rad,y-b);
 path.closePath();
 return path;
}
function frameShape(ow,oh,orr,iw,ih,irr,cx=-.4,cy=.02){
 const sh=rounded(new THREE.Shape(),0,0,ow,oh,orr);
 sh.holes.push(rounded(new THREE.Path(),cx,cy,iw,ih,irr));
 return sh;
}

// Original game's CabinetArt generator is the source of all wood grain.
function woodTexture(){
 const cv=document.createElement('canvas');cv.width=512;cv.height=320;
 const ctx=cv.getContext('2d');
 if(window.CabinetArt?.wood)window.CabinetArt.wood(ctx,512,320);
 else{ctx.fillStyle='#845638';ctx.fillRect(0,0,512,320);}
 const t=new THREE.CanvasTexture(cv);
 t.colorSpace=THREE.SRGBColorSpace;
 t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
 t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;
 return t;
}
const walnut=mat('#f4dfbe',.78,.015,{map:woodTexture()});
const tabletop=box(9.70,.23,4.20,0,-2.42,.14,walnut,'original-cabinet-wood-desk');
box(9.57,.15,4.10,0,-2.57,.14,woodEdge,'timber-table-apron');
for(const x of [-4.13,4.13])for(const z of [-1.40,1.68])
 box(.43,1.30,.43,x,-3.26,z,woodLeg,'table-leg');
box(8.80,.26,.17,0,-2.87,1.81,woodLeg,'table-front-stretcher');
box(8.80,.26,.17,0,-2.87,-1.51,woodLeg,'table-rear-stretcher');

function contact(x,z,rx,rz,opacity=.29){
 const cv=document.createElement('canvas');cv.width=cv.height=64;
 const c=cv.getContext('2d');const gr=c.createRadialGradient(32,32,4,32,32,31);
 gr.addColorStop(0,'rgba(12,9,7,'+opacity+')');
 gr.addColorStop(.48,'rgba(12,9,7,'+(opacity*.58)+')');
 gr.addColorStop(1,'rgba(12,9,7,0)');
 c.fillStyle=gr;c.fillRect(0,0,64,64);
 const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.LinearFilter;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(rx*2,rz*2),
  new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,
   polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide}));
 m.rotation.x=-Math.PI/2;m.position.set(x,-2.293,z);add(m,'contact-occlusion');
}
contact(0,0,.0+3.45,1.50,.37);
contact(-3.77,1.10,.62,.55,.28);
contact(3.76,1.18,.49,.43,.29);

// CRT is a real thick shell with an actual through-hole and curved glass.
const shell=frameShape(6.23,4.12,.39,4.78,3.48,.25);
const shellGeo=new THREE.ExtrudeGeometry(shell,{
 depth:1.53,steps:1,bevelEnabled:true,bevelSize:.052,bevelThickness:.052,
 bevelSegments:2,curveSegments:8
});
shellGeo.translate(0,0,-.83);
const shellMesh=add(new THREE.Mesh(shellGeo,[enamel,sideEnamel]),'moulded-3d-crt-chassis');
const trim=add(new THREE.Mesh(
 new THREE.ShapeGeometry(frameShape(5.03,3.74,.31,4.81,3.51,.26)),
 nickel),'thin-satin-screen-surround');
trim.position.z=.753;
const gasketMesh=add(new THREE.Mesh(
 new THREE.ShapeGeometry(frameShape(4.81,3.51,.26,4.70,3.38,.22)),
 gasket),'real-black-screen-gasket');
gasketMesh.position.z=.766;
box(4.72,3.43,.13,-.40,.02,.69,dark,'screen-recess');

// The dynamic programme texture is the *original game-style pixel canvas*.
// THREE.NearestFilter keeps discrete pixels intact across the curved CRT.
const tvTex=new THREE.CanvasTexture(window.WorkTVBroadcast.frame(0,0,false));
tvTex.colorSpace=THREE.SRGBColorSpace;
tvTex.magFilter=THREE.NearestFilter;
tvTex.minFilter=THREE.NearestFilter;
tvTex.generateMipmaps=false;
const displayMat=new THREE.MeshBasicMaterial({map:tvTex,side:THREE.DoubleSide,
 color:0xffffff,toneMapped:false});
function curvedCRT(){
 const cols=36,rows=24,w=4.70,h=3.38,r=.22;
 const positions=[],uvs=[],indices=[];
 for(let j=0;j<=rows;j++){
  const v=j/rows,y=(v-.5)*h,dy=Math.abs(y);
  const reach=dy>h/2-r?
   w/2-r+Math.sqrt(Math.max(0,r*r-(dy-(h/2-r))**2)):w/2;
  for(let i=0;i<=cols;i++){
   const u=i/cols,x=(u-.5)*2*reach;
   const xn=x/(w/2),yn=y/(h/2);
   const bulge=.105*Math.max(0,1-xn*xn)*Math.max(0,1-yn*yn);
   positions.push(-.40+x,.02+y,.81+bulge);
   uvs.push(.5+x/w,.5+y/h);
  }
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;
  indices.push(a,c,b,b,c,d);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geo.setIndex(indices);geo.computeVertexNormals();
 return add(new THREE.Mesh(geo,displayMat),'convex-3d-crt-pixel-screen');
}
curvedCRT();
// Low-alpha reflected window stripe: separate physically curved layer.
const glareMat=new THREE.MeshBasicMaterial({color:0xe2e9f0,transparent:true,
 opacity:.035,depthWrite:false,side:THREE.DoubleSide});
const glare=add(new THREE.Mesh(new THREE.PlaneGeometry(.16,3.0),glareMat),
 'tiny-crt-glass-reflection');
glare.position.set(-2.36,.08,.92);glare.rotation.z=-.20;

// Two true metal knobs and tactile tick marks, no CSS overlay.
const knobs={};
function makeKnob(name,x,y,r){
 const axis=new THREE.Mesh(new THREE.CylinderGeometry(r*1.20,r*1.2,.045,32),
  blackMetal);axis.rotation.x=Math.PI/2;axis.position.set(x,y,.77);add(axis,name+'-black-bezel');
 const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.16,32,1,false),
  dialMetal);cylinder.rotation.x=Math.PI/2;cylinder.position.set(x,y,.86);
 add(cylinder,name+'-turning-dial');
 const pointer=box(.016,.063,.013,x,y+r*.52,.965,blackMetal,name+'-rotating-notch');
 for(let i=0;i<12;i++){
  const a=i*2*Math.PI/12;
  const m=new THREE.Mesh(new THREE.BoxGeometry(.013,.045,.008),nickel);
  m.position.set(x+Math.sin(a)*r*1.50,y+Math.cos(a)*r*1.50,.79);
  m.rotation.z=-a;add(m,name+'-engraved-tick');
 }
 knobs[name]={center:new THREE.Vector3(x,y,.90),pointer};
}
makeKnob('power',2.63,.55,.176);
makeKnob('channel',2.63,-.43,.162);
const indicator=add(new THREE.Mesh(new THREE.SphereGeometry(.048,12,8),
 new THREE.MeshBasicMaterial({color:'#efae65'})),'on-indicator');
indicator.position.set(2.64,-1.22,.803);
box(.45,2.55,.029,2.62,0,.73,blackMetal,'real-recessed-control-panel');

// The TV feet actually sit on the desk, not in mid-air.
for(const x of [-2.17,2.10]){
 box(.47,.27,.61,x,-2.02,-.08,sideEnamel,'tv-foot-shoe');
 box(.56,.047,.78,x,-2.265,-.07,blackMetal,'tv-foot-pad');
}

function makeStem(a,b,r,material,name){
 const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),dir=bb.clone().sub(aa);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.75,r,dir.length(),6),material);
 mesh.position.copy(aa).add(bb).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
 return add(mesh,name);
}
const soil=mat('#40352b',.95,0),potMat=mat('#ad9e87',.74,.05),rimMat=mat('#e0cfaa',.63,.04);
function potAndPlant(){
 const cx=-3.77,cz=1.05,base=-2.30;
 const pot=new THREE.Mesh(new THREE.CylinderGeometry(.35,.26,.51,12,1,false),potMat);
 pot.position.set(cx,base+.255,cz);add(pot,'actual-3d-ceramic-pot');
 const upper=new THREE.Mesh(new THREE.TorusGeometry(.35,.042,6,20),rimMat);
 upper.rotation.x=Math.PI/2;upper.position.set(cx,base+.51,cz);add(upper,'pot-top-lip');
 const dirt=new THREE.Mesh(new THREE.CircleGeometry(.322,16),soil);
 dirt.rotation.x=-Math.PI/2;dirt.position.set(cx,base+.494,cz);add(dirt,'pot-soil');
 let seed=101;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<11;i++){
  const phi=i*2.40,reach=.38+rnd()*.35,height=.58+rnd()*.39;
  const dx=Math.cos(phi),dz=Math.sin(phi);
  const a=[cx,base+.49,cz],mid=[cx+dx*reach*.37,base+.55+height*.44,cz+dz*reach*.37];
  const tip=[cx+dx*reach,base+.55+height,cz+dz*reach];
  makeStem(a,mid,.021,stemMat,'3d-plant-branch');
  makeStem(mid,tip,.012,stemMat,'3d-plant-twig');
  for(let j=0;j<3;j++){
   const f=.40+j*.19;
   const bx=cx+dx*reach*f,by=base+.55+height*f,bz=cz+dz*reach*f;
   const side=j%2?1:-1,off=.19+j*.026;
   const leafTip=[bx+side*dz*off+dx*.12,by+.08,bz-side*dx*off+dz*.12];
   const m=[bx+side*dz*off*.5,by+.065,bz-side*dx*off*.5];
   const vv=[bx,by,bz, m[0]+dx*.08,m[1]+.055,m[2]+dz*.08,
    ...leafTip,m[0]-dx*.07,m[1]-.025,m[2]-dz*.07];
   const mesh=new THREE.BufferGeometry();
   mesh.setAttribute('position',new THREE.Float32BufferAttribute(vv,3));
   mesh.setIndex([0,1,2,0,2,3]);mesh.computeVertexNormals();
   add(new THREE.Mesh(mesh,leafMat[(i+j)%3]),'original-game-faceted-leaf');
  }
 }
}
potAndPlant();
const glassMat=new THREE.MeshPhysicalMaterial({
 color:0xddeff4,transparent:true,opacity:.32,metalness:0,roughness:.08,
 clearcoat:.9,clearcoatRoughness:.07,side:THREE.DoubleSide,depthWrite:false
});
const waterMat=new THREE.MeshPhysicalMaterial({
 color:'#a0ccdb',transparent:true,opacity:.34,roughness:.15,
 metalness:0,depthWrite:false});
function drinkGlass(){
 const x=3.78,z=1.05,base=-2.30;
 const pts=[[.00,.015],[.175,.015],[.192,.04],[.233,.65],
  [.207,.65],[.193,.59],[.158,.105],[.0,.105]];
 const g=new THREE.LatheGeometry(pts.map(q=>new THREE.Vector2(q[0],q[1])),32);
 const cup=add(new THREE.Mesh(g,glassMat),'hollow-3d-water-tumbler');
 cup.position.set(x,base,z);
 const water=add(new THREE.Mesh(new THREE.CylinderGeometry(.197,.176,.28,32),
  waterMat),'volumetric-water');
 water.position.set(x,base+.27,z);
 const rim=add(new THREE.Mesh(new THREE.TorusGeometry(.219,.013,7,32),glassMat),
  'visible-glass-rim');
 rim.rotation.x=Math.PI/2;rim.position.set(x,base+.646,z);
}
drinkGlass();

function view(){
 const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight),aspect=w/h;
 const viewHeight=Math.max(7.55,11.15/aspect);
 camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
 camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
 camera.updateProjectionMatrix();
 const yaw=(-state.yaw)*Math.PI/180,pitch=state.pitch*Math.PI/180;
 const dist=16;
 camera.position.set(Math.sin(yaw)*dist,2+Math.sin(pitch)*dist,Math.cos(yaw)*dist);
 camera.lookAt(0,-.47,0);
 camera.updateMatrixWorld();
 const pxW=Math.max(320,Math.min(w,Math.round(w/2)));
 const pxH=Math.max(230,Math.round(pxW/aspect));
 // Do not reallocate the GPU drawing buffer for every pointer-move orbit.
 if(pxW!==state.pixelSize[0]||pxH!==state.pixelSize[1])renderer.setSize(pxW,pxH,false);
 state.pixelSize=[pxW,pxH];state.viewport=[w,h];
}
view();
window.addEventListener('resize',()=>{view();invalidated=true;},{passive:true});
function project(p){
 const q=p.clone().project(camera);
 return [(q.x*.5+.5)*window.innerWidth,(-q.y*.5+.5)*window.innerHeight];
}
function knobAt(x,y){
 for(const name of ['power','channel']){
  const p=project(knobs[name].center);
  if(Math.hypot(x-p[0],y-p[1])<Math.max(24,Math.min(window.innerWidth,window.innerHeight)*.045))
   return name;
 }
 return null;
}
function switchPower(){
 state.power=!state.power;state.transition=state.power?'boot':'shutdown';
 state.transitionAt=performance.now()/1000;state.pressCount++;
 indicator.visible=state.power;
 knobs.power.pointer.rotation.z=state.power?.45:-.6;
 status.textContent=state.power?'电视正在开机':'电视已关闭';
 invalidated=true;
}
function switchChannel(delta){
 const channels=window.WorkTVBroadcast.labels.length;
 state.channel=((state.channel+delta)%channels+channels)%channels;
 state.showGuide=false;state.transition='switch';
 state.transitionAt=performance.now()/1000;state.pressCount++;
 knobs.channel.pointer.rotation.z=state.channel*.55;
 status.textContent='频道 '+(state.channel+1)+' · '+window.WorkTVBroadcast.labels[state.channel];
 invalidated=true;
}
let down=null,invalidated=true;
canvas.addEventListener('pointerdown',e=>{
 canvas.setPointerCapture(e.pointerId);
 down={x:e.clientX,y:e.clientY,yaw:state.yaw,pitch:state.pitch,
  knob:knobAt(e.clientX,e.clientY),moved:false};
});
canvas.addEventListener('pointermove',e=>{
 if(!down){canvas.style.cursor=knobAt(e.clientX,e.clientY)?'pointer':'grab';return;}
 const dx=e.clientX-down.x,dy=e.clientY-down.y;
 if(Math.hypot(dx,dy)<6)return;
 down.moved=true;
 if(down.knob)return;
 state.dragging=true;state.yaw=Math.max(-45,Math.min(45,down.yaw+dx*.085));
 state.pitch=Math.max(-15,Math.min(30,down.pitch+dy*.075));
 view();invalidated=true;
});
canvas.addEventListener('pointerup',e=>{
 if(!down)return;const d=down;down=null;state.dragging=false;
 if(d.moved&&!d.knob)return;
 if(d.knob==='power')switchPower();
 if(d.knob==='channel')switchChannel(1);
});
canvas.addEventListener('pointercancel',()=>{down=null;state.dragging=false;});
canvas.addEventListener('dblclick',()=>{
 state.yaw=-22;state.pitch=11;view();invalidated=true;
});
window.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)switchPower();}
 if(e.code==='ArrowLeft'){state.yaw=Math.max(-45,state.yaw-5);view();invalidated=true;}
 if(e.code==='ArrowRight'){state.yaw=Math.min(45,state.yaw+5);view();invalidated=true;}
 if(e.code==='ArrowUp'||e.code==='KeyC')switchChannel(1);
 if(e.code==='ArrowDown')switchChannel(-1);
 if(e.code==='KeyI'){state.showGuide=!state.showGuide;invalidated=true;}
 if(/^Digit[1-6]$/.test(e.code))switchChannel(Number(e.code.slice(5))-1-state.channel);
 if(e.code==='KeyR'){state.yaw=-22;state.pitch=11;view();invalidated=true;}
 if(e.code==='Escape')location.href='../../soul-table.html';
});
let last=0,elapsed=0,lastPaint=0,realFrames=0;
function tick(ms){
 requestAnimationFrame(tick);
 if(document.hidden)return;
 const sec=ms*.001,dt=last?Math.min(.15,(ms-last)*.001):0;last=ms;
 elapsed+=dt;
 // Count PRESENTED GPU frames, not idle requestAnimationFrame callbacks.
 if(elapsed>.8){state.fps=Math.round(realFrames/elapsed);realFrames=0;elapsed=0;}
 // 30 fps is sufficient for a stationary tabletop. Avoid busy 60fps polling
 // and never redraw the geometry pixel-by-pixel on the JavaScript main thread.
 const period=1000/(state.dragging?45:30);
 if(!invalidated&&ms-lastPaint<period)return;
 const started=performance.now();
 if(invalidated||ms-state.lastProgramAt>1000/15){
  if(state.power){
   tvTex.image=window.WorkTVBroadcast.frame(state.channel,sec,state.showGuide);
   tvTex.needsUpdate=true;state.programFrames++;
  }
  state.lastProgramAt=ms;
 }
 const age=sec-state.transitionAt;
 if(state.transition==='boot'&&age>.65)state.transition='on';
 if(state.transition==='shutdown'&&age>.47)state.transition='off';
 const brightness=state.power?
  (state.transition==='boot'?Math.min(1,Math.max(.015,age/.65)):.99):
  Math.max(.002,1-Math.max(0,age)/.47);
 displayMat.color.setRGB(brightness,brightness,brightness);
 screenLight.intensity=brightness*.68;
 renderer.render(scene,camera);
 state.frames++;realFrames++;
 state.drawCalls=renderer.info.render.calls;
 state.renderMs=Math.round((performance.now()-started)*10)/10;
 lastPaint=ms;invalidated=false;
}
requestAnimationFrame(tick);
window.WorkTVQA={
 state:()=>({
  backend:'webgl-three-shared-vendor',isReal3D:true,
  pixelPipeline:'original-WorldArt+SlotStudy+CabinetArt+ReelArt',
  screenPrograms:window.WorkTVBroadcast.labels.length,
  broadcast:window.WorkTVBroadcast.status(),
  programScripts:window.WorkTVBroadcast.scripts.length,
  screenSize:[496,324],pixelResolution:state.pixelSize,viewport:state.viewport,
  webgl:!!renderer.getContext(),pixelNearest:tvTex.magFilter===THREE.NearestFilter,
  sceneDrawCalls:state.drawCalls,geometryFaces:state.meshFaces,
  power:state.power,channel:state.channel,showGuide:state.showGuide,
  yaw:state.yaw,pitch:state.pitch,pressCount:state.pressCount,
  powerTransition:state.transition,frames:state.frames,
  fps:state.fps,frameRenderMs:state.renderMs,programFrames:state.programFrames,
  controlPositions:{
   power:project(knobs.power.center),channel:project(knobs.channel.center)
  }
 }),
 setAngles:(yaw,pitch)=>{state.yaw=Math.max(-45,Math.min(45,yaw));state.pitch=Math.max(-15,Math.min(30,pitch));view();invalidated=true;},
 setPower:v=>{if(state.power!==!!v)switchPower();},
 nextChannel:()=>switchChannel(1)
};
status.textContent='WORK 电视台 · GPU 像素渲染已启动';

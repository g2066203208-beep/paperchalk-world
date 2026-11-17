import * as THREE from "../vendor/three.module.js";

/* 3D whitebox / paintover study. Original Anima actor from the user's repo.
   Remaining surface textures are deliberately labelled PROCEDURAL PLACEHOLDERS,
   constructed as separate editable paint/mask/decals. No full-scene AI image. */
const $=id=>document.getElementById(id), canvas=$("world");
const mobileMatch=window.matchMedia("(max-width:900px)");
const compact=mobileMatch.matches;
let drawerOpen=false;
let cameraTouched=false;
const isPortrait=()=>canvas.clientWidth<canvas.clientHeight*.86;
const clockNow=()=>performance.now();
const state={whitebox:false,day:false,actor:true,foreground:true,decals:true,shadows:true,weights:{base:1,grime:.70,wet:.55,growth:.65,ink:.64}};
const scene=new THREE.Scene();
scene.background=new THREE.Color("#172932");
scene.fog=new THREE.FogExp2("#263e42",.018);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
// Fast touch default: reduce real fill-rate and shadow-map cost instead
// of shrinking the whole playable canvas to half the screen.
const mobileRatio=compact?.88:1.35;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobileRatio));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// All sun shadow casters are static except the Anima actor on user input.
// A full shadow pass every frame doubles scene draw cost on mobile GPUs.
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
const camera=new THREE.PerspectiveCamera(40,1,.1,100);
const target=new THREE.Vector3(0,2,-.5);
let yaw=.57,pitch=1.03,distance=22;
let cameraPreset="desktop";
let resetCounter=0;
function setCameraPreset(force=false){
 if(cameraTouched&&!force)return;
 const stageRect=canvas.getBoundingClientRect();
 const portrait=stageRect.width<stageRect.height*.86;
 if(compact&&portrait){
  // Strong vertical hero-and-architecture framing, with real X/Z depth.
  // We intentionally favor the character, doors, and stained-glass window.
  target.set(.12,2.23,-2.05);
  yaw=.40;pitch=1.01;distance=24.0;camera.fov=55;
  cameraPreset="portrait";
 }else if(compact){
  target.set(.2,2.42,-1.25);
  yaw=.54;pitch=1.02;distance=16.2;camera.fov=42;
  cameraPreset="landscape";
 }else{
  target.set(0,2,-.5);
  yaw=.57;pitch=1.03;distance=22;camera.fov=40;
  cameraPreset="desktop";
 }
 cameraTouched=false;
 cameraUpdate();
}
function cameraUpdate(){
 const r=Math.sin(pitch)*distance;
 camera.position.set(target.x+r*Math.sin(yaw),target.y+Math.cos(pitch)*distance,target.z+r*Math.cos(yaw));
 camera.lookAt(target);
 renderer.shadowMap.needsUpdate=true;
}
cameraUpdate();
const ambient=new THREE.HemisphereLight("#a1c5cb","#493b32",1.12);scene.add(ambient);
const sun=new THREE.DirectionalLight("#aac5c5",1.8);
sun.position.set(-3,11,9);sun.castShadow=true;
sun.shadow.mapSize.set(compact?512:1024,compact?512:1024);
sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;
sun.shadow.camera.near=.3;sun.shadow.camera.far=50;sun.shadow.bias=-.00026;
sun.shadow.normalBias=.027;scene.add(sun,sun.target);
sun.target.position.set(0,0,-2);
const lamp=new THREE.PointLight("#ffb363",33,13,2);lamp.position.set(3.4,5.65,-3.9);scene.add(lamp);
const edgeLight=new THREE.PointLight("#74afb2",11,13,2);edgeLight.position.set(-5,4.5,-2.1);scene.add(edgeLight);
const root=new THREE.Group();scene.add(root);
const architecture=[],masks=[],foreground=[],shadows=[],actors=[],anim=[],surfaceBundles=[];
const whiteMat=new THREE.MeshStandardMaterial({color:"#b5b8b7",roughness:.87,metalness:0});
const whiteDark=new THREE.MeshStandardMaterial({color:"#616c70",roughness:1});
const oak=new THREE.MeshStandardMaterial({color:"#302a27",roughness:.82,metalness:.04});
const iron=new THREE.MeshStandardMaterial({color:"#1d2525",roughness:.46,metalness:.57});
const gold=new THREE.MeshStandardMaterial({color:"#9e865c",roughness:.48,metalness:.58});
const glass=new THREE.MeshPhysicalMaterial({color:"#326d78",emissive:"#287482",emissiveIntensity:.47,roughness:.19,metalness:.08,transparent:true,opacity:.82,side:THREE.DoubleSide});
const wetGlass=new THREE.MeshBasicMaterial({color:"#91c5ce",transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide});
let rng=149391;
function rand(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
function range(a,b){return a+(b-a)*rand();}
function canv(w=384,h=384){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}
function tex(c,rx=1,ry=1){
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(rx,ry);t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
 return t;
}
function paintLayer(type,seed){
 // Each layer really is a separate image. Only the composite gets uploaded to GPU.
 rng=seed;
 const b=canv(),g=canv(),w=canv(),m=canv(),k=canv();
 const bc=b.getContext("2d"),gc=g.getContext("2d"),wc=w.getContext("2d"),mc=m.getContext("2d"),kc=k.getContext("2d");
 const palette=type==="floor"?["#53605b","#60645c","#464f50","#6c6e60","#434f4c"]:
  type==="wood"?["#4e3b31","#624b39","#3e3530","#514038","#493b35"]:
  ["#716f64","#827969","#605f59","#888071","#545e59"];
 bc.fillStyle=palette[0];bc.fillRect(0,0,384,384);
 if(type==="floor"){
  const tw=76,th=57;
  for(let y=-th;y<440;y+=th)for(let x=-tw;x<450;x+=tw){
   const bx=x+(Math.floor(y/th)%2?tw*.5:0),by=y;
   bc.fillStyle=palette[Math.floor(rand()*palette.length)];
   bc.fillRect(bx+2,by+2,tw-4,th-4);
   bc.fillStyle="rgba(12,26,28,.20)";bc.fillRect(bx+1,by+th-4,tw-2,3);
   bc.fillStyle="rgba(247,219,165,.10)";bc.fillRect(bx+3,by+3,tw-6,2);
  }
 }else if(type==="wood"){
  for(let i=0;i<8;i++){
   const x=i*48;bc.fillStyle=palette[i%5];bc.fillRect(x+2,0,44,384);
   bc.fillStyle="#211e1a";bc.fillRect(x,0,2,384);
  }
 }else{
  for(let j=0;j<220;j++){
   const x=range(0,384),y=range(0,384),rx=range(8,60),ry=range(3,25);
   bc.fillStyle=palette[Math.floor(rand()*palette.length)];
   bc.globalAlpha=range(.06,.29);
   bc.beginPath();bc.ellipse(x,y,rx,ry,range(-1,1),0,Math.PI*2);bc.fill();
  }
  bc.globalAlpha=1;
 }
 // Pigment grains, paint-brush streaks and impasto hints.
 for(let i=0;i<5100;i++){
  const x=range(0,384),y=range(0,384),light=rand()>.57;
  bc.fillStyle=light?"rgba(248,227,182,.13)":"rgba(13,25,31,.13)";
  bc.fillRect(x,y,range(.5,5.3),range(.3,2.8));
 }
 for(let i=0;i<300;i++){
  bc.strokeStyle=rand()>.5?"rgba(220,194,147,.11)":"rgba(14,30,35,.15)";
  bc.lineWidth=range(.5,1.8);bc.beginPath();
  const x=range(0,384),y=range(0,384);bc.moveTo(x,y);
  bc.lineTo(x+range(-14,28),y+range(-4,5));bc.stroke();
 }
 // Each RGBA mask has unique coverage; never just tint the whole image.
 for(let i=0;i<180;i++){
  const x=range(0,384),y=range(0,384),r=range(4,49);
  const gr=gc.createRadialGradient(x,y,0,x,y,r);
  gr.addColorStop(0,rand()>.52?"rgba(27,28,28,.35)":"rgba(64,49,40,.33)");
  gr.addColorStop(1,"rgba(45,40,34,0)");
  gc.fillStyle=gr;gc.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<110;i++){
  const x=range(0,384),y=range(0,384),r=range(7,59);
  const radial=wc.createRadialGradient(x,y,0,x,y,r);
  radial.addColorStop(0,"rgba(11,34,40,.34)");radial.addColorStop(1,"rgba(11,34,40,0)");
  wc.fillStyle=radial;wc.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<150;i++){
  const x=range(0,384),y=range(0,384),r=range(2,28);
  const radial=mc.createRadialGradient(x,y,0,x,y,r);
  radial.addColorStop(0,rand()>.43?"rgba(38,72,57,.45)":"rgba(100,110,65,.33)");
  radial.addColorStop(1,"rgba(38,72,57,0)");
  mc.fillStyle=radial;mc.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<460;i++){
  const x=range(0,384),y=range(0,384);
  kc.strokeStyle=rand()>.45?"rgba(23,28,27,.31)":"rgba(232,212,171,.15)";
  kc.lineWidth=range(.35,1.6);
  kc.beginPath();kc.moveTo(x,y);
  kc.lineTo(x+range(-8,27),y+range(-4,6));kc.stroke();
 }
 const final=canv(),ctx=final.getContext("2d");
 const texture=tex(final,type==="wall"?3:type==="floor"?3:1,type==="wall"?1.75:type==="floor"?2.2:1);
 const material=new THREE.MeshStandardMaterial({map:texture,color:"#ffffff",roughness:type==="floor"?.57:.91,metalness:type==="floor"?.11:.015});
 const bdl={type,base:b,grime:g,wet:w,growth:m,ink:k,ctx,texture,material};
 surfaceBundles.push(bdl);
 function rebuild(){
  ctx.clearRect(0,0,384,384);
  const alpha=state.weights.base;
  ctx.fillStyle=type==="floor"?"#444f50":type==="wood"?"#423931":"#686f6e";
  ctx.fillRect(0,0,384,384);
  ctx.globalAlpha=alpha;ctx.drawImage(b,0,0);
  ctx.globalAlpha=state.weights.grime;ctx.drawImage(g,0,0);
  ctx.globalAlpha=state.weights.wet;ctx.drawImage(w,0,0);
  ctx.globalAlpha=state.weights.growth;ctx.drawImage(m,0,0);
  ctx.globalAlpha=state.weights.ink;ctx.drawImage(k,0,0);
  ctx.globalAlpha=1;
  texture.needsUpdate=true;
 }
 bdl.rebuild=rebuild;rebuild();
 return material;
}
const wallPaint=paintLayer("wall",434);
const floorPaint=paintLayer("floor",9325);
const woodPaint=paintLayer("wood",57);
function add(g,mat,x,y,z,opts={}){
 const mesh=new THREE.Mesh(g,mat);
 mesh.position.set(x,y,z);
 mesh.castShadow=opts.cast!==false;mesh.receiveShadow=opts.receive!==false;
 if(opts.rot)mesh.rotation.set(...opts.rot);
 root.add(mesh);
 if(opts.arch!==false)architecture.push({mesh,original:mat,white:opts.white||whiteMat});
 return mesh;
}
function box(x,y,z,w,h,d,mat=wallPaint,opts={}){
 return add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,opts);
}
function cyl(x,y,z,rTop,rBottom,h,mat=wallPaint,segments=12){
 return add(new THREE.CylinderGeometry(rTop,rBottom,h,segments),mat,x,y,z);
}
// Ground, 3D perimeter and true elevation.
box(0,-.34,.2,17,.68,14,floorPaint);
box(0,-.02,-1.1,14.8,.12,10.8,floorPaint);
box(0,4.0,-6.6,16,8.4,.65,wallPaint);
box(-8.02,3.4,-2.1,.52,7.2,9.5,wallPaint);
box(8.02,3.4,-2.1,.52,7.2,9.5,wallPaint);
box(0,7.94,-6.2,16.55,.42,1.2,wallPaint);
box(-8.15,6.6,-2.2,.45,.42,9.8,wallPaint);
box(8.15,6.6,-2.2,.45,.42,9.8,wallPaint);
box(0,.23,-4.4,10.3,.43,2.8,floorPaint);
box(0,.12,-2.77,9.5,.22,.54,floorPaint);
box(0,.05,-2.22,8.7,.12,.36,floorPaint);
// Stone pillars and capitals cast real world shadow.
function pillar(x,z,height=6.6){
 box(x,.26,z,1.42,.5,1.5,wallPaint);
 cyl(x,height/2+.45,z,.57,.66,height,wallPaint,14);
 box(x,height+.52,z,1.66,.32,1.7,wallPaint);
 box(x,height+.76,z,1.96,.21,1.85,wallPaint);
}
pillar(-6.25,-3.9,6.6);
pillar(6.25,-3.9,6.6);
pillar(-6.7,3.2,5.55);
pillar(6.7,3.2,5.55);
// Pointed 3D arch built from individual wedge-like blocks.
function arch(cx,cy,z,scale=1){
 const w=3.65*scale,h=5.15*scale;
 box(cx-w*.49,cy+h*.39,z,.58*scale,h*.88,.72,wallPaint);
 box(cx+w*.49,cy+h*.39,z,.58*scale,h*.88,.72,wallPaint);
 for(let i=0;i<9;i++){
  const theta=Math.PI-(i/8)*Math.PI;
  const x=cx+Math.cos(theta)*w*.54;
  const y=cy+h*.80+Math.sin(theta)*w*.36;
  const b=box(x,y,z,.78*scale,.55*scale,.75*scale,wallPaint);
  b.rotation.z=theta-Math.PI/2;
 }
}
const door=box(-3.8,2.52,-6.03,3.0,4.95,.16,woodPaint);
arch(-3.8,-.14,-5.78,.98);
for(let i=-1;i<=1;i++)box(-3.8+i*.85,2.53,-5.90,.055,4.75,.14,iron);
box(-4.4,2.35,-5.86,.08,.36,.11,gold);
box(-3.8,.36,-5.76,3.1,.4,.6,wallPaint);
// Real stained glass, translucent with layered mullions and no fake sky light.
box(3.2,4.2,-6.05,3.9,4.85,.22,wallPaint);
box(3.2,4.22,-5.78,3.05,3.90,.14,glass);
for(let i=-1;i<=1;i++)box(3.2+i*.85,4.2,-5.58,.085,4.0,.13,iron);
for(let j=-1;j<=1;j++)box(3.2,4.2+j*.91,-5.57,3.2,.075,.13,iron);
arch(3.2,1.43,-5.69,.92);
box(3.2,1.83,-5.37,4.12,.32,.8,wallPaint);
// Contact AO from real geometry and custom translucent projected floor light.
const plane=add(new THREE.PlaneGeometry(3.25,7.7),new THREE.MeshBasicMaterial({color:"#56a7b4",transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}),2.1,.086,-1.0,{rot:[-Math.PI/2,0,-.27],arch:false,cast:false,receive:false});
masks.push(plane);
const puddles=[];
for(const [x,z,r] of [[-2,1.7,1.2],[2.5,2.2,.95],[4.3,-1,1.1]]){
 const m=add(new THREE.CircleGeometry(r,48),new THREE.MeshPhysicalMaterial({color:"#8bafae",metalness:.36,roughness:.15,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}),x,.09,z,{rot:[-Math.PI/2,0,0],arch:false,cast:false,receive:false});
 m.scale.set(1.7,.40,1);masks.push(m);puddles.push(m);
}
// One believable midground piece of actual furniture and props.
box(-.7,.57,-3.77,2.7,1.13,1.1,woodPaint);
box(-.7,1.17,-3.77,2.84,.16,1.24,woodPaint);
for(const x of [-1.92,.49])box(x,.28,-3.3,.15,.53,.2,woodPaint);
box(-.85,1.42,-3.86,.44,.48,.30,iron);
const bottle=add(new THREE.CylinderGeometry(.10,.16,.65,12),glass,-.13,1.54,-3.81);
const top=add(new THREE.CylinderGeometry(.06,.06,.22,10),iron,-.13,1.96,-3.81);
// Removable surface painted decals: they are separate alpha planes in WORLD space.
function splatCanvas(tone="#d9bd82"){
 const c=canv(512,256),g=c.getContext("2d");rng=34865;
 for(let i=0;i<30;i++){
  const x=range(0,512),y=range(0,256),r=range(16,90),gr=g.createRadialGradient(x,y,0,x,y,r);
  gr.addColorStop(0,rand()>.5?"rgba(29,47,43,.31)":"rgba(111,93,67,.25)");
  gr.addColorStop(1,"rgba(29,47,43,0)");
  g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r);
 }
 // Artistic irregular paint line shapes.
 for(let j=0;j<8;j++){
  g.beginPath();g.moveTo(range(0,512),range(0,256));
  for(let i=0;i<9;i++)g.lineTo(range(0,512),range(0,256));
  g.strokeStyle="rgba(23,34,35,.14)";g.lineWidth=range(1,2);g.stroke();
 }
 return tex(c);
}
const wallDecalTexture=splatCanvas();
function paintDecal(x,y,z,w,h,rot=0){
 const mat=new THREE.MeshBasicMaterial({map:wallDecalTexture,transparent:true,opacity:.9,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
 const plane=add(new THREE.PlaneGeometry(w,h),mat,x,y,z,{arch:false,cast:false,receive:false});
 plane.rotation.z=rot;masks.push(plane);return plane;
}
paintDecal(0.5,4.5,-6.223,4.6,3.6,-.07);
paintDecal(5.8,3.4,-6.223,3.3,5.2,.11);
paintDecal(-5.8,4.8,-6.223,3.2,3.1,-.15);
// Thin alpha planes with hand-like individual leaf & fabric silhouettes.
// These are procedure-made placeholders to be replaced by Anima transparent PNGs.
function leavesCanvas(){
 const c=canv(512,512),g=c.getContext("2d");rng=98334;
 const leaves=["#3b6657","#567663","#6b7c58","#304b49","#7b8c65"];
 for(let b=0;b<20;b++){
  let x=range(0,512),y=range(-100,150);
  const ex=x+range(-100,100),ey=range(300,620);
  g.strokeStyle="rgba(39,54,43,.82)";g.lineWidth=range(2,5);g.beginPath();
  g.moveTo(x,y);g.quadraticCurveTo(x+range(-90,90),range(100,300),ex,ey);g.stroke();
  for(let i=0;i<14;i++){
   const t=i/14,px=x+(ex-x)*t+Math.sin(t*Math.PI*2)*15,py=y+(ey-y)*t;
   const s=i%2?1:-1,rx=range(4,13),ry=range(11,25);
   g.save();g.translate(px,py);g.rotate(s*range(.2,.9));
   g.fillStyle=leaves[Math.floor(rand()*leaves.length)];
   g.beginPath();g.ellipse(s*rx,0,rx,ry,range(-.2,.2),0,Math.PI*2);g.fill();g.restore();
  }
 }
 return tex(c);
}
const leafTex=leavesCanvas();
function plant(x,y,z,w=3.1,h=4.6,rotation=0){
 const mat=new THREE.MeshStandardMaterial({map:leafTex,transparent:true,alphaTest:.09,depthWrite:true,side:THREE.DoubleSide,color:"#cbd8c1",roughness:1});
 const mesh=add(new THREE.PlaneGeometry(w,h),mat,x,y,z,{arch:false,cast:false,receive:false});
 mesh.rotation.y=rotation;foreground.push(mesh);return mesh;
}
plant(-5.88,4.88,-5.91,3.6,5,.06);
plant(6.0,5.3,-5.95,3.2,4.2,-.05);
plant(-7.15,4.5,1.55,2.8,5.5,.6);
plant(7.35,4.8,1.3,2.6,5.8,-.7);
// Cloth: separate transparent geometry which sways in WORLD, not HUD.
function clothCanvas(){
 const c=canv(256,512),g=c.getContext("2d");rng=773;
 const grad=g.createLinearGradient(0,0,256,0);
 grad.addColorStop(0,"rgba(62,51,46,.04)");grad.addColorStop(.22,"rgba(89,71,60,.86)");
 grad.addColorStop(.60,"rgba(71,66,63,.92)");grad.addColorStop(1,"rgba(46,48,49,.04)");
 g.fillStyle=grad;g.beginPath();g.moveTo(25,0);g.lineTo(244,0);
 for(let x=244;x>=20;x-=22)g.lineTo(x,range(407,485));g.closePath();g.fill();
 for(let i=0;i<45;i++){
  g.strokeStyle=rand()>.5?"rgba(215,172,127,.11)":"rgba(16,27,29,.12)";
  g.lineWidth=range(.4,2.3);g.beginPath();let x=range(35,220);
  g.moveTo(x,0);g.bezierCurveTo(x+range(-26,26),130,x+range(-35,35),300,x+range(-20,20),440);g.stroke();
 }
 return tex(c);
}
const cloth=add(new THREE.PlaneGeometry(3.6,5.7),new THREE.MeshStandardMaterial({map:clothCanvas(),transparent:true,side:THREE.DoubleSide,depthWrite:false,roughness:1}),-6.4,5.2,.0,{arch:false,cast:false,receive:false});
cloth.rotation.y=.17;foreground.push(cloth);anim.push(cloth);
// Physical lamp assembly and animated warm lighting.
box(3.45,7.35,-3.9,.09,1.35,.09,iron);
const lum=add(new THREE.SphereGeometry(.30,16,10),new THREE.MeshBasicMaterial({color:"#ffe1a2"}),3.45,6.47,-3.9,{cast:false,arch:false});
const shade=add(new THREE.ConeGeometry(.67,.56,8,1,true),gold,3.45,6.69,-3.9,{arch:false,cast:false});
const lampHalo=add(new THREE.SpriteMaterial({color:"#ffd08a",transparent:true,opacity:.36,depthWrite:false})?new THREE.PlaneGeometry(.7,.7):new THREE.PlaneGeometry(.7,.7),
 new THREE.MeshBasicMaterial({color:"#ffd39c",transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}),
 3.45,6.48,-3.85,{arch:false,cast:false,receive:false});
lampHalo.scale.set(2.5,2.5,1);
/* One-time static geometry batching: dozens of separate bricks/pillars are
 * still real triangles with original world depth, normals and UVs, but use
 * ONE draw call per opaque material. Transparent and animated world-space
 * cutouts stay independent and depth-correct. Whitebox remains reversible. */
function batchStaticWorld(){
 const buckets=new Map();
 for(const item of architecture){
  const mesh=item.mesh,material=item.original;
  if(!(mesh?.isMesh)||material.transparent||mesh.isSkinnedMesh)continue;
  const k=material.uuid+":"+mesh.castShadow+":"+mesh.receiveShadow;
  if(!buckets.has(k))buckets.set(k,{items:[],material,white:item.white,cast:mesh.castShadow,receive:mesh.receiveShadow});
  buckets.get(k).items.push(item);
 }
 const mergedItems=new Set();
 for(const group of buckets.values()){
  if(group.items.length<2)continue;
  const position=[],normal=[],uv=[];
  for(const item of group.items){
   const mesh=item.mesh;
   mesh.updateMatrix();
   const orig=mesh.geometry;
   const geom=orig.index?orig.toNonIndexed():orig.clone();
   geom.applyMatrix4(mesh.matrix);
   const a=geom.getAttribute("position"),b=geom.getAttribute("normal"),c=geom.getAttribute("uv");
   if(!a||!b||!c){geom.dispose();throw Error("Static 3D geometry missing position/normal/uv");}
   for(let i=0;i<a.count;i++){
    position.push(a.getX(i),a.getY(i),a.getZ(i));
    normal.push(b.getX(i),b.getY(i),b.getZ(i));
    uv.push(c.getX(i),c.getY(i));
   }
   geom.dispose();root.remove(mesh);orig.dispose();
   mergedItems.add(item);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(position,3));
  geometry.setAttribute("normal",new THREE.Float32BufferAttribute(normal,3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,group.material);
  mesh.castShadow=group.cast;mesh.receiveShadow=group.receive;
  root.add(mesh);
  group.replacement={mesh,original:group.material,white:group.white};
 }
 const retained=architecture.filter(item=>!mergedItems.has(item));
 for(const g of buckets.values())if(g.replacement)retained.push(g.replacement);
 architecture.length=0;architecture.push(...retained);
 renderer.shadowMap.needsUpdate=true;
}
batchStaticWorld();

// Soft shadow physically located below character.
function circleShadow(x,z){
 const c=canv(128,128),g=c.getContext("2d"),rad=g.createRadialGradient(64,64,0,64,64,62);
 rad.addColorStop(0,"rgba(10,18,20,.66)");rad.addColorStop(.5,"rgba(14,25,26,.32)");rad.addColorStop(1,"rgba(14,25,26,0)");
 g.fillStyle=rad;g.fillRect(0,0,128,128);
 const mesh=add(new THREE.PlaneGeometry(2.4,1.5),new THREE.MeshBasicMaterial({map:tex(c),transparent:true,depthWrite:false,side:THREE.DoubleSide}),x,.107,z,{rot:[-Math.PI/2,0,0],arch:false,cast:false,receive:false});
 shadows.push(mesh);return mesh;
}
circleShadow(.52,-1.25);
const actorSlot=new THREE.Group();actorSlot.position.set(.52,0,-1.25);root.add(actorSlot);
let loadedActor=false;
const actorPath="../assets/characters/monster-hunters/02-blood-physician.png";
function removeWhiteBackground(img){
 const w=img.naturalWidth,h=img.naturalHeight,c=canv(w,h),g=c.getContext("2d",{willReadFrequently:true});
 g.drawImage(img,0,0);
 const image=g.getImageData(0,0,w,h),p=image.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h);
 let st=0,en=0,bright=0;
 for(const [x,y] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1]])if(p[(y*w+x)*4+3]<64)bright++;
 if(bright>=3)return c;
 const outside=i=>{const k=i*4,r=p[k],gr=p[k+1],b=p[k+2];return p[k+3]>0&&r>220&&gr>220&&b>220&&Math.max(r,gr,b)-Math.min(r,gr,b)<33;};
 function seed(i){if(!seen[i]&&outside(i)){seen[i]=1;q[en++]=i;}}
 for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}
 for(let y=1;y<h-1;y++){seed(y*w);seed(y*w+w-1)}
 while(st<en){const i=q[st++],x=i%w,y=(i-x)/w;
  if(x>0)seed(i-1);if(x<w-1)seed(i+1);if(y>0)seed(i-w);if(y<h-1)seed(i+w);
 }
 if(en>w*h*.025){
  for(let i=0;i<en;i++)p[q[i]*4+3]=0;
  for(let i=0;i<en;i++){
   const u=q[i],x=u%w,y=(u-x)/w;
   for(const near of [x>0?u-1:-1,x<w-1?u+1:-1,y>0?u-w:-1,y<h-1?u+w:-1]){
    if(near<0||seen[near])continue;
    const off=near*4,R=p[off],G=p[off+1],B=p[off+2],low=Math.min(R,G,B);
    if(low>=185&&Math.max(R,G,B)-low<48)p[off+3]=Math.min(p[off+3],Math.max(28,Math.floor((243-low)*3.5)));
   }
  }
  g.putImageData(image,0,0);
 }
 return c;
}
const img=new Image();
img.onload=()=>{
 try{
  const source=removeWhiteBackground(img),texture=tex(source);
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  const w=3.35,h=4.85;
  const actor=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.05,depthWrite:true,side:THREE.DoubleSide,roughness:1,metalness:0,color:"#f0ece2"}));
  actor.position.y=h/2-.02;actor.position.z=.0;actor.castShadow=true;actor.receiveShadow=true;
  actorSlot.add(actor);actors.push(actor);loadedActor=true;
  renderer.shadowMap.needsUpdate=true;
  actor.visible=state.actor;
  $("status").textContent="3D + Anima 原图已加载";
 }catch(e){console.error("Anima portrait matte",e);$("status").textContent="人物抠图失败，三维场景仍可用";}
};
img.onerror=()=>{$("status").textContent="人物原图加载失败，三维场景仍可用";};
img.src=actorPath;
// Floating dust stays in 3D space, with subtly animated positions.
const dustN=compact?75:180,dustPos=new Float32Array(dustN*3),dustOrigin=new Float32Array(dustN*3);
rng=752;
for(let i=0;i<dustN;i++){
 dustOrigin[3*i]=dustPos[3*i]=range(-7,7);
 dustOrigin[3*i+1]=dustPos[3*i+1]=range(.4,7.3);
 dustOrigin[3*i+2]=dustPos[3*i+2]=range(-5.7,4.3);
}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:"#f3cc91",size:.047,transparent:true,opacity:.56,depthWrite:false,sizeAttenuation:true}));
root.add(dust);
function relight(){
 state.day=!state.day?false:true;
 if(state.day){
  ambient.intensity=2.05;sun.color.set("#d9e2d1");sun.intensity=2.55;
  lamp.intensity=3.8;edgeLight.intensity=5;scene.background.set("#637a7c");scene.fog.color.set("#697a7c");
  renderer.toneMappingExposure=1.05;
 }else{
  ambient.intensity=1.12;sun.color.set("#aac5c5");sun.intensity=1.8;
  lamp.intensity=33;edgeLight.intensity=11;scene.background.set("#172932");scene.fog.color.set("#263e42");
  renderer.toneMappingExposure=1.18;
 }
 for(const id of ["day","night"]){$(id).classList.toggle("current",id===(state.day?"day":"night"));$(id).setAttribute("aria-pressed",String(id===(state.day?"day":"night")));}
}
function sync(){
 for(const item of architecture)item.mesh.material=state.whitebox?item.white:item.original;
 for(const ob of foreground)ob.visible=state.foreground&&!state.whitebox;
 for(const ob of masks)ob.visible=state.decals&&!state.whitebox;
 for(const ob of shadows)ob.visible=state.shadows&&!state.whitebox;
 for(const a of actors)a.visible=state.actor;
 lampHalo.visible=!state.whitebox; dust.visible=!state.whitebox;
 renderer.shadowMap.enabled=state.shadows;sun.castShadow=state.shadows;
 if(state.shadows)renderer.shadowMap.needsUpdate=true;
 for(const id of ["finished","whitebox"]){
  const v=id===(state.whitebox?"whitebox":"finished");
  $(id).classList.toggle("current",v);$(id).setAttribute("aria-pressed",String(v));
 }
 $("mode-state").textContent=state.whitebox?"真实白膜 / 深度":"多层权重合成";
 $("mobile-view").setAttribute("aria-pressed",String(state.whitebox));
 $("mobile-view-label").textContent=state.whitebox?"合成":"白膜";
 $("mobile-light").setAttribute("aria-pressed",String(state.day));
 $("mobile-light-label").textContent=state.day?"夜景":"昼光";
}
let materialFrame=0;
function requestMaterialRebuild(){
 if(materialFrame)return;
 materialFrame=requestAnimationFrame(()=>{
  materialFrame=0;for(const b of surfaceBundles)b.rebuild();
 });
}
for(const name of ["base","grime","wet","growth","ink"]){
 $(name).addEventListener("input",ev=>{
  state.weights[name]=Number(ev.target.value)/100;
  $(name+"-value").value=ev.target.value+"%";
  requestMaterialRebuild();
 });
}
for(const id of ["actor","foreground","decals","shadows"])$(id).addEventListener("change",ev=>{state[id]=ev.target.checked;sync()});
$("whitebox").addEventListener("click",()=>{state.whitebox=true;sync()});
$("finished").addEventListener("click",()=>{state.whitebox=false;sync()});
$("day").addEventListener("click",()=>{state.day=true;relight();sync()});
$("night").addEventListener("click",()=>{state.day=false;relight();sync()});
function setDrawer(open){
 drawerOpen=compact&&!!open;
 document.documentElement.classList.toggle("panel-open",drawerOpen);
 $("mobile-panel").setAttribute("aria-expanded",String(drawerOpen));
 $("material-controls").setAttribute("aria-hidden",String(compact&&!drawerOpen));
 $("panel-backdrop").tabIndex=drawerOpen?0:-1;
 if(drawerOpen)$("mobile-close").focus({preventScroll:true});
 else $("mobile-panel").focus({preventScroll:true});
}
$("mobile-panel").addEventListener("click",()=>setDrawer(!drawerOpen));
$("mobile-close").addEventListener("click",()=>setDrawer(false));
$("panel-backdrop").addEventListener("click",()=>setDrawer(false));
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&drawerOpen){e.preventDefault();setDrawer(false)}
});
mobileMatch.addEventListener?.("change",()=>{
 // A breakpoint change needs a fresh projection and disclosure state.
 if(!compact){document.documentElement.classList.remove("panel-open")}
});
$("mobile-view").addEventListener("click",()=>{state.whitebox=!state.whitebox;sync()});
$("mobile-light").addEventListener("click",()=>{state.day=!state.day;relight();sync()});
$("mobile-fit").addEventListener("click",()=>{setCameraPreset(true);resetCounter++});
$("material-controls").setAttribute("aria-hidden",String(compact));
$("reset").addEventListener("click",()=>{
 state.whitebox=false;state.day=false;state.actor=true;state.foreground=true;state.decals=true;state.shadows=true;
 state.weights={base:1,grime:.7,wet:.55,growth:.65,ink:.64};
 for(const [k,v] of Object.entries(state.weights)){$(k).value=String(v*100);$(k+"-value").value=Math.round(v*100)+"%"}
 for(const k of ["actor","foreground","decals","shadows"])$(k).checked=true;
 setCameraPreset(true);resetCounter++;requestMaterialRebuild();relight();sync();
});
// Genuine two-finger zoom; single-finger orbit. No page scrolling while
// interacting with the world. Both mouse and touch use Pointer Events.
const touches=new Map();
let dragPrevious=null,pinchPrevious=0,touchMoved=false,lastTouchUp=0;
const pointerDistance=()=>{
 const a=[...touches.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
};
function fitDistance(v){return Math.max(compact&&isPortrait()?18:12.5,Math.min(compact&&isPortrait()?39:32,v))}
canvas.addEventListener("pointerdown",e=>{
 e.preventDefault();
 canvas.setPointerCapture(e.pointerId);
 touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 touchMoved=false;
 dragPrevious={x:e.clientX,y:e.clientY};
 if(touches.size===2)pinchPrevious=pointerDistance();
});
canvas.addEventListener("pointermove",e=>{
 if(!touches.has(e.pointerId))return;
 e.preventDefault();
 const prev=touches.get(e.pointerId);
 touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const motion=Math.hypot(e.clientX-prev.x,e.clientY-prev.y);
 if(motion>1.3)touchMoved=true;
 if(touches.size>=2){
  const current=pointerDistance();
  if(pinchPrevious>3&&current>3){
   const change=Math.max(.80,Math.min(1.20,pinchPrevious/current));
   distance=fitDistance(distance*change);cameraTouched=true;cameraUpdate();
  }
  pinchPrevious=current;
 }else if(dragPrevious){
  const rect=canvas.getBoundingClientRect();
  const speed=rect.width<550?.0042:.005;
  yaw=Math.max(-.30,Math.min(1.40,yaw+(e.clientX-dragPrevious.x)*speed));
  pitch=Math.max(.66,Math.min(1.39,pitch+(e.clientY-dragPrevious.y)*.0034));
  cameraTouched=true;cameraUpdate();
 }
 dragPrevious={x:e.clientX,y:e.clientY};
});
function releasePointer(e){
 if(!touches.has(e.pointerId))return;
 touches.delete(e.pointerId);
 if(touches.size<2)pinchPrevious=0;
 dragPrevious=touches.size?[...touches.values()][0]:null;
 if(e.type==="pointerup"&&e.pointerType==="touch"&&!touchMoved&&!touches.size){
  const now=clockNow();
  if(now-lastTouchUp<300){setCameraPreset(true);resetCounter++;}
  lastTouchUp=now;
 }
}
canvas.addEventListener("pointerup",releasePointer);
canvas.addEventListener("pointercancel",releasePointer);
canvas.addEventListener("lostpointercapture",releasePointer);
canvas.addEventListener("wheel",e=>{
 e.preventDefault();distance=fitDistance(distance+e.deltaY*.014);
 cameraTouched=true;cameraUpdate();
},{passive:false});
canvas.addEventListener("dblclick",()=>{setCameraPreset(true);resetCounter++});
let lastPresetKind="";
function resize(){
 const {width,height}=canvas.getBoundingClientRect();
 if(width<2||height<2)return;
 const kind=compact?(width<height*.86?"portrait":"landscape"):"desktop";
 camera.aspect=width/height;
 if(kind!==lastPresetKind){cameraTouched=false;setCameraPreset(true);lastPresetKind=kind;}
 camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);
}
const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
let last=performance.now(),frames=0,framesAt=last;
function animate(t){
 requestAnimationFrame(animate);
 if(document.hidden){last=t;return;}
 // Low-powered phones need a stable frame budget, not futile 60-fps draws
 // that compete with touch handlers and browser compositing.
 if(compact&&t-last<33)return;
 const delta=Math.min(.05,(t-last)/1000||0);last=t;
 lamp.intensity=(state.day?3.8:33)*(1+Math.sin(t*.004)*.035+Math.sin(t*.017)*.018);
 cloth.rotation.y=.17+Math.sin(t*.00082)*.085;
 for(let i=0;i<dustN;i++){
  dustPos[3*i]=dustOrigin[3*i]+Math.sin(t*.00018+i*.7)*.31;
  dustPos[3*i+1]=dustOrigin[3*i+1]+Math.sin(t*.00025+i*.32)*.28;
 }
 dustGeo.attributes.position.needsUpdate=true;
 if(actors.length)actors[0].rotation.y=yaw*.42;
 renderer.render(scene,camera);
 frames++;
 if(t-framesAt>1000){
  $("fps-state").textContent=Math.round(frames*1000/(t-framesAt))+" FPS";
  frames=0;framesAt=t;
 }
 window.PaintoverStudio.frameCount=(window.PaintoverStudio.frameCount||0)+1;
}
window.PaintoverStudio={
 get ready(){return renderer.info.render.calls>0},
 get loadedActor(){return loadedActor},
 get mode(){return state.whitebox?"whitebox":"composite"},
 get layerWeights(){return {...state.weights}},
 get drawCalls(){return renderer.info.render.calls},
 get viewportMode(){return cameraPreset},
 get drawerOpen(){return drawerOpen},
 get cameraDistance(){return distance},
 get cameraFov(){return camera.fov},
 get renderRatio(){return renderer.getPixelRatio()},
 get resetCount(){return resetCounter},
 frameCount:0,
 setWhitebox(v){state.whitebox=Boolean(v);sync()},
 setLayer(name,w){if(name in state.weights){state.weights[name]=Math.max(0,Math.min(1,Number(w)));$(name).value=Math.round(state.weights[name]*100);$(name+"-value").value=Math.round(state.weights[name]*100)+"%";for(const b of surfaceBundles)b.rebuild()}},
 screenshot(){return canvas.toDataURL("image/png")}
};
relight();sync();setCameraPreset(true);$("status").textContent="正在加载 Anima 人物原图";
requestAnimationFrame(animate);

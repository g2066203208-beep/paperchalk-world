import * as THREE from '../sphere-maze/vendor/three.module.js';

/**
 * Paper-film character-selection stage V3. Every visible stage object is a flat
 * PlaneGeometry / 2D ShapeGeometry. There are no projector solids or 3D models.
 * Canvas textures below are neutral TEMPORARY PAPER BLOCKOUT ART; their UVs and
 * world-space pivots stay fixed when replaced with painted Anima transparent PNGs.
 */
const host=document.getElementById('viewport-3d');
const ui=document.getElementById('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.10;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x17131a);
const camera=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,.1,70);
const CAMERA={eye:new THREE.Vector3(-.05,.04,18.0),look:new THREE.Vector3(-.05,.04,-.1)};
camera.position.copy(CAMERA.eye);camera.lookAt(CAMERA.look);
const mats={};
const objects=[];
const flat=(hex,emissive=0)=>new THREE.MeshStandardMaterial({
  color:hex,roughness:.96,metalness:0,side:THREE.DoubleSide,
  emissive:hex,emissiveIntensity:emissive
});
function newCanvas(w,h,fn){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const c=cv.getContext('2d');fn(c,w,h);
  const tex=new THREE.CanvasTexture(cv);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return tex;
}
function paperMat(tex,emissiveIntensity=0){
  return new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.045,
    depthWrite:true,roughness:.96,metalness:0,side:THREE.DoubleSide,
    emissive:0x6b574c,emissiveIntensity});
}
function quad(name,x,y,z,w,h,material,opts={}){
  const obj=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
  obj.position.set(x,y,z);obj.name=name;
  obj.castShadow=!!opts.shadow;obj.receiveShadow=opts.receive!==false;
  obj.renderOrder=opts.order??0;
  (opts.parent||scene).add(obj);objects.push(obj);return obj;
}
function texPlane(name,x,y,z,w,h,fn,opts={}){
  const tex=newCanvas(opts.tw||1024,opts.th||1024,fn);
  return quad(name,x,y,z,w,h,paperMat(tex,opts.emissive??0),opts);
}
function fill(c,color,w,h){c.fillStyle=color;c.fillRect(0,0,w,h)}
function line(c,color,width,pts){
 c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);
 c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function polygon(c,color,pts){
 c.fillStyle=color;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fill();
}
// Global scene positions use the same x/y scale as the centered 16:9 projection.
// All paper is parallel to the view plane; actual Z separation creates real shadow and parallax.
const back=quad('00 BACKDROP : 2D dark wall',0,0,-3.4,24,14,flat('#272329'),{receive:true});
const wall=texPlane('01 paper-cut rear wall',0,.35,-3.18,21,10.7,(c,w,h)=>{
  const gradient=c.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0,'#302a30');gradient.addColorStop(.75,'#3c3337');gradient.addColorStop(1,'#18171c');fill(c,gradient,w,h);
  c.strokeStyle='rgba(210,190,165,.075)';c.lineWidth=3;
  for(let i=0;i<11;i++){c.beginPath();c.moveTo(i*112-70,0);c.lineTo(i*112-70,h);c.stroke();}
  c.fillStyle='rgba(9,8,12,.26)';c.fillRect(0,0,w,43);c.fillRect(0,h-120,w,120);
}, {tw:1024,th:768,receive:true});
const sideGlow=texPlane('02 rear ambient spotlight halo',2.4,.2,-3.09,15.5,8.9,(c,w,h)=>{
 let g=c.createRadialGradient(w*.61,h*.42,5,w*.61,h*.42,w*.65);
 g.addColorStop(0,'rgba(215,174,126,.24)');g.addColorStop(.38,'rgba(181,140,111,.09)');
 g.addColorStop(1,'rgba(160,130,100,0)');fill(c,g,w,h);
},{order:1,tw:512,th:512});
sideGlow.material=new THREE.MeshBasicMaterial({map:sideGlow.material.map,transparent:true,depthWrite:false,side:THREE.DoubleSide});
sideGlow.receiveShadow=false;
// Side wings are distinct flat cutouts, never thick geometry.
function curtainTex(c,w,h,side){
  const gr=c.createLinearGradient(0,0,w,0);
  gr.addColorStop(0,side==='left'?'#18151c':'#36252a');
  gr.addColorStop(.5,'#564146');gr.addColorStop(1,side==='left'?'#251c26':'#18151c');
  fill(c,gr,w,h);
  c.globalAlpha=.38;
  for(let i=0;i<8;i++){
    const x=20+i*w/8;
    const g=c.createLinearGradient(x-55,0,x+65,0);
    g.addColorStop(0,'rgba(4,3,8,.3)');g.addColorStop(.45,'rgba(9,5,10,.74)');
    g.addColorStop(.7,'rgba(255,227,201,.05)');g.addColorStop(1,'rgba(8,5,9,.4)');
    c.fillStyle=g;c.fillRect(x-58,0,w/6,h);
  }
  c.globalAlpha=1;
  c.strokeStyle='rgba(215,192,151,.14)';c.lineWidth=4;
  c.strokeRect(17,18,w-34,h-36);
}
texPlane('03 LEFT CURTAIN paper',-8.10,.58,-2.16,2.9,9.8,(c,w,h)=>curtainTex(c,w,h,'left'),{shadow:true,tw:512,th:1024});
texPlane('04 RIGHT CURTAIN paper',8.42,.46,-2.18,2.3,9.3,(c,w,h)=>curtainTex(c,w,h,'right'),{shadow:true,tw:512,th:1024});

// Projection screen is the hero of the shot. Three flat planes: dark frame, matte fabric,
// and actual image layer. The screen is not a geometric box.
quad('05 screen shadow silhouette',2.52,.85,-2.20,10.7,5.78,flat('#121015'),{shadow:true});
quad('06 screen outer matte paper frame',2.54,.87,-1.92,10.5,5.56,flat('#84786f'),{shadow:true,receive:false});
const scr=quad('07 luminous screen paper',2.54,.87,-1.875,10.16,5.20,flat('#d0c8bc',.22),{receive:false});
const glowUnder=quad('08 projected center light',2.54,.87,-1.855,9.87,4.97,
  new THREE.MeshBasicMaterial({color:0xe0cdb6,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide}),{receive:false});
const split=quad('09 character and XP paper divider',4.50,.80,-1.805,.023,4.64,flat('#776f69'),{receive:false});
quad('10 character framing placeholder',.87,.76,-1.813,6.82,4.57,
 new THREE.MeshBasicMaterial({color:0x8e8580,transparent:true,opacity:.065,depthWrite:false,side:THREE.DoubleSide}),{receive:false});
const facePaper=texPlane('11 screen character negative space',.95,.86,-1.788,5.78,4.82,(c,w,h)=>{
  const gr=c.createRadialGradient(w*.5,h*.43,4,w*.5,h*.47,w*.7);
  gr.addColorStop(0,'rgba(244,232,213,.56)');gr.addColorStop(.65,'rgba(238,221,200,.20)');
  gr.addColorStop(1,'rgba(110,94,91,.02)');fill(c,gr,w,h);
  c.strokeStyle='rgba(75,61,60,.19)';c.lineWidth=4;c.strokeRect(30,24,w-60,h-48);
},{tw:640,th:640,receive:false});
facePaper.material=new THREE.MeshBasicMaterial({map:facePaper.material.map,transparent:true,depthWrite:false,side:THREE.DoubleSide});
const xpCard=texPlane('12 XP panel location only',5.80,.83,-1.783,2.83,4.80,(c,w,h)=>{
  fill(c,'rgba(181,160,144,.10)',w,h);
  c.fillStyle='rgba(80,69,63,.56)';c.font='500 41px serif';c.fillText('Nº 02',44,94);
  c.strokeStyle='rgba(72,58,52,.30)';c.lineWidth=3;
  for(let i=0;i<5;i++){const yy=160+i*132;c.beginPath();c.moveTo(45,yy);c.lineTo(w-45,yy);c.stroke();}
  c.fillStyle='rgba(74,58,49,.24)';for(let i=0;i<5;i++)c.fillRect(52,200+i*132,244,28);
},{tw:512,th:1024,receive:false});
xpCard.material=new THREE.MeshBasicMaterial({map:xpCard.material.map,transparent:true,depthWrite:false,side:THREE.DoubleSide});
const screenMatte=texPlane('13 paper stage top/bottom molding',2.54,3.70,-1.8,10.78,.20,(c,w,h)=>{
 fill(c,'#45383c',w,h);c.fillStyle='rgba(211,185,153,.31)';c.fillRect(0,0,w,8);
},{tw:512,th:30,shadow:true});
texPlane('14 bottom molding',2.54,-1.97,-1.8,10.78,.18,(c,w,h)=>{
 fill(c,'#45383c',w,h);c.fillStyle='rgba(215,175,144,.30)';c.fillRect(0,0,w,10);
},{tw:512,th:30,shadow:true});

// Optional original existing portrait, independent of the environment textures.
const hunterFiles=[
 '01-black-coat-commander.png','02-blood-physician.png','03-crossbow-trapper.png',
 '04-bounty-gunslinger.png','05-seal-warden.png','06-beast-butcher.png','07-heavy-axe-sweeper.png'
];
let usePortrait=false;
const portraitMat=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
 color:0xb8aaa1,opacity:.90,toneMapped:false});
const portrait=quad('15 original GitHub character art preview (optional)',.67,.74,-1.757,3.82,4.80,portraitMat,{receive:false,order:3});
portrait.visible=false;
const textureLoader=new THREE.TextureLoader();
const artCache={};
function showArt(index){
 if(!usePortrait)return;
 const path='../assets/characters/monster-hunters/'+hunterFiles[index];
 if(artCache[path]){portrait.material.map=artCache[path];portrait.material.needsUpdate=true;portrait.visible=true;return}
 textureLoader.load(path,(tex)=>{
  tex.colorSpace=THREE.SRGBColorSpace;
  artCache[path]=tex;
  if(!usePortrait||selected!==index)return;
  portrait.material.map=tex;portrait.material.needsUpdate=true;portrait.visible=true;
 },undefined,()=>{portrait.visible=false});
}

// Flat painted cardboard projector component templates. These are single 2D planes.
// The outlines indicate replaceable Anima asset cut boundaries, not final illustrations.
const body=texPlane('16 flat projector BODY cutout',-5.13,-.46,.34,3.92,4.16,(c,w,h)=>{
  polygon(c,'#49494c',[[65,151],[585,110],[775,218],[826,800],[650,948],[119,947],[71,842]]);
  polygon(c,'#646267',[[83,162],[587,136],[749,239],[776,766],[630,865],[146,875],[107,801]]);
  polygon(c,'#403f46',[[123,302],[652,256],[685,737],[182,804]]);
  c.strokeStyle='rgba(224,222,214,.47)';c.lineWidth=10;c.strokeRect(182,352,380,360);
  c.strokeStyle='rgba(28,26,29,.80)';c.lineWidth=18;c.strokeRect(217,397,299,246);
  c.fillStyle='#b8aea5';c.fillRect(270,450,177,28);c.fillRect(270,506,177,13);
  c.fillStyle='#99918a';c.fillRect(185,177,430,23);
  line(c,'rgba(17,16,18,.65)',12,[[135,800],[702,806]]);
},{tw:1024,th:1024,shadow:true});
const bodyLens=texPlane('17 flat projector LENS silhouette',-3.31,.48,.61,1.70,1.22,(c,w,h)=>{
  polygon(c,'#49494c',[[10,185],[420,115],[694,147],[694,690],[414,735],[12,672]]);
  polygon(c,'#85817e',[[442,157],[738,181],[738,685],[443,666]]);
  c.fillStyle='#292b2c';c.beginPath();c.ellipse(730,430,98,258,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#c5b6a0';c.lineWidth=27;c.stroke();
},{tw:800,th:800,shadow:true});
const reelDraw=(c,w,h,kind)=>{
  const cx=w*.5,cy=h*.5,r=w*.43;
  c.clearRect(0,0,w,h);
  c.strokeStyle='#bcb6b0';c.lineWidth=31;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
  c.strokeStyle='#444349';c.lineWidth=16;c.beginPath();c.arc(cx,cy,r-30,0,Math.PI*2);c.stroke();
  c.strokeStyle='#827e7b';c.lineWidth=38;
  for(let i=0;i<6;i++){const a=i*Math.PI/3+.14;
    c.beginPath();c.moveTo(cx+Math.cos(a)*64,cy+Math.sin(a)*64);
    c.lineTo(cx+Math.cos(a)*(r-35),cy+Math.sin(a)*(r-35));c.stroke();}
  c.fillStyle='#d1c4b2';c.beginPath();c.arc(cx,cy,62,0,Math.PI*2);c.fill();
  c.fillStyle='#3a383b';c.beginPath();c.arc(cx,cy,21,0,Math.PI*2);c.fill();
};
function reel(name,x,y,z,size){
 const holder=new THREE.Group();holder.position.set(x,y,z);scene.add(holder);
 const circle=texPlane(name,0,0,0,size,size,(c,w,h)=>reelDraw(c,w,h,name),
   {parent:holder,tw:640,th:640,shadow:true});
 return holder;
}
const reels=[reel('18 supply reel: paper cutout',-5.92,2.12,.68,2.22),
             reel('19 takeup reel: paper cutout',-4.05,1.91,.72,2.05)];
const rearSpindle=texPlane('20 reel mechanism connecting paper strip',-5.10,.84,.65,2.2,2.65,(c,w,h)=>{
  c.strokeStyle='rgba(197,182,170,.70)';c.lineWidth=21;
  c.beginPath();c.moveTo(124,80);c.lineTo(310,790);c.moveTo(560,120);c.lineTo(505,790);c.stroke();
},{tw:720,th:900,shadow:true});
const crankCenter=new THREE.Group();crankCenter.name='21 flat handcrank hinge';crankCenter.position.set(-6.52,-1.0,.95);scene.add(crankCenter);
texPlane('22 handcrank paper plane',0,0,0,1.35,1.35,(c,w,h)=>{
 c.strokeStyle='#d6c9bc';c.lineWidth=42;c.beginPath();c.arc(w*.5,h*.5,w*.28,0,Math.PI*2);c.stroke();
 line(c,'#a49a90',54,[[w*.5,h*.5],[w*.79,h*.47]]);
 c.fillStyle='#3b393c';c.beginPath();c.arc(w*.5,h*.5,56,0,Math.PI*2);c.fill();
 c.fillStyle='#cabeb1';c.beginPath();c.arc(w*.79,h*.47,38,0,Math.PI*2);c.fill();
},{parent:crankCenter,tw:512,th:512,shadow:true});
texPlane('23 separate tabletop paper cut',-5.06,-2.25,1.02,5.4,.45,(c,w,h)=>{
 polygon(c,'#6b6461',[[0,90],[990,90],[1020,300],[0,300]]);
 c.strokeStyle='#b7aba1';c.lineWidth=15;c.beginPath();c.moveTo(10,100);c.lineTo(1000,100);c.stroke();
},{tw:1024,th:340,shadow:true});

// Stage beams and selected film carrier. Seven paper frames are all in-world 2D.
const filmParent=new THREE.Group();filmParent.position.set(.0,-2.86,1.44);scene.add(filmParent);
texPlane('24 filmstrip paper dark silhouette',0,0,-.02,13.82,1.53,(c,w,h)=>{
 fill(c,'#242327',w,h);
 c.fillStyle='rgba(183,166,145,.34)';c.fillRect(0,0,w,12);c.fillRect(0,h-12,w,12);
 for(let i=0;i<60;i++){const x=12+i*(w-24)/60;
   c.fillStyle='#ab9e91';c.fillRect(x,14,12,19);c.fillRect(x,h-31,12,19);}
},{tw:1536,th:170,shadow:true,parent:filmParent});
const framePlanes=[];
function filmFaceTex(c,w,h){
 fill(c,'#3a353a',w,h);
 c.strokeStyle='#837871';c.lineWidth=12;c.strokeRect(11,10,w-22,h-20);
 const gradient=c.createLinearGradient(0,0,w,h);
 gradient.addColorStop(0,'#b9aca4');gradient.addColorStop(1,'#817b7a');
 c.fillStyle=gradient;c.fillRect(28,26,w-56,h-51);
 c.fillStyle='rgba(48,43,45,.20)';c.fillRect(28,26,w-56,h-51);
}
for(let i=0;i<7;i++){
 const xx=(i-3)*1.84;
 const card=texPlane('25 seven independent film frame '+(i+1),xx,0,.04,1.68,1.15,filmFaceTex,
     {tw:256,th:176,shadow:false,parent:filmParent});
 framePlanes.push(card);
}
const selection=texPlane('26 FIXED center selection gate',0,0,.12,1.84,1.35,(c,w,h)=>{
 c.clearRect(0,0,w,h);
 c.strokeStyle='#e1c4a6';c.lineWidth=22;c.strokeRect(12,10,w-24,h-20);
 c.fillStyle='#f2d7b5';
 polygon(c,'#f2d7b5',[[w/2-24,3],[w/2+24,3],[w/2,35]]);
 polygon(c,'#f2d7b5',[[w/2-24,h-3],[w/2+24,h-3],[w/2,h-35]]);
},{tw:512,th:384,receive:false,parent:filmParent});
// Foreground edge is a single paper plane, not a thick 3D desk.
texPlane('27 stage lip final flat layer',0,-4.11,1.73,19.2,.56,(c,w,h)=>{
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#383037');g.addColorStop(1,'#121217');
 fill(c,g,w,h);c.fillStyle='rgba(186,157,124,.16)';c.fillRect(0,0,w,7);
},{tw:1024,th:65,shadow:true});

// Real world lighting: the projector is a 3D spot source whose shadow is visible
// on the actual paper projection screen. Visible air beam is only a 2D transparent
// scattering plate; it does not replace the light physics.
const ambient=new THREE.HemisphereLight(0xaeb6c7,0x1b161c,.49);scene.add(ambient);
const mainKey=new THREE.DirectionalLight(0xffeedc,2.05);
mainKey.position.set(-5.2,6.5,7);mainKey.target.position.set(0,.5,-2);scene.add(mainKey,mainKey.target);
mainKey.castShadow=true;
mainKey.shadow.mapSize.set(2048,2048);
mainKey.shadow.camera.left=-13;mainKey.shadow.camera.right=13;
mainKey.shadow.camera.top=9;mainKey.shadow.camera.bottom=-9;mainKey.shadow.camera.near=1;mainKey.shadow.camera.far=37;
mainKey.shadow.bias=-.0002;
const fillLight=new THREE.PointLight(0x8b98c4,13,23,2);fillLight.position.set(6.8,3.6,3.5);scene.add(fillLight);
const projectorSpot=new THREE.SpotLight(0xffe0b6,88,27,.46,.82,1.28);
projectorSpot.position.set(-3.30,.45,2.1);
projectorSpot.target.position.set(1.6,.6,-1.88);scene.add(projectorSpot,projectorSpot.target);
projectorSpot.castShadow=true;projectorSpot.shadow.mapSize.set(2048,2048);
projectorSpot.shadow.camera.near=.15;projectorSpot.shadow.camera.far=30;
projectorSpot.shadow.bias=-.0003;
const visibleBeam=texPlane('28 translucent 2D visible light scattering cutout',-1.78,.49,-.23,4.5,2.35,(c,w,h)=>{
 c.clearRect(0,0,w,h);
 const grad=c.createLinearGradient(0,0,w,0);
 grad.addColorStop(0,'rgba(250,212,160,.015)');grad.addColorStop(.18,'rgba(251,216,164,.08)');
 grad.addColorStop(.68,'rgba(246,219,178,.06)');grad.addColorStop(1,'rgba(248,217,175,0)');
 c.save();c.beginPath();c.moveTo(0,h*.50);c.lineTo(w,h*.02);c.lineTo(w,h*.98);c.closePath();c.clip();
 fill(c,grad,w,h);c.restore();
},{tw:768,th:384,order:2,receive:false});
visibleBeam.material=new THREE.MeshBasicMaterial({map:visibleBeam.material.map,
 transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
visibleBeam.castShadow=false;
const guideGrid=new THREE.GridHelper(20,20,0x999999,0x777777);guideGrid.rotation.x=Math.PI/2;guideGrid.position.set(0,0,-3.15);
guideGrid.visible=false;scene.add(guideGrid);

// Interaction: one advance corresponds to one actual turn of flat cardboard reels.
// The selected film cell is always CENTERED; seven visible frames represent cyclic neighbors.
let selected=1,moving=0,lightingOn=true,guides=false,last=performance.now();
const roster=['持剑指挥官','血液医师','索弩陷阱师','赏金枪手','封印监管者','巨兽屠夫','重斧清道夫'];
function setFrames(){
 for(let i=0;i<7;i++){
  const idx=(selected+i-3+7)%7;
  framePlanes[i].userData.characterIndex=idx;
  framePlanes[i].material.color.setHex(i===3?0xffe2bd:0xb4a5a1);
 }
 document.getElementById('selection').textContent='胶片 '+String(selected+1).padStart(2,'0')+' / 07';
 document.getElementById('character-name').textContent=roster[selected];
 showArt(selected);
}
function advance(delta){
 selected=(selected+delta+7)%7;
 moving=delta*.39;
 reels[0].rotation.z+=delta*Math.PI/3;
 reels[1].rotation.z-=delta*Math.PI/3;
 crankCenter.rotation.z+=delta*.64;
 setFrames();
}
function changeLight(on){
 lightingOn=on;
 mainKey.intensity=on?2.05:.05;
 projectorSpot.intensity=on?88:0;
 fillLight.intensity=on?13:.1;ambient.intensity=on?.49:.08;
 visibleBeam.visible=on;
 renderer.toneMappingExposure=on?1.10:.61;
 const toggle=document.getElementById('lighting');
 toggle.setAttribute('aria-pressed',String(on));toggle.textContent=on?'关闭照明':'打开照明';
}
function changeGuides(on){
 guides=on;
 document.getElementById('labels').hidden=!on;
 guideGrid.visible=on;
 const b=document.getElementById('guides');b.setAttribute('aria-pressed',String(on));b.textContent=on?'隐藏空间标注':'显示空间标注';
}
document.getElementById('next').addEventListener('click',()=>advance(1));
document.getElementById('prev').addEventListener('click',()=>advance(-1));
document.getElementById('lighting').addEventListener('click',()=>changeLight(!lightingOn));
document.getElementById('guides').addEventListener('click',()=>changeGuides(!guides));
document.getElementById('portrait').addEventListener('click',()=>{
 usePortrait=!usePortrait;portrait.visible=false;
 document.getElementById('portrait').textContent=usePortrait?'隐藏原版立绘':'预览原版立绘';
 if(usePortrait)showArt(selected);
});
document.getElementById('reset-camera').addEventListener('click',()=>{
 camera.position.copy(CAMERA.eye);camera.lookAt(CAMERA.look);camera.fov=30;camera.updateProjectionMatrix();
 document.getElementById('fov').value='30';document.getElementById('fov-val').textContent='30°';
});
document.getElementById('fov').addEventListener('input',e=>{
 camera.fov=Number(e.target.value);camera.updateProjectionMatrix();
 document.getElementById('fov-val').textContent=camera.fov+'°';
});
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')advance(1);if(e.key==='ArrowLeft')advance(-1);if(e.key.toLowerCase()==='l')changeLight(!lightingOn)});
const rollerClick=new THREE.Raycaster(),pointer=new THREE.Vector2();
renderer.domElement.addEventListener('click',e=>{
 const r=renderer.domElement.getBoundingClientRect();
 pointer.set(((e.clientX-r.x)/r.width)*2-1,-((e.clientY-r.y)/r.height)*2+1);
 rollerClick.setFromCamera(pointer,camera);
 if(rollerClick.intersectObjects([selection,...framePlanes],false).length){advance(1);return}
 const crankHit=rollerClick.intersectObjects(crankCenter.children,true);
 if(crankHit.length)advance(1);
});
function labelAt(key,x,y,z){
 const el=document.querySelector('[data-label="'+key+'"]');if(!el)return;
 const p=new THREE.Vector3(x,y,z).project(camera);
 el.style.left=((p.x+1)*50)+'%';el.style.top=((1-p.y)*50)+'%';
}
function animate(time){
 const dt=Math.min(.05,(time-last)/1000);last=time;
 moving*=Math.pow(.055,dt*7);
 filmParent.position.x=moving;
 if(lightingOn)projectorSpot.intensity=86+Math.sin(time*.003)*1.4+Math.sin(time*.017)*.7;
 const w=innerWidth,h=innerHeight;
 if(renderer.domElement.width!==Math.round(w*renderer.getPixelRatio())||renderer.domElement.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 if(Math.abs(camera.aspect-w/h)>.001){camera.aspect=w/h;camera.updateProjectionMatrix()}
 labelAt('screen',2.45,3.85,-1.8);labelAt('projector',-5.35,3.65,.6);labelAt('film',.0,-1.9,1.4);
 renderer.render(scene,camera);
 requestAnimationFrame(animate);
}
const invalid=objects.filter(o=>!(o.geometry instanceof THREE.PlaneGeometry));
ui.dataset.renderer='three-2p5d-paper-planes';
ui.dataset.shadows=String(renderer.shadowMap.enabled);
ui.dataset.paperPlanes=String(objects.length);
ui.dataset.solidMeshes=String(invalid.length);
ui.dataset.camera='near-frontal-30deg';
window.PaperStageAudit={paperPlanes:objects.length,solidMeshes:invalid.length,cameraMode:'near-frontal',getSelected:()=>selected,getLight:()=>lightingOn};
changeGuides(false);
setFrames();
requestAnimationFrame(animate);

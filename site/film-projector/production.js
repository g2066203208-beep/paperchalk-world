import * as THREE from '../sphere-maze/vendor/three.module.js';

// Paperchalk / Paper Cinema. The stage contains no solid projector geometry.
// Every visible component is a separately drawn 2D transparent paper plane;
// world Z controls its real perspective, lighting, parallax, and occlusion.
const APP=document.getElementById('theater');
const HOST=document.getElementById('stage');
const LOADING=document.getElementById('loading');
const W=1672,H=941,WORLD_W=16,WORLD_H=9,CAM_Z=18;
const ASSET='./assets/';
const REGIONS={
  background:[0,0,1672,941],
  screen:[428,53,1585,642],
  filmstrip:[329,616,1604,822],
  machine:[0,164,375,832],
  reel_top:[103,157,359,426],
  reel_bottom:[97,559,260,719],
  flower_left:[0,687,353,941],
  flower_right:[1427,682,1672,941],
  beam:[248,206,892,672],
  curtain_left:[0,0,666,272],
  curtain_right:[1079,0,1672,314],
  floor:[0,792,1672,941]
};
const CAST={background:-2.8,screen:-.75,curtain_left:1.55,curtain_right:1.60,
  beam:.65,machine:1.9,reel_top:2.13,reel_bottom:2.22,
  filmstrip:1.7,floor:2.3,flower_left:2.9,flower_right:2.92};
const ORDER=['background','screen','beam','curtain_left','curtain_right',
  'machine','reel_top','reel_bottom','filmstrip','floor','flower_left','flower_right'];
const ROSTER=[
  ['持剑指挥官','01-legendary-hunter.png'],
  ['血液医师','02-blood-physician.png'],
  ['索弩陷阱师','03-trap-engineer.png'],
  ['赏金枪手','04-bounty-markswoman.png'],
  ['封印监管者','05-seal-warden.png'],
  ['巨兽屠夫','06-beast-butcher.png'],
  ['重斧清道夫','07-axe-scout.png']
];
let renderer,scene,camera,mainSpot,keyLight,fillLight,ambientLight;
let beamNode,screenNode,filmNode,reelTop,reelBottom;
let originalScreenMap,referenceNode,frameHighlight,filmCanvas;
let selected=1,lit=true,compare=false,animating=false;
let pointer={x:0,y:0},lastTime=0,switchAt=0,filmVelocity=0,reelTarget=0;
let particles=[];
let screenDefaultImage=null;
let loadedTextures={};
const approval={scene:'paper-cinema-art-derived',geometry:'separate-alpha-planes',noSolidProjector:true};
window.PaperCinemaAudit={...approval,selected:()=>selected,lighting:()=>lit,layerDepths:CAST,
  getRenderer:()=>renderer?.shadowMap.enabled?'three-shadowmap-enabled':'none'};
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){
  document.getElementById('fallback').hidden=false;
  LOADING.textContent='WebGL 不可用';throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.26;
HOST.appendChild(renderer.domElement);
scene=new THREE.Scene();
scene.background=new THREE.Color(0x160d16);
// 28.07-degree frontal perspective maps the 1672x941 reference exactly to a 16x9 view.
const fov=2*Math.atan(WORLD_H/(2*CAM_Z))*180/Math.PI;
camera=new THREE.PerspectiveCamera(fov,W/H,.01,70);
camera.position.set(0,0,CAM_Z);camera.lookAt(0,0,0);
const assetLoader=new THREE.TextureLoader();
function material(tex,name){
 if(name==='beam')return new THREE.MeshBasicMaterial({map:tex,transparent:true,
   opacity:.82,depthWrite:false,side:THREE.DoubleSide,
   blending:THREE.AdditiveBlending,toneMapped:false});
 if(name==='background'||name==='filmstrip')return new THREE.MeshBasicMaterial({map:tex,
   transparent:name!=='background',depthWrite:true,alphaTest:.007,side:THREE.DoubleSide});
 const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.006,
   roughness:.95,metalness:0,side:THREE.DoubleSide,
   emissive:new THREE.Color(0xc2a891),emissiveMap:tex,emissiveIntensity:name==='screen'?.32:.17});
 return mat;
}
function worldRect(name,z){
 const [x0,y0,x1,y1]=REGIONS[name],factor=(CAM_Z-z)/CAM_Z;
 return {
  x:(((x0+x1)*.5/W)-.5)*WORLD_W*factor,
  y:(.5-((y0+y1)*.5/H))*WORLD_H*factor,
  w:((x1-x0)/W)*WORLD_W*factor,
  h:((y1-y0)/H)*WORLD_H*factor,
  z
 };
}
function makeSprite(name,tex,z){
 const p=worldRect(name,z);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(p.w,p.h),material(tex,name));
 mesh.name='2D-paper-'+name;
 mesh.position.set(p.x,p.y,p.z);
 mesh.renderOrder=ORDER.indexOf(name)+1;
 mesh.castShadow=['curtain_left','curtain_right','flower_left','flower_right','reel_top','reel_bottom'].includes(name);
 mesh.receiveShadow=['screen','floor','machine','curtain_left','curtain_right'].includes(name);
 mesh.userData={name,initialPosition:mesh.position.clone(),depth:z};
 scene.add(mesh);return mesh;
}
function resize(){
 const rect=APP.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
 renderer.setSize(rect.width,rect.height,false);
 camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(APP);
const texPromises=ORDER.map(name=>assetLoader.loadAsync(`${ASSET}${name}.webp`).then(tex=>{
 tex.colorSpace=THREE.SRGBColorSpace;
 tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 loadedTextures[name]=tex;return tex;
}));
const textures=await Promise.all(texPromises);
const nodes={};ORDER.forEach((name,i)=>nodes[name]=makeSprite(name,textures[i],CAST[name]));
beamNode=nodes.beam;screenNode=nodes.screen;filmNode=nodes.filmstrip;
reelTop=nodes.reel_top;reelBottom=nodes.reel_bottom;
originalScreenMap=screenNode.material.map;

// Light sources are real Three.js world-space lights, not prepainted polygons.
ambientLight=new THREE.HemisphereLight(0xffe9d9,0x261b24,.85);scene.add(ambientLight);
keyLight=new THREE.DirectionalLight(0xffdaba,1.15);
keyLight.position.set(-4.2,7.8,6.3);keyLight.target.position.set(0,.5,-1.1);
scene.add(keyLight,keyLight.target);keyLight.castShadow=true;
keyLight.shadow.mapSize.set(2048,2048);
keyLight.shadow.camera.near=.1;keyLight.shadow.camera.far=35;
keyLight.shadow.camera.left=-12;keyLight.shadow.camera.right=12;
keyLight.shadow.camera.top=9;keyLight.shadow.camera.bottom=-9;
keyLight.shadow.bias=-.00025;
fillLight=new THREE.PointLight(0x917eaa,14,18,2);
fillLight.position.set(6.6,4.0,5.3);scene.add(fillLight);
mainSpot=new THREE.SpotLight(0xffe2b1,95,24,.59,.78,1.15);
mainSpot.position.set(-4.8,-.10,4.0);
mainSpot.target.position.set(2.4,.7,-.7);scene.add(mainSpot,mainSpot.target);
mainSpot.castShadow=true;mainSpot.shadow.mapSize.set(2048,2048);
mainSpot.shadow.camera.near=.15;mainSpot.shadow.camera.far=25;
mainSpot.shadow.bias=-.00028;

// The approved concept's unique film-strip frame remains artwork, and we move
// a separate lit selector. Both are independent 2D pieces in world space.
const borderCanvas=document.createElement('canvas');borderCanvas.width=256;borderCanvas.height=192;
{
 const c=borderCanvas.getContext('2d');
 const outer=c.createLinearGradient(0,0,256,192);outer.addColorStop(0,'#f5c18a');outer.addColorStop(.5,'#fff5c5');outer.addColorStop(1,'#b96f49');
 c.strokeStyle='rgba(255,206,137,.24)';c.shadowColor='#ffc783';c.shadowBlur=24;
 c.lineWidth=18;c.strokeRect(16,12,224,165);
 c.shadowBlur=10;c.strokeStyle=outer;c.lineWidth=7;c.strokeRect(19,15,217,159);
}
const selTex=new THREE.CanvasTexture(borderCanvas);selTex.colorSpace=THREE.SRGBColorSpace;
const selMat=new THREE.MeshBasicMaterial({map:selTex,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
const selZ=CAST.filmstrip+.065,slotW=171,slotH=122,fac=(CAM_Z-selZ)/CAM_Z;
frameHighlight=new THREE.Mesh(new THREE.PlaneGeometry(slotW/W*WORLD_W*fac,slotH/H*WORLD_H*fac),selMat);
frameHighlight.name='2D-paper-active-film-gate';frameHighlight.position.z=selZ;frameHighlight.renderOrder=20;
scene.add(frameHighlight);
const centerXP=[482,648,813,976,1147,1315,1482];
function setHighlight(index){
 const x=centerXP[index],y=719;
 frameHighlight.position.x=(x/W-.5)*WORLD_W*fac;
 frameHighlight.position.y=(.5-y/H)*WORLD_H*fac;
}
setHighlight(1);

// For other characters the original GitHub PNG is shown on the same projected
// paper canvas, never repainted or silently replaced in source files.
let projCanvas=null, projTexture=null;
const imageCache=new Map();
function loadImage(src){
 if(imageCache.has(src))return imageCache.get(src);
 const p=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('image not found: '+src));im.src=src;});
 imageCache.set(src,p);return p;
}
function transparentWhite(im){
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
 const data=ctx.getImageData(0,0,c.width,c.height),p=data.data;
 for(let i=0;i<p.length;i+=4){
  const r=p[i],g=p[i+1],b=p[i+2],avg=(r+g+b)/3;
  const shade=Math.max(r,g,b)-Math.min(r,g,b);
  if(avg>239&&shade<25)p[i+3]=0;
  else if(avg>216&&shade<32)p[i+3]=Math.min(p[i+3],Math.max(0,Math.round((239-avg)/23*255)));
 }
 ctx.putImageData(data,0,0);return c;
}
function createProjectedArtwork(index,figure){
 const [x0,y0,x1,y1]=REGIONS.screen;const sw=x1-x0,sh=y1-y0;
 const c=document.createElement('canvas');c.width=sw;c.height=sh;const ctx=c.getContext('2d');
 const p=ctx.createLinearGradient(0,0,0,sh);p.addColorStop(0,'#d4b4a3');p.addColorStop(.53,'#dec2ae');p.addColorStop(1,'#a98c82');
 ctx.fillStyle='#56424c';ctx.fillRect(0,0,sw,sh);
 ctx.fillStyle=p;ctx.fillRect(24,27,sw-48,sh-58);
 let halo=ctx.createRadialGradient(345,260,8,320,290,460);
 halo.addColorStop(0,'rgba(255,242,217,.65)');halo.addColorStop(1,'rgba(158,100,92,0)');
 ctx.fillStyle=halo;ctx.fillRect(35,38,750,510);
 ctx.fillStyle='rgba(83,45,52,.20)';
 for(let n=0;n<25;n++){const px=45+n*44;ctx.fillRect(px,35,.65,sh-70);}
 const panelX=775;
 ctx.fillStyle='rgba(242,219,191,.65)';ctx.fillRect(panelX,37,346,520);
 ctx.strokeStyle='rgba(92,54,48,.52)';ctx.lineWidth=1;
 ctx.strokeRect(27,30,sw-54,sh-60);ctx.strokeRect(panelX+9,45,325,504);
 ctx.beginPath();ctx.moveTo(panelX-10,40);ctx.lineTo(panelX-10,555);ctx.stroke();
 // Copy official source art as a transparent figure — full-body aspect preserved.
 if(figure){
   const fw=figure.width,fh=figure.height;
   const maxH=520,maxW=620,scale=Math.min(maxH/fh,maxW/fw);
   const ww=fw*scale,hh=fh*scale;
   const cx=394,cy=556;
   ctx.drawImage(figure,cx-ww/2,cy-hh,ww,hh);
 }
 ctx.fillStyle='#48343b';ctx.textAlign='center';ctx.font='24px serif';ctx.fillText('— MONSTER HUNTERS —',940,92);
 ctx.font='normal 52px "Songti SC",serif';ctx.fillText(ROSTER[index][0],940,168);
 ctx.font='18px "Songti SC",serif';ctx.fillText('怪物猎人组织',940,207);
 const rows=['体型 XP','性格 XP','职业 XP','种族 XP','故事 XP'];
 ctx.font='24px "Songti SC",serif';ctx.textAlign='left';
 rows.forEach((name,i)=>{
   let y=273+i*55;
   ctx.fillStyle='rgba(113,68,71,.18)';ctx.fillRect(panelX+23,y-26,294,41);
   ctx.fillStyle='#563d42';ctx.fillText(name,panelX+37,y);
   ctx.fillStyle='#8d6463';ctx.fillText('—',panelX+276,y);
 });
 return c;
}
async function setScreen(index){
 if(index===1){screenNode.material.map=originalScreenMap;screenNode.material.needsUpdate=true;return;}
 const src='../assets/characters/monster-hunters/'+ROSTER[index][1];
 try{
  const image=await loadImage(src);
  if(selected!==index)return;
  const canvas=createProjectedArtwork(index,transparentWhite(image));
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  if(projTexture)projTexture.dispose();projTexture=tex;
  screenNode.material.map=tex;screenNode.material.needsUpdate=true;
 }catch(e){
  if(selected===index){
   const canvas=createProjectedArtwork(index,null);
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
   if(projTexture)projTexture.dispose();projTexture=tex;
   screenNode.material.map=tex;screenNode.material.needsUpdate=true;
  }
 }
}

// A compact field of points follows the real projector spotlight; the geometry
// sits in space (not screen CSS) and flickers with its lens.
{
 const positions=[];let n=79;
 const rng=(i)=>{const x=Math.sin(i*78.233)*43758.5453;return x-Math.floor(x)};
 for(let i=0;i<n;i++){
  const t=rng(i+1),w=rng(i+53)-.5,v=rng(i+124)-.5;
  const sx=-4.8,sy=-.1,ex=2.4,ey=.7;
  positions.push(sx+(ex-sx)*t+w*t*.95,sy+(ey-sy)*t+v*t*.56,3.8-t*4.5);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const pm=new THREE.PointsMaterial({color:0xffd8a1,size:.042,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending});
 const pts=new THREE.Points(geo,pm);pts.name='world-space-dust';pts.renderOrder=15;scene.add(pts);particles.push(pts);
}

const lensHit={x0:104,y0:164,x1:349,y1:729};
function soundClick(){
 try{
 const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
 if(!window.__paperAudio)window.__paperAudio=new AudioContext();
 const ac=window.__paperAudio,now=ac.currentTime;
 const o=ac.createOscillator(),gain=ac.createGain();
 o.type='triangle';o.frequency.setValueAtTime(135,now);o.frequency.exponentialRampToValueAtTime(69,now+.09);
 gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.12);
 o.connect(gain).connect(ac.destination);o.start(now);o.stop(now+.13);
 }catch{}
}
function advance(delta){
 if(animating)return;
 selected=(selected+delta+7)%7;
 document.getElementById('counter').textContent=String(selected+1).padStart(2,'0')+' / 07';
 animating=true;switchAt=performance.now();filmVelocity=delta;
 reelTarget+=delta*Math.PI*.67;
 soundClick();
 // The lens briefly shutters when a new physical frame reaches the projection gate.
 setTimeout(()=>{setScreen(selected);setHighlight(selected)},185);
 setTimeout(()=>{animating=false;},650);
}
function setLight(on){
 lit=on;
 const b=document.getElementById('illumination');b.setAttribute('aria-pressed',String(on));b.textContent=on?'灯光':'点亮';
 ambientLight.intensity=on?.85:.045;
 keyLight.intensity=on?1.15:.035;
 fillLight.intensity=on?14:.05;
 mainSpot.intensity=on?95:0;
 beamNode.visible=on;
 particles.forEach(p=>p.visible=on);
 screenNode.material.emissiveIntensity=on?.32:.02;
 renderer.toneMappingExposure=on?1.26:.56;
}
function setCompare(on){
 compare=on;
 const b=document.getElementById('compare');b.setAttribute('aria-pressed',String(on));
 b.textContent=on?'返回场景':'对照';
 for(const node of Object.values(nodes))node.visible=!on;
 frameHighlight.visible=!on;
 particles.forEach(p=>p.visible=!on&&lit);
 if(on){
  if(!referenceNode){
   const tex=assetLoader.load(`${ASSET}reference.webp`);tex.colorSpace=THREE.SRGBColorSpace;
   referenceNode=makeSprite('background',tex,-2.7);referenceNode.name='approved-concept-comparison-only';
   referenceNode.material=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
  }
  referenceNode.visible=true;
 }else if(referenceNode)referenceNode.visible=false;
}
function pointerFromEvent(e){
 const rect=renderer.domElement.getBoundingClientRect();
 return {x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};
}
renderer.domElement.addEventListener('click',(e)=>{
 if(compare)return;
 const p=pointerFromEvent(e);
 if(p.y>644&&p.y<816&&p.x>360&&p.x<1553){
  const index=centerXP.reduce((best,cur,i)=>Math.abs(p.x-cur)<Math.abs(p.x-centerXP[best])?i:best,0);
  const delta=((index-selected+7)%7);
  if(index!==selected)advance(delta<=3?1:-1);
 }else if(p.x>lensHit.x0&&p.x<lensHit.x1&&p.y>lensHit.y0&&p.y<lensHit.y1)advance(1);
});
renderer.domElement.addEventListener('pointermove',e=>{
 const r=renderer.domElement.getBoundingClientRect();
 pointer.x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));
 pointer.y=Math.max(-1,Math.min(1,1-(e.clientY-r.top)/r.height*2));
});
renderer.domElement.addEventListener('pointerleave',()=>{pointer.x=0;pointer.y=0});
document.getElementById('previous').addEventListener('click',()=>advance(-1));
document.getElementById('following').addEventListener('click',()=>advance(1));
document.getElementById('illumination').addEventListener('click',()=>setLight(!lit));
document.getElementById('compare').addEventListener('click',()=>setCompare(!compare));
document.addEventListener('keydown',e=>{
 if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){e.preventDefault();advance(1)}
 if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){e.preventDefault();advance(-1)}
 if(e.key.toLowerCase()==='l')setLight(!lit);
 if(e.key==='Escape'&&compare)setCompare(false);
});
let last=performance.now();
function render(t){
 const dt=Math.min(.06,(t-last)/1000);last=t;
 const targetX=pointer.x*.16,targetY=pointer.y*.065;
 camera.position.x+=(targetX-camera.position.x)*Math.min(1,dt*3.7);
 camera.position.y+=(targetY-camera.position.y)*Math.min(1,dt*3.7);
 camera.lookAt(camera.position.x*.55,camera.position.y*.55,0);
 if(animating){
  let elapsed=t-switchAt;
  const smooth=Math.min(1,elapsed/630);
  filmNode.position.x=filmNode.userData.initialPosition.x+filmVelocity*Math.sin(Math.PI*smooth)*.095;
  const shutter=Math.sin(Math.min(1,elapsed/370)*Math.PI);
  screenNode.material.emissiveIntensity=lit?.32*(1-.85*shutter):.02;
  if(lit)mainSpot.intensity=95*(1-.68*shutter);
 }else{
  filmNode.position.x+=(filmNode.userData.initialPosition.x-filmNode.position.x)*Math.min(1,dt*14);
  screenNode.material.emissiveIntensity=lit?.32:.02;
  if(lit)mainSpot.intensity=95+Math.sin(t*.006)*1.6;
 }
 reelTop.rotation.z+=(reelTarget-reelTop.rotation.z)*Math.min(1,dt*9.5);
 reelBottom.rotation.z+=(-reelTarget*.83-reelBottom.rotation.z)*Math.min(1,dt*10.5);
 if(lit&&!compare){
  beamNode.material.opacity=.70+Math.sin(t*.007)*.07;
  particles.forEach(p=>p.material.opacity=.24+Math.sin(t*.005)*.04);
 }
 renderer.render(scene,camera);
 requestAnimationFrame(render);
}
resize();requestAnimationFrame(render);
APP.dataset.mode='painted-multi-plane-2p5d';
APP.dataset.layerCount=String(ORDER.length);
APP.dataset.projectorSolidMeshes='0';
APP.dataset.realShadowmap=String(renderer.shadowMap.enabled);
APP.dataset.realReferenceArtwork='true';
LOADING.classList.add('dismissed');
setTimeout(()=>LOADING.remove(),800);
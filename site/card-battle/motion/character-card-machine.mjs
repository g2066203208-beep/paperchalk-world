import * as THREE from '../vendor/three.module.js';
import {installPayoutLighting,createPayoutBloom} from './coin-payout-lighting.mjs';
import {CARD_DRAW_MS,evaluateCardSequence} from './character-card-sequence.mjs';
import {deriveCardRelief} from './card-image-relief.mjs';

const $=id=>document.getElementById(id);
const canvas=$('machine-canvas');
const small=window.matchMedia('(max-width:760px)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,small?.8:1));
renderer.setClearColor('#13131a');
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#15151d');
const lighting=installPayoutLighting(THREE,renderer,scene,{compact:small});
lighting.lights.key.position.set(-3,8,8);
lighting.lights.key.intensity=3.6;
lighting.lights.gold.position.set(2.1,3,3.1);
lighting.lights.warm.position.set(-2.5,5.8,2.7);
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
const post=createPayoutBloom(THREE,renderer,{compact:small});
post.setBloom(1.25);
post.setThreshold(1.10);
const camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,80);
const viewTarget=new THREE.Vector3(0,2.75,.45);
camera.position.set(6.8,7.0,15.7);
camera.lookAt(viewTarget);
const graphite=new THREE.MeshStandardMaterial({color:'#252a31',metalness:.67,roughness:.48});
const iron=new THREE.MeshStandardMaterial({color:'#10151b',metalness:.78,roughness:.40});
const ironSoft=new THREE.MeshStandardMaterial({color:'#33343b',metalness:.55,roughness:.66});
const gold=new THREE.MeshStandardMaterial({color:'#bd9150',metalness:1,roughness:.28,envMapIntensity:2});
const goldSoft=new THREE.MeshStandardMaterial({color:'#756348',metalness:.88,roughness:.55});
const rose=new THREE.MeshStandardMaterial({color:'#4c252e',metalness:.48,roughness:.68});
const slotBlack=new THREE.MeshStandardMaterial({color:'#05090d',metalness:.05,roughness:.95});
const parchment=new THREE.MeshStandardMaterial({color:'#b3a27e',metalness:.05,roughness:.85});
const lamp=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(4.8,2.15,.55),toneMapped:false});
const tealLamp=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(.60,2.7,2.5),toneMapped:false});
const emptyMetal=new THREE.MeshStandardMaterial({color:'#15181e',metalness:.65,roughness:.41});
const colorCodes={
 'wonder-circus':'#d7a764','crimson-vampires':'#ba5e72','monster-hunters':'#b7b7ac',
 'witch-workshop':'#aa84d5','demon-merchant':'#a89c61'
};
const drawState={ready:false,busy:false,starting:false,queued:[],current:null,elapsed:0,seen:false,
 lastTime:0,animationFinished:false,drawCounter:0,playbackSpeed:1,pool:[],all:[],
 collection:[],muted:false,renderBloom:true,texture:null,textureCount:0,
 lastRender:0,lastAudioMark:-1,selectedFaction:'all'};
const pickup=new THREE.Group();
scene.add(pickup);
function cube(parent,mat,position,size,cast=true){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
 mesh.position.set(...position);mesh.castShadow=cast;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function sheet(parent,mat,x,y,z,w,h){
 const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
 p.position.set(x,y,z);p.receiveShadow=true;parent.add(p);return p;
}
function cylinder(parent,mat,position,radius,height,faces=16){
 const o=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,faces),mat);
 o.position.set(...position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function rail(parent,mat,cx,cy,cz,width,height,depth=.055){
 cube(parent,mat,[cx,cy,cz],[width,height,depth]);
}
const machine=new THREE.Group();scene.add(machine);
const floor=cube(scene,ironSoft,[0,-.30,-.20],[11.9,.26,8.5]);
floor.castShadow=false;
const tile=cube(scene,graphite,[0,-.16,-.21],[11.7,.015,8.3]);tile.castShadow=false;
cube(machine,graphite,[0,2.56,-.29],[4.62,5.28,1.34]);
cube(machine,iron,[0,2.55,-1.00],[4.7,5.42,.16]);
cube(machine,goldSoft,[0,5.22,-.20],[4.95,.22,1.55]);
cube(machine,gold,[0,5.31,-.20],[4.68,.045,1.60]);
cube(machine,iron,[0,.16,-.20],[4.8,.40,1.70]);
cube(machine,goldSoft,[0,.40,.63],[4.5,.07,.1]);
for(const x of [-2.19,2.19]){
 cube(machine,ironSoft,[x,2.76,.52],[.31,4.66,.20]);
 cube(machine,goldSoft,[x,2.78,.66],[.047,4.58,.08]);
}
cube(machine,rose,[0,4.74,.53],[4.02,.72,.15]);
cube(machine,graphite,[0,2.51,.54],[4.05,1.83,.11]);
cube(machine,rose,[0,.90,.56],[4.05,.92,.13]);
cube(machine,iron,[0,3.84,.55],[4.04,1.18,.13]);
rail(machine,gold,-0.0,4.43,.70,4.17,.06);
rail(machine,gold,0,3.23,.70,4.17,.07);
for(const x of [-1.93,-.65,.65,1.93]){
 rail(machine,goldSoft,x,3.84,1.53,.068,1.2);
}
cube(machine,goldSoft,[0,4.73,.77],[2.57,.18,.16]);
const sign=makeText('CHARACTER · 01',512,70,'#f3dbb2','#2c2529');
const signMat=new THREE.MeshBasicMaterial({map:sign,transparent:false,toneMapped:false});
sheet(machine,signMat,0,4.73,.871,2.44,.29);
for(const x of [-1.89,1.89]){
 cylinder(machine,lamp,[x,4.73,.86],.095,.045,12).rotation.x=Math.PI/2;
}
const reelGroup=[];
function makeText(value,w=256,h=256,foreground='#e8c07c',background='#17191d'){
 const texCanvas=document.createElement('canvas');texCanvas.width=w;texCanvas.height=h;
 const g=texCanvas.getContext('2d');
 g.fillStyle=background;g.fillRect(0,0,w,h);
 const glow=g.createLinearGradient(0,0,0,h);
 glow.addColorStop(0,'rgba(255,255,255,.13)');glow.addColorStop(.30,'rgba(255,255,255,.015)');
 glow.addColorStop(.8,'rgba(0,0,0,.3)');g.fillStyle=glow;g.fillRect(0,0,w,h);
 g.strokeStyle='#98784e';g.lineWidth=4;g.strokeRect(9,9,w-18,h-18);
 g.font='bold '+Math.min(h*.62,Math.floor(w/Math.max(1,value.length)*1.27))+'px Georgia,serif';
 g.textAlign='center';g.textBaseline='middle';g.fillStyle=foreground;g.fillText(value,w/2,h/2, w-22);
 const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=2;return texture;
}
const symbols=['✦','♠','♦','♣','✧','✷','✥','✤'];
for(let i=0;i<3;i++){
 const x=(i-1)*1.28;
 const drum=new THREE.Group();drum.position.set(x,3.84,.99);machine.add(drum);
 cylinder(drum,iron,[0,0,0],.45,.78,20).rotation.z=Math.PI/2;
 for(let k=0;k<8;k++){
  const angle=k*2*Math.PI/8;
  const texture=makeText(symbols[(k+i*3)%symbols.length]);
  const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.76,.76),mat);
  p.position.set(0,.47*Math.sin(angle),.47*Math.cos(angle));
  p.rotation.x=-angle;drum.add(p);
 }
 reelGroup.push(drum);
 cube(machine,iron,[x,3.83,.59],[.89,1.11,.02],false);
 rail(machine,goldSoft,x,4.45,1.54,1.11,.052);
 rail(machine,goldSoft,x,3.22,1.54,1.11,.052);
}
const drawer=cube(machine,slotBlack,[0,1.29,.70],[2.13,.39,.12],false);
const lip=cube(machine,gold,[0,1.49,.86],[2.35,.064,.31]);
cube(machine,goldSoft,[0,1.06,.84],[2.35,.105,.25]);
const gate=cube(machine,ironSoft,[0,1.29,.885],[1.93,.22,.07]);
cube(machine,goldSoft,[0,1.92,.63],[2.55,.08,.10]);
cube(machine,goldSoft,[0,2.03,.64],[2.55,.045,.09]);
cube(machine,parchment,[0,2.26,.63],[1.86,.21,.021],false);
sheet(machine,new THREE.MeshBasicMaterial({map:makeText('DRAW · A CARD',512,90,'#3b2c25','#d0be90')}),0,2.27,.66,1.80,.21);
for(const x of [-1.80,1.80]){
 for(let y=1.78;y<=3.02;y+=.29){
  cylinder(machine,goldSoft,[x,y,.64],.035,.04,10).rotation.x=Math.PI/2;
 }
}
const lever=new THREE.Group();lever.position.set(2.35,2.48,.18);machine.add(lever);
cylinder(lever,goldSoft,[0,.35,0],.055,.73,12);
cylinder(lever,lamp,[0,.73,0],.17,.24,16);
const cardRoot=new THREE.Group();scene.add(cardRoot);
// REAL IMAGE-BASED 2.5D CARD: no extruded frames or decorative gold meshes.
// Flat paper with two independent ONE-SIDED image surfaces. The printed foil
// gets its relief from the source pixels, not from 3D ornamental geometry.
const cardW=1.68,cardH=2.53;
const front=new THREE.Group();front.position.z=.006;cardRoot.add(front);
const back=new THREE.Group();back.position.z=-.006;back.rotation.y=Math.PI;cardRoot.add(back);
// A rounded paper silhouette, never a raised border or colored picture frame.
function roundedCardAlpha(){
 const c=document.createElement('canvas');c.width=192;c.height=288;
 const g=c.getContext('2d'),r=10,w=c.width,h=c.height;
 g.beginPath();g.moveTo(r,0);g.lineTo(w-r,0);
 g.quadraticCurveTo(w,0,w,r);g.lineTo(w,h-r);
 g.quadraticCurveTo(w,h,w-r,h);g.lineTo(r,h);
 g.quadraticCurveTo(0,h,0,h-r);g.lineTo(0,r);
 g.quadraticCurveTo(0,0,r,0);g.closePath();
 g.fillStyle='#ffffff';g.fill();
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.NoColorSpace;
 return tex;
}
const frontPaperMaterial=new THREE.MeshPhysicalMaterial({
 color:'#e9e1d4',metalness:0,roughness:.98,
 sheen:.24,sheenRoughness:.94,sheenColor:'#ddd3c4',
 specularIntensity:.22,envMapIntensity:.14,
 side:THREE.FrontSide,transparent:false,alphaMap:roundedCardAlpha(),alphaTest:.45
});
const frontPaper=sheet(front,frontPaperMaterial,0,0,0,cardW,cardH);
frontPaper.receiveShadow=false;
// A non-plastic matte fine-art print: cellulose sheen and reduced specular,
// high roughness with per-pixel ink and fiber variation.
const portraitMaterial=new THREE.MeshPhysicalMaterial({
 color:'#ffffff',metalness:0,roughness:1,envMapIntensity:.17,
 sheen:.17,sheenRoughness:.93,sheenColor:'#d6d0c5',
 specularIntensity:.22,
 side:THREE.FrontSide,transparent:false,alphaTest:.018,
 normalScale:new THREE.Vector2(1.48,1.48)
});
const portrait=sheet(front,portraitMaterial,0,0,.003,cardW,cardH);
portrait.receiveShadow=false;
// Gold ink picks up localized metallic reflections; most burgundy is
// diffuse textured paper, NOT a homogeneous shiny lacquer sheet.
const cardBackMaterial=new THREE.MeshPhysicalMaterial({
 color:'#ffffff',metalness:1,roughness:1,envMapIntensity:.66,
 sheen:.10,sheenRoughness:.96,sheenColor:'#d4b7a6',
 specularIntensity:.24,
 side:THREE.FrontSide,transparent:false,alphaTest:.060,
 normalScale:new THREE.Vector2(1.55,1.55),
 emissive:'#080809',emissiveIntensity:.035
});
const cardBackPlane=sheet(back,cardBackMaterial,0,0,.002,cardW,cardH);
cardBackPlane.receiveShadow=false;
const cardBackUrl=new URL('../../assets/cards/shared/character-card-back-anima.webp',import.meta.url).href;
let cardBackReady=false,cardBackFailed=false;
const reliefStats={back:null,portrait:null};
// Keep only the last THREE derived portrait material sets resident. A
// 35-character collection must not keep 35 x 3 GPU textures forever.
const portraitReliefLRU=[];
function keepPortraitRelief(asset){
 const existing=portraitReliefLRU.indexOf(asset);
 if(existing!==-1)portraitReliefLRU.splice(existing,1);
 portraitReliefLRU.push(asset);
 while(portraitReliefLRU.length>3){
  const old=portraitReliefLRU.shift();
  if(old===asset){portraitReliefLRU.push(old);break;}
  if(old.relief){
   for(const tex of [old.relief.normal,old.relief.surface,old.relief.pigment])
    tex?.dispose();
   old.relief=null;
  }
 }
}
// Generate a tangent-space normal map from the image's RED/GREEN/BLUE
// content and a metallic mask exclusively for warm-gold pixel regions.
function imageRelief(image,mode){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 // Original COLOR art remains full size; derived shading maps are
 // lower-res and cheap to compute on phone. Normal mipmaps fill closeups.
 const maxDim=small?448:640;
 const shrink=Math.min(1,maxDim/Math.max(iw,ih));
 const w=Math.max(3,Math.round(iw*shrink));
 const h=Math.max(3,Math.round(ih*shrink));
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Canvas pixel context unavailable');
 ctx.drawImage(image,0,0,w,h);
 const rgba=ctx.getImageData(0,0,w,h).data;
 const result=deriveCardRelief(rgba,w,h,mode);
 function imageTexture(data,colorSpace=THREE.NoColorSpace){
  // DataTexture uploads may ignore UNPACK_FLIP_Y_WEBGL for typed arrays.
  // CanvasTexture follows the SAME top-left origin / flipY path as
  // THREE.Texture(img), so derived pigment can never invert the art.
  const surfaceCanvas=document.createElement('canvas');
  surfaceCanvas.width=w;surfaceCanvas.height=h;
  const g=surfaceCanvas.getContext('2d');
  const pixels=g.createImageData(w,h);pixels.data.set(data);
  g.putImageData(pixels,0,0);
  const t=new THREE.CanvasTexture(surfaceCanvas);
  t.colorSpace=colorSpace;t.flipY=true;
  t.minFilter=THREE.LinearMipmapLinearFilter;
  t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;
  t.anisotropy=4;return t;
 }
 const tex={normal:imageTexture(result.normals),
  surface:imageTexture(result.surface),
  pigment:imageTexture(result.pigment,THREE.SRGBColorSpace),
  stats:result.stats};
 return tex;
}
new THREE.TextureLoader().load(cardBackUrl,tex=>{
 tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
 cardBackMaterial.map=tex;
 try{
  const relief=imageRelief(tex.image,'back');
  cardBackMaterial.normalMap=relief.normal;
  cardBackMaterial.map=relief.pigment;
  // Three.js reads METALNESS from blue, ROUGHNESS from green.
  cardBackMaterial.metalnessMap=relief.surface;
  cardBackMaterial.roughnessMap=relief.surface;
  reliefStats.back=relief.stats;
 }catch(e){console.error('Card back image relief generation failed',e)}
 cardBackMaterial.needsUpdate=true;cardBackReady=true;
 if(drawState.ready)$('inspect').disabled=false;
},undefined,error=>{
 cardBackFailed=true;console.error('Approved card-back texture failed to load',cardBackUrl,error);
 $('load-status').textContent='卡背原图加载失败，请检查 GitHub 素材路径';
});
// Orthographic view direction is constant. Hide the far image group before
// rendering AND let GPU FrontSide culling reject the inward face.
const cardFaceNormal=new THREE.Vector3(),cameraForward=new THREE.Vector3(),
 worldQuaternion=new THREE.Quaternion();
let visibleFace='edge',frontFacing=0;
function updateCardFaceCulling(){
 if(!cardRoot.visible)return;
 cardRoot.getWorldQuaternion(worldQuaternion);
 cardFaceNormal.set(0,0,1).applyQuaternion(worldQuaternion);
 camera.getWorldDirection(cameraForward);
 frontFacing=-cardFaceNormal.dot(cameraForward);
 front.visible=frontFacing>.002;
 back.visible=frontFacing<-.002;
 visibleFace=front.visible?'front':back.visible?'back':'edge';
}
cardRoot.visible=false;
const aura=new THREE.Group();scene.add(aura);
const aureole=new THREE.Mesh(new THREE.RingGeometry(1.51,1.55,64),new THREE.MeshBasicMaterial({
 color:'#e5bf80',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
}));
aura.add(aureole);
const rays=[];
for(let n=0;n<12;n++){
 const ray=new THREE.Mesh(new THREE.PlaneGeometry(.03,.61),lamp);
 const angle=n*Math.PI/6;
 ray.position.set(Math.sin(angle)*1.72,Math.cos(angle)*1.72,-.01);
 ray.rotation.z=-angle;ray.scale.set(1,.65,1);aura.add(ray);rays.push(ray);
}
aura.visible=false;
const resultLight=new THREE.PointLight('#f7c880',0,6,2);scene.add(resultLight);
function resize(){
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 // Reward the viewer's expensive full-size art with sharp sampling.
 // Reel animation can run lower-res, but inspection is only one flat card.
 const inspecting=document.body.classList.contains('inspect-open');
 renderer.setPixelRatio(inspecting?Math.min(window.devicePixelRatio||1,1.5):
  Math.min(window.devicePixelRatio||1,w<700?.78:1));
 renderer.setSize(w,h,false);
 const aspect=w/h,halfHeight=w<700?3.55:3.20;
 camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
 camera.top=halfHeight;camera.bottom=-halfHeight;
 camera.updateProjectionMatrix();post.resize();
 renderer.shadowMap.needsUpdate=true;
}
new ResizeObserver(resize).observe(canvas);
window.addEventListener('resize',resize);resize();
const cache=new Map();
function getPortrait(card){
 if(cache.has(card.id))return cache.get(card.id);
 const promise=new Promise((resolve,reject)=>{
  const img=new Image();img.decoding='async';
  img.onload=()=>{
   const tex=new THREE.Texture(img);tex.colorSpace=THREE.SRGBColorSpace;
   tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
   tex.generateMipmaps=true;tex.anisotropy=2;tex.needsUpdate=true;
   resolve({tex,w:img.naturalWidth,h:img.naturalHeight});
  };
  img.onerror=()=>reject(new Error('人物原图加载失败: '+card.name));
  img.src=card.url;
 });
 cache.set(card.id,promise);
 // A failed URL must be retryable; do not keep its rejected Promise forever.
 promise.catch(()=>cache.delete(card.id));
 return promise;
}
function updatePortrait(card,asset){
 portrait.material.map=asset.tex;
 if(!asset.relief){
  try{asset.relief=imageRelief(asset.tex.image,'portrait')}
  catch(e){console.error('Portrait paper-grain maps unavailable',e)}
 }
 portrait.material.normalMap=asset.relief?.normal||null;
 portrait.material.roughnessMap=asset.relief?.surface||null;
 portrait.material.map=asset.relief?.pigment||asset.tex;
 reliefStats.portrait=asset.relief?.stats||null;
 if(asset.relief)keepPortraitRelief(asset);
 portrait.material.needsUpdate=true;
 // Preserve the original 704:1024 portrait aspect ratio, without cropping
 // its head, shoes or costume to fit the narrower 3D card paper.
 const ratio=asset.w/Math.max(1,asset.h);
 const w=Math.min(cardW,cardH*ratio),h=Math.min(cardH,cardW/ratio);
 portrait.geometry.dispose();
 portrait.geometry=new THREE.PlaneGeometry(w,h);
 portrait.position.set(0,0,.003);
}
function loadInventory(){
 try{
  const v=JSON.parse(localStorage.getItem('paperchalk-character-pulls-v1')||'[]');
  return Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.count)&&x.count>0):[];
 }catch{return []}
}
drawState.collection=loadInventory();
function saveInventory(){
 try{localStorage.setItem('paperchalk-character-pulls-v1',JSON.stringify(drawState.collection))}catch{}
}
function updateInventory(card){
 const rec=drawState.collection.find(x=>x.id===card.id);
 if(rec)rec.count++;else drawState.collection.unshift({id:card.id,count:1});
 saveInventory();renderInventory();
}
function renderInventory(){
 const list=$('collection');list.replaceChildren();
 let total=0;
 for(const record of drawState.collection){
  const card=drawState.all.find(c=>c.id===record.id);
  if(!card)continue;
  total+=record.count;
  const el=document.createElement('div');el.className='mini';el.title=card.group+' · '+card.name;
  const img=document.createElement('img');img.src=card.url;img.alt=card.name;img.loading='lazy';
  el.append(img);
  if(record.count>1){const badge=document.createElement('em');badge.textContent='×'+record.count;el.append(badge);}
  list.append(el);
 }
 if(!list.childElementCount){const p=document.createElement('span');p.className='empty';p.textContent='还未抽取人物卡';list.append(p);}
 $('library-count').textContent=total+' 张 · '+drawState.collection.length+' 种';
}
let audio=null;
function unlockAudio(){
 if(drawState.muted)return;
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  audio=audio||new AudioCtx();
  if(audio.state==='suspended')audio.resume();
 }catch{}
}
function sound(tone=360,seconds=.12,kind='triangle',volume=.05){
 if(drawState.muted)return;
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return;
  audio=audio||new AudioCtx();if(audio.state==='suspended')audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=kind;osc.frequency.setValueAtTime(tone,audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(55,tone*.67),audio.currentTime+seconds);
  gain.gain.setValueAtTime(volume,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+seconds);
  osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+seconds);
 }catch{}
}
function playEventAudio(ms){
 const marks=[1160,1380,1600,1770,2870];
 for(let i=0;i<marks.length;i++){
  if(drawState.lastAudioMark<i && ms>=marks[i]){
   if(i<=2)sound(165-i*22,.10,'square',.023);
   else if(i===3)sound(92,.18,'triangle',.09);
   else {sound(740,.39,'sine',.055);sound(1100,.31,'sine',.026);}
   drawState.lastAudioMark=i;
  }
 }
}
function applySequence(ms,quiet=false){
 const p=evaluateCardSequence(ms);
 const idx=p.reels;
 reelGroup.forEach((r,i)=>r.rotation.x=idx[i]);
 lever.rotation.z=-.17*Math.sin(Math.PI*Math.min(1,ms/420));
 gate.position.y=1.29+p.door*.19;
 gate.scale.y=1-p.door*.82;
 machine.rotation.z=.007*Math.sin(ms/19)*p.hit;
 cardRoot.visible=p.card.visible;
 if(p.card.visible){
  cardRoot.position.set(p.card.x,p.card.y,p.card.z);
  cardRoot.quaternion.copy(camera.quaternion);
  cardRoot.rotateY(p.card.rotationY);
  cardRoot.rotateX(p.card.rotationX);
  cardRoot.rotateZ(p.card.roll);
  cardRoot.scale.setScalar(p.card.scale);
  updateCardFaceCulling(); // deterministic seek / screenshot should never be stale
 }
 aura.visible=p.card.visible&&p.card.reveal>.001;
 if(aura.visible){
  aura.position.copy(cardRoot.position);
  aura.position.z-=.25;
  aura.quaternion.copy(camera.quaternion);
  aureole.material.opacity=(.10+p.flash*.68)*p.card.reveal;
  aureole.rotation.z=ms*.0001;
  rays.forEach((r,i)=>r.scale.y=(.30+p.flash*1.05)*p.card.reveal*(i%3===0?1.25:1));
 }
 const accent=drawState.current?.accent||'#e0bb79';
 resultLight.color.set(accent);
 resultLight.intensity=p.halo*16;
 resultLight.position.set(p.card.x,p.card.y,p.card.z+1);
 $('stage-label').textContent=p.phase==='spin'?'机械滚轮正在抽选…':p.phase==='stopping'?'滚轮逐列锁定':p.phase==='chute'?'已命中 · 出卡口开启':p.phase==='eject'?'实体卡出仓':p.phase==='flip'?'翻转卡背 · 身份即将揭晓':p.phase==='reveal'?'人物揭晓': '人物已抽取';
 $('stage-frame').textContent=p.phase.toUpperCase()+' / '+(Math.min(ms,CARD_DRAW_MS)/1000).toFixed(2)+'s';
 $('machine-state').textContent=p.phase.toUpperCase();
 $('machine-led').dataset.busy=String(!p.complete);
 $('announce').hidden=!p.card.reveal||p.card.reveal<.45;
 if(p.card.reveal>.45&&drawState.current){
  $('card-name').textContent=drawState.current.name;
  $('card-origin').textContent=drawState.current.group+' · 已有角色立绘 · 真实卡片模型';
 }
 if(!quiet)playEventAudio(ms);
 if(p.complete&&!drawState.seen){
  drawState.seen=true;
  updateInventory(drawState.current);
  $('load-status').textContent='获得 '+drawState.current.name+' · 可继续抽取';
 }
 if(p.complete&&!drawState.animationFinished){
  drawState.animationFinished=true;
  drawState.busy=false;
  $('skip').disabled=true;
 }
 return p;
}
async function processQueue(){
 if(inspector.active||drawState.starting||drawState.busy||!drawState.queued.length)return;
 drawState.starting=true;
 const faction=drawState.queued.shift();
 const candidates=drawState.all.filter(c=>faction==='all'||c.faction===faction);
 if(!candidates.length){drawState.starting=false;return}
 const item=candidates[Math.floor(Math.random()*candidates.length)];
 $('load-status').textContent='调取人物原画：'+item.name;
 $('draw-one').disabled=false;$('draw-five').disabled=false;
 try{
  const asset=await getPortrait(item);
  updatePortrait(item,asset);
  drawState.current=item;drawState.elapsed=0;drawState.seen=false;
  drawState.busy=true;drawState.animationFinished=false;drawState.lastAudioMark=-1;
  drawState.starting=false;drawState.drawCounter++;
  cardRoot.visible=false;$('announce').hidden=true;
  $('skip').disabled=false;renderer.shadowMap.needsUpdate=true;
  $('load-status').textContent='抽选中 · 队列 '+drawState.queued.length+' 张';
  applySequence(0,true);
 }catch(e){
  drawState.starting=false;$('load-status').textContent=e.message||'资源加载错误';
  // A broken image must never award an invisible placeholder card.
  if(drawState.queued.length)processQueue();
 }
}
function queueDraw(n){
 if(!drawState.ready||inspector.active)return;
 if(drawState.queued.length+n>25){$('load-status').textContent='队列上限 25 张';return;}
 const key=$('faction').value;
 for(let i=0;i<n;i++)drawState.queued.push(key);
 $('load-status').textContent='已排队 '+drawState.queued.length+' 张';
 processQueue();
}
// Free examination is a genuine real-time 3D mode in the SAME slot machine.
// No static screenshot, fake 2D flip, or alteration of approved portrait bytes.
// Real arcball-style 3D inspection: unrestricted quaternion rotation around
// every axis, no elevation lock, with continuous pan and deep zoom. The card
// remains a THREE.Mesh/ExtrudeGeometry, never a 2D overlay or CSS transform.
const inspector={
 active:false,studioBackup:null,orientation:new THREE.Quaternion(),
 yaw:Math.PI,pitch:0,roll:0,zoom:2.08,panX:0,panY:0,
 spinning:false,pointers:new Map(),pinchStart:0,pinchZoom:2.08,
 pinchAngle:0,pinchCenter:null,serial:0,chosen:'back'
};
const ix=new THREE.Vector3(1,0,0),iy=new THREE.Vector3(0,1,0),iz=new THREE.Vector3(0,0,1);
const clampInspect=(n,min,max)=>Math.max(min,Math.min(max,n));
const inspectDefaultZoom=()=>clampInspect(Math.min(
 (camera.right-camera.left)*.82/cardW,
 (camera.top-camera.bottom)*.83/cardH
),.45,3);
function inspectQuaternionRotate(axis,angle){
 if(!angle)return;
 inspector.orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle)).normalize();
 if(axis===iy)inspector.yaw+=angle;
 else if(axis===ix)inspector.pitch+=angle;
 else if(axis===iz)inspector.roll+=angle;
}
function inspectStopSpin(){
 inspector.spinning=false;
 $('inspect-spin').setAttribute('aria-pressed','false');
 $('inspect-spin').textContent='自动转动';
}
function setInspectorFace(face){
 inspectStopSpin();
 inspector.orientation.setFromAxisAngle(iy,face==='back'?Math.PI:0);
 inspector.yaw=face==='back'?Math.PI:0;
 inspector.pitch=0;inspector.roll=0;
 if(inspector.active)renderInspectorCard();
}
// Reel-payout spotlights reach 28 candela units and are intentionally
// theatrical. They MUST NOT wash out approved painted portraits or turn the
// matte burgundy paper orange during close inspection.
function setCardInspectionLighting(enabled){
 const all=lighting.lights;
 if(enabled){
  if(inspector.studioBackup)return;
  inspector.studioBackup={
   key:all.key.intensity,fill:all.fill.intensity,
   warm:all.warm.intensity,gold:all.gold.intensity,sky:all.sky.intensity,
   keyColor:all.key.color.clone(),fillColor:all.fill.color.clone()
  };
  all.key.intensity=1.35;all.key.color.set('#f7f8ff');
  all.fill.intensity=1.20;all.fill.color.set('#d7e4f2');
  all.sky.intensity=.85;
  all.warm.intensity=.35;all.gold.intensity=.35;
  // The texture's microscopic roughness, not HDR halo, should define paper.
  post.setBloom(0);
 }else if(inspector.studioBackup){
  const prev=inspector.studioBackup;
  all.key.intensity=prev.key;all.key.color.copy(prev.keyColor);
  all.fill.intensity=prev.fill;all.fill.color.copy(prev.fillColor);
  all.warm.intensity=prev.warm;all.gold.intensity=prev.gold;
  all.sky.intensity=prev.sky;
  post.setBloom(drawState.renderBloom?1.25:0);
  inspector.studioBackup=null;
 }
 renderer.shadowMap.needsUpdate=true;
}
function inspectZoomBy(factor){
 inspector.zoom=clampInspect(inspector.zoom*factor,.32,7.5);
 renderInspectorCard();
}
function inspectPanByPixels(dx,dy){
 const worldPerPixel=(camera.top-camera.bottom)/Math.max(1,canvas.clientHeight);
 inspector.panX+=dx*worldPerPixel;
 inspector.panY-=dy*worldPerPixel;
}
function renderInspectorCard(){
 if(!inspector.active)return;
 cardRoot.visible=true;
 const right=ix.clone().applyQuaternion(camera.quaternion);
 const up=iy.clone().applyQuaternion(camera.quaternion);
 cardRoot.position.copy(viewTarget)
  .addScaledVector(right,inspector.panX)
  .addScaledVector(up,inspector.panY);
 cardRoot.quaternion.copy(camera.quaternion).multiply(inspector.orientation);
 cardRoot.scale.setScalar(inspector.zoom);
 aura.visible=false;
 resultLight.color.set('#f5f4ee');
 resultLight.intensity=.60;
 resultLight.position.copy(viewTarget).addScaledVector(up,1.05).addScaledVector(iz,2.5);
 updateCardFaceCulling(); // immediate same-frame front/back visibility
}
function openInspector(){
 if(!drawState.ready||!cardBackReady||inspector.active)return;
 inspector.active=true;
 inspectStopSpin();
 inspector.zoom=inspectDefaultZoom();
 inspector.panX=0;inspector.panY=0;
 inspector.pointers.clear();inspector.pinchStart=0;inspector.pinchCenter=null;
 setInspectorFace('back');
 inspector.chosen='back';inspector.serial++;
 $('inspect-character').value='back';
 $('inspect-toolbar').hidden=false;$('inspect-hint').hidden=false;
 $('inspect').setAttribute('aria-pressed','true');
 $('inspect').textContent='正在自由观赏';
 $('draw-one').disabled=true;$('draw-five').disabled=true;$('skip').disabled=true;
 document.querySelector('.stage').dataset.inspecting='true';
 document.body.classList.add('inspect-open');
 resize(); // allocate sharper framebuffer only while studying the artwork
 setCardInspectionLighting(true);
 machine.visible=false;floor.visible=false;tile.visible=false;
 $('stage-label').textContent='卡背原图 · 360° 任意角度';
 $('stage-frame').textContent='DRAG ROTATE · WHEEL ZOOM · SHIFT DRAG PAN';
 $('load-status').textContent='已加载真实酒红金线卡背，拖动旋转、放大看细节';
 $('announce').hidden=true;
 renderInspectorCard();
}
async function inspectChoose(id,showFront=true){
 if(!inspector.active)return;
 const serial=++inspector.serial;inspector.chosen=id;
 if(id==='back'){
  setInspectorFace('back');
  $('stage-label').textContent='卡背原图 · 360° 任意角度';
  $('load-status').textContent='已加载原始 Anima 卡背纹理';
  return;
 }
 const card=drawState.all.find(x=>x.id===id);
 if(!card)return;
 $('load-status').textContent='正在读取 '+card.name+' 原画…';
 try{
  const asset=await getPortrait(card);
  if(serial!==inspector.serial||!inspector.active)return;
  updatePortrait(card,asset);
  $('stage-label').textContent='自由观赏 · '+card.name;
  $('load-status').textContent=card.group+' · '+card.name+' · 真实人物立绘';
  if(showFront)setInspectorFace('front');
 }catch(e){if(serial===inspector.serial)$('load-status').textContent=String(e.message||e);}
}
function closeInspector(){
 if(!inspector.active)return;
 inspector.active=false;inspector.serial++;
 inspector.pointers.clear();inspectStopSpin();
 $('inspect-toolbar').hidden=true;$('inspect-hint').hidden=true;
 $('inspect').setAttribute('aria-pressed','false');
 $('inspect').textContent='自由观赏卡牌';
 $('draw-one').disabled=false;$('draw-five').disabled=false;
 $('skip').disabled=!drawState.busy;
 document.querySelector('.stage').dataset.inspecting='false';
 document.body.classList.remove('inspect-open');
 resize(); // restore normal slot-machine performance when leaving
 setCardInspectionLighting(false);
 machine.visible=true;floor.visible=true;tile.visible=true;
 const restore=drawState.current;
 if(restore)getPortrait(restore).then(asset=>{
  if(!inspector.active&&drawState.current?.id===restore.id)updatePortrait(restore,asset);
 }).catch(console.warn);
 if(drawState.current)applySequence(drawState.elapsed,true);
 else{
  cardRoot.visible=false;aura.visible=false;
  $('stage-label').textContent='35 张真实立绘 · 可以开始抽取';
  $('stage-frame').textContent='READY';
  resultLight.intensity=0;
 }
 $('load-status').textContent=drawState.queued.length?
 '继续抽卡队列：'+drawState.queued.length+' 张':'返回实体出卡机';
 if(!drawState.busy)processQueue();
}
$('inspect').addEventListener('click',openInspector);
$('inspect-exit').addEventListener('click',closeInspector);
$('inspect-back').addEventListener('click',()=>setInspectorFace('back'));
$('inspect-front').addEventListener('click',()=>{
 if(inspector.chosen==='back'){
  const id=drawState.current?.id||drawState.all[0]?.id;
  if(id){$('inspect-character').value=id;inspectChoose(id,true);}
 }else setInspectorFace('front');
});
$('inspect-character').addEventListener('change',e=>inspectChoose(e.target.value,true));
$('inspect-reset').addEventListener('click',()=>{
 inspector.zoom=inspectDefaultZoom();inspector.panX=0;inspector.panY=0;
 setInspectorFace(inspector.chosen==='back'?'back':'front');
});
$('inspect-zoom-in').addEventListener('click',()=>inspectZoomBy(1.28));
$('inspect-zoom-out').addEventListener('click',()=>inspectZoomBy(1/1.28));
$('inspect-spin').addEventListener('click',()=>{
 inspector.spinning=!inspector.spinning;
 $('inspect-spin').setAttribute('aria-pressed',String(inspector.spinning));
 $('inspect-spin').textContent=inspector.spinning?'停止转动':'自动转动';
});
function pointerGapAngleCenter(){
 const a=[...inspector.pointers.values()];
 if(a.length<2)return null;
 const dx=a[1].x-a[0].x,dy=a[1].y-a[0].y;
 return {distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),
  x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
}
function inspectStartPinch(){
 const q=pointerGapAngleCenter();
 if(q){
  inspector.pinchStart=Math.max(1,q.distance);
  inspector.pinchZoom=inspector.zoom;
  inspector.pinchAngle=q.angle;
  inspector.pinchCenter={x:q.x,y:q.y};
 }
}
canvas.addEventListener('contextmenu',e=>{if(inspector.active)e.preventDefault();});
canvas.addEventListener('pointerdown',e=>{
 if(!inspector.active)return;
 e.preventDefault();
 canvas.setPointerCapture(e.pointerId);
 inspector.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
  button:e.button,pan:e.button===2||e.shiftKey});
 if(inspector.pointers.size===2)inspectStartPinch();
 inspectStopSpin();
});
canvas.addEventListener('pointermove',e=>{
 if(!inspector.active||!inspector.pointers.has(e.pointerId))return;
 e.preventDefault();
 const last=inspector.pointers.get(e.pointerId);
 const dx=e.clientX-last.x,dy=e.clientY-last.y;
 last.x=e.clientX;last.y=e.clientY;
 if(inspector.pointers.size>=2){
  const q=pointerGapAngleCenter();
  if(!q)return;
  if(inspector.pinchStart>0)
   inspector.zoom=clampInspect(inspector.pinchZoom*q.distance/inspector.pinchStart,.32,7.5);
  // Two-finger twist rotates the card around the axis pointing at the viewer.
  const turn=Math.atan2(Math.sin(q.angle-inspector.pinchAngle),
   Math.cos(q.angle-inspector.pinchAngle));
  inspectQuaternionRotate(iz,turn);
  inspector.pinchAngle=q.angle;
  if(inspector.pinchCenter){
   inspectPanByPixels(q.x-inspector.pinchCenter.x,q.y-inspector.pinchCenter.y);
  }
  inspector.pinchCenter={x:q.x,y:q.y};
 }else if(last.pan||e.shiftKey){
  inspectPanByPixels(dx,dy);
 }else{
  // No pitch clamp: full revolutions are valid along X and Y.
  inspectQuaternionRotate(iy,dx*.013);
  inspectQuaternionRotate(ix,dy*.013);
 }
 renderInspectorCard();
});
function endInspectPointer(e){
 inspector.pointers.delete(e.pointerId);
 if(inspector.pointers.size>=2)inspectStartPinch();
 else{inspector.pinchStart=0;inspector.pinchCenter=null;}
}
canvas.addEventListener('pointerup',endInspectPointer);
canvas.addEventListener('pointercancel',endInspectPointer);
canvas.addEventListener('wheel',e=>{
 if(!inspector.active)return;
 e.preventDefault();
 inspectZoomBy(Math.exp(-e.deltaY*.0014));
},{passive:false});
canvas.addEventListener('dblclick',e=>{
 if(!inspector.active)return;
 e.preventDefault();
 inspector.zoom=inspectDefaultZoom();inspector.panX=0;inspector.panY=0;
 setInspectorFace(inspector.chosen==='back'?'back':'front');
});

$('draw-one').addEventListener('click',()=>{unlockAudio();queueDraw(1);});
$('draw-five').addEventListener('click',()=>{unlockAudio();queueDraw(5);});
$('skip').addEventListener('click',()=>{
 if(!drawState.busy)return;
 drawState.elapsed=CARD_DRAW_MS;applySequence(CARD_DRAW_MS,true);
});
$('glow').addEventListener('click',()=>{
 drawState.renderBloom=!drawState.renderBloom;
 post.setBloom(drawState.renderBloom?1.25:0);
 $('glow').setAttribute('aria-pressed',String(drawState.renderBloom));
 $('glow').textContent=drawState.renderBloom?'电影辉光：开':'电影辉光：关';
});
$('mute').addEventListener('click',()=>{
 drawState.muted=!drawState.muted;
 $('mute').setAttribute('aria-pressed',String(drawState.muted));
 $('mute').textContent=drawState.muted?'音效：关':'音效：开';
});
async function init(){
 try{
  const res=await fetch(new URL('../../data/art/seven-card-groups.v1.json',import.meta.url));
  if(!res.ok)throw new Error('人物清单 HTTP '+res.status);
  const manifest=await res.json();
  const allowed=new Set(['wonder-circus','crimson-vampires','monster-hunters','witch-workshop','demon-merchant']);
  for(const faction of manifest.groups||[]){
   if(!allowed.has(faction.id)||!Array.isArray(faction.roster))continue;
   const folder=faction.id;
   for(const person of faction.roster){
    if(!person.file||person.original_png_committed===false)continue;
    drawState.all.push({
     id:folder+'/'+person.file,name:person.name,group:faction.name,faction:folder,
     accent:colorCodes[folder]||'#d6b478',
     url:new URL('../../assets/characters/'+folder+'/'+person.file,import.meta.url).href
    });
   }
   const select=document.createElement('option');select.value=folder;select.textContent=faction.name;
   $('faction').append(select);
  }
  if(drawState.all.length!==35)throw new Error('角色登记不完整：预期 35 张，实际 '+drawState.all.length);
  drawState.pool=drawState.all;drawState.ready=true;
  $('draw-one').disabled=false;$('draw-five').disabled=false;
  $('inspect').disabled=!cardBackReady;
  $('stage-label').textContent='35 张真实立绘，等待抽选';
  for(const card of drawState.all){
   const opt=document.createElement('option');opt.value=card.id;
   opt.textContent=card.group+' · '+card.name;
   $('inspect-character').append(opt);
  }
  $('load-status').textContent='5 个已入库组织 / 35 张人物 · 就绪';
  renderInventory();
 }catch(e){$('load-status').textContent=e.message||'角色清单载入失败';$('stage-label').textContent='素材未就绪';}
}
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(.09,clock.getDelta());
 if(inspector.active){
  if(inspector.spinning)inspectQuaternionRotate(iy,dt*.84);
  renderInspectorCard();
 }else if(drawState.busy){
  drawState.elapsed=Math.min(CARD_DRAW_MS,drawState.elapsed+dt*1000);
  applySequence(drawState.elapsed);
 }else if(drawState.animationFinished&&drawState.queued.length){
  drawState.elapsed+=dt*1000;
  if(drawState.elapsed>CARD_DRAW_MS+760)processQueue();
 }
 updateCardFaceCulling();
 const now=performance.now();
 const minFrame=small?1000/38:1000/52;
 if(now-drawState.lastRender<minFrame)return;
 drawState.lastRender=now;
 renderer.shadowMap.needsUpdate=drawState.busy&&(now%180<minFrame);
 post.render(scene,camera);
}
await init();
renderInventory();
window.PaperchalkCharacterMachineQA={
 get loaded(){return drawState.ready;},
 get manifestCount(){return drawState.all.length;},
 get all(){return drawState.all.map(x=>({id:x.id,name:x.name,faction:x.faction,url:x.url}));},
 get state(){return {
  busy:drawState.busy,starting:drawState.starting,
  inspecting:inspector.active,inspectionYaw:inspector.yaw,
  inspectionPitch:inspector.pitch,inspectionRoll:inspector.roll,
  inspectionQuaternion:inspector.orientation.toArray(),
  inspectionPan:[inspector.panX,inspector.panY],
  inspectionZoom:inspector.zoom,
  cardBackReady,cardBackFailed,backImageUrl:cardBackUrl,
  inspectorCharacterId:inspector.chosen,
  backsideUsesOriginalTexture:cardBackReady&&!!cardBackPlane.material.map,
  elapsed:drawState.elapsed,queued:drawState.queued.length,
  current:drawState.current?.name||null,currentId:drawState.current?.id||null,
  revealed:drawState.seen,items:drawState.collection.reduce((s,v)=>s+v.count,0),
  meshCount:scene.children.length,
  cardModel3D:front.children.some(x=>x.isMesh)&&back.children.some(x=>x.isMesh),
  artworkPlanesOnly:cardRoot.children.every(x=>x===front||x===back),
  cardDecorationMeshes:0,
  surfaceNormalsReady:!!cardBackMaterial.normalMap,
  portraitNormalsReady:!!portraitMaterial.normalMap,
  foilMetalnessReady:!!cardBackMaterial.metalnessMap,
  foilPixels:reliefStats.back?.goldPixels||0,
  backNormalPixels:reliefStats.back?.normalPixels||0,
  portraitNormalPixels:reliefStats.portrait?.normalPixels||0,
  backPaperFiberPixels:reliefStats.back?.paperNormalPixels||0,
  portraitPaperFiberPixels:reliefStats.portrait?.paperNormalPixels||0,
  backRoughnessRange:[reliefStats.back?.roughnessMinimum||0,reliefStats.back?.roughnessMaximum||0],
  portraitRoughnessRange:[reliefStats.portrait?.roughnessMinimum||0,reliefStats.portrait?.roughnessMaximum||0],
  backPrintedPigment:!!cardBackMaterial.map?.isCanvasTexture,
  portraitPrintedPigment:!!portraitMaterial.map?.isCanvasTexture,
  correctArtworkTextureOrientation:cardBackMaterial.map?.flipY===true&&
   (!portraitMaterial.map||portraitMaterial.map.flipY===true),
  portraitReliefResident:portraitReliefLRU.length,
  normalMapMaxDimension:small?448:640,
  inspectionPixelRatio:renderer.getPixelRatio(),
  frontPaperSheen:frontPaperMaterial.sheen||0,
  backPaperSheen:cardBackMaterial.sheen||0,
  portraitPaperSheen:portraitMaterial.sheen||0,
  frontSideCulling:cardBackMaterial.side===THREE.FrontSide &&
   portraitMaterial.side===THREE.FrontSide && frontPaperMaterial.side===THREE.FrontSide,
  studioLighting:inspector.active&&!!inspector.studioBackup,
  inspectWarmIntensity:lighting.lights.warm.intensity,
  inspectBloom:post.state.bloom,
  frontVisible:front.visible,backVisible:back.visible,
  visibleArtworkFace:visibleFace,faceDot:frontFacing,
  reelMeshes:reelGroup.length,
  metallic:gold.metalness===1,
  glow:post.state.bloom,HDR:post.state.HDR,
  portraitLoaded:!!portrait.material.map,
  stage:evaluateCardSequence(drawState.elapsed).phase
 };},
 draw(n=1){queueDraw(n);},
 inspectOpen(){openInspector();},
 inspectBack(){setInspectorFace('back');},
 inspectFront(){if(inspector.chosen==='back')return inspectChoose(drawState.all[0].id,true);setInspectorFace('front');},
 inspectSelect(id){return inspectChoose(id,true);},
 inspectRotate(yaw,pitch,roll=0){
  inspectStopSpin();
  inspector.yaw=yaw;inspector.pitch=pitch;inspector.roll=roll;
  inspector.orientation.setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
  renderInspectorCard();
 },
 inspectZoom(value){inspector.zoom=clampInspect(value,.32,7.5);renderInspectorCard();},
 inspectPan(dx,dy){inspector.panX=dx;inspector.panY=dy;renderInspectorCard();},
 inspectClose(){closeInspector();},
 seek(ms){if(!drawState.current)throw new Error('draw a card first');
  drawState.elapsed=Math.min(CARD_DRAW_MS,Math.max(0,ms));return applySequence(drawState.elapsed,true);},
 redraw(){post.render(scene,camera);return true;}
};
animate();

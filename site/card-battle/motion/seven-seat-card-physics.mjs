/**
 * Real Three.js card-flight / paper physics for the SEVEN-SEAT table.
 * REUSES the finished slot dispenser: its actual texture, card-back surface
 * normals, original PBR lighting and 3D turn-over timing (not CSS fake cards).
 * Dynamic cards use semi-implicit Euler spring/impulse integration. This is an
 * arcade spring-body simulation, NOT a full rigid-body contact solver.
 */
import * as THREE from '../vendor/three.module.js';
import {installPayoutLighting} from './coin-payout-lighting.mjs';
import {evaluateCardSequence,smooth} from './character-card-sequence.mjs';
import {deriveCardRelief} from './card-image-relief.mjs';
import {roundedPaperEdgeGeometry,sanitizeCardMatte} from './card-physical-edge.mjs';
import {FastCoinPayout,FAST_DT} from './coin-payout-fast.mjs';
import {COIN} from './coin-payout-shared.mjs';
import {prepareExtrudedSprite,buildLowPolyPixelCoin3D} from './sprite-extrusion.mjs';
import {upgradeCoinMaterials} from './coin-payout-lighting.mjs';
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createSevenSeatCardMotion({backUrl,canvas}){
 let renderer,scene,camera,lighting,backMaterial,cardBackMap;
 let enabled=false,disabledReason='',prev=0,raf=0,plays=0;
 const flyers=new Set(),cachedFront=new Map();
 let coinPayout=null,coinMesh=null,coinReady=false,coinRunning=false,
   coinAcc=0,coinAge=0,coinProduced=0,coinInitError='';
 const coinDummy=new THREE.Object3D();
 const coinAxis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 // Original slot camera looked DOWN into the coin basin. The new card
 // table overlay looks straight at it, which made FACE-UP coins appear as
 // edge-on black sticks. Reorient the *rendered basin* toward this camera,
 // not the underlying 3D physics/collisions.
 const coinViewTilt=new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1,0,0),Math.PI*.36);
 const reduce=window.matchMedia('(prefers-reduced-motion:reduce)');
 const center=r=>r?{x:r.left+r.width*.5,y:r.top+r.height*.5,width:r.width,height:r.height}:
   {x:innerWidth/2,y:innerHeight/2,width:60,height:90};
 function makeTexture(image){
  const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,w,h);
  const src=g.getImageData(0,0,w,h);
  const clean=sanitizeCardMatte(src.data,w,h);
  const maps=deriveCardRelief(clean.pixels,w,h,'back');
  const cleanCanvas=document.createElement('canvas');
  cleanCanvas.width=w;cleanCanvas.height=h;
  const cleanCtx=cleanCanvas.getContext('2d');
  const cleanImg=cleanCtx.createImageData(w,h);
  cleanImg.data.set(clean.pixels);cleanCtx.putImageData(cleanImg,0,0);
  const texture=pixels=>{
   const cv=document.createElement('canvas');cv.width=w;cv.height=h;
   const ctx=cv.getContext('2d'),id=ctx.createImageData(w,h);
   id.data.set(pixels);ctx.putImageData(id,0,0);
   const t=new THREE.CanvasTexture(cv);
   t.colorSpace=THREE.NoColorSpace;t.anisotropy=3;return t;
  };
  const base=new THREE.CanvasTexture(cleanCanvas);base.colorSpace=THREE.SRGBColorSpace;
  base.minFilter=THREE.LinearMipmapLinearFilter;
  return {base,normal:texture(maps.normals),surface:texture(maps.surface)};
 }
 function createFace(url,label,kind){
  if(kind==='action'){
   const key='skill:'+label;
   if(cachedFront.has(key))return cachedFront.get(key);
   const cv=document.createElement('canvas');cv.width=288;cv.height=422;
   const ctx=cv.getContext('2d');
   const grad=ctx.createLinearGradient(0,0,0,422);
   grad.addColorStop(0,'#70444e');grad.addColorStop(.58,'#372a33');grad.addColorStop(1,'#211f28');
   ctx.fillStyle=grad;ctx.fillRect(0,0,288,422);
   ctx.lineWidth=3;ctx.strokeStyle='#c1a77b';
   ctx.strokeRect(14,14,260,394);ctx.strokeRect(21,21,246,380);
   ctx.fillStyle='#e7dbbf';ctx.textAlign='center';
   ctx.font='bold 28px sans-serif';ctx.fillText('专属行动牌',144,90);
   ctx.font='bold 52px sans-serif';ctx.fillText(label.slice(0,6),144,214);
   ctx.font='19px sans-serif';ctx.fillText('选择队友或敌人',144,288);
   const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
   cachedFront.set(key,tex);return tex;
  }
  const key=url;
  if(cachedFront.has(key))return cachedFront.get(key);
  const img=new Image();img.src=url;
  const tex=new THREE.Texture(img);tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=img.complete&&img.naturalWidth>0;
  img.addEventListener('load',()=>{tex.needsUpdate=true},{once:true});
  cachedFront.set(key,tex);return tex;
 }
 function init(){
  try{
   renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,
    powerPreference:'high-performance',premultipliedAlpha:false});
   renderer.setClearColor(0x000000,0);
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   scene=new THREE.Scene();
   const compact=innerWidth<720;
   // Exactly the old slot-machine studio environment (PMREM, key/fill,
   // warm / gold light), adjusted down to preserve original artwork color.
   lighting=installPayoutLighting(THREE,renderer,scene,{compact});
   lighting.lights.key.intensity=1.75;
   lighting.lights.fill.intensity=.65;
   lighting.lights.warm.intensity=1.0;
   lighting.lights.gold.intensity=1.6;
   lighting.lights.sky.intensity=.85;
   scene.fog=null;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=.94;
   camera=new THREE.OrthographicCamera(-innerWidth/2,innerWidth/2,
     innerHeight/2,-innerHeight/2,.01,2500);
   camera.position.z=1100;camera.lookAt(0,0,0);
   backMaterial=new THREE.MeshPhysicalMaterial({
    color:'#fefdfc',roughness:.76,metalness:0,
    sheen:.13,sheenRoughness:.93,specularIntensity:.28,
    side:THREE.FrontSide});
   const img=new Image();img.src=backUrl;
   img.addEventListener('load',()=>{
    try{
     const maps=makeTexture(img);
     cardBackMap=maps;
     backMaterial.map=maps.base;backMaterial.normalMap=maps.normal;
     backMaterial.metalness=1;backMaterial.metalnessMap=maps.surface;
     backMaterial.roughness=1;backMaterial.roughnessMap=maps.surface;
     backMaterial.needsUpdate=true;
    }catch(e){console.warn('Using unlit gold card back instead of derived PBR',e)}
   },{once:true});
   resize();enabled=true;
   prepareVictoryCoins().catch(console.warn);
   return true;
  }catch(e){disabledReason=String(e);console.warn('WebGL card animation fallback',e);return false}
 }
 function resize(){
  if(!renderer)return;
  camera.left=-innerWidth/2;camera.right=innerWidth/2;
  camera.top=innerHeight/2;camera.bottom=-innerHeight/2;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight,false);
 }
 function physicalCard(frontTexture){
  const node=new THREE.Group(),w=1.68,h=2.53,t=.017;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
   new THREE.MeshPhysicalMaterial({map:frontTexture,side:THREE.FrontSide,
    roughness:.88,metalness:0,sheen:.12,sheenRoughness:.95,specularIntensity:.27,
    transparent:true,alphaTest:.025}));
  face.position.z=t/2+.0003;node.add(face);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(w,h),backMaterial);
  back.rotation.y=Math.PI;back.position.z=-t/2-.0003;node.add(back);
  const geometryData=roundedPaperEdgeGeometry({
   width:w,height:h,thickness:t,radius:.075,segments:5});
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(geometryData.positions,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(geometryData.normals,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(geometryData.uvs,2));
  geo.setIndex(new THREE.BufferAttribute(geometryData.indices,1));
  const edge=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
   color:'#d6c5aa',metalness:0,roughness:.95,side:THREE.FrontSide}));
  node.add(edge);scene.add(node);
  return {node,face,edge};
 }
 function notifyGPU(){
  // The actual DOM artwork stays readable even if WebGL is unavailable.
  canvas.dataset.rendering='three-card-paper';
 }
 // Identical OLD 3D coin pipeline: pixel-art extrusion and original
 // spatial-hash FastCoinPayout dynamics. Keep only 36 active coin bodies.
 async function prepareVictoryCoins(){
  try{
   const source=new Image();
   source.src=new URL('../assets/slots-style-pixel-coin.svg',import.meta.url).href;
   await source.decode();
   const profile=prepareExtrudedSprite(source,{
    size:COIN.imageDiameter,pixelArt:true,outlineResolution:80,
    autoRemoveBackground:true,simplify:.35
   });
   const coinModel=buildLowPolyPixelCoin3D(profile,THREE,{
    sides:COIN.sides,thickness:COIN.visualThickness,
    edgeColor:0x10120e,pixelArt:true
   });
   const base=coinModel.children[0];
   const originalMaterials=upgradeCoinMaterials(THREE,base.material);
   for(const m of (Array.isArray(originalMaterials)?originalMaterials:[originalMaterials])){
    if(!m?.isMeshStandardMaterial)continue;
    m.envMapIntensity=Math.max(1.7,m.envMapIntensity||1);
    m.roughness=Math.min(.43,m.roughness);
    m.emissive=new THREE.Color('#69410e');
    m.emissiveIntensity=.20;
    m.needsUpdate=true;
   }
   coinMesh=new THREE.InstancedMesh(base.geometry,originalMaterials,40);
   coinMesh.name='old-slot-10-facet-real-3d-gold-win-burst';
   coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   coinMesh.count=0;coinMesh.frustumCulled=false;
   scene.add(coinMesh);coinReady=true;
  }catch(e){coinInitError=String(e);console.warn('Payout coin art unavailable',e)}
 }
 function drawCoinBodies(){
  if(!coinMesh||!coinPayout)return;
  coinMesh.count=coinPayout.coins.length;
  const scale=Math.min(88,Math.max(32,innerWidth/9.2));
  for(let i=0;i<coinPayout.coins.length;i++){
   const c=coinPayout.coins[i],p=c.position,q=c.quaternion;
   coinDummy.position.set((p.x+2.55)*scale,
    innerHeight*.07+p.y*scale,
    30+p.z*scale*.27);
   coinDummy.quaternion.set(q.x,q.y,q.z,q.w).multiply(coinAxis)
    .premultiply(coinViewTilt);
   coinDummy.scale.setScalar(COIN.scale*scale);
   coinDummy.updateMatrix();coinMesh.setMatrixAt(i,coinDummy.matrix);
  }
  coinMesh.instanceMatrix.needsUpdate=true;
 }
 function stepVictoryCoins(dt){
  if(!coinPayout)return;
  coinAge+=dt;coinAcc+=dt;let n=0;
  while(coinAcc>=FAST_DT&&n++<3){coinPayout.step();coinAcc-=FAST_DT}
  drawCoinBodies();
  if(coinAge>5.5){
   coinRunning=false;coinMesh.count=0;
   coinPayout.destroy();coinPayout=null;
  }
 }
 function victoryCoins(amount=36){
  if(!enabled||!coinReady)return false;
  if(coinPayout){coinPayout.destroy();coinPayout=null}
  coinPayout=new FastCoinPayout({seed:20261120,maxCoins:40});
  coinProduced=coinPayout.fire(limit(amount,1,40));
  coinRunning=true;coinAcc=0;coinAge=0;
  canvas.dataset.active='true';
  if(!raf){prev=0;raf=requestAnimationFrame(run)}
  return true;
 }
 function run(now){
  raf=0;if((!flyers.size&&!coinRunning)||!enabled)return;
  const dt=Math.min(.033,Math.max(.001,(now-(prev||now-16))/1000));
  prev=now;
  for(const flyer of [...flyers]){
   flyer.age+=dt;
   // Same independent velocity + settling angular inertia architecture as
   // the slot coin bodies; numerically integrated, never CSS tween-only.
   const body=flyer.body;
   const k=145,d=17;
   body.vx+=((flyer.target.x-body.x)*k-body.vx*d)*dt;
   body.vy+=((flyer.target.y-body.y)*k-body.vy*d+200)*dt;
   body.x+=body.vx*dt;body.y+=body.vy*dt;
   const boundaryY=flyer.target.y+4;
   if(body.y>boundaryY&&body.vy>20){
    body.y=boundaryY;body.vy=-body.vy*.30;
    if(!flyer.hit){flyer.hit=true;flyer.onLand?.();}
   }
   const torque=-body.spin*88-body.spinVelocity*15;
   body.spinVelocity+=torque*dt;
   body.spin+=body.spinVelocity*dt;
   // Reuse the ORIGINAL slot's 2350–2990 ms three-axis reveal beat.
   const reveal=smooth(limit((flyer.age-.12)/.62,0,1));
   const slotBeat=evaluateCardSequence(2350+reveal*640);
   const yaw=flyer.flip?slotBeat.card.rotationY:0;
   const node=flyer.model.node;
   node.position.set(body.x-innerWidth/2,innerHeight/2-body.y,35);
   node.rotation.set(.09*Math.sin(flyer.age*8)*Math.exp(-flyer.age*3),
    yaw,body.spin);
   const size=flyer.size;
   const fit=Math.min(size.width/1.68,size.height/2.53);
   node.scale.setScalar(fit*(.91+.09*reveal));
   const elapsed=flyer.age;
   if((elapsed>.74&&Math.hypot(body.x-flyer.target.x,body.y-flyer.target.y)<5&&
    Math.hypot(body.vx,body.vy)<32)||elapsed>1.65){
    scene.remove(node);
    flyer.model.face.geometry.dispose();
    flyer.model.face.material.dispose();
    flyer.model.edge.geometry.dispose();
    flyer.model.edge.material.dispose();
    flyers.delete(flyer);
    flyer.onFinish?.();
   }
  }
  if(coinRunning)stepVictoryCoins(dt);
  renderer.render(scene,camera);
  if(flyers.size||coinRunning)raf=requestAnimationFrame(run);
  else{
   renderer.clear();
   canvas.dataset.active='false';
  }
 }
 function fly({from,to,frontUrl='',label='',kind='hero',onLand,onFinish}={}){
  if(reduce.matches||!enabled){
   onLand?.();onFinish?.();return false;
  }
  const fromC=center(from),toC=center(to);
  const tex=createFace(frontUrl,label,kind==='action'?'action':'hero');
  const model=physicalCard(tex);
  const dx=toC.x-fromC.x,dy=toC.y-fromC.y;
  const flyer={model,kind,size:{
    width:limit(toC.width*.95,32,126),height:limit(toC.height*.95,45,182)
   },target:toC,flip:true,age:0,hit:false,
    body:{x:fromC.x,y:fromC.y,vx:dx*.30+(dx<0?-65:65),
      vy:dy*.13-320,spin:(dx<0?-.16:.16),spinVelocity:(dx<0?-3.3:3.3)},
    onLand,onFinish};
  flyers.add(flyer);plays++;canvas.dataset.active='true';notifyGPU();
  if(!raf){prev=0;raf=requestAnimationFrame(run);}
  return true;
 }
 function stop(){
  if(raf)cancelAnimationFrame(raf);raf=0;
  coinRunning=false;coinAcc=0;coinAge=0;
  if(coinPayout){coinPayout.destroy();coinPayout=null}
  if(coinMesh)coinMesh.count=0;
  for(const f of flyers){scene.remove(f.model.node);f.onFinish?.();}
  flyers.clear();renderer?.clear();canvas.dataset.active='false';
 }
 function destroy(){
  stop();lighting?.dispose();backMaterial?.dispose();
  if(cardBackMap)Object.values(cardBackMap).forEach(t=>t?.dispose());
  [...cachedFront.values()].forEach(t=>t?.dispose());cachedFront.clear();
  renderer?.dispose();
 }
 init();
 addEventListener('resize',resize,{passive:true});
 return {fly,payout:victoryCoins,stop,destroy,get state(){return {
  enabled,disabledReason,active:flyers.size,cardFlights:plays,
  legacyLighting:!!lighting,legacyRevealTiming:typeof evaluateCardSequence==='function',
  physicalIntegrator:'semi-implicit-euler-spring-impulse',
  realCardGeometry:enabled,pbrBackReady:!!cardBackMap,
  reusedSlotCoinPhysics:true,coinSpriteReady:coinReady,
  coinFaceFacingCamera:true,coinViewCameraTiltRadians:Math.PI*.36,
  coinArtworkError:coinInitError,coinActive:coinRunning,
  actualCoinBodies:coinPayout?.coins.length||0,
  coinPayoutEmitted:coinProduced,coinPhysicsModel:coinPayout?.physicsModel||'3D spatial-hash oriented-disc separation (non-SAT)'
 }}};
}

/**
 * Real Three.js card-flight / paper physics for the SEVEN-SEAT table.
 * REUSES the finished slot dispenser: its actual texture, card-back surface
 * normals, original PBR lighting and 3D turn-over timing (not CSS fake cards).
 * Dynamic cards use semi-implicit Euler spring/impulse integration. This is an
 * arcade spring-body simulation, NOT a full rigid-body contact solver.
 */
import * as THREE from '../vendor/three.module.js';
import {installPayoutLighting} from './coin-payout-lighting.mjs';
import {sampleTableCard,tableFlightPoint,springTo,TABLE_CARD_TIMING} from './seven-seat-card-kinetics.mjs';
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
   const cv=document.createElement('canvas');cv.width=336;cv.height=486;
   const ctx=cv.getContext('2d'),im=ctx.createImageData(336,486);
   // Aged INK on cotton paper, not a plastic plum box or a fake metal rim.
   // Warm parchment comes from observed Black Jacket card color hierarchy;
   // artwork/typography are original and not traced/copied from reference.
   for(let y=0;y<486;y++)for(let x=0;x<336;x++){
    const i=(y*336+x)*4;
    const border=Math.min(x,335-x,y,485-y);
    const wear=Math.pow(Math.max(0,1-border/35),2);
    const weave=Math.sin(y*.77+x*.035)*3.6+
      Math.sin(x*.59-y*.055)*2.9;
    const fleck=Math.sin(x*12.333+y*9.71)*Math.cos(x*5.21-y*14.99)*6.6;
    const stains=Math.sin(x*.067+y*.019)*5.2+
      Math.cos(y*.088-x*.025)*3.8;
    const r=232+weave+fleck+stains-wear*65;
    const g=201+weave+fleck*.75+stains*.7-wear*69;
    const b=153+weave+fleck*.6+stains*.52-wear*61;
    im.data[i]=Math.max(0,Math.min(255,r));
    im.data[i+1]=Math.max(0,Math.min(255,g));
    im.data[i+2]=Math.max(0,Math.min(255,b));im.data[i+3]=255;
   }
   ctx.putImageData(im,0,0);
   ctx.strokeStyle='#63402a';ctx.lineWidth=3.5;
   ctx.strokeRect(11,11,314,464);
   ctx.strokeStyle='rgba(110,69,37,.45)';ctx.lineWidth=1;
   ctx.strokeRect(20,20,296,446);
   ctx.strokeStyle='rgba(85,46,30,.42)';
   ctx.beginPath();ctx.moveTo(41,100);ctx.lineTo(295,100);
   ctx.moveTo(41,376);ctx.lineTo(295,376);ctx.stroke();
   ctx.fillStyle='#372320';ctx.textAlign='center';
   ctx.font='bold 24px serif';ctx.fillText('专属行动',168,75);
   const mark=label.includes('恢复')?'✚':label.includes('盾')||label.includes('架势')?'✦':
    label.includes('强')||label.includes('突')?'⚔':'◆';
   ctx.globalAlpha=.12;ctx.font='188px serif';ctx.fillText(mark,168,286);
   ctx.globalAlpha=1;
   ctx.font='bold 49px serif';ctx.fillText(label.slice(0,6),168,258);
   ctx.font='21px serif';ctx.fillText('可对敌我双方施放',168,413);
   ctx.strokeStyle='rgba(255,234,180,.56)';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(15,10);ctx.lineTo(320,10);ctx.stroke();
   const tex=new THREE.CanvasTexture(cv);
   tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=3;
   tex.minFilter=THREE.LinearMipmapLinearFilter;
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
   prepareCardMaterials();
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
 // Small laminated-paper normal map: printed color stays untouched,
 // surface fibers modulate reflection rather than adding a plastic overlay.
 function paperMicroTexture(){
  const w=128,h=128,c=document.createElement('canvas');
  c.width=w;c.height=h;const g=c.getContext('2d'),im=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,
    fiber=Math.sin(x*1.68+y*.13)*5+Math.cos(y*.73+x*.04)*4,
    fleck=(Math.sin(x*21.31+y*13.1)*Math.cos(y*7.77-x*9.13))*5;
   im.data[i]=128+fiber+fleck;im.data[i+1]=128-fiber*.65+fleck;
   im.data[i+2]=251;im.data[i+3]=255;
  }
  g.putImageData(im,0,0);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.NoColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(3.5,5.2);tex.anisotropy=2;return tex;
 }
 let microNormal=null,frontStockMaterial=null,shadowTexture=null;
 function prepareCardMaterials(){
  microNormal=paperMicroTexture();
  const cv=document.createElement('canvas');cv.width=128;cv.height=192;
  const g=cv.getContext('2d'),pixels=g.createImageData(128,192);
  for(let y=0;y<192;y++)for(let x=0;x<128;x++){
   const i=(y*128+x)*4,rx=(x-64)/64,ry=(y-96)/96;
   const glow=Math.max(0,1-(rx*rx*.8+ry*ry*.7));
   const fiber=Math.sin(x*.63+y*.14)*2.5+Math.sin(y*.88-x*.06)*2.1;
   pixels.data[i]=90+glow*45+fiber;
   pixels.data[i+1]=48+glow*40+fiber;
   pixels.data[i+2]=57+glow*30+fiber;
   pixels.data[i+3]=255;
  }
  g.putImageData(pixels,0,0);
  const color=new THREE.CanvasTexture(cv);color.colorSpace=THREE.SRGBColorSpace;
  frontStockMaterial=new THREE.MeshPhysicalMaterial({
   color:'#ffffff',map:color,roughness:.93,metalness:0,
   normalMap:microNormal,normalScale:new THREE.Vector2(.12,.12),
   sheen:.16,sheenRoughness:.92,sheenColor:'#d4b7a7',
   specularIntensity:.22,envMapIntensity:.26,side:THREE.FrontSide
  });
  const sh=document.createElement('canvas');sh.width=64;sh.height=64;
  const q=sh.getContext('2d'),gr=q.createRadialGradient(32,32,4,32,32,31);
  gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(.6,'rgba(0,0,0,.28)');
  gr.addColorStop(1,'rgba(0,0,0,0)');
  q.fillStyle=gr;q.fillRect(0,0,64,64);
  shadowTexture=new THREE.CanvasTexture(sh);
 }
 function physicalCard(frontTexture){
  const node=new THREE.Group(),w=1.68,h=2.53,t=.017;
  const paper=new THREE.Mesh(new THREE.PlaneGeometry(w,h),frontStockMaterial);
  paper.position.z=t/2+.0002;node.add(paper);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
   new THREE.MeshPhysicalMaterial({map:frontTexture,side:THREE.FrontSide,
    roughness:.93,metalness:0,sheen:.16,sheenRoughness:.96,
    sheenColor:'#d3bdb1',specularIntensity:.20,envMapIntensity:.3,
    normalMap:microNormal,normalScale:new THREE.Vector2(.12,.12),
    transparent:true,depthWrite:false,alphaTest:.028}));
  face.position.z=t/2+.001;node.add(face);
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
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w*1.26,h*1.26),
   new THREE.MeshBasicMaterial({map:shadowTexture,color:'#10120f',
    transparent:true,opacity:.28,depthWrite:false,side:THREE.FrontSide}));
  scene.add(shadow);
  return {node,face,edge,shadow,paper,back};
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
  if(!raf){prev=0;raf=requestAnimationFrame(renderFrame)}
  return true;
 }
 function renderFrame(now){
  raf=0;if((!flyers.size&&!coinRunning)||!enabled)return;
  const dt=Math.min(.026,Math.max(.001,(now-(prev||now-16))/1000));
  prev=now;
  for(const flyer of [...flyers]){
   flyer.age+=dt;
   const beat=sampleTableCard(flyer.age*1000,flyer.kind,flyer.direction);
   const point=tableFlightPoint(flyer.from,flyer.target,beat);
   const body=flyer.body;
   // Physics follows an authored short blackjack deal, rather than
   // using a wandering projectile and waiting 1.65s for spring to settle.
   const x=springTo(body.x,body.vx,point.x,dt,38,.94);
   const y=springTo(body.y,body.vy,point.y,dt,38,.94);
   body.x=x.position;body.vx=x.velocity;
   body.y=y.position;body.vy=y.velocity;
   if(beat.complete){
    body.x=flyer.target.x;body.y=flyer.target.y;
   }
   const node=flyer.model.node;
   node.position.set(body.x-innerWidth*.5,innerHeight*.5-body.y,36+beat.lift*13);
   node.rotation.set(beat.pitch,beat.yaw,beat.roll);
   node.scale.setScalar(flyer.fit*beat.scale);
   const shadow=flyer.model.shadow;
   shadow.position.set(body.x-innerWidth*.5,innerHeight*.5-(body.y+beat.lift*5),25);
   shadow.scale.set(flyer.fit*1.73*(1+beat.lift*.32),
    flyer.fit*2.6*(1+beat.lift*.19),1);
   shadow.material.opacity=.32-beat.lift*.19;
   flyer.model.face.material.envMapIntensity=.28+beat.intensity*.30;
   if(!flyer.hit && beat.t>=.90){
    flyer.hit=true;flyer.onLand?.();
   }
   if(flyer.age*1000>beat.duration+95){
    if(!flyer.hit){flyer.hit=true;flyer.onLand?.();}
    scene.remove(node);scene.remove(shadow);
    flyer.model.face.geometry.dispose();flyer.model.face.material.dispose();
    flyer.model.edge.geometry.dispose();flyer.model.edge.material.dispose();
    flyer.model.paper.geometry.dispose();flyer.model.back.geometry.dispose();
    flyer.model.shadow.geometry.dispose();flyer.model.shadow.material.dispose();
    flyers.delete(flyer);flyer.onFinish?.();
   }
  }
  if(coinRunning)stepVictoryCoins(dt);
  renderer.render(scene,camera);
  if(flyers.size||coinRunning)raf=requestAnimationFrame(renderFrame);
  else{renderer.clear();canvas.dataset.active='false';}
 }
 function fly({from,to,frontUrl='',label='',kind='deploy',onLand,onFinish}={}){
  if(reduce.matches||!enabled){onLand?.();onFinish?.();return false;}
  const fromC=center(from),toC=center(to);
  // Real image materials and micro-rough paper are loaded once per art.
  const tex=createFace(frontUrl,label,kind==='draw'||kind==='action'||kind==='enemy'?'action':'hero');
  const model=physicalCard(tex);
  const direction=Math.sign(toC.x-fromC.x)||1;
  const width=limit(toC.width*.96,32,130),height=limit(toC.height*.96,45,183);
  const flyer={model,kind,from:fromC,target:toC,direction,age:0,hit:false,
   fit:Math.min(width/1.68,height/2.53),
   body:{x:fromC.x,y:fromC.y,vx:0,vy:0},
   onLand,onFinish};
  // The final destination is already in the DOM. The REAL 3D card takes
  // its place for the brief deal; do not show two duplicate face images.
  flyers.add(flyer);plays++;canvas.dataset.active='true';notifyGPU();
  if(!raf){prev=0;raf=requestAnimationFrame(renderFrame);}
  return true;
 }
 function stop(){
  if(raf)cancelAnimationFrame(raf);raf=0;
  coinRunning=false;coinAcc=0;coinAge=0;
  if(coinPayout){coinPayout.destroy();coinPayout=null}
  if(coinMesh)coinMesh.count=0;
  for(const f of flyers){
   scene.remove(f.model.node);scene.remove(f.model.shadow);
   f.model.face.geometry.dispose();f.model.face.material.dispose();
   f.model.edge.geometry.dispose();f.model.edge.material.dispose();
   f.model.paper.geometry.dispose();f.model.back.geometry.dispose();
   f.model.shadow.geometry.dispose();f.model.shadow.material.dispose();
   f.onFinish?.();
  }
  flyers.clear();renderer?.clear();canvas.dataset.active='false';
 }
 function destroy(){
  stop();lighting?.dispose();backMaterial?.dispose();
  if(cardBackMap)Object.values(cardBackMap).forEach(t=>t?.dispose());
  [...cachedFront.values()].forEach(t=>t?.dispose());cachedFront.clear();
  microNormal?.dispose();shadowTexture?.dispose();
  frontStockMaterial?.map?.dispose();frontStockMaterial?.dispose();
  renderer?.dispose();
 }
 init();
 addEventListener('resize',resize,{passive:true});
 return {fly,payout:victoryCoins,stop,destroy,get state(){return {
  enabled,disabledReason,active:flyers.size,cardFlights:plays,
  legacyLighting:!!lighting,legacyRevealTiming:true,
  tableMotionTimings:TABLE_CARD_TIMING,
  explicitLandingFeedback:true,
  tableFlightProfile:'Black Jacket-style brisk lift/slide/reveal/seat impact, original authored timing',
  physicalIntegrator:'semi-implicit-euler-spring-impulse',
  realCardGeometry:enabled,pbrBackReady:!!cardBackMap,
  reusedSlotCoinPhysics:true,coinSpriteReady:coinReady,
  coinFaceFacingCamera:true,coinViewCameraTiltRadians:Math.PI*.36,
  coinArtworkError:coinInitError,coinActive:coinRunning,
  actualCoinBodies:coinPayout?.coins.length||0,
  coinPayoutEmitted:coinProduced,coinPhysicsModel:coinPayout?.physicsModel||'3D spatial-hash oriented-disc separation (non-SAT)'
 }}};
}

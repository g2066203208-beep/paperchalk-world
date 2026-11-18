import * as THREE from '../vendor/three.module.js';
import {prepareExtrudedSprite,buildLowPolyPixelCoin3D} from './sprite-extrusion.mjs';
import {COIN,CAPS,BASIN} from './coin-payout-shared.mjs';
import {FastCoinPayout,FAST_DT} from './coin-payout-fast.mjs';
import {installPayoutLighting,createPayoutMaterialFactory,upgradeCoinMaterials,createPayoutBloom} from './coin-payout-lighting.mjs?v=heavy-fast-gold-20261118';

const $=id=>document.getElementById(id);
const canvas=$('payout-view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,window.innerWidth<700?.78:.92));
renderer.outputColorSpace=THREE.SRGBColorSpace;
// HDR bloom pipeline performs ONE scene-linear bloom composite and filmic output.
renderer.setClearColor('#181e20',1);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#181e20');
const compact=window.innerWidth<700;
const lighting=installPayoutLighting(THREE,renderer,scene,{compact});
// Coin physics is already CPU-intensive; do NOT rebuild moving-coin shadows
// on every display frame. Retain real Shadows and update at a perceptual cadence.
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
const materials=createPayoutMaterialFactory(THREE);
const post=createPayoutBloom(THREE,renderer,{compact});
const camera=new THREE.OrthographicCamera(-8,8,5,-5,.05,140);
const dummy=new THREE.Object3D(),axisCorrection=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
let payout=new FastCoinPayout({seed:20261118}),instance=null,sourceModel=null;
let viewMode='scene',playing=true,speed=1,last=0,acc=0,spinPreview=false;
let renderQuality='smooth',lastDraw=0,lastShadow=0,lastStats=0;
let displayFrames=0,displayFps=0,displayWindowStart=0;
const meter=$('meter'),coinCounter=$('coin-count'),hitCounter=$('hit-count'),sleepCounter=$('sleep-count');
const colors={table:'#313d41',tableEdge:'#1c292f',metal:'#7f8b7e',dark:'#253438',recess:'#121c20'};
function material(color){return materials.material(color);}
function makeBox(center,size,color,parent=scene){
 const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));o.position.set(...center);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function makeEnvironment(){
 // Coins must exit machine chute INTO the physically modelled basin, never
 // beyond the stage or onto an imaginary unbounded flat table.
 makeBox([-2.53,-.16,0],[6.75,.32,3.94],'#373e40');
 makeBox([-2.53,-.33,0],[6.81,.035,4.00],'#22292b');
 // Exact coordinates as physical collision boxes; user can see every wall.
 makeBox([BASIN.left-.115,BASIN.wallTop*.5,0],[.23,BASIN.wallTop,4.20],'#556063');
 makeBox([BASIN.right+.10,BASIN.wallTop*.5,0],[.20,BASIN.wallTop,4.20],'#28343a');
 // Tall rear wall and actual open-basin front wall; translucent panels keep
 // the pile visible while still depicting genuine physical containment.
 const rear=makeBox([-2.53,BASIN.wallTop*.5,BASIN.back-.105],[6.80,BASIN.wallTop,.21],'#414f51');
 const front=makeBox([-2.53,BASIN.wallTop*.5,BASIN.front+.105],[6.80,BASIN.wallTop,.21],'#414f51');
 // A separate material: changing front glass opacity MUST NOT alter the rear wall.
 front.material=front.material.clone();
 front.material.transparent=true;front.material.opacity=.25;front.material.depthWrite=false;
 front.castShadow=false;front.renderOrder=3;
 // Visible physical inner fillets that guide the high-speed stream inward.
 makeBox([-5.51,.12,0],[.38,.24,3.76],'#59625d');
 makeBox([-2.52,.12,-1.68],[6.24,.24,.34],'#59625d');
 makeBox([-2.52,.12,1.68],[6.24,.24,.34],'#59625d');
 // Top rails trace the rim so the mouth of the real 3D coin bowl is legible.
 makeBox([-2.53,BASIN.wallTop+.025,BASIN.back-.105],[6.80,.05,.25],'#a09d7f');
 makeBox([-2.53,BASIN.wallTop+.025,BASIN.front+.105],[6.80,.05,.25],'#a09d7f');
 makeBox([BASIN.left-.115,BASIN.wallTop+.025,0],[.27,.05,4.25],'#a09d7f');
 const unit=new THREE.Group();scene.add(unit);
 makeBox([2.85,1.24,0],[4.15,2.5,4.3],'#263638',unit);
 makeBox([.79,1.14,0],[.15,2.25,4.13],'#384549',unit);
 makeBox([2.85,2.49,0],[4.35,.18,4.40],'#66746b',unit);
 makeBox([2.85,.15,0],[4.35,.18,4.40],'#182528',unit);
 makeBox([3.15,1.62,2.155],[2.8,1.32,.07],'#121c21',unit);
 const reelSymbols=['⚔','◇','✦'];
 for(let i=0;i<3;i++){
   const x=2.25+i*.86;
   makeBox([x,1.7,2.202],[.7,.91,.03],'#9da98c',unit);
   const tex=document.createElement('canvas');tex.width=64;tex.height=64;
   const g=tex.getContext('2d');g.fillStyle='#b9bd96';g.fillRect(0,0,64,64);
   g.fillStyle='#253332';g.font='bold 42px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(reelSymbols[i],32,32);
   const texture=new THREE.CanvasTexture(tex);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
   const face=new THREE.Mesh(new THREE.PlaneGeometry(.64,.85),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
   face.position.set(x,1.7,2.226);unit.add(face);
 }
 // Dark outlet aligned with the actual physical emission XYZ at .39,1.22,0.
 makeBox([.59,BASIN.chute[1],0],[.13,.34,.75],'#090e11',unit);
 makeBox([.58,BASIN.chute[1]+.19,0],[.15,.035,.82],'#c4ba84',unit);
 makeBox([.58,BASIN.chute[1]-.19,0],[.15,.035,.82],'#c4ba84',unit);
 makeBox([2.88,2.5,2.29],[3.0,.22,.05],'#ab9a65',unit);
 // Small overbright geometric highlights create actual HDR bloom only at lit metal.
 // Emissive strips stay tight to the actual machine, no fullscreen fake halo.
 const luminousColor=new THREE.Color().setRGB(4.9,2.20,.53);
 const luminousMat=new THREE.MeshBasicMaterial({color:luminousColor,toneMapped:false});
 function thinGlow(p,size,parent=unit){
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),luminousMat);
  m.position.set(...p);m.castShadow=false;parent.add(m);return m;
 }
 thinGlow([2.88,2.62,2.29],[2.58,.027,.022]);
 thinGlow([.578,BASIN.chute[1]+.196,0],[.026,.031,.80]);
 thinGlow([.578,BASIN.chute[1]-.196,0],[.026,.031,.80]);
 const basinHighlight=new THREE.Mesh(new THREE.BoxGeometry(5.65,.024,.03),luminousMat);
 basinHighlight.position.set(-2.53,BASIN.wallTop+.062,BASIN.back-.105);
 scene.add(basinHighlight);
}
makeEnvironment();
// Sparks are a few REAL contact locations in the rigid-body world, not a spray of fake coins.
const maxContactGlints=20;
const glintCoordinates=new Float32Array(maxContactGlints*3);
const glintGeometry=new THREE.BufferGeometry();
glintGeometry.setAttribute('position',new THREE.BufferAttribute(glintCoordinates,3));
glintGeometry.setDrawRange(0,0);
const glintMaterial=new THREE.PointsMaterial({
 color:new THREE.Color().setRGB(5.5,2.35,.62),
 size:4.2,sizeAttenuation:false,transparent:true,opacity:.78,
 blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false
});
const glints=new THREE.Points(glintGeometry,glintMaterial);glints.frustumCulled=false;scene.add(glints);
function updateContactGlints(){
 const collisions=payout.world.contacts;let n=0;
 for(let i=0;i<collisions.length && n<maxContactGlints;i+=5){
  const ct=collisions[i],b=ct.bi;
  if(!b||b.mass<=0)continue;
  if(b.velocity.length()<2.3)continue;
  const p=b.position,r=ct.ri;
  glintCoordinates[n*3]=p.x+(r?.x||0);
  glintCoordinates[n*3+1]=p.y+(r?.y||0);
  glintCoordinates[n*3+2]=p.z+(r?.z||0)+.03;
  n++;
 }
 glintGeometry.setDrawRange(0,n);
 glintGeometry.attributes.position.needsUpdate=true;
}
const isPhone=()=>window.innerWidth<700;
function setCamera(mode=viewMode){
 viewMode=mode;
 const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),aspect=w/h;
 let target,x,y,z,width;
 if(mode==='side') {target=new THREE.Vector3(-2.4,.72,0);x=-2.4;y=1.5;z=15;width=isPhone()?7.3:12.5;}
 else if(mode==='pile') {target=new THREE.Vector3(-3.28,.80,0);x=-2.4;y=5.2;z=7.6;width=isPhone()?6.0:8.1;}
 else {target=new THREE.Vector3(-.35,1.0,0);x=2.1;y=6.9;z=12.8;width=isPhone()?7.6:13.3;}
 const visibleHeight=width/aspect;
 camera.left=-width/2;camera.right=width/2;camera.top=visibleHeight/2;camera.bottom=-visibleHeight/2;
 camera.position.set(x,y,z);camera.lookAt(target);camera.updateProjectionMatrix();
 for(const n of ['scene','pile','side'])$(n).setAttribute('aria-pressed',String(n===mode));
}
function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
 renderer.setSize(w,h,false);post.resize();setCamera(viewMode);}
addEventListener('resize',resize);
new ResizeObserver(resize).observe(canvas);
if(isPhone())viewMode='pile';
resize();

async function loadCoinModel(){
 const image=new Image();image.decoding='async';
 image.src='./assets/slots-style-pixel-coin.svg?v=real-low-poly-coin';
 await image.decode();
 const profile=prepareExtrudedSprite(image,{size:COIN.imageDiameter,pixelArt:true,outlineResolution:80,
   autoRemoveBackground:true,simplify:.35});
 sourceModel=buildLowPolyPixelCoin3D(profile,THREE,{sides:COIN.sides,
   thickness:COIN.visualThickness,edgeColor:0x10120e,pixelArt:true});
 const base=sourceModel.children[0];
 instance=new THREE.InstancedMesh(base.geometry,upgradeCoinMaterials(THREE,base.material),CAPS.max);
 instance.castShadow=true;instance.receiveShadow=true; // coin-on-coin light occlusion in real pile
 instance.name='physical-10-facet-pixel-coin-instances';
 instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 instance.count=0;instance.frustumCulled=false;
 scene.add(instance);
 $('status').textContent='10 边加厚金币 · 空间分区 3D 快速碰撞 · 零外溢';
 return instance;
}
function updateCoins(){if(!instance)return;
 instance.count=payout.coins.length;
 for(let i=0;i<payout.coins.length;i++){
   const b=payout.coins[i],p=b.position,q=b.quaternion;
   dummy.position.set(p.x,p.y,p.z);
   dummy.quaternion.set(q.x,q.y,q.z,q.w).multiply(axisCorrection);
   dummy.scale.setScalar(COIN.scale);
   dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);
 }
 instance.instanceMatrix.needsUpdate=true;
}
function updateStats(force=false){
 const now=performance.now();
 if(!force&&now-lastStats<135)return;
 lastStats=now;
 const s=payout.getSnapshot();
 coinCounter.textContent=`${s.count} / ${CAPS.max}`;
 hitCounter.textContent=s.contacts.toLocaleString('en-US');
 sleepCounter.textContent=String(s.asleep);
 meter.textContent=`盆内 ${s.inBasin}/${s.count} · 出币 ${s.emitted}/${s.target} · ${s.time.toFixed(2)}s · ${displayFps}FPS`;
 window.__coinPayoutLastSnapshot=s;
}
function redraw(force=false){updateCoins();updateContactGlints();updateStats(force);post.render(scene,camera);}
function reset(){payout.destroy();payout=new FastCoinPayout({seed:20261118});acc=0;playing=false;renderer.shadowMap.needsUpdate=true;
 $('pause').textContent='▶ 继续';redraw();}
function fire(count){if(!instance)return 0;
 const n=payout.fire(count);playing=true;$('pause').textContent='Ⅱ 暂停';return n;}
for(const count of [120,240,420])$(String(count)).addEventListener('click',()=>fire(count));
$('reset').addEventListener('click',reset);
$('pause').addEventListener('click',()=>{playing=!playing;$('pause').textContent=playing?'Ⅱ 暂停':'▶ 继续';});
$('frame').addEventListener('click',()=>{playing=false;$('pause').textContent='▶ 继续';payout.step();redraw();});
$('slow').addEventListener('click',()=>{speed=speed===1?.25:1;$('slow').textContent=speed===1?'¼ 慢速':'正常速度';});
for(const mode of ['scene','pile','side'])$(mode).addEventListener('click',()=>{setCamera(mode);redraw(true);});
function setRenderQuality(mode){
 renderQuality=mode==='quality'?'quality':'smooth';
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,
  renderQuality==='quality'?(compact?1.0:1.20):(compact?.78:.92)));
 const shadow=lighting.lights.key.shadow;
 const shadowSize=renderQuality==='quality'?(compact?512:1024):(compact?256:512);
 if(shadow.mapSize.x!==shadowSize){
  shadow.map?.dispose();shadow.map=null;
  shadow.mapSize.set(shadowSize,shadowSize);
 }
 post.setQuality(renderQuality);
 renderer.shadowMap.needsUpdate=true;
 resize();
 $('perf-smooth')?.setAttribute('aria-pressed',String(renderQuality==='smooth'));
 $('perf-quality')?.setAttribute('aria-pressed',String(renderQuality==='quality'));
 redraw(true);
}
$('perf-smooth')?.addEventListener('click',()=>setRenderQuality('smooth'));
$('perf-quality')?.addEventListener('click',()=>setRenderQuality('quality'));
let renderLook='filmic',pixelArtMode=false;
function setRenderLook(mode){
 renderLook=mode;
 if(mode==='off'){post.setBloom(0);post.setExposure(.96);}
 else if(mode==='strong'){post.setBloom(1.90);post.setThreshold(1.05);post.setExposure(.94);}
 else {post.setBloom(1.22);post.setThreshold(1.15);post.setExposure(.95);}
 for(const key of ['filmic','strong','off'])$(key)?.setAttribute('aria-pressed',String(key===mode));
 redraw();
}
for(const key of ['filmic','strong','off'])$(key)?.addEventListener('click',()=>setRenderLook(key));
$('pixel-render')?.addEventListener('click',()=>{
 pixelArtMode=!pixelArtMode;post.setPixelMode(pixelArtMode);
 $('pixel-render').setAttribute('aria-pressed',String(pixelArtMode));redraw();
});
// Optional drag to see 3D without corrupting physics bodies' XYZ transforms.
let down=null;
canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!down)return;
 const dx=e.clientX-down[0],dy=e.clientY-down[1];down=[e.clientX,e.clientY];
 const focus=new THREE.Vector3(-2.8,.8,0),offset=camera.position.clone().sub(focus);
 offset.applyAxisAngle(new THREE.Vector3(0,1,0),-dx*.0033);
 offset.applyAxisAngle(new THREE.Vector3(1,0,0),dy*.001);
 camera.position.copy(focus).add(offset);camera.lookAt(focus);
});
canvas.addEventListener('pointerup',()=>down=null);
canvas.addEventListener('pointercancel',()=>down=null);
function animate(t){
 const dt=Math.min(.050,Math.max(0,(t-last)/1000));last=t;
 if(playing){
  acc+=dt*speed;let steps=0;
  // Don't accumulate unbounded physics debt when the device slows down.
  while(acc>=FAST_DT&&steps<4){payout.step();acc-=FAST_DT;steps++;}
  if(steps===4)acc=Math.min(acc,FAST_DT*1.1);
 }
 const targetFrameMs=renderQuality==='smooth'?(compact?1000/42:1000/55):0;
 if(targetFrameMs===0||t-lastDraw>=targetFrameMs){
  // Real light/shadow mapping is refreshed ~8Hz smooth / every frame quality.
  if(renderQuality==='quality'||t-lastShadow>(compact?175:125)){
   renderer.shadowMap.needsUpdate=true;lastShadow=t;
  }
  redraw();lastDraw=t;
  displayFrames++;
  if(t-displayWindowStart>=1000){
   displayFps=Math.round(displayFrames*1000/(t-displayWindowStart));
   displayFrames=0;displayWindowStart=t;
  }
 }
 requestAnimationFrame(animate);
}
await loadCoinModel();
window.PaperchalkPayoutQA={
 get loaded(){return !!instance;},
 get world(){return payout.world;},
 get coins(){return payout.coins;},
 fire,reset,setCamera,setRenderQuality,
  get renderQuality(){return renderQuality;},
 advanceFrames(n){playing=false;payout.advanceFrames(n);redraw();return payout.getSnapshot();},
 snapshot(){return {...payout.getSnapshot(),facetCount:COIN.sides,
  renderInstances:instance.count,sourceName:'slots-style-pixel-coin.svg',
  actualPhysics:payout.physicsModel,geometryType:instance.geometry.type,
  projectedExtent:[camera.left,camera.right],
   lighting:{...post.state,look:renderLook,quality:renderQuality,
    realShadows:renderer.shadowMap.enabled,shadowsThrottled:renderer.shadowMap.autoUpdate===false,
    materialType:instance.material[1].type,
    pixelGoldMask:!!instance.material[1].userData.pixelGoldMask,
    coinReceivesShadows:instance.receiveShadow,
    environmentReflections:!!scene.environment}};},
 screenshotReady(){redraw();return true;}
};
fire(240);requestAnimationFrame(animate);
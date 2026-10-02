/**
 * Demo-faithful paper world rendering. Simulation and the single frame scheduler
 * belong to the application; this module consumes feet-height XY snapshots.
 */
import * as THREE from '../../vendor/three/three.module.js';
import {clamp} from './math.js';
import {createPaperMaterials} from './paper-materials.js';
import {createTerrain} from './terrain.js';
import {createForest} from './forest.js';
import {createStageScenery} from './stage-scenery.js';
import {createCityTerrain} from './city-terrain.js';
import {createCityScenery} from './city-scenery.js';
import {createCityTraffic} from './city-traffic.js';
import {createSky} from './sky.js';
import {createPaperFog} from './fog.js';
import {createLights,createLightingController} from './lighting.js';
import {createVolumetrics} from './volumetrics.js';
import {createActor} from './actor.js';
import {createOrbitCamera} from './orbit-camera.js';
import {disposeSceneResources} from './resources.js';

const FEATURES=['sky','layers','shadow','fog','tone','random','bounce','godrays','ao'];
const PRESETS={dawn:.27,noon:.5,sunset:.73,night:.875};

export function createPaperScene({container,onStatus=()=>{},sceneId='city-prologue'}={}){
  if(!container||typeof container.appendChild!=='function')throw new TypeError('Paper scene requires a container element.');
  let disposed=false,contextLost=false,frameCalls=0,renderedFrames=0;
  let lastSnapshot={x:0,y:.5,z:0,grounded:true,facing:1};
  const flags={render:true,shadow:true,depth:true,volumeShadow:true,ao:true};
  const isCity=sceneId!=='forest';
  const state={sceneId:isCity?'city-prologue':'forest',sky:true,layers:true,shadow:true,fog:true,tone:true,random:true,bounce:true,godrays:true,ao:true,final:true,timePreset:isCity?'night':'dawn',auto:false,time:isCity?.875:.27,manualSun:false,sunAzimuth:-36,sunElevation:13};
  // Storybook stock is intentionally flat: the paper geometry and shadows
  // carry the depth, while the pigment only varies by a few quiet percent.
  const paperConfig={scale:1.8,normal:0,height:0,blend:0};
  const pending=[],pendingRejects=new Set(),loadedTextures=new Set();
  const events=new AbortController();
  function status(state,message,error){onStatus({state,message,...(error?{error}: {})});}
  function invalidate(){flags.render=flags.shadow=flags.depth=flags.volumeShadow=flags.ao=true;}
  function invalidateView(){flags.render=flags.depth=flags.ao=true;}
  function getSize(){
    const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);
    const coarse=window.matchMedia?.('(pointer: coarse)').matches??false;
    return {width,height,compact:width<760||height<600||coarse,
      gameplay:document.body.classList.contains('game-mode')};
  }
  function loadTexture(url,onLoad){
    let resolve,reject;
    const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    pending.push(promise);pendingRejects.add(reject);
    const texture=new THREE.TextureLoader().load(url,result=>{
      pendingRejects.delete(reject);
      if(disposed){result.dispose();reject(new Error('Paper scene disposed during loading.'));return;}
      try{onLoad?.(result);resolve(result);}catch(error){reject(error);}
    },undefined,error=>{
      pendingRejects.delete(reject);
      reject(new Error('纸艺场景资源加载失败：'+(url.startsWith('data:')?'场景贴图':url),{cause:error}));
    });
    loadedTextures.add(texture);
    return texture;
  }
  status('loading','正在铺开纸艺世界');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch(error){status('error','无法启动图形画面，请检查浏览器的图形加速。',error);throw error;}
  let size=getSize();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,size.compact?1.05:1.22));
  renderer.setSize(size.width,size.height,false);
  renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.style.display='block';
  renderer.domElement.setAttribute('aria-label',isCity?'晚上九点的纸艺城市街道':'横版开放纸艺世界');
  renderer.shadowMap.enabled=true;
  // PCF honours the light's filter radius: the former fixed soft kernel left
  // razor-sharp repeated trunk stripes across the close mobile composition.
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.90;
  renderer.info.autoReset=false;
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x9ca1ad);
  scene.fog=new THREE.Fog(0xaec8d3,15,36);
  const camera=new THREE.PerspectiveCamera(36,size.width/size.height,.1,100);
  const target=new THREE.Vector3(0,1.75,-.35);
  const orbitCamera=createOrbitCamera({camera,domElement:renderer.domElement,target,onChange:invalidateView,viewport:size});
  const materials=createPaperMaterials({THREE,renderer});
  const terrain=(isCity?createCityTerrain:createTerrain)({THREE,scene,renderer,flags,loadTexture,paperConfig,
    paperGrassSet:materials.paperGrassSet,paperDirtSet:materials.paperDirtSet,
    paperLeafSet:materials.paperLeafSet,paperTrunkSet:materials.paperTrunkSet,
    paperMapController:materials.storybookMaps});
  const forest=isCity?null:createForest({THREE,scene,...materials,...terrain.pulpSets,terrainWorld:terrain.world});
  const scenery=(isCity?createCityScenery:createStageScenery)({THREE,scene,world:terrain.world,flags});
  const traffic=isCity?createCityTraffic({THREE,scene}):null;
  traffic?.group.traverse(object=>{if(object.isMesh)object.userData.volumeShadow=false;});
const actor=createActor({THREE,scene,renderer,terrain,flags,loadTexture,sceneId:state.sceneId});
  const lights=createLights({THREE,scene,target});
  lights.locals=scenery.localLights??[];
  const celestials=createSky({THREE,scene,renderer,camera,sceneId:state.sceneId});
  const fog=createPaperFog({THREE,scene,renderer,camera,state,flags,getSize,mistTexture:materials.mistTexture,celestials});
  const atmosphere=createVolumetrics({THREE,scene,renderer,camera,state,flags,getSize,lights,celestials,fog,actor});
  const {updateLighting}=createLightingController({THREE,scene,camera,renderer,state,flags,lights,celestials,fog,atmosphere,actor});
  const {sky,starField,starUniforms,sunDisc,moonDisc,sunGlow,moonGlow}=celestials;
  const {sun,moon,groundBounce,viewFill}=lights;
  const {contactShadow}=actor;
  const {forestMist,fogUniforms,updateFogInstances,updateDepthTexture}=fog;
  const {volumeUniforms,updateVolumetricSettings,renderWithVolumetrics}=atmosphere;

  function syncFeatures(){
    sky.visible=state.sky;starField.visible=state.sky&&starUniforms.strength.value>.002;
    sunGlow.visible=state.sky&&sunDisc.visible;moonGlow.visible=state.sky&&moonDisc.visible;
    contactShadow.visible=state.shadow;forestMist.visible=state.fog;if(forest)forest.canopyGroup.visible=true;
    terrain.terrainBlocks.visible=state.layers;renderer.shadowMap.enabled=state.shadow;
    sun.castShadow=state.shadow&&sun.intensity>.10;moon.castShadow=state.shadow&&moon.intensity>.10;
    if(!state.fog)scene.fog=null;
    renderer.toneMapping=state.tone?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;
    state.final=FEATURES.every(name=>state[name]);
    invalidate();
  }
const timeTransition={
  active:false,
  start:state.time,
  target:state.time,
  delta:0,
  elapsed:0,
  duration:1.8
};

function beginTimeTransition(targetTime){
  const target=((targetTime%1)+1)%1;
  let delta=target-state.time;
  if(delta>.5)delta-=1;
  if(delta<-.5)delta+=1;

  timeTransition.active=true;
  timeTransition.start=state.time;
  timeTransition.target=target;
  timeTransition.delta=delta;
  timeTransition.elapsed=0;
  timeTransition.duration=2.35+Math.min(Math.abs(delta),.40)*5.0;
  flags.render=true;
}


let autoShadowFrame=0,volumeShadowFrame=0,lastMistTick=0,mistClock=0,trafficShadowClock=0;
function frame(dt=0,now=performance.now(),playerSnapshot=lastSnapshot){
  if(disposed||contextLost)return false;
  dt=Math.min(.05,Math.max(0,Number(dt)||0));
  now=Number.isFinite(now)?now:performance.now();
  if(playerSnapshot)lastSnapshot={...playerSnapshot,z:0};
  orbitCamera.follow(lastSnapshot.x,dt,lastSnapshot.y-.5);
  // The shadow coverage has ample margin. Move its origin in two-unit steps
  // instead of invalidating static forest occlusion for every camera drift.
  const lightShift=Math.trunc((target.x-atmosphere.volumeLightTarget.x)/2)*2;
  if(lightShift!==0){
    for(const light of [sun,moon]){light.position.x+=lightShift;light.target.position.x+=lightShift;}
    atmosphere.volumeLightTarget.x+=lightShift;
    flags.shadow=flags.volumeShadow=true;
  }
  const playerMesh=actor.playerMesh;
  frameCalls++;

  if(traffic?.update(dt)){
    flags.render=flags.depth=flags.ao=true;
    trafficShadowClock+=dt;
    if(trafficShadowClock>=1/30){
      flags.shadow=true;
      trafficShadowClock%=1/30;
    }
  }


  if(actor.sync(lastSnapshot)){
    flags.render=true;
    flags.shadow=true;
    flags.depth=true;
    flags.ao=true;
  }

  // Geometry changes and the moving actor take priority over the slower
  // light-clock cadence. The actor is excluded from volumetric shadow maps.
  const sceneShadowDirty=flags.shadow,sceneVolumeShadowDirty=flags.volumeShadow;

  if(timeTransition.active&&!state.auto){
    timeTransition.elapsed+=dt;
    const u=clamp(timeTransition.elapsed/timeTransition.duration,0,1);
    // Smootherstep: zero velocity at both ends, so there is no visible jerk
    // when a preset starts or finishes.
    const e=u*u*u*(u*(u*6-15)+10);
    state.time=(timeTransition.start+timeTransition.delta*e+1)%1;
    updateLighting(state.time);

    // Light direction follows the same smooth clock. Refresh expensive shadow
    // maps at a lower cadence while colours/sky still render every frame.
    autoShadowFrame=(autoShadowFrame+1)%4;
    volumeShadowFrame=(volumeShadowFrame+1)%4;
    flags.shadow=sceneShadowDirty||autoShadowFrame===0;
    flags.volumeShadow=sceneVolumeShadowDirty||volumeShadowFrame===0;

    flags.render=true;
    if(u>=1){
      state.time=timeTransition.target;
      timeTransition.active=false;
      updateLighting(state.time);
      flags.shadow=true;flags.volumeShadow=true;flags.render=true;
    }
  }

  if(state.auto){
    state.time=(state.time+dt/48)%1;
    updateLighting(state.time);
    // Updating a 1k shadow map every frame is wasteful. In auto-cycle mode
    // refresh it at ~7.5 fps; the colour/sky motion still renders smoothly.
    autoShadowFrame=(autoShadowFrame+1)%8;
    volumeShadowFrame=(volumeShadowFrame+1)%8;
    flags.shadow=sceneShadowDirty||autoShadowFrame===0;
    flags.volumeShadow=sceneVolumeShadowDirty||volumeShadowFrame===0;
    updateVolumetricSettings(state.time);
  }

  // Dynamic paper fog + low-cost temporal volumetric jitter (~20 fps).
  if(state.fog&&now-lastMistTick>50){
    const step=(now-lastMistTick)/1000;
    lastMistTick=now;mistClock+=Math.min(.12,step);
    fogUniforms.time.value=mistClock;
    updateFogInstances(mistClock);
    volumeUniforms.time.value=mistClock;
    flags.render=true;
  }

  if(!state.auto&&!timeTransition.active&&!flags.render)return;


  sky.position.copy(camera.position);starField.position.copy(camera.position);starUniforms.time.value=now*.001;

  if(playerMesh){
    const dx=camera.position.x-playerMesh.position.x;
    const dz=camera.position.z-playerMesh.position.z;
    const facingCamera=Math.atan2(dx,dz);
    if(Math.abs(playerMesh.rotation.y-facingCamera)>.000001)flags.shadow=true;
    playerMesh.rotation.y=facingCamera;

    const len=Math.max(.001,Math.hypot(dx,dz));
    const fx=dx/len,fz=dz/len;
    groundBounce.position.set(
      playerMesh.position.x+fx*4,
      -3,
      playerMesh.position.z+fz*4
    );
    groundBounce.target.position.set(playerMesh.position.x,1.1,playerMesh.position.z);
  }

  viewFill.position.copy(camera.position);
  viewFill.target.position.set(lastSnapshot.x,lastSnapshot.y+1.1,0);

  if(state.shadow&&flags.shadow){
    renderer.shadowMap.needsUpdate=true;
    flags.shadow=false;
  }

  renderer.info.reset();
  updateDepthTexture();
  if(state.godrays||state.ao)renderWithVolumetrics();
  else{
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
  }
  flags.render=false;
  renderedFrames++;
  return true;
}

  function resize(){
    if(disposed)return;
    size=getSize();
    camera.aspect=size.width/size.height;camera.updateProjectionMatrix();
    orbitCamera.resize(size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,size.compact?1.05:1.22));
    renderer.setSize(size.width,size.height,false);
    starUniforms.pixelRatio.value=renderer.getPixelRatio();
    fog.resize();atmosphere.resize();invalidate();
  }
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  resizeObserver?.observe(container);
  window.addEventListener('resize',resize,{signal:events.signal});
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;status('error','图形画面已暂停，正在等待恢复。');
  },{signal:events.signal});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{
    contextLost=false;resize();status('ready','纸艺世界已恢复');
  },{signal:events.signal});

  function setTimePreset(name){
    if(!Object.hasOwn(PRESETS,name))throw new RangeError('Unknown time preset: '+name);
    state.auto=false;state.manualSun=false;state.timePreset=name;
    beginTimeTransition(PRESETS[name]);invalidate();
  }
  function setAutoCycle(value){
    state.auto=!!value;
    if(state.auto){timeTransition.active=false;state.timePreset='';state.manualSun=false;}
    invalidate();
  }
  function setFeature(name,value){
    if(!FEATURES.includes(name))throw new RangeError('Unknown visual feature: '+name);
    state[name]=!!value;
    if(name==='random'){
      terrain.rebuildMaterialRandomness(state.random);
      terrain.setPaper(paperConfig,state.random);
    }
    updateLighting(state.time);syncFeatures();
  }
  function setPaper(patch={}){
    const next={...paperConfig};
    if(Number.isFinite(patch.scale))next.scale=clamp(patch.scale,.5,3);
    if(Number.isFinite(patch.normal))next.normal=clamp(patch.normal,0,3);
    next.height=0;next.blend=0;
    terrain.setPaper(next,state.random);
  }
  function setSurfaceMode(mode){
    terrain.setSurfaceMode(mode);
    state.random=mode==='pulp';
    invalidate();
  }
  function setSun({azimuth,elevation,manual=true}={}){
    if(Number.isFinite(azimuth))state.sunAzimuth=clamp(azimuth,-75,75);
    if(Number.isFinite(elevation))state.sunElevation=clamp(elevation,5,60);
    state.manualSun=!!manual;
    if(state.manualSun){timeTransition.active=false;state.auto=false;state.timePreset='';}
    updateLighting(state.time);syncFeatures();
  }
  function getState(){return {...state,shaftStrength:state.shaftStrength??1,surfaceMode:terrain.getSurfaceMode(),paper:{...paperConfig},camera:orbitCamera.snapshot(),transitioning:timeTransition.active};}
  function getStats(){
    return {ready:!!actor.playerMesh,disposed,contextLost,frames:frameCalls,renderedFrames,
      drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points,
      textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,
      terrain:terrain.stats(),forest:forest?.stats?.(),scenery:scenery.stats?.()??{...scenery.group.userData},traffic:traffic?.stats?.(),
      player:actor.snapshot(),camera:orbitCamera.snapshot(),
      pixelRatio:renderer.getPixelRatio(),size:{...size},volumetrics:atmosphere.stats()};
  }
  function dispose(){
    if(disposed)return;
    disposed=true;resizeObserver?.disconnect();events.abort();orbitCamera.dispose();
    for(const reject of pendingRejects)reject(new Error('Paper scene disposed during loading.'));
    pendingRejects.clear();
    fog.dispose();atmosphere.dispose();
    disposeSceneResources(scene,[...materials.textures,...terrain.textures,...loadedTextures]);
    renderer.renderLists.dispose();renderer.dispose();renderer.domElement.remove();
    status('disposed','纸艺场景已关闭');
  }
  updateLighting(state.time);syncFeatures();
  const ready=Promise.all(pending).then(()=>{
    if(disposed)throw new Error('Paper scene disposed during loading.');
    if(!actor.playerMesh?.material.map?.image)throw new Error('玩家纸片未能加载。');
    invalidate();frame(0,performance.now(),lastSnapshot);
    status('ready','纸艺世界准备好了');
    return getStats();
  }).catch(error=>{
    if(!disposed)status('error',error.message,error);
    throw error;
  });
  return {ready,frame,setTimePreset,setAutoCycle,setFeature,setPaper,setSurfaceMode,setSun,setShaftStrength:atmosphere.setShaftStrength,resetCamera:()=>orbitCamera.reset(),getState,getStats,
    getWorld:()=>terrain.world,dispose};
}

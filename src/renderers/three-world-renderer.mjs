import {World3DEngine} from '../engine3d/World3DEngine.js?v=voxel3d-r21';

const HOST=document.getElementById('threeWorldLayer');
const RUNTIME=window.PaperchalkRuntime;
const CONTENT=window.PaperchalkContent;
const THREE_MODULE='../../vendor/three/three.module.js';

let THREE=null;
let engine=null;
let active=false;
let ready=false;
let raf=0;
let lastNow=0;
let unsubscribeRuntime=null;
let latestSnapshot=RUNTIME?.getSnapshot?.()||null;
let initPromise=null;
let frames=0;
let fps=0;
let fpsFrames=0;
let fpsWindowAt=0;
let errorMessage='';

function emit(){
  window.dispatchEvent(new CustomEvent('paperchalk-3d-change',{detail:snapshot()}));
}

function snapshot(){
  return {
    active,ready,error:errorMessage,loopActive:!!raf,
    stats:engine?.stats?.()||null
  };
}

function syncCameraControls(config){
  window.dispatchEvent(new CustomEvent('paperchalk-3d-camera-change',{detail:config}));
}

async function ensureReady(){
  if(ready&&engine)return true;
  if(initPromise)return initPromise;
  initPromise=(async()=>{
    if(!HOST)throw new Error('THREE_WORLD_HOST_MISSING');
    if(!RUNTIME)throw new Error('PAPERCHALK_RUNTIME_MISSING');
    THREE=await import(THREE_MODULE);
    engine=new World3DEngine({
      THREE,
      host:HOST,
      content:CONTENT,
      onCameraChanged:syncCameraControls
    });
    latestSnapshot=RUNTIME.getSnapshot();
    engine.setSnapshot(latestSnapshot);
    const settings=window.PaperchalkSettings?.get?.();
    if(settings?.camera3d)engine.setCameraConfig(settings.camera3d);
    unsubscribeRuntime=RUNTIME.subscribe(next=>{
      latestSnapshot=next;
    });
    window.PaperchalkEvents?.on?.('player:health-changed',event=>{
      engine?.onHealthChanged(event.payload);
    });
    ready=true;
    errorMessage='';
    return true;
  })().catch(error=>{
    errorMessage=String(error?.message||error);
    console.error('[paperchalk-3d] initialization failed',error);
    ready=false;
    return false;
  });
  const ok=await initPromise;
  emit();
  return ok;
}

function frame(now){
  if(!active||!engine){raf=0;return}
  const dt=Math.min(.05,lastNow?(now-lastNow)/1000:1/60);
  lastNow=now;
  engine.update(dt,latestSnapshot||RUNTIME.getSnapshot());
  engine.render();
  frames++;
  fpsFrames++;
  if(!fpsWindowAt)fpsWindowAt=now;
  if(now-fpsWindowAt>=500){
    fps=Math.round(fpsFrames*1000/(now-fpsWindowAt));
    fpsFrames=0;
    fpsWindowAt=now;
  }
  raf=requestAnimationFrame(frame);
}

function startLoop(){
  if(raf||!active||!engine)return;
  lastNow=0;
  fpsFrames=0;
  fpsWindowAt=0;
  raf=requestAnimationFrame(frame);
}

function stopLoop(){
  if(raf)cancelAnimationFrame(raf);
  raf=0;
  lastNow=0;
}

async function enable(){
  const ok=await ensureReady();
  if(!ok)return false;
  active=true;
  HOST.hidden=false;
  HOST.setAttribute('aria-hidden','false');
  startLoop();
  emit();
  return true;
}

function disable(){
  active=false;
  stopLoop();
  if(HOST){
    HOST.hidden=true;
    HOST.setAttribute('aria-hidden','true');
  }
  emit();
  return true;
}

function setCameraConfig(config){
  const next=engine?.setCameraConfig(config)||config||{};
  window.PaperchalkSettings?.setCamera3D?.(next);
  emit();
  return next;
}

function resetCamera(){
  const next=engine?.resetCamera()||{yaw:0,pitch:0,distance:18,height:.35,fov:42};
  window.PaperchalkSettings?.setCamera3D?.(next);
  emit();
  return next;
}

function setDebugColliders(enabled){
  const value=engine?.setDebugColliders(enabled)||false;
  emit();
  return value;
}

function setStageView(enabled,axis){
  const value=engine?.setStageView(enabled,axis)||{enabled:!!enabled,axis:axis==='x'?'x':'z',side:1};
  const camera=engine?.cameraConfig?.()||{stageView:value};
  window.PaperchalkSettings?.setCamera3D?.(camera);
  emit();
  return value;
}

function toggleStageView(){
  const value=engine?.toggleStageView?.()||{enabled:true,axis:'z',side:1};
  const camera=engine?.cameraConfig?.()||{stageView:value};
  window.PaperchalkSettings?.setCamera3D?.(camera);
  emit();
  return value;
}

function setStageAxis(axis){
  const value=engine?.setStageAxis?.(axis)||{enabled:true,axis:axis==='x'?'x':'z',side:1};
  const camera=engine?.cameraConfig?.()||{stageView:value};
  window.PaperchalkSettings?.setCamera3D?.(camera);
  emit();
  return value;
}

window.addEventListener('resize',()=>engine?.resize?.(),{passive:true});
window.addEventListener('paperchalk-world-enter',()=>{enable()});
window.addEventListener('paperchalk-world-leave',()=>{disable()});
window.addEventListener('pagehide',()=>{disable()});

window.Paperchalk3D=Object.freeze({
  version:6,
  engine:'three-r180-infinite-voxel-3d',
  enable,disable,setCameraConfig,resetCamera,setDebugColliders,
  setStageView,toggleStageView,setStageAxis,
  screenToWorld(clientX,clientY){return engine?.screenToWorld?.(clientX,clientY)||null},
  screenToTerrainCell(clientX,clientY,options){return engine?.screenToTerrainCell?.(clientX,clientY,options)||null},
  hideTerrainCursor(){return engine?.hideTerrainCursor?.()},
  get active(){return active},
  get ready(){return ready},
  get stats(){
    return {
      fps,frames,active,ready,loopActive:!!raf,error:errorMessage,
      ...(engine?.stats?.()||{})
    };
  },
  snapshot
});

emit();

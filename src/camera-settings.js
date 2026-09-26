/* Persistent standalone camera controls. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const openBtn=document.getElementById('cameraControlsBtn');
const panel=document.getElementById('cameraControlsPanel');
const closeBtn=document.getElementById('cameraControlsClose');
const tilt=document.getElementById('settingCameraTilt');
const tiltValue=document.getElementById('settingCameraTiltValue');
const height=document.getElementById('settingCameraHeight');
const heightValue=document.getElementById('settingCameraHeightValue');
const distance=document.getElementById('settingCameraDistance');
const distanceValue=document.getElementById('settingCameraDistanceValue');
const reset=document.getElementById('settingCameraReset');
const status=document.getElementById('cameraControlsStatus');
if(!camera||!runtime||!openBtn||!panel||!tilt||!height||!distance)return;

const KEY='paperchalk.settings.v1';
const OLD_ANGLE='paperchalk.debug.cameraAngle.v2';
const OLD_HEIGHT='paperchalk.debug.cameraHeight.v1';
const OLD_DISTANCE='paperchalk.debug.cameraDistance.v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return{}}}
function write(next){try{localStorage.setItem(KEY,JSON.stringify({...read(),...next}))}catch(_){}}
function redraw(){
  runtime.requestDomSync?.();
  requestAnimationFrame(()=>global.PaperchalkDomCardProjection?.renderNow?.());
}
function snapshot(){
  return {
    cameraTilt:camera.getTiltDegrees(),
    cameraHeight:camera.getCameraHeightMeters(),
    cameraDistance:camera.getCameraDistanceMeters()
  };
}
function sync(){
  const a=camera.getTiltDegrees(),h=camera.getCameraHeightMeters(),d=camera.getCameraDistanceMeters();
  tilt.value=a.toFixed(1);tiltValue.textContent=a.toFixed(1)+'°';
  height.value=h.toFixed(1);heightValue.textContent=h.toFixed(1)+' m';
  distance.value=d.toFixed(1);distanceValue.textContent=d.toFixed(1)+' m';
}
function announce(message){
  if(!status)return;
  status.textContent=message;
  clearTimeout(announce._timer);
  announce._timer=setTimeout(()=>{status.textContent=''},900);
}
function apply(values={},persist=false,notify=false){
  const a=clamp(values.cameraTilt??camera.getTiltDegrees(),0,camera.config.maxTiltDegrees);
  const h=clamp(values.cameraHeight??camera.getCameraHeightMeters(),1,10);
  const d=clamp(values.cameraDistance??camera.getCameraDistanceMeters(),6.5,60);
  camera.setTiltDegrees(a);camera.setCameraHeightMeters(h);camera.setCameraDistanceMeters(d);
  sync();redraw();
  if(persist)write({cameraTilt:a,cameraHeight:h,cameraDistance:d});
  if(notify)announce('镜头已保存');
  return snapshot();
}
function resetAll(){
  camera.reset();
  const values=snapshot();
  write(values);sync();redraw();announce('已恢复默认镜头');
}
function open(){
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden','false');
  openBtn.setAttribute('aria-expanded','true');
  document.getElementById('world')?.classList.add('camera-controls-open');
  sync();redraw();
}
function close(){
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden','true');
  openBtn.setAttribute('aria-expanded','false');
  document.getElementById('world')?.classList.remove('camera-controls-open');
  redraw();
}
function toggle(){panel.classList.contains('is-open')?close():open()}
function load(){
  const saved=read(),legacy={};
  try{
    if(!Number.isFinite(Number(saved.cameraTilt))&&localStorage.getItem(OLD_ANGLE)!==null)legacy.cameraTilt=Number(localStorage.getItem(OLD_ANGLE));
    if(!Number.isFinite(Number(saved.cameraHeight))&&localStorage.getItem(OLD_HEIGHT)!==null)legacy.cameraHeight=Number(localStorage.getItem(OLD_HEIGHT));
    if(!Number.isFinite(Number(saved.cameraDistance))&&localStorage.getItem(OLD_DISTANCE)!==null)legacy.cameraDistance=Number(localStorage.getItem(OLD_DISTANCE));
  }catch(_){}
  apply({
    cameraTilt:Number.isFinite(Number(saved.cameraTilt))?Number(saved.cameraTilt):(Number.isFinite(legacy.cameraTilt)?legacy.cameraTilt:camera.config.defaultTiltDegrees),
    cameraHeight:Number.isFinite(Number(saved.cameraHeight))?Number(saved.cameraHeight):(Number.isFinite(legacy.cameraHeight)?legacy.cameraHeight:camera.config.defaultHeightMeters),
    cameraDistance:Number.isFinite(Number(saved.cameraDistance))?Number(saved.cameraDistance):(Number.isFinite(legacy.cameraDistance)?legacy.cameraDistance:camera.config.defaultDistanceMeters)
  },true,false);
  try{localStorage.removeItem(OLD_ANGLE);localStorage.removeItem(OLD_HEIGHT);localStorage.removeItem(OLD_DISTANCE)}catch(_){}
}
openBtn.addEventListener('click',toggle);
closeBtn?.addEventListener('click',close);
tilt.addEventListener('input',()=>apply({cameraTilt:Number(tilt.value)},true,false));
height.addEventListener('input',()=>apply({cameraHeight:Number(height.value)},true,false));
distance.addEventListener('input',()=>apply({cameraDistance:Number(distance.value)},true,false));
reset?.addEventListener('click',resetAll);
addEventListener('keydown',e=>{if(e.code==='Escape'&&panel.classList.contains('is-open')){e.preventDefault();close()}});
load();
global.PaperchalkCameraSettings=Object.freeze({open,close,toggle,sync,apply,snapshot,reset:resetAll});
})(window);

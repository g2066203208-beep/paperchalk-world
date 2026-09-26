/* Persistent camera controls exposed in the normal Settings page. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const tilt=document.getElementById('settingCameraTilt');
const tiltValue=document.getElementById('settingCameraTiltValue');
const height=document.getElementById('settingCameraHeight');
const heightValue=document.getElementById('settingCameraHeightValue');
const distance=document.getElementById('settingCameraDistance');
const distanceValue=document.getElementById('settingCameraDistanceValue');
const reset=document.getElementById('settingCameraReset');
const status=document.getElementById('settingsStatus');
if(!camera||!runtime||!tilt||!height||!distance)return;

const KEY='paperchalk.settings.v1';
const OLD_ANGLE='paperchalk.debug.cameraAngle.v2';
const OLD_HEIGHT='paperchalk.debug.cameraHeight.v1';
const OLD_DISTANCE='paperchalk.debug.cameraDistance.v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function read(){
  try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return{}}
}
function write(next){
  try{localStorage.setItem(KEY,JSON.stringify({...read(),...next}))}catch(_){}
}
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
function apply(values={},persist=false,announce=false){
  const a=clamp(values.cameraTilt??camera.getTiltDegrees(),0,camera.config.maxTiltDegrees);
  const h=clamp(values.cameraHeight??camera.getCameraHeightMeters(),1,10);
  const d=clamp(values.cameraDistance??camera.getCameraDistanceMeters(),6.5,60);
  camera.setTiltDegrees(a);camera.setCameraHeightMeters(h);camera.setCameraDistanceMeters(d);
  sync();redraw();
  if(persist)write({cameraTilt:a,cameraHeight:h,cameraDistance:d});
  if(announce&&status){
    status.textContent='镜头设置已保存';
    clearTimeout(apply._timer);apply._timer=setTimeout(()=>{status.textContent=''},1000);
  }
  return snapshot();
}
function resetAll(){
  camera.reset();
  const values=snapshot();write(values);sync();redraw();
  if(status)status.textContent='已恢复默认镜头';
  clearTimeout(resetAll._timer);resetAll._timer=setTimeout(()=>{if(status)status.textContent=''},1000);
}
function load(){
  const saved=read();
  const legacy={};
  try{
    if(!Number.isFinite(Number(saved.cameraTilt))&&localStorage.getItem(OLD_ANGLE)!==null)legacy.cameraTilt=Number(localStorage.getItem(OLD_ANGLE));
    if(!Number.isFinite(Number(saved.cameraHeight))&&localStorage.getItem(OLD_HEIGHT)!==null)legacy.cameraHeight=Number(localStorage.getItem(OLD_HEIGHT));
    if(!Number.isFinite(Number(saved.cameraDistance))&&localStorage.getItem(OLD_DISTANCE)!==null)legacy.cameraDistance=Number(localStorage.getItem(OLD_DISTANCE));
  }catch(_){}
  const values={
    cameraTilt:Number.isFinite(Number(saved.cameraTilt))?Number(saved.cameraTilt):(Number.isFinite(legacy.cameraTilt)?legacy.cameraTilt:camera.config.defaultTiltDegrees),
    cameraHeight:Number.isFinite(Number(saved.cameraHeight))?Number(saved.cameraHeight):(Number.isFinite(legacy.cameraHeight)?legacy.cameraHeight:camera.config.defaultHeightMeters),
    cameraDistance:Number.isFinite(Number(saved.cameraDistance))?Number(saved.cameraDistance):(Number.isFinite(legacy.cameraDistance)?legacy.cameraDistance:camera.config.defaultDistanceMeters)
  };
  apply(values,true,false);
  try{localStorage.removeItem(OLD_ANGLE);localStorage.removeItem(OLD_HEIGHT);localStorage.removeItem(OLD_DISTANCE)}catch(_){}
}
tilt.addEventListener('input',()=>apply({cameraTilt:Number(tilt.value)},true,true));
height.addEventListener('input',()=>apply({cameraHeight:Number(height.value)},true,true));
distance.addEventListener('input',()=>apply({cameraDistance:Number(distance.value)},true,true));
reset?.addEventListener('click',resetAll);
load();
global.PaperchalkCameraSettings=Object.freeze({sync,apply,snapshot,reset:resetAll});
})(window);

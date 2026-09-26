/* Persistent standalone camera controls. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const button=document.getElementById('cameraControlBtn');
const panel=document.getElementById('cameraControlPanel');
const close=document.getElementById('cameraControlClose');
const tilt=document.getElementById('cameraTilt');
const tiltValue=document.getElementById('cameraTiltValue');
const height=document.getElementById('cameraHeight');
const heightValue=document.getElementById('cameraHeightValue');
const distance=document.getElementById('cameraDistance');
const distanceValue=document.getElementById('cameraDistanceValue');
const reset=document.getElementById('cameraReset');
const status=document.getElementById('cameraControlStatus');
if(!camera||!runtime||!button||!panel||!tilt||!height||!distance)return;

const KEY='paperchalk.settings.v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return{}}}
function write(next){try{localStorage.setItem(KEY,JSON.stringify({...read(),...next}))}catch(_){}}
function redraw(){
  runtime.requestDomSync?.();
  requestAnimationFrame(()=>global.PaperchalkDomCardProjection?.renderNow?.());
}
function snapshot(){return {cameraTilt:camera.getTiltDegrees(),cameraHeight:camera.getCameraHeightMeters(),cameraDistance:camera.getCameraDistanceMeters()}}
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
function apply(values={},persist=false,announceChange=false){
  const a=clamp(values.cameraTilt??camera.getTiltDegrees(),0,camera.config.maxTiltDegrees);
  const h=clamp(values.cameraHeight??camera.getCameraHeightMeters(),1,10);
  const d=clamp(values.cameraDistance??camera.getCameraDistanceMeters(),6.5,60);
  camera.setTiltDegrees(a);
  camera.setCameraHeightMeters(h);
  camera.setCameraDistanceMeters(d);
  sync();redraw();
  if(persist)write({cameraTilt:a,cameraHeight:h,cameraDistance:d});
  if(announceChange)announce('镜头参数已保存');
  return snapshot();
}
function resetAll(){
  camera.reset();
  const values=snapshot();
  write(values);sync();redraw();announce('已恢复默认镜头');
}
function setOpen(open){
  const active=!!open;
  panel.classList.toggle('is-open',active);
  panel.setAttribute('aria-hidden',active?'false':'true');
  button.setAttribute('aria-expanded',active?'true':'false');
  if(active)sync();
  return active;
}
function load(){
  const saved=read();
  apply({
    cameraTilt:Number.isFinite(Number(saved.cameraTilt))?Number(saved.cameraTilt):camera.config.defaultTiltDegrees,
    cameraHeight:Number.isFinite(Number(saved.cameraHeight))?Number(saved.cameraHeight):camera.config.defaultHeightMeters,
    cameraDistance:Number.isFinite(Number(saved.cameraDistance))?Number(saved.cameraDistance):camera.config.defaultDistanceMeters
  },false,false);
}
tilt.addEventListener('input',()=>apply({cameraTilt:Number(tilt.value)},true,true));
height.addEventListener('input',()=>apply({cameraHeight:Number(height.value)},true,true));
distance.addEventListener('input',()=>apply({cameraDistance:Number(distance.value)},true,true));
reset?.addEventListener('click',resetAll);
button.addEventListener('click',()=>setOpen(!panel.classList.contains('is-open')));
close?.addEventListener('click',()=>setOpen(false));
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&panel.classList.contains('is-open'))setOpen(false)});
load();
global.PaperchalkCameraSettings=Object.freeze({sync,apply,snapshot,reset:resetAll,open(){return setOpen(true)},close(){return setOpen(false)}});
})(window);

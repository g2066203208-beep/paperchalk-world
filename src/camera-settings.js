/* Standalone persistent in-game camera panel. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const btn=document.getElementById('cameraUiBtn'),panel=document.getElementById('cameraPanel'),closeBtn=document.getElementById('cameraCloseBtn');
const tilt=document.getElementById('cameraTilt'),tiltValue=document.getElementById('cameraTiltValue');
const height=document.getElementById('cameraHeight'),heightValue=document.getElementById('cameraHeightValue');
const distance=document.getElementById('cameraDistance'),distanceValue=document.getElementById('cameraDistanceValue');
const reset=document.getElementById('cameraResetBtn');
if(!camera||!runtime||!btn||!panel||!tilt||!height||!distance)return;
const KEY='paperchalk.camera.v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return{}}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}}
function redraw(){runtime.requestDomSync?.();requestAnimationFrame(()=>global.PaperchalkDomCardProjection?.renderNow?.())}
function snapshot(){return{cameraTilt:camera.getTiltDegrees(),cameraHeight:camera.getCameraHeightMeters(),cameraDistance:camera.getCameraDistanceMeters()}}
function sync(){
 const a=camera.getTiltDegrees(),h=camera.getCameraHeightMeters(),d=camera.getCameraDistanceMeters();
 tilt.value=a.toFixed(1);tiltValue.textContent=a.toFixed(1)+'°';
 height.value=h.toFixed(1);heightValue.textContent=h.toFixed(1)+' m';
 distance.value=d.toFixed(1);distanceValue.textContent=d.toFixed(1)+' m';
}
function apply(values={},persist=true){
 const a=clamp(values.cameraTilt??camera.getTiltDegrees(),0,camera.config.maxTiltDegrees);
 const h=clamp(values.cameraHeight??camera.getCameraHeightMeters(),1,10);
 const d=clamp(values.cameraDistance??camera.getCameraDistanceMeters(),6.5,60);
 camera.setTiltDegrees(a);camera.setCameraHeightMeters(h);camera.setCameraDistanceMeters(d);
 sync();redraw();if(persist)write({cameraTilt:a,cameraHeight:h,cameraDistance:d});return snapshot();
}
function open(){panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');btn.setAttribute('aria-expanded','true');sync()}
function close(){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');btn.setAttribute('aria-expanded','false')}
function resetAll(){camera.reset();sync();write(snapshot());redraw()}
function load(){
 const v=read();
 apply({
  cameraTilt:Number.isFinite(Number(v.cameraTilt))?Number(v.cameraTilt):camera.config.defaultTiltDegrees,
  cameraHeight:Number.isFinite(Number(v.cameraHeight))?Number(v.cameraHeight):camera.config.defaultHeightMeters,
  cameraDistance:Number.isFinite(Number(v.cameraDistance))?Number(v.cameraDistance):camera.config.defaultDistanceMeters
 },false);
}
btn.addEventListener('click',()=>panel.classList.contains('is-open')?close():open());
closeBtn?.addEventListener('click',close);
tilt.addEventListener('input',()=>apply({cameraTilt:Number(tilt.value)}));
height.addEventListener('input',()=>apply({cameraHeight:Number(height.value)}));
distance.addEventListener('input',()=>apply({cameraDistance:Number(distance.value)}));
reset?.addEventListener('click',resetAll);
load();
global.PaperchalkCameraSettings=Object.freeze({open,close,sync,apply,snapshot,reset:resetAll});
})(window);

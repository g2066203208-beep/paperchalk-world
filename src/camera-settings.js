/* Standalone persistent camera controls. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const btn=document.getElementById('cameraControlBtn'),panel=document.getElementById('cameraControlPanel'),close=document.getElementById('cameraControlClose');
const tilt=document.getElementById('settingCameraTilt'),tiltValue=document.getElementById('settingCameraTiltValue');
const height=document.getElementById('settingCameraHeight'),heightValue=document.getElementById('settingCameraHeightValue');
const distance=document.getElementById('settingCameraDistance'),distanceValue=document.getElementById('settingCameraDistanceValue');
const reset=document.getElementById('settingCameraReset');
if(!camera||!runtime||!btn||!panel||!tilt||!height||!distance)return;
const KEY='paperchalk.camera.v1',OLD_A='paperchalk.debug.cameraAngle.v2',OLD_H='paperchalk.debug.cameraHeight.v1',OLD_D='paperchalk.debug.cameraDistance.v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return{}}}
function write(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}}
function redraw(){runtime.requestDomSync?.();requestAnimationFrame(()=>global.PaperchalkDomCardProjection?.renderNow?.())}
function snapshot(){return{cameraTilt:camera.getTiltDegrees(),cameraHeight:camera.getCameraHeightMeters(),cameraDistance:camera.getCameraDistanceMeters()}}
function sync(){const a=camera.getTiltDegrees(),h=camera.getCameraHeightMeters(),d=camera.getCameraDistanceMeters();tilt.value=a.toFixed(1);tiltValue.textContent=a.toFixed(1)+'°';height.value=h.toFixed(1);heightValue.textContent=h.toFixed(1)+' m';distance.value=d.toFixed(1);distanceValue.textContent=d.toFixed(1)+' m'}
function apply(v={},persist=true){camera.setTiltDegrees(clamp(v.cameraTilt??camera.getTiltDegrees(),0,camera.config.maxTiltDegrees));camera.setCameraHeightMeters(clamp(v.cameraHeight??camera.getCameraHeightMeters(),1,10));camera.setCameraDistanceMeters(clamp(v.cameraDistance??camera.getCameraDistanceMeters(),6.5,60));sync();redraw();if(persist)write(snapshot());return snapshot()}
function open(){panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');btn.setAttribute('aria-expanded','true');sync()}
function shut(){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');btn.setAttribute('aria-expanded','false')}
function resetAll(){camera.reset();sync();write(snapshot());redraw()}
function load(){const v=read(),legacy={};try{if(localStorage.getItem(OLD_A)!==null)legacy.cameraTilt=Number(localStorage.getItem(OLD_A));if(localStorage.getItem(OLD_H)!==null)legacy.cameraHeight=Number(localStorage.getItem(OLD_H));if(localStorage.getItem(OLD_D)!==null)legacy.cameraDistance=Number(localStorage.getItem(OLD_D))}catch(_){}
apply({cameraTilt:Number.isFinite(Number(v.cameraTilt))?Number(v.cameraTilt):(Number.isFinite(legacy.cameraTilt)?legacy.cameraTilt:camera.config.defaultTiltDegrees),cameraHeight:Number.isFinite(Number(v.cameraHeight))?Number(v.cameraHeight):(Number.isFinite(legacy.cameraHeight)?legacy.cameraHeight:camera.config.defaultHeightMeters),cameraDistance:Number.isFinite(Number(v.cameraDistance))?Number(v.cameraDistance):(Number.isFinite(legacy.cameraDistance)?legacy.cameraDistance:camera.config.defaultDistanceMeters)},true);
try{localStorage.removeItem(OLD_A);localStorage.removeItem(OLD_H);localStorage.removeItem(OLD_D)}catch(_){}}
btn.addEventListener('click',()=>panel.classList.contains('is-open')?shut():open());close?.addEventListener('click',shut);
tilt.addEventListener('input',()=>apply({cameraTilt:Number(tilt.value)}));height.addEventListener('input',()=>apply({cameraHeight:Number(height.value)}));distance.addEventListener('input',()=>apply({cameraDistance:Number(distance.value)}));reset?.addEventListener('click',resetAll);
load();global.PaperchalkCameraSettings=Object.freeze({open:open,close:shut,sync,apply,snapshot,reset:resetAll});
})(window);

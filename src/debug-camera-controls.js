/* Debug-only camera angle/height controls. Keeps game runtime lean. */
(function(global){
'use strict';
const camera=global.PaperchalkCardCamera,runtime=global.PaperchalkRuntime;
const angle=document.getElementById('debugCameraTilt');
const angleValue=document.getElementById('debugCameraTiltValue');
const horizonValue=document.getElementById('debugCameraHorizonValue');
const height=document.getElementById('debugCameraHeight');
const heightValue=document.getElementById('debugCameraHeightValue');
const distance=document.getElementById('debugCameraDistance');
const distanceValue=document.getElementById('debugCameraDistanceValue');
const reset=document.getElementById('debugCameraTiltReset');
if(!camera||!runtime||!angle||!height||!distance)return;

const ANGLE_KEY='paperchalk.debug.cameraAngle.v2';
const HEIGHT_KEY='paperchalk.debug.cameraHeight.v1';
const DISTANCE_KEY='paperchalk.debug.cameraDistance.v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const viewport=()=>runtime.getSnapshot()?.viewport||{height:720,groundY:112};

function redraw(){
  runtime.requestDomSync?.();
  requestAnimationFrame(()=>global.PaperchalkDomCardProjection?.renderNow?.());
}
function sync(){
  const v=viewport();
  const a=camera.getTiltDegrees(v.height,v.groundY);
  const h=camera.getCameraHeightMeters(v.height,v.groundY);
  const d=camera.getCameraDistanceMeters();
  const hy=camera.resolveHorizonY(v.height,v.groundY);
  angle.value=a.toFixed(1);
  angleValue.textContent=a.toFixed(1)+'°'+(camera.manualTiltDegrees===null?' 自动':'');
  height.value=h.toFixed(1);
  heightValue.textContent=h.toFixed(1)+' m'+(camera.manualCameraHeightMeters===null?' 自动':'');
  distance.value=d.toFixed(1);
  distanceValue.textContent=d.toFixed(1)+' m'+(camera.manualCameraDistanceMeters===null?' 自动':'');
  horizonValue.textContent='消失线 y='+hy.toFixed(0)+'px';
}
function setAngle(value,{persist=true,redrawNow=true}={}){
  const v=clamp(value,0,45);
  camera.setTiltDegrees(v);
  if(persist)try{localStorage.setItem(ANGLE_KEY,String(v))}catch(_){}
  sync();if(redrawNow)redraw();return v;
}
function setHeight(value,{persist=true,redrawNow=true}={}){
  const v=clamp(value,1,10);
  camera.setCameraHeightMeters(v);
  if(persist)try{localStorage.setItem(HEIGHT_KEY,String(v))}catch(_){}
  sync();if(redrawNow)redraw();return v;
}
function setDistance(value,{persist=true,redrawNow=true}={}){
  const v=clamp(value,6.5,60);
  camera.setCameraDistanceMeters(v);
  if(persist)try{localStorage.setItem(DISTANCE_KEY,String(v))}catch(_){}
  sync();if(redrawNow)redraw();return v;
}
function resetAll({redrawNow=true}={}){
  camera.clearTiltDegrees();camera.clearHorizonRatio();camera.clearCameraHeight();camera.clearCameraDistance();
  try{localStorage.removeItem(ANGLE_KEY);localStorage.removeItem(HEIGHT_KEY);localStorage.removeItem(DISTANCE_KEY)}catch(_){}
  sync();if(redrawNow)redraw();return true;
}
function load(){
  let a=null,h=null,d=null;
  try{a=localStorage.getItem(ANGLE_KEY);h=localStorage.getItem(HEIGHT_KEY);d=localStorage.getItem(DISTANCE_KEY)}catch(_){}
  if(a!==null&&Number.isFinite(Number(a)))setAngle(Number(a),{persist:false,redrawNow:false});
  if(h!==null&&Number.isFinite(Number(h)))setHeight(Number(h),{persist:false,redrawNow:false});
  if(d!==null&&Number.isFinite(Number(d)))setDistance(Number(d),{persist:false,redrawNow:false});
  sync();redraw();
}

angle.addEventListener('input',()=>setAngle(angle.value));
height.addEventListener('input',()=>setHeight(height.value));
distance.addEventListener('input',()=>setDistance(distance.value));
reset?.addEventListener('click',()=>resetAll());
load();

global.PaperchalkDebugCamera=Object.freeze({sync,setAngle,setHeight,setDistance,reset:resetAll});
})(window);

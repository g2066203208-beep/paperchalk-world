/* Shared X/Y gameplay camera with authored Z scene depth. DOM and Pixi consume this exact math. */
(function(global){
'use strict';

const FAR_GROUND_DEPTH=1280; // 10 m at 128 px/m
let manualHorizonRatio=null;
let manualTiltDegrees=null;
let manualCameraHeightPx=null;
let tiltRevision=0;

const config=Object.freeze({
  gridSize:128,
  baseDepth:3840, // 30 m camera-to-mid plane at 128 px/m
  nearMainDepth:-640,
  nearMainScreenMargin:8, // responsive tilt target: near-main sits ~8px above viewport bottom
  minDepth:96,
  maxDepth:6400,
  // The playable ground is finite in scene-depth: it ends exactly where the
  // far sky wall meets the floor. Nothing behind this line needs ground grid.
  groundNearDepth:-704, // -5.5 m, includes the near-front guide
  farGroundDepth:FAR_GROUND_DEPTH,
  wallDepth:FAR_GROUND_DEPTH,
  sceneGuides:Object.freeze([
    Object.freeze({id:'near-front',label:'NF',band:'near',kind:'sub',z:-704}),
    Object.freeze({id:'near-main', label:'N', band:'near',kind:'main',z:-640}),
    Object.freeze({id:'near-back', label:'NB',band:'near',kind:'sub',z:-576}),
    Object.freeze({id:'mid-front', label:'MF',band:'mid', kind:'sub',z:-64}),
    Object.freeze({id:'mid-main',  label:'M', band:'mid', kind:'main',z:0}),
    Object.freeze({id:'mid-back',  label:'MB',band:'mid', kind:'sub',z:64}),
    Object.freeze({id:'far-front', label:'FF',band:'far', kind:'sub',z:576}),
    Object.freeze({id:'far-main',  label:'F', band:'far', kind:'main',z:640}),
    Object.freeze({id:'far-back',  label:'FB',band:'far', kind:'sub',z:704}),
    Object.freeze({id:'horizon',   label:'H', band:'horizon',kind:'horizon',z:FAR_GROUND_DEPTH})
  ])
});

function resolveAutoHorizonY(viewportHeight=720,groundY=112){
  const h=Number(viewportHeight)||720;
  const g=Number(groundY)||112;
  const playerFootY=h-g;
  const nearScale=config.baseDepth/(config.baseDepth+config.nearMainDepth);
  const targetNearY=h-config.nearMainScreenMargin;
  // Solve targetNearY = horizonY + (playerFootY-horizonY)*nearScale.
  // This changes only camera tilt / vanishing-line placement; world Z stays untouched.
  return (targetNearY-nearScale*playerFootY)/(1-nearScale);
}
function clampHorizonRatio(value){
  const n=Number(value);
  if(!Number.isFinite(n))return null;
  return Math.max(.04,Math.min(.48,n));
}
function setHorizonRatio(value){
  const next=clampHorizonRatio(value);
  if(next===null)return false;
  manualTiltDegrees=null;
  if(manualHorizonRatio!==null&&Math.abs(manualHorizonRatio-next)<1e-9)return true;
  manualHorizonRatio=next;
  tiltRevision++;
  return true;
}
function clearHorizonRatio(){
  if(manualHorizonRatio===null)return;
  manualHorizonRatio=null;
  tiltRevision++;
}
function clampTiltDegrees(value){
  const n=Number(value);
  if(!Number.isFinite(n))return null;
  return Math.max(0,Math.min(30,n));
}
function setTiltDegrees(value){
  const next=clampTiltDegrees(value);
  if(next===null)return false;
  manualHorizonRatio=null;
  if(manualTiltDegrees!==null&&Math.abs(manualTiltDegrees-next)<1e-9)return true;
  manualTiltDegrees=next;
  tiltRevision++;
  return true;
}
function clearTiltDegrees(){
  if(manualTiltDegrees===null)return;
  manualTiltDegrees=null;
  tiltRevision++;
}
function setCameraHeightMeters(value){
  const n=Number(value);
  if(!Number.isFinite(n))return false;
  const next=Math.max(1,Math.min(10,n))*config.gridSize;
  if(manualCameraHeightPx!==null&&Math.abs(manualCameraHeightPx-next)<1e-9)return true;
  manualCameraHeightPx=next;
  tiltRevision++;
  return true;
}
function clearCameraHeight(){
  if(manualCameraHeightPx===null)return;
  manualCameraHeightPx=null;
  tiltRevision++;
}
function resolveHorizonY(viewportHeight=720,groundY=112){
  const h=Number(viewportHeight)||720;
  if(manualTiltDegrees!==null){
    const theta=manualTiltDegrees*Math.PI/180;
    return h*.5-config.baseDepth*Math.tan(theta);
  }
  if(manualHorizonRatio!==null)return h*manualHorizonRatio;
  return resolveAutoHorizonY(h,groundY);
}
function getHorizonRatio(viewportHeight=720,groundY=112){
  const h=Number(viewportHeight)||720;
  return resolveHorizonY(h,groundY)/h;
}
function getTiltDegrees(viewportHeight=720,groundY=112){
  if(manualTiltDegrees!==null)return manualTiltDegrees;
  const h=Number(viewportHeight)||720;
  const horizon=resolveHorizonY(h,groundY);
  return Math.atan((h*.5-horizon)/config.baseDepth)*180/Math.PI;
}
function resolveCameraHeight(viewportHeight=720,groundY=112){
  if(manualCameraHeightPx!==null)return manualCameraHeightPx;
  const h=Number(viewportHeight)||720;
  const g=Number(groundY)||112;
  return h-g-resolveHorizonY(h,g);
}
function getCameraHeightMeters(viewportHeight=720,groundY=112){
  return resolveCameraHeight(viewportHeight,groundY)/config.gridSize;
}

function project({
  worldX=0,worldZ=0,worldY=0,
  playerX=0,playerY=0,cameraZ=0,
  screenX=0,viewportHeight=720,groundY=112
}={}){
  // Z is authored scene depth only. Normal gameplay never moves cameraZ.
  const relativeZ=(Number(worldZ)||0)-(Number(cameraZ)||0);
  const depth=config.baseDepth+relativeZ;
  if(depth<=config.minDepth)return {visible:false,x:0,y:0,scale:0,depth};
  const scale=config.baseDepth/depth;
  const horizonY=resolveHorizonY(viewportHeight,groundY);
  const cameraHeight=resolveCameraHeight(viewportHeight,groundY);
  return {
    visible:depth<config.maxDepth&&scale>.12&&scale<5,
    x:(Number(screenX)||0)+((Number(worldX)||0)-(Number(playerX)||0))*scale,
    y:horizonY+(cameraHeight+(Number(playerY)||0)-(Number(worldY)||0))*scale,
    scale,
    depth
  };
}

function distance2D(ax=0,az=0,bx=0,bz=0){
  return Math.hypot((Number(ax)||0)-(Number(bx)||0),(Number(az)||0)-(Number(bz)||0));
}

function wrap(value,size=config.gridSize){
  const m=Math.max(1,Number(size)||config.gridSize);
  const v=Number(value)||0;
  return ((v%m)+m)%m;
}

global.PaperchalkCardCamera=Object.freeze({
  config,project,resolveHorizonY,getHorizonRatio,setHorizonRatio,clearHorizonRatio,
  getTiltDegrees,setTiltDegrees,clearTiltDegrees,
  resolveCameraHeight,getCameraHeightMeters,setCameraHeightMeters,clearCameraHeight,
  distance2D,wrap,
  get manualHorizonRatio(){return manualHorizonRatio},
  get manualTiltDegrees(){return manualTiltDegrees},
  get manualCameraHeightMeters(){return manualCameraHeightPx===null?null:manualCameraHeightPx/config.gridSize},
  get tiltRevision(){return tiltRevision}
});
})(window);

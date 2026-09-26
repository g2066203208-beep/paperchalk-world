/* Shared X/Y gameplay camera with authored Z scene depth. */
(function(global){
'use strict';
const FAR=1280;
let manualHorizonRatio=null,manualTiltDegrees=null,manualCameraHeightPx=null,manualCameraDistancePx=null,tiltRevision=0;
const config=Object.freeze({
 gridSize:128,baseDepth:3840,verticalFovDegrees:60,nearMainDepth:-640,nearMainScreenMargin:8,minDepth:96,maxDepth:10000,
 groundNearDepth:-704,farGroundDepth:FAR,wallDepth:FAR,
 sceneGuides:Object.freeze([
  Object.freeze({id:'near-front',label:'NF',band:'near',kind:'sub',z:-704}),
  Object.freeze({id:'near-main',label:'N',band:'near',kind:'main',z:-640}),
  Object.freeze({id:'near-back',label:'NB',band:'near',kind:'sub',z:-576}),
  Object.freeze({id:'mid-front',label:'MF',band:'mid',kind:'sub',z:-64}),
  Object.freeze({id:'mid-main',label:'M',band:'mid',kind:'main',z:0}),
  Object.freeze({id:'mid-back',label:'MB',band:'mid',kind:'sub',z:64}),
  Object.freeze({id:'far-front',label:'FF',band:'far',kind:'sub',z:576}),
  Object.freeze({id:'far-main',label:'F',band:'far',kind:'main',z:640}),
  Object.freeze({id:'far-back',label:'FB',band:'far',kind:'sub',z:704}),
  Object.freeze({id:'horizon',label:'H',band:'horizon',kind:'horizon',z:FAR})
 ])
});
const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function autoH(h=720,g=112){h=num(h,720);g=num(g,112);const foot=h-g,s=config.baseDepth/(config.baseDepth+config.nearMainDepth);return(h-config.nearMainScreenMargin-s*foot)/(1-s)}
function verticalFocalLength(h=720){h=num(h,720);return h*.5/Math.tan(config.verticalFovDegrees*Math.PI/360)}
function setHorizonRatio(v){v=Number(v);if(!Number.isFinite(v))return false;manualTiltDegrees=null;v=clamp(v,.04,.48);if(manualHorizonRatio===v)return true;manualHorizonRatio=v;tiltRevision++;return true}
function clearHorizonRatio(){if(manualHorizonRatio!==null){manualHorizonRatio=null;tiltRevision++}}
function setTiltDegrees(v){v=Number(v);if(!Number.isFinite(v))return false;manualHorizonRatio=null;v=clamp(v,0,45);if(manualTiltDegrees===v)return true;manualTiltDegrees=v;tiltRevision++;return true}
function clearTiltDegrees(){if(manualTiltDegrees!==null){manualTiltDegrees=null;tiltRevision++}}
function setCameraHeightMeters(v){v=Number(v);if(!Number.isFinite(v))return false;v=clamp(v,1,10)*config.gridSize;if(manualCameraHeightPx===v)return true;manualCameraHeightPx=v;tiltRevision++;return true}
function clearCameraHeight(){if(manualCameraHeightPx!==null){manualCameraHeightPx=null;tiltRevision++}}
function setCameraDistanceMeters(v){v=Number(v);if(!Number.isFinite(v))return false;v=clamp(v,6.5,60)*config.gridSize;if(manualCameraDistancePx===v)return true;manualCameraDistancePx=v;tiltRevision++;return true}
function clearCameraDistance(){if(manualCameraDistancePx!==null){manualCameraDistancePx=null;tiltRevision++}}
function resolveCameraDistance(){return manualCameraDistancePx===null?config.baseDepth:manualCameraDistancePx}
function getCameraDistanceMeters(){return resolveCameraDistance()/config.gridSize}
function resolveHorizonY(h=720,g=112){h=num(h,720);if(manualTiltDegrees!==null)return h*.5-verticalFocalLength(h)*Math.tan(manualTiltDegrees*Math.PI/180);if(manualHorizonRatio!==null)return h*manualHorizonRatio;return autoH(h,g)}
function getHorizonRatio(h=720,g=112){h=num(h,720);return resolveHorizonY(h,g)/h}
function getTiltDegrees(h=720,g=112){if(manualTiltDegrees!==null)return manualTiltDegrees;h=num(h,720);return Math.atan((h*.5-resolveHorizonY(h,g))/verticalFocalLength(h))*180/Math.PI}
function resolveCameraHeight(h=720,g=112){if(manualCameraHeightPx!==null)return manualCameraHeightPx;h=num(h,720);g=num(g,112);return h-g-resolveHorizonY(h,g)}
function getCameraHeightMeters(h=720,g=112){return resolveCameraHeight(h,g)/config.gridSize}
function project({worldX=0,worldZ=0,worldY=0,playerX=0,playerY=0,cameraZ=0,screenX=0,viewportHeight=720,groundY=112}={}){
 const z=num(worldZ,0)-num(cameraZ,0),depth=resolveCameraDistance()+z;
 if(depth<=config.minDepth)return{visible:false,x:0,y:0,scale:0,depth};
 const scale=config.baseDepth/depth,h=resolveHorizonY(viewportHeight,groundY);
 return{visible:depth<config.maxDepth&&scale>.12&&scale<5,x:num(screenX,0)+(num(worldX,0)-num(playerX,0))*scale,y:h+(resolveCameraHeight(viewportHeight,groundY)+num(playerY,0)-num(worldY,0))*scale,scale,depth};
}
function distance2D(ax=0,az=0,bx=0,bz=0){return Math.hypot(num(ax,0)-num(bx,0),num(az,0)-num(bz,0))}
function wrap(value,size=config.gridSize){const m=Math.max(1,num(size,config.gridSize)),v=num(value,0);return((v%m)+m)%m}
global.PaperchalkCardCamera=Object.freeze({
 config,project,resolveHorizonY,getHorizonRatio,setHorizonRatio,clearHorizonRatio,getTiltDegrees,setTiltDegrees,clearTiltDegrees,verticalFocalLength,
 resolveCameraHeight,getCameraHeightMeters,setCameraHeightMeters,clearCameraHeight,resolveCameraDistance,getCameraDistanceMeters,setCameraDistanceMeters,clearCameraDistance,distance2D,wrap,
 get manualHorizonRatio(){return manualHorizonRatio},get manualTiltDegrees(){return manualTiltDegrees},
 get manualCameraHeightMeters(){return manualCameraHeightPx===null?null:manualCameraHeightPx/config.gridSize},
 get manualCameraDistanceMeters(){return manualCameraDistancePx===null?null:manualCameraDistancePx/config.gridSize},get tiltRevision(){return tiltRevision}
});
})(window);

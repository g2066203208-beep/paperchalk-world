(function(global){
'use strict';
const FAR=1280,DH=4.1,DT=13.1,DD=30;
let tilt=DT,height=DH,distance=DD,revision=0;
const config=Object.freeze({
 gridSize:128,baseDepth:3840,defaultTiltDegrees:DT,defaultHeightMeters:DH,defaultDistanceMeters:DD,maxTiltDegrees:80,
 minDepth:96,maxDepth:10000,groundNearDepth:-704,farGroundDepth:FAR,wallDepth:FAR,
 sceneGuides:Object.freeze([
  Object.freeze({id:'near-front',band:'near',kind:'sub',z:-704}),
  Object.freeze({id:'near-main',band:'near',kind:'main',z:-640}),
  Object.freeze({id:'near-back',band:'near',kind:'sub',z:-576}),
  Object.freeze({id:'mid-front',band:'mid',kind:'sub',z:-64}),
  Object.freeze({id:'mid-main',band:'mid',kind:'main',z:0}),
  Object.freeze({id:'mid-back',band:'mid',kind:'sub',z:64}),
  Object.freeze({id:'far-front',band:'far',kind:'sub',z:576}),
  Object.freeze({id:'far-main',band:'far',kind:'main',z:640}),
  Object.freeze({id:'far-back',band:'far',kind:'sub',z:704}),
  Object.freeze({id:'horizon',band:'horizon',kind:'horizon',z:FAR})
 ])
});
const finite=v=>Number.isFinite(Number(v)),num=(v,d)=>finite(v)?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),touch=()=>revision++;
const rad=d=>d*Math.PI/180;
function setTiltDegrees(v){v=Number(v);if(!finite(v))return false;v=clamp(v,0,config.maxTiltDegrees);if(tilt===v)return true;tilt=v;touch();return true}
function setCameraHeightMeters(v){v=Number(v);if(!finite(v))return false;v=clamp(v,1,10);if(height===v)return true;height=v;touch();return true}
function setCameraDistanceMeters(v){v=Number(v);if(!finite(v))return false;v=clamp(v,6.5,60);if(distance===v)return true;distance=v;touch();return true}
function reset(){tilt=DT;height=DH;distance=DD;touch()}
function getTiltDegrees(){return tilt}
function getCameraHeightMeters(){return height}
function getCameraDistanceMeters(){return distance}
function resolveCameraDistance(){return distance*config.gridSize}
function resolveCameraHeight(){return height*config.gridSize}
function resolveMidY(h=720,g=112){h=num(h,720);g=num(g,112);return h-g+(height-DH)*config.gridSize}
function tiltFactor(){const s=Math.sin(rad(DT));return s?Math.sin(rad(tilt))/s:1}
function resolveHorizonY(h=720,g=112){
 const d=resolveCameraDistance(),mid=config.baseDepth/d;
 return resolveMidY(h,g)-resolveCameraHeight()*mid*tiltFactor();
}
function project({worldX=0,worldZ=0,worldY=0,playerX=0,playerY=0,cameraZ=0,screenX=0,viewportHeight=720,groundY=112}={}){
 const z=num(worldZ,0)-num(cameraZ,0),d=resolveCameraDistance(),depth=d+z;
 if(depth<=config.minDepth)return{visible:false,x:0,y:0,scale:0,depth};
 const scale=config.baseDepth/depth,mid=config.baseDepth/d;
 const y=resolveMidY(viewportHeight,groundY)+resolveCameraHeight()*(scale-mid)*tiltFactor()+(num(playerY,0)-num(worldY,0))*scale;
 return{visible:depth<config.maxDepth&&scale>.12&&scale<30,x:num(screenX,0)+(num(worldX,0)-num(playerX,0))*scale,y,scale,depth};
}
function distance2D(ax=0,az=0,bx=0,bz=0){return Math.hypot(num(ax,0)-num(bx,0),num(az,0)-num(bz,0))}
function wrap(value,size=config.gridSize){const m=Math.max(1,num(size,config.gridSize)),v=num(value,0);return((v%m)+m)%m}
global.PaperchalkCardCamera=Object.freeze({
 config,project,resolveHorizonY,resolveMidY,tiltFactor,resolveCameraHeight,resolveCameraDistance,
 getTiltDegrees,getCameraHeightMeters,getCameraDistanceMeters,setTiltDegrees,setCameraHeightMeters,setCameraDistanceMeters,reset,distance2D,wrap,
 get tiltRevision(){return revision}
});
})(window);

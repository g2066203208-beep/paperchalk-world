/* Shared X/Y gameplay camera with authored Z scene depth. DOM and Pixi consume this exact math. */
(function(global){
'use strict';

const FAR_GROUND_DEPTH=1200;
const config=Object.freeze({
  gridSize:128,
  baseDepth:900,
  horizonRatio:.40,
  minDepth:96,
  maxDepth:6400,
  // The playable ground is finite in scene-depth: it ends exactly where the
  // far sky wall meets the floor. Nothing behind this line needs ground grid.
  groundNearDepth:-384,
  farGroundDepth:FAR_GROUND_DEPTH,
  wallDepth:FAR_GROUND_DEPTH,
  sceneGuides:Object.freeze([
    Object.freeze({id:'near-front',label:'NF',band:'near',kind:'sub',z:-320}),
    Object.freeze({id:'near-main', label:'N', band:'near',kind:'main',z:-240}),
    Object.freeze({id:'near-back', label:'NB',band:'near',kind:'sub',z:-160}),
    Object.freeze({id:'mid-front', label:'MF',band:'mid', kind:'sub',z:-80}),
    Object.freeze({id:'mid-main',  label:'M', band:'mid', kind:'main',z:0}),
    Object.freeze({id:'mid-back',  label:'MB',band:'mid', kind:'sub',z:160}),
    Object.freeze({id:'far-front', label:'FF',band:'far', kind:'sub',z:400}),
    Object.freeze({id:'far-main',  label:'F', band:'far', kind:'main',z:600}),
    Object.freeze({id:'far-back',  label:'FB',band:'far', kind:'sub',z:850}),
    Object.freeze({id:'horizon',   label:'H', band:'horizon',kind:'horizon',z:FAR_GROUND_DEPTH})
  ])
});

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
  const horizonY=(Number(viewportHeight)||720)*config.horizonRatio;
  const playerFootY=(Number(viewportHeight)||720)-(Number(groundY)||0);
  const cameraHeight=playerFootY-horizonY;
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

global.PaperchalkCardCamera=Object.freeze({config,project,distance2D,wrap});
})(window);

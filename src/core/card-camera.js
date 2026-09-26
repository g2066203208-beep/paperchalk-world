/* Shared X/Z/Y projection for the open-card world. DOM and Pixi consume this exact math. */
(function(global){
'use strict';

const config=Object.freeze({
  gridSize:128,
  baseDepth:900,
  horizonRatio:.40,
  minDepth:96,
  maxDepth:6400,
  worldDepthLimit:1000000000,
  wallDepth:1200
});

function project({
  worldX=0,worldZ=0,worldY=0,
  playerX=0,playerZ=0,playerY=0,
  screenX=0,viewportHeight=720,groundY=112
}={}){
  const relativeZ=(Number(worldZ)||0)-(Number(playerZ)||0);
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

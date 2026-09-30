/* Finite voxel road for the real-world prologue.
 * Gameplay stays on one horizontal actor row; Z is finite visual depth only.
 * The road itself is generated as real voxels by the existing TerrainWorld.
 */
(function(global){
'use strict';

const Runtime=global.PaperchalkTerrainRuntime;
if(!Runtime)throw new Error('PaperchalkTerrainRuntime missing before prologue road');
const {TerrainWorld,TILE}=Runtime;
const P=TerrainWorld.prototype;
const original={
  terrainProfile:P.terrainProfile,
  generateVoxel:P.generateVoxel,
  generateBlackBackdropVoxel:P.generateBlackBackdropVoxel,
  chunkMayContainTerrain:P.chunkMayContainTerrain,
  stats:P.stats
};

function config(){
  return global.PaperchalkContent?.scene3d?.terrain?.prologueRoad||null;
}
function enabled(){
  return global.PaperchalkContent?.scene3d?.mode==='finite-side-scroll-voxel'&&!!config();
}
function inside(c,gx,gz){
  return gx>=c.minX&&gx<=c.maxX&&gz>=c.minZ&&gz<=c.maxZ;
}
function isRoad(c,gz){return gz>=c.roadMinZ&&gz<=c.roadMaxZ}
function isCrosswalk(c,gx,gz){
  if(!isRoad(c,gz)||gx<c.crosswalkMinX||gx>c.crosswalkMaxX)return false;
  return ((gx-c.crosswalkMinX)%2)===0;
}
function isLaneDash(c,gx,gz){
  if(gz!==c.laneMarkerZ||gx>=c.crosswalkMinX-2&&gx<=c.crosswalkMaxX+2)return false;
  const p=((gx-c.minX)%8+8)%8;
  return p<4;
}
function surfaceKind(c,gx,gz){
  if(isCrosswalk(c,gx,gz)||isLaneDash(c,gx,gz))return 'sand';
  if(isRoad(c,gz))return 'stone';
  if(gz===c.curbNearZ||gz===c.curbFarZ)return 'stone';
  if(gz>=c.sidewalkNearMinZ||gz<=c.sidewalkFarMaxZ)return 'clay';
  return 'grass';
}
function profile(c,gx,gz){
  const valid=inside(c,gx,gz);
  const kind=valid?surfaceKind(c,gx,gz):'stone';
  return {
    gx,gz,
    height:valid?c.surfaceY:c.groundMinY-64,
    heightFloat:valid?c.surfaceY:c.groundMinY-64,
    biome:'city-road',
    landform:'finite-prologue-street',
    surfaceKind:kind,
    subsurfaceKind:'dirt',
    riverMask:0,
    mountainMask:0
  };
}

P.terrainProfile=function(gx,gz=0){
  const c=config();
  return enabled()&&c?profile(c,gx,gz):original.terrainProfile.call(this,gx,gz);
};

P.generateVoxel=function(gx,gy,gz){
  const c=config();
  if(!enabled()||!c)return original.generateVoxel.call(this,gx,gy,gz);
  if(!inside(c,gx,gz)||gy>c.surfaceY||gy<c.groundMinY)return TILE.AIR;
  if(gy===c.surfaceY){
    const kind=surfaceKind(c,gx,gz);
    return kind==='sand'?TILE.SAND:kind==='clay'?TILE.CLAY:kind==='stone'?TILE.STONE:TILE.GRASS;
  }
  return gy>=c.surfaceY-2?TILE.DIRT:TILE.STONE;
};

P.generateBlackBackdropVoxel=function(gx,gy,gz=this.blackBackRowZ){
  const c=config();
  if(enabled()&&c)return TILE.AIR;
  return original.generateBlackBackdropVoxel.call(this,gx,gy,gz);
};

P.chunkMayContainTerrain=function(cx,cy,cz){
  const c=config();
  if(!enabled()||!c)return original.chunkMayContainTerrain.call(this,cx,cy,cz);
  const n=this.chunkSize;
  const minX=cx*n,maxX=minX+n-1,minZ=cz*n,maxZ=minZ+n-1,minY=cy*n,maxY=minY+n-1;
  if(maxX<c.minX||minX>c.maxX||maxZ<c.minZ||minZ>c.maxZ)return false;
  return maxY>=c.groundMinY&&minY<=c.surfaceY;
};

P.stats=function(){
  const base=original.stats.call(this);
  const c=config();
  if(!enabled()||!c)return base;
  return {
    ...base,
    infinite:false,
    dimensions:3,
    gameplayDimensions:2,
    zMovementLocked:true,
    finiteDepth:true,
    worldBounds:{minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ,minY:c.groundMinY,maxY:c.surfaceY},
    generator:'finite-prologue-voxel-road-v1'
  };
};

const defaultCamera=Object.freeze({
  yaw:0,pitch:.18,distance:19.2,height:.72,fov:36,
  stageView:Object.freeze({enabled:false,axis:'z',side:1})
});
let presentationApplied=false;
function applyPresentation(){
  if(presentationApplied||!enabled())return;
  const api=global.Paperchalk3D;
  if(!api?.ready)return;
  presentationApplied=true;
  api.setPaperStyle?.(false);
  const current=api.stats?.camera;
  if(!current)api.setCameraConfig?.({...defaultCamera,stageView:{...defaultCamera.stageView}});
}
global.addEventListener('paperchalk-3d-change',applyPresentation);
global.addEventListener('paperchalk-world-leave',()=>{presentationApplied=false});

global.PaperchalkPrologueRoad=Object.freeze({
  version:1,
  get enabled(){return enabled()},
  get config(){const c=config();return c?{...c}:null},
  stats(){
    const c=config();
    return {
      enabled:enabled(),
      voxel:true,
      finite:true,
      gameplayPlane:'x-y',
      zRole:'finite-visual-depth',
      roadMaterial:'stone-voxel',
      sidewalkMaterial:'clay-voxel',
      markingMaterial:'sand-voxel',
      bounds:c?{minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ}:null
    };
  }
});
})(window);

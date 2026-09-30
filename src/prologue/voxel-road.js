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
function inRange(v,min,max){return v>=min&&v<=max}
function isFarSidewalk(c,gz){return inRange(gz,c.farSidewalkMinZ,c.farSidewalkMaxZ)}
function isFarLane(c,gz){return inRange(gz,c.farLaneMinZ,c.farLaneMaxZ)}
function isNearLane(c,gz){return inRange(gz,c.nearLaneMinZ,c.nearLaneMaxZ)}
function isNearSidewalk(c,gz){return inRange(gz,c.nearSidewalkMinZ,c.nearSidewalkMaxZ)}
function isRoad(c,gz){return isFarLane(c,gz)||isNearLane(c,gz)}
function isSidewalk(c,gz){return isFarSidewalk(c,gz)||isNearSidewalk(c,gz)}
function isCrosswalk(c,gx,gz){
  if(!isRoad(c,gz)||gx<c.crosswalkMinX||gx>c.crosswalkMaxX)return false;
  return ((gx-c.crosswalkMinX)&1)===0;
}
function isCenterDash(c,gx,gz){
  // A full voxel is one metre wide, so use the inner far-lane row as the
  // coarse voxel centre marking instead of stealing another metre from either lane.
  if(gz!==c.farLaneMaxZ||gx>=c.crosswalkMinX-2&&gx<=c.crosswalkMaxX+2)return false;
  return ((gx-c.minX)%8)<4;
}
function surfaceKind(c,gx,gz){
  if(isCrosswalk(c,gx,gz)||isCenterDash(c,gx,gz))return 'sand';
  if(isRoad(c,gz))return 'stone';
  if(isSidewalk(c,gz))return 'clay';
  return 'stone';
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
    generator:'finite-prologue-voxel-road-96x10-v2'
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
  api.configureAtmosphere?.({volumetric:false,qualityScale:.25,steps:6});
  const current=api.stats?.camera;
  if(!current)api.setCameraConfig?.({...defaultCamera,stageView:{...defaultCamera.stageView}});
}
global.addEventListener('paperchalk-3d-change',applyPresentation);
global.addEventListener('paperchalk-world-leave',()=>{presentationApplied=false});

global.PaperchalkPrologueRoad=Object.freeze({
  version:2,
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
      metersPerVoxel:1,
      dimensions:c?{lengthMeters:c.lengthMeters,widthMeters:c.widthMeters}:null,
      crossSection:c?{
        farSidewalkMeters:c.farSidewalkMaxZ-c.farSidewalkMinZ+1,
        farLaneMeters:c.farLaneMaxZ-c.farLaneMinZ+1,
        nearLaneMeters:c.nearLaneMaxZ-c.nearLaneMinZ+1,
        nearSidewalkMeters:c.nearSidewalkMaxZ-c.nearSidewalkMinZ+1
      }:null,
      crosswalk:c?{minX:c.crosswalkMinX,maxX:c.crosswalkMaxX,lengthMeters:c.crosswalkMaxX-c.crosswalkMinX+1}:null,
      bounds:c?{minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ}:null
    };
  }
});
})(window);

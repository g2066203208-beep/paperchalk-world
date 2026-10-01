/* Authored prologue built from the visual-demo composition rules.
 * Gameplay stays voxel-authoritative; composition is a separate render layer.
 */
(function(global){
'use strict';
const TILE=()=>global.PaperchalkTerrainRuntime.TILE;
const ID='prologue-paper-diorama';
const COMPOSITION=Object.freeze({
 style:'visual-demo-v12.32-composition',
 terrain:'hand-authored-voxel-terraces',
 forestLayers:Object.freeze([
  Object.freeze({z:-9.5,count:14,span:36,jitter:1.0,scale:1.20}),
  Object.freeze({z:-14.0,count:18,span:43,jitter:1.5,scale:1.08}),
  Object.freeze({z:-19.0,count:22,span:50,jitter:2.0,scale:.96})
 ]),
 foregroundTrees:Object.freeze([
  Object.freeze({x:-21,z:-2.5,scale:1.55}),
  Object.freeze({x:-19,z:5.5,scale:1.35}),
  Object.freeze({x:21,z:-3.5,scale:1.55}),
  Object.freeze({x:19,z:6.5,scale:1.35})
 ]),
 mist:Object.freeze({banks:18,groundSheets:10,near:8,far:28}),
 principles:Object.freeze(['foreground-frame','midground-play-space','background-occluders','light-gaps','asymmetric-clusters'])
});
const PROLOGUE=Object.freeze({
 id:ID,name:'序幕 · 纸境林地',mode:'paper-diorama-3d',finite:true,
 spawn:Object.freeze({x:0,y:2,z:2,yaw:Math.PI}),
 bounds:Object.freeze({minX:-24,maxX:24,minY:-12,maxY:24,minZ:-22,maxZ:16}),
 camera:Object.freeze({yaw:.02,pitch:.18,distance:19.2,height:.15,fov:36,stageView:{enabled:false,axis:'z',side:1}}),
 view:Object.freeze({detailMeters:28,midMeters:48,maxMeters:90}),
 render:Object.freeze({profile:'visual-demo-v12.32',dprDesktop:1.22,dprMobile:1.05,volumetric:true,qualityScale:.40,steps:17,toneExposure:1.03}),
 terrain:Object.freeze({
  tileSize:1,pixelsPerMeter:128,texturePixels:128,chunkSize:16,seed:1232032,
  visibleChunkRadiusXZ:2,visibleChunkRadiusY:1,maxBuildsPerFrame:3,
  interactionRowZ:0,blackBackRowZ:-9999,groundMinY:-7
 }),
 layers:Object.freeze({far:-8,rear:-3,terrain:0,actor:.45,front:2.5}),
 composition:COMPOSITION,stageEntities:Object.freeze([])
});
function isTestRequest(){
 const q=new URLSearchParams(global.location?.search||'');
 return q.has('ci')||q.get('world')==='test';
}
function select(base){return isTestRequest()?Object.freeze({...base,id:'test-open-world',name:'测试大世界',finite:false}):PROLOGUE}
function inside(gx,gz){return gx>=-24&&gx<=23&&gz>=-22&&gz<=15}
function heightAt(gx,gz){
 if(!inside(gx,gz))return-9999;
 const ax=Math.abs(gx),az=Math.abs(gz);
 let h=0;
 if(ax>=19||gz<=-17||gz>=13)h=1;
 if(ax>=22||gz<=-20)h=2;
 if(gx<=-15&&gz<6)h=Math.max(h,1);
 if(gx>=14&&gz>-8)h=Math.max(h,1);
 if(gz<=-11&&Math.abs(gx)>8)h=Math.max(h,1);
 if(gz<=-16&&Math.abs(gx)>14)h=Math.max(h,2);
 if((gx+10)*(gx+10)+(gz+6)*(gz+6)<18)h=Math.max(h,1);
 if((gx-9)*(gx-9)+(gz-5)*(gz-5)<15)h=Math.max(h,1);
 if((gx+5)*(gx+5)+(gz-13)*(gz-13)<10)h=Math.max(h,2);
 if(Math.abs(gx)<=4&&gz>=-1&&gz<=5)h=0;
 return Math.min(3,h);
}
function configureTerrain(t,scene){
 if(scene?.id!==ID)return false;
 const baseStats=t.stats.bind(t),T=TILE(),minY=scene.terrain.groundMinY;
 t.biomeGenerator=null;t.biomeBackend='authored-diorama';t.noiseBackend='visual-demo-layout-v1';t.generatorVersion=6;t.blackBackRowZ=-9999;
 t.terrainProfile=(gx,gz=0)=>{
  const h=heightAt(gx,gz);
  return{gx,gz,height:h,heightFloat:h,biome:'paper-meadow',landform:'handmade-terrace',surfaceKind:'grass',subsurfaceKind:'dirt',riverMask:0,mountainMask:0};
 };
 t.generateVoxel=(gx,gy,gz)=>{
  const h=heightAt(gx,gz);
  if(h<-1000||gy>h||gy<minY)return T.AIR;
  if(gy===h)return T.GRASS;
  return gy>=h-2?T.DIRT:T.STONE;
 };
 t.generateBlackBackdropVoxel=(gx,gy,gz)=>t.generateVoxel(gx,gy,gz);
 t.chunkMayContainTerrain=(cx,cy,cz)=>{
  const n=t.chunkSize,x0=cx*n,x1=x0+n-1,z0=cz*n,z1=z0+n-1,y0=cy*n,y1=y0+n-1;
  return !(x1<-24||x0>23||z1<-22||z0>15||y1<minY||y0>3);
 };
 t.surfaceRangeCache.clear();t.biomeChunkCache.clear();
 t.stats=()=>({...baseStats(),infinite:false,finite:true,sceneId:ID,mode:scene.mode,
  worldBounds:{minX:-24,maxX:23,minY,maxY:3,minZ:-22,maxZ:15},
  diorama:{style:COMPOSITION.style,sizeMeters:[48,38],authoredTerraces:true,forestLayers:3,mistBanks:COMPOSITION.mist.banks}
 });
 return true;
}
function entities(defaults,scene){return scene.id===ID?[]:defaults}
function quests(defaults,scene){return scene.id===ID?[]:defaults}
function world(defaultWorld,scene){return scene.id===ID?{nodes:[],routes:[]}:defaultWorld}
function collidesAABB(){return false}
function clampPlayer(p,scene,halfW=.34,halfD=.28){
 if(!scene.finite)return;
 p.x=Math.max(scene.bounds.minX+halfW,Math.min(scene.bounds.maxX-halfW,p.x));
 p.z=Math.max(scene.bounds.minZ+halfD,Math.min(scene.bounds.maxZ-halfD,p.z));
}
function saveSuffix(scene){return'@'+(scene.id||scene.mode||'world')}
global.PaperchalkSceneRuntime=Object.freeze({prologue:PROLOGUE,select,configureTerrain,collidesAABB,entities,quests,world,clampPlayer,saveSuffix,heightAt});
})(window);

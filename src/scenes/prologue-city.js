(function(global){
'use strict';
const TILE=()=>global.PaperchalkTerrainRuntime.TILE;
const PROLOGUE=Object.freeze({
 id:'prologue-school-street',
 name:'序章 · 学校街区',
 mode:'prologue-city-3d',
 finite:true,
 spawn:Object.freeze({x:24.5,y:2,z:-14.5,yaw:Math.PI*.5}),
 bounds:Object.freeze({minX:0,maxX:180,minY:-16,maxY:32,minZ:-28,maxZ:28}),
 camera:Object.freeze({yaw:0,pitch:.12,distance:18,height:3.2,fov:42,stageView:{enabled:false,axis:'z',side:1}}),
 view:Object.freeze({detailMeters:30,midMeters:60,maxMeters:120}),
 terrain:Object.freeze({
  tileSize:1,pixelsPerMeter:128,texturePixels:128,chunkSize:16,seed:1357911,
  visibleChunkRadiusXZ:2,visibleChunkRadiusY:1,maxBuildsPerFrame:3,
  interactionRowZ:-15,blackBackRowZ:-9999,
  groundMinY:-8,surfaceY:0,
  crossSection:Object.freeze({
   rearBuilding:Object.freeze({minZ:-28,maxZ:-17,width:12}),
   rearSidewalk:Object.freeze({minZ:-16,maxZ:-13,width:4}),
   rearBike:Object.freeze({minZ:-12,maxZ:-10,width:3}),
   rearBuffer:Object.freeze({minZ:-9,maxZ:-9,width:1}),
   rearMotor:Object.freeze({minZ:-8,maxZ:-2,width:7}),
   median:Object.freeze({minZ:-1,maxZ:0,width:2}),
   frontMotor:Object.freeze({minZ:1,maxZ:7,width:7}),
   frontBuffer:Object.freeze({minZ:8,maxZ:8,width:1}),
   frontBike:Object.freeze({minZ:9,maxZ:11,width:3}),
   frontSidewalk:Object.freeze({minZ:12,maxZ:15,width:4}),
   frontBuilding:Object.freeze({minZ:16,maxZ:27,width:12})
  })
 }),
 layers:Object.freeze({far:-8,rear:-3,terrain:0,actor:.45,front:2.5}),
 schoolFence:Object.freeze({
  grid:Object.freeze({rearCellZ:-17,sidewalkCellZ:-16,surfaceCellY:0,startXEdge:4,endXEdge:84,gateStartXEdge:20,gateEndXEdge:28,panelCells:4}),
  panel:Object.freeze({height:1.8,metalHeight:1.45,baseHeight:.35,thickness:.12}),
  post:Object.freeze({width:.28,height:2.05}),
  gate:Object.freeze({openingCells:8,pillarWidth:.65,pillarHeight:2.8,leafHeight:1.8})
 }),
 stageEntities:Object.freeze([])
});
function isTestRequest(){
 const q=new URLSearchParams(global.location?.search||'');
 return q.has('ci')||q.get('world')==='test';
}
function testScene(base){
 return Object.freeze({...base,id:'test-open-world',name:'测试大世界',finite:false});
}
function select(base){return isTestRequest()?testScene(base):PROLOGUE}
function range(v,r){return v>=r.minZ&&v<=r.maxZ}
function zone(scene,gz){
 const c=scene.terrain.crossSection;
 if(range(gz,c.rearBuilding)||range(gz,c.frontBuilding))return'building';
 if(range(gz,c.rearSidewalk)||range(gz,c.frontSidewalk))return'sidewalk';
 if(range(gz,c.rearBike)||range(gz,c.frontBike))return'bike';
 if(range(gz,c.rearBuffer)||range(gz,c.frontBuffer)||range(gz,c.median))return'green';
 if(range(gz,c.rearMotor)||range(gz,c.frontMotor))return'road';
 return'outside';
}
function inBounds(scene,gx,gz){return gx>=0&&gx<180&&gz>=-28&&gz<=27}
function surfaceKind(scene,gx,gz){
 const z=zone(scene,gz);
 if(z==='road'){
  const divider=gz===-5||gz===4;
  if(divider&&((gx%8)+8)%8<4)return'sand';
  return'stone';
 }
 if(z==='sidewalk')return'clay';
 if(z==='bike')return'sand';
 if(z==='green'||z==='building')return'grass';
 return'air';
}
function configureTerrain(t,scene){
 if(scene!==PROLOGUE&&scene.id!==PROLOGUE.id)return false;
 const baseStats=t.stats.bind(t),T=TILE(),minY=scene.terrain.groundMinY,maxY=scene.terrain.surfaceY;
 t.biomeGenerator=null;t.biomeBackend='authored-city';t.noiseBackend='authored-prologue-city-v1';t.generatorVersion=5;t.blackBackRowZ=-9999;
 t.terrainProfile=(gx,gz=0)=>{
  const inside=inBounds(scene,gx,gz),kind=inside?surfaceKind(scene,gx,gz):'air',h=inside?maxY:-9999;
  return{gx,gz,height:h,heightFloat:h,biome:'modern-city',landform:'flat-street',surfaceKind:kind==='air'?'grass':kind,subsurfaceKind:'dirt',riverMask:0,mountainMask:0};
 };
 t.generateVoxel=(gx,gy,gz)=>{
  if(!inBounds(scene,gx,gz)||gy>maxY||gy<minY)return T.AIR;
  if(gy===maxY){const k=surfaceKind(scene,gx,gz);return k==='stone'?T.STONE:k==='sand'?T.SAND:k==='clay'?T.CLAY:T.GRASS}
  return gy>=maxY-2?T.DIRT:T.STONE;
 };
 t.generateBlackBackdropVoxel=(gx,gy,gz)=>t.generateVoxel(gx,gy,gz);
 t.chunkMayContainTerrain=(cx,cy,cz)=>{
  const n=t.chunkSize,x0=cx*n,x1=x0+n-1,z0=cz*n,z1=z0+n-1,y0=cy*n,y1=y0+n-1;
  return !(x1<0||x0>179||z1<-28||z0>27||y1<minY||y0>maxY);
 };
 t.surfaceRangeCache.clear();t.biomeChunkCache.clear();
 t.stats=()=>({...baseStats(),infinite:false,finite:true,sceneId:scene.id,mode:scene.mode,
  worldBounds:{minX:0,maxX:179,minY,maxY,minZ:-28,maxZ:27},
  street:{lengthMeters:180,depthMeters:56,playerSide:'rear-sidewalk',spawnZ:scene.spawn.z,crossSection:scene.terrain.crossSection}
 });
 return true;
}
function schoolFenceMetrics(scene){
 const f=scene.schoolFence,g=f?.grid,s=scene.terrain.tileSize||1;
 if(!f||!g)return null;
 const z=(g.rearCellZ+g.sidewalkCellZ)*.5*s,groundTop=(g.surfaceCellY+1)*s;
 const panels=[];
 for(let x=g.startXEdge;x<g.gateStartXEdge;x+=g.panelCells)panels.push([x,x+g.panelCells]);
 for(let x=g.gateEndXEdge;x<g.endXEdge;x+=g.panelCells)panels.push([x,x+g.panelCells]);
 return{z,groundTop,panels,posts:[g.startXEdge,...panels.map(p=>p[1])].filter((v,i,a)=>a.indexOf(v)===i&&v!==g.gateStartXEdge&&v!==g.gateEndXEdge),gate:[g.gateStartXEdge,g.gateEndXEdge],frontageCells:g.endXEdge-g.startXEdge,gateCells:g.gateEndXEdge-g.gateStartXEdge};
}
function collidesScene(scene,x,y,z,hw,hh,hd){
 const m=schoolFenceMetrics(scene),f=scene.schoolFence;if(!m)return false;
 const z0=m.z-f.panel.thickness*.5,z1=m.z+f.panel.thickness*.5,y0=m.groundTop,y1=y0+f.panel.height;
 const fenceY=y+hh>y0&&y-hh<y1,fenceZ=z+hd>z0&&z-hd<z1;
 if(fenceY&&fenceZ){
  for(const [a,b] of m.panels)if(x+hw>a&&x-hw<b)return true;
  for(const px of m.gate)if(x+hw>px-f.gate.pillarWidth*.5&&x-hw<px+f.gate.pillarWidth*.5)return true;
 }
 return false;
}
function entities(defaults,scene){return scene.id===PROLOGUE.id?[]:defaults}
function quests(defaults,scene){return scene.id===PROLOGUE.id?[]:defaults}
function world(defaultWorld,scene){return scene.id===PROLOGUE.id?{nodes:[],routes:[]}:defaultWorld}
function clampPlayer(p,scene,halfW=.34,halfD=.28){
 if(!scene.finite)return;
 p.x=Math.max(scene.bounds.minX+halfW,Math.min(scene.bounds.maxX-halfW,p.x));
 p.z=Math.max(scene.bounds.minZ+halfD,Math.min(scene.bounds.maxZ-halfD,p.z));
}
function saveSuffix(scene){return'@'+(scene.id||scene.mode||'world')}
global.PaperchalkSceneRuntime=Object.freeze({prologue:PROLOGUE,select,configureTerrain,schoolFenceMetrics,collidesAABB:collidesScene,entities,quests,world,clampPlayer,saveSuffix});
})(window);

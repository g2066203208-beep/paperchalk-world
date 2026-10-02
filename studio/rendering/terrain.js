/** Culled collision cubes dressed with layered pulp and torn turf edges. */
import {createGrassRimGeometry,createPolygonalTerrainGeometry} from './terrain-geometry.js';
import {createTerrainDressing} from './terrain-dressing.js';
import {createStorybookPaperMaps,STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from './storybook-paper-maps.js';

export function createTerrain({THREE,scene,renderer,flags,loadTexture,paperConfig,
  paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet,paperMapController}){
const TERRAIN_TOP_COLOR=STORYBOOK_PAPER_PALETTE.grass;
const TERRAIN_DIRT_COLOR=STORYBOOK_PAPER_PALETTE.dirt;
// The grid remains the source of truth. Rendering receives quiet coloured-paper
// stocks so bevels, AO and shafts provide the depth instead of scanned grit.
const storybook=(paperGrassSet&&paperDirtSet)?null:createStorybookPaperMaps({THREE,renderer});
paperGrassSet??=storybook.paperGrassSet;
paperDirtSet??=storybook.paperDirtSet;
paperLeafSet??=storybook.paperLeafSet;
paperTrunkSet??=storybook.paperTrunkSet;
const grassColor=paperGrassSet.color,dirtColor=paperDirtSet.color;

const terrainDirtMat=new THREE.MeshPhysicalMaterial({
  color:0xffffff,map:dirtColor,normalMap:null,
  normalScale:new THREE.Vector2(0,0),roughnessMap:null,
  aoMap:null,aoMapIntensity:0,roughness:1,metalness:0,
  specularIntensity:.05,ior:1.38,sheen:0,clearcoat:0,
  side:THREE.FrontSide
});
terrainDirtMat.name='storybook-terrain-soft-clay-paper';
const terrainTopMat=new THREE.MeshPhysicalMaterial({
  color:0xffffff,
  map:grassColor,
  normalMap:null,
  normalScale:new THREE.Vector2(0,0),
  roughnessMap:null,
  aoMap:null,
  aoMapIntensity:0,
  roughness:1,
  metalness:0,
  specularIntensity:.05,ior:1.38,sheen:0,clearcoat:0,
  side:THREE.FrontSide
});
terrainTopMat.name='storybook-terrain-sage-paper';
let surfaceMode='pulp';

const terrain=new THREE.Group();
terrain.name='terrain-layered-paper-pulp-plateaus';
scene.add(terrain);

const columnRecords=[];
let terrainBlockCount=0;

for(let z=-3;z<=3;z++)for(let x=-7;x<=7;x++){
  let h=0;
  if(x<-5||x>5)h=1;
  if((x<-6&&z<1)||(x>5&&z>0))h=2;
  if((x===-4||x===4)&&Math.abs(z)>1)h=1;
  if(z===3&&Math.abs(x)>2)h++;
  if((x===-2&&z===-2)||(x===3&&z===2))h++;
  // Scenic plateaus sit behind and in front of the fixed z=0 walking lane.
  // Broad 2-cell shelves frame the subject like the reference paper diorama.
  if(z!==0){
    if(z===-1&&x>=-4&&x<=-3)h=1;
    if((z===-1||z===-2)&&x>=3&&x<=4)h=1;
    if(z>=2&&(x===-3||x===3))h=1;
    if(z===2&&(x===-2||x===2))h=1;
  }

  columnRecords.push({x,z,h,columnIndex:columnRecords.length});
  terrainBlockCount+=h+1;
}



// Render geometry is made from layered paperboard outlines; columnRecords stay
// the exact collision contract. Adjacent cells are unioned per height layer so
// the camera sees one continuous cut sheet instead of a checkerboard of cubes.
let terrainSurfaceGeo=createPolygonalTerrainGeometry({THREE,columnRecords});
let terrainVisibleFaceCount=terrainSurfaceGeo.userData.visibleFaces;

const terrainBlocks=new THREE.Mesh(
  terrainSurfaceGeo,
  [terrainDirtMat,terrainTopMat]
);
terrainBlocks.castShadow=true;
terrainBlocks.receiveShadow=true;
terrainBlocks.frustumCulled=true;
terrain.add(terrainBlocks);

// One merged boundary mesh, inherited visibility from the base terrain. Its
// grass skirt is render-only: footsteps and platform collisions stay exact.
let grassRimGeometry=createGrassRimGeometry({THREE,columnRecords});
const terrainRimMat=terrainTopMat.clone();
terrainRimMat.name='storybook-terrain-cut-edge';
terrainRimMat.onBeforeCompile=shader=>{
  shader.uniforms.pulpCoreColor={value:new THREE.Color(STORYBOOK_PAPER_PALETTE.edge)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float pulpCore;\nvarying float vPulpCore;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvPulpCore=pulpCore;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 pulpCoreColor;\nvarying float vPulpCore;')
    .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,pulpCoreColor,vPulpCore*.18);');
};
terrainRimMat.customProgramCacheKey=()=> 'storybook-terrain-cut-edge-v2';
const terrainGrassRim=new THREE.Mesh(grassRimGeometry,terrainRimMat);
terrainGrassRim.name='terrain-torn-grass-rim';
terrainGrassRim.castShadow=true;
terrainGrassRim.receiveShadow=true;
terrainBlocks.add(terrainGrassRim);
let dressing=createTerrainDressing({THREE,parent:terrainBlocks,columnRecords,grassMaterial:terrainTopMat});

const terrainOriginalFaceCount=terrainBlockCount*6;
const terrainCulledFaceCount=terrainOriginalFaceCount-terrainVisibleFaceCount;
console.info(
  '[terrain] voxel face culling:',
  terrainBlockCount+' blocks,',
  terrainVisibleFaceCount+'/'+terrainOriginalFaceCount+' faces submitted,',
  terrainCulledFaceCount+' hidden faces removed'
);

function setSurfaceMode(mode){
  if(mode!=='color'&&mode!=='pulp')throw new RangeError('Unknown terrain surface mode: '+mode);
  const pulp=mode==='pulp';
  surfaceMode=mode;
  terrainTopMat.name=pulp?'storybook-terrain-sage-paper':'terrain-grass-solid-color';
  terrainTopMat.color.setHex(pulp?0xffffff:TERRAIN_TOP_COLOR);
  terrainTopMat.map=pulp?grassColor:null;
  terrainTopMat.normalMap=null;
  terrainTopMat.roughnessMap=null;
  terrainTopMat.aoMap=null;
  terrainTopMat.roughness=1;
  terrainTopMat.needsUpdate=true;
  for(const name of ['map','normalMap','roughnessMap','aoMap'])terrainRimMat[name]=terrainTopMat[name];
  terrainRimMat.color.copy(terrainTopMat.color);
  terrainRimMat.roughness=terrainTopMat.roughness;
  terrainRimMat.needsUpdate=true;
  terrainDirtMat.name=pulp?'storybook-terrain-soft-clay-paper':'terrain-dirt-solid-color';
  terrainDirtMat.color.setHex(pulp?0xffffff:TERRAIN_DIRT_COLOR);
  terrainDirtMat.map=pulp?dirtColor:null;
  terrainDirtMat.normalMap=null;
  terrainDirtMat.roughnessMap=null;
  terrainDirtMat.aoMap=null;
  terrainDirtMat.roughness=1;
  terrainDirtMat.needsUpdate=true;
  terrainGrassRim.visible=pulp;
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=true;
  return surfaceMode;
}

// Compatibility with stored studio toggles; this never enables old paper noise.
function rebuildMaterialRandomness(on=true){return setSurfaceMode(on?'pulp':'color');}

function surfaceY(x,z=0){
  const column=columnRecords.find(c=>c.x===Math.round(x)&&c.z===Math.round(z));
  return column?column.h+.5:null;
}

function syncColumns(laneRecords=[]){
  if(!Array.isArray(laneRecords))throw new TypeError('Terrain columns must be an array');
  const hasScenicColumns=laneRecords.some(column=>column&&Number(column.z)!==0);
  if(hasScenicColumns){
    // Full snapshots are accepted for save/load and editor updates. Preserve
    // stable integer coordinates while keeping the caller's array untouched.
    columnRecords.splice(0,columnRecords.length,...laneRecords.map((column,index)=>({
      x:Math.round(Number(column.x)),z:Math.round(Number(column.z)),
      h:Math.floor(Number.isFinite(column.h)?column.h:0),columnIndex:Number.isFinite(column.columnIndex)?column.columnIndex:index
    })).filter(column=>Number.isFinite(column.x)&&Number.isFinite(column.z)&&Number.isFinite(column.h)));
  }else{
    const next=new Map(laneRecords.filter(column=>column&&Number.isFinite(column.x)).map(column=>[Math.round(column.x),Math.floor(column.h)]));
    for(const column of columnRecords){
      if(column.z!==0)continue;
      const height=next.get(column.x);
      column.h=Number.isFinite(height)?height:-1;
    }
  }
  terrainBlockCount=columnRecords.reduce((sum,column)=>sum+Math.max(0,column.h+1),0);
  const nextSurface=createPolygonalTerrainGeometry({THREE,columnRecords});
  const nextRim=createGrassRimGeometry({THREE,columnRecords});
  terrainBlocks.geometry.dispose();terrainBlocks.geometry=nextSurface;
  terrainGrassRim.geometry.dispose();terrainGrassRim.geometry=nextRim;
  terrainSurfaceGeo=nextSurface;grassRimGeometry=nextRim;
  terrainVisibleFaceCount=nextSurface.userData.visibleFaces;
  terrainGrassRim.visible=surfaceMode==='pulp';
  if(dressing?.group?.parent)dressing.group.parent.remove(dressing.group);
  dressing?.dispose?.();
  dressing=createTerrainDressing({THREE,parent:terrainBlocks,columnRecords,grassMaterial:terrainTopMat});
  flags.render=flags.shadow=flags.depth=flags.volumeShadow=flags.ao=true;
  return columnRecords.map(column=>({...column}));
}

function setPaper(next={}){
  if(Number.isFinite(next.scale))paperConfig.scale=Math.max(.05,next.scale);
  if(Number.isFinite(next.normal))paperConfig.normal=Math.max(0,Math.min(3,next.normal));
  // The normal maps hold fiber relief. Grass-edge thickness is actual geometry;
  // it does not offset or disturb the collision height field.
  paperConfig.height=0;
  paperConfig.blend=0;
  const scale=Number.isFinite(paperConfig.scale)&&paperConfig.scale>0?paperConfig.scale:STORYBOOK_PAPER_DEFAULTS.scale;
  (paperMapController??storybook)?.setScale(scale);
  terrainTopMat.normalScale.set(0,0);
  terrainDirtMat.normalScale.set(0,0);
  terrainRimMat.normalScale.copy(terrainTopMat.normalScale);
  flags.render=true;
}
setPaper(paperConfig);
return {terrain,terrainBlocks,terrainGrassRim,grassRim:terrainGrassRim,get dressing(){return dressing;},columnRecords,surfaceY,syncColumns,replaceColumns:syncColumns,setPaper,setSurfaceMode,
  pulpSets:{paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet},
  getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness,
  textures:storybook?.textures??[paperGrassSet.color,paperDirtSet.color,paperLeafSet.color,paperTrunkSet.color],
  stats:()=>({columns:columnRecords.length,blocks:terrainBlockCount,visibleFaces:terrainVisibleFaceCount,
    triangles:terrainSurfaceGeo.userData.triangles+(terrainGrassRim.visible?grassRimGeometry.userData.triangles:0),
    baseTriangles:terrainSurfaceGeo.userData.triangles,bevelTriangles:terrainSurfaceGeo.userData.bevelTriangles,grassRimTriangles:grassRimGeometry.userData.triangles,
    rimFaces:grassRimGeometry.userData.triangles/2,
    grassRimEdges:grassRimGeometry.userData.boundaryEdges,
    tufts:dressing.tufts,stones:dressing.stones,
    surfaceMode,textureSet:'Storybook Flat Paper',textureResolution:256})};
}

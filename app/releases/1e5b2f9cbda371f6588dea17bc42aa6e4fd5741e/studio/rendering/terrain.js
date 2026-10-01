/** Culled collision cubes dressed with layered pulp and torn turf edges. */
import {createOliveFiberMaps} from './olive-fiber-maps.js';
import {createGrassRimGeometry,createBeveledTerrainGeometry} from './terrain-geometry.js';
import {createTerrainDressing} from './terrain-dressing.js';

export function createTerrain({THREE,scene,renderer,flags,loadTexture,paperConfig}){
const TERRAIN_TOP_COLOR=0x8fae68;
const TERRAIN_DIRT_COLOR=0x8b654c;
const olive=createOliveFiberMaps({THREE,renderer,flags,loadTexture});
// During a staged asset rollout old maps may still be served once; keep the
// renderer readable by borrowing the grass maps until the soil set arrives.
const dirtColor=olive.dirtColor??olive.color;
const dirtNormal=olive.dirtNormal??olive.normal;
const dirtOrm=olive.dirtOrm??olive.orm;

const terrainDirtMat=new THREE.MeshPhysicalMaterial({
  color:0xffffff,map:dirtColor,normalMap:dirtNormal,
  normalScale:new THREE.Vector2(.65,.65),roughnessMap:dirtOrm,
  aoMap:dirtOrm,aoMapIntensity:.42,roughness:1,metalness:0,
  specularIntensity:.20,ior:1.38,sheen:.055,sheenColor:0xd6b996,sheenRoughness:1,
  side:THREE.FrontSide
});
terrainDirtMat.name='terrain-dirt-fibrous-pulp';
const terrainTopMat=new THREE.MeshPhysicalMaterial({
  color:0xffffff,
  map:olive.color,
  normalMap:olive.normal,
  normalScale:new THREE.Vector2(.85,.85),
  roughnessMap:olive.orm,
  aoMap:olive.orm,
  aoMapIntensity:.38,
  roughness:1,
  metalness:0,
  specularIntensity:.18,ior:1.38,sheen:.07,sheenColor:0xc7c79a,sheenRoughness:1,
  side:THREE.FrontSide
});
terrainTopMat.name='terrain-grass-olive-fiber';
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



// Render geometry gets narrow convex chamfers; columnRecords remain the exact
// collision contract. Coplanar tiles merge visually with uninterrupted UVs.
const terrainSurfaceGeo=createBeveledTerrainGeometry({THREE,columnRecords});
const terrainVisibleFaceCount=terrainSurfaceGeo.userData.visibleFaces;

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
const grassRimGeometry=createGrassRimGeometry({THREE,columnRecords});
const terrainRimMat=terrainTopMat.clone();
terrainRimMat.name='terrain-torn-fibre-core';
terrainRimMat.onBeforeCompile=shader=>{
  shader.uniforms.pulpCoreColor={value:new THREE.Color(0xafa56c)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float pulpCore;\nvarying float vPulpCore;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvPulpCore=pulpCore;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 pulpCoreColor;\nvarying float vPulpCore;')
    .replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,pulpCoreColor,vPulpCore*.48);');
};
terrainRimMat.customProgramCacheKey=()=> 'terrain-torn-fibre-core-v1';
const terrainGrassRim=new THREE.Mesh(grassRimGeometry,terrainRimMat);
terrainGrassRim.name='terrain-torn-grass-rim';
terrainGrassRim.castShadow=true;
terrainGrassRim.receiveShadow=true;
terrainBlocks.add(terrainGrassRim);
const dressing=createTerrainDressing({THREE,parent:terrainBlocks,columnRecords,grassMaterial:terrainTopMat});

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
  terrainTopMat.name=pulp?'terrain-grass-olive-fiber':'terrain-grass-solid-color';
  terrainTopMat.color.setHex(pulp?0xffffff:TERRAIN_TOP_COLOR);
  terrainTopMat.map=pulp?olive.color:null;
  terrainTopMat.normalMap=pulp?olive.normal:null;
  terrainTopMat.roughnessMap=pulp?olive.orm:null;
  terrainTopMat.aoMap=pulp?olive.orm:null;
  terrainTopMat.roughness=pulp?1:.94;
  terrainTopMat.needsUpdate=true;
  for(const name of ['map','normalMap','roughnessMap','aoMap'])terrainRimMat[name]=terrainTopMat[name];
  terrainRimMat.color.copy(terrainTopMat.color);
  terrainRimMat.roughness=terrainTopMat.roughness;
  terrainRimMat.needsUpdate=true;
  terrainDirtMat.name=pulp?'terrain-dirt-fibrous-pulp':'terrain-dirt-solid-color';
  terrainDirtMat.color.setHex(pulp?0xffffff:TERRAIN_DIRT_COLOR);
  terrainDirtMat.map=pulp?dirtColor:null;
  terrainDirtMat.normalMap=pulp?dirtNormal:null;
  terrainDirtMat.roughnessMap=pulp?dirtOrm:null;
  terrainDirtMat.aoMap=pulp?dirtOrm:null;
  terrainDirtMat.roughness=pulp?1:.94;
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

function setPaper(next={}){
  if(Number.isFinite(next.scale))paperConfig.scale=Math.max(.05,next.scale);
  if(Number.isFinite(next.normal))paperConfig.normal=Math.max(0,Math.min(3,next.normal));
  // The normal maps hold fiber relief. Grass-edge thickness is actual geometry;
  // it does not offset or disturb the collision height field.
  paperConfig.height=0;
  paperConfig.blend=0;
  olive.setScale(paperConfig.scale);
  terrainTopMat.normalScale.setScalar(paperConfig.normal);
  terrainDirtMat.normalScale.setScalar(paperConfig.normal*.92);
  terrainRimMat.normalScale.copy(terrainTopMat.normalScale);
  flags.render=true;
}
setPaper(paperConfig);
return {terrain,terrainBlocks,terrainGrassRim,grassRim:terrainGrassRim,dressing,columnRecords,surfaceY,setPaper,setSurfaceMode,
  pulpSets:{paperGrassSet:{color:olive.color,normal:olive.normal,roughness:olive.orm,ao:olive.orm},paperDirtSet:{color:dirtColor,normal:dirtNormal,roughness:dirtOrm,ao:dirtOrm}},
  getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness,
  textures:olive.textures,
  stats:()=>({columns:columnRecords.length,blocks:terrainBlockCount,visibleFaces:terrainVisibleFaceCount,
    triangles:terrainSurfaceGeo.userData.triangles+(terrainGrassRim.visible?grassRimGeometry.userData.triangles:0),
    baseTriangles:terrainSurfaceGeo.userData.triangles,bevelTriangles:terrainSurfaceGeo.userData.bevelTriangles,grassRimTriangles:grassRimGeometry.userData.triangles,
    rimFaces:grassRimGeometry.userData.triangles/2,
    grassRimEdges:grassRimGeometry.userData.boundaryEdges,
    tufts:dressing.tufts,stones:dressing.stones,
    surfaceMode,textureSet:'Layered Olive Pulp',textureResolution:1024})};
}

/** Culled collision cubes dressed with layered pulp and torn turf edges. */
import {createOliveFiberMaps} from './olive-fiber-maps.js';
import {createGrassRimGeometry} from './terrain-geometry.js';
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

const terrainDirtMat=new THREE.MeshStandardMaterial({
  color:0xffffff,map:dirtColor,normalMap:dirtNormal,
  normalScale:new THREE.Vector2(.65,.65),roughnessMap:dirtOrm,
  aoMap:dirtOrm,aoMapIntensity:.25,roughness:1,metalness:0,side:THREE.FrontSide
});
terrainDirtMat.name='terrain-dirt-fibrous-pulp';
const terrainTopMat=new THREE.MeshStandardMaterial({
  color:0xffffff,
  map:olive.color,
  normalMap:olive.normal,
  normalScale:new THREE.Vector2(.85,.85),
  roughnessMap:olive.orm,
  aoMap:olive.orm,
  aoMapIntensity:.3,
  roughness:1,
  metalness:0,
  side:THREE.FrontSide
});
terrainTopMat.name='terrain-grass-olive-fiber';
let surfaceMode='pulp';

const terrain=new THREE.Group();
terrain.name='terrain-layered-paper-pulp-plateaus';
scene.add(terrain);

const columnRecords=[];
const terrainVoxels=new Set();
let terrainBlockCount=0;

function voxelKey(x,y,z){return x+','+y+','+z}

for(let z=-3;z<=3;z++)for(let x=-7;x<=7;x++){
  let h=0;
  if(x<-5||x>5)h=1;
  if((x<-6&&z<1)||(x>5&&z>0))h=2;
  if((x===-4||x===4)&&Math.abs(z)>1)h=1;
  if(z===3&&Math.abs(x)>2)h++;
  if((x===-2&&z===-2)||(x===3&&z===2))h++;

  columnRecords.push({x,z,h,columnIndex:columnRecords.length});
  for(let y=0;y<=h;y++){
    terrainVoxels.add(voxelKey(x,y,z));
    terrainBlockCount++;
  }
}



const HALF=.5;
const VOXEL_FACES=[
  // +X
  {d:[ 1, 0, 0],n:[ 1, 0, 0],top:false,c:[
    [ HALF,-HALF,-HALF],[ HALF, HALF,-HALF],[ HALF, HALF, HALF],[ HALF,-HALF, HALF]
  ]},
  // -X
  {d:[-1, 0, 0],n:[-1, 0, 0],top:false,c:[
    [-HALF,-HALF, HALF],[-HALF, HALF, HALF],[-HALF, HALF,-HALF],[-HALF,-HALF,-HALF]
  ]},
  // +Y grass top
  {d:[ 0, 1, 0],n:[ 0, 1, 0],top:true,c:[
    [-HALF, HALF, HALF],[ HALF, HALF, HALF],[ HALF, HALF,-HALF],[-HALF, HALF,-HALF]
  ]},
  // -Y dirt underside
  {d:[ 0,-1, 0],n:[ 0,-1, 0],top:false,c:[
    [-HALF,-HALF,-HALF],[ HALF,-HALF,-HALF],[ HALF,-HALF, HALF],[-HALF,-HALF, HALF]
  ]},
  // +Z
  {d:[ 0, 0, 1],n:[ 0, 0, 1],top:false,c:[
    [ HALF,-HALF, HALF],[ HALF, HALF, HALF],[-HALF, HALF, HALF],[-HALF,-HALF, HALF]
  ]},
  // -Z
  {d:[ 0, 0,-1],n:[ 0, 0,-1],top:false,c:[
    [-HALF,-HALF,-HALF],[-HALF, HALF,-HALF],[ HALF, HALF,-HALF],[ HALF,-HALF,-HALF]
  ]}
];

const triOrder=[0,1,2,0,2,3];
const dirtPos=[],dirtNorm=[],dirtUv=[];
const topPos=[],topNorm=[],topUv=[];
let terrainVisibleFaceCount=0;

function worldUvForVoxelFace(px,py,pz,n){
  if(Math.abs(n[1])>.5){
    return n[1]>0?[px,-pz]:[px,pz];
  }
  if(Math.abs(n[0])>.5){
    return n[0]>0?[-pz,py]:[pz,py];
  }
  return n[2]>0?[px,py]:[-px,py];
}

function emitVoxelFace(x,y,z,face){
  const pos=face.top?topPos:dirtPos;
  const nor=face.top?topNorm:dirtNorm;
  const uv=face.top?topUv:dirtUv;

  for(const qi of triOrder){
    const p=face.c[qi];
    const px=x+p[0],py=y+p[1],pz=z+p[2];
    const tuv=worldUvForVoxelFace(px,py,pz,face.n);
    pos.push(px,py,pz);
    nor.push(face.n[0],face.n[1],face.n[2]);
    uv.push(tuv[0],tuv[1]);
  }
  terrainVisibleFaceCount++;
}

for(const rec of columnRecords){
  for(let y=0;y<=rec.h;y++){
    for(const face of VOXEL_FACES){
      const nx=rec.x+face.d[0];
      const ny=y+face.d[1];
      const nz=rec.z+face.d[2];
      if(!terrainVoxels.has(voxelKey(nx,ny,nz))){
        emitVoxelFace(rec.x,y,rec.z,face);
      }
    }
  }
}

const terrainSurfaceGeo=new THREE.BufferGeometry();
terrainSurfaceGeo.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([...dirtPos,...topPos],3)
);
terrainSurfaceGeo.setAttribute(
  'normal',
  new THREE.Float32BufferAttribute([...dirtNorm,...topNorm],3)
);
terrainSurfaceGeo.setAttribute(
  'uv',
  new THREE.Float32BufferAttribute([...dirtUv,...topUv],2)
);

const dirtVertexCount=dirtPos.length/3;
const topVertexCount=topPos.length/3;
terrainSurfaceGeo.clearGroups();
terrainSurfaceGeo.addGroup(0,dirtVertexCount,0);
terrainSurfaceGeo.addGroup(dirtVertexCount,topVertexCount,1);
terrainSurfaceGeo.computeBoundingBox();
terrainSurfaceGeo.computeBoundingSphere();

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
const terrainGrassRim=new THREE.Mesh(grassRimGeometry,terrainTopMat);
terrainGrassRim.name='terrain-torn-grass-rim';
terrainGrassRim.castShadow=true;
terrainGrassRim.receiveShadow=true;
terrainBlocks.add(terrainGrassRim);
const dressing=createTerrainDressing({THREE,parent:terrain,columnRecords,grassMaterial:terrainTopMat});

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
  terrainDirtMat.normalScale.setScalar(paperConfig.normal*.8);
  flags.render=true;
}
setPaper(paperConfig);
return {terrain,terrainBlocks,terrainGrassRim,grassRim:terrainGrassRim,dressing,columnRecords,surfaceY,setPaper,setSurfaceMode,
  getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness,
  textures:olive.textures,
  stats:()=>({columns:columnRecords.length,blocks:terrainBlockCount,visibleFaces:terrainVisibleFaceCount,
    triangles:terrainVisibleFaceCount*2+(terrainGrassRim.visible?grassRimGeometry.userData.triangles:0),
    baseTriangles:terrainVisibleFaceCount*2,grassRimTriangles:grassRimGeometry.userData.triangles,
    rimFaces:grassRimGeometry.userData.triangles/2,
    grassRimEdges:grassRimGeometry.userData.boundaryEdges,
    tufts:dressing.tufts,stones:dressing.stones,
    surfaceMode,textureSet:'Layered Olive Pulp',textureResolution:1024})};
}

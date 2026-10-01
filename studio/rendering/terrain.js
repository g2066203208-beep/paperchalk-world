/** Standard cubes with clean sides and the user-provided Olive Fiber grass. */
import {createOliveFiberMaps} from './olive-fiber-maps.js';

export function createTerrain({THREE,scene,renderer,flags,loadTexture,paperConfig}){
const TERRAIN_TOP_COLOR=0x8fae68;
const TERRAIN_DIRT_COLOR=0x8b654c;
const olive=createOliveFiberMaps({THREE,renderer,flags,loadTexture});

// Geometry and sunlight/shadows stay unchanged. Only the top surface gets the
// supplied PBR maps; dirt sides and undersides contain no texture or bump layer.
const terrainDirtMat=new THREE.MeshStandardMaterial({
  color:TERRAIN_DIRT_COLOR,roughness:.94,metalness:0,side:THREE.FrontSide
});
terrainDirtMat.name='terrain-dirt-solid-color';
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
terrain.name='terrain-culled-grass-top-dirt-side-cubes';
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
  flags.render=true;
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
  // Source relief comes exclusively from NormalGL. No extra height sampling,
  // displacement, macro noise, fake seams or repeated color multiplication.
  paperConfig.height=0;
  paperConfig.blend=0;
  olive.setScale(paperConfig.scale);
  terrainTopMat.normalScale.setScalar(paperConfig.normal);
  flags.render=true;
}
setPaper(paperConfig);
return {terrain,terrainBlocks,columnRecords,surfaceY,setPaper,setSurfaceMode,
  getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness,
  textures:olive.textures,
  stats:()=>({columns:columnRecords.length,blocks:terrainBlockCount,visibleFaces:terrainVisibleFaceCount,triangles:terrainVisibleFaceCount*2,surfaceMode,textureSet:'Olive Fiber',textureResolution:1024})};
}

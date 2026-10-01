// Paperchalk Demo v12.32 visual baseline. Extracted without changing shader or art parameters.
import {PAPER003_COLOR_URL,PAPER003_NORMAL_GL_URL,PAPER003_ROUGHNESS_URL,PAPER003_DISPLACEMENT_URL} from './paper003-maps.js';

export function createTerrain({THREE,scene,renderer,flags,loadTexture,paperConfig}){
const SIMPLE_TERRAIN_COLOR=0x91b274;

// Paper003 — embedded preview maps derived directly from the user supplied
// Paper003_1K-JPG set.  The demo embeds compact 256px WebP versions so GitHub
// Pages can show the material immediately without changing the rest of the scene.
function loadPaper003Texture(url,{srgb=false}={}){
  const t=loadTexture(url,()=>{flags.render=true;});
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.minFilter=THREE.LinearMipmapLinearFilter;
  t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=true;
  t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return t;
}

const paper003Color=loadPaper003Texture(PAPER003_COLOR_URL,{srgb:true});
const paper003Normal=loadPaper003Texture(PAPER003_NORMAL_GL_URL);
const paper003Roughness=loadPaper003Texture(PAPER003_ROUGHNESS_URL);
const paper003Displacement=loadPaper003Texture(PAPER003_DISPLACEMENT_URL);

function cloneTerrainPaper003Texture(source){
  const t=source.clone();
  t.needsUpdate=true;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
const terrainPaper003Color=cloneTerrainPaper003Texture(paper003Color);
const terrainPaper003Normal=cloneTerrainPaper003Texture(paper003Normal);
const terrainPaper003Roughness=cloneTerrainPaper003Texture(paper003Roughness);
const terrainPaper003Displacement=cloneTerrainPaper003Texture(paper003Displacement);
const terrainPaper003Textures=[
  terrainPaper003Color,
  terrainPaper003Normal,
  terrainPaper003Roughness,
  terrainPaper003Displacement
];

function setTerrainPaperScale(size){
  const repeat=1/Math.max(.05,size);
  for(const t of terrainPaper003Textures)t.repeat.set(repeat,repeat);
}
setTerrainPaperScale(2.0);
const terrainPaperBlendUniform={value:.85};


// ---------------------------------------------------------------------------
// Terrain v12.18 — strict standard cubes.
// Geometry is exactly 1×1×1. No cap, no edge layer, no extra thickness and no
// displacement. Paper003 is used only as a surface material on all six faces.
// ---------------------------------------------------------------------------
const TERRAIN_TOP_COLOR=0x8fae68;
const TERRAIN_DIRT_COLOR=0x8b654c;

function makeTerrainPaper003Material(color,name,normalScale,heightStrength){
  const mat=new THREE.MeshStandardMaterial({
    color,
    map:terrainPaper003Color,
    normalMap:terrainPaper003Normal,
    roughnessMap:terrainPaper003Roughness,
    normalScale:new THREE.Vector2(normalScale,normalScale),
    roughness:1.08,
    metalness:0
  });
  mat.name=name;

  const heightUniform={value:heightStrength};
  mat.userData.paper003HeightUniform=heightUniform;
  mat.userData.paper003HeightOn=heightStrength;

  mat.onBeforeCompile=shader=>{
    shader.uniforms.paper003HeightMap={value:terrainPaper003Displacement};
    shader.uniforms.paper003HeightStrength=heightUniform;
    shader.uniforms.paper003Blend=terrainPaperBlendUniform;

    shader.fragmentShader=shader.fragmentShader.replace(
      'void main() {',
      `
uniform sampler2D paper003HeightMap;
uniform float paper003HeightStrength;
uniform float paper003Blend;

vec3 paperBlendWeights(vec2 uv){
  // Slow continuous macro weights: no cells, no hard boundaries.
  vec3 w=vec3(
    0.60+0.40*sin(dot(uv,vec2(0.31,0.17))+0.2),
    0.60+0.40*sin(dot(uv,vec2(-0.19,0.37))+2.3),
    0.60+0.40*sin(dot(uv,vec2(0.23,-0.29))+4.7)
  );
  w*=w;
  return w/max(dot(w,vec3(1.0)),0.00001);
}

void paperUvs(vec2 uv,out vec2 a,out vec2 b,out vec2 c){
  // Non-matching scales mean the same source paper does not line up on a short
  // obvious grid. All transforms are global and continuous across voxel edges.
  a=uv;
  b=uv*1.113+vec2(0.371,0.613);
  c=uv*0.887+vec2(0.719,0.281);
}

vec4 paperColorSample(vec2 uv){
#ifdef USE_MAP
  vec2 a,b,c;paperUvs(uv,a,b,c);
  vec3 w=paperBlendWeights(uv);
  vec4 mixed=
    texture2D(map,a)*w.x+
    texture2D(map,b)*w.y+
    texture2D(map,c)*w.z;
  return mix(texture2D(map,uv),mixed,paper003Blend);
#else
  return vec4(1.0);
#endif
}

float paperRoughnessSample(vec2 uv){
#ifdef USE_ROUGHNESSMAP
  vec2 a,b,c;paperUvs(uv,a,b,c);
  vec3 w=paperBlendWeights(uv);
  float mixed=
    texture2D(roughnessMap,a).g*w.x+
    texture2D(roughnessMap,b).g*w.y+
    texture2D(roughnessMap,c).g*w.z;
  return mix(texture2D(roughnessMap,uv).g,mixed,paper003Blend);
#else
  return 1.0;
#endif
}

vec3 paperNormalSample(vec2 uv){
#ifdef USE_NORMALMAP
  vec2 a,b,c;paperUvs(uv,a,b,c);
  vec3 w=paperBlendWeights(uv);
  vec3 na=texture2D(normalMap,a).xyz*2.0-1.0;
  vec3 nb=texture2D(normalMap,b).xyz*2.0-1.0;
  vec3 nc=texture2D(normalMap,c).xyz*2.0-1.0;
  vec3 mixed=normalize(na*w.x+nb*w.y+nc*w.z);
  vec3 plain=texture2D(normalMap,uv).xyz*2.0-1.0;
  return normalize(mix(plain,mixed,paper003Blend));
#else
  return vec3(0.0,0.0,1.0);
#endif
}

float paperHeightSample(vec2 uv){
  vec2 a,b,c;paperUvs(uv,a,b,c);
  vec3 w=paperBlendWeights(uv);
  float mixed=
    texture2D(paper003HeightMap,a).r*w.x+
    texture2D(paper003HeightMap,b).r*w.y+
    texture2D(paper003HeightMap,c).r*w.z;
  return mix(texture2D(paper003HeightMap,uv).r,mixed,paper003Blend);
}

void main() {
`
    );

    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
#ifdef USE_MAP
  vec4 sampledDiffuseColor=paperColorSample(vMapUv);
  diffuseColor*=sampledDiffuseColor;
#endif
`
    );

    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
float roughnessFactor=roughness;
#ifdef USE_ROUGHNESSMAP
  roughnessFactor*=paperRoughnessSample(vRoughnessMapUv);
#endif
`
    );

    shader.fragmentShader=shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `
#ifdef USE_NORMALMAP_TANGENTSPACE
  vec3 mapN=paperNormalSample(vNormalMapUv);
  mapN.xy*=normalScale;

  if(paper003HeightStrength>0.0001){
    const float eps=0.0035;
    float h0=paperHeightSample(vNormalMapUv);
    float hx=paperHeightSample(vNormalMapUv+vec2(eps,0.0))-h0;
    float hy=paperHeightSample(vNormalMapUv+vec2(0.0,eps))-h0;
    mapN.xy-=vec2(hx,hy)*paper003HeightStrength*1.55;
  }

  normal=normalize(tbn*mapN);
#elif defined( USE_BUMPMAP )
  normal=perturbNormalArb(-vViewPosition,normal,dHdxy_fwd(),faceDirection);
#endif
`
    );
  };

  mat.customProgramCacheKey=()=>name+'-continuous-paper003-safe-v1';
  return mat;
}

const terrainDirtMat=makeTerrainPaper003Material(
  TERRAIN_DIRT_COLOR,
  'terrain-dirt-paper003',
  1.55,
  4.0
);
const terrainTopMat=makeTerrainPaper003Material(
  TERRAIN_TOP_COLOR,
  'terrain-green-top-paper003',
  1.85,
  4.8
);

// Voxel surface meshing v12.27:
// keep exact 1x1x1 voxel silhouettes, but DO NOT submit faces touching another
// solid voxel. GPU back-face culling stays on as well (FrontSide materials).
terrainDirtMat.side=THREE.FrontSide;
terrainTopMat.side=THREE.FrontSide;

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

const caps=[];
const rims=[];
const paperObjects=[terrainBlocks];

function rebuildMaterialRandomness(on=true){
  terrainPaperBlendUniform.value=on?paperConfig.blend:0;
  const mats=[terrainTopMat,terrainDirtMat];
  for(const mat of mats){
    mat.map=on?terrainPaper003Color:null;
    mat.normalMap=on?terrainPaper003Normal:null;
    mat.roughnessMap=on?terrainPaper003Roughness:null;
    mat.normalScale.setScalar(on?(mat===terrainTopMat?1.85:1.55):1);
    mat.roughness=on?1.08:.92;
    if(mat.userData.paper003HeightUniform){
      mat.userData.paper003HeightUniform.value=on?mat.userData.paper003HeightOn:0;
    }
    mat.needsUpdate=true;
  }
  terrainTopMat.color.setHex(TERRAIN_TOP_COLOR);
  terrainDirtMat.color.setHex(TERRAIN_DIRT_COLOR);
}



function surfaceY(x,z=0){
  const column=columnRecords.find(c=>c.x===Math.round(x)&&c.z===Math.round(z));
  return column?column.h+.5:null;
}
function setPaper(next,on=true){
  Object.assign(paperConfig,next);
  setTerrainPaperScale(paperConfig.scale);
  terrainPaperBlendUniform.value=on?paperConfig.blend:0;
  terrainTopMat.normalScale.setScalar(paperConfig.normal);
  terrainDirtMat.normalScale.setScalar(paperConfig.normal*.84);
  terrainTopMat.userData.paper003HeightOn=paperConfig.height;
  terrainDirtMat.userData.paper003HeightOn=paperConfig.height*.83;
  terrainTopMat.userData.paper003HeightUniform.value=on?paperConfig.height:0;
  terrainDirtMat.userData.paper003HeightUniform.value=on?paperConfig.height*.83:0;
  flags.render=true;
}
return {terrain,terrainBlocks,columnRecords,surfaceY,setPaper,rebuildMaterialRandomness,
  textures:[paper003Color,paper003Normal,paper003Roughness,paper003Displacement,...terrainPaper003Textures],
  stats:()=>({columns:columnRecords.length,blocks:terrainBlockCount,visibleFaces:terrainVisibleFaceCount,triangles:terrainVisibleFaceCount*2})};
}

import {createCityPrologueWorld} from '../world/CityPrologueWorld.mjs';
import {createStagePlatformGeometry} from './stage-geometry.js';

/** Continuous paper pavement and road. All visible lane markings are batched. */
export function createCityTerrain({THREE,scene,flags,paperConfig}){
  const world=createCityPrologueWorld(),terrain=new THREE.Group();terrain.name='Continuous paper city street';scene.add(terrain);
  const terrainBlocks=terrain,materials=[],textures=[];let surfaceMode='pulp';
  function pigment(name,hex,tiles=false){
    const size=256,data=new Uint8Array(size*size*4),base=[hex>>16&255,hex>>8&255,hex&255];
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const seam=tiles&&(x<1||y<1||Math.abs(y-128)<1),tone=(seam?.85:1)+.012*Math.sin(x*.03)*Math.cos(y*.036);
      const index=(y*size+x)*4;for(let c=0;c<3;c++)data[index+c]=Math.round(base[c]*tone);data[index+3]=255;
    }
    const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.name=name;map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(.5,.5);map.generateMipmaps=true;
    map.minFilter=THREE.LinearMipmapLinearFilter;map.needsUpdate=true;textures.push(map);return map;
  }
  function paper(name,color,map=null){
    const material=new THREE.MeshLambertMaterial({color:map?0xffffff:color,map,flatShading:true});material.name=name;
    materials.push({material,color,map});return material;
  }
  const pavement=paper('Blue grey paving paper',0x8994a5,pigment('Quiet paper paving',0x8994a5,true));
  const asphalt=paper('Midnight blue asphalt paper',0x46566a,pigment('Quiet road paper',0x46566a));
  const backing=paper('Rear city ground',0x4d6074),edge=paper('Cold cut cardboard edge',0x8995a2);
  const core=paper('City cardboard core',0x3c4659),strata=paper('City folded paper liner',0x536176);
  core.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float paperDepth;varying float vCityPaperDepth;varying vec3 vCityPaperPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPaperDepth=paperDepth;vCityPaperPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCityPaperDepth;varying vec3 vCityPaperPosition;')
      .replace('#include <color_fragment>','#include <color_fragment>\nfloat row=fract(vCityPaperDepth/.22);float flute=.5+.34*sin(vCityPaperPosition.x*27.0);float d=abs(row-flute);float line=1.0-smoothstep(.022,.05+fwidth(d),d);diffuseColor.rgb*=.84+line*.23;');
  };
  core.customProgramCacheKey=()=> 'city-paperboard-cut-v1';
  const platforms=[
    {...world.platforms[0]},
    {id:'road',kind:'ground',profile:[{x:-90,y:.05},{x:110,y:.05}],frontZ:9,backZ:1.65},
    {id:'rear-ground',kind:'ground',profile:[{x:-90,y:.38},{x:110,y:.38}],frontZ:-2.8,backZ:-45},
  ];
  let triangles=0;
  platforms.forEach((platform,index)=>{
    const geometry=createStagePlatformGeometry({THREE,platform});triangles+=geometry.userData.triangles;
    const mesh=new THREE.Mesh(geometry,[core,[pavement,asphalt,backing][index],edge,strata]);
    mesh.name=platform.id;mesh.castShadow=true;mesh.receiveShadow=true;terrain.add(mesh);
  });
  const roadMarks=[],uv=[];
  function patch(x1,x2,z1,z2,y){
    const p=[[x1,y,z1],[x1,y,z2],[x2,y,z1],[x2,y,z1],[x1,y,z2],[x2,y,z2]];
    for(const point of p){roadMarks.push(...point);uv.push(point[0],point[2]);}
  }
  for(let x=-40;x<60;x+=4.4)patch(x,x+2.1,4.9,4.97,.056);
  // Painted kerb strokes remain a single material submission.
  for(let x=-30;x<50;x+=3)patch(x,x+.60,1.29,1.35,.506);
  const markingGeo=new THREE.BufferGeometry();markingGeo.setAttribute('position',new THREE.Float32BufferAttribute(roadMarks,3));
  markingGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));markingGeo.computeVertexNormals();markingGeo.computeBoundingSphere();
  const markingMaterial=paper('Faded road marking paper',0xabb5ba),marks=new THREE.Mesh(markingGeo,markingMaterial);
  marks.name='Batched painted road markings';marks.receiveShadow=true;terrain.add(marks);triangles+=roadMarks.length/9;
  function setSurfaceMode(mode){
    if(!['pulp','color'].includes(mode))throw new RangeError('Unknown terrain surface mode: '+mode);
    surfaceMode=mode;for(const item of materials){item.material.map=mode==='pulp'?item.map:null;
      item.material.color.setHex(mode==='pulp'&&item.map?0xffffff:item.color);item.material.needsUpdate=true;}
    flags.render=true;return mode;
  }
  function setPaper(next={}){
    if(Number.isFinite(next.scale))paperConfig.scale=Math.max(.5,next.scale);
    const scale=Number.isFinite(paperConfig.scale)?paperConfig.scale:1.8;
    for(const texture of textures)texture.repeat.set(.9/scale,.9/scale);
    paperConfig.normal=paperConfig.height=paperConfig.blend=0;flags.render=true;
  }
  return {world,terrain,terrainBlocks,textures,pulpSets:{},surfaceY:world.surfaceY,
    groundBelow:(x,y,z=0)=>world.groundBelow(x,y+.06,z),setPaper,setSurfaceMode,getSurfaceMode:()=>surfaceMode,
    rebuildMaterialRandomness:on=>setSurfaceMode(on?'pulp':'color'),stats:()=>({platforms:3,triangles,baseTriangles:168,
      openEdges:0,surfaceMode,textureSet:'City Matte Paper',textureResolution:256,blocks:0,tufts:0,stones:0})};
}

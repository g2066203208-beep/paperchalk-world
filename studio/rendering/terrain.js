/** Hand-cut stage scenery with a single authored side-scrolling route. */
import {createPaperStageWorld} from '../world/PaperStageWorld.mjs';
import {createStagePlatformGeometry} from './stage-geometry.js';
import {createStorybookPaperMaps,STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from './storybook-paper-maps.js';

export function createTerrain({THREE,scene,renderer,flags,paperConfig,
  paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet,paperMapController}){
  const storybook=(paperGrassSet&&paperDirtSet)?null:createStorybookPaperMaps({THREE,renderer});
  paperGrassSet??=storybook.paperGrassSet;paperDirtSet??=storybook.paperDirtSet;
  paperLeafSet??=storybook.paperLeafSet;paperTrunkSet??=storybook.paperTrunkSet;
  const world=createPaperStageWorld();
  const terrain=new THREE.Group();terrain.name='storybook-paper-stage';scene.add(terrain);
  const terrainBlocks=new THREE.Group();terrainBlocks.name='authored-stage-platforms';terrain.add(terrainBlocks);
  const pigmentMaterials=[];
  function paper(name,color,map=null){
    const material=new THREE.MeshPhysicalMaterial({color:map?0xffffff:color,map,
      roughness:1,metalness:0,specularIntensity:.045,flatShading:true,side:THREE.FrontSide});
    material.name=name;
    pigmentMaterials.push({material,color,map});return material;
  }
  const dirt=paper('warm-kraft-paperboard',STORYBOOK_PAPER_PALETTE.dirt,paperDirtSet.color);
  const grass=paper('sage-dyed-meadow-paper',STORYBOOK_PAPER_PALETTE.grass,paperGrassSet.color);
  const edge=paper('warm-light-cut-paper-edge',0xd2c699);
  const strata=paper('quiet-kraft-lamination',0xba9472);
  dirt.name='corrugated-kraft-cardboard-core';
  dirt.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float paperDepth;\nvarying float vCardDepth;\nvarying vec3 vCardPosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvCardDepth=paperDepth;\nvCardPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vCardDepth;\nvarying vec3 vCardPosition;')
      .replace('#include <color_fragment>','#include <color_fragment>\n'+
        'float cardRow=(vCardDepth-.135)/.30;\n'+
        'float cardV=fract(cardRow);\n'+
        'float cardPhase=(vCardPosition.x+vCardPosition.z*.16)*6.2831853/.25;\n'+
        'float fluteCurve=.5+.39*sin(cardPhase);\n'+
        'float fluteDistance=abs(cardV-fluteCurve);\n'+
        'float fluteAA=max(.015,fwidth(fluteDistance));\n'+
        'float flute=1.-smoothstep(.030,.030+fluteAA,fluteDistance);\n'+
        'float liner=1.-smoothstep(.025,.055+fwidth(cardV),min(cardV,1.-cardV));\n'+
        'float fluteShadow=1.-smoothstep(.05,.20,abs(cardV-fluteCurve-.075));\n'+
        'float coreTone=.64-.10*fluteShadow+.45*flute+.20*liner;\n'+
        'diffuseColor.rgb*=coreTone;\n');
  };
  dirt.customProgramCacheKey=()=> 'continuous-corrugated-cardboard-v1';
  const meshes=[];
  for(const platform of world.platforms){
    const mesh=new THREE.Mesh(createStagePlatformGeometry({THREE,platform}),[dirt,grass,edge,strata]);
    mesh.name='stage-'+platform.id;mesh.userData.platformId=platform.id;
    mesh.castShadow=true;mesh.receiveShadow=true;terrainBlocks.add(mesh);meshes.push(mesh);
  }

  const details=new THREE.Group();details.name='authored-paper-stage-props';terrainBlocks.add(details);
  function add(geometry,material,name){
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    details.add(mesh);return mesh;
  }
  const tuftMaterials=[paper('folded-sage-grass',0x6c8e63),paper('folded-lime-grass',0xa6ba77),paper('folded-grass-light-edge',0xc7c48c)];
  function foldedLeafGeometry(){
    const geo=new THREE.BufferGeometry();
    const p=[-.13,0,0, 0,0,.052, .015,.52,.012, 0,0,.052, .13,0,0, .015,.52,.012];
    const front=[...p];
    for(let i=0;i<front.length;i+=9)p.push(front[i+6],front[i+7],front[i+8]-.009,front[i+3],front[i+4],front[i+5]-.009,front[i],front[i+1],front[i+2]-.009);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.computeVertexNormals();
    geo.addGroup(0,3,0);geo.addGroup(3,3,1);geo.addGroup(6,6,0);return geo;
  }
  const leafGeometry=foldedLeafGeometry();let tufts=0;
  for(const [x,z,size] of [[-8.8,1.75,1.05],[-6.1,-1.8,.85],[-4.7,2.0,1.1],[-2.6,-1.6,.9],[-1.35,1.9,.75],
    [1.8,-2.2,1],[3.55,1.9,1.1],[9.4,2.1,.8],[10.1,-2.5,1.05],[13.4,2.3,.95],
    [16.1,2.7,1.1],[18.6,-2.1,.9],[21.3,2.7,.95],[23.4,-2.4,1.2]]){
    for(let i=0;i<5;i++){
      const px=x+(i-2)*.10,pz=z+(i%2)*.075,y=world.surfaceY(px,pz);if(y===null)continue;
      const leaf=add(leafGeometry,tuftMaterials,'folded-paper-grass');
      leaf.position.set(px,y+.012,pz);leaf.rotation.z=(i-2)*-.13;leaf.rotation.y=(i%2-.5)*.35;
      const scale=size*(.68+.15*((i*3)%4));leaf.scale.setScalar(scale);tufts++;
    }
  }

  const stoneMat=paper('lavender-paper-stone',0xb6b1b8),stoneLight=paper('stone-fold-light',0xcdc5c7),stoneEdge=paper('stone-cut-card-edge',0xa39eaa);
  function stoneGeometry(){
    const geometry=new THREE.BufferGeometry(),p=[],outline=[[-.32,0],[-.37,.17],[-.15,.43],[.13,.46],[.36,.23],[.31,0]];
    const triangle=(a,b,c)=>p.push(...a,...b,...c),ridge=[.015,.19,.065];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];triangle([a[0],a[1],0],ridge,[b[0],b[1],0]);
      triangle([b[0],b[1],-.035],[.015,.19,-.035],[a[0],a[1],-.035]);
      triangle([a[0],a[1],0],[b[0],b[1],0],[a[0],a[1],-.035]);
      triangle([b[0],b[1],0],[b[0],b[1],-.035],[a[0],a[1],-.035]);
      geometry.addGroup(i*12,3,i%3===0?1:0);geometry.addGroup(i*12+3,9,2);
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.computeVertexNormals();return geometry;
  }
  const rockGeometry=stoneGeometry();let stones=0;
  for(const [x,z,scale] of [[-7.6,1.7,.8],[-3.7,-1.55,.7],[-1.9,1.55,.8],[3.4,-1.5,.65],[9.7,2.15,.7],[13.2,-1.7,.95],[18.0,2.5,.85],[23.5,-1.5,1.1]]){
    const y=world.surfaceY(x,z);if(y===null)continue;
    const stone=add(rockGeometry,[stoneMat,stoneLight,stoneEdge],'folded-paper-stone');stone.position.set(x,y,z);stone.scale.setScalar(scale);stones++;
  }

  // These set pieces never move. One draw per paper stock keeps the phone
  // version inexpensive even when a cluster contains many individual folds.
  const batches=new Map(),sourceGeometries=new Set(),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  for(const mesh of details.children){
    mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);sourceGeometries.add(mesh.geometry);
    const geometry=mesh.geometry,p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    const groups=geometry.groups.length?geometry.groups:[{start:0,count:geometry.index?.count??p.count,materialIndex:0}];
    for(const group of groups){
      const material=Array.isArray(mesh.material)?mesh.material[group.materialIndex]:mesh.material,key=material.uuid+mesh.castShadow;
      if(!batches.has(key))batches.set(key,{material,castShadow:mesh.castShadow,positions:[],normals:[],uvs:[]});
      const batch=batches.get(key);
      for(let j=group.start;j<group.start+group.count;j++){
        const index=geometry.index?geometry.index.getX(j):j;
        point.fromBufferAttribute(p,index).applyMatrix4(mesh.matrix);normal.fromBufferAttribute(n,index).applyNormalMatrix(normalMatrix);
        batch.positions.push(point.x,point.y,point.z);batch.normals.push(normal.x,normal.y,normal.z);
        batch.uvs.push(uv?.getX(index)??0,uv?.getY(index)??0);
      }
    }
  }
  details.clear();for(const geometry of sourceGeometries)geometry.dispose();
  for(const batch of batches.values()){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));
    geometry.computeBoundingSphere();const mesh=add(geometry,batch.material,'stage-details-'+batch.material.name);mesh.castShadow=batch.castShadow;
  }

  let surfaceMode='pulp';
  function setSurfaceMode(mode){
    if(mode!=='color'&&mode!=='pulp')throw new RangeError('Unknown terrain surface mode: '+mode);
    surfaceMode=mode;
    for(const {material,color,map} of pigmentMaterials){material.map=mode==='pulp'?map:null;material.color.setHex(mode==='pulp'&&map?0xffffff:color);material.needsUpdate=true;}
    flags.render=flags.shadow=true;return mode;
  }
  function setPaper(next={}){
    if(Number.isFinite(next.scale))paperConfig.scale=Math.max(.05,next.scale);
    paperConfig.normal=0;paperConfig.height=0;paperConfig.blend=0;
    (paperMapController??storybook)?.setScale(Number.isFinite(paperConfig.scale)?paperConfig.scale:STORYBOOK_PAPER_DEFAULTS.scale);
    flags.render=true;
  }
  setPaper(paperConfig);
  const baseTriangles=meshes.reduce((sum,m)=>sum+m.geometry.userData.triangles,0);
  return {world,terrain,terrainBlocks,pulpSets:{paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet},
    textures:storybook?.textures??[paperGrassSet.color,paperDirtSet.color,paperLeafSet.color,paperTrunkSet.color],
    surfaceY:(x,z=0)=>world.surfaceY(x,z),groundBelow:(x,y,z=0)=>world.groundBelow(x,y+.06,z),
    setPaper,setSurfaceMode,getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness:on=>setSurfaceMode(on?'pulp':'color'),
    stats:()=>({platforms:world.platforms.length,columns:0,blocks:0,visibleFaces:baseTriangles,triangles:baseTriangles,
      baseTriangles,vertices:meshes.reduce((sum,m)=>sum+m.geometry.userData.vertices,0),openEdges:0,editedSamples:0,
      tufts,stones,surfaceMode,textureSet:'Storybook Flat Paper',textureResolution:256})};
}

/** One editable solid with a continuous rendered surface. */
import {createDensityWorld} from '../world/DensityTerrainWorld.mjs';
import {createDensityTerrainGeometry} from './density-mesh.js';
import {createTerrainDressing} from './terrain-dressing.js';
import {createStorybookPaperMaps,STORYBOOK_PAPER_PALETTE,STORYBOOK_PAPER_DEFAULTS} from './storybook-paper-maps.js';

export function createTerrain({THREE,scene,renderer,flags,paperConfig,
  paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet,paperMapController}){
  const storybook=(paperGrassSet&&paperDirtSet)?null:createStorybookPaperMaps({THREE,renderer});
  paperGrassSet??=storybook.paperGrassSet;
  paperDirtSet??=storybook.paperDirtSet;
  paperLeafSet??=storybook.paperLeafSet;
  paperTrunkSet??=storybook.paperTrunkSet;
  const world=createDensityWorld();
  const terrain=new THREE.Group();terrain.name='continuous-editable-paper-land';scene.add(terrain);
  const dirt=new THREE.MeshPhysicalMaterial({color:0xffffff,map:paperDirtSet.color,roughness:1,metalness:0,specularIntensity:.05,flatShading:true,side:THREE.FrontSide});
  const grass=new THREE.MeshPhysicalMaterial({color:0xffffff,map:paperGrassSet.color,roughness:1,metalness:0,specularIntensity:.05,flatShading:true,side:THREE.FrontSide});
  dirt.name='storybook-terrain-clay-paper';grass.name='storybook-terrain-sage-paper';
  dirt.onBeforeCompile=shader=>{
    shader.uniforms.paperCapColor={value:new THREE.Color(STORYBOOK_PAPER_PALETTE.grass)};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float paperDepth;\nvarying float vPaperDepth;\nvarying float vPaperHeight;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPaperDepth=paperDepth;\nvPaperHeight=position.y;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform vec3 paperCapColor;\nvarying float vPaperDepth;\nvarying float vPaperHeight;')
      .replace('#include <color_fragment>','#include <color_fragment>\n'+
        'float layerLine=1.0-smoothstep(.035,.09,abs(fract(vPaperHeight/.22)-.5));\n'+
        'diffuseColor.rgb*=1.0-layerLine*.065;\n'+
        'float paperCap=1.0-smoothstep(.10,.15,vPaperDepth);\n'+
        'diffuseColor.rgb=mix(diffuseColor.rgb,paperCapColor,paperCap*.94);');
  };
  dirt.customProgramCacheKey=()=> 'folded-earth-paper-edge-v1';
  let surfaceMode='pulp';
  function surfaceGeometry(){
    const welded=createDensityTerrainGeometry({THREE,world});
    const geometry=welded.toNonIndexed();
    geometry.userData={...welded.userData};
    geometry.computeVertexNormals();
    const positions=geometry.getAttribute('position'),depth=new Float32Array(positions.count);
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i);
      depth[i]=world.authoredHeight(x,z)+world.bankDrop(x,z)-positions.getY(i);
    }
    geometry.setAttribute('paperDepth',new THREE.Float32BufferAttribute(depth,1));
    welded.dispose();
    return geometry;
  }
  const terrainBlocks=new THREE.Mesh(surfaceGeometry(),[dirt,grass]);
  terrainBlocks.name='continuous-density-terrain';terrainBlocks.castShadow=true;terrainBlocks.receiveShadow=true;terrain.add(terrainBlocks);
  let dressing;
  function dress(){
    if(dressing){dressing.group.removeFromParent();dressing.dispose();}
    const columnRecords=[];
    for(let z=-13;z<=6;z++)for(let x=-16;x<=16;x++){
      const y=world.surfaceY(x,z);
      if(y!==null)columnRecords.push({x,z,h:y-.5});
    }
    dressing=createTerrainDressing({THREE,parent:terrainBlocks,columnRecords,grassMaterial:grass,
      surfaceY:(x,z)=>world.surfaceY(x,z),
      isVegetated:(x,z)=>(world.surfaceY(x,z)??-99)>=world.authoredHeight(x,z)-.10});
  }
  dress();
  function rebuild(){
    const next=surfaceGeometry();
    terrainBlocks.geometry.dispose();terrainBlocks.geometry=next;
    dress();flags.render=flags.shadow=flags.depth=flags.volumeShadow=flags.ao=true;
    return next.userData;
  }
  function setSurfaceMode(mode){
    if(mode!=='color'&&mode!=='pulp')throw new RangeError('Unknown terrain surface mode: '+mode);
    surfaceMode=mode;
    grass.map=mode==='pulp'?paperGrassSet.color:null;
    dirt.map=mode==='pulp'?paperDirtSet.color:null;
    grass.color.setHex(mode==='pulp'?0xffffff:STORYBOOK_PAPER_PALETTE.grass);
    dirt.color.setHex(mode==='pulp'?0xffffff:STORYBOOK_PAPER_PALETTE.dirt);
    grass.needsUpdate=dirt.needsUpdate=true;flags.render=flags.shadow=true;
    return mode;
  }
  function setPaper(next={}){
    if(Number.isFinite(next.scale))paperConfig.scale=Math.max(.05,next.scale);
    if(Number.isFinite(next.normal))paperConfig.normal=Math.max(0,Math.min(3,next.normal));
    paperConfig.height=0;paperConfig.blend=0;
    (paperMapController??storybook)?.setScale(Number.isFinite(paperConfig.scale)?paperConfig.scale:STORYBOOK_PAPER_DEFAULTS.scale);
    flags.render=true;
  }
  setPaper(paperConfig);
  return {world,terrain,terrainBlocks,pulpSets:{paperGrassSet,paperDirtSet,paperLeafSet,paperTrunkSet},
    textures:storybook?.textures??[paperGrassSet.color,paperDirtSet.color,paperLeafSet.color,paperTrunkSet.color],
    surfaceY:(x,z=0)=>world.surfaceY(x,z),
    groundBelow:(x,y,z=0)=>world.verticalCrossings(x,z).find(q=>q.type==='floor'&&q.y<=y+.06)??null,
    rebuild,setPaper,setSurfaceMode,
    getSurfaceMode:()=>surfaceMode,rebuildMaterialRandomness:on=>setSurfaceMode(on?'pulp':'color'),
    stats:()=>({columns:0,blocks:0,visibleFaces:terrainBlocks.geometry.userData.triangles,
      triangles:terrainBlocks.geometry.userData.triangles,baseTriangles:terrainBlocks.geometry.userData.triangles,
      vertices:terrainBlocks.geometry.userData.vertices,openEdges:terrainBlocks.geometry.userData.openEdges,
      editedSamples:world.edits.size,tufts:dressing.tufts,stones:dressing.stones,surfaceMode,
      textureSet:'Storybook Flat Paper',textureResolution:256})};
}

import {rng} from './math.js';
import {createPaperArtGeometry,createPaperTreeGeometry,tintPaperArtGeometry,createForestPaperAtlas} from './forest-art.js';

/** Broad authored silhouettes on thin coloured card, grouped along the world. */
export function createForest({THREE,scene,paperGrassSet,paperDirtSet,
  paperLeafSet=paperGrassSet,paperTrunkSet=paperDirtSet,terrainWorld}){
  const canopyGroup=new THREE.Group();canopyGroup.name='Layered storybook paper forest';scene.add(canopyGroup);
  const palettes=[
    [0x668879,0x94ac85,0x9c7865,0xd8cdad],
    [0x8ca69d,0xa6b69a,0xab9282,0xd6cbb4],
    [0xa1b3ad,0xb7c2af,0xb3a49d,0xd2cbbc],
  ];
  function stock(color,set,name,{fogLimit=.44,vertexColors=true,illustrated=false}={}){
    const material=new THREE.MeshLambertMaterial({color,map:set?.color??null,vertexColors,side:THREE.FrontSide});
    material.name=name;material.userData.paperStock=true;
    // The pigment map supplies only a quiet paper variation; it cannot tint
    // the approved stock a second time or turn distant grey sage into olive.
    material.onBeforeCompile=shader=>{
      if(!illustrated)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\nvec4 paperInk=texture2D(map,vMapUv);\n'+
        'float pigmentLuma=dot(paperInk.rgb,vec3(.2126,.7152,.0722));\n'+
        'diffuseColor.rgb*=mix(.98,1.02,smoothstep(.03,.45,pigmentLuma));\n#endif');
      shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',
        '#ifdef USE_FOG\nfloat paperFog=smoothstep(fogNear,fogFar,vFogDepth);\n'+
        `gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,min(paperFog,${fogLimit.toFixed(2)}));\n#endif`);
    };
    material.customProgramCacheKey=()=>`paper-stock-pigment-${fogLimit}-${illustrated}`;return material;
  }
  const paperAtlas=createForestPaperAtlas(THREE);
  const treeMaterial=stock(0xffffff,{color:paperAtlas},'Illustrated layered forest paper',{illustrated:true});
  const treeGeometry=createPaperTreeGeometry(THREE),trees=[];
  const treeGeometries=palettes.map(palette=>tintPaperArtGeometry(THREE,treeGeometry,palette));
  const groundAt=x=>terrainWorld?.surfaceY(Math.max(-16,Math.min(32,x)),0)??.5;
  function tree(x,z,layer,seed,scale=1){
    const random=rng(seed);
    trees.push({x,z,layer,y:groundAt(x)-.045,scaleX:scale*(.92+random()*.18),
      scaleY:scale*(.94+random()*.12),angle:(random()-.5)*.06,tilt:(random()-.5)*.025,
      chunk:Math.floor(x/16)});
  }
  // Spacing is composed in groups, with generous open windows for the player,
  // the warm shafts of light and the settlements along the same broad land.
  [-12.7,-8.6,-3.8,2.9,9.7,15.5,26.4,31.8].forEach((x,i)=>tree(x,-5.8+(i%3-1)*.42,0,710+i*31,1.06+(i%2)*.07));
  [-15,-10,-5.8,-1.1,4.8,9.6,14,19,24.1,29,34].forEach((x,i)=>tree(x,-11.9+(i%3-1)*.6,1,1320+i*43,1.04+(i%3)*.035));
  [-17,-11.8,-6.9,-1.6,3.8,9.1,14.9,20,25.8,31.7].forEach((x,i)=>tree(x,-21.2+(i%2-.5)*1.1,2,2070+i*53,1.04+(i%3)*.025));
  [[-7.5,-.9,1.31],[12.3,-1.7,1.28],[28.4,-.7,1.35]].forEach(([x,z,scale],i)=>tree(x,z,0,3910+i*67,scale));

  const dummy=new THREE.Object3D();let batches=0;
  function instances(geometry,materials,items,name,configure,{castShadow=true,receiveShadow=true}={}){
    if(!items.length)return;
    const mesh=new THREE.InstancedMesh(geometry,materials,items.length);mesh.name=name;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);mesh.castShadow=castShadow;mesh.receiveShadow=receiveShadow;
    mesh.frustumCulled=true;
    items.forEach((item,index)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
      configure(item);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
    canopyGroup.add(mesh);batches++;return mesh;
  }
  for(let layer=0;layer<3;layer++)for(let chunk=-2;chunk<=2;chunk++){
    const items=trees.filter(item=>item.layer===layer&&item.chunk===chunk);
    const mesh=instances(treeGeometries[layer],treeMaterial,items,`Paper trees ${layer}/${chunk}`,item=>{
      dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(item.tilt,0,item.angle);
      dummy.scale.set(item.scaleX,item.scaleY,1);
    },{castShadow:layer<2});
    if(mesh){
      mesh.userData={forestTreeBatch:true,layer,chunk,trees:items.length};
      items.forEach((item,index)=>{
        const shift=Math.sin(item.x*1.71)*.018;
        mesh.setColorAt(index,new THREE.Color().setRGB(1+shift,1,1-shift*.5));
      });
      mesh.instanceColor.needsUpdate=true;
    }
  }

  const moundOutline=[[-.5,-.12],[-.5,.05],[-.41,.18],[-.32,.28],[-.24,.26],[-.16,.39],[-.02,.44],
    [.07,.37],[.18,.41],[.29,.29],[.38,.20],[.44,.22],[.5,.07],[.5,-.12]];
  const moundGeometry=createPaperArtGeometry({THREE,parts:[{outline:moundOutline,depth:.028,material:0}]});
  const moundMaterial=stock(0xffffff,null,'Distant folded paper stocks',{fogLimit:.52});
  const moundGeometries=[0x9cab9b,0xb2b2bd].map((color,i)=>tintPaperArtGeometry(THREE,moundGeometry,
    [color,color,color,i?0xc6c1bd:0xc4c6ae]));
  const mounds=[];
  for(let layer=0;layer<2;layer++)for(let i=0;i<7;i++){
    const x=-17+i*8.1+(layer?.8:0);
    mounds.push({x,z:-17.1-layer*9.5,y:groundAt(x)-.10,layer,chunk:Math.floor(x/16),
      sx:8.1+(i%3)*.65,sy:2.1+(i%3)*.35});
  }
  for(let layer=0;layer<2;layer++)for(let chunk=-2;chunk<=2;chunk++){
    instances(moundGeometries[layer],moundMaterial,mounds.filter(q=>q.layer===layer&&q.chunk===chunk),`Distant paper mounds ${layer}/${chunk}`,item=>{
      dummy.position.set(item.x,item.y,item.z);dummy.scale.set(item.sx,item.sy,1);
    },{castShadow:false,receiveShadow:false});
  }

  // The only additional floor starts behind the full continuous world mesh.
  // There are no separate floor patches or exposed cardboard backs near play.
  const floorPositions=[],floorUV=[],xs=[-96,-72,-42,-24,-16,-12,-8,-4,0,4,8,12,16,20,24,28,32,42,54,84,108];
  const floorPoint=(x,z)=>[x,groundAt(x)-.055+Math.max(0,(-z-39.8)/25.2)*.55,z];
  const emit=(...points)=>{for(const p of points){floorPositions.push(...p);floorUV.push(p[0],p[2]);}};
  for(let row=0;row<4;row++)for(let i=1;i<xs.length;i++){
    const z0=-39.8-row*6.3,z1=z0-6.3,a=floorPoint(xs[i-1],z0),b=floorPoint(xs[i],z0),c=floorPoint(xs[i],z1),d=floorPoint(xs[i-1],z1);
    emit(a,b,c,a,c,d);
  }
  const floorGeometry=new THREE.BufferGeometry();floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(floorPositions,3));
  floorGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(floorUV,2));floorGeometry.computeVertexNormals();floorGeometry.computeBoundingSphere();
  const floorMaterial=stock(0x9eae8f,paperGrassSet,'Far continuous paper floor',{fogLimit:.65,vertexColors:false});
  const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.name='Far continuous forest floor';floor.receiveShadow=true;canopyGroup.add(floor);
  const stats={trees:trees.length,crowns:trees.length*2,crownSheetsPerTree:2,treeTriangles:treeGeometry.userData.triangles,
    distantPapers:mounds.length,distantTriangles:moundGeometry.userData.triangles*mounds.length,
    floorTriangles:floorPositions.length/9,batches,sharedGeometries:6,sharedPositionBuffers:3,
    atlasBytes:paperAtlas.image.data.byteLength,drawsPerTreeBatch:1,
    triangles:treeGeometry.userData.triangles*trees.length+moundGeometry.userData.triangles*mounds.length+floorPositions.length/9};
  canopyGroup.userData.forest=stats;
  return {canopyGroup,stats:()=>({...stats})};
}

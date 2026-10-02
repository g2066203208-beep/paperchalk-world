/** Thin paper props resampled onto the current editable surface. */
export function createTerrainDressing({THREE,parent,columnRecords,grassMaterial,surfaceY,isVegetated=()=>true}){
  const group=new THREE.Group();
  group.name='terrain-paper-tufts-and-stones';
  parent.add(group);
  const hash=(x,z,s=0)=>{
    const v=Math.sin(x*127.1+z*311.7+s*74.3)*43758.5453;
    return v-Math.floor(v);
  };
  const exposed=(column)=>{
    const neighbors=new Set(columnRecords.map(q=>q.x+','+q.z));
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>!neighbors.has((column.x+dx)+','+(column.z+dz)));
  };
  // A folded sheet has two lit faces and a narrow physical edge. A cone reads
  // as solid plastic even when its colour map says paper.
  const tuftPositions=[],tuftUvs=[];
  const bladeFront=[[-.105,-.23,0],[0,-.23,.044],[.097,-.23,0],[.014,.23,.014]];
  const bladeBack=bladeFront.map(p=>[p[0],p[1],p[2]-.009]);
  function bladeTriangle(a,b,c){
    for(const p of [a,b,c]){tuftPositions.push(...p);tuftUvs.push(p[0]*2,p[1]*2);}
  }
  bladeTriangle(bladeFront[0],bladeFront[1],bladeFront[3]);
  bladeTriangle(bladeFront[1],bladeFront[2],bladeFront[3]);
  bladeTriangle(bladeBack[3],bladeBack[1],bladeBack[0]);
  bladeTriangle(bladeBack[3],bladeBack[2],bladeBack[1]);
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]]){
    bladeTriangle(bladeFront[b],bladeFront[a],bladeBack[a]);
    bladeTriangle(bladeFront[b],bladeBack[a],bladeBack[b]);
  }
  const tuftGeo=new THREE.BufferGeometry();
  tuftGeo.setAttribute('position',new THREE.Float32BufferAttribute(tuftPositions,3));
  tuftGeo.setAttribute('uv',new THREE.Float32BufferAttribute(tuftUvs,2));
  tuftGeo.computeVertexNormals();tuftGeo.computeBoundingSphere();
  const tufts=[];
  for(const c of columnRecords){
    if(!exposed(c)||c.h<1)continue;
    const count=hash(c.x,c.z,4)>.54?1:0;
    for(let i=0;i<count;i++){
      if(Math.abs(c.x)<2&&Math.abs(c.z)<2)continue;
      tufts.push({x:c.x-.27+hash(c.x,c.z,7)*.54,y:c.h+ .73,z:c.z-.27+hash(c.x,c.z,8)*.54,
        scale:.72+hash(c.x,c.z,9)*.48,rot:hash(c.x,c.z,10)*Math.PI});
    }
  }
  // Small groups of folded leaves break up the shelves without crossing the
  // z=0 walking lane. Their bases sit on the exact height of their columns.
  for(const [cx,cz] of [[-.95,.90],[1.45,.90],[-2.1,2.2],[1.7,-1.3],[2.8,1.7],[-3.8,-1.8],[-1.9,-2.5],[4.5,-2.5],[.8,2.7]]){
    const c=columnRecords.find(q=>q.x===Math.round(cx)&&q.z===Math.round(cz));
    if(!c)continue;
    for(let i=0;i<5;i++){
      const scale=.68+hash(cx+i,cz,37)*.7;
      tufts.push({x:cx+(i-2)*.115,y:c.h+.5+.23*scale,z:cz+(hash(cx+i,cz,38)-.5)*.26,
        scale,rot:(hash(cx,cz+i,39)-.5)*1.2});
    }
  }
  for(let i=tufts.length-1;i>=0;i--){
    const q=tufts[i];
    if(!isVegetated(q.x,q.z)){tufts.splice(i,1);continue;}
    if(surfaceY)q.y=(surfaceY(q.x,q.z)??q.y)+.23*q.scale;
  }
  const dummy=new THREE.Object3D();
  function addFoldedPaperEdge(material,key,edgeColor=[.08,.07,.045],strength=.20){
    material.onBeforeCompile=shader=>{
      shader.uniforms.foldedEdgeColor={value:new THREE.Color().setRGB(...edgeColor)};
      shader.uniforms.foldedEdgeStrength={value:strength};
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nuniform vec3 foldedEdgeColor;\nuniform float foldedEdgeStrength;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\n'
        +'vec3 foldedViewDir=normalize(vViewPosition);\n'
        +'float foldedFacing=pow(1.0-abs(dot(normal,foldedViewDir)),1.7);\n'
        +'diffuseColor.rgb += foldedEdgeColor*foldedFacing*foldedEdgeStrength;');
    };
    material.customProgramCacheKey=()=>`storybook-folded-edge-${key}`;
  }
  // The folds share the meadow's pigment texture, with a restrained sage
  // tint so the small silhouettes stay legible against the flatter turf.
  const tuftMat=grassMaterial.clone();
  tuftMat.name='storybook-cool-sage-folded-paper';
  tuftMat.color.set(0xb5cabd);
  tuftMat.normalMap=null;tuftMat.roughnessMap=null;tuftMat.aoMap=null;
  tuftMat.normalScale.set(0,0);tuftMat.aoMapIntensity=0;
  tuftMat.roughness=1;tuftMat.specularIntensity=.05;tuftMat.sheen=0;
  tuftMat.side=THREE.DoubleSide;
  addFoldedPaperEdge(tuftMat,'grass',[.070,.092,.058],.14);
  if(tufts.length){
    const mesh=new THREE.InstancedMesh(tuftGeo,tuftMat,tufts.length);
    mesh.name='terrain-folded-paper-grass';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    for(let i=0;i<tufts.length;i++){
      const q=tufts[i];dummy.position.set(q.x,q.y,q.z);dummy.rotation.set((hash(q.x,q.z,14)-.5)*.16,q.rot,(hash(q.x,q.z,15)-.5)*.18);dummy.scale.set(q.scale, q.scale*(.9+hash(q.x,q.z,13)*.25), q.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  // Rocks are folded paper cut-outs with a small spine, never glossy 3D
  // pebbles. The irregular outline gives the same readable silhouette from
  // the gameplay camera while the side strip receives a narrow edge highlight.
  const rockGeoWriter={positions:[],normals:[],uvs:[]};
  const rockRing=[];const rockCount=7;const rockDepth=.055;
  for(let i=0;i<rockCount;i++){
    const a=i/rockCount*Math.PI*2;
    const radius=.19+.055*Math.sin(i*2.37+1.2)+.025*Math.cos(i*4.1);
    rockRing.push([Math.cos(a)*radius,Math.sin(a)*radius*.72]);
  }
  const rockPoint=(x,y,z)=>[x,y,z];
  const rockEmit=(a,b,c,n)=>{
    for(const p of [a,b,c]){rockGeoWriter.positions.push(...p);rockGeoWriter.normals.push(...n);rockGeoWriter.uvs.push(p[0]*2+.5,p[1]*2+.5);}
  };
  for(let i=0;i<rockCount;i++){
    const j=(i+1)%rockCount;
    rockEmit(rockPoint(0,0,rockDepth),rockPoint(...rockRing[i],rockDepth),rockPoint(...rockRing[j],rockDepth),[0,0,1]);
    rockEmit(rockPoint(0,0,-rockDepth),rockPoint(...rockRing[j],-rockDepth),rockPoint(...rockRing[i],-rockDepth),[0,0,-1]);
    const a=rockRing[i],b=rockRing[j];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
    rockEmit(rockPoint(a[0],a[1],-rockDepth),rockPoint(b[0],b[1],-rockDepth),rockPoint(b[0],b[1],rockDepth),[dy/length,-dx/length,0]);
    rockEmit(rockPoint(a[0],a[1],-rockDepth),rockPoint(b[0],b[1],rockDepth),rockPoint(a[0],a[1],rockDepth),[dy/length,-dx/length,0]);
  }
  const stoneGeo=new THREE.BufferGeometry();
  stoneGeo.setAttribute('position',new THREE.Float32BufferAttribute(rockGeoWriter.positions,3));
  stoneGeo.setAttribute('normal',new THREE.Float32BufferAttribute(rockGeoWriter.normals,3));
  stoneGeo.setAttribute('uv',new THREE.Float32BufferAttribute(rockGeoWriter.uvs,2));
  stoneGeo.computeBoundingBox();stoneGeo.computeBoundingSphere();
  const stoneMat=new THREE.MeshPhysicalMaterial({color:0xbcb5c0,
    roughness:1,metalness:0,specularIntensity:.05,sheen:0,ior:1.38,flatShading:true});
  stoneMat.name='storybook-lilac-grey-paper-stones';
  stoneMat.side=THREE.DoubleSide;
  addFoldedPaperEdge(stoneMat,'stone',[.115,.092,.12],.18);
  const stones=[];
  for(const c of columnRecords){
    if(c.h<1||hash(c.x,c.z,22)<.84)continue;
    if(Math.abs(c.x)<3&&Math.abs(c.z)<2)continue;
    stones.push({x:c.x+.22-hash(c.x,c.z,23)*.44,y:c.h+.68,z:c.z+.22-hash(c.x,c.z,24)*.44,
      sx:.75+hash(c.x,c.z,25)*.8,sy:.55+hash(c.x,c.z,26)*.5,sz:.7+hash(c.x,c.z,27)*.65,rot:hash(c.x,c.z,28)*Math.PI});
  }
  for(const [x,z,sx,sy,sz] of [[-1.55,.60,1.45,.82,1.0],[2.25,-1.6,1.0,.7,.9]]){
    const c=columnRecords.find(q=>q.x===Math.round(x)&&q.z===Math.round(z));
    if(c)stones.push({x,y:c.h+.5+.16*sy,z,sx,sy,sz,rot:hash(x,z,52)*Math.PI});
  }
  for(let i=stones.length-1;i>=0;i--){
    const q=stones[i];
    if(!isVegetated(q.x,q.z)){stones.splice(i,1);continue;}
    if(surfaceY)q.y=(surfaceY(q.x,q.z)??q.y)+.16*q.sy;
  }
  if(stones.length){
    const mesh=new THREE.InstancedMesh(stoneGeo,stoneMat,stones.length);
    mesh.name='terrain-faceted-paper-stones';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    for(let i=0;i<stones.length;i++){
      const q=stones[i];dummy.position.set(q.x,q.y,q.z);
      // Keep the illustrated face toward the play camera; only a tiny pitch
      // and in-plane turn sell the folded spine without showing an edge-on bar.
      dummy.rotation.set((hash(q.x,q.z,53)-.5)*.10,0,q.rot);
      dummy.scale.set(q.sx,q.sy,q.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  return {group,tufts:tufts.length,stones:stones.length,dispose(){tuftGeo.dispose();tuftMat.dispose();stoneGeo.dispose();stoneMat.dispose();}};
}

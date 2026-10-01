/** Small folded-paper tufts and stones that make the voxel platforms read as a
 * handmade diorama. They are render-only; gameplay still uses columnRecords. */
export function createTerrainDressing({THREE,parent,columnRecords,grassMaterial}){
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
  for(const [cx,cz] of [[-2.1,1.3],[1.7,-1.3],[2.8,1.7],[-3.8,-1.8],[-1.9,-2.5],[4.5,-2.5],[.8,2.7]]){
    const c=columnRecords.find(q=>q.x===Math.round(cx)&&q.z===Math.round(cz));
    if(!c)continue;
    for(let i=0;i<5;i++){
      const scale=.68+hash(cx+i,cz,37)*.7;
      tufts.push({x:cx+(i-2)*.115,y:c.h+.5+.23*scale,z:cz+(hash(cx+i,cz,38)-.5)*.26,
        scale,rot:hash(cx,cz+i,39)*Math.PI});
    }
  }
  const dummy=new THREE.Object3D();
  if(tufts.length){
    const mesh=new THREE.InstancedMesh(tuftGeo,grassMaterial,tufts.length);
    mesh.name='terrain-folded-paper-grass';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    for(let i=0;i<tufts.length;i++){
      const q=tufts[i];dummy.position.set(q.x,q.y,q.z);dummy.rotation.set((hash(q.x,q.z,14)-.5)*.16,q.rot,(hash(q.x,q.z,15)-.5)*.18);dummy.scale.set(q.scale, q.scale*(.9+hash(q.x,q.z,13)*.25), q.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  const stoneGeo=new THREE.IcosahedronGeometry(.24,0);
  const stoneMat=new THREE.MeshPhysicalMaterial({color:0xcbbbaf,normalMap:grassMaterial.normalMap,
    normalScale:new THREE.Vector2(.28,.28),roughnessMap:grassMaterial.roughnessMap,
    aoMap:grassMaterial.aoMap,aoMapIntensity:.35,
    roughness:1,metalness:0,specularIntensity:.18,ior:1.38,flatShading:true});
  stoneMat.name='terrain-pale-paper-stones';
  const stones=[];
  for(const c of columnRecords){
    if(c.h<1||hash(c.x,c.z,22)<.84)continue;
    if(Math.abs(c.x)<3&&Math.abs(c.z)<2)continue;
    stones.push({x:c.x+.22-hash(c.x,c.z,23)*.44,y:c.h+.68,z:c.z+.22-hash(c.x,c.z,24)*.44,
      sx:.75+hash(c.x,c.z,25)*.8,sy:.55+hash(c.x,c.z,26)*.5,sz:.7+hash(c.x,c.z,27)*.65,rot:hash(c.x,c.z,28)*Math.PI});
  }
  for(const [x,z,sx,sy,sz] of [[-2.2,1.7,1.45,.82,1.0],[2.25,-1.6,1.0,.7,.9]]){
    const c=columnRecords.find(q=>q.x===Math.round(x)&&q.z===Math.round(z));
    if(c)stones.push({x,y:c.h+.5+.16*sy,z,sx,sy,sz,rot:hash(x,z,52)*Math.PI});
  }
  if(stones.length){
    const mesh=new THREE.InstancedMesh(stoneGeo,stoneMat,stones.length);
    mesh.name='terrain-faceted-paper-stones';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    for(let i=0;i<stones.length;i++){
      const q=stones[i];dummy.position.set(q.x,q.y,q.z);dummy.rotation.set(q.rot*.37,q.rot,q.rot*.21);dummy.scale.set(q.sx,q.sy,q.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  return {group,tufts:tufts.length,stones:stones.length,dispose(){tuftGeo.dispose();stoneGeo.dispose();stoneMat.dispose();}};
}

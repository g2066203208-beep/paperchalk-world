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
  const tuftGeo=new THREE.ConeGeometry(.14,.46,4,1);
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
  const dummy=new THREE.Object3D();
  if(tufts.length){
    const mesh=new THREE.InstancedMesh(tuftGeo,grassMaterial,tufts.length);
    mesh.name='terrain-folded-paper-grass';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    for(let i=0;i<tufts.length;i++){
      const q=tufts[i];dummy.position.set(q.x,q.y,q.z);dummy.rotation.set(0,q.rot,0);dummy.scale.set(q.scale, q.scale*(.9+hash(q.x,q.z,13)*.25), q.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  }
  const stoneGeo=new THREE.IcosahedronGeometry(.24,0);
  const stoneMat=new THREE.MeshStandardMaterial({color:0xb9a99b,roughness:.96,metalness:0,flatShading:true});
  stoneMat.name='terrain-pale-paper-stones';
  const stones=[];
  for(const c of columnRecords){
    if(c.h<1||hash(c.x,c.z,22)<.84)continue;
    if(Math.abs(c.x)<3&&Math.abs(c.z)<2)continue;
    stones.push({x:c.x+.22-hash(c.x,c.z,23)*.44,y:c.h+.68,z:c.z+.22-hash(c.x,c.z,24)*.44,
      sx:.75+hash(c.x,c.z,25)*.8,sy:.55+hash(c.x,c.z,26)*.5,sz:.7+hash(c.x,c.z,27)*.65,rot:hash(c.x,c.z,28)*Math.PI});
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

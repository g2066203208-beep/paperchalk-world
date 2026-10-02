/** Small authored cut-paper sets placed behind the playable route. */
export function createStageScenery({THREE,scene,world}){
  const group=new THREE.Group();group.name='Handcrafted paper stage sets';scene.add(group);
  const palette={cream:0xe5d4ae,edge:0xbba078,rose:0xb97965,roof:0x915e55,ink:0x655851,
    blue:0x97beb6,water:0xbad3c4,white:0xe9dfbd,sage:0x80916c,dark:0x627960};
  const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,
    new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,flatShading:true})]));
  function card(points,x,y,z,material,depth=.05,parent=group){
    const shape=new THREE.Shape();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.006,bevelSegments:1,steps:1});
    const mesh=new THREE.Mesh(geometry,[materials[material],materials.edge]);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const rect=(w,h)=>[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]];
  function cottage(x,z,scale,roofColor){
    const set=new THREE.Group();set.name='Folded paper cottage';set.position.set(x,world.surfaceY(x,0)??.5,z);set.scale.setScalar(scale);group.add(set);
    card([[-1,0],[1,0],[.96,1.66],[0,2.25],[-.98,1.62]],0,0,0,'cream',.12,set);
    card([[-1.22,1.57],[0,2.42],[1.25,1.58],[1.07,1.51],[0,2.20],[-1.07,1.51]],0,0,.16,roofColor,.06,set);
    // Overlapping cut strips expose the thickness of the roof stock.
    for(let row=0;row<4;row++){
      const y=1.65+row*.155,half=1.03-row*.235;
      card([[-half,y],[half,y],[Math.max(.05,half-.14),y+.11],[-Math.max(.05,half-.14),y+.11]],0,0,.23+row*.003,roofColor,.018,set);
    }
    card(rect(.5,1.08),.30,0,.17,'ink',.035,set);
    card(rect(.40,1.02),.30,.02,.21,'rose',.025,set);
    card(rect(.08,.10),.43,.43,.25,'cream',.01,set);
    card(rect(.55,.61),-.50,.66,.17,'ink',.022,set);
    card(rect(.43,.49),-.50,.72,.20,'white',.02,set);
    card(rect(.045,.49),-.50,.72,.23,'edge',.025,set);
    card(rect(.43,.045),-.50,.95,.23,'edge',.025,set);
    card(rect(.67,.08),-.50,.61,.23,'rose',.08,set);
    card(rect(.32,.52),.61,1.84,-.03,'rose',.08,set);
    card(rect(.43,.08),.61,2.34,-.01,'cream',.09,set);
    for(let i=0;i<4;i++)card([[-.14,0],[.13,0],[.05,.33],[-.04,.40]],-.76+i*.45,-.04,.24,'sage',.025,set);
  }
  cottage(20.1,-3.3,1.25,'roof');cottage(23.0,-5.1,.83,'rose');
  function sign(x){
    const y=world.groundBelow(x,2)?.y??.5,z=-.8;
    card(rect(.085,.8),x,y,z,'edge',.05);
    card([[-.45,0],[.28,0],[.45,.17],[.28,.34],[-.45,.34]],x,y+.6,z+.04,'cream',.07);
    card([[-.18,.12],[.08,.12],[.08,.04],[.24,.17],[.08,.28],[.08,.20],[-.18,.20]],x,y+.6,z+.13,'ink',.009);
  }
  sign(3.1);sign(13.1);
  // A narrow fence marks the village; every picket is a silhouette on card.
  for(const x of [17.5,18,18.5,23.4,23.9,24.4]){
    const y=world.groundBelow(x,2)?.y??.5;
    card([[-.075,0],[.075,0],[.075,.55],[0,.65],[-.075,.55]],x,y,-1.8,'cream',.045);
  }
  for(const [x,w] of [[18,1.18],[23.9,1.18]])card(rect(w,.065),x,(world.surfaceY(x)??.5)+.3,-1.85,'edge',.04);
  // Bake nested cottage placement once, then draw each paper stock together.
  // Retain the shadow behaviour of each paper stock when merging.
  group.updateWorldMatrix(true,true);
  const inverseGroup=new THREE.Matrix4().copy(group.matrixWorld).invert(),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),batches=new Map(),sourceGeometries=new Set();
  let sourceMeshes=0,vertices=0;
  group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    sourceMeshes++;sourceGeometries.add(mesh.geometry);matrix.multiplyMatrices(inverseGroup,mesh.matrixWorld);normalMatrix.getNormalMatrix(matrix);
    const geometry=mesh.geometry,p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    const parts=geometry.groups.length?geometry.groups:[{start:0,count:geometry.index?.count??p.count,materialIndex:0}];
    for(const part of parts){
      const material=Array.isArray(mesh.material)?mesh.material[part.materialIndex]:mesh.material;
      const key=material.uuid+'/'+mesh.castShadow+'/'+mesh.receiveShadow;
      if(!batches.has(key))batches.set(key,{material,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,positions:[],normals:[],uvs:[]});
      const batch=batches.get(key);
      for(let i=part.start;i<part.start+part.count;i++){
        const index=geometry.index?geometry.index.getX(i):i;
        point.fromBufferAttribute(p,index).applyMatrix4(matrix);normal.fromBufferAttribute(n,index).applyNormalMatrix(normalMatrix);
        batch.positions.push(point.x,point.y,point.z);batch.normals.push(normal.x,normal.y,normal.z);
        batch.uvs.push(uv?.getX(index)??0,uv?.getY(index)??0);vertices++;
      }
    }
  });
  group.clear();for(const geometry of sourceGeometries)geometry.dispose();
  for(const batch of batches.values()){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.name='Batched cut-paper set';mesh.castShadow=batch.castShadow;mesh.receiveShadow=batch.receiveShadow;group.add(mesh);
  }
  group.userData={sourceMeshes,batches:batches.size,triangles:vertices/3};
  return {group};
}

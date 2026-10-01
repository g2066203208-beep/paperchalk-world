import {rng,hash3} from './math.js';

/** A forest assembled from thick pressed-pulp pieces, with shared PBR maps. */
export function createForest({THREE,scene,paperGrassSet,paperDirtSet,standardPaperMaterial}){
  const canopyGroup=new THREE.Group();
  canopyGroup.name='Layered pulp forest';
  scene.add(canopyGroup);

  // Source maps already contain pigment; another green/brown tint made them black.
  const forestLeafMats=[0xffffff,0xfffcf4,0xf4f6df].map(color=>
    standardPaperMaterial(paperGrassSet,{normalScale:.62,roughness:1,color,ao:.24})
  );
  const forestTrunkMats=[0xffffff,0xfff4e9,0xffecd8].map(color=>
    standardPaperMaterial(paperDirtSet,{normalScale:.35,roughness:1,color,ao:.28})
  );
  const forestFloorMat=standardPaperMaterial(paperGrassSet,{
    normalScale:.85,roughness:1,color:0xffffff,ao:.3
  });

  function geometryWriter(){
    const positions=[],normals=[],uvs=[];
    function triangle(a,b,c,normal){
      if(!normal){
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2];
        const vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
        const length=Math.hypot(nx,ny,nz)||1;
        normal=[nx/length,ny/length,nz/length];
      }
      for(const point of [a,b,c]){
        positions.push(point[0],point[1],point[2]);
        normals.push(...normal);uvs.push(point[3],point[4]);
      }
    }
    function quad(a,b,c,d){triangle(a,b,d);triangle(b,c,d);}
    function finish(){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      return geometry;
    }
    return {triangle,quad,finish};
  }

  // Extend the same textured ground beneath the trees. Its front edge sits
  // just below the terrain top; world UVs match the terrain's [x, -z] mapping.
  // The two side strips also ground the nearer framing trees beyond the tiles.
  const floorWriter=geometryWriter();
  function floorPoint(x,z){
    const distance=Math.max(0,Math.min(1,(-z-3.5)/22.5));
    const rise=distance*distance*(3-2*distance);
    const y=.48+rise*.34;
    return [x,y,z,x,-z];
  }
  function floorPatch(minX,maxX,minZ,maxZ,columns,rows){
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const x0=minX+(maxX-minX)*column/columns;
      const x1=minX+(maxX-minX)*(column+1)/columns;
      const z0=minZ+(maxZ-minZ)*row/rows;
      const z1=minZ+(maxZ-minZ)*(row+1)/rows;
      floorWriter.quad(floorPoint(x0,z1),floorPoint(x1,z1),floorPoint(x1,z0),floorPoint(x0,z0));
    }
  }
  floorPatch(-42,42,-65,-3.5,28,16);
  floorPatch(-24,-7.5,-3.5,4,9,4);
  floorPatch(7.5,24,-3.5,4,9,4);
  const forestFloorGeometry=floorWriter.finish();
  const forestFloor=new THREE.Mesh(forestFloorGeometry,forestFloorMat);
  forestFloor.name='Continuous pulp forest floor';
  forestFloor.receiveShadow=true;
  canopyGroup.add(forestFloor);

  // Four rings: front face, rounded bevel, cut edge and rear bevel.
  // Seven gentle scallops make a hand-torn outline without polygon spikes.
  function crownGeometry(seed){
    const random=rng(9100+seed*97),writer=geometryWriter(),count=28;
    const phase=random()*Math.PI*2;
    const rings=[[],[],[],[]];
    const radii=[.945,1,1,.945],depths=[.072,.032,-.032,-.072];
    for(let ring=0;ring<4;ring++)for(let i=0;i<count;i++){
      const angle=Math.PI*2*i/count;
      const outline=1+.044*Math.cos(angle*7+phase)+.025*Math.sin(angle*3+phase*.63);
      const x=Math.cos(angle)*outline*radii[ring];
      const y=Math.sin(angle)*outline*radii[ring]*.66;
      const z=depths[ring]+Math.sin(angle*3+phase)*.009;
      rings[ring].push([x,y,z,x*.55+.5,y*.55+.5]);
    }
    const front=[0,0,.072,.5,.5],back=[0,0,-.072,.5,.5];
    for(let i=0;i<count;i++){
      const j=(i+1)%count;
      writer.triangle(front,rings[0][i],rings[0][j],[0,0,1]);
      writer.triangle(back,rings[3][j],rings[3][i],[0,0,-1]);
      for(let ring=0;ring<3;ring++)writer.quad(rings[ring][i],rings[ring+1][i],rings[ring+1][j],rings[ring][j]);
    }
    return writer.finish();
  }
  const crownGeometries=[1,2,3,4].map(crownGeometry);

  // Broad paper faces and narrow bevels, with actual depth and stable shadows.
  function trunkGeometry(){
    const writer=geometryWriter();
    const perimeter=[[-.43,-.29],[.43,-.29],[.5,-.22],[.5,.22],[.43,.29],[-.43,.29],[-.5,.22],[-.5,-.22]];
    const heights=[0,.28,.66,1],rings=[];
    for(let level=0;level<heights.length;level++){
      const y=heights[level],taper=1-y*.105;
      rings.push(perimeter.map(([x,z],i)=>{
        const wobble=1+Math.sin(i*2.1+level*1.8)*.014;
        return [x*taper*wobble,y-.5,z*taper*wobble,i/8*1.8,y*4.8];
      }));
    }
    for(let i=0;i<8;i++){
      const j=(i+1)%8;
      for(let level=0;level<rings.length-1;level++){
        const a=rings[level][i],b=rings[level+1][i];
        const c=[...rings[level+1][j]],d=[...rings[level][j]];
        if(j===0){c[3]=1.8;d[3]=1.8;}
        writer.quad(a,b,c,d);
      }
      writer.triangle([0,-.5,0,.5,.5],rings[0][i],rings[0][j],[0,-1,0]);
      writer.triangle([0,.5,0,.5,.5],rings[3][j],rings[3][i],[0,1,0]);
    }
    return writer.finish();
  }
  const trunkGeo=trunkGeometry(),trees=[];

  function queueTree(x,z,layer,seed,scale=1){
    const random=rng(12000+seed*41);
    // Keep three distinct raised layers, with a lower canopy that frames the
    // scene while preserving the open illuminated gaps between the trunks.
    const crownBase=(3.25+layer*.62)*scale;
    const bottom=-.4*scale,top=crownBase+.92*scale;
    const trunk={x:x+(random()-.5)*.10*scale,y:(bottom+top)*.5,z:z-.32*scale,
      width:(.39+random()*.17)*scale,height:top-bottom,rot:(random()-.5)*.022,layer};
    const crowns=[];
    for(let tier=0;tier<3;tier++){
      crowns.push({geo:(seed+tier)%crownGeometries.length,
        x:x+[-.32,.34,-.06][tier]*scale+(random()-.5)*.15*scale,
        y:crownBase+[0,.44,.98][tier]*scale,
        z:z+[.18,.025,-.16][tier]*scale,
        sx:(1.10+random()*.23)*scale,sy:(.89+random()*.19)*scale,
        depth:scale,rot:(random()-.5)*.24,tilt:(random()-.5)*.12,layer});
    }
    trees.push({trunk,crowns});
  }

  const layers=[
    {z:-5.0,count:10,span:20,jitter:.68,scale:1.16},
    {z:-8.4,count:12,span:24,jitter:.92,scale:1.06},
    {z:-12.6,count:14,span:28,jitter:1.18,scale:.98}
  ];
  layers.forEach((config,layer)=>{
    for(let i=0;i<config.count;i++){
      const x=(i/(config.count-1)-.5)*config.span+(hash3(layer*97+i*17,31,11)-.5)*config.jitter;
      const z=config.z+(hash3(i*23,layer*61,19)-.5)*.64;
      const scale=config.scale+(hash3(i,layer,88)-.5)*.08;
      queueTree(x,z,layer,layer*100+i*13+7,scale);
    }
  });
  [[-9.2,-2.2,0,1.45],[-8.6,.8,0,1.35],[9,-2,0,1.45],[8.5,1.2,0,1.35]]
    .forEach((data,i)=>queueTree(data[0],data[1],data[2],700+i*29,data[3]));

  const dummy=new THREE.Object3D();
  function instances(geometry,material,items,name,configure){
    if(!items.length)return;
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    mesh.name=name;mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    // These opaque crown cards stand for porous foliage. Trunks provide the
    // clearing's long shadows; solid canopy silhouettes would seal its sky.
    mesh.castShadow=!name.startsWith('Layered crowns ');mesh.receiveShadow=true;mesh.frustumCulled=false;
    items.forEach((item,index)=>{
      configure(item);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;canopyGroup.add(mesh);
  }
  for(let layer=0;layer<3;layer++){
    const trunks=trees.map(tree=>tree.trunk).filter(trunk=>trunk.layer===layer);
    instances(trunkGeo,forestTrunkMats[layer],trunks,`Pulp trunks ${layer}`,trunk=>{
      dummy.position.set(trunk.x,trunk.y,trunk.z);
      dummy.rotation.set(0,0,trunk.rot);dummy.scale.set(trunk.width,trunk.height,trunk.width);
    });
    for(let geo=0;geo<crownGeometries.length;geo++){
      const crowns=trees.flatMap(tree=>tree.crowns).filter(crown=>crown.layer===layer&&crown.geo===geo);
      instances(crownGeometries[geo],forestLeafMats[layer],crowns,`Layered crowns ${layer}/${geo}`,crown=>{
        dummy.position.set(crown.x,crown.y,crown.z);
        dummy.rotation.set(crown.tilt,0,crown.rot);dummy.scale.set(crown.sx,crown.sy,crown.depth);
      });
    }
  }
  canopyGroup.userData.forest={trees:trees.length,crowns:trees.length*3,
    floorTriangles:forestFloorGeometry.attributes.position.count/3,
    triangles:trees.length*(64+3*224)+forestFloorGeometry.attributes.position.count/3};
  return {canopyGroup};
}

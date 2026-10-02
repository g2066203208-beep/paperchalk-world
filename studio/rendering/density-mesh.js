/**
 * Extract one continuous terrain skin from a sampled signed-density volume.
 * Negative samples are solid. Adjacent cubes use the same six tetrahedra and
 * share each sample-edge intersection, including intersections on diagonals.
 * This keeps brush-cut caves, overhangs and the outer skin connected without
 * exposing the storage grid as cubes.
 */
const CUBE_CORNERS=[
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1],
];
const TETRAHEDRA=[
  [0,5,1,6],[0,1,2,6],[0,2,3,6],
  [0,3,7,6],[0,7,4,6],[0,4,5,6],
];

export function createDensityTerrainGeometry({THREE,world}={}) {
  if(!THREE?.BufferGeometry)throw new TypeError('THREE is required');
  const {nx,ny,nz,step,min,values}=world??{};
  if(![nx,ny,nz].every(n=>Number.isInteger(n)&&n>=2)
    ||!Number.isFinite(step)||step<=0
    ||![min?.x,min?.y,min?.z].every(Number.isFinite)
    ||!values||values.length!==nx*ny*nz){
    throw new TypeError('Expected a finite signed-density grid');
  }
  const index=(x,y,z)=>(z*ny+y)*nx+x;
  const positions=[],normals=[],uvs=[],dirt=[],grass=[];
  const intersections=new Map(),gradientCache=new Map();
  let activeCells=0;

  function sampleGradient(id,x,y,z){
    if(gradientCache.has(id))return gradientCache.get(id);
    const xm=Math.max(0,x-1),xp=Math.min(nx-1,x+1);
    const ym=Math.max(0,y-1),yp=Math.min(ny-1,y+1);
    const zm=Math.max(0,z-1),zp=Math.min(nz-1,z+1);
    const gradient=[
      (values[index(xp,y,z)]-values[index(xm,y,z)])/((xp-xm)*step),
      (values[index(x,yp,z)]-values[index(x,ym,z)])/((yp-ym)*step),
      (values[index(x,y,zp)]-values[index(x,y,zm)])/((zp-zm)*step),
    ];
    gradientCache.set(id,gradient);return gradient;
  }

  function vertex(a,b){
    // Sort the source edge before interpolation so every incident tetrahedron
    // obtains bit-identical coordinates and normals from the same operation.
    if(a.id>b.id)[a,b]=[b,a];
    const t=Math.max(0,Math.min(1,a.d/(a.d-b.d)));
    // Several crossing edges can end at a zero-valued sample. Weld that exact
    // sample separately so an authored zero plane cannot leave a tiny crack.
    const key=t===0?'v'+a.id:t===1?'v'+b.id:a.id+':'+b.id;
    const old=intersections.get(key);
    if(old!==undefined)return old;
    const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
    const px=min.x+x*step,py=min.y+y*step,pz=min.z+z*step;
    const ga=sampleGradient(a.id,a.x,a.y,a.z),gb=sampleGradient(b.id,b.x,b.y,b.z);
    const n=ga.map((g,i)=>g+(gb[i]-g)*t),length=Math.hypot(...n)||1;
    const result=positions.length/3;
    positions.push(px,py,pz);normals.push(n[0]/length,n[1]/length,n[2]/length);
    uvs.push(px,-pz);
    intersections.set(key,result);return result;
  }

  function triangle(a,b,c,outward){
    if(a===b||a===c||b===c)return;
    const ax=positions[a*3],ay=positions[a*3+1],az=positions[a*3+2];
    const bx=positions[b*3]-ax,by=positions[b*3+1]-ay,bz=positions[b*3+2]-az;
    const cx=positions[c*3]-ax,cy=positions[c*3+1]-ay,cz=positions[c*3+2]-az;
    let nx=by*cz-bz*cy,ny=bz*cx-bx*cz,nz=bx*cy-by*cx;
    const length=Math.hypot(nx,ny,nz);
    if(length<1e-12)return;
    // Outward is the direction from inside to outside within this tetrahedron,
    // which is reliable even where a sampled central gradient is nearly zero.
    if(nx*outward[0]+ny*outward[1]+nz*outward[2]<0){
      [b,c]=[c,b];nx=-nx;ny=-ny;nz=-nz;
    }
    (ny/length>.6?grass:dirt).push(a,b,c);
  }

  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const cube=CUBE_CORNERS.map(([dx,dy,dz])=>{
      const sx=x+dx,sy=y+dy,sz=z+dz,id=index(sx,sy,sz);
      const d=values[id];
      if(!Number.isFinite(d))throw new TypeError('Density samples must be finite');
      return {x:sx,y:sy,z:sz,id,d};
    });
    const count=cube.reduce((sum,p)=>sum+(p.d<0?1:0),0);
    if(count===0||count===8)continue;
    activeCells++;
    for(const ids of TETRAHEDRA){
      const inside=[],outside=[];
      for(const id of ids)(cube[id].d<0?inside:outside).push(cube[id]);
      if(!inside.length||!outside.length)continue;
      const mean=points=>[0,1,2].map(axis=>points.reduce((sum,p)=>sum+p[['x','y','z'][axis]],0)/points.length);
      const solid=mean(inside),empty=mean(outside),outward=empty.map((v,i)=>v-solid[i]);
      if(inside.length===1){
        const a=inside[0];triangle(vertex(a,outside[0]),vertex(a,outside[1]),vertex(a,outside[2]),outward);
      }else if(outside.length===1){
        const a=outside[0];triangle(vertex(a,inside[0]),vertex(a,inside[1]),vertex(a,inside[2]),outward);
      }else{
        const [a,b]=inside,[c,d]=outside;
        const ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);
        triangle(ac,ad,bd,outward);triangle(ac,bd,bc,outward);
      }
    }
  }

  const indices=dirt.concat(grass),edges=new Map();
  for(let i=0;i<indices.length;i+=3)for(let e=0;e<3;e++){
    const a=indices[i+e],b=indices[i+(e+1)%3],key=a<b?a+':'+b:b+':'+a;
    edges.set(key,(edges.get(key)??0)+1);
  }
  const openEdges=[...edges.values()].filter(count=>count!==2).length;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.addGroup(0,dirt.length,0);geometry.addGroup(dirt.length,grass.length,1);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={continuousTerrain:true,densitySurface:true,slopes:true,triangles:indices.length/3,
    vertices:positions.length/3,activeCells,edges:edges.size,openEdges,closed:indices.length>0&&openEdges===0,
    topTriangles:grass.length/3,sideTriangles:dirt.length/3,visibleFaces:indices.length/3,
    bounds:geometry.boundingBox.isEmpty()?null:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()}};
  return geometry;
}

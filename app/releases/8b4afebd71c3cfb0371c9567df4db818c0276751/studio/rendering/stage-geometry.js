/** Closed paperboard scenery, built directly from the walkable profile. */
export function createStagePlatformGeometry({THREE,platform}){
  const positions=[],uvs=[],paperDepths=[],batches=[[],[],[],[]];
  const profile=platform.profile;
  const thin=platform.kind!=='ground';
  const depthAt=x=>thin?platform.thickness:1.32+.10*Math.sin(x*.73);
  function section(point){
    const {x,y}=point,depth=depthAt(x);
    const inset=thin?.025:.14,front=platform.frontZ,back=platform.backZ;
    // Outer liners surround a broad exposed corrugated core.
    const bands=thin?[
      [back+inset,0],[front-inset,0],[front,.035],[front,depth-.025],
      [front-inset,depth],[back+inset,depth],[back,depth-.025],[back,.035],
    ]:[
      [back+inset,0],[front-inset,0],[front,.045],[front,.10],
      [front-.005,.135],[front-.035,depth-.12],[front-.08,depth-.055],
      [front-.13,depth],[back+.13,depth],[back+.08,depth-.055],
      [back+.035,depth-.12],[back,.135],[back,.10],[back,.045],
    ];
    return bands.map(([z,d])=>[x,y-d,z]);
  }
  function triangle(a,b,c,material=0){
    const offset=positions.length/3;
    for(const p of [a,b,c]){
      const profileY=profile.find(q=>q.x===p[0]).y;
      positions.push(...p);uvs.push(p[0],material===1?p[2]:p[1]);paperDepths.push(profileY-p[1]);
    }
    batches[material].push(offset,offset+1,offset+2);
  }
  function materialFor(edge){
    if(edge===0)return 1;
    if(thin)return edge===1||edge===3||edge===5||edge===7?2:0;
    if([1,3,5,9,11,13].includes(edge))return 2;
    if(edge===2||edge===12)return 1;
    if(edge===6||edge===8)return 3;
    return 0;
  }
  const sections=profile.map(section);
  for(let i=1;i<sections.length;i++){
    const a=sections[i-1],b=sections[i];
    for(let j=0;j<a.length;j++){
      const k=(j+1)%a.length,material=materialFor(j);
      triangle(a[j],b[k],b[j],material);triangle(a[j],a[k],b[k],material);
    }
  }
  for(const [index,reverse] of [[0,true],[sections.length-1,false]]){
    const ring=sections[index],center=[profile[index].x,profile[index].y-depthAt(profile[index].x)*.5,(platform.frontZ+platform.backZ)*.5];
    for(let j=0;j<ring.length;j++){
      const k=(j+1)%ring.length;
      if(reverse)triangle(center,ring[k],ring[j]);else triangle(center,ring[j],ring[k]);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('paperDepth',new THREE.Float32BufferAttribute(paperDepths,1));
  geometry.setIndex(batches.flat());
  let offset=0;for(let i=0;i<batches.length;i++){geometry.addGroup(offset,batches[i].length,i);offset+=batches[i].length;}
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={platformId:platform.id,kind:platform.kind,triangles:positions.length/9,
    vertices:positions.length/3,profile:profile.map(p=>({...p})),paperboard:true};
  return geometry;
}

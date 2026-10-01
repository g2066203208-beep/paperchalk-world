/** Render-only torn paper turf. Collision columns remain exact unit cubes. */
export function createGrassRimGeometry({THREE,columnRecords,segments=12}){
  const heights=new Map(columnRecords.map(({x,z,h})=>[`${x},${z}`,h]));
  const edges=[];
  const directions=[
    {dx:1,dz:0,a:[.5,.5],b:[.5,-.5]},
    {dx:-1,dz:0,a:[-.5,-.5],b:[-.5,.5]},
    {dx:0,dz:1,a:[-.5,.5],b:[.5,.5]},
    {dx:0,dz:-1,a:[.5,-.5],b:[-.5,-.5]}
  ];
  for(const {x,z,h} of columnRecords){
    for(const side of directions){
      if((heights.get(`${x+side.dx},${z+side.dz}`)??-Infinity)>=h)continue;
      edges.push({a:[x+side.a[0],z+side.a[1]],b:[x+side.b[0],z+side.b[1]],
        y:h+.5,n:[side.dx,side.dz],cell:[x,z]});
    }
  }
  const key=(p,y)=>`${p[0]},${y},${p[1]}`;
  const starts=new Map();
  for(const edge of edges){
    const k=key(edge.a,edge.y);
    if(!starts.has(k))starts.set(k,[]);
    starts.get(k).push(edge);
  }
  // Trace touching plateaus separately. Turning towards the owning cell avoids
  // joining diagonally touching islands into a single, crossing corner miter.
  for(const edge of edges){
    const candidates=starts.get(key(edge.b,edge.y))??[];
    const vx=edge.b[0]-edge.a[0],vz=edge.b[1]-edge.a[1];
    edge.next=candidates.slice().sort((a,b)=>{
      const turn=e=>{
        const ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1];
        return Math.atan2(vx*ez-vz*ex,vx*ex+vz*ez);
      };
      return turn(a)-turn(b);
    })[0]??edge;
  }
  for(const edge of edges)edge.next.previous=edge;
  const positions=[],normals=[],uvs=[];
  const hash=(x,z)=>{
    const n=Math.sin(x*127.1+z*311.7+91.73)*43758.5453123;
    return n-Math.floor(n);
  };
  function noise(x,z){
    const ix=Math.floor(x),iz=Math.floor(z);
    let fx=x-ix,fz=z-iz;
    fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);
    const a=hash(ix,iz)*(1-fx)+hash(ix+1,iz)*fx;
    const b=hash(ix,iz+1)*(1-fx)+hash(ix+1,iz+1)*fx;
    return a*(1-fz)+b*fz;
  }
  function miter(edge,atEnd){
    const other=atEnd?edge.next:edge.previous;
    const nx=edge.n[0]+(other?.n[0]??edge.n[0]);
    const nz=edge.n[1]+(other?.n[1]??edge.n[1]);
    const scale=Math.max(Math.abs(nx),Math.abs(nz),1);
    return [nx/scale,nz/scale];
  }
  function profile(edge,t){
    const x=edge.a[0]+(edge.b[0]-edge.a[0])*t;
    const z=edge.a[1]+(edge.b[1]-edge.a[1])*t;
    const start=miter(edge,false),end=miter(edge,true);
    // Only the last short section bends around a corner. Straight tile joins
    // share the identical world-space noise sample and never create seams.
    const corner=1/segments;
    const s=Math.max(0,1-t/corner),e=Math.max(0,1-(1-t)/corner);
    const nx=edge.n[0]*(1-s-e)+start[0]*s+end[0]*e;
    const nz=edge.n[1]*(1-s-e)+start[1]*s+end[1]*e;
    const broad=noise(x*6.2+edge.y*1.1,z*6.2-edge.y*.7);
    const torn=noise(x*19.7+17,z*19.7-13);
    // The reference has a visible compressed grass stock, not a one-pixel
    // bevel: let the torn lip hang 6–11 cm and drop 13–27 cm below the top.
    const overhang=.060+.050*broad;
    const depth=.130+.110*broad+.030*torn;
    const bevel=.013+.008*torn;
    return {
      inner:[x,edge.y+.0007,z],
      shoulder:[x+nx*overhang,edge.y-bevel,z+nz*overhang],
      bottom:[x+nx*(overhang*.83),edge.y-depth,z+nz*(overhang*.83)],
      tucked:[x-nx*.002,edge.y-depth+.008,z-nz*.002]
    };
  }
  function emitTriangle(a,b,c,normalHint,top){
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
    const ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(n[0]*normalHint[0]+n[1]*normalHint[1]+n[2]*normalHint[2]<0){[b,c]=[c,b];n=n.map(v=>-v);}
    const length=Math.hypot(...n);
    if(length<1e-9)return;
    n=n.map(v=>v/length);
    for(const p of [a,b,c]){
      positions.push(...p);normals.push(...n);
      if(top)uvs.push(p[0],-p[2]);
      else if(Math.abs(normalHint[0])>.5)uvs.push(-normalHint[0]*p[2],p[1]);
      else uvs.push(normalHint[2]*p[0],p[1]);
    }
  }
  function quad(a,b,c,d,hint,top=false){
    emitTriangle(a,b,c,hint,top);emitTriangle(a,c,d,hint,top);
  }
  for(const edge of edges){
    for(let i=0;i<segments;i++){
      const a=profile(edge,i/segments),b=profile(edge,(i+1)/segments);
      const outward=[edge.n[0],0,edge.n[1]];
      quad(a.inner,b.inner,b.shoulder,a.shoulder,[0,1,0],true);
      quad(a.shoulder,b.shoulder,b.bottom,a.bottom,outward);
      quad(a.bottom,b.bottom,b.tucked,a.tucked,[0,-1,0]);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={boundaryEdges:edges.length,segments,triangles:positions.length/9,
    maxOverhang:.110,maxDepth:.270};
  return geometry;
}

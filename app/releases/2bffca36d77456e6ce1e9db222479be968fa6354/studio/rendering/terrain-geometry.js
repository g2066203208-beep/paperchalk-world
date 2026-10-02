/** A small real chamfer on convex exposed voxel edges. Neighboring coplanar
 * faces retain their shared grid positions: a plateau never gets tile seams. */
export function createBeveledTerrainGeometry({THREE,columnRecords,bevel=.018}){
  const occupied=new Set();
  for(const {x,z,h} of columnRecords)for(let y=0;y<=h;y++)occupied.add(`${x},${y},${z}`);
  const axes=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const buffers=[{p:[],n:[],uv:[]},{p:[],n:[],uv:[]}];
  let visibleFaces=0,bevelTriangles=0;
  function emit(points,hint,top=false,isBevel=false){
    let [a,b,c]=points;
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(n.reduce((s,v,i)=>s+v*hint[i],0)<0){[b,c]=[c,b];n=n.map(v=>-v);}
    const length=Math.hypot(...n);if(length<1e-9)return;
    n=n.map(v=>v/length);const out=buffers[top?1:0];
    for(const p of [a,b,c]){
      out.p.push(...p);out.n.push(...n);
      if(top)out.uv.push(p[0],-p[2]);
      else if(Math.abs(hint[0])>Math.abs(hint[2]))out.uv.push(-Math.sign(hint[0])*p[2],p[1]);
      else if(Math.abs(hint[2])>.1)out.uv.push(Math.sign(hint[2])*p[0],p[1]);
      else out.uv.push(p[0],p[2]);
    }
    if(isBevel)bevelTriangles++;
  }
  const faceIndex=(axis,sign)=>axis*2+(sign>0?0:1);
  for(const {x,z,h} of columnRecords)for(let y=0;y<=h;y++){
    const center=[x,y,z];
    const visible=axes.map(n=>!occupied.has(`${x+n[0]},${y+n[1]},${z+n[2]}`));
    for(let face=0;face<6;face++){
      if(!visible[face])continue;
      visibleFaces++;
      const axis=Math.floor(face/2),sign=face%2?-1:1;
      const tangents=[0,1,2].filter(a=>a!==axis),points=[];
      for(const [s,t] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        const p=center.slice();p[axis]+=.5*sign;
        p[tangents[0]]+=s*(.5-(visible[faceIndex(tangents[0],s)]?bevel:0));
        p[tangents[1]]+=t*(.5-(visible[faceIndex(tangents[1],t)]?bevel:0));
        points.push(p);
      }
      emit([points[0],points[1],points[2]],axes[face],face===2);
      emit([points[0],points[2],points[3]],axes[face],face===2);
    }
    for(let axisA=0;axisA<3;axisA++)for(let axisB=axisA+1;axisB<3;axisB++){
      const free=3-axisA-axisB;
      for(const signA of [-1,1])for(const signB of [-1,1]){
        if(!visible[faceIndex(axisA,signA)]||!visible[faceIndex(axisB,signB)])continue;
        const points=[];
        for(const [end,side] of [[-1,0],[1,0],[1,1],[-1,1]]){
          const p=center.slice();
          p[axisA]+=signA*(.5-(side===1?bevel:0));
          p[axisB]+=signB*(.5-(side===0?bevel:0));
          p[free]+=end*(.5-(visible[faceIndex(free,end)]?bevel:0));
          points.push(p);
        }
        const hint=[0,0,0];hint[axisA]=signA;hint[axisB]=signB;
        const top=(axisA===1&&signA===1)||(axisB===1&&signB===1);
        emit([points[0],points[1],points[2]],hint,top,true);
        emit([points[0],points[2],points[3]],hint,top,true);
      }
    }
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
      const signs=[sx,sy,sz];
      if(!signs.every((s,a)=>visible[faceIndex(a,s)]))continue;
      const points=[0,1,2].map(axis=>center.map((v,a)=>v+signs[a]*(.5-(a===axis?0:bevel))));
      emit(points,signs,sy>0,true);
    }
  }
  // At a concave step three cube octants meet. Their chamfers leave a tiny
  // non-planar corner loop: sew it in the merged mesh so contact AO cannot
  // look through it. Split collinear boundary segments before pairing them,
  // because an adjacent large face can span two smaller edge sections.
  const pointKey=p=>p.map(v=>v.toFixed(7)).join(',');
  const edgeKey=(a,b)=>[pointKey(a),pointKey(b)].sort().join('|');
  const rawEdges=new Map();
  for(const buffer of buffers)for(let i=0;i<buffer.p.length;i+=9){
    const triangle=[buffer.p.slice(i,i+3),buffer.p.slice(i+3,i+6),buffer.p.slice(i+6,i+9)];
    for(let e=0;e<3;e++){
      const a=triangle[e],b=triangle[(e+1)%3],key=edgeKey(a,b);
      if(rawEdges.has(key))rawEdges.delete(key);else rawEdges.set(key,{a,b});
    }
  }
  const boundaryPoints=[...new Map([...rawEdges.values()].flatMap(e=>[e.a,e.b]).map(p=>[pointKey(p),p])).values()];
  const splitEdges=new Map();
  for(const {a,b} of rawEdges.values()){
    const ab=b.map((v,i)=>v-a[i]),lengthSq=ab.reduce((s,v)=>s+v*v,0);
    const points=[{p:a,t:0},{p:b,t:1}];
    for(const p of boundaryPoints){
      const t=p.reduce((s,v,i)=>s+(v-a[i])*ab[i],0)/lengthSq;
      if(t<=1e-7||t>=1-1e-7)continue;
      if(p.reduce((s,v,i)=>s+(v-a[i]-ab[i]*t)**2,0)<1e-14)points.push({p,t});
    }
    points.sort((a,b)=>a.t-b.t);
    for(let i=1;i<points.length;i++){
      const start=points[i-1].p,end=points[i].p,key=edgeKey(start,end);
      if(splitEdges.has(key))splitEdges.delete(key);else splitEdges.set(key,{a:start,b:end});
    }
  }
  let cornerPatchTriangles=0;
  const remaining=new Set(splitEdges.values());
  while(remaining.size){
    const first=remaining.values().next().value,loop=[first];remaining.delete(first);
    let end=pointKey(first.b);
    while(end!==pointKey(first.a)){
      const next=[...remaining].find(e=>pointKey(e.a)===end);
      if(!next)throw new Error('Open pulp bevel boundary');
      loop.push(next);remaining.delete(next);end=pointKey(next.b);
      if(loop.length>32)throw new Error('Unexpected large pulp bevel boundary');
    }
    const center=[0,1,2].map(axis=>loop.reduce((s,e)=>s+e.a[axis],0)/loop.length);
    for(const edge of loop){
      const a=edge.b,b=edge.a,ab=b.map((v,i)=>v-a[i]),ac=center.map((v,i)=>v-a[i]);
      const hint=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      emit([a,b,center],hint,hint[1]>1e-10,true);cornerPatchTriangles++;
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(buffers.flatMap(b=>b.p),3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(buffers.flatMap(b=>b.n),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(buffers.flatMap(b=>b.uv),2));
  const dirtCount=buffers[0].p.length/3;
  geometry.addGroup(0,dirtCount,0);geometry.addGroup(dirtCount,buffers[1].p.length/3,1);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={visibleFaces,bevelTriangles,cornerPatchTriangles,bevel,triangles:geometry.getAttribute('position').count/3};
  return geometry;
}

/**
 * Render the voxel height field as stacked paperboard slabs. The columns remain
 * unit cells for gameplay, while every occupied height level is unioned into a
 * single deterministic outer contour. This removes tile seams from the broad
 * top face and leaves only the thick cut-paper perimeter at each layer.
 */
export function createPolygonalTerrainGeometry({THREE,columnRecords,jitter=.075,fold=.028}){
  const heights=new Map(columnRecords.map(({x,z,h})=>[`${x},${z}`,Math.floor(h)]));
  const maxHeight=Math.max(-1,...columnRecords.map(({h})=>Math.floor(h)));
  const hash=(x,z,level,seed=0)=>{
    const n=Math.sin(x*127.1+z*311.7+level*71.3+seed*19.17+9.73)*43758.5453123;
    return n-Math.floor(n);
  };
  const streams=[{p:[],n:[],uv:[]},{p:[],n:[],uv:[]}];
  let visibleFaces=0,foldTriangles=0,layerCount=0,boundaryEdges=0,topTriangles=0;
  const emit=(a,b,c,hint,material,top=false)=>{
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(n[0]*hint[0]+n[1]*hint[1]+n[2]*hint[2]<0){[b,c]=[c,b];n=n.map(value=>-value);}
    const length=Math.hypot(...n);if(length<1e-9)return;
    n=n.map(value=>value/length);const stream=streams[material];
    for(const p of [a,b,c]){
      stream.p.push(...p);stream.n.push(...n);
      if(top)stream.uv.push(p[0],-p[2]);
      else if(Math.abs(hint[0])>.5)stream.uv.push(-hint[0]*p[2],p[1]);
      else stream.uv.push(hint[2]*p[0],p[1]);
    }
  };
  const key=(x,z)=>`${x},${z}`;
  const pointKey=([x,z])=>`${x},${z}`;
  function layerEdges(level){
    const occupied=(x,z)=>(heights.get(key(x,z))??-1)>=level;
    const edges=[];
    for(const {x,z,h} of columnRecords){
      if(h<level)continue;
      if(!occupied(x+1,z))edges.push({a:[x+.5,z+.5],b:[x+.5,z-.5]});
      if(!occupied(x-1,z))edges.push({a:[x-.5,z-.5],b:[x-.5,z+.5]});
      if(!occupied(x,z+1))edges.push({a:[x-.5,z+.5],b:[x+.5,z+.5]});
      if(!occupied(x,z-1))edges.push({a:[x+.5,z-.5],b:[x-.5,z-.5]});
    }
    return edges;
  }
  function traceLoops(edges){
    const starts=new Map();
    for(const edge of edges){const k=pointKey(edge.a);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(edge);}
    const remaining=new Set(edges),loops=[];
    while(remaining.size){
      const first=remaining.values().next().value,loop=[first.a];remaining.delete(first);
      let cursor=first.b,guard=0;
      while(pointKey(cursor)!==pointKey(first.a)&&guard++<edges.length+2){
        loop.push(cursor);
        const candidates=(starts.get(pointKey(cursor))??[]).filter(edge=>remaining.has(edge));
        const next=candidates[0];
        if(!next)break;
        remaining.delete(next);cursor=next.b;
      }
      if(pointKey(cursor)===pointKey(first.a)&&loop.length>=3)loops.push(loop);
    }
    return loops;
  }
  function jitterNode(point,level){
    const [x,z]=point;
    return [x+(hash(x,z,level,1)-.5)*jitter*2,z+(hash(x,z,level,2)-.5)*jitter*2];
  }
  for(let level=0;level<=maxHeight;level++){
    const loops=traceLoops(layerEdges(level));
    for(const loop of loops){
      const area=loop.reduce((sum,[x,z],i)=>{const [nx,nz]=loop[(i+1)%loop.length];return sum+x*nz-nx*z;},0)*.5;
      if(Math.abs(area)<.01)continue;
      const points=loop.map(point=>jitterNode(point,level));
      const topY=level+.5, bottomY=topY-.94;
      const contour=points.map(([x,z])=>new THREE.Vector2(x,z));
      const triangles=THREE.ShapeUtils.triangulateShape(contour,[]);
      topTriangles+=triangles.length;
      for(const triangle of triangles){
        const a=points[triangle[0]],b=points[triangle[1]],c=points[triangle[2]];
        emit([a[0],topY,a[1]],[b[0],topY,b[1]],[c[0],topY,c[1]],[0,1,0],1,true);
      }
      const center=points.reduce((sum,p)=>[sum[0]+p[0]/points.length,sum[1]+p[1]/points.length],[0,0]);
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        const topA=[a[0],topY,a[1]],topB=[b[0],topY,b[1]],bottomA=[a[0],bottomY,a[1]],bottomB=[b[0],bottomY,b[1]];
        const dx=b[0]-a[0],dz=b[1]-a[1],outward=[-dz,0,dx];
        emit(topA,bottomB,topB,outward,0,false);emit(topA,bottomA,bottomB,outward,0,false);
        // Narrow folded lip catches the warm key light and makes the board
        // read as paper even when the diffuse colour is almost flat.
        const ix=a[0]+(center[0]-a[0])*.035,iz=a[1]+(center[1]-a[1])*.035;
        const jx=b[0]+(center[0]-b[0])*.035,jz=b[1]+(center[1]-b[1])*.035;
        emit(topA,topB,[jx,topY+.008,jz],[0,1,0],1,true);
        emit(topA,[jx,topY+.008,jz],[ix,topY+.008,iz],[0,1,0],1,true);
        foldTriangles+=2;boundaryEdges++;
      }
      visibleFaces+=triangles.length+points.length;
      layerCount++;
    }
  }
  const positions=streams[0].p.concat(streams[1].p),normals=streams[0].n.concat(streams[1].n),uvs=streams[0].uv.concat(streams[1].uv);
  const dirtVertices=streams[0].p.length/3,grassVertices=streams[1].p.length/3,total=dirtVertices+grassVertices;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.addGroup(0,dirtVertices,0);geometry.addGroup(dirtVertices,grassVertices,1);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={polygonal:true,layeredPaperboard:true,visibleFaces,bevelTriangles:foldTriangles,cornerPatchTriangles:0,
    triangles:total/3,foldTriangles,boundaryEdges,layerCount,topTriangles,paperThickness:.94};
  return geometry;
}

/** Render-only torn paper turf. Collision columns remain exact unit cubes. */
export function createGrassRimGeometry({THREE,columnRecords,segments=18}){
  const heights=new Map(columnRecords.map(({x,z,h})=>[`${x},${z}`,h]));
  const edges=[];
  const directions=[
    {dx:1,dz:0,a:[.5,.5],b:[.5,-.5]},
    {dx:-1,dz:0,a:[-.5,-.5],b:[-.5,.5]},
    {dx:0,dz:1,a:[-.5,.5],b:[.5,.5]},
    {dx:0,dz:-1,a:[.5,-.5],b:[-.5,-.5]}
  ];
  for(const {x,z,h} of columnRecords){
    if(h<0)continue;
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
  const positions=[],normals=[],uvs=[],paperCore=[];
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
    const broad=noise(x*4.2+edge.y*1.1,z*4.2-edge.y*.7);
    const torn=noise(x*28.7+17,z*28.7-13);
    const cut=noise(x*11.3-23,z*11.3+37);
    // Compressed pulp breaks into shallow, unequal tufts. A fine upper roll
    // catches the light; the lower torn lip must not resemble thick icing.
    const overhang=.022+.033*broad+.008*torn;
    const depth=.070+.073*broad+.038*torn;
    const bevel=.006+.007*torn;
    const lifted=Math.max(0,cut-.66)*.065;
    return {
      inner:[x-nx*.020,edge.y+.0007,z-nz*.020],
      crest:[x+nx*(overhang*.72),edge.y+lifted-bevel*.3,z+nz*(overhang*.72)],
      shoulder:[x+nx*overhang,edge.y+lifted-bevel,z+nz*overhang],
      bottom:[x+nx*(overhang*(.50+.26*torn)),edge.y-depth,z+nz*(overhang*(.50+.26*torn))],
      tucked:[x-nx*.003,edge.y-depth+.012,z-nz*.003]
    };
  }
  function emitTriangle(a,b,c,normalHint,top,coreA=0,coreB=0,coreC=0){
    const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
    const ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(n[0]*normalHint[0]+n[1]*normalHint[1]+n[2]*normalHint[2]<0){[b,c]=[c,b];[coreB,coreC]=[coreC,coreB];n=n.map(v=>-v);}
    const length=Math.hypot(...n);
    if(length<1e-9)return;
    n=n.map(v=>v/length);
    paperCore.push(coreA,coreB,coreC);
    for(const p of [a,b,c]){
      positions.push(...p);normals.push(...n);
      if(top)uvs.push(p[0],-p[2]);
      else if(Math.abs(normalHint[0])>.5)uvs.push(-normalHint[0]*p[2],p[1]);
      else uvs.push(normalHint[2]*p[0],p[1]);
    }
  }
  function quad(a,b,c,d,hint,top=false,core=[0,0,0,0]){
    emitTriangle(a,b,c,hint,top,...core.slice(0,3));emitTriangle(a,c,d,hint,top,core[0],core[2],core[3]);
  }
  for(const edge of edges){
    for(let i=0;i<segments;i++){
      const a=profile(edge,i/segments),b=profile(edge,(i+1)/segments);
      const outward=[edge.n[0],0,edge.n[1]];
      // Only the torn fold exposes lighter inner fibres. Their diffuse pigment
      // still receives the real scene lighting; this is never an emissive line.
      const fibreA=.58+.22*noise(a.crest[0]*15.1,a.crest[2]*15.1);
      const fibreB=.58+.22*noise(b.crest[0]*15.1,b.crest[2]*15.1);
      quad(a.inner,b.inner,b.crest,a.crest,[0,1,0],true,[0,0,fibreB*.22,fibreA*.22]);
      quad(a.crest,b.crest,b.shoulder,a.shoulder,[edge.n[0],1,edge.n[1]],true,[fibreA*.22,fibreB*.22,fibreB,fibreA]);
      quad(a.shoulder,b.shoulder,b.bottom,a.bottom,outward,false,[fibreA,fibreB,.055,.055]);
      quad(a.bottom,b.bottom,b.tucked,a.tucked,[0,-1,0],false,[.055,.055,0,0]);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('pulpCore',new THREE.Float32BufferAttribute(paperCore,1));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={boundaryEdges:edges.length,segments,triangles:positions.length/9,
    maxOverhang:.063,maxDepth:.181,maxLift:.023};
  return geometry;
}

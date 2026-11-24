// Original single connected quad-ring chibi study, not the artist's source mesh.
export function buildBody(){
 const v=[],w=[],faces=[],N=16;
 const boneNames=['pelvis','spine','head','R upper arm','R forearm','R hand','L upper arm','L forearm','L hand','R thigh','R shin','R foot','L thigh','L shin','L foot'];
 const bones=[[-1,0,1.08,0],[0,0,1.45,0],[1,0,1.94,0],[1,.37,1.70,0],[3,.68,1.40,0],[4,.88,1.16,0],[1,-.37,1.70,0],[6,-.68,1.40,0],[7,-.88,1.16,0],[0,.22,1.02,0],[9,.24,.53,0],[10,.24,.17,0],[0,-.22,1.02,0],[12,-.24,.53,0],[13,-.24,.17,0]];
 const blend=(a,b,t)=>[[a,1-t],[b,t]];
 const add=(x,y,z,weights)=>{v.push([x,y,z]);w.push(weights);return v.length-1};
 const loop=(y,rx,rz,zc,weights)=>Array.from({length:N},(_,i)=>{let t=i*2*Math.PI/N;return add(rx*Math.sin(t),y,zc+rz*Math.cos(t),weights)});
 const join=(a,b,skip=[])=>{for(let i=0;i<a.length;i++){if(skip.includes(i))continue;let j=(i+1)%a.length;faces.push([a[i],a[j],b[j],b[i]])}};
 const cap=(a,center)=>{for(let i=0;i<a.length;i++)faces.push([a[i],a[(i+1)%a.length],center])};
 const spec=[[1.02,.38,.23,0,[[0,1]]],[1.22,.34,.22,0,blend(0,1,.25)],[1.48,.40,.24,0,blend(0,1,.8)],[1.64,.43,.24,0,[[1,1]]],[1.79,.39,.21,0,[[1,1]]],[1.87,.20,.16,0,blend(1,2,.15)],[1.98,.16,.14,0,blend(1,2,.8)],[2.07,.31,.25,.025,[[2,1]]],[2.18,.51,.36,.035,[[2,1]]],[2.40,.61,.45,.025,[[2,1]]],[2.65,.60,.46,0,[[2,1]]],[2.88,.49,.40,-.015,[[2,1]]],[3.03,.27,.25,-.025,[[2,1]]]];
 const r=spec.map(s=>loop(...s));for(let j=0;j<r.length-1;j++)join(r[j],r[j+1],j===2||j===3?[3,4,11,12]:[]);
 cap(r.at(-1),add(0,3.09,-.025,[[2,1]]));
 for(const side of [1,-1]){
  const i=side===1?3:11,b=side===1?3:6;
  let a=[r[2][i],r[2][i+1],r[2][i+2],r[3][i+2],r[4][i+2],r[4][i+1],r[4][i],r[3][i]];
  for(const k of a)w[k]=blend(1,b,.36);
  for(const [x,y,ry,rz,weights] of [[.49,1.64,.15,.17,blend(1,b,.78)],[.60,1.49,.125,.13,[[b,1]]],[.68,1.40,.12,.12,blend(b,b+1,.5)],[.74,1.33,.12,.115,[[b+1,1]]],[.85,1.20,.085,.085,blend(b+1,b+2,.35)],[.91,1.13,.11,.095,[[b+2,1]]],[.99,1.05,.095,.085,[[b+2,1]]]]){
   const q=Array.from({length:8},(_,j)=>{const t=(j+1)*Math.PI/4;return add(side*(x+.6*(-Math.sin(t)*ry)),y+.8*(-Math.sin(t)*ry),Math.cos(t)*rz*side,weights)});
   join(a,q);a=q;
  }cap(a,add(side*1.035,1.00,0,[[b+2,1]]));
 }
 const c=add(0,.98,0,[[0,1]]);
 for(const side of [1,-1]){
  const b=side===1?9:12;let a=Array.from({length:9},(_,j)=>r[0][(j+(side===1?0:8))%16]);a.push(c);
  const angles=a.map(k=>Math.atan2(v[k][2]/.23,(v[k][0]-side*.19)/.19));
  for(const [y,x,rx,rz,zc,weights] of [[.88,.23,.175,.205,0,blend(0,b,.65)],[.68,.24,.15,.16,0,[[b,1]]],[.53,.24,.135,.145,.015,blend(b,b+1,.5)],[.43,.24,.14,.145,0,[[b+1,1]]],[.22,.24,.105,.12,0,blend(b+1,b+2,.25)],[.13,.24,.14,.225,.085,[[b+2,1]]],[.035,.24,.15,.24,.09,[[b+2,1]]]]){
   const q=angles.map(t=>add(side*x+rx*Math.cos(t),y,zc+rz*Math.sin(t),weights));join(a,q);a=q;
  }cap(a,add(side*.24,.025,.09,[[b+2,1]]));
 }
 const used=[...new Set(faces.flat())].sort((a,b)=>a-b),map=new Map(used.map((k,i)=>[k,i]));
 const positions=used.map(k=>v[k]),weights=used.map(k=>w[k]);let polygons=faces.map(f=>f.map(k=>map.get(k)));
 const edgeMap=new Map(),key=(a,b)=>a<b?a+':'+b:b+':'+a;
 polygons.forEach((f,i)=>f.forEach((a,j)=>{const b=f[(j+1)%f.length],k=key(a,b);if(!edgeMap.has(k))edgeMap.set(k,[]);edgeMap.get(k).push([i,a,b])}));
 const flipped=new Map([[0,false]]),queue=[0];
 for(let q=0;q<queue.length;q++){let i=queue[q],f=polygons[i];f.forEach((a,j)=>{let b=f[(j+1)%f.length];for(const [n,u,z] of edgeMap.get(key(a,b))){if(n===i)continue;const flip=flipped.get(i)!==(a===u&&b===z);if(!flipped.has(n)){flipped.set(n,flip);queue.push(n)}else if(flipped.get(n)!==flip)throw Error('nonorientable mesh')}})}
 polygons=polygons.map((f,i)=>flipped.get(i)?f.slice().reverse():f);
 const tris=()=>polygons.flatMap(f=>f.length===3?[f]:[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);
 let volume=tris().reduce((s,[a,b,c])=>{let [x,y,z]=positions[a],[u,h,k]=positions[b],[p,q,r]=positions[c];return s+(x*(h*r-k*q)+y*(k*p-u*r)+z*(u*q-h*p))/6},0);
 if(volume<0){polygons=polygons.map(f=>f.slice().reverse());volume=-volume}
 const triangles=tris(),badEdges=[...edgeMap.values()].filter(e=>e.length!==2).length;
 const degenerate=triangles.filter(([a,b,c])=>{let p=positions[a],u=positions[b].map((x,i)=>x-p[i]),z=positions[c].map((x,i)=>x-p[i]);return Math.hypot(u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0])<1e-9}).length;
 const stats={vertices:positions.length,quads:polygons.filter(f=>f.length===4).length,triangles:triangles.length,boundaryOrNonManifoldEdges:badEdges,connected:queue.length===polygons.length,euler:positions.length-edgeMap.size+polygons.length,degenerate,volume,normalizedWeights:weights.every(w=>Math.abs(w.reduce((s,x)=>s+x[1],0)-1)<1e-7)};
 if(!stats.connected||badEdges||degenerate||stats.euler!==2||!stats.normalizedWeights)throw Error(JSON.stringify(stats));
 return {positions,weights,polygons,triangles,bones,boneNames,stats};
}

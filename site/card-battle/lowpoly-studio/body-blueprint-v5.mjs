// Head-only V5, blueprint-derived hand positioned triangular facets. Body is unchanged from V3.
import {buildBody as buildV3} from './body-extreme.mjs';
function buildV5(old){
 const keep=old.positions.map((_,i)=>i).filter(i=>i<28||i>=50),mp=new Map(keep.map((x,i)=>[x,i]));
 const positions=keep.map(i=>old.positions[i].slice()),weights=keep.map(i=>old.weights[i]),triangles=old.triangles.filter(a=>a.every(i=>mp.has(i))).map(a=>a.map(i=>mp.get(i))),groups=triangles.map(()=> 'body');
 const local=new Map(),add=p=>{let i=positions.length;positions.push([p[0]*.58,p[1]*.58+1.68,p[2]*.58]);weights.push([[2,1]]);local.set(i,p);return i};
 const ring=h=>h.concat(h.slice(1,-1).reverse().map(([x,y,z])=>[-x,y,z])).map(add);
 const face=(a,b,c,g)=>{triangles.push([a,b,c]);groups.push(g)},quad=(a,b,c,d,g,flip=false)=>{if(flip){face(a,b,d,g);face(b,c,d,g)}else{face(a,b,c,g);face(a,c,d,g)}};
 const fringe=ring([[0,.61,1],[.29,.91,.94],[.37,1.08,.86],[.55,.91,.80],[.70,.90,.66],[.86,.23,.49],[1.16,.75,.10],[.91,.36,-.28],[.71,.02,-.54],[.37,.31,-.79],[0,-.035,-.78]]);
 const upper=ring([[0,1.65,.78],[.51,1.55,.73],[.92,1.43,.43],[1.04,1.33,-.10],[.77,.92,-.82],[0,.86,-1]]);
 const crown=ring([[0,1.89,.38],[.38,1.87,.36],[.65,1.80,.15],[.70,1.78,-.26],[.43,1.86,-.58],[0,1.90,-.70]]);
 const peak=add([0,2.02,-.04]);
 for(let i=0;i<20;i++){let j=(i+1)%20,a=upper[i>>1],b=upper[j>>1];if(a===b)face(fringe[i],fringe[j],a,'hair');else quad(fringe[i],fringe[j],b,a,'hair',i>=10)}
 for(let i=0;i<10;i++){let j=(i+1)%10;quad(upper[i],upper[j],crown[j],crown[i],'hair',i>=5)}
 for(let i=0;i<10;i++){let j=(i+1)%10,a=crown[i],b=crown[j],c=peak;if(i!==2&&i!==7){face(a,b,c,'hair');continue}const A=local.get(a),B=local.get(b),C=local.get(c),mix=(x,y,z)=>add(A.map((v,k)=>x*v+y*B[k]+z*C[k])),aa=mix(.72,.16,.12),bb=mix(.16,.72,.12),cc=mix(.19,.19,.62);quad(a,b,bb,aa,'hair');quad(b,c,cc,bb,'hair');quad(c,a,aa,cc,'hair');const sign=i===2?1:-1,tip=add([sign*.70,2.50,.36]),bend=add([sign*.60,2.03,.32]);face(aa,bb,tip,'ear');face(bb,cc,tip,'ear');face(cc,aa,bend,'ear');face(aa,tip,bend,'ear');face(tip,cc,bend,'ear')}
 const inner=ring([[0,.59,.82],[.28,.87,.81],[.35,1.03,.80],[.51,.87,.76],[.62,.83,.56],[.67,.48,.35],[.83,.68,.07],[.74,.48,-.22],[.62,.20,-.48],[.34,.35,-.67],[0,.19,-.75]]);
 for(let i=0;i<20;i++){let j=(i+1)%20;quad(fringe[i],fringe[j],inner[j],inner[i],'hair',i>=10)}
 const lower=ring([[0,.19,.79],[.40,.24,.76],[.58,.36,.52],[.59,.34,.03],[.41,.28,-.36],[0,.23,-.49]]);
 for(let i=0;i<20;i++){let j=(i+1)%20,a=lower[i>>1],b=lower[j>>1],g=i<5||i>=15?'skin':'hair';if(a===b)face(inner[i],inner[j],a,g);else quad(inner[i],inner[j],b,a,g,i>=10)}
 const neck=[24,25,26,27].map(i=>mp.get(i)),mapping=[0,0,1,1,2,2,2,3,3,0];
 for(let i=0;i<10;i++){let j=(i+1)%10,a=neck[mapping[i]],b=neck[mapping[j]];if(a===b)face(lower[i],lower[j],a,'neck');else quad(lower[i],lower[j],b,a,'neck',i>=5)}
 function split(a,b,p){const tip=add(p);for(let i=triangles.length-1;i>=0;i--){let t=triangles[i];if(!t.includes(a)||!t.includes(b))continue;let k=t.findIndex((u,k)=>(u===a&&t[(k+1)%3]===b)||(u===b&&t[(k+1)%3]===a));let u=t[k],z=t[(k+1)%3],c=t[(k+2)%3];triangles[i]=[u,tip,c];face(tip,z,c,groups[i])}}
 split(inner[0],lower[0],[0,.39,.84]);split(fringe[6],fringe[7],[.95,.12,0]);split(fringe[13],fringe[14],[-.95,.12,0]);
 // Orient across shared edges from the frozen body face. The first face keeps its V3 winding.
 const edgeMap=new Map();for(let i=0;i<triangles.length;i++){let f=triangles[i];for(let j=0;j<3;j++){let a=f[j],b=f[(j+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(':');if(!edgeMap.has(k))edgeMap.set(k,[]);edgeMap.get(k).push([i,a,b])}}
 const flipped=new Map([[0,false]]),queue=[0];for(let q=0;q<queue.length;q++){let i=queue[q],f=triangles[i];for(let j=0;j<3;j++){let a=f[j],b=f[(j+1)%3];for(const [n,u,z] of edgeMap.get([Math.min(a,b),Math.max(a,b)].join(':'))){if(n===i)continue;const flip=flipped.get(i)!==(a===u&&b===z);if(!flipped.has(n)){flipped.set(n,flip);queue.push(n)}else if(flipped.get(n)!==flip)throw Error('winding')}}}
 const t=triangles.map((a,i)=>flipped.get(i)?a.slice().reverse():a);
 return {positions,triangles:t,polygons:t,weights,bones:old.bones,boneNames:old.boneNames,groups};
}
function audit(p,t,w){const edges=new Map(),seen=new Set([0]),queue=[0],adj=Array.from({length:p.length},()=>new Set());let degenerate=0,volume=0;for(const [a,b,c] of t){for(const [i,j] of [[a,b],[b,c],[c,a]]){const k=[Math.min(i,j),Math.max(i,j)].join(':');const e=edges.get(k)||[0,0];e[0]++;e[1]+=i<j?1:-1;edges.set(k,e);adj[i].add(j);adj[j].add(i)}const A=p[a],B=p[b],C=p[c],u=B.map((x,i)=>x-A[i]),v=C.map((x,i)=>x-A[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(Math.hypot(...n)<1e-9)degenerate++;volume+=(A[0]*(B[1]*C[2]-B[2]*C[1])+A[1]*(B[2]*C[0]-B[0]*C[2])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6}for(const i of queue)for(const j of adj[i])if(!seen.has(j)){seen.add(j);queue.push(j)}return {vertices:p.length,quads:0,triangles:t.length,boundaryOrNonManifoldEdges:[...edges.values()].filter(e=>e[0]!==2||e[1]!==0).length,connected:seen.size===p.length,euler:p.length-edges.size+t.length,degenerate,volume,normalizedWeights:w.length===p.length&&w.every(a=>Math.abs(a.reduce((s,x)=>s+x[1],0)-1)<1e-8)}}

export function buildBody(){const d=buildV5(buildV3());d.stats=audit(d.positions,d.triangles,d.weights);if(!d.stats.connected||d.stats.boundaryOrNonManifoldEdges||d.stats.degenerate||d.stats.euler!==2||!d.stats.normalizedWeights)throw Error(JSON.stringify(d.stats));return d;}

// V16: measured orthographic head, half-authored topology and mirror weld.
// Preserve original body and rig. Reference coordinates are in 164-pixel preview units.
import {buildBody as buildV3} from './body-extreme.mjs';
import {buildEars} from './v14-data.mjs';
export {buildEars};
const rings=[[[0,178,49],[19,175,48],[37,169,34],[48,161,4],[40,160,-38],[23,169,-22],[0,172,-15]],[[0,148,58],[27,150,57],[47,151,36],[56,151,8],[54,149,-46],[32,148,-51],[0,148,-53]],[[0,121,61],[29,121,60],[54,121,35],[63,121,9],[57,121,-46],[33,121,-58],[0,121,-63]],[[0,80,62],[29,80,61],[54,80,36],[64,80,10],[55,80,-49],[33,80,-61],[0,80,-65]],[[0,56,49],[25,56,48],[44,56,34],[49,56,7],[44,56,-34],[25,56,-47],[0,56,-49]]];
const upper=[[0,40,28],[27,40,24],[30,40,0],[27,40,-25],[0,40,-29]];
export function buildBody(){
const old=buildV3(),keep=old.positions.map((_,i)=>i).filter(i=>i<28||i>=50),map=new Map(keep.map((x,i)=>[x,i])),P=keep.map(i=>old.positions[i].slice()),Q=old.triangles.filter(f=>f.every(i=>map.has(i))).map(f=>f.map(i=>map.get(i))),scale=.0067,y=h=>1.795+(182-h)*scale;
P.push([0,y(175),.096],[.105,y(175),0],[0,y(175),-.096],[-.105,y(175),0]);
const addRing=r=>{const all=r.concat(r.slice(1,-1).reverse().map(([x,h,z])=>[-x,h,z])),ids=all.map((_,i)=>P.length+i);P.push(...all.map(([x,h,z])=>[x*scale,y(h),z*scale]));return ids};
const R=rings.map(addRing),u=addRing(upper),c=P.length;P.push([0,y(36.7),0]);const half=[],r=R[0],n0=76,n1=77,n2=78;
half.push([n0,r[0],r[1],r[2]],[n0,r[2],r[3],n1],[n1,r[3],r[4],r[5]],[n1,r[5],r[6],n2]);
for(let j=0;j<R.length-1;j++)for(let i=0;i<6;i++)half.push([R[j][i],R[j][i+1],R[j+1][i+1],R[j+1][i]]);
const b=R.at(-1);half.push([b[0],b[1],u[1],u[0]],[b[1],b[2],u[2],u[1]],[b[3],b[4],u[2],b[2]],[b[4],b[5],u[3],u[2]],[b[5],b[6],u[4],u[3]],[u[0],u[1],u[2],c],[c,u[2],u[3],u[4]]);
const mirror=new Map([[76,76],[77,79],[78,78],[79,77],[c,c]]);for(const a of [...R,u])a.forEach((v,i)=>mirror.set(v,a[(a.length-i)%a.length]));
const reverse=f=>[f[0],...f.slice(1).reverse()];
Q.push(...half,...half.map(f=>reverse(f).map(i=>mirror.get(i))));
const neck=P.length;P.push([0,y(182.5),.096],[.105,y(182.5),0],[0,y(182.5),-.096],[-.105,y(182.5),0]);for(let i=0;i<4;i++){const j=(i+1)%4;Q.push([24+i,24+j,neck+j,neck+i],[neck+i,neck+j,76+j,76+i]);}
const edges=new Map();for(let i=0;i<Q.length;i++)Q[i].forEach((a,j)=>{const b=Q[i][(j+1)%Q[i].length],k=[Math.min(a,b),Math.max(a,b)].join(':');if(!edges.has(k))edges.set(k,[]);edges.get(k).push([i,a<b])});
const adj=Q.map(()=>[]);for(const pair of edges.values()){if(pair.length!==2)throw Error('open or nonmanifold edge');const [[i,a],[j,b]]=pair;adj[i].push([j,a===b]);adj[j].push([i,a===b]);}
const flips=new Map([[0,false]]),queue=[0];for(const i of queue)for(const [j,t] of adj[i]){const v=Boolean(flips.get(i)^t);if(flips.has(j)){if(flips.get(j)!==v)throw Error('winding conflict')}else{flips.set(j,v);queue.push(j)}}
if(queue.length!==Q.length)throw Error('disconnected');for(let i=0;i<Q.length;i++)if(flips.get(i)){if(i<146)throw Error('body winding changed');Q[i]=reverse(Q[i]);}
const T=Q.flatMap(f=>f.length===3?[f.slice()]:[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);let volume=0;for(const [i,j,k] of T){const a=P[i],b=P[j],c=P[k];volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6}
if(P.length!==153||Q.length!==224||T.length!==302||Math.abs(volume-.7552572395572333)>1e-8||Q.slice(146).some(f=>f.length!==4))throw Error('V16 geometry mismatch '+volume);
return {positions:P,polygons:Q,triangles:T,weights:keep.map(i=>old.weights[i]).concat(Array.from({length:P.length-keep.length},()=>[[2,1]])),bones:old.bones,boneNames:old.boneNames,stats:{vertices:P.length,headQuads:78,headTriangles:0,triangles:T.length,volume,halfAuthoredQuads:35},uv:P.map(([x,y])=>[x/1.0988+.5,(y-2.2841)/1.0988+.5])}
}
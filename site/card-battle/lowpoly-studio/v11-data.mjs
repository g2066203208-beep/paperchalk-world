// V11: quad-source head, aligned to approved bald orthographic reference.
// Keep V3 non-head geometry and original rig. Triangulate only for display.
import {buildBody as buildV3} from './body-extreme.mjs';
const rings=[[[0,179,52],[23,174,51],[45,163,34],[48,155,11],[39,162,-31],[23,170,-41],[0,173,-44]],[[0,162,60],[27,162,59],[49,154,35],[60,150,10],[51,152,-43],[31,158,-50],[0,160,-53]],[[0,121,59],[29,121,59],[53,121,34],[65,121,10],[57,121,-46],[33,121,-58],[0,121,-63]],[[0,80,62],[29,80,62],[54,80,36],[64,80,10],[55,80,-49],[33,80,-61],[0,80,-64]],[[0,56,47],[26,56,47],[43,56,35],[49,56,8],[42,56,-33],[25,56,-46],[0,56,-49]],[[0,38,18],[15,39,18],[26,42,12],[31,43,1],[26,42,-15],[15,39,-21],[0,38,-23]]];
export function buildBody(){const old=buildV3(),keep=old.positions.map((_,i)=>i).filter(i=>i<28||i>=50),m=new Map(keep.map((x,i)=>[x,i])),P=keep.map(i=>old.positions[i].slice()),Q=old.triangles.filter(f=>f.every(i=>m.has(i))).map(f=>f.map(i=>m.get(i))),scale=.0067,y=h=>1.795+(182-h)*scale;
P.push([0,1.795,.13],[.12,1.795,0],[0,1.795,-.13],[-.12,1.795,0]);
for(const r of rings){const rr=r.concat(r.slice(1,-1).reverse().map(([x,h,z])=>[-x,h,z]));P.push(...rr.map(([x,h,z])=>[x*scale,y(h),z*scale]));}
P.push([-.0425,y(36.7),.0275],[.0425,y(36.7),.0275],[-.0425,y(36.7),-.0575],[.0425,y(36.7),-.0575]);
for(let i=0;i<4;i++)Q.push([24+i,24+(i+1)%4,76+(i+1)%4,76+i]);
for(let i=0;i<4;i++){const [a,b,c,d]=[0,1,2,3].map(j=>80+(i*3+j)%12);const n=76+i,k=76+(i+1)%4;Q.push([c,b,a,n],[k,d,c,n]);}
for(let band=0;band<5;band++)for(let i=0;i<12;i++){const a=80+band*12,j=(i+1)%12;Q.push([a+i,a+j,a+12+j,a+12+i]);}
Q.push([151,140,152,150],[140,141,153,152],[141,142,143,153],[150,152,154,149],[152,153,155,154],[153,143,144,155],[149,154,147,148],[154,155,146,147],[155,144,145,146]);
const T=Q.flatMap(f=>f.length===3?[f.slice()]:[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);const edges=new Map();let vol=0;for(const f of Q)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}
for(const [i,j,k] of T){const a=P[i],b=P[j],c=P[k];vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6}
if(P.length!==156||Q.length!==227||T.length!==308||Q.slice(146).some(f=>f.length!==4)||[...edges.values()].some(e=>e[0]!==2||e[1]!==0)||Math.abs(vol-.7684665148625833)>1e-8)throw Error('V11 source geometry mismatch '+vol);
return {positions:P,polygons:Q,triangles:T,weights:keep.map(i=>old.weights[i]).concat(Array.from({length:80},()=>[[2,1]])),bones:old.bones,boneNames:old.boneNames,stats:{vertices:P.length,headQuads:81,headTriangles:0,triangles:T.length,volume:vol},uv:P.map(([x,y])=>[x/1.0988+.5,(y-2.2841)/1.0988+.5])}}

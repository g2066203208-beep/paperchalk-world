// V13: quad-source head, aligned to approved bald orthographic reference.
// Keep V3 non-head geometry and original rig. Triangulate only for display.
import {buildBody as buildV3} from './body-extreme.mjs';
const rings=[[[0,179.5,25],[17,176,48],[44,164,34],[48,155,10],[40,159,-25],[23,166,-28],[0,172,-16]],[[0,162,56],[27,162,54],[49,155,34],[53,151,9],[50,151,-39],[31,152,-49],[0,151,-50]],[[0,150,59],[27,150,57],[49,150,34],[57,146,10],[54,144,-47],[32,144,-54],[0,145,-53]],[[0,140,57],[28,140,56],[51,140,34],[59,140,10],[55,137,-46],[32,136,-57],[0,136,-58]],[[0,121,60],[29,121,58],[53,121,34],[65,121,10],[57,121,-46],[33,121,-58],[0,121,-62]],[[0,80,62],[29,80,61],[54,80,36],[64,80,10],[55,80,-49],[33,80,-61],[0,80,-65]],[[0,56,49],[26,56,47],[43,56,35],[49,56,8],[42,56,-33],[25,56,-46],[0,56,-49]],[[0,38,11],[15,39,16],[26,42,12],[31,43,1],[26,42,-15],[15,39,-19],[0,38,-12]]];
export function buildBody(){const old=buildV3(),keep=old.positions.map((_,i)=>i).filter(i=>i<28||i>=50),m=new Map(keep.map((x,i)=>[x,i])),P=keep.map(i=>old.positions[i].slice()),Q=old.triangles.filter(f=>f.every(i=>m.has(i))).map(f=>f.map(i=>m.get(i))),scale=.0067,y=h=>1.795+(182-h)*scale;
P.push([0,y(175),.096],[.105,y(175),0],[0,y(175),-.096],[-.105,y(175),0]);
for(const r of rings){const rr=r.concat(r.slice(1,-1).reverse().map(([x,h,z])=>[-x,h,z]));P.push(...rr.map(([x,h,z])=>[x*scale,y(h),z*scale]));}
P.push([-.0425,y(36.7),.0275],[.0425,y(36.7),.0275],[-.0425,y(36.7),-.0575],[.0425,y(36.7),-.0575]);

for(let i=0;i<4;i++){const [a,b,c,d]=[0,1,2,3].map(j=>80+(i*3+j)%12);const n=76+i,k=76+(i+1)%4;Q.push([c,b,a,n],[k,d,c,n]);}
for(let band=0;band<7;band++)for(let i=0;i<12;i++){const a=80+band*12,j=(i+1)%12;Q.push([a+i,a+j,a+12+j,a+12+i]);}
Q.push([175,164,176,174],[164,165,177,176],[165,166,167,177],[174,176,178,173],[176,177,179,178],[177,167,168,179],[173,178,171,172],[178,179,170,171],[179,168,169,170]);
P.push([0,y(182.5),.096],[.105,y(182.5),0],[0,y(182.5),-.096],[-.105,y(182.5),0]);
for(let i=0;i<4;i++){const j=(i+1)%4;Q.push([24+i,24+j,180+j,180+i],[180+i,180+j,76+j,76+i]);}
const T=Q.flatMap(f=>f.length===3?[f.slice()]:[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);const edges=new Map();let vol=0;for(const f of Q)for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}
for(const [i,j,k] of T){const a=P[i],b=P[j],c=P[k];vol+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6}
if(P.length!==184||Q.length!==255||T.length!==364||Q.slice(146).some(f=>f.length!==4)||[...edges.values()].some(e=>e[0]!==2||e[1]!==0)||Math.abs(vol-.7467116900042167)>1e-8)throw Error('V13 source geometry mismatch '+vol);
return {positions:P,polygons:Q,triangles:T,weights:keep.map(i=>old.weights[i]).concat(Array.from({length:108},()=>[[2,1]])),bones:old.bones,boneNames:old.boneNames,stats:{vertices:P.length,headQuads:109,headTriangles:0,triangles:T.length,volume:vol},uv:P.map(([x,y])=>[x/1.0988+.5,(y-2.2841)/1.0988+.5])}}

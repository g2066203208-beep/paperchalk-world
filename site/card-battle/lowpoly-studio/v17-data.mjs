// V17: nose and lip profile, eye setback and jaw contour. The original V16 body is frozen.
import {buildBody as buildV16,buildEars as earsV16} from './v16-data.mjs';
const rings=[[[0,178,48],[19,175,47],[35,168,34],[45,162,5],[39,160,-38],[23,166,-25],[0,170,-15]],[[0,151,59],[27,151,49],[46,151,29],[53,151,8],[53,149,-46],[32,148,-51],[0,148,-53]],[[0,121,61],[29,121,49],[54,121,29],[63,121,9],[57,121,-46],[33,121,-58],[0,121,-63]],[[0,80,62],[29,80,59],[54,80,36],[64,80,10],[55,80,-49],[33,80,-61],[0,80,-65]],[[0,56,49],[25,56,48],[44,56,34],[49,56,7],[44,56,-34],[25,56,-47],[0,56,-49]]];
const local=[[[0,143,56.7],[28,143,48.5],[49,143,29]],[[0,134,57.8],[28,134,49],[51,134,29]]];
const upper=[[0,38.2,28],[27,41,24],[30,42,0],[27,41,-25],[0,38.2,-29]];
const half=[[76,82,81,80],[76,77,83,82],[77,85,84,83],[77,78,86,85],[80,81,93,92],[81,82,94,93],[82,83,95,94],[83,84,96,95],[84,85,97,96],[85,86,98,97],[92,93,141,140],[93,94,143,141],[140,141,146,145],[141,143,148,146],[145,146,105,104],[146,148,106,105],[94,95,107,143],[143,107,106,148],[95,96,108,107],[96,97,109,108],[97,98,110,109],[104,105,117,116],[105,106,118,117],[106,107,119,118],[107,108,120,119],[108,109,121,120],[109,110,122,121],[116,117,129,128],[117,118,130,129],[118,119,131,130],[119,120,132,131],[120,121,133,132],[121,122,134,133],[128,129,151,150],[129,130,152,151],[131,132,152,130],[132,133,153,152],[133,134,154,153],[150,151,152,158],[158,152,153,154]];
export function buildBody(){
 const d=buildV16(),P=d.positions.slice(0,76),Q=d.polygons.slice(0,146),s=.0067,y=h=>1.795+(182-h)*s,point=([x,h,z])=>[x*s,y(h),z*s];
 P.push([0,y(175),.096],[.105,y(175),0],[0,y(175),-.096],[-.105,y(175),0]);
 const add=r=>P.push(...r.concat(r.slice(1,-1).reverse().map(([x,h,z])=>[-x,h,z])).map(point));
 rings.forEach(add);for(const row of local)for(const [x,h,z] of row){P.push(point([x,h,z]));if(x)P.push(point([-x,h,z]));}
 add(upper);P.push([0,y(36.7),0]);
 const mirror=i=>P.findIndex(([x,h,z],j)=>j>=76&&Math.abs(x+P[i][0])<1e-9&&Math.abs(h-P[i][1])<1e-9&&Math.abs(z-P[i][2])<1e-9);
 Q.push(...half.map(f=>f.slice()),...half.map(f=>[f[0],...f.slice(1).reverse()].map(mirror)));
 P.push([0,y(182.5),.096],[.105,y(182.5),0],[0,y(182.5),-.096],[-.105,y(182.5),0]);
 for(let i=0;i<4;i++){const j=(i+1)%4;Q.push([24+i,24+j,159+j,159+i],[159+i,159+j,76+j,76+i]);}
 const T=Q.flatMap(f=>f.length===3?[f.slice()]:[[f[0],f[1],f[2]],[f[0],f[2],f[3]]]);let volume=0;const E=new Map();
 for(const f of Q)for(let j=0;j<f.length;j++){const a=f[j],b=f[(j+1)%f.length],k=[Math.min(a,b),Math.max(a,b)].join(':');const e=E.get(k)||[0,0];e[0]++;e[1]+=a<b?1:-1;E.set(k,e)}
 for(const [i,j,k] of T){const a=P[i],b=P[j],c=P[k];volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6}
 if(P.length!==163||Q.length!==234||T.length!==322||[...E.values()].some(e=>e[0]!==2||e[1]!==0)||P.length-E.size+Q.length!==2||Math.abs(volume-.7367755806141667)>1e-8||Q.slice(146).some(f=>f.length!==4))throw Error('V17 mesh audit '+volume);
 return {...d,positions:P,polygons:Q,triangles:T,weights:d.weights.slice(0,76).concat(Array.from({length:P.length-76},()=>[[2,1]])),uv:P.map(([x,h])=>[x/1.0988+.5,(h-2.2841)/1.0988+.5]),stats:{vertices:P.length,headQuads:88,headTriangles:0,triangles:T.length,volume,halfAuthoredQuads:40}};
}
export function buildEars(){const e=earsV16();for(const d of Object.values(e))for(const i of [2,6])d.positions[i][2]=-18*.0067;return e;}

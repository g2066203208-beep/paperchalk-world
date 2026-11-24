// V6 constrained head retopology; V5 retained vertex coordinates, original body untouched.
// Explicit final topology from the locally audited model, not runtime simplification.
import {buildBody as buildV5} from './body-blueprint-v5.mjs';
const half=[[76,77,96],[77,78,97],[77,97,96],[78,79,80],[80,98,97],[78,80,97],[80,81,98],[81,82,99],[81,99,98],[82,156,99],[83,84,100],[83,100,99],[84,85,100],[85,86,101],[85,101,100],[96,97,107],[96,107,106],[97,98,108],[97,108,107],[99,109,108],[99,108,98],[99,100,110],[99,110,109],[101,111,110],[101,110,100],[106,107,119],[107,108,117],[108,109,118],[108,118,117],[110,119,118],[110,118,109],[107,117,119],[106,119,116],[117,118,120],[118,119,120],[119,117,121],[117,120,121],[120,119,121],[119,110,116],[110,111,116],[128,77,76],[127,128,76],[129,78,77],[128,129,77],[79,78,129],[79,129,130],[80,79,130],[80,130,131],[132,81,80],[131,132,80],[133,82,81],[132,133,81],[134,156,82],[133,134,82],[135,84,83],[134,135,83],[135,85,84],[136,86,85],[155,145,146],[128,146,130],[146,128,127],[128,130,129],[147,131,130],[146,147,130],[147,132,131],[148,133,132],[147,148,132],[148,134,133],[149,135,134],[148,149,134],[149,85,135],[150,136,85],[149,150,85],[24,146,145],[25,147,146],[24,25,146],[25,148,147],[26,149,148],[25,26,148],[26,150,149],[146,127,155],[134,83,156],[156,83,99]];
const groupCode="hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhheeeeehhhhhhhhhhhhhhhhhhhhssssssshhhhhhhhnnnnnnnshh";
function audit(p,t,w){const edges=new Map(),seen=new Set([0]),queue=[0],adj=Array.from({length:p.length},()=>new Set());let degenerate=0,volume=0;for(const [a,b,c] of t){for(const [i,j] of [[a,b],[b,c],[c,a]]){const k=[Math.min(i,j),Math.max(i,j)].join(':');const e=edges.get(k)||[0,0];e[0]++;e[1]+=i<j?1:-1;edges.set(k,e);adj[i].add(j);adj[j].add(i)}const A=p[a],B=p[b],C=p[c],u=B.map((x,i)=>x-A[i]),v=C.map((x,i)=>x-A[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(Math.hypot(...n)<1e-9)degenerate++;volume+=(A[0]*(B[1]*C[2]-B[2]*C[1])+A[1]*(B[2]*C[0]-B[0]*C[2])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6}for(const i of queue)for(const j of adj[i])if(!seen.has(j)){seen.add(j);queue.push(j)}return {vertices:p.length,quads:0,triangles:t.length,boundaryOrNonManifoldEdges:[...edges.values()].filter(e=>e[0]!==2||e[1]!==0).length,connected:seen.size===p.length,euler:p.length-edges.size+t.length,degenerate,volume,normalizedWeights:w.length===p.length&&w.every(a=>Math.abs(a.reduce((s,x)=>s+x[1],0)-1)<1e-8)}}

export function buildBody(){
 const old=buildV5(), keep=old.positions.map((_,i)=>i).filter(i=>i!==136&&i!==138);
 const positions=keep.map(i=>old.positions[i].slice()),weights=keep.map(i=>old.weights[i].map(a=>a.slice()));
 const mirror=positions.map(([x,y,z])=>positions.findIndex(([a,b,c])=>Math.abs(a+x)<1e-9&&Math.abs(b-y)<1e-9&&Math.abs(c-z)<1e-9));
 if(mirror.some(i=>i<0))throw Error('mirror mapping');
 const triangles=old.triangles.slice(0,146).map(a=>a.slice()).concat(half.map(a=>a.slice()),half.map(a=>a.map(i=>mirror[i]).reverse()));
 const headGroups=[...groupCode].map(c=>({h:'hair',e:'ear',s:'skin',n:'neck'})[c]);
 const groups=Array(146).fill('body').concat(headGroups,headGroups);
 const stats=audit(positions,triangles,weights);
 if(stats.vertices!==158||stats.triangles!==312||!stats.connected||stats.boundaryOrNonManifoldEdges||stats.degenerate||stats.euler!==2||!stats.normalizedWeights||Math.abs(stats.volume-1.1485697440361597)>1e-8)throw Error(JSON.stringify(stats));
 return {positions,triangles,polygons:triangles,weights,bones:old.bones,boneNames:old.boneNames,groups,stats};
}

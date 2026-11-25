const fs=require('node:fs');

function runAudit(html){
const av=JSON.parse(html.match(/const AVATAR=(\{[^\n]+\});/)[1]);
const src=html.slice(html.indexOf('const REST='),html.indexOf('function avatarData('));
const {REST,RIFLE,poseAvatar}=new Function('AVATAR',src+'\nreturn {REST,RIFLE,poseAvatar};')(av);
const group=(f)=>f.hair?(f.group.startsWith('tail')?'hair-tail':'hair-head'):f.prop?'prop':f.group==='skin'?'skin':f.group==='coat'?(f.f.some(i=>i>=164&&i<=193||i>=280&&i<=309||i>=440&&i<=475||i>=508&&i<=519||i>=852&&i<=863)?'coat-sleeve':'coat-body'):f.group;
const tris=av.quads.flatMap((f,fi)=>[[f.f[0],f.f[1],f.f[2]],[f.f[0],f.f[2],f.f[3]]].map(ids=>({ids,fi,g:group(f)})));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Strict segment/triangle intersections: omit shared mesh vertices, coplanar and endpoint touches.
function segment(p,q,t){const e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),d=sub(q,p),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-11)return false;const inv=1/det,s=sub(p,t[0]),u=dot(s,h)*inv;if(u<=1e-6||u>=1-1e-6)return false;const r=cross(s,e1),v=dot(d,r)*inv;if(v<=1e-6||u+v>=1-1e-6)return false;const w=dot(e2,r)*inv;return w>1e-6&&w<1-1e-6}
function scan(P){const boxes=tris.map((t,i)=>{let p=t.ids.map(j=>P[j]);return {...t,i,p,lo:[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),hi:[0,1,2].map(k=>Math.max(...p.map(v=>v[k])))}}).sort((a,b)=>a.lo[0]-b.lo[0]);let hits=new Map(),groups={};for(let i=0;i<boxes.length;i++){let a=boxes[i];for(let j=i+1;j<boxes.length;j++){let b=boxes[j];if(b.lo[0]>a.hi[0])break;if(a.fi===b.fi||a.ids.some(k=>b.ids.includes(k))||a.lo[1]>b.hi[1]||b.lo[1]>a.hi[1]||a.lo[2]>b.hi[2]||b.lo[2]>a.hi[2])continue;let yes=false;for(let k=0;k<3&&!yes;k++)yes=segment(a.p[k],a.p[(k+1)%3],b.p)||segment(b.p[k],b.p[(k+1)%3],a.p);if(yes){let pair=[a.g,b.g].sort().join(' / '),id=[a.i,b.i].sort((a,b)=>a-b).join(':');hits.set(id,pair);groups[pair]=(groups[pair]||0)+1}}}return {hits,groups}}
const neutral=poseAvatar(0,0,0,0,0),base=scan(neutral);
const modes=[['idle',0,0,0,0,0],['walk',1,0,0,0,0],['run',1,0,0,1,0],['crouch',0,1,0,0,0],['crouch-walk',1,1,0,0,0],['jump',1,0,0,0,1],['aim',0,0,1,0,0],['crouch-aim',1,1,1,0,0]];
let result=[];
for(let [name,walk,duck,raise,run,air] of modes){let worst={count:-1},newWorst={count:-1},min=Infinity,max=0,nonfinite=0,below=0,hairPeak=0;for(let f=0;f<12;f++){let phase=f*Math.PI/6,angles=Array.from({length:11},(_,i)=>[(i>=9?.20:.055)*Math.sin(phase+i*.4)*(walk||air), (i>=9?.12:.035)*Math.cos(phase+i*.5)*(walk||air)]),P=poseAvatar(phase,walk,duck,raise,raise?.25:0,[0,1],run,air,0,angles),q=scan(P),fresh={};for(let [id,g] of q.hits)if(!base.hits.has(id))fresh[g]=(fresh[g]||0)+1;let freshCount=Object.values(fresh).reduce((s,x)=>s+x,0);if(q.hits.size>worst.count)worst={count:q.hits.size,frame:f,groups:q.groups};if(freshCount>newWorst.count)newWorst={count:freshCount,frame:f,groups:fresh};
for(let face of av.quads.filter(f=>!f.prop))for(let j=0;j<4;j++){let a=face.f[j],b=face.f[(j+1)%4],d=Math.hypot(...sub(REST[a],REST[b]));if(d<1e-6)continue;let r=Math.hypot(...sub(P[a],P[b]))/d;min=Math.min(min,r);max=Math.max(max,r)}
nonfinite+=P.filter(p=>!p.every(Number.isFinite)).length;below=Math.max(below,Math.min(...REST.map(p=>p[1]))-Math.min(...P.slice(0,896).map(p=>p[1])));hairPeak=Math.max(hairPeak,...angles.flat().map(Math.abs));}
result.push({name,frames:12,worst,newWorst,minEdge:+min.toFixed(3),maxEdge:+max.toFixed(3),belowRestFloor:+below.toFixed(4),nonfinite,hairPeak:+hairPeak.toFixed(3)})}
return {triangles:tris.length,base:{count:base.hits.size,groups:base.groups},result};
}
const path=require('node:path');
console.log(JSON.stringify(runAudit(fs.readFileSync(path.join(__dirname,'index.html'),'utf8')),null,2));

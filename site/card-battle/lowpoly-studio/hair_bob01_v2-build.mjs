export function build(d,sha,extra=0){
const N=32,P=[],Q=[],M=5,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const hem=[2.45,2.56,2.48,2.55,2.47,2.32,2.125,2.205,2.15,2.205,2.145,2.20,2.14,2.18,2.145,2.18,2.15];
const profile=[[2.10,.333],[2.17,.374],[2.28,.410],[2.39,.433],[2.53,.437],[2.66,.425],[2.79,.376],[2.88,.277],[2.935,.085]];
function radial(y){let j=profile.findIndex(v=>v[0]>=y);if(j<=0)return profile[j<0?profile.length-1:0][1];let a=profile[j-1],b=profile[j];return a[1]+(y-a[0])/(b[0]-a[0])*(b[1]-a[1])}
for(let l=0;l<2;l++)for(let j=0;j<=M;j++)for(let i=0;i<N;i++){
let k=Math.min(i,N-i),a=i*2*Math.PI/N,h=hem[k],y=[2.935,2.88,2.79,2.66,(2.66+h)/2,h][j];let r=radial(y)+(j>=2?(k%2===0?.012:-.004):0)+extra*(j>0?1:0)-(l?.012:0);
let x=r*Math.sin(a),z=r*Math.cos(a)*(Math.cos(a)>0?.94:1.02);if(j>=4&&k>=5&&k<=8)z+=.025*(j===5?1:.5);if(l)y-=j===0?.008:.001;P.push([x,y,z].map(x=>+x.toFixed(8)))}
const L=(M+1)*N,idx=(l,j,i)=>l*L+j*N+(i+N)%N;for(let l=0;l<2;l++)for(let j=0;j<M;j++)for(let i=0;i<N;i++){let f=[idx(l,j,i),idx(l,j+1,i),idx(l,j+1,i+1),idx(l,j,i+1)];Q.push(l?f.slice().reverse():f)}for(let i=0;i<N;i++)Q.push([idx(0,M,i),idx(1,M,i),idx(1,M,i+1),idx(0,M,i+1)]);for(let l=0;l<2;l++){let c=P.length;P.push([0,l?2.936:2.944,0]);for(let i=0;i<N;i+=2){let f=[c,idx(l,0,i),idx(l,0,i+1),idx(l,0,i+2)];Q.push(l?f.slice().reverse():f)}}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
let volume=0;for(let f of Q)for(let t of [[f[0],f[1],f[2]],[f[0],f[2],f[3]]])volume+=dot(P[t[0]],cross(P[t[1]],P[t[2]]))/6;if(volume<0)Q.forEach(f=>f.reverse());
const edges=new Map(),points=new Set(P.map(p=>p.map(x=>Math.round(x*1e7)).join(','))),mirror=P.filter(p=>!points.has([-p[0],p[1],p[2]].map(x=>Math.round(x*1e7)).join(','))).length;for(let f of Q)for(let i=0;i<4;i++){let a=f[i],b=f[(i+1)%4],key=[Math.min(a,b),Math.max(a,b)].join(':');let e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}
const tris=m=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i]))),bt=tris(d).concat(...Object.values(d.modules).map(tris)).filter(t=>Math.max(...t.map(p=>p[1]))>2.09),ht=tris({positions:P,polygons:Q});
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
let inside=0;for(let p of P){let hits=bt.map(t=>ray(p,[1,.013,.021],t)).filter(t=>t!==null&&t>1e-8);if(hits.length%2)inside++}
function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
const audit={vertices:P.length,quads:Q.length,sourceTriangles:0,mirrorVertexErrors:mirror,nonmanifoldEdges:[...edges.values()].filter(e=>e[0]!==2).length,orientationErrors:[...edges.values()].filter(e=>e[1]!==0).length,bodyOrEarInsideVertices:inside,hairTriangleEdgesCrossingBody:count(ht,bt),bodyTriangleEdgesCrossingHair:count(bt,ht),bodySourceSha:sha,extraRadius:extra};
return {name:"Bob 01 V2 / faceted locks",base:"V46",positions:P,polygons:Q,audit}}

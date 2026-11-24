export function build(d,sha){
const N=48,M=12,P=[],Q=[],cl=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=(a,b,x)=>{let t=cl((x-a)/(b-a),0,1);return t*t*(3-2*t)},profile=[[2.105,.338,.341],[2.16,.373,.381],[2.24,.402,.408],[2.37,.420,.427],[2.51,.429,.430],[2.65,.422,.424],[2.73,.404,.401],[2.80,.367,.365],[2.86,.309,.306],[2.91,.232,.233],[2.94,.143,.143],[2.954,.047,.047]];
function radius(y){let j=profile.findIndex(v=>v[0]>=y);if(j<=0)return profile[j<0?profile.length-1:0].slice(1);let a=profile[j-1],b=profile[j],t=(y-a[0])/(b[0]-a[0]);return [a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]}
function hem(a){return 2.605-.43*smooth(.61,1.24,a)-.06*smooth(1.55,2.8,a)+.012*Math.cos(12*a)*(1-smooth(.45,.72,a));}
for(let layer=0;layer<2;layer++)for(let j=0;j<=M;j++)for(let i=0;i<N;i++){let a=Math.min(i,N-i)*2*Math.PI/N,theta=i*2*Math.PI/N,t=j/M;let y=2.954+(hem(a)-2.954)*t, [rx,rz]=radius(y);const groove=.0045*Math.cos(12*theta)*Math.sin(Math.PI*t)**.7;let off=layer? .017:0;let x=(rx+groove-off)*Math.sin(theta),z=(rz+groove-off)*Math.cos(theta)-.012*smooth(.75,2.3,a)*t;y-=layer?.010*(1-t):0;P.push([x,y,z].map(v=>+v.toFixed(8)));}
const L=(M+1)*N,idx=(l,j,i)=>l*L+j*N+(i+N)%N;
for(let l=0;l<2;l++)for(let j=0;j<M;j++)for(let i=0;i<N;i++){let f=[idx(l,j,i),idx(l,j+1,i),idx(l,j+1,i+1),idx(l,j,i+1)];Q.push(l?f.slice().reverse():f)}
for(let i=0;i<N;i++)Q.push([idx(0,M,i),idx(1,M,i),idx(1,M,i+1),idx(0,M,i+1)]);
for(let l=0;l<2;l++){let c=P.length;P.push([0,l?2.947:2.957,0]);for(let i=0;i<N;i+=2){let f=[c,idx(l,0,i),idx(l,0,i+1),idx(l,0,i+2)];Q.push(l?f.slice().reverse():f)}}
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
let volume=0;for(let f of Q)for(let t of [[f[0],f[1],f[2]],[f[0],f[2],f[3]]])volume+=dot(P[t[0]],cross(P[t[1]],P[t[2]]))/6;if(volume<0)Q.forEach(f=>f.reverse());
const edges=new Map(),points=new Set(P.map(p=>p.map(x=>Math.round(x*1e7)).join(','))),mirror=P.filter(p=>!points.has([-p[0],p[1],p[2]].map(x=>Math.round(x*1e7)).join(','))).length;for(let f of Q)for(let i=0;i<4;i++){let a=f[i],b=f[(i+1)%4],key=[Math.min(a,b),Math.max(a,b)].join(':');let e=edges.get(key)||[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(key,e)}
let minArea=Infinity;for(let f of Q)minArea=Math.min(minArea,Math.hypot(...cross(sub(P[f[1]],P[f[0]]),sub(P[f[2]],P[f[0]])))/2+Math.hypot(...cross(sub(P[f[2]],P[f[0]]),sub(P[f[3]],P[f[0]])))/2);
const tris=(m)=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i])));
const bt=tris(d).concat(...Object.values(d.modules).map(tris)).filter(t=>Math.max(...t.map(p=>p[1]))>2.09);
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
let inside=0;for(let p of P){let hits=bt.map(t=>ray(p,[1,.013,.021],t)).filter(t=>t!==null&&t>1e-8);if(hits.length%2)inside++}
let crossing=0;const samples=[];for(let f of Q)for(let i=0;i<4;i++){let a=P[f[i]],b=P[f[(i+1)%4]],v=sub(b,a);if(bt.some(t=>{let u=ray(a,v,t);return u!==null&&u>1e-7&&u<1-1e-7})){crossing++;if(samples.length<8)samples.push([a,b])}}
const audit={vertices:P.length,quads:Q.length,sourceTriangles:0,mirrorVertexErrors:mirror,nonmanifoldEdges:[...edges.values()].filter(e=>e[0]!==2).length,orientationErrors:[...edges.values()].filter(e=>e[1]!==0).length,euler:P.length-edges.size+Q.length,minQuadArea:minArea,bodyOrEarInsideVertices:inside,bodyOrEarCrossingQuadEdges:crossing,bodySourceSha:sha,notes:"Static sampled vertex and edge tests; not exhaustive hair self-intersection or animation."};
return {name:"Bob 01 / symmetrical chin-length bob",base:"V46",positions:P,polygons:Q,audit,samples};
}

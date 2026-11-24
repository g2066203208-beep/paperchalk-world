export function build(d,sha,margin=.0){
const P=[],Q=[],groups=[],faceColors=[],N=24,rad=Math.PI/180;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const tris=m=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i]))),bt=[d,...Object.values(d.modules)].flatMap(tris).filter(t=>Math.max(...t.map(p=>p[1]))>2.07);
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
const profile=[[2.095,.27,.295,.26],[2.15,.322,.328,.306],[2.25,.368,.344,.355],[2.38,.388,.357,.39],[2.52,.39,.373,.396],[2.65,.384,.381,.398],[2.76,.333,.331,.345],[2.84,.25,.25,.253],[2.90,.148,.148,.147],[2.932,.065,.065,.065]];
function radial(y,a){let j=profile.findIndex(v=>v[0]>=y);if(j<1)j=j<0?profile.length-1:1;let p=profile[j-1],q=profile[j],t=Math.max(0,Math.min(1,(y-p[0])/(q[0]-p[0]))),rx=p[1]+t*(q[1]-p[1]),z=Math.cos(a)>0?2:3,rz=p[z]+t*(q[z]-p[z]),rr=1/Math.sqrt((Math.sin(a)/rx)**2+(Math.cos(a)/rz)**2),v=[Math.sin(a),0,Math.cos(a)],actual=Math.max(0,...bt.map(t=>ray([0,y,0],v,t)).filter(u=>u!==null&&u>0));return Math.max(rr,actual+.022)+margin}
function point(a,y,off=0){let theta=a*rad,r=radial(y,theta)+off;return [r*Math.sin(theta),y,r*Math.cos(theta)].map(x=>+x.toFixed(8))}
function v(p){P.push(p);return P.length-1}
function group(name,layer,col,fn){let f=Q.length;fn();groups.push({name,layer,faceStart:f,faceCount:Q.length-f});for(let i=f;i<Q.length;i++)faceColors.push(col)}
function quad(a,b,c,d){let f=[a,b,c,d],n=cross(sub(P[b],P[a]),sub(P[c],P[a])),cent=f.reduce((s,i)=>s.map((x,j)=>x+P[i][j]/4),[0,0,0]);if(dot(n,[cent[0],(cent[1]-2.54)*.8,cent[2]])<0)f.reverse();Q.push(f)}
const rings=[];
group("continuous crown and hair roots",0,[109,72,58],()=>{for(let [j,y] of [[0,2.925],[1,2.865],[2,2.755]]){rings.push(Array.from({length:N},(_,i)=>v(point(i*15,y,j===2&&i%2===0?.006:0))))}for(let j=0;j<2;j++)for(let i=0;i<N;i++)quad(rings[j][i],rings[j+1][i],rings[j+1][(i+1)%N],rings[j][(i+1)%N]);let c=v([0,2.935,0]);for(let i=0;i<N;i+=2)quad(c,rings[0][i],rings[0][(i+1)%N],rings[0][(i+2)%N])});
const idx=a=>((a/15)%N+N)%N;
function patch(name,layer,angles,rows,col,mirror=false){group(name+(mirror?" L":""),layer,col,()=>{let prev=angles.map(a=>rings[2][idx(mirror?-a:a)]);for(let row of rows){let next=row.map(([a,y,o])=>v(point(mirror?-a:a,y,o)));for(let j=0;j<prev.length-1;j++)quad(prev[j],next[j],next[j+1],prev[j+1]);prev=next}})}
// Three distinct fringe sheets share their crown seam, their free lower edges form broad tapered locks.
patch("central fringe",3,[-30,-15,0,15,30],[[[-30,2.66,.012],[-15,2.61,.012],[0,2.595,.025],[15,2.61,.012],[30,2.66,.012]],[[-30,2.618,.002],[-13,2.49,.014],[0,2.405,.017],[13,2.49,.014],[30,2.618,.002]]],[116,76,60]);
for(let flip of [false,true]){
patch("diagonal fringe",3,[30,45,60],[[[30,2.66,.012],[42,2.59,.023],[60,2.62,.009]],[[30,2.618,.002],[43,2.435,.024],[57,2.535,.011]]],[112,73,58],flip);
patch("side main",2,[60,75,90],[[[60,2.62,.009],[73,2.55,.015],[90,2.56,.011]],[[50,2.37,.011],[72,2.34,.016],[90,2.34,.006]],[[52,2.175,.008],[57,2.107,.01],[84,2.165,.002]]],[105,67,53],flip);
patch("temple back",1,[90,105,120],[[[90,2.56,.011],[105,2.56,.01],[120,2.56,.005]],[[90,2.34,.006],[105,2.31,.01],[120,2.33,.003]],[[84,2.165,.002],[97,2.125,.006],[116,2.145,0]]],[103,65,51],flip);
patch("back wing",1,[120,135,150],[[[120,2.56,.005],[135,2.58,.01],[150,2.56,0]],[[120,2.33,.003],[135,2.31,.011],[150,2.33,.003]],[[116,2.145,0],[133,2.115,.006],[150,2.15,0]]],[108,70,55],flip);
}
patch("rear center",1,[150,165,180,195,210],[[[150,2.56,0],[165,2.57,.004],[180,2.57,.012],[195,2.57,.004],[210,2.56,0]],[[150,2.33,.003],[165,2.32,.005],[180,2.31,.009],[195,2.32,.005],[210,2.33,.003]],[[150,2.15,0],[165,2.13,0],[180,2.115,.005],[195,2.13,0],[210,2.15,0]]],[104,68,54]);
// Two narrow curved face-framing sheets, only local overlap, no additional global cap.
for(let flip of [false,true])group("inner side lining "+(flip?"L":"R"),2,[81,51,42],()=>{let rows=[[[57,2.66,-.003],[69,2.66,-.006]],[[46,2.48,-.004],[72,2.47,-.005]],[[44,2.29,-.004],[70,2.29,-.005]],[[43,2.16,-.002],[49,2.12,-.001]]].map(row=>row.map(([a,y,o])=>v(point(flip?-a:a,y,o+-0.018))));for(let j=0;j<rows.length-1;j++)quad(rows[j][0],rows[j+1][0],rows[j+1][1],rows[j][1])});
const ht=tris({positions:P,polygons:Q});function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
let inter=[];for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){let a=groups[i],b=groups[j],u=ht.slice(a.faceStart*2,(a.faceStart+a.faceCount)*2),v=ht.slice(b.faceStart*2,(b.faceStart+b.faceCount)*2),n=count(u,v)+count(v,u);if(n)inter.push([a.name,b.name,n])}
let points=new Set(P.map(p=>p.map(v=>Math.round(v*1e6)).join(','))),mirror=P.filter(p=>!points.has([-p[0],p[1],p[2]].map(v=>Math.round(v*1e6)).join(','))).length;
return {name:"Bob 01 V4 crown-connected folded cards",base:"V46",positions:P,polygons:Q,faceColors,groups,audit:{vertices:P.length,quads:Q.length,sourceTriangles:0,mirrorVertexErrors:mirror,bodySourceSha:sha,hairEdgesCrossBody:count(ht,bt),bodyEdgesCrossHair:count(bt,ht),interGroupCrossings:inter,margin,openSheets:true}}
}

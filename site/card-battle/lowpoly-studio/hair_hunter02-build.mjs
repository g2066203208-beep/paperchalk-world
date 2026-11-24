export function build(L){
let m={name:"Hunter 02 / Ash blonde low ponytail",base:"V46",positions:[],polygons:[],uv:[],faceColors:[],materials:[],groups:[],slots:[],bodySourceSha:L.bodySourceSha};
function card(id,layer,rows,material,uvfn=(p,i,j,n,h)=>[i/(n-1),1-j/(h-1)]){let vs=m.positions.length,fs=m.polygons.length,n=rows[0].length;rows.forEach((r,j)=>r.forEach((p,i)=>{m.positions.push(p.slice());m.uv.push(uvfn(p,i,j,n,rows.length))}));for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){let k=vs+j*n+i;m.polygons.push([k,k+n,k+n+1,k+1]);m.faceColors.push([40,38,39]);m.materials.push(material)}m.groups.push({name:id,layer,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
let F=Array.from({length:5},(_,j)=>L.positions.slice(j*5,j*5+5).map(p=>p.slice()));F.push([[-.245,2.16,.235],[-.125,2.16,.31],[0,2.16,.326],[.125,2.16,.31],[.245,2.16,.235]]);
card("swept-front",3,F,"front",p=>[(p[0]+.36)/.72,(p[1]-2.14)/.78]);
let B=Array.from({length:6},(_,j)=>L.positions.slice(43+j*5,48+j*5).map(p=>p.slice()));B.push(B[5].map((p,i)=>p.map((x,k)=>x+(L.positions[73+i][k]-x)*.43)));
card("combed-back",1,B,"back");
for(let s of [-1,1]){
let i=s===1?4:0;
let S=Array.from({length:5},(_,j)=>{let f=F[j][i],b=B[j+1][i],old=L.positions[(s===1?120:93)+j*3+1];return [f,old.slice(),b]});
let j0=(s===1?120:93)+12,j1=j0+3;let frontEnd=L.positions[j0].map((x,k)=>x+(L.positions[j1][k]-x)*.43),mid=L.positions[j0+1].map((x,k)=>x+(L.positions[j1+1][k]-x)*.43);S.push([frontEnd,mid,B[6][i]]);
card(s===1?"temple-right":"temple-left",2,S,s===1?"sideR":"sideL");
}
const tail=[
[[-.075,2.385,-.367],[0,2.385,-.399],[.075,2.385,-.367]],
[[-.09,2.29,-.35],[.008,2.29,-.395],[.09,2.29,-.35]],
[[-.115,2.12,-.35],[.015,2.12,-.41],[.145,2.12,-.35]],
[[-.10,1.94,-.36],[.045,1.95,-.43],[.18,1.94,-.36]],
[[-.055,1.76,-.375],[.085,1.77,-.445],[.215,1.77,-.375]],
[[.025,1.61,-.40],[.135,1.59,-.47],[.24,1.63,-.40]],
[[.13,1.54,-.43],[.18,1.52,-.49],[.27,1.57,-.41]]
];card("low-ponytail-rear",4,tail,"extra");
const profile=tail.map((r,j)=>{let p=r[1],d=[.022,.037,.075,.09,.085,.063,.012][j];return [[p[0]-.014,p[1],p[2]-d],[p[0]+.028,p[1],p[2]-.006],[p[0]-.008,p[1],p[2]+d]]});
card("low-ponytail-profile",4,profile,"tailProfile");
return m
}
export function paint(kind){
const width=256,height=256,data=new Uint8Array(width*height*4);
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*Math.min(1,Math.max(0,t)));
const P=(a,...segments)=>{let p=[a];for(let [b,c,d] of segments){for(let i=1;i<=24;i++){let t=i/24,s=1-t;p.push([s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]])}a=d}return p};
const inside=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const lock=(p,axis,col=[191,179,150],shade=[105,92,72])=>({p,axis,col,shade});
let locks;
if(kind==="front"){
locks=[
lock(P([.38,-.05],[[.23,-.04],[.05,.04],[-.06,.18]],[[-.08,.44],[-.035,.71],[.015,.83]],[[.04,.90],[.095,.95],[.15,.98]],[[.112,.86],[.09,.72],[.13,.58]],[[.17,.41],[.26,.25],[.38,-.05]]),y=>.22-.14*y,[180,164,134]),
lock(P([.20,-.05],[[.49,-.05],[.80,-.08],[1.08,.02]],[[1.09,.31],[1.04,.51],[.96,.67]],[[.90,.81],[.89,.90],[.80,.96]],[[.84,.80],[.82,.65],[.75,.49]],[[.61,.35],[.37,.28],[.20,-.05]]),y=>.54+.33*y,[208,195,164]),
lock(P([.20,-.04],[[.35,.04],[.58,.14],[.73,.31]],[[.81,.43],[.82,.53],[.80,.59]],[[.72,.48],[.53,.35],[.40,.29]],[[.30,.18],[.23,.08],[.20,-.04]]),y=>.35+.62*y,[219,208,179]),
lock(P([.38,-.04],[[.29,.12],[.23,.22],[.20,.35]],[[.18,.46],[.21,.53],[.24,.58]],[[.18,.56],[.14,.50],[.13,.42]],[[.13,.27],[.25,.10],[.38,-.04]]),y=>.33-.27*y,[183,167,136])
];
}else if(kind==="sideL"||kind==="sideR"){
let long=kind==="sideL";
locks=[
lock(P([-.06,-.05],[[.23,-.06],[.70,-.08],[1.06,-.05]],[[1.06,.35],[1.06,.72],[1.06,1.06]],[[.78,1.05],[.52,.92],[.38,.72]],[[.26,.57],[.11,.46],[-.06,.40]],[[-.08,.20],[-.07,.04],[-.06,-.05]]),y=>.30+.59*y,[187,173,145]),
lock(P([-.06,-.04],[[.09,-.06],[.27,-.04],[.44,.02]],[[.38,.23],[.23,.37],[.17,.53]],[[.12,.64],[.10,long?.88:.69],[.015,long?1.03:.76]],[[-.035,.87],[-.06,.68],[-.07,.42]],[[-.08,.21],[-.07,.06],[-.06,-.04]]),y=>.21-.16*y,[209,195,163])
];
}else if(kind==="back"){
locks=[
lock([[-.05,-.05],[1.05,-.05],[1.05,1.05],[-.05,1.05]],y=>.5,[185,171,143]),
lock(P([-.05,-.05],[[.04,-.06],[.26,-.06],[.46,-.05]],[[.36,.28],[.42,.58],[.49,1.04]],[[.24,.91],[.10,.78],[-.06,.62]],[[-.07,.32],[-.07,.07],[-.05,-.05]]),y=>.16+.26*y,[202,188,158]),
lock(P([.54,-.05],[[.75,-.06],[.97,-.06],[1.05,-.05]],[[1.07,.26],[1.07,.43],[1.05,.59]],[[.89,.76],[.68,.94],[.51,1.04]],[[.58,.66],[.65,.34],[.54,-.05]]),y=>.84-.26*y,[197,183,153])
];
}else{
locks=[
lock(P([-.05,-.04],[[.30,-.05],[.69,-.05],[1.04,-.04]],[[1.06,.30],[1.03,.59],[.96,.79]],[[.90,.90],[.80,.92],[.74,.99]],[[.67,.92],[.60,.89],[.54,.92]],[[.48,.98],[.42,1.02],[.35,1.04]],[[.22,.90],[.11,.81],[.04,.66]],[[-.04,.47],[-.04,.22],[-.05,-.04]]),y=>.54+.04*Math.sin(y*6),[192,178,147]),
lock(P([.12,-.05],[[.28,-.05],[.49,-.04],[.66,-.04]],[[.62,.25],[.62,.48],[.52,.67]],[[.43,.84],[.38,.92],[.28,.95]],[[.18,.79],[.15,.53],[.12,-.05]]),y=>.37-.05*y,[212,197,163])
];
}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
let u=(x+.5)/width,v=(y+.5)/height,col=null;
for(let l of locks){if(!inside(l.p,u,v))continue;let d=u-l.axis(v),shade=.03+.18*v+.23*Math.min(1,Math.pow(Math.abs(d)/.23,2));if(d>.07)shade+=.09;let shine=.26*Math.exp(-Math.pow((v-.28-.11*Math.sin(u*3.5))/.085,2));col=mix(l.col,l.shade,shade-shine);if(v>.15&&(!inside(l.p,u+.004,v)||!inside(l.p,u-.004,v)))col=mix(col,l.shade,.30);
// Fine, directional accents, not repeated vertical stripes.
if(v>.18&&v<.66&&Math.abs(d+.035-.014*Math.sin(v*8))<.006)col=mix(col,[235,224,197],.40);
}
if(col){if(kind==="back"&&v>.90&&Math.abs(u-.5)>.50-(v-.90)*1.6)continue;if((kind==="extra"||kind==="tailProfile")&&v>.055&&v<.15)col=mix([53,46,38],[108,93,67],.24+u*.35);data.set([...col.map(Math.round),255],(y*width+x)*4)}
}return {width,height,data}
}

export function audit(D,M){const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],tris=(p,q)=>q.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>p[i])));
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<1e-7||u>1-1e-7)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<1e-7||u+w>1-1e-7)return null;return f*dot(e2,q)}
function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
let bt=[D,...Object.values(D.modules)].flatMap(x=>tris(x.positions,x.polygons)),groups=M.groups.map(g=>({name:g.name,t:tris(M.positions,M.polygons.slice(g.faceStart,g.faceStart+g.faceCount))}));let body=groups.map(g=>[g.name,count(g.t,bt)+count(bt,g.t)]),pairs=[];for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){let a=groups[i],b=groups[j],n=count(a.t,b.t)+count(b.t,a.t);if(n)pairs.push([a.name,b.name,n])}return {body,pairs,vertices:M.positions.length,quads:M.polygons.length,limitations:"static strict triangle interior test; excludes coplanar/shared boundary contacts and alpha masks; crossed ponytail cards intentionally overlap."}}

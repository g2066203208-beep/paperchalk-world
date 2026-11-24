export function build(D,F){
let m=JSON.parse(JSON.stringify(F));m.name="HairCards 03 / Long hair";m.audit={frontUnchanged:true,ahogeUnchanged:true};
const add=(id,layer,rows,material,mirror=false)=>{let vs=m.positions.length,fs=m.polygons.length,n=rows[0].length;for(let j=0;j<rows.length;j++)for(let i=0;i<n;i++){let p=rows[j][i];m.positions.push([p[0]*(mirror?-1:1),p[1],p[2]]);m.uv.push([i/(n-1),1-j/(rows.length-1)])}for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){let k=vs+j*n+i,q=[k,k+n,k+n+1,k+1];m.polygons.push(mirror?q.reverse():q);m.faceColors.push([35,34,39]);m.materials.push(material)}m.groups.push({name:id,layer,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})};
let B=[
F.positions.slice(0,5).map(p=>p.slice()),
[[-.178,2.884,-.058],[-.10,2.908,-.093],[0,2.916,-.107],[.10,2.908,-.093],[.178,2.884,-.058]],
[[-.265,2.811,-.17],[-.151,2.831,-.279],[0,2.837,-.301],[.151,2.831,-.279],[.265,2.811,-.17]],
[[-.35,2.666,-.268],[-.20,2.67,-.367],[0,2.67,-.397],[.20,2.67,-.367],[.35,2.666,-.268]],
[[-.363,2.49,-.278],[-.21,2.49,-.382],[0,2.49,-.405],[.21,2.49,-.382],[.363,2.49,-.278]],
[[-.35,2.35,-.282],[-.20,2.35,-.365],[0,2.35,-.39],[.20,2.35,-.365],[.35,2.35,-.282]],
[[-.35,2.06,-.23],[-.21,2.06,-.30],[0,2.06,-.33],[.21,2.06,-.30],[.35,2.06,-.23]],
[[-.39,1.76,-.235],[-.22,1.76,-.285],[0,1.76,-.32],[.22,1.76,-.285],[.39,1.76,-.235]],
[[-.385,1.45,-.25],[-.22,1.45,-.31],[0,1.45,-.34],[.22,1.45,-.31],[.385,1.45,-.25]],
[[-.31,1.16,-.24],[-.17,1.12,-.29],[0,1.1,-.32],[.17,1.12,-.29],[.31,1.16,-.24]]
];add("long-back",1,B,"back");
for(let sign of [-1,1]){
let j=sign===1?4:0;
const front=F.positions.filter((p,i)=>i<25&&i%5===j).map(p=>[Math.abs(p[0]),p[1],p[2]]);
const ends=[[.323,2.06,.176],[.35,1.76,.02],[.36,1.45,-.12],[.30,1.19,-.20]];
let S=[...front,...ends].map((p,i)=>{let b=B[i+1][4],midX=[.202,.313,.39,.407,.40,.375,.41,.415,.33][i];return [p,[midX,(p[1]+b[1])/2+.005,(p[2]+b[2])/2+.02],b]});
add(sign===1?"temple-right":"temple-left",2,S,"side",sign===-1);
}
return m}
export function paintLong(kind){
const width=256,height=256,data=new Uint8Array(width*height*4),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t))),cl=x=>Math.max(0,Math.min(1,x));
const P=(a,...segments)=>{let p=[a];for(let [b,c,d] of segments){for(let i=1;i<=20;i++){let t=i/20,s=1-t;p.push([s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]])}a=d}return p};
const inside=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
let locks=kind==="back"?[
{p:P([-.05,-.05],[[.15,-.05],[.33,-.05],[.46,-.05]],[[.36,.36],[.41,.71],[.33,.98]],[[.23,.91],[.16,.92],[.11,.87]],[[-.01,.77],[-.05,.46],[-.05,-.05]]),axis:y=>.18+.05*y,col:[220,205,231],shade:[146,124,181]},
{p:P([.54,-.05],[[.68,-.05],[.89,-.05],[1.05,-.05]],[[1.05,.43],[1.03,.76],[.9,.94]],[[.79,.91],[.71,.95],[.65,.98]],[[.58,.75],[.60,.39],[.54,-.05]]),axis:y=>.80-.06*y,col:[220,205,231],shade:[146,124,181]},
{p:P([.19,-.05],[[.37,-.06],[.61,-.06],[.81,-.05]],[[.73,.27],[.76,.59],[.69,.84]],[[.64,.92],[.56,.97],[.50,1.02]],[[.44,.96],[.36,.89],[.31,.82]],[[.23,.57],[.27,.29],[.19,-.05]]),axis:y=>.5+.025*Math.sin(y*6),col:[239,225,243],shade:[165,145,197]}
]:[
{p:P([-.08,-.05],[[.2,-.05],[.77,-.05],[1.08,-.05]],[[1.08,.30],[1.08,.65],[.99,.88]],[[.89,.94],[.77,.98],[.69,1.01]],[[.55,.90],[.42,.78],[.24,.70]],[[.06,.62],[-.03,.39],[-.08,-.05]]),axis:y=>.67-.04*y,col:[219,202,230],shade:[143,122,179]},
{p:P([-.07,-.05],[[.18,-.05],[.44,-.05],[.72,-.05]],[[.63,.23],[.68,.43],[.54,.63]],[[.45,.75],[.36,.84],[.22,.91]],[[.19,.80],[.13,.71],[.06,.63]],[[-.05,.47],[-.07,.21],[-.07,-.05]]),axis:y=>.26+.06*Math.sin(y*4),col:[249,235,247],shade:[174,151,204]}
];
for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height,col=null;for(let l of locks){if(!inside(l.p,u,v))continue;let d=u-l.axis(v),s=.055+.32*v+.23*Math.min(1,Math.pow(Math.abs(d)/.27,2));let shine=.18*Math.exp(-Math.pow((v-.21-.045*Math.sin(u*8))/.11,2));col=mix(l.col,l.shade,s-shine);if(v>.12&&(!inside(l.p,u+.009,v)||!inside(l.p,u-.009,v)))col=mix(col,l.shade,.38)}if(col)data.set([...col.map(Math.round),255],(y*width+x)*4)}return {width,height,data}
}

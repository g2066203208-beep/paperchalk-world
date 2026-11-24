export function build(D,A,sha,extra=0){
let rows=[
[[-.167,2.878,.015],[-.09,2.901,.012],[0,2.902,.015],[.09,2.901,.012],[.167,2.878,.015]],
[[-.254,2.805,.155],[-.145,2.811,.265],[0,2.809,.289],[.145,2.811,.265],[.254,2.805,.155]],
[[-.335,2.668,.20],[-.167,2.669,.333],[0,2.667,.365],[.167,2.669,.333],[.335,2.668,.20]],
[[-.335,2.49,.20],[-.17,2.49,.329],[0,2.49,.36],[.17,2.49,.329],[.335,2.49,.20]],
[[-.294,2.35,.195],[-.15,2.35,.305],[0,2.35,.347],[.15,2.35,.305],[.294,2.35,.195]]
];
let m={name:"HairCards 02 / Front study + Ahoge",base:"V46",positions:rows.flatMap((r,j)=>r.map(([x,y,z])=>[x*(1+extra),y+(j<2?extra*.12:0),z+extra*(j===0?.15:1)])),polygons:[],uv:[],faceColors:[],materials:[],groups:[],slots:[],bodySourceSha:sha};
m.uv=m.positions.map(([x,y,z])=>[(x+.36)/.72,(y-2.34)/.58]);
for(let j=0;j<4;j++)for(let i=0;i<4;i++){let p=j*5+i;m.polygons.push([p,p+5,p+6,p+1]);m.faceColors.push([40,38,44]);m.materials.push("front")}
m.groups.push({name:"front",layer:3,faceStart:0,faceCount:16});m.slots.push({id:"front",material:"front",vertexStart:0,vertexCount:25,faceStart:0,faceCount:16});
let o=m.positions.length,f=m.polygons.length;m.positions.push(...A.positions);m.uv.push(...A.positions.map((_,i)=>[(i%3)/2,1-Math.floor(i/3)/5]));m.polygons.push(...A.polygons.map(q=>q.map(i=>i+o)));m.faceColors.push(...A.faceColors);m.materials.push(...A.polygons.map(()=>"extra"));m.groups.push({name:"ahoge01",layer:4,faceStart:f,faceCount:A.polygons.length});m.slots.push({id:"ahoge01",material:"extra",vertexStart:o,vertexCount:A.positions.length,faceStart:f,faceCount:A.polygons.length});
let sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
let tris=(p,q)=>q.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>p[i])));
let bt=[D,...Object.values(D.modules)].flatMap(x=>tris(x.positions,x.polygons)),ht=tris(m.positions,m.polygons.slice(0,16)),at=tris(A.positions,A.polygons);
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
m.audit={frontQuads:16,extra,bodyCrossings:count(ht,bt)+count(bt,ht),ahogeCrossings:count(ht,at)+count(at,ht),unchangedAhoge:true};return m
}
export function paintFront(){
const w=256,h=256,data=new Uint8Array(w*h*4),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const P=(a,...segments)=>{let p=[a];for(let [b,c,d] of segments){for(let i=1;i<=24;i++){let t=i/24,s=1-t;p.push([s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]])}a=d}return p};
const inside=(p,x,y)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let a=p[i],b=p[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const locks=[
{p:P([-.1,-.08],[[.08,-.1],[.30,-.06],[.50,.03]],[[.40,.28],[.25,.45],[.19,.66]],[[.14,.78],[.12,.91],[.13,.98]],[[.05,.93],[.02,.79],[-.08,.65]], [[-.12,.35],[-.12,.05],[-.1,-.08]]),axis:y=>.28-.19*y,base:[234,219,239],shadow:[146,123,177]},
{p:P([.51,-.08],[[.69,-.08],[.93,-.08],[1.1,-.08]],[[1.12,.30],[1.02,.69],[.91,.92]],[[.84,.86],[.78,.76],[.76,.62]],[[.70,.41],[.60,.18],[.51,-.08]]),axis:y=>.70+.18*y,base:[238,226,242],shadow:[155,132,183]},
{p:P([.36,-.10],[[.49,-.11],[.64,-.07],[.75,.01]],[[.80,.22],[.78,.45],[.68,.62]],[[.62,.73],[.56,.81],[.43,.86]],[[.45,.75],[.45,.64],[.40,.51]],[[.37,.38],[.31,.21],[.36,-.10]]),axis:y=>.56-.05*y,base:[250,238,247],shadow:[175,151,204]},
{p:P([.22,-.09],[[.32,-.09],[.41,-.06],[.48,.01]],[[.46,.25],[.37,.43],[.28,.58]],[[.23,.66],[.20,.73],[.18,.77]],[[.17,.65],[.15,.48],[.16,.35]],[[.16,.14],[.19,.02],[.22,-.09]]),axis:y=>.30-.09*y,base:[246,233,244],shadow:[175,151,204]}
];
for(let y=0;y<h;y++)for(let x=0;x<w;x++){let u=(x+.5)/w,z=(y+.5)/h,col=null;for(let l of locks){if(!inside(l.p,u,z))continue;let d=u-l.axis(z);let shade=.07+.18*z+.32*Math.min(1,Math.pow(Math.abs(d)/.22,2));if(d>.07&&z>.28)shade+=.16;let highlight=.16*Math.exp(-Math.pow((z-.26-.09*Math.sin(u*5))/.12,2));col=mix(l.base,l.shadow,shade-highlight);if(z>.17&&(!inside(l.p,u+.005,z)||!inside(l.p,u-.005,z)))col=mix(col,l.shadow,.32)}if(col)data.set([...col.map(Math.round),255],(y*w+x)*4)}
return {width:w,height:h,data}
}

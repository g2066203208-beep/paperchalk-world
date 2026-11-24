export function build(D,sha){
const positions=[],polygons=[],faceColors=[],stations=[
[0,2.890,.035,.010],
[-.035,2.961,.054,.025],
[-.052,3.035,.061,.031],
[-.007,3.101,.049,.026],
[.075,3.109,.028,.014],
[.139,3.063,.002,.001]
];
const dir=[.82,0,.57236352],normal=[-.57236352,0,.82];
for(let i=0;i<stations.length;i++){
let [u,y,w,r]=stations[i],a=stations[Math.max(i-1,0)],b=stations[Math.min(i+1,stations.length-1)],du=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(du,dy),wx=i===0?1:dy/l,wy=i===0?0:-du/l;
for(let side of [-1,0,1]){
let xx=u+side*w*wx,yy=y+side*w*wy,depth=side===0?r:0;
positions.push([xx*dir[0]+depth*normal[0],yy,xx*dir[2]+depth*normal[2]]);
}}
for(let j=0;j<stations.length-1;j++)for(let k=0;k<2;k++){let i=j*3+k;polygons.push([i,i+3,i+4,i+1]);faceColors.push(k===0?[235,224,237]:[194,177,212])}
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const tris=m=>m.polygons.flatMap(f=>[[f[0],f[1],f[2]],[f[0],f[2],f[3]]].map(t=>t.map(i=>m.positions[i]))),bt=[D,...Object.values(D.modules)].flatMap(tris),ht=tris({positions,polygons});
function ray(o,v,t){let e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),h=cross(v,e2),a=dot(e1,h);if(Math.abs(a)<1e-10)return null;let f=1/a,s=sub(o,t[0]),u=f*dot(s,h);if(u<0||u>1)return null;let q=cross(s,e1),w=f*dot(v,q);if(w<0||u+w>1)return null;return f*dot(e2,q)}
function count(a,b){let n=0;for(let t of a)for(let i=0;i<3;i++){let p=t[i],v=sub(t[(i+1)%3],p);if(b.some(q=>{let u=ray(p,v,q);return u!==null&&u>1e-7&&u<1-1e-7}))n++}return n}
let minArea=Math.min(...ht.map(t=>Math.hypot(...cross(sub(t[1],t[0]),sub(t[2],t[0])))/2));
return {name:"Ahoge 01 V46 independent folded ribbon",base:"V46",positions,polygons,faceColors,groups:[{name:"single ahoge",layer:4,faceStart:0,faceCount:polygons.length}],audit:{vertices:positions.length,quads:polygons.length,sourceTriangles:0,groups:1,minRenderTriangleArea:minArea,bodySourceSha:sha,hairEdgesCrossBody:count(ht,bt),bodyEdgesCrossHair:count(bt,ht),openSheet:true,asymmetricDesign:true}};
}

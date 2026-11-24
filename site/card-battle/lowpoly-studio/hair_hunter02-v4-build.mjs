export function build(old,variant=0){
const m=JSON.parse(JSON.stringify(old));m.name="Hunter 02 / Center-part V4 hard folded forelock";m.positions=m.positions.slice(0,152);m.uv=m.uv.slice(0,152);m.polygons=m.polygons.slice(0,100);m.faceColors=m.faceColors.slice(0,100);m.materials=m.materials.slice(0,100);m.slots=m.slots.slice(0,6);m.groups=m.groups.slice(0,6);
function card(s,rows){let vs=m.positions.length,fs=m.polygons.length,key=s===1?"frontR4":"frontL4";rows.forEach((row,j)=>row.forEach((p,i)=>{m.positions.push([s*p[0],p[1],p[2]]);m.uv.push([i/2,1-j/(rows.length-1)])}));for(let j=0;j<rows.length-1;j++)for(let i=0;i<2;i++){let k=vs+j*3+i,q=[k,k+3,k+4,k+1];m.polygons.push(s===-1?q.reverse():q);m.materials.push(key);m.faceColors.push([185,170,143])}let id=s===1?"hard-fold-right":"hard-fold-left";m.groups.push({name:id,layer:3,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material:key,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
// Row 0 is embedded at crown; row 1 is the raised forward fold. No intermediate smoothing row.
let rows=[[[.010,2.902,.025],[.13,2.907,-.005],[.218,2.834,-.032]],
[[.023,3.040+variant,.303],[.142,3.006+variant,.318],[.281,2.915,.230]],
[[.082,2.857,.372],[.220,2.866,.360],[.328,2.783,.233]],
[[.153,2.675,.389],[.294,2.704,.340],[.366,2.620,.218]],
[[.205,2.475,.369],[.313,2.493,.320],[.342,2.450,.236]],
[[.248,2.278,.300],[.258,2.283,.307],[.270,2.297,.283]]];
card(1,rows);card(-1,rows.map((row,j)=>row.map(([x,y,z],i)=>[x*(j===1?1.22:.97),y-(j===1?.045:j===2?.026:0)+(j===5?.055:0),z-(j===1?.025:.005)])));
for(let s of [-1,1]){
let f=m.slots.find(x=>x.id===(s===1?"hard-fold-right":"hard-fold-left")),vs=m.positions.length,fs=m.polygons.length;
let p=m.positions.slice(f.vertexStart+3,f.vertexStart+6);
let root=[[s*.016,2.821,.252],[s*.127,2.804,.265],[s*.240,2.765,.205]];
for(let i=0;i<3;i++){m.positions.push(root[i],p[i].map((x,k)=>k===1?x-.004:k===2?x-.004:x));m.uv.push([i/2,0],[i/2,1])}
for(let i=0;i<2;i++){let k=vs+2*i;m.polygons.push([k,k+1,k+3,k+2]);m.faceColors.push([140,122,97]);m.materials.push("foldInner4")}
let id=s===1?"fold-inner-right":"fold-inner-left";m.slots.push({id,material:"foldInner4",vertexStart:vs,vertexCount:6,faceStart:fs,faceCount:2});m.groups.push({name:id,layer:3,faceStart:fs,faceCount:2});
}return m}
export function paintFold(kind){let width=256,height=256,data=new Uint8Array(width*height*4),cl=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*cl(t));for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height;let top=v<.2;let shadow=top?.17+.13*u:.14+.32*Math.pow(u,2)+.12*v;let col=mix(kind==="frontR4"?[210,199,168]:[195,181,152],[100,83,66],shadow);if(v>=.2&&v<.234)col=mix(col,[115,96,77],.78*(1-(v-.2)/.034));if(top&&v>.18)col=mix(col,[240,229,199],.56);if(!top&&v>.26&&v<.48){let h=.38*Math.exp(-Math.pow((v-.34-.055*u)/.035,2));col=mix(col,[246,235,205],h)}for(let a of [.14,.36,.64,.85]){let line=a+.019*Math.sin(v*5+a*7);if(Math.abs(u-line)<.004)col=mix(col,[104,87,68],.28)}if(v>.975&&Math.abs(u-.48)>.50*(1-v)/.025)continue;data.set([...col.map(Math.round),255],(y*width+x)*4)}return{width,height,data}}

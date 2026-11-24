export function build(D,old){
let m=JSON.parse(JSON.stringify(old));m.name="Hunter 02 / Center-part V3 rooted angular sweep";m.positions=m.positions.slice(0,113);m.uv=m.uv.slice(0,113);m.polygons=m.polygons.slice(0,68);m.materials=m.materials.slice(0,68);m.faceColors=m.faceColors.slice(0,68);m.groups=m.groups.slice(0,5);m.slots=m.slots.slice(0,5);
function card(id,layer,rows,material,mirror=false){let vs=m.positions.length,fs=m.polygons.length,n=rows[0].length;rows.forEach((r,j)=>r.forEach((p,i)=>{m.positions.push([p[0]*(mirror?-1:1),p[1],p[2]]);m.uv.push([i/(n-1),1-j/(rows.length-1)])}));for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){let k=vs+j*n+i,q=[k,k+n,k+n+1,k+1];m.polygons.push(mirror?q.reverse():q);m.faceColors.push([160,145,119]);m.materials.push(material)}m.groups.push({name:id,layer,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
const ring=(i)=> (i+12)%12;
function offset(p){return [p[0]*1.044,2.57+(p[1]-2.57)*1.044,p[2]*1.044]}
let vs=m.positions.length,fs=m.polygons.length;
for(let k=40;k<=78;k++){let p=D.positions[k].slice();if(k<52){let i=k-40,j=Math.min(i,12-i),f=[.85,.79,.60,.32,.25,.22,.22][j];p=p.map((x,a)=>x+(D.positions[k+12][a]-x)*f)}m.positions.push(offset(p));m.uv.push([(p[0]+.36)/.72,(p[2]+.37)/.74])}
for(let f of D.polygons.filter(f=>f.every(i=>i>=40&&i<=78))){m.polygons.push(f.map(i=>i-40+vs));m.faceColors.push([168,153,126]);m.materials.push("scalp")}
m.groups.push({name:"scalp-front-underlay",layer:0,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id:"scalp-front-underlay",material:"scalp",vertexStart:vs,vertexCount:39,faceStart:fs,faceCount:m.polygons.length-fs});
let rows=[
[[.004,2.874,.145],[.028,2.945,.090],[.070,2.901,-.045]],
[[.030,2.859,.305],[.082,2.985,.245],[.154,2.891,.075]],
[[.100,2.770,.365],[.192,2.948,.315],[.273,2.838,.120]],
[[.145,2.641,.390],[.273,2.805,.340],[.361,2.738,.170]],
[[.191,2.475,.370],[.301,2.619,.320],[.366,2.530,.215]],
[[.229,2.341,.325],[.278,2.385,.325],[.310,2.410,.272]],
[[.254,2.259,.288],[.258,2.263,.295],[.265,2.270,.287]]
];card("angular-front-right",3,rows,"frontR3");card("angular-front-left",3,rows.map((r,j)=>r.map(([x,y,z])=>[x*(j<2?.96:1.055),y+(j>=4?.025:j===0?0:-.018),z-.007])),"frontL3",true);
return m}
export function paintNew(kind){let width=256,height=256,data=new Uint8Array(width*height*4),cl=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*cl(t));for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height;let col;if(kind==="scalp"){col=mix([183,168,138],[142,126,101],.20+.16*Math.abs(u-.5)*2+.08*Math.sin(u*47+v*9));}else{let shadow=.10+.32*(u>.52?1:0)+.22*Math.exp(-Math.pow(v/.15,2));let hi=.30*Math.exp(-Math.pow((v-.25-.12*u)/.10,2));col=mix([214,201,171],[109,92,73],shadow-hi);for(let a of [.19,.38,.72,.9]){let line=a+.035*Math.sin(v*6+a*4);if(Math.abs(u-line)<.004)col=mix(col,[118,102,80],.32);if(Math.abs(u-line-.016)<.008&&v>.14&&v<.42)col=mix(col,[244,234,208],.65)}if(v>.96&&Math.abs(u-.48)>.5*(1-v)/.04)continue;}data.set([...col.map(Math.round),255],(y*width+x)*4)}return {width,height,data}}

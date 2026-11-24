export function build(D,old){
let m=JSON.parse(JSON.stringify(old));m.name="Hunter 02 / Center-part V3 rooted angular sweep";m.positions=m.positions.slice(0,113);m.uv=m.uv.slice(0,113);m.polygons=m.polygons.slice(0,68);m.materials=m.materials.slice(0,68);m.faceColors=m.faceColors.slice(0,68);m.groups=m.groups.slice(0,5);m.slots=m.slots.slice(0,5);
function card(id,layer,rows,material,mirror=false){let vs=m.positions.length,fs=m.polygons.length,n=rows[0].length;rows.forEach((r,j)=>r.forEach((p,i)=>{m.positions.push([p[0]*(mirror?-1:1),p[1],p[2]]);m.uv.push([i/(n-1),1-j/(rows.length-1)])}));for(let j=0;j<rows.length-1;j++)for(let i=0;i<n-1;i++){let k=vs+j*n+i,q=[k,k+n,k+n+1,k+1];m.polygons.push(mirror?q.reverse():q);m.faceColors.push([160,145,119]);m.materials.push(material)}m.groups.push({name:id,layer,faceStart:fs,faceCount:m.polygons.length-fs});m.slots.push({id,material,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs})}
const ring=(i)=> (i+12)%12;
function offset(p){return [p[0]*1.044,2.57+(p[1]-2.57)*1.044,p[2]*1.044]}
let scalp=[];for(let j=0;j<4;j++){let row=[];for(let i of [-3,-2,-1,0,1,2,3]){let k=ring(i),a=D.positions[40+k],b=D.positions[52+k],f=[.34,.63,.83,.85][Math.abs(i)];let p=j===0?a.map((x,k)=>x+(b[k]-x)*f):D.positions[(j===1?52:j===2?64:64)+k].slice();if(j===3){p[0]*=.12;p[2]*=.12;p[1]=2.887}row.push(offset(p))}scalp.push(row)}card("scalp-front-underlay",0,scalp,"scalp");
let rows=[
[[.004,2.874,.145],[.028,2.945,.090],[.070,2.915,-.045]],
[[.030,2.859,.305],[.082,2.985,.245],[.154,2.939,.075]],
[[.100,2.770,.365],[.192,2.948,.315],[.273,2.882,.120]],
[[.145,2.641,.390],[.273,2.805,.340],[.361,2.738,.170]],
[[.191,2.475,.370],[.301,2.619,.320],[.366,2.530,.215]],
[[.229,2.341,.325],[.278,2.385,.325],[.310,2.410,.272]],
[[.254,2.259,.288],[.258,2.263,.295],[.265,2.270,.287]]
];card("angular-front-right",3,rows,"frontR3");card("angular-front-left",3,rows.map((r,j)=>r.map(([x,y,z])=>[x*.96,y+(j===6?.035:j===0?0:-.015),z-.003])),"frontL3",true);
return m}
export function paintNew(kind){let width=256,height=256,data=new Uint8Array(width*height*4),cl=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*cl(t));for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height;let col;if(kind==="scalp"){col=mix([158,144,116],[119,104,82],.26+.22*Math.abs(u-.5)*2+.12*Math.sin(u*47+v*9));}else{let shadow=.10+.32*(u>.52?1:0)+.22*Math.exp(-Math.pow(v/.15,2));let hi=.30*Math.exp(-Math.pow((v-.25-.12*u)/.10,2));col=mix([214,201,171],[109,92,73],shadow-hi);for(let a of [.19,.38,.72,.9]){let line=a+.035*Math.sin(v*6+a*4);if(Math.abs(u-line)<.004)col=mix(col,[118,102,80],.32);if(Math.abs(u-line-.016)<.008&&v>.14&&v<.42)col=mix(col,[244,234,208],.65)}if(v>.96&&Math.abs(u-.48)>.5*(1-v)/.04)continue;}data.set([...col.map(Math.round),255],(y*width+x)*4)}return {width,height,data}}

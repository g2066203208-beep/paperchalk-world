export function revise(old,raise=0){
let m={...old,name:"Hunter 02 / Center-part lifted low ponytail",positions:[],polygons:[],uv:[],faceColors:[],materials:[],groups:[],slots:[]};
for(let s of old.slots.slice(1)){let vs=m.positions.length,fs=m.polygons.length;for(let i=s.vertexStart;i<s.vertexStart+s.vertexCount;i++){m.positions.push(old.positions[i]);m.uv.push(old.uv[i])}for(let i=s.faceStart;i<s.faceStart+s.faceCount;i++){m.polygons.push(old.polygons[i].map(x=>x-s.vertexStart+vs));m.faceColors.push(old.faceColors[i]);m.materials.push(old.materials[i])}m.slots.push({...s,vertexStart:vs,faceStart:fs});m.groups.push({...old.groups.find(g=>g.name===s.id),faceStart:fs})}
let rows=[
[[.004,2.848,.230],[.012,2.951,.148],[.006,2.925,.022]],
[[.035,2.899,.292],[.082,2.991,.212],[.125,2.941,.017]],
[[.103,2.807,.324],[.194,2.955,.267],[.251,2.894,.070]],
[[.168,2.661,.365],[.278,2.813,.293],[.346,2.755,.151]],
[[.230,2.481,.343],[.308,2.612,.297],[.360,2.536,.214]],
[[.266,2.325,.295],[.300,2.330,.310],[.327,2.385,.257]],
[[.280,2.245,.281],[.290,2.251,.289],[.304,2.277,.263]]
];
for(let s of [-1,1]){let vs=m.positions.length,fs=m.polygons.length;for(let j=0;j<rows.length;j++)for(let i=0;i<3;i++){let [x,y,z]=rows[j][i];let f=s===-1?.99:1;let length=s===-1&&j>=4?.035*(j-3):0;m.positions.push([s*x*f,y+length+(s===-1&&j<3?-.006:0),z+raise]);m.uv.push([i/2,1-j/(rows.length-1)])}for(let j=0;j<rows.length-1;j++)for(let i=0;i<2;i++){let k=vs+j*3+i,f=[k,k+3,k+4,k+1];m.polygons.push(s===-1?f.reverse():f);m.materials.push(s===1?"frontR":"frontL");m.faceColors.push([196,181,151])}let id=s===1?"lifted-front-right":"lifted-front-left";m.groups.push({name:id,layer:3,faceStart:fs,faceCount:12});m.slots.push({id,material:s===1?"frontR":"frontL",vertexStart:vs,vertexCount:21,faceStart:fs,faceCount:12})}return m}
export function paintLifted(kind){let width=256,height=256,data=new Uint8Array(width*height*4),cl=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*cl(t));for(let y=0;y<height;y++)for(let x=0;x<width;x++){let u=(x+.5)/width,v=(y+.5)/height;let edge=1-.17*Math.pow(Math.abs(u-.48)*2,1.3);if(v>edge)continue;let dark=.10+.30*Math.pow(Math.abs(u-.4)*1.6,1.8)+.11*v;dark+=.17*Math.exp(-Math.pow((v-.035)/.12,2));let highlight=.32*Math.exp(-Math.pow((v-.28-.07*u)/.10,2))*(.7+.3*Math.sin(u*Math.PI));let col=mix(kind==="frontR"?[218,205,174]:[205,191,161],[111,95,76],dark-highlight);for(let a of [.22,.62,.81]){let line=a+.028*Math.sin(v*6+a*3);if(Math.abs(u-line)<.004&&v>.08&&v<.90)col=mix(col,[105,91,74],.26);if(Math.abs(u-line-.015)<.005&&v>.18&&v<.44)col=mix(col,[246,234,208],.60)}data.set([...col.map(Math.round),255],(y*width+x)*4)}return {width,height,data}}

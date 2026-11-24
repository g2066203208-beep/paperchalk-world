export function build(old){
let m=JSON.parse(JSON.stringify(old));m.name="Hunter 02 / V6 pixel mesh";for(let k of ["positions","polygons","uv","faceColors","materials","slots","groups"])m[k]=[];
function copy(s){let vs=m.positions.length,fs=m.polygons.length;for(let i=s.vertexStart;i<s.vertexStart+s.vertexCount;i++){m.positions.push(old.positions[i]);m.uv.push(old.uv[i])}for(let i=s.faceStart;i<s.faceStart+s.faceCount;i++){m.polygons.push(old.polygons[i].map(x=>x-s.vertexStart+vs));m.materials.push(old.materials[i]);m.faceColors.push(old.faceColors[i])}end(s,vs,fs)}
function end(s,vs,fs){m.slots.push({...s,vertexStart:vs,vertexCount:m.positions.length-vs,faceStart:fs,faceCount:m.polygons.length-fs});m.groups.push({...old.groups.find(g=>g.name===s.id),faceStart:fs,faceCount:m.polygons.length-fs})}
const grid=.025,snap=x=>Math.round(x/grid)*grid;
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
for(let s of old.slots){let front=s.id.startsWith("hard-fold"),side=s.id.startsWith("temple"),tail=s.id.startsWith("low-ponytail");if(!front&&!side&&!tail){copy(s);continue}
let vs=m.positions.length,fs=m.polygons.length,n=3,N=s.vertexCount/n,rows=Array.from({length:N},(_,j)=>old.positions.slice(s.vertexStart+j*n,s.vertexStart+j*n+n));let axis=side||s.id.endsWith("profile")?2:0;
function strip(A,B,va,vb){let k=m.positions.length;m.positions.push(...A,...B);for(let i=0;i<3;i++)m.uv.push([i/2,va]);for(let i=0;i<3;i++)m.uv.push([i/2,vb]);for(let i=0;i<2;i++){let q=[k+i,k+3+i,k+4+i,k+1+i];m.polygons.push(q);m.materials.push(s.material);m.faceColors.push([185,170,143])}}
let start=front?2:side?3:1;for(let j=0;j<start;j++)strip(rows[j],rows[j+1],1-j/(N-1),1-(j+1)/(N-1));
for(let j=start;j<N-1;j++){
let a=rows[j],b=rows[j+1],steps=front?3:2;
for(let k=0;k<steps;k++){let t0=k/steps,t1=(k+1)/steps,mid=(t0+t1)/2,A=a.map((p,i)=>mix(p,b[i],t0)),B=a.map((p,i)=>mix(p,b[i],t1));let target=a.map((p,i)=>snap(mix(p,b[i],mid)[axis]));
// Parallel step sides along the length. Keep the crown and fold unchanged.
for(let i=0;i<3;i++){let minWidth=.009;if(i>0&&Math.abs(target[i]-target[i-1])<minWidth)target[i]=target[i-1]+Math.sign(a[i][axis]-a[i-1][axis]||1)*minWidth;for(let p of [A[i],B[i]])p[axis]=target[i];}
// Small step offsets are constrained to the existing front envelope. Z depth remains unchanged.
strip(A,B,1-(j+t0)/(N-1),1-(j+t1)/(N-1));
}
}end(s,vs,fs)}
return m}

export function build(D,old){
let M=JSON.parse(JSON.stringify(old));M.name="Hunter 02 / V8 pixel nape coverage";
const cap=M.slots.find(s=>s.material==="scalp"),g=M.groups.find(g=>g.name===cap.id);
const P=[],UV=[],Q=[];let off=cap.vertexStart,fs=cap.faceStart;
for(let i=0;i<cap.vertexCount;i++){P.push(M.positions[off+i]);UV.push(M.uv[off+i])}
for(let i=0;i<cap.faceCount;i++)Q.push(M.polygons[fs+i].map(k=>k-off));
const offset=p=>[p[0]*1.06,p[1],p[2]*1.06];
const add=p=>{let k=P.length;P.push(offset(p));UV.push([(p[0]+.36)/.72,Math.max(0,Math.min(1,(p[1]-2.15)/.75))]);return k};
let prev=[4,5,6,7,8];
for(let ring of [40,28,83,16]){
let row=[];for(let k=4;k<=8;k++){
let p=D.positions[ring+k].slice();

row.push(add(p))}
for(let i=0;i<4;i++)Q.push([prev[i],row[i],row[i+1],prev[i+1]]);prev=row
}
// Rear lower head ring follows the actual skull to the nape; sides stop behind the ears.
let row=[];for(let k=4;k<=8;k++){let p=D.positions[16+k],target=D.positions[4+k],f=[0,.90,.96,.98,.96,.90,0][k-3];row.push(add(p.map((x,i)=>x+(target[i]-x)*f)))}
for(let i=0;i<4;i++)Q.push([prev[i],row[i],row[i+1],prev[i+1]]);
// Replace original cap in place and reindex the unchanged later slots.
let dv=P.length-cap.vertexCount,df=Q.length-cap.faceCount;
M.positions.splice(off,cap.vertexCount,...P);M.uv.splice(off,cap.vertexCount,...UV);
M.polygons.splice(fs,cap.faceCount,...Q.map(q=>q.map(k=>k+off)));
for(let i=fs+Q.length;i<M.polygons.length;i++)M.polygons[i]=M.polygons[i].map(k=>k>=off+cap.vertexCount?k+dv:k);
M.materials.splice(fs,cap.faceCount,...Q.map(()=> "scalp"));M.faceColors.splice(fs,cap.faceCount,...Q.map(()=>[168,153,126]));
for(let s of M.slots){if(s===cap){s.vertexCount=P.length;s.faceCount=Q.length}else if(s.vertexStart>off){s.vertexStart+=dv;s.faceStart+=df}}
for(let s of M.groups){if(s===g)s.faceCount=Q.length;else if(s.faceStart>fs)s.faceStart+=df}
// Keep the crest's sharp corner, reduce excessive peak height and pull the side silhouette toward the head.
for(let s of M.slots.filter(s=>s.id.startsWith("hard-fold")||s.id.startsWith("fold-inner"))){for(let i=s.vertexStart;i<s.vertexStart+s.vertexCount;i++){let p=M.positions[i];if(p[1]>2.91)p[1]=2.91+(p[1]-2.91)*.78;}}
// Taper the combed outer sheet into the nape rather than leave a square shelf.
for(let i=30;i<35;i++){let p=M.positions[i];p[0]*=.72;p[1]-=[.018,.056,.075,.056,.018][i-30];p[2]-=.008;}
return M}

export function reviseTextures(textures){let captex=textures.scalp;for(let y=0;y<64;y++)for(let x=0;x<32;x++){let k=(y*32+x)*4;captex.data.set(y<13?[185,172,145,255]:[176,163,136,255],k);if(y>=57)textures.back.data[k+3]=255;}return textures}

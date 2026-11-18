/**
 * Thin rounded-card sidewalls + clean alpha for printed card-back artwork.
 * No ornamental border geometry: ONLY a neutral cut-paper edge is modeled.
 * These pure functions are independently testable without WebGL.
 */
export function sanitizeCardMatte(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<4||height<4||
   rgba?.length!==width*height*4)throw new Error('Invalid RGBA card texture');
 const out=new Uint8ClampedArray(rgba);
 const n=width*height,seeds=new Int32Array(n);
 seeds.fill(-1);
 let removedWhite=0,transparent=0,partial=0,padded=0;
 const ringX=Math.max(12,Math.round(width*.045));
 const ringY=Math.max(12,Math.round(height*.045));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,i=p*4;
  const a=out[i+3],r=out[i],g=out[i+1],b=out[i+2];
  const ring=x<ringX||y<ringY||x>=width-ringX||y>=height-ringY;
  const pale=Math.min(r,g,b)>130&&Math.max(r,g,b)-Math.min(r,g,b)<105;
  // Scan/photo matte can be white with alpha 1..190. In alphaTest mode
  // such pixels become FULLY OPAQUE and create bright rectangular seams.
  // Remove ONLY exterior, washed-out, partially transparent pixels.
  if(a<=16||(ring&&a<213&&pale)){
   if(a>16&&pale)removedWhite++;
   out[i+3]=0;transparent++;
  }else if(a<255){
   partial++;
  }
  if(out[i+3]>=232)seeds[p]=p;
 }
 // Exact RGB edge extension across transparent pixels: prevents white
 // hidden RGB from entering linear-filter and mipmap samples. Two passes
 // propagate the nearest opaque printed pixel, never changes source bytes.
 const sqDist=(p,q)=>{
  const dx=p%width-q%width,dy=Math.floor(p/width)-Math.floor(q/width);
  return dx*dx+dy*dy;
 };
 const choose=(p,q)=>{
  const a=seeds[p],b=seeds[q];
  if(b<0)return;
  if(a<0||sqDist(p,b)<sqDist(p,a))seeds[p]=b;
 };
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x;
  if(x>0)choose(p,p-1);
  if(y>0)choose(p,p-width);
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const p=y*width+x;
  if(x<width-1)choose(p,p+1);
  if(y<height-1)choose(p,p+width);
 }
 for(let p=0;p<n;p++){
  const i=p*4,source=seeds[p];
  if(source<0||out[i+3]>=232)continue;
  const k=source*4;
  out[i]=rgba[k];out[i+1]=rgba[k+1];out[i+2]=rgba[k+2];
  padded++;
 }
 return {pixels:out,stats:{removedWhite,transparent,partial,padded,width,height}};
}
export function roundedPaperEdgeGeometry({
 width=1.68,height=2.53,thickness=.042,radius=.075,segments=10
}={}){
 if(!(width>0&&height>0&&thickness>0&&radius>0)||
  radius>=Math.min(width,height)/2||!Number.isInteger(segments)||segments<2||segments>64)
  throw new Error('Invalid card edge geometry dimensions');
 const corners=[
  [width/2-radius,height/2-radius,0],
  [-width/2+radius,height/2-radius,90],
  [-width/2+radius,-height/2+radius,180],
  [width/2-radius,-height/2+radius,270]
 ];
 const points=[];
 for(const [cx,cy,start] of corners){
  for(let i=0;i<=segments;i++){
   const angle=(start+i*90/segments)*Math.PI/180;
   points.push({
    x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle),
    nx:Math.cos(angle),ny:Math.sin(angle)
   });
  }
 }
 const count=points.length,ringCount=count+1,
  positions=new Float32Array(ringCount*6),
  normals=new Float32Array(ringCount*6),uvs=new Float32Array(ringCount*4),
  indices=new Uint16Array(count*6);
 const distance=new Float32Array(count+1);
 for(let i=1;i<=count;i++){
  const a=points[i-1],b=points[i%count];
  distance[i]=distance[i-1]+Math.hypot(b.x-a.x,b.y-a.y);
 }
 // Every side quad has outward normals, up/down thickness, and continuous
 // UVs for genuine compressed cardstock fibers. No top/bottom/metal caps.
 for(let i=0;i<=count;i++){
  const p=points[i%count],v=i*6,t=i*4,u=distance[i]/distance[count];
  positions.set([p.x,p.y,thickness/2,p.x,p.y,-thickness/2],v);
  normals.set([p.nx,p.ny,0,p.nx,p.ny,0],v);
  uvs.set([u,0,u,1],t);
  if(i<count){
   const a=i*2,b=(i+1)*2;
   indices.set([a,a+1,b,a+1,b+1,b],i*6);
  }
 }
 return {positions,normals,uvs,indices,thickness,radius,
  vertexCount:ringCount*2,triangleCount:count*2};
}

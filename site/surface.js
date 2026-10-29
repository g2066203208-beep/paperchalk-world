/**
 * Anatomical envelope as an implicit level set:
 *
 *   phi(P) = smoothMin_i [ distance(P, segment_i) - radius_i(t) ]
 *   boundary = { P | phi(P) = 0 }.
 *
 * No generated bitmap and no imported sprite. Every bone pose changes the field.
 * Smooth polynomial union removes hard seams between linked limb capsules.
 * Marching squares extracts continuous closed vector outlines with saddle
 * disambiguation at each cell center.
 */
const min=(a,b)=>a<b?a:b;
const max=(a,b)=>a>b?a:b;
export const clamp01=x=>max(0,min(1,x));

const GROUP_FAT={core:2.55,spine:2.17,head:1.77,leg:1.58,arm:1.56,tail:1.35};
const cap=(node,thickness)=>{
 const f=GROUP_FAT[node.group]??2;
 return max(1.6,node.radius*f*thickness);
};
/** Variable radius capsule SDF; length-interpolated radius makes limbs taper. */
export function capsuleDistance(x,y,part){
 const {ax,ay,bx,by,ra,rb}=part;
 const dx=bx-ax,dy=by-ay;
 const t=clamp01(((x-ax)*dx+(y-ay)*dy)/max(1e-8,dx*dx+dy*dy));
 return Math.hypot(x-ax-t*dx,y-ay-t*dy)-(ra+(rb-ra)*t);
}
/** Polynomial C1 smooth minimum, exactly min(a,b) when |a-b|>=k. */
export function smoothMin(a,b,k){
 if(k<=1e-8)return min(a,b);
 const h=max(k-Math.abs(a-b),0)/k;
 return min(a,b)-h*h*k*.25;
}
export function envelopeParts(rig,pose,thickness=1){
 const widths=new Map(rig.bones.map(b=>[b.id,cap(b,thickness)]));
 const parts=[];
 for(const b of rig.bones){
  const q=pose.get(b.id);
  if(!q)throw Error('missing pose point '+b.id);
  if(!b.parent){
   const r=widths.get(b.id);
   parts.push({bone:b.id,ax:q.x,ay:q.y,bx:q.x,by:q.y,ra:r,rb:r});
   continue;
  }
  const par=pose.get(b.parent);
  const parentWidth=widths.get(b.parent);
  const width=widths.get(b.id);
  const isLimb=b.group==='leg'||b.group==='arm';
  // Keep limb roots thinner than thorax but connected to it smoothly.
  const rootWidth=isLimb?min(parentWidth,width*1.65):parentWidth;
  parts.push({bone:b.id,ax:par.x,ay:par.y,bx:q.x,by:q.y,ra:rootWidth,rb:width});
 }
 return parts;
}
export function sampleEnvelope(x,y,parts,blend=9){
 let v=Infinity;
 // Spatially skip capsules that cannot possibly contribute to the minimum.
 for(const part of parts){
  const margin=max(part.ra,part.rb)+blend+5;
  if(x<min(part.ax,part.bx)-margin || x>max(part.ax,part.bx)+margin ||
     y<min(part.ay,part.by)-margin || y>max(part.ay,part.by)+margin)continue;
  const d=capsuleDistance(x,y,part);
  v=Number.isFinite(v)?smoothMin(v,d,blend):d;
 }
 return v;
}
export function envelopeExtent(parts,blend=9){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of parts){
  const margin=max(p.ra,p.rb)+blend+2;
  minX=min(minX,min(p.ax,p.bx)-margin);
  maxX=max(maxX,max(p.ax,p.bx)+margin);
  minY=min(minY,min(p.ay,p.by)-margin);
  maxY=max(maxY,max(p.ay,p.by)+margin);
 }
 return {minX,minY,maxX,maxY};
}
function pointKey(edge,x,y){
 // Shared grid edges are assigned identical keys from both neighboring cells.
 return edge===0?'h:'+x+':'+y:edge===1?'v:'+(x+1)+':'+y:
        edge===2?'h:'+x+':'+(y+1):'v:'+x+':'+y;
}
function edgeCross(edge,x,y,values,start,step){
 const [tl,tr,br,bl]=values;
 let p,q,v0,v1;
 if(edge===0){p=[x,y];q=[x+1,y];v0=tl;v1=tr;}
 else if(edge===1){p=[x+1,y];q=[x+1,y+1];v0=tr;v1=br;}
 else if(edge===2){p=[x,y+1];q=[x+1,y+1];v0=bl;v1=br;}
 else{p=[x,y];q=[x,y+1];v0=tl;v1=bl;}
 const t=clamp01(v0/(v0-v1));
 return {key:pointKey(edge,x,y),
  x:start.x+(p[0]+(q[0]-p[0])*t)*step,
  y:start.y+(p[1]+(q[1]-p[1])*t)*step};
}
export function marchingContours(samples,nx,ny,start,step){
 // corners indexed TL TR BR BL; inside = negative field.
 const links=[],nodes=new Map();
 const at=(x,y)=>samples[y*nx+x];
 function link(a,b){const id=links.length;links.push([a.key,b.key]);
  nodes.set(a.key,a);nodes.set(b.key,b);
 }
 for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const vals=[at(x,y),at(x+1,y),at(x+1,y+1),at(x,y+1)];
  const inside=vals.map(v=>v<0);
  const count=inside.filter(Boolean).length;
  if(!count||count===4)continue;
  const crossing=[];
  for(let edge=0;edge<4;edge++){
   if(inside[edge]!==inside[(edge+1)%4]){
    crossing.push(edgeCross(edge,x,y,vals,start,step));
   }
  }
  if(crossing.length===2){link(crossing[0],crossing[1]);continue;}
  if(crossing.length!==4)throw Error('Invalid saddle');
  const center=(vals[0]+vals[1]+vals[2]+vals[3])*.25;
  // Around the corners opposite in sign to the central bilinear sample.
  const isolated=inside.map((v,i)=>v===(center>=0)?i:-1).filter(i=>i!==-1);
  const endpoints=new Map(crossing.map(c=>[c.key,c]));
  for(const corner of isolated){
   const edgeA=(corner+3)%4,edgeB=corner;
   link(endpoints.get(pointKey(edgeA,x,y)),endpoints.get(pointKey(edgeB,x,y)));
  }
 }
 const adjacency=new Map();
 links.forEach(([a,b],i)=>{
  if(!adjacency.has(a))adjacency.set(a,[]);
  if(!adjacency.has(b))adjacency.set(b,[]);
  adjacency.get(a).push({to:b,id:i});
  adjacency.get(b).push({to:a,id:i});
 });
 const visited=new Uint8Array(links.length),polygons=[];
 for(let i=0;i<links.length;i++){
  if(visited[i])continue;
  let [startKey,next]=links[i];visited[i]=1;
  const path=[nodes.get(startKey)],first=startKey;
  let closed=false,guard=0;
  while(guard++<=links.length+1){
   const pt=nodes.get(next);path.push(pt);
   if(next===first){closed=true;break;}
   const other=adjacency.get(next)?.find(c=>!visited[c.id]);
   if(!other)break;
   visited[other.id]=1;next=other.to;
  }
  if(path.length>=3)polygons.push({points:path,closed});
 }
 return polygons;
}
/**
 * Samples the envelope on a world-space lattice, then extracts actual paths.
 * Step in world units; higher quality uses 2.3 units instead of 3.5.
 */
export function buildEnvelope(rig,pose,{thickness=1,blend=9,step=3.25}={}){
 const parts=envelopeParts(rig,pose,thickness);
 const extent=envelopeExtent(parts,blend);
 const origin={x:Math.floor(extent.minX/step)*step,y:Math.floor(extent.minY/step)*step};
 const nx=Math.ceil((extent.maxX-origin.x)/step)+2;
 const ny=Math.ceil((extent.maxY-origin.y)/step)+2;
 if(nx*ny>45000)throw Error('Envelope grid exceeds 45000 samples');
 const field=new Float32Array(nx*ny);
 let inside=0;
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const d=sampleEnvelope(origin.x+x*step,origin.y+y*step,parts,blend);
  field[y*nx+x]=d;
  if(d<0)inside++;
 }
 const contours=marchingContours(field,nx,ny,origin,step);
 return {parts,extent,field,nx,ny,step,origin,contours,inside,blend,thickness};
}
export function pathsToSVG(envelope,color='#a5cdb6'){
 const paths=envelope.contours.filter(p=>p.closed).map(c=>
  'M'+c.points.map(pt=>pt.x.toFixed(2)+','+pt.y.toFixed(2)).join(' L')+' Z').join(' ');
 return '<path d="'+paths+'" fill="'+color+'" fill-rule="evenodd" stroke="#d0e2d0" stroke-width="1.4" stroke-linejoin="round"/>';
}

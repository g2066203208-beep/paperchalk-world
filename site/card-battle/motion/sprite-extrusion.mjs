/**
 * Single image -> true 3D thin cutout.
 * No prebuilt circle mesh and no authored side texture are required.
 * The image alpha mask becomes closed planar contours, extruded into a
 * watertight front/back + black side-wall THREE.ExtrudeGeometry mesh.
 * Front and back use the same uploaded image; black ink edge is procedural.
 *
 * Original implementation for Paperchalk. Compatible with the vendored THREE.
 */
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const key=(x,y)=>`${x},${y}`;
const signedArea=poly=>poly.reduce((area,p,i)=>{const q=poly[(i+1)%poly.length];return area+p[0]*q[1]-q[0]*p[1];},0)*.5;

function lineDistanceSq(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],dd=dx*dx+dy*dy;
 if(dd<1e-12)return (p[0]-a[0])**2+(p[1]-a[1])**2;
 const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/dd,0,1);
 return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;
}
function rdpOpen(p,toleranceSq){
 if(p.length<=2)return p.slice();
 let far=0,k=-1;
 for(let i=1;i<p.length-1;i++){
  const d=lineDistanceSq(p[i],p[0],p[p.length-1]);
  if(d>far){far=d;k=i;}
 }
 if(k<0||far<=toleranceSq)return [p[0],p[p.length-1]];
 return [...rdpOpen(p.slice(0,k+1),toleranceSq).slice(0,-1),...rdpOpen(p.slice(k),toleranceSq)];
}
function simplifyClosed(points,tolerance){
 if(points.length<=5)return points;
 let far=1,dmax=0;
 for(let i=1;i<points.length;i++){
  const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;
  if(d>dmax){dmax=d;far=i;}
 }
 if(far===points.length-1)far=Math.floor(points.length/2);
 const first=rdpOpen(points.slice(0,far+1),tolerance*tolerance);
 const second=rdpOpen([...points.slice(far),points[0]],tolerance*tolerance);
 const ans=[...first.slice(0,-1),...second.slice(0,-1)];
 return ans.length>=3?ans:points;
}
function pointInPolygon(p,poly){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}

/** Returns independent solid contours and enclosed holes in pixel coordinates.
 * Pixel rows run downward. Outer loops have positive signedArea;
 * transparent holes have negative signedArea. Handles disjoint opaque regions.
 */
export function traceAlphaContours(alpha,width,height,threshold=128,{simplify=.58,minArea=2}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||alpha.length<width*height){throw new TypeError('Invalid alpha mask');}
 const inside=(x,y)=>x>=0&&x<width&&y>=0&&y<height&&alpha[y*width+x]>=threshold;
 const edges=[],starts=new Map();
 function edge(x,y,nx,ny,dir){
  const id=edges.length;
  edges.push({x,y,nx,ny,dir,used:false});
  const k=key(x,y);
  if(!starts.has(k))starts.set(k,[]);
  starts.get(k).push(id);
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(!inside(x,y))continue;
  if(!inside(x,y-1))edge(x,y,x+1,y,0); // upper boundary points east
  if(!inside(x+1,y))edge(x+1,y,x+1,y+1,1);
  if(!inside(x,y+1))edge(x+1,y+1,x,y+1,2);
  if(!inside(x-1,y))edge(x,y+1,x,y,3);
 }
 const loops=[];
 for(let i=0;i<edges.length;i++){
  if(edges[i].used)continue;
  const points=[],start=key(edges[i].x,edges[i].y);
  let current=i,closed=false;
  for(let safety=0;safety<=edges.length;safety++){
   const e=edges[current];if(e.used)break;
   e.used=true;points.push([e.x,e.y]);
   const end=key(e.nx,e.ny);
   if(end===start){closed=true;break;}
   const candidates=(starts.get(end)||[]).filter(j=>!edges[j].used);
   if(!candidates.length)break;
   // Turning right at a diagonal shared vertex keeps independent islands apart.
   const preference=[1,0,3,2];
   candidates.sort((a,b)=>preference.indexOf((edges[a].dir-e.dir+4)%4)-preference.indexOf((edges[b].dir-e.dir+4)%4));
   current=candidates[0];
  }
  if(!closed||points.length<3)continue;
  const short=simplifyClosed(points,simplify);
  if(Math.abs(signedArea(short))>=minArea)loops.push(short);
 }
 const solids=loops.filter(p=>signedArea(p)>0).map(outer=>({outer,holes:[],area:signedArea(outer)}));
 for(const hole of loops.filter(p=>signedArea(p)<0)){
  const parent=solids.filter(s=>pointInPolygon(hole[0],s.outer)).sort((a,b)=>a.area-b.area)[0];
  if(parent)parent.holes.push(hole);
 }
 return {solids,edges:edges.length,loops:loops.length};
}

/** In-memory alpha array -> normalized contour geometry; unit size is the
 * maximum opaque dimension, not the image canvas's transparent padding.
 */
export function analyzeAlphaMask(alpha,width,height,{
 threshold=128,size=2.6,simplify=.65,minArea=2
}={}){
 const raw=traceAlphaContours(alpha,width,height,threshold,{simplify,minArea});
 let minX=width,minY=height,maxX=-1,maxY=-1,opaque=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[y*width+x]>=threshold){
  opaque++;minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x+1);maxY=Math.max(maxY,y+1);
 }
 if(!opaque||!raw.solids.length)throw new Error('素材没有可挤出的主体轮廓；请使用清晰的金币图案或透明 PNG。');
 const bbox={minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
 const scale=size/Math.max(bbox.width,bbox.height),centerX=(bbox.minX+bbox.maxX)/2,centerY=(bbox.minY+bbox.maxY)/2;
 const project=p=>[(p[0]-centerX)*scale,(centerY-p[1])*scale];
 const shapes=raw.solids.map(s=>({outer:s.outer.map(project),holes:s.holes.map(h=>h.map(project))}));
 return {shapes,bbox,scale,size,width,height,opaquePixels:opaque,edges:raw.edges,loops:raw.loops,
  plane:{width:width*scale,height:height*scale,x:(width/2-centerX)*scale,y:(centerY-height/2)*scale}};
}

/** Prepare a single uploaded PNG/SVG/JPEG to act as one both-side face texture.
 * A transparent PNG is kept as-is. For an opaque image on a uniform background
 * (e.g. white), only the border-connected region matching the corners is
 * cleared. This does not erase white features enclosed by a black outline.
 */
export function prepareImageCanvas(image,{maxTextureSize=1024,autoRemoveBackground=true,backgroundTolerance=34}={}){
 if(typeof document==='undefined')throw new Error('Canvas APIs are required to load a browser image');
 const naturalWidth=image.naturalWidth||image.videoWidth||image.width;
 const naturalHeight=image.naturalHeight||image.videoHeight||image.height;
 if(!naturalWidth||!naturalHeight)throw new Error('素材未加载或尺寸无效');
 const ratio=Math.min(1,maxTextureSize/Math.max(naturalWidth,naturalHeight));
 const width=Math.max(1,Math.round(naturalWidth*ratio)),height=Math.max(1,Math.round(naturalHeight*ratio));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const g=canvas.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 g.clearRect(0,0,width,height);g.drawImage(image,0,0,width,height);
 const pixels=g.getImageData(0,0,width,height),data=pixels.data;
 let alreadyTransparent=false;
 for(let i=3;i<data.length;i+=4)if(data[i]<220){alreadyTransparent=true;break;}
 let removedBackground=false;
 if(autoRemoveBackground&&!alreadyTransparent&&width>=8&&height>=8){
  const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]];
  const colors=corners.map(([x,y])=>{const j=(y*width+x)*4;return [data[j],data[j+1],data[j+2]];});
  const range=Math.max(...[0,1,2].map(c=>Math.max(...colors.map(rgb=>rgb[c]))-Math.min(...colors.map(rgb=>rgb[c]))));
  if(range<backgroundTolerance*1.25){
   const target=colors[0];const count=width*height,visited=new Uint8Array(count),queue=new Int32Array(count);
   let head=0,tail=0;
   const add=p=>{
    if(visited[p])return;
    visited[p]=1;const o=p*4;
    if(Math.max(Math.abs(data[o]-target[0]),Math.abs(data[o+1]-target[1]),Math.abs(data[o+2]-target[2]))<=backgroundTolerance)queue[tail++]=p;
   };
   for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
   for(let y=1;y<height-1;y++){add(y*width);add(y*width+width-1);}
   while(head<tail){const p=queue[head++],x=p%width,y=(p/width)|0;
    data[p*4+3]=0;
    if(x>0)add(p-1);if(x+1<width)add(p+1);
    if(y>0)add(p-width);if(y+1<height)add(p+width);
   }
   removedBackground=tail>width*2+height*2;
  }
 }
 g.putImageData(pixels,0,0);
 return {canvas,removedBackground,width,height};
}

/** Fully reusable profile; the expensive outline extraction is done once.
 * Use buildExtrudedSprite3D(profile,THREE,{thickness}) to rebuild thickness.
 */
export function prepareExtrudedSprite(image,{
 size=2.6,alphaThreshold=110,outlineResolution=256,
 autoRemoveBackground=true,backgroundTolerance=34,simplify=.65
}={}){
 const prepared=prepareImageCanvas(image,{autoRemoveBackground,backgroundTolerance});
 const canvas=document.createElement('canvas');
 const factor=Math.min(1,outlineResolution/Math.max(prepared.width,prepared.height));
 canvas.width=Math.max(2,Math.round(prepared.width*factor));
 canvas.height=Math.max(2,Math.round(prepared.height*factor));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(prepared.canvas,0,0,canvas.width,canvas.height);
 const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const alpha=new Uint8Array(canvas.width*canvas.height);
 for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
 const mask=analyzeAlphaMask(alpha,canvas.width,canvas.height,{threshold:alphaThreshold,size,simplify});
 return {...mask,canvas:prepared.canvas,removedBackground:prepared.removedBackground};
}

/** Build *actual* THREE.ExtrudeGeometry with the silhouette and hole edges;
 * two texture planes reuse ONE original image. Mesh is centered on its thickness.
 */
export function buildExtrudedSprite3D(profile,THREE,{
 thickness=.085,edgeColor=0x101014,outlineScale=1.016,
 alphaTest=.10,flipBack=false
}={}){
 if(!THREE?.ExtrudeGeometry||!THREE?.Shape||!THREE?.CanvasTexture)throw new TypeError('THREE instance with ExtrudeGeometry is required');
 const depth=clamp(Number(thickness)||.085,.012,.45);
 const shapes=profile.shapes.map(s=>{
  const loop=s.outer.map(([x,y])=>new THREE.Vector2(x*outlineScale,y*outlineScale));
  const shape=new THREE.Shape(loop);
  for(const hole of s.holes){const hp=new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x*outlineScale,y*outlineScale)));shape.holes.push(hp);}
  return shape;
 });
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth,steps:1,bevelEnabled:false,curveSegments:1});
 geometry.computeVertexNormals();
 const edgeMaterial=new THREE.MeshBasicMaterial({color:edgeColor,side:THREE.DoubleSide,depthWrite:true,toneMapped:false});
 const edgeMesh=new THREE.Mesh(geometry,edgeMaterial);
 edgeMesh.name='actual-extruded-contour-and-black-edge';edgeMesh.position.z=-depth/2;
 const texture=new THREE.CanvasTexture(profile.canvas);texture.colorSpace=THREE.SRGBColorSpace;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 texture.generateMipmaps=true;texture.anisotropy=4;
 const faceMaterial=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest,depthWrite:true,side:THREE.DoubleSide,toneMapped:false});
 const planeGeometry=new THREE.PlaneGeometry(profile.plane.width,profile.plane.height);
 const front=new THREE.Mesh(planeGeometry,faceMaterial);
 front.name='original-source-image-front';front.position.set(profile.plane.x,profile.plane.y,depth/2+.001);
 const back=new THREE.Mesh(planeGeometry,faceMaterial);
 back.name='original-source-image-back';back.position.set(profile.plane.x,profile.plane.y,-depth/2-.001);
 if(flipBack)back.rotation.y=Math.PI;
 const group=new THREE.Group();group.name='procedural-one-image-cutout-3D';
 group.add(edgeMesh,front,back);
 group.userData={paperCut3D:true,thickness:depth,diameter:profile.size,
  outlines:profile.shapes.length,holes:profile.shapes.reduce((n,s)=>n+s.holes.length,0),
  tracedEdges:profile.edges,removedBackground:profile.removedBackground};
 group.dispose=()=>{geometry.dispose();planeGeometry.dispose();edgeMaterial.dispose();faceMaterial.dispose();texture.dispose();};
 return group;
}
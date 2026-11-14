/* Paperchalk World — reusable procedural voxel terrain engine.
 * One coordinate system for terrain cells, card slots, placement tests and rendering.
 * Independent terrain data/palette/topology; WebGL is an optional adapter.
 * No DOM dependencies except an optional Canvas2D texture factory in the renderer.
 * Works with the existing single-file WebGL battle and future map editors.
 */
(function(root){
'use strict';
const MATERIALS=Object.freeze({
 grass:Object.freeze({name:'grass',light:[.604,.739,.418,1],dark:[.534,.661,.371,1],variance:.017,side:[.595,.414,.277,1],edge:[.479,.633,.349,1],height:0}),
 dirt:Object.freeze({name:'dirt',light:[.62,.454,.318,1],dark:[.566,.408,.285,1],variance:.015,side:[.50,.341,.235,1],edge:[.622,.458,.323,1],height:0}),
 water:Object.freeze({name:'water',light:[.449,.679,.800,1],dark:[.420,.650,.769,1],variance:.010,side:[.32,.506,.60,1],edge:[.46,.68,.77,1],height:-.2})
});
function hash(c,r,seed=618231){
 let n=Math.imul(c+41,374761393)+Math.imul(r+29,668265263)+seed;
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
}
const constrain=(value,min,max)=>Math.max(min,Math.min(max,value));
function create(options={}){
 const cols=options.cols??16,rows=options.rows??6;
 const tileW=options.tileW??1.85,tileD=options.tileD??2.65;
 const centerX=options.centerX??.925,centerZ=options.centerZ??-1.1;
 const topY=options.topY??-.117,thickness=options.thickness??.66;
 const seed=options.seed??618231,materials={...MATERIALS,...(options.materials||{})};
 const minLevel=options.minLevel??-3,maxLevel=options.maxLevel??3,levelStep=options.levelStep??.67;
 if(!Number.isInteger(minLevel)||!Number.isInteger(maxLevel)||minLevel>=maxLevel||levelStep<=0)throw Error('Invalid terrain level range');
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>80||rows>80)throw Error('Invalid voxel grid size');
 if(tileW<=0||tileD<=0||thickness<=0)throw Error('Invalid voxel dimensions');
 const minX=centerX-cols*tileW/2,minZ=centerZ-rows*tileD/2;
 const width=cols*tileW,depth=rows*tileD;
 const initial=options.initialKind||'grass';
 if(!materials[initial])throw Error('Unknown starting material: '+initial);
 const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>({
  c,r,kind:initial,level:0,height:topY+(materials[initial].height||0)
 })));
 let revision=0;
 function inside(c,r){return Number.isInteger(c)&&Number.isInteger(r)&&c>=0&&r>=0&&c<cols&&r<rows;}
 function cell(c,r){return inside(c,r)?cells[r][c]:null;}
 function center(c,r){if(!inside(c,r))throw Error('Grid coordinate outside terrain');return{x:minX+(c+.5)*tileW,z:minZ+(r+.5)*tileD};}
 function atWorld(x,z){const c=Math.floor((x-minX)/tileW),r=Math.floor((z-minZ)/tileD);return cell(c,r);}
 function color(c,r){
  const t=cell(c,r);if(!t)return null;
  const material=materials[t.kind];if(!material)throw Error('Unknown terrain material: '+t.kind);
  const base=material[(c+r)%2===0?'light':'dark'];
  // Alternate value first, then low-amplitude deterministic natural variation.
  const jitter=((hash(c,r,seed)%1009)/1008-.5)*2*material.variance;
  return base.map((v,i)=>i<3?constrain(v+jitter,0,1):1);
 }
 function neighbors(c,r){
  const a=cell(c,r);if(!a)return null;
  return Object.fromEntries([
   ['north',[c,r-1]],['south',[c,r+1]],['west',[c-1,r]],['east',[c+1,r]]
  ].map(([dir,[x,y]])=>{
   const other=cell(x,y);
   return [dir, {outside:!other,connected:!!other&&other.kind===a.kind&&other.height===a.height,
    materialChange:!!other&&other.kind!==a.kind,heightChange:!!other&&other.height!==a.height}];
  }));
 }
 function set(c,r,kind){
  const target=cell(c,r);if(!target)throw Error('Grid coordinate outside terrain');
  if(!materials[kind])throw Error('Unknown terrain material: '+kind);
  target.kind=kind;
  target.height=topY+target.level*levelStep+(materials[kind].height||0);
  revision++;
  return target;
 }
 function reset(kind='grass'){
  if(!materials[kind])throw Error('Unknown terrain material');
  for(const row of cells)for(const t of row){t.kind=kind;t.level=0;t.height=topY+(materials[kind].height||0);}
  revision++;
 }
 function canAdjust(c,r,delta){
  const t=cell(c,r);
  return !!t&&Number.isInteger(delta)&&(delta===1||delta===-1)&&t.level+delta>=minLevel&&t.level+delta<=maxLevel;
 }
 function adjust(c,r,delta){
  if(!canAdjust(c,r,delta))return null;
  const t=cell(c,r);
  t.level+=delta;
  t.height=topY+t.level*levelStep+(materials[t.kind].height||0);
  revision++;
  return t;
 }
 const dig=(c,r)=>adjust(c,r,-1);
 const place=(c,r)=>adjust(c,r,1);
 function setLevel(c,r,level){
  if(!Number.isInteger(level)||level<minLevel||level>maxLevel||!inside(c,r))return null;
  const t=cell(c,r);t.level=level;
  t.height=topY+t.level*levelStep+(materials[t.kind].height||0);
  revision++;return t;
 }
 function snapshot(){return cells.flat().map(t=>({...t,...center(t.c,t.r),color:color(t.c,t.r)}));}
 // Build a continuous exterior shell and independently colored, exactly adjoining tile surfaces.
 return Object.freeze({cols,rows,tileW,tileD,centerX,centerZ,minX,minZ,width,depth,topY,thickness,seed,
  minLevel,maxLevel,levelStep,materials,cells,inside,cell,center,atWorld,color,neighbors,set,reset,snapshot,
  adjust,dig,place,setLevel,canAdjust,get revision(){return revision;},hash:(c,r)=>hash(c,r,seed)});
}
function makeRing(grid,w,d,r,y,steps=10){
 const corners=[[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],
  [-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]],ring=[];
 for(const [ox,oz,angle] of corners)
  for(let i=0;i<=steps;i++){const a=angle+i*Math.PI/(2*steps);ring.push([grid.centerX+ox+Math.cos(a)*r,y,grid.centerZ+oz+Math.sin(a)*r]);}
 return ring;
}
function ringBand(grid,makeGeom,upper,lower,bevel=false){
 const verts=[],indices=[],n=upper.length;
 for(let i=0;i<n;i++)for(const [p,isUpper] of [[upper[i],true],[lower[i],false]]){
  const ox=(p[0]-grid.centerX)/(grid.width/2),oz=(p[2]-grid.centerZ)/(grid.depth/2);
  const size=Math.hypot(ox,oz)||1,fac=bevel?(isUpper?.13:.52):1;
  const nn=bevel?[ox/size*fac,isUpper?1:.85,oz/size*fac]:[ox/size,0,oz/size];
  const mag=Math.hypot(...nn);
  verts.push(...p,nn[0]/mag,nn[1]/mag,nn[2]/mag,(p[0]-grid.minX)/grid.width,(p[2]-grid.minZ)/grid.depth);
 }
 for(let i=0;i<n;i++){const j=(i+1)%n,k=i*2,t=j*2;indices.push(k,t,k+1,t,t+1,k+1);}
 return makeGeom(verts,indices);
}

/*
 * Soft-voxel geometry 3.0
 *
 * The tile's gameplay footprint stays a full, precise rectangle.
 * Only an EXPOSED cliff edge receives a radius. Neighbouring equal-level
 * blocks share a straight, gap-free top edge.
 *
 * The perimeter rounds convex horizontal corners (quarter circles), while
 * the top-to-wall silhouette follows a quarter-circle cross-section.
 * A rounded corner is generated only when TWO sides are exposed.
 */
// A square block keeps its FULL precise footprint. Round only the exposed
// TOP edge by 6% of one cube's side; never trim the X/Z corner to leave cracks.
const CUBE_TOP_BEVEL=.06;
const SOFT_STOPS=[0,.008,.020,.035,.06,.15,.50,.85,.94,.965,.98,.992,1];
function tileSoftMesh(grid,makeGeom,c,r){
 const t=grid.cell(c,r), {x,z}=grid.center(c,r),verts=[],tri=[];
 const x0=x-grid.tileW/2,z0=z-grid.tileD/2;
 const north=grid.cell(c,r-1),south=grid.cell(c,r+1);
 const east=grid.cell(c+1,r),west=grid.cell(c-1,r);
 const exposed={
  north:!north||north.height<t.height-.0001,
  south:!south||south.height<t.height-.0001,
  east:!east||east.height<t.height-.0001,
  west:!west||west.height<t.height-.0001
 };
 const bevel=CUBE_TOP_BEVEL*grid.levelStep,eps=.008;
 const fall=(dist)=>{
  const radius=CUBE_TOP_BEVEL,part=constrain(dist/radius,0,1);
  const q=1-part;
  return bevel*(1-Math.sqrt(Math.max(0,1-q*q)));
 };
 function top(u,v){
  return t.height-Math.max(
   exposed.west?fall(u):0,exposed.east?fall(1-u):0,
   exposed.north?fall(v):0,exposed.south?fall(1-v):0
  );
 }
 const n=SOFT_STOPS.length;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const u=SOFT_STOPS[i],v=SOFT_STOPS[j];
  const px=x0+u*grid.tileW,pz=z0+v*grid.tileD,y=top(u,v);
  const dx=(top(Math.min(1,u+eps),v)-top(Math.max(0,u-eps),v))/(2*eps*grid.tileW);
  const dz=(top(u,Math.min(1,v+eps))-top(u,Math.max(0,v-eps)))/(2*eps*grid.tileD);
  const len=Math.hypot(dx,1,dz);
  verts.push(px,y,pz,-dx/len,1/len,-dz/len,
   (px-grid.minX)/grid.width,(pz-grid.minZ)/grid.depth);
 }
 for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){
  const a=j*n+i,b=a+1,cc=a+n,d=cc+1;
  tri.push(a,cc,b,b,cc,d);
 }
 return makeGeom(verts,tri);
}
function roundedCliffMesh(grid,makeGeom,c,r,dir,lower){
 const tile=grid.cell(c,r);
 const step=grid.levelStep;
 const {x,z}=grid.center(c,r);
 const x0=x-grid.tileW/2,x1=x+grid.tileW/2,z0=z-grid.tileD/2,z1=z+grid.tileD/2;
 const upper=tile.height-CUBE_TOP_BEVEL*step;
 let from,to,n;
 switch(dir){
  case 'north': from=[x0,z0];to=[x1,z0];n=[0,0,-1];break;
  case 'south': from=[x1,z1];to=[x0,z1];n=[0,0,1];break;
  case 'east': from=[x1,z0];to=[x1,z1];n=[1,0,0];break;
  default: from=[x0,z1];to=[x0,z0];n=[-1,0,0];
 }
 const verts=[],idx=[];
 const count=Math.max(1,Math.ceil((upper-lower)/step));
 for(let k=0;k<count;k++){
  const topY=k===0?upper:Math.max(lower,tile.height-k*step);
  const bottomY=k===count-1?lower:Math.max(lower,tile.height-(k+1)*step);
  if(topY<=bottomY+.00001)continue;
  const a=verts.length/8;
  for(const [px,py,pz] of [
   [from[0],topY,from[1]],[to[0],topY,to[1]],
   [to[0],bottomY,to[1]],[from[0],bottomY,from[1]]]){
   verts.push(px,py,pz,...n,px*.075,py*.20);
  }
  idx.push(a,a+1,a+2,a,a+2,a+3);
 }
 return idx.length?makeGeom(verts,idx):null;
}
function seamMesh(grid,makeGeom){
 // All seams are derived from adjoining cell heights; nothing floats above recessed water.
 const verts=[],idx=[],stroke=Math.min(grid.tileW,grid.tileD)*.007;
 function quad(x0,z0,x1,z1,y){
  const k=verts.length/8;
  for(const [x,z] of [[x0,z1],[x1,z1],[x1,z0],[x0,z0]])verts.push(x,y,z,0,1,0,0,0);
  idx.push(k,k+1,k+2,k,k+2,k+3);
 }
 for(let c=1;c<grid.cols;c++)for(let r=0;r<grid.rows;r++){
  const a=grid.cell(c-1,r),b=grid.cell(c,r);
  if(Math.abs(a.height-b.height)>.0001)continue;
  const x=grid.minX+c*grid.tileW,z0=grid.minZ+r*grid.tileD;
  quad(x-stroke/2,z0,x+stroke/2,z0+grid.tileD,a.height+.004);
 }
 for(let r=1;r<grid.rows;r++)for(let c=0;c<grid.cols;c++){
  const a=grid.cell(c,r-1),b=grid.cell(c,r);
  if(Math.abs(a.height-b.height)>.0001)continue;
  const z=grid.minZ+r*grid.tileD,x0=grid.minX+c*grid.tileW;
  quad(x0,z-stroke/2,x0+grid.tileW,z+stroke/2,a.height+.004);
 }
 return makeGeom(verts,idx);
}
function wallMesh(grid,makeGeom,c,r,direction,lower){
 const t=grid.cell(c,r),x=grid.minX+c*grid.tileW,z=grid.minZ+r*grid.tileD;
 const bevel=Math.min(.105,grid.levelStep*.15);
 const upper=t.height-bevel;
 let a,b,n;
 switch(direction){
 case 'north':a=[x,z];b=[x+grid.tileW,z];n=[0,0,-1];break;
 case 'south':a=[x+grid.tileW,z+grid.tileD];b=[x,z+grid.tileD];n=[0,0,1];break;
 case 'east':a=[x+grid.tileW,z];b=[x+grid.tileW,z+grid.tileD];n=[1,0,0];break;
 default:a=[x,z+grid.tileD];b=[x,z];n=[-1,0,0];break;
 }
 const verts=[],idx=[];
 const height=upper-lower,steps=Math.max(1,Math.ceil(height/grid.levelStep));
 for(let i=0;i<steps;i++){
  const yt=upper-height*i/steps,yb=upper-height*(i+1)/steps,k=verts.length/8;
  for(const [xx,yy,zz] of [[a[0],yt,a[1]],[b[0],yt,b[1]],[b[0],yb,b[1]],[a[0],yb,a[1]]])
   verts.push(xx,yy,zz,...n,xx*.08,yy*.32);
  idx.push(k,k+1,k+2,k,k+2,k+3);
 }
 return makeGeom(verts,idx);
}
function grainTexture(gl){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);
 let seed=531177;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const i=(y*canvas.width+x)*4;
  const tone=249+Math.sin(x*.023+y*.014)*2.0+Math.sin(x*.051-y*.019)*1.2+(random()-.5)*3.0;
  const shade=constrain(Math.round(tone),230,255);
  pixels.data[i]=shade;pixels.data[i+1]=shade;pixels.data[i+2]=shade;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 return tex;
}

/*
 * Cubic connected voxel renderer.
 * Each integer level is exactly one cube side-length. The only curvature
 * is a small top-edge bevel and convex corner radius, never a hillside ramp.
 */
function createWebGLRenderer(grid,{gl,makeGeom,renderGeom,I,tileTransform,showSeams}){
 if(!gl||!makeGeom||!renderGeom||!I)throw Error('Missing WebGL renderer dependencies');
 const texture=grainTexture(gl),base=I();
 const tileMatrix=(c,r)=>typeof tileTransform==='function'?(tileTransform(c,r)||base):base;
 const free=m=>{if(m){gl.deleteBuffer(m.b);gl.deleteBuffer(m.i);}};
 let tiles=Array.from({length:grid.rows},()=>Array(grid.cols).fill(null));
 let walls=[],wallGroups=Array.from({length:grid.rows},()=>Array.from({length:grid.cols},()=>[]));
 let signatures=new Map(),seams=null,renderedRevision=-1,meshRebuilds=0;
 const directions=[['north',0,-1],['south',0,1],['east',1,0],['west',-1,0]];
 function signature(c,r){
  const t=grid.cell(c,r);
  const h=(cc,rr)=>{const n=grid.cell(cc,rr);return n?n.height.toFixed(5):'edge';};
  return [t.kind,t.height.toFixed(5),h(c,r-1),h(c,r+1),h(c+1,r),h(c-1,r)].join(':');
 }
 function rebuild(){
  // Previously EVERY terrain tween frame deleted and re-created all 18 tile
  // meshes. Rebuild only the edited cell + neighbors with changed boundaries.
  for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++){
   const id=c+':'+r,next=signature(c,r);
   if(signatures.get(id)===next)continue;
   signatures.set(id,next);
   free(tiles[r][c]);
   for(const wall of wallGroups[r][c])free(wall.mesh);
   wallGroups[r][c]=[];
   const t=grid.cell(c,r),bottomOutside=t.height-grid.levelStep;
   for(const [dir,dx,dr] of directions){
    const neighbor=grid.cell(c+dx,r+dr);
    const lower=neighbor?neighbor.height:bottomOutside;
    if(t.height<=lower+.00001)continue;
    const mesh=roundedCliffMesh(grid,makeGeom,c,r,dir,lower);
    if(mesh)wallGroups[r][c].push({c,r,mesh,color:grid.materials[t.kind].side});
   }
   tiles[r][c]=tileSoftMesh(grid,makeGeom,c,r);
   meshRebuilds++;
  }
  walls=wallGroups.flat(2);
  free(seams);seams=seamMesh(grid,makeGeom);
  renderedRevision=grid.revision;
 }
 function draw(){
  if(renderedRevision!==grid.revision)rebuild();
  for(const entry of walls)renderGeom(entry.mesh,tileMatrix(entry.c,entry.r),entry.color);
  for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++){
   const cell=grid.cell(c,r);
   renderGeom(tiles[r][c],tileMatrix(c,r),grid.color(c,r),texture,false,grid.materials[cell.kind].side);
  }
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  if(!showSeams||showSeams())renderGeom(seams,base,[.13,.19,.12,.095],null,true);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 function dispose(){
  for(const row of tiles)for(const geo of row)free(geo);
  for(const entry of walls)free(entry.mesh);
  free(seams);gl.deleteTexture(texture);
 }
 return {draw,dispose,get mesh(){return tiles;},get renderedRevision(){return renderedRevision;},
  get meshRebuilds(){return meshRebuilds;}};
}
root.PaperchalkVoxelTerrain=Object.freeze({version:'4.4.0',MATERIALS,create,createWebGLRenderer});
})(window);

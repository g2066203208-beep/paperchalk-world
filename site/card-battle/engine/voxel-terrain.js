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
// Exact cubic blocks, with only a small exposed-corner radius.
const SOFT_VOXEL_PROFILE=Object.freeze({
 cornerRadiusRatio:.055,
 topRoundWidthRatio:.055,
 topRoundHeightRatio:.055,
 arcSteps:6,
 edgeSteps:8,
 bevelSteps:5
});
function tileContour(grid,c,r){
 const t=grid.cell(c,r),P=SOFT_VOXEL_PROFILE;
 const {x,z}=grid.center(c,r);
 const x0=x-grid.tileW/2,x1=x+grid.tileW/2,z0=z-grid.tileD/2,z1=z+grid.tileD/2;
 // Outside side always shows one full cube, never an artificial four-floor plinth.
 const floor=t.height-grid.levelStep;
 const dirs={
  N:grid.cell(c,r-1),E:grid.cell(c+1,r),S:grid.cell(c,r+1),W:grid.cell(c-1,r)
 };
 const exposed=Object.fromEntries(Object.entries(dirs).map(([d,n])=>[d,!n||n.height<t.height-.0001]));
 const lows=Object.fromEntries(Object.entries(dirs).map(([d,n])=>[d,n?n.height:floor]));
 const corner=Math.min(grid.tileW,grid.tileD)*P.cornerRadiusRatio;
 const rounded={
  NW:exposed.N&&exposed.W,NE:exposed.N&&exposed.E,
  SE:exposed.S&&exposed.E,SW:exposed.S&&exposed.W
 };
 const ring=[],segments=[];
 function append(px,pz,nx,nz,lower,active){
  const prev=ring[ring.length-1];
  if(prev&&Math.hypot(prev.x-px,prev.z-pz)<1e-6){
   // At a convex corner the smoothly varying edge normals are supplied by the arc.
   // At a flat junction keep the exposed-side normal, not a forced diagonal normal.
   if(!prev.active&&active){prev.nx=nx;prev.nz=nz;prev.lower=lower;prev.active=true;}
   return;
  }
  if(prev)segments.push(!!active);
  ring.push({x:px,z:pz,nx,nz,lower,active:!!active});
 }
 function edge(ax,az,bx,bz,nx,nz,lower,active,includeStart){
  const steps=P.edgeSteps;
  for(let i=includeStart?0:1;i<=steps;i++){
   const k=i/steps;
   append(ax+(bx-ax)*k,az+(bz-az)*k,active?nx:0,active?nz:0,lower,active);
  }
 }
 function arc(cx,cz,rad,from,to,lo0,lo1,active){
  for(let i=1;i<=P.arcSteps;i++){
   const k=i/P.arcSteps,a=from+(to-from)*k;
   append(cx+rad*Math.cos(a),cz+rad*Math.sin(a),
    active?Math.cos(a):0,active?Math.sin(a):0,
    lo0+(lo1-lo0)*k,active);
  }
 }
 // Clockwise XZ perimeter. Triangle winding gets reversed for upward normals.
 edge(x0+(rounded.NW?corner:0),z0,x1-(rounded.NE?corner:0),z0,0,-1,lows.N,exposed.N,true);
 if(rounded.NE)arc(x1-corner,z0+corner,corner,-Math.PI/2,0,lows.N,lows.E,true);
 else append(x1,z0,exposed.E?1:exposed.N?0:0,exposed.N?-1:0,exposed.E?lows.E:lows.N,exposed.N||exposed.E);
 edge(x1,z0+(rounded.NE?corner:0),x1,z1-(rounded.SE?corner:0),1,0,lows.E,exposed.E,false);
 if(rounded.SE)arc(x1-corner,z1-corner,corner,0,Math.PI/2,lows.E,lows.S,true);
 else append(x1,z1,exposed.E?1:0,exposed.S?1:0,exposed.S?lows.S:lows.E,exposed.S||exposed.E);
 edge(x1-(rounded.SE?corner:0),z1,x0+(rounded.SW?corner:0),z1,0,1,lows.S,exposed.S,false);
 if(rounded.SW)arc(x0+corner,z1-corner,corner,Math.PI/2,Math.PI,lows.S,lows.W,true);
 else append(x0,z1,exposed.W?-1:0,exposed.S?1:0,exposed.W?lows.W:lows.S,exposed.S||exposed.W);
 edge(x0,z1-(rounded.SW?corner:0),x0,z0+(rounded.NW?corner:0),-1,0,lows.W,exposed.W,false);
 if(rounded.NW){
  arc(x0+corner,z0+corner,corner,Math.PI,Math.PI*1.5,lows.W,lows.N,true);
  // Last arc sample coincides exactly with the first vertex, so discard duplicate.
  const last=ring[ring.length-1],first=ring[0];
  if(Math.hypot(last.x-first.x,last.z-first.z)<1e-6){
    ring.pop();
    segments.pop();
  }
 }else{
  append(x0,z0,exposed.W?-1:0,exposed.N?-1:0,exposed.N?lows.N:lows.W,exposed.W||exposed.N);
  if(Math.hypot(ring[ring.length-1].x-ring[0].x,ring[ring.length-1].z-ring[0].z)<1e-6){
   ring.pop();segments.pop();
  }
 }
 // Every consecutive pair, including last -> first, has one independent wall flag.
 // All convex-corner arc segments remain active; same-level seams are inactive.
 const closingActive=rounded.NW||exposed.W;
 segments.push(closingActive);
 if(segments.length!==ring.length)throw Error('Incorrect rounded voxel contour topology');
 return {ring,segments,exposed,rounded};
}
function tileSoftMesh(grid,makeGeom,c,r){
 const t=grid.cell(c,r),contour=tileContour(grid,c,r),points=contour.ring;
 const P=SOFT_VOXEL_PROFILE,n=points.length,verts=[],tri=[];
 const inset=Math.min(grid.tileW,grid.tileD)*P.topRoundWidthRatio;
 const depth=Math.min(grid.levelStep*P.topRoundHeightRatio,grid.levelStep*.075);
 const uv=(x,z)=>[(x-grid.minX)/grid.width,(z-grid.minZ)/grid.depth];
 // Center and inset ring form a flat card-ready landing surface.
 const {x,z}=grid.center(c,r);
 const [cu,cv]=uv(x,z);
 verts.push(x,t.height,z,0,1,0,cu,cv);
 const count=P.bevelSteps+1;
 for(let tier=0;tier<count;tier++){
  const phase=(tier/(count-1))*(Math.PI/2);
  const along=1-Math.sin(phase),drop=1-Math.cos(phase);
  const normalHoriz=Math.sin(phase),normalVert=Math.cos(phase);
  for(const p of points){
   const a=p.active?1:0;
   const px=p.x-p.nx*inset*along*a,pz=p.z-p.nz*inset*along*a;
   const py=t.height-depth*drop*a;
   const horizontal=Math.hypot(p.nx,p.nz)||1;
   const nx=a?p.nx/horizontal*normalHoriz:0;
   const nz=a?p.nz/horizontal*normalHoriz:0;
   const ny=a?normalVert:1;
   const [u,v]=uv(px,pz);
   verts.push(px,py,pz,nx,ny,nz,u,v);
  }
 }
 // Perimeter is clockwise in XZ; reversing triangle order gives upward normal.
 for(let i=0;i<n;i++)tri.push(0,1+(i+1)%n,1+i);
 for(let tier=0;tier<count-1;tier++){
  const base=1+tier*n,next=base+n;
  for(let i=0;i<n;i++){
   const j=(i+1)%n,a=base+i,b=base+j,cc=next+i,d=next+j;
   tri.push(a,b,cc,b,d,cc);
  }
 }
 return {mesh:makeGeom(verts,tri),contour,depth};
}
function roundedCliffMesh(grid,makeGeom,c,r,contour,depth){
 const tile=grid.cell(c,r),{ring,segments}=contour,verts=[],idx=[];
 const heightTop=tile.height-depth;
 // Vertical voxel cliffs; walls are a full cube-height for each tier.
 // A tiny horizontal groove indicates stacked blocks, not rounded soap sides.
 for(let i=0;i<ring.length;i++){
  const j=(i+1)%ring.length;
  if(!segments[i])continue;
  const a=ring[i],b=ring[j];
  if(Math.min(a.lower,b.lower)>=heightTop-.001)continue;
  const tiers=Math.max(6,Math.ceil((heightTop-Math.min(a.lower,b.lower))/grid.levelStep)*6);
  let previous=-1;
  for(let k=0;k<=tiers;k++){
   const q=k/tiers,local=[];
   for(const p of [a,b]){
    const low=Math.min(p.lower,heightTop-.015);
    const h=heightTop+(low-heightTop)*q;
    const levelPos=(tile.height-h)/grid.levelStep;
    const frac=Math.abs(levelPos-Math.round(levelPos));
    const groove=Math.exp(-Math.pow(frac/.025,2))*.011;
    const px=p.x-p.nx*groove,pz=p.z-p.nz*groove;
    const normalLength=Math.hypot(p.nx,p.nz)||1;
    const nx=p.nx/normalLength,nz=p.nz/normalLength;
    local.push(verts.length/8);
    verts.push(px,h,pz,nx,0,nz,px*.075,h*.22);
   }
   if(previous>=0){
    const prev=previous,cur=local[0];
    idx.push(prev,prev+1,cur,prev+1,cur+1,cur);
   }
   previous=local[0];
  }
 }
 if(!idx.length)return null;
 return makeGeom(verts,idx);
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
function createWebGLRenderer(grid,{gl,makeGeom,renderGeom,I}){
 if(!gl||!makeGeom||!renderGeom||!I)throw Error('Missing WebGL renderer dependencies');
 const texture=grainTexture(gl),base=I();
 const free=m=>{if(m){gl.deleteBuffer(m.b);gl.deleteBuffer(m.i);}};
 let tiles=[],walls=[],seams=null,renderedRevision=-1;
 function rebuild(){
  for(const row of tiles)for(const geo of row)free(geo);
  for(const entry of walls)free(entry.mesh);
  free(seams);walls=[];
  tiles=Array.from({length:grid.rows},(_,r)=>Array.from({length:grid.cols},(_,c)=>{
   const geometry=tileSoftMesh(grid,makeGeom,c,r);
   const wall=roundedCliffMesh(grid,makeGeom,c,r,geometry.contour,geometry.depth);
   if(wall)walls.push({mesh:wall,color:grid.materials[grid.cell(c,r).kind].side});
   return geometry.mesh;
  }));
  seams=seamMesh(grid,makeGeom);
  renderedRevision=grid.revision;
 }
 function draw(){
  if(renderedRevision!==grid.revision)rebuild();
  for(const entry of walls)renderGeom(entry.mesh,base,entry.color);
  for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++){
   const cell=grid.cell(c,r);
   renderGeom(tiles[r][c],base,grid.color(c,r),texture,false,grid.materials[cell.kind].side);
  }
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  renderGeom(seams,base,[.13,.19,.12,.095],null,true);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 function dispose(){
  for(const row of tiles)for(const geo of row)free(geo);
  for(const entry of walls)free(entry.mesh);
  free(seams);gl.deleteTexture(texture);
 }
 return {draw,dispose,get mesh(){return tiles;},get renderedRevision(){return renderedRevision}};
}
root.PaperchalkVoxelTerrain=Object.freeze({version:'4.0.0',MATERIALS,create,createWebGLRenderer});
})(window);

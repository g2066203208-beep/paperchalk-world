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
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols>80||rows>80)throw Error('Invalid voxel grid size');
 if(tileW<=0||tileD<=0||thickness<=0)throw Error('Invalid voxel dimensions');
 const minX=centerX-cols*tileW/2,minZ=centerZ-rows*tileD/2;
 const width=cols*tileW,depth=rows*tileD;
 const cells=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>({c,r,kind:options.initialKind||'grass',height:topY})));
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
  target.height=topY+(materials[kind].height||0);
  return target;
 }
 function reset(kind='grass'){
  if(!materials[kind])throw Error('Unknown terrain material');
  for(const row of cells)for(const t of row){t.kind=kind;t.height=topY+(materials[kind].height||0);}
 }
 function snapshot(){return cells.flat().map(t=>({...t,...center(t.c,t.r),color:color(t.c,t.r)}));}
 // Build a continuous exterior shell and independently colored, exactly adjoining tile surfaces.
 return Object.freeze({cols,rows,tileW,tileD,centerX,centerZ,minX,minZ,width,depth,topY,thickness,seed,
  materials,cells,inside,cell,center,atWorld,color,neighbors,set,reset,snapshot,hash:(c,r)=>hash(c,r,seed)});
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
function tileMesh(grid,makeGeom,c,r){
 const {x,z}=grid.center(c,r),x0=x-grid.tileW/2,x1=x+grid.tileW/2,z0=z-grid.tileD/2,z1=z+grid.tileD/2;
 const p=[[x0,z1],[x1,z1],[x1,z0],[x0,z0]];
 // Edge bevel belongs to the perimeter shell. No per-cell rounded corners or cracks.
 const verts=[x,grid.topY,z,0,1,0,(x-grid.minX)/grid.width,(z-grid.minZ)/grid.depth],ind=[];
 for(const [px,pz] of p)verts.push(px,grid.topY,pz,0,1,0,(px-grid.minX)/grid.width,(pz-grid.minZ)/grid.depth);
 for(let i=0;i<4;i++)ind.push(0,i+1,(i+1)%4+1);
 return makeGeom(verts,ind);
}
function seamMesh(grid,makeGeom){
 const verts=[],idx=[],stroke=Math.min(grid.tileW,grid.tileD)*.007,y=grid.topY+.004;
 function quad(x0,z0,x1,z1){
  const first=verts.length/8;
  for(const [x,z] of [[x0,z1],[x1,z1],[x1,z0],[x0,z0]])verts.push(x,y,z,0,1,0,0,0);
  idx.push(first,first+1,first+2,first,first+2,first+3);
 }
 for(let c=1;c<grid.cols;c++){const x=grid.minX+c*grid.tileW;quad(x-stroke/2,grid.minZ,x+stroke/2,grid.minZ+grid.depth);}
 for(let r=1;r<grid.rows;r++){const z=grid.minZ+r*grid.tileD;quad(grid.minX,z-stroke/2,grid.minX+grid.width,z+stroke/2);}
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
function createWebGLRenderer(grid,{gl,makeGeom,renderGeom,I}){
 if(!gl||!makeGeom||!renderGeom||!I)throw Error('Missing WebGL renderer dependencies');
 const w=grid.width+.17,d=grid.depth+.17,r=.26,y=grid.topY;
 const inner=makeRing(grid,w-.17,d-.17,r-.04,y);
 const outside=makeRing(grid,w,d,r,y-.12);
 const lower=makeRing(grid,w,d,r,y-grid.thickness);
 const bevel=ringBand(grid,makeGeom,inner,outside,true);
 const soil=ringBand(grid,makeGeom,outside,lower,false);
 const mesh=Array.from({length:grid.rows},(_,row)=>Array.from({length:grid.cols},(_,col)=>tileMesh(grid,makeGeom,col,row)));
 const seams=seamMesh(grid,makeGeom);
 const texture=grainTexture(gl);
 const base=I();
 function draw(){
  const grass=grid.materials.grass;
  renderGeom(soil,base,grass.side);
  renderGeom(bevel,base,grass.edge);
  for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++)
   renderGeom(mesh[r][c],base,grid.color(c,r),texture);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  renderGeom(seams,base,[.15,.20,.135,.095],null,true);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 function dispose(){
  for(const row of mesh)for(const m of row){gl.deleteBuffer(m.b);gl.deleteBuffer(m.i);}
  for(const m of [seams,bevel,soil]){gl.deleteBuffer(m.b);gl.deleteBuffer(m.i);}
  gl.deleteTexture(texture);
 }
 return {draw,dispose,mesh};
}
root.PaperchalkVoxelTerrain=Object.freeze({version:'1.0.0',MATERIALS,create,createWebGLRenderer});
})(window);

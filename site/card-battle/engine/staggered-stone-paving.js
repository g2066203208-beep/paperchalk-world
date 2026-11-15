/* Stone street modular running-bond pavement.
 * Real 3D mortar-jointed, bevelled cobbles; never a shader-drawn checker.
 * One physical stone course per gameplay CARD ROW (6 courses).
 * Every alternate card row offsets one-half of a card width.
 * Adjacent cells clip the SAME world-space stone pattern: no tile-sized
 * checker seams; editing voxel heights rebakes only this paving mesh.
 */
(function(root){'use strict';
function create({terrain,gl,makeGeom,renderGeom,I}){
 if(!terrain||!gl||!makeGeom||!renderGeom||!I)throw Error('Missing stone paving renderer deps');
 // Both masonry modules and visible card-space measurements share these values.
 const width=terrain.tileW,course=terrain.tileD;
 const halfOffset=width*.5,gap=.067,bevel=.092,rise=.075,edgeRise=.013;
 const colors=[
  [.52,.55,.61,1],[.48,.51,.57,1],[.56,.57,.61,1],
  [.44,.49,.55,1],[.50,.54,.58,1],[.46,.50,.56,1]
 ];
 let meshes=[],revision=-1,fragments=0,modules=0,drawCalls=0;
 const max=(v,min)=>Math.max(v,min),min=(v,max)=>Math.min(v,max);
 function makeGroup(color){return {color,v:[],i:[]}}
 function vertex(g,x,z,left,right,front,back,height){
  const d=Math.min(x-left,right-x,z-front,back-z);
  const t=Math.max(0,Math.min(1,d/bevel)),py=height+edgeRise+rise*t;
  const dx=(x-left<bevel?rise/bevel:right-x<bevel?-rise/bevel:0);
  const dz=(z-front<bevel?rise/bevel:back-z<bevel?-rise/bevel:0);
  const inv=1/Math.hypot(dx,1,dz);
  g.v.push(x,py,z,-dx*inv,inv,-dz*inv,x*.17,z*.17);
 }
 function addClippedSlab(g,clipX0,clipX1,clipZ0,clipZ1,
  left,right,front,back,height){
  const xs=[clipX0,Math.max(clipX0,Math.min(clipX1,left+bevel)),
   Math.max(clipX0,Math.min(clipX1,right-bevel)),clipX1];
  const zs=[clipZ0,Math.max(clipZ0,Math.min(clipZ1,front+bevel)),
   Math.max(clipZ0,Math.min(clipZ1,back-bevel)),clipZ1];
  const a=g.v.length/8;
  for(const z of zs)for(const x of xs)
   vertex(g,x,z,left,right,front,back,height);
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){
   if(xs[i+1]-xs[i]<.0001||zs[j+1]-zs[j]<.0001)continue;
   const q=a+j*4+i;
   g.i.push(q,q+4,q+1,q+1,q+4,q+5);
  }
 }
 const free=()=>{for(const g of meshes){gl.deleteBuffer(g.mesh.b);gl.deleteBuffer(g.mesh.i)};meshes=[]};
 function rebuild(){
  free();
  const groups=colors.map(makeGroup),unique=new Set();
  fragments=0;
  for(let r=0;r<terrain.rows;r++)for(let c=0;c<terrain.cols;c++){
   const cell=terrain.cell(c,r);
   if(cell.kind!=='stone')continue;
   const leftTile=terrain.minX+c*terrain.tileW;
   const rightTile=leftTile+terrain.tileW;
   {
    const courseIndex=r;
    const offset=(courseIndex%2)*halfOffset;
    const z0=terrain.minZ+courseIndex*course;
    const z1=z0+course;
    const courseFront=z0+gap*.5,courseBack=z1-gap*.5;
    // Stone modules straddle gameplay tile boundaries without introducing a fake seam.
    const first=Math.floor((leftTile-terrain.minX+offset)/width)-1;
    const last=Math.ceil((rightTile-terrain.minX+offset)/width)+1;
    for(let k=first;k<=last;k++){
     const slabX0=terrain.minX+k*width-offset;
     const slabX1=slabX0+width;
     const stoneLeft=slabX0+gap*.5,stoneRight=slabX1-gap*.5;
     const x0=Math.max(leftTile,stoneLeft),x1=Math.min(rightTile,stoneRight);
     if(x1-x0<.003)continue;
     const shade=((k*73856093)^(courseIndex*19349663))>>>0;
     const group=groups[shade%groups.length];
     addClippedSlab(group,x0,x1,courseFront,courseBack,
      stoneLeft,stoneRight,courseFront,courseBack,cell.height);
     unique.add(courseIndex+':'+k);
     fragments++;
    }
   }
  }
  meshes=groups.filter(g=>g.i.length).map(g=>({
   mesh:makeGeom(g.v,g.i),color:g.color
  }));
  revision=terrain.revision;
  modules=unique.size;
 }
 function draw(scene){
  drawCalls=0;
  if(scene!=='street')return;
  if(revision!==terrain.revision)rebuild();
  for(const g of meshes){
   renderGeom(g.mesh,I(),g.color,null,false,null,0,3);
   drawCalls++;
  }
 }
 const snapshot=()=>({
  source:'physical-3d-bevelled-stones',pattern:'running-bond',
  activeCourses:terrain.rows,offsetRatio:.5,staggered:true,
  paverWidthCardUnits:1,paverDepthCardUnits:1,
  mortarGap:gap,bevel,rise,logicalTiles:terrain.cols*terrain.rows,
  gameplayGridUnchanged:true,meshRevision:revision,
  independentModules:modules,clippedFragments:fragments,drawCalls,
  heightAware:true,sharedLighting:true
 });
 return Object.freeze({draw,dispose:free,get snapshot(){return snapshot();}});
}
root.PaperchalkStaggeredStonePaving=Object.freeze({version:'1.1.0',create});
})(window);

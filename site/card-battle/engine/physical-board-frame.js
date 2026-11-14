/* Single continuous, thin, rounded GOLD border surrounding the real 16x6 grid.
 * A physical 3D extruded ring: top, bottom, curved outer and inner sides.
 * NO wood, plaques, crossbar, ornaments, rivets, floating CSS overlays, or
 * card/terrain modifications. One WebGL draw call per frame.
 */
(function(root){
'use strict';
function create(o){
 const {terrain,makeGeom,renderGeom,T,S,mul,appearance}=o;
 const W=terrain.width,D=terrain.depth;
 const cx=terrain.minX+W/2,cz=terrain.minZ+D/2;
 const outerWidth=W+.58,outerDepth=D+.58;
 const openingWidth=W+.08,openingDepth=D+.08;
 const cornerRadius=.34;
 const color=[.84,.66,.33,1];
 function outline(w,d,r){
  const points=[],rad=Math.min(r,w/2-.001,d/2-.001),steps=9;
  for(const [x,z,start] of [
   [w/2-rad,d/2-rad,0],
   [-w/2+rad,d/2-rad,90],
   [-w/2+rad,-d/2+rad,180],
   [w/2-rad,-d/2+rad,270]
  ])for(let i=0;i<steps;i++){
   const a=(start+i*90/steps)*Math.PI/180;
   points.push([x+Math.cos(a)*rad,z+Math.sin(a)*rad]);
  }
  return points;
 }
 function ringMesh(){
  const outer=outline(outerWidth,outerDepth,cornerRadius);
  const inner=outline(openingWidth,openingDepth,.09);
  const vertices=[],indices=[],top=.18,bottom=-.18;
  function point(x,y,z,nx,ny,nz){
   const i=vertices.length/8;
   vertices.push(x,y,z,nx,ny,nz,x/outerWidth+.5,z/outerDepth+.5);
   return i;
  }
  function face(p,q,r,s,nx,ny,nz){
   const a=point(...p,nx,ny,nz),b=point(...q,nx,ny,nz);
   const c=point(...r,nx,ny,nz),d=point(...s,nx,ny,nz);
   indices.push(a,b,c,a,c,d);
  }
  for(let i=0;i<outer.length;i++){
   const j=(i+1)%outer.length,O=outer[i],P=outer[j],I=inner[i],J=inner[j];
   face([O[0],top,O[1]],[P[0],top,P[1]],[J[0],top,J[1]],[I[0],top,I[1]],0,1,0);
   face([I[0],bottom,I[1]],[J[0],bottom,J[1]],[P[0],bottom,P[1]],[O[0],bottom,O[1]],0,-1,0);
   const nx=(O[0]+P[0])/outerWidth,nz=(O[1]+P[1])/outerDepth;
   const n=Math.hypot(nx,nz)||1;
   face([P[0],top,P[1]],[O[0],top,O[1]],[O[0],bottom,O[1]],[P[0],bottom,P[1]],nx/n,0,nz/n);
   face([I[0],top,I[1]],[J[0],top,J[1]],[J[0],bottom,J[1]],[I[0],bottom,I[1]],-nx/n,0,-nz/n);
  }
  return makeGeom(vertices,indices);
 }
 const mesh=ringMesh();
 let lastDrawCalls=0;
 const info=Object.freeze({
  modeled:true,screenOverlay:false,worldSpace:true,
  geometry:'single-thin-rounded-gold-ring',color:'gold',decorations:0,
  framePieces:1,midfieldBeam:false,sidePlaques:false,
  boardCols:terrain.cols,boardRows:terrain.rows,
  boardWidth:W,boardDepth:D,outerWidth,outerDepth,
  innerOpeningWidth:openingWidth,innerOpeningDepth:openingDepth,
  gapFromTileEdge:.04,cornerRadius,railThickness:.25
 });
 function draw(t){
  const pose=appearance?.('board-frame',t);
  const scale=pose?.scale??1;
  if(scale<.012){lastDrawCalls=0;return 0;}
  const m=mul(T(cx,terrain.topY,cz),S(scale,scale,scale));
  renderGeom(mesh,m,color);
  lastDrawCalls=1;
  return 1;
 }
 return Object.freeze({draw,get snapshot(){return {...info,lastDrawCalls};}});
}
root.PaperchalkPhysicalBoardFrame=Object.freeze({version:'1.1.0',create});
})(window);

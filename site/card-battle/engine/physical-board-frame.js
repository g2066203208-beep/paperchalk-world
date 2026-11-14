/* Physical 3D frame for the 16x6 tactical board.
 * All visible trim, corner hardware, midfield separator, and facility plaques
 * are real WebGL geometry in the same world coordinates as the voxel tiles.
 * No DOM/CSS frame is drawn on top of the game canvas.
 */
(function(root){
'use strict';
const PI=Math.PI;
function create(o){
 const {terrain,makeGeom,renderGeom,box,T,S,RY,mul,appearance}=o;
 const palette={
  timber:[.245,.154,.091,1],
  darkTimber:[.125,.083,.056,1],
  panel:[.355,.242,.141,1],
  edge:[.105,.086,.057,1],
  gold:[.74,.554,.254,1],
  goldBright:[.94,.763,.410,1],
  gildedShadow:[.39,.282,.124,1],
  mutedGold:[.63,.476,.250,1],
  moss:[.274,.381,.234,1]
 };
 const W=terrain.width,D=terrain.depth;
 const centerX=terrain.minX+W/2,centerZ=terrain.minZ+D/2;
 const midZ=terrain.minZ+D/2;
 const sections=9;
 function perimeter(w,d,r){
  const output=[],radius=Math.min(r,w/2-.001,d/2-.001);
  const arcs=[
   [w/2-radius,d/2-radius,0],
   [-w/2+radius,d/2-radius,90],
   [-w/2+radius,-d/2+radius,180],
   [w/2-radius,-d/2+radius,270]
  ];
  for(const [cx,cz,from] of arcs)
   for(let k=0;k<sections;k++){
    const a=(from+(k/sections)*90)*PI/180;
    output.push([cx+radius*Math.cos(a),cz+radius*Math.sin(a)]);
   }
  return output;
 }
 function ringMesh(wo,do_,wi,di,ro,ri,top,bottom){
  const outer=perimeter(wo,do_,ro),inner=perimeter(wi,di,ri);
  const verts=[],faces=[];
  const put=(x,y,z,nx,ny,nz)=>{
   const idx=verts.length/8;
   verts.push(x,y,z,nx,ny,nz,x/wo+.5,z/do_+.5);
   return idx;
  };
  function quad(points,normal){
   const [a,b,c,d]=points;
   const first=put(a[0],a[1],a[2],...normal),
    second=put(b[0],b[1],b[2],...normal),
    third=put(c[0],c[1],c[2],...normal),
    fourth=put(d[0],d[1],d[2],...normal);
   faces.push(first,second,third,first,third,fourth);
  }
  const n=outer.length;
  for(let i=0;i<n;i++){
   const j=(i+1)%n,O=outer[i],P=outer[j],I=inner[i],J=inner[j];
   quad([[O[0],top,O[1]],[P[0],top,P[1]],[J[0],top,J[1]],[I[0],top,I[1]]],[0,1,0]);
   quad([[I[0],bottom,I[1]],[J[0],bottom,J[1]],[P[0],bottom,P[1]],[O[0],bottom,O[1]]],[0,-1,0]);
   const nx=(O[0]+P[0])/(wo||1),nz=(O[1]+P[1])/(do_||1),nl=Math.hypot(nx,nz)||1;
   quad([[P[0],top,P[1]],[O[0],top,O[1]],[O[0],bottom,O[1]],[P[0],bottom,P[1]]],
    [nx/nl,0,nz/nl]);
   quad([[I[0],top,I[1]],[J[0],top,J[1]],[J[0],bottom,J[1]],[I[0],bottom,I[1]]],
    [-nx/nl,0,-nz/nl]);
  }
  return makeGeom(verts,faces);
 }
 // Perimeter starts OUTSIDE the real tile rectangle. No terrain cell is
 // covered by this solid geometry; even border corners are genuinely curved.
 const shell=ringMesh(W+2.18,D+2.18,W+.10,D+.10,.92,.24,.285,-.40);
 const outerMould=ringMesh(W+2.12,D+2.12,W+1.91,D+1.91,.90,.79,.338,.290);
 const innerMould=ringMesh(W+.43,D+.43,W+.09,D+.09,.34,.20,.345,.291);
 const insetRope=ringMesh(W+1.56,D+1.56,W+1.37,D+1.37,.71,.64,.352,.316);
 const sidePlaque=ringMesh(1.30,6.65,.85,5.90,.33,.21,.28,.22);
 let lastDrawn=0;
 const metrics=Object.freeze({
  modeled:true,screenOverlay:false,geometry:'extruded-rounded-perimeter',
  framePieces:4,worldSpace:true,boardCols:terrain.cols,boardRows:terrain.rows,
  boardWidth:W,boardDepth:D,
  outerWidth:W+2.18,outerDepth:D+2.18,
  innerOpeningWidth:W+.10,innerOpeningDepth:D+.10,
  gapFromTileEdge:.05,midfieldZ:midZ,
  cornerRadius:.92,railThickness:.685
 });
 function draw(now,scene='forest'){
  const anim=appearance?.('board-frame',now);
  const scale=anim?.scale??1;
  if(scale<.012)return 0;
  let draws=0;
  const origin=mul(mul(T(centerX,terrain.topY,centerZ),S(scale,scale,scale)),T(0,0,0));
  function render(geom,m,color){
   renderGeom(geom,mul(origin,m),color);draws++;
  }
  function cube(x,y,z,w,h,d,color,angle=0){
   let m=mul(T(x,y,z-centerZ),S(w,h,d));
   if(angle)m=mul(T(x,y,z-centerZ),mul(RY(angle),S(w,h,d)));
   render(box,m,color);
  }
  // Real recessed timber chassis, two raised gold bands, and a middle carved
  // moulding. Side normals catch the same directional light as the terrain.
  render(shell,T(0,0,0),palette.timber);
  render(outerMould,T(0,0,0),palette.mutedGold);
  render(insetRope,T(0,0,0),palette.darkTimber);
  render(innerMould,T(0,0,0),palette.goldBright);
  // Midfield beam is a raised physical 3D strip between rows 2 and 3.
  cube(0,.085,midZ,W+.24,.30,.24,palette.darkTimber);
  cube(0,.270,midZ,W+.25,.055,.084,palette.goldBright);
  cube(0,.217,midZ,W+.25,.045,.30,palette.gildedShadow);
  // Two decorative side-mounted facility plaques are genuine 3D accessories
  // bolted outside the board, not full-screen left/right CSS panels.
  for(const direction of [-1,1]){
   const x=direction*(W/2+1.84);
   cube(x,.032,midZ,1.55,.38,7.14,palette.darkTimber);
   cube(x,.254,midZ,1.34,.08,6.76,palette.panel);
   render(sidePlaque,T(x,.008,0),palette.mutedGold);
   cube(x,.304,midZ,1.00,.044,5.55,palette.moss);
   // Raised metallic diamond, emblem and plus, all with actual depth.
   cube(x,.365,midZ,.64,.11,.64,palette.gildedShadow,PI/4);
   cube(x,.436,midZ,.39,.082,.39,palette.gold,PI/4);
   cube(x,.490,midZ,.09,.045,.52,palette.goldBright);
   cube(x,.495,midZ,.52,.045,.09,palette.goldBright);
   for(const offset of [-2.76,2.76])
    cube(x,.375,midZ+offset,.37,.115,.37,palette.gold,PI/4);
  }
  // Bolted four corner joints, with gold top bosses that follow perspective.
  for(const dirX of [-1,1])for(const dirZ of [-1,1]){
   const x=dirX*(W/2+.63),z=centerZ+dirZ*(D/2+.64);
   cube(x,.340,z,.92,.21,.92,palette.darkTimber,PI/4);
   cube(x,.476,z,.66,.14,.66,palette.gold,PI/4);
   cube(x,.562,z,.28,.050,.28,palette.goldBright,PI/4);
  }
  // A proper crest at the exact centre of both short end-caps.
  for(const side of [-1,1]){
   const z=centerZ+side*(D/2+.63);
   cube(0,.387,z,1.04,.19,.93,palette.darkTimber,PI/4);
   cube(0,.513,z,.77,.084,.73,palette.gold,PI/4);
   cube(0,.572,z,.38,.045,.34,palette.goldBright,PI/4);
  }
  // Engraved short plank seams and rivets on the two long wooden rails.
  for(let i=0;i<10;i++){
   const x=-W/2+(i+.5)*W/10;
   for(const dirZ of [-1,1]){
    const z=centerZ+dirZ*(D/2+.67);
    cube(x,.330,z,.041,.025,.55,palette.edge);
    cube(x,.365,z,.11,.038,.11,palette.gold,PI/4);
   }
  }
  lastDrawn=draws;
  return draws;
 }
 return Object.freeze({draw,get snapshot(){return {...metrics,lastDrawCalls:lastDrawn};}});
}
root.PaperchalkPhysicalBoardFrame=Object.freeze({version:'1.0.0',create});
})(window);

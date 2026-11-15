/* Eight distinct scene-owned 16x6 battlefield rims, sharing gameplay
 * dimensions but adapting actual mesh material to their environment.
 * One physical world-space rounded/beveled mesh per visible scene, no HUD.
 */
(function(root){
'use strict';
function create({terrain,makeGeom,renderGeom,T,S,mul,appearance,look=null}){
 const W=terrain.width,D=terrain.depth;
 const cx=terrain.minX+W/2,cz=terrain.minZ+D/2;
 const outerWidth=W+.41,outerDepth=D+.41;
 const openingWidth=W+.06,openingDepth=D+.06;
 const cornerRadius=.44;
 const styles=Object.freeze({
  forest:{name:'woodland-gold',color:look?.get('forest').goldColor||[.82,.74,.49,1],metal:1,material:6},
  clearing:{name:'dusty-limestone',color:[.67,.60,.49,1],metal:0,material:3},
  street:{name:'blackened-iron',color:[.37,.41,.44,1],metal:.73,material:6},
  hall:{name:'royal-brass',color:[.84,.68,.42,1],metal:1,material:6},
  coast:{name:'weathered-shellstone',color:[.76,.68,.56,1],metal:0,material:3},
  cliff:{name:'eroded-slate',color:[.43,.47,.49,1],metal:0,material:3},
  ocean:{name:'salt-dark-oak',color:[.49,.35,.27,1],metal:0,material:4},
  cave:{name:'damp-mineral-rock',color:[.34,.40,.44,1],metal:0,material:3}
 });
 const top=.12,shoulder=.055,bottom=-.13;
 function outline(w,d,r){
  const points=[],rad=Math.min(r,w/2-.001,d/2-.001),steps=9;
  for(const [x,z,start] of [
   [w/2-rad,d/2-rad,0],[-w/2+rad,d/2-rad,90],
   [-w/2+rad,-d/2+rad,180],[w/2-rad,-d/2+rad,270]
  ])for(let i=0;i<steps;i++){
   const a=(start+i*90/steps)*Math.PI/180;
   points.push([x+Math.cos(a)*rad,z+Math.sin(a)*rad]);
  }
  return points;
 }
 function ringMesh(){
  const O=outline(outerWidth,outerDepth,cornerRadius);
  const OT=outline(outerWidth-.085,outerDepth-.085,cornerRadius-.0425);
  const IT=outline(openingWidth+.085,openingDepth+.085,.193);
  const I=outline(openingWidth,openingDepth,.15);
  const verts=[],ids=[],n=O.length;
  function add(x,y,z,nx,ny,nz){
   const k=verts.length/8;
   verts.push(x,y,z,nx,ny,nz,x/outerWidth+.5,z/outerDepth+.5);
   return k;
  }
  function quad(a,b,c,d,nx,ny,nz){
   const x=add(...a,nx,ny,nz),y=add(...b,nx,ny,nz);
   const z=add(...c,nx,ny,nz),w=add(...d,nx,ny,nz);
   ids.push(x,y,z,x,z,w);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   const ox=(O[i][0]+O[j][0])/outerWidth,oz=(O[i][1]+O[j][1])/outerDepth;
   const length=Math.hypot(ox,oz)||1, nx=ox/length,nz=oz/length;
   const at=(p,y)=>[p[0],y,p[1]];
   // Rounded edge: two shallow diagonal bevel surfaces, flat polished top.
   quad(at(O[i],shoulder),at(O[j],shoulder),at(OT[j],top),at(OT[i],top),
    nx*.54,.84,nz*.54);
   quad(at(OT[i],top),at(OT[j],top),at(IT[j],top),at(IT[i],top),0,1,0);
   quad(at(IT[i],top),at(IT[j],top),at(I[j],shoulder),at(I[i],shoulder),
    -nx*.54,.84,-nz*.54);
   // Solid outside / inside walls and lower face (not a painted line).
   quad(at(O[j],shoulder),at(O[i],shoulder),at(O[i],bottom),at(O[j],bottom),nx,0,nz);
   quad(at(I[i],shoulder),at(I[j],shoulder),at(I[j],bottom),at(I[i],bottom),-nx,0,-nz);
   quad(at(I[i],bottom),at(I[j],bottom),at(O[j],bottom),at(O[i],bottom),0,-1,0);
  }
  return makeGeom(verts,ids);
 }
 const mesh=ringMesh();
 let lastDrawCalls=0,lastScene='forest';
 const info=Object.freeze({
  modeled:true,screenOverlay:false,worldSpace:true,
  geometry:'single-thin-rounded-3d-rim',color:'scene-specific',
  material:'scene-dependent-stone-wood-or-metal',bevelSegments:2,
  decorations:0,framePieces:1,midfieldBeam:false,sidePlaques:false,
  boardCols:terrain.cols,boardRows:terrain.rows,
  boardWidth:W,boardDepth:D,outerWidth,outerDepth,
  innerOpeningWidth:openingWidth,innerOpeningDepth:openingDepth,
  gapFromTileEdge:.03,cornerRadius,railThickness:.175
 });
 function draw(t,scene='forest'){
  lastScene=styles[scene]?scene:'forest';
  const pose=appearance?.('board-frame',t);
  const scale=pose?.scale??1;
  if(scale<.012){lastDrawCalls=0;return 0;}
  const style=styles[lastScene];
  renderGeom(mesh,mul(T(cx,terrain.topY,cz),S(scale,scale,scale)),
   style.color,null,false,null,style.metal,style.material);
  lastDrawCalls=1;
  return 1;
 }
 return Object.freeze({draw,get snapshot(){return {...info,lastDrawCalls,
  scene:lastScene,theme:styles[lastScene].name,
  colorRGBA:styles[lastScene].color.slice(),
  frameMaterialKind:styles[lastScene].material,
  sceneOwned:true,availableThemes:Object.keys(styles)};}});
}
root.PaperchalkPhysicalBoardFrame=Object.freeze({version:'2.0.0',create});
})(window);

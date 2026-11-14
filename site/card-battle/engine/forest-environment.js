/* Procedural forest/stone-clearing biome presentation.
 * Two distinct sets of genuine world-space 3D mesh props. Scene switching
 * changes ONLY visual geometry; no terrain occupancy or battle logic changes.
 */
(function(root){
'use strict';
function create({terrain,makeGeom,renderGeom,mul,T,S,cube,appearance,look=null}){
 let seed=77049,scene='forest';
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // One reusable mesh for all three layered leaf cones.
 // It replaces three draw calls per tree with one, keeping the silhouette.
 const crown=(()=>{
  const vertices=[],indices=[],sides=8;
  for(let layer=0;layer<3;layer++){
   const radius=1.18-layer*.17,rise=.48+layer*.47,height=1.48*radius*.92;
   for(let i=0;i<sides;i++){
    const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides;
    const nx=Math.cos((a+b)*.5),nz=Math.sin((a+b)*.5),base=vertices.length/8;
    const norm=Math.hypot(nx,.45,nz);
    for(const [px,py,pz,u,v] of [
     [Math.cos(a)*radius,rise,Math.sin(a)*radius,0,0],
     [Math.cos(b)*radius,rise,Math.sin(b)*radius,1,0],
     [0,rise+height,0,.5,1]]){
     vertices.push(px,py,pz,nx/norm,.45/norm,nz/norm,u,v);
    }
    indices.push(base,base+1,base+2);
   }
  }
  return makeGeom(vertices,indices);
 })();
 const halfW=terrain.width/2,halfD=terrain.depth/2;
  // Keep trees/rocks OUTSIDE the 3D timber rails and protruding side plaques.
 const forest=[],clearing=[];
 for(let i=0;i<30;i++){
  const side=i%4,edge=3.35+rand()*4.1;
  let x,z;
  if(side<2){x=(side===0?-1:1)*(halfW+edge);z=(rand()-.5)*(terrain.depth+8);}
  else{x=(rand()-.5)*(terrain.width+9);z=(side===2?-1:1)*(halfD+edge);}
  if(Math.abs(x)<halfW+1&&Math.abs(z)<halfD+1)continue;
  forest.push({id:'forest-prop-'+forest.length,x,z,scale:.72+rand()*.8,type:i%7===0?'shrub':'pine',tint:rand()});
 }
 // Different real geometry, not a recolored forest: stone stacks, pale rocks
 // and sparse grasses on the outside of the same legally playable grid.
 for(let i=0;i<27;i++){
  const side=i%4,edge=3.15+rand()*3.7;
  let x,z;
  if(side<2){x=(side===0?-1:1)*(halfW+edge);z=(rand()-.5)*(terrain.depth+7);}
  else{x=(rand()-.5)*(terrain.width+8);z=(side===2?-1:1)*(halfD+edge);}
  if(Math.abs(x)<halfW+.55&&Math.abs(z)<halfD+.55)continue;
  clearing.push({id:'clearing-prop-'+clearing.length,x,z,
   scale:.67+rand()*1.12,type:i%6===0?'tuft':i%4===0?'pillar':'boulder',tint:rand()});
 }
 const green=(look?.get('forest').foliage||[[.33,.46,.29,1],[.39,.53,.34,1],[.25,.42,.32,1],[.42,.56,.35,1]]);
 const stone=[[.58,.55,.50,1],[.52,.51,.48,1],[.69,.65,.58,1],[.56,.53,.45,1]];
 const scenes={forest,clearing};
 // This is ENVIRONMENT GROUND, not extra tactical cells.
 // It remains beneath the exact 3x6 battle grid and stretches beyond the
 // camera/framing limits so trees and rocks never stand over a void.
 // Extend the ONE low-cost ground slab well past the entire fixed camera
 // frustum, including tall portrait phone view; no distant beige void.
 const groundWidth=Math.max(terrain.width+50,terrain.width+205),
  groundDepth=Math.max(terrain.depth+48,terrain.depth+205);
 // Keep the world floor BELOW the real 3D tile skirt, so the raised board
 // has space for genuine visible cast shadows rather than intersecting floor.
 const groundTop=terrain.topY-.80,groundThickness=1.50;
 const groundPalette={
  forest:look?.get('forest').ground||[.52,.635,.398,1],
  clearing:look?.get('clearing').ground||[.65,.585,.479,1]
 };
 function setScene(next){
  if(!scenes[next])throw Error('Unknown environment scene: '+next);
  scene=next;return scene;
 }
 function draw(now=0,{skipGround=false}={}){
  const pose=appearance?.('ground:'+scene,now)||{scale:1,opacity:1};
  if(!skipGround&&pose.opacity>.002&&pose.scale>.025){
   // The floor is one lightweight 3D solid. Top remains below tactical tiles.
   // A unified spring transform makes the WHOLE world enter/leave on switch.
   const k=pose.scale;
   cube(terrain.centerX,groundTop-groundThickness*.5*k,terrain.centerZ,
    groundWidth*k,groundThickness*k,groundDepth*k,groundPalette[scene],scene==='forest'?1:2);
  }
  for(const p of scenes[scene]){
   const pose=appearance?.(p.id,now)||{scale:1,opacity:1};
   if(pose.opacity<=.002||pose.scale<=.025)continue;
   // True ground pivot: every element of a rock/tree follows one joint scale.
   const y=groundTop,sc=p.scale*pose.scale;
   if(p.type==='shrub'||p.type==='tuft'){
    const bend=Math.sin(now*.58+p.x)*.018;
    const tint=p.type==='tuft'?[.62,.60,.37,1]:[.34,.52,.30,1];
    cube(p.x,y+.3*sc,p.z,.65*sc,.3*sc,.62*sc,tint);
    cube(p.x-.20*sc+bend,y+.48*sc,p.z,.5*sc,.38*sc,.52*sc,
     p.type==='tuft'?[.52,.57,.32,1]:[.39,.55,.31,1]);
    continue;
   }
   if(p.type==='boulder'){
    const col=stone[Math.floor(p.tint*4)%4];
    cube(p.x,y+.31*sc,p.z,1.18*sc,.58*sc,.87*sc,col,3);
    cube(p.x+.23*sc,y+.68*sc,p.z-.13*sc,.48*sc,.27*sc,.56*sc,
     stone[(Math.floor(p.tint*4)+1)%4],3);
    continue;
   }
   if(p.type==='pillar'){
    const col=stone[Math.floor(p.tint*4)%4];
    cube(p.x,y+.67*sc,p.z,.69*sc,1.34*sc,.66*sc,col,3);
    cube(p.x,y+1.33*sc,p.z,.91*sc,.14*sc,.84*sc,stone[(Math.floor(p.tint*4)+2)%4],3);
    continue;
   }
   cube(p.x,y+.44*sc,p.z,.24*sc,.88*sc,.24*sc,[.39,.28,.20,1],4);
   // Preserve three silhouette layers in a single genuine leaf mesh.
   renderGeom(crown,root.PaperchalkObjectAnchor.localAtRoot([p.x,y,p.z],sc,{T,S,mul}),
    green[Math.floor(p.tint*4)%4],null,false,null,0,1);
  }
 }
 return Object.freeze({
  draw,setScene,
  idsFor:which=>(scenes[which]||[]).map(p=>p.id),
  get scene(){return scene;},
  get propCount(){return scenes[scene].length;},
  get propIds(){return scenes[scene].map(p=>p.id);},
  get ground(){return {width:groundWidth,depth:groundDepth,top:groundTop,scene};}
 });
}
root.PaperchalkForestEnvironment=Object.freeze({version:'3.0.0',create});
})(window);

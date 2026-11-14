/* Procedural forest/stone-clearing biome presentation.
 * Two distinct sets of genuine world-space 3D mesh props. Scene switching
 * changes ONLY visual geometry; no terrain occupancy or battle logic changes.
 */
(function(root){
'use strict';
function create({terrain,makeGeom,renderGeom,mul,T,S,cube,appearance}){
 let seed=77049,scene='forest';
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const conifer=(radius,height,sides=8)=>{
  const v=[],ids=[];
  for(let i=0;i<sides;i++){
   const a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides;
   const p=[Math.cos(a)*radius,0,Math.sin(a)*radius],q=[Math.cos(b)*radius,0,Math.sin(b)*radius];
   const nx=Math.cos((a+b)/2),nz=Math.sin((a+b)/2);
   const n=Math.hypot(nx,height/(radius*2),nz)||1,k=v.length/8;
   for(const [x,y,z,uu,vv] of [[p[0],0,p[2],0,0],[q[0],0,q[2],1,0],[0,height,0,.5,1]])
    v.push(x,y,z,nx/n,.45,nz/n,uu,vv);
   ids.push(k,k+1,k+2);
  }return makeGeom(v,ids);
 };
 const crown=conifer(1,1.48,8);
 const halfW=terrain.width/2,halfD=terrain.depth/2;
 const forest=[],clearing=[];
 for(let i=0;i<30;i++){
  const side=i%4,edge=1.4+rand()*4.1;
  let x,z;
  if(side<2){x=(side===0?-1:1)*(halfW+edge);z=(rand()-.5)*(terrain.depth+8);}
  else{x=(rand()-.5)*(terrain.width+9);z=(side===2?-1:1)*(halfD+edge);}
  if(Math.abs(x)<halfW+1&&Math.abs(z)<halfD+1)continue;
  forest.push({id:'forest-prop-'+forest.length,x,z,scale:.72+rand()*.8,type:i%7===0?'shrub':'pine',tint:rand()});
 }
 // Different real geometry, not a recolored forest: stone stacks, pale rocks
 // and sparse grasses on the outside of the same legally playable grid.
 for(let i=0;i<27;i++){
  const side=i%4,edge=.8+rand()*3.7;
  let x,z;
  if(side<2){x=(side===0?-1:1)*(halfW+edge);z=(rand()-.5)*(terrain.depth+7);}
  else{x=(rand()-.5)*(terrain.width+8);z=(side===2?-1:1)*(halfD+edge);}
  if(Math.abs(x)<halfW+.55&&Math.abs(z)<halfD+.55)continue;
  clearing.push({id:'clearing-prop-'+clearing.length,x,z,
   scale:.67+rand()*1.12,type:i%6===0?'tuft':i%4===0?'pillar':'boulder',tint:rand()});
 }
 const green=[[.33,.46,.29,1],[.39,.53,.34,1],[.25,.42,.32,1],[.42,.56,.35,1]];
 const stone=[[.58,.55,.50,1],[.52,.51,.48,1],[.69,.65,.58,1],[.56,.53,.45,1]];
 const scenes={forest,clearing};
 function setScene(next){
  if(!scenes[next])throw Error('Unknown environment scene: '+next);
  scene=next;return scene;
 }
 function draw(now=0){
  for(const p of scenes[scene]){
   const pose=appearance?.(p.id,now)||{scale:1,opacity:1};
   if(pose.opacity<=.002||pose.scale<=.025)continue;
   // True ground pivot: every element of a rock/tree follows one joint scale.
   const y=terrain.topY-.36,sc=p.scale*pose.scale;
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
    cube(p.x,y+.31*sc,p.z,1.18*sc,.58*sc,.87*sc,col);
    cube(p.x+.23*sc,y+.68*sc,p.z-.13*sc,.48*sc,.27*sc,.56*sc,
     stone[(Math.floor(p.tint*4)+1)%4]);
    continue;
   }
   if(p.type==='pillar'){
    const col=stone[Math.floor(p.tint*4)%4];
    cube(p.x,y+.67*sc,p.z,.69*sc,1.34*sc,.66*sc,col);
    cube(p.x,y+1.33*sc,p.z,.91*sc,.14*sc,.84*sc,stone[(Math.floor(p.tint*4)+2)%4]);
    continue;
   }
   cube(p.x,y+.44*sc,p.z,.24*sc,.88*sc,.24*sc,[.39,.28,.20,1]);
   for(let layer=0;layer<3;layer++){
    const size=sc*(1.18-layer*.17),rise=sc*(.48+layer*.47);
    const m=mul(T(p.x,y+rise,p.z),S(size,size*.92,size));
    renderGeom(crown,m,green[(Math.floor(p.tint*4)+layer)%4]);
   }
  }
 }
 return Object.freeze({
  draw,setScene,
  idsFor:which=>(scenes[which]||[]).map(p=>p.id),
  get scene(){return scene;},
  get propCount(){return scenes[scene].length;},
  get propIds(){return scenes[scene].map(p=>p.id);}
 });
}
root.PaperchalkForestEnvironment=Object.freeze({version:'2.0.0',create});
})(window);

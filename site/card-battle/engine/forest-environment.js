/* Forest biome adapter: decorative world-space props outside the playable grid.
 * Does NOT own terrain, card slots, camera or game rules.
 * Procedural placeholders allow replacing props with authored 2D art later.
 */
(function(root){
'use strict';
function create({terrain,makeGeom,renderGeom,mul,T,S,cube}){
 let seed=77049;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const conifer=(radius,height,sides=8)=>{
  const v=[],ids=[];for(let i=0;i<sides;i++){
   const a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides;
   const p=[Math.cos(a)*radius,0,Math.sin(a)*radius],q=[Math.cos(b)*radius,0,Math.sin(b)*radius];
   const nx=Math.cos((a+b)/2),nz=Math.sin((a+b)/2),n=Math.hypot(nx,height/(radius*2),nz)||1,k=v.length/8;
   for(const [x,y,z,uu,vv] of [[p[0],0,p[2],0,0],[q[0],0,q[2],1,0],[0,height,0,.5,1]])v.push(x,y,z,nx/n,.45,nz/n,uu,vv);
   ids.push(k,k+1,k+2);
  }return makeGeom(v,ids);
 };
 const crown=conifer(1,1.48,8),props=[];
 const halfW=terrain.width/2,halfD=terrain.depth/2;
 for(let i=0;i<30;i++){
  const side=i%4,edge=1.4+rand()*4.1;
  let x,z;
  if(side<2){x=(side===0?-1:1)*(halfW+edge);z=(rand()-.5)*(terrain.depth+8);}
  else{x=(rand()-.5)*(terrain.width+9);z=(side===2?-1:1)*(halfD+edge);}
  // reserve a generous view corridor around the legal 3x6 playfield
  if(Math.abs(x)<halfW+1&&Math.abs(z)<halfD+1)continue;
  props.push({x,z,scale:.72+rand()*.8,type:i%7===0?'shrub':'pine',tint:rand()});
 }
 const green=[[.33,.46,.29,1],[.39,.53,.34,1],[.25,.42,.32,1],[.42,.56,.35,1]];
 function draw(now=0){
  for(const p of props){
   const y=terrain.topY-.36,sc=p.scale,base=T(p.x,y,p.z);
   if(p.type==='shrub'){
    const bend=Math.sin(now*.58+p.x)*.018;
    cube(p.x,y+.3*sc,p.z,.65*sc,.3*sc,.62*sc,[.34,.52,.30,1]);
    cube(p.x-.20*sc+bend,y+.48*sc,p.z,.5*sc,.38*sc,.52*sc,[.39,.55,.31,1]);
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
 return {draw,propCount:props.length};
}
root.PaperchalkForestEnvironment=Object.freeze({version:'1.0.0',create});
})(window);

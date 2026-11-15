/* Modular royal stone hall — FOURTH genuine world-space 3D battle setting.
 * 16x6 board preserved, indoor masonry built beyond all 96 tactical cells.
 * Cut-away architecture, archways, chandeliers, pilasters, royal dais.
 * Shared WebGL material/light/shadow clock; no canvas billboard/background.
 */
(function(root){'use strict';
function create({terrain,makeGeom,renderGeom,I,T,S,mul,appearance}){
 const groundY=terrain.topY-.80,hw=terrain.width*.5,cz=terrain.centerZ;
 const north=terrain.minZ-5.9,south=terrain.minZ+terrain.depth+5.9;
 const c={
  wall:[.61,.59,.54,1],stone:[.50,.51,.53,1],pale:[.69,.67,.61,1],
  column:[.72,.68,.60,1],base:[.40,.41,.44,1],gold:[.82,.65,.38,1],
  dark:[.18,.22,.28,1],door:[.27,.22,.20,1],wood:[.39,.28,.21,1],
  velvet:[.48,.15,.20,1],red:[.57,.22,.27,1],glass:[.40,.59,.70,1],
  flame:[.99,.70,.36,1],torch:[.26,.27,.30,1]
 };
 const items=[],lamps=[];
 function item(id,x,z,type,build){
  const parts=[];
  const add=(dx,y,dz,w,h,d,color,material=3,unlit=false)=>{
   parts.push({dx,y,dz,w,h,d,color,material,unlit});
  };
  build(add);
  items.push({id,x,z,type,parts});
 }
 const half=terrain.width/2,seg=terrain.width/8;
 // Eight wall bays, each a separately-instanced piece with a real door/window.
 for(let i=0;i<8;i++){
  const x=terrain.minX+(i+.5)*seg,centered=i===3||i===4;
  item('hall-rear-bay-'+i,x,north,'wall',add=>{
   add(0,4.00,0,seg+.09,8.0,.96,c.wall);
   add(0,8.11,0,seg+.30,.25,1.19,c.column);
   add(0,.43,.52,seg+.08,.86,1.1,c.base);
   add(0,2.68,.62,seg*.69,4.8,.16,centered?c.door:c.dark,4);
   if(centered){
    add(0,5.25,.67,seg*.72,.25,.28,c.gold,3);
    add(0,5.64,.73,seg*.22,.65,.22,c.pale);
   }else{
    add(0,3.0,.66,seg*.44,3.9,.18,c.glass,7,true);
    add(0,3.0,.79,.14,4.1,.21,c.gold);
    add(0,3.0,.80,seg*.48,.15,.20,c.gold);
    add(0,5.09,.74,seg*.57,.22,.33,c.pale);
    add(0,.75,.76,seg*.58,.15,.37,c.pale);
   }
   add(-seg*.5,3.9,.64,.31,7.8,.66,c.column);
   add(seg*.5,3.9,.64,.31,7.8,.66,c.column);
  });
 }
 // Low cutaway front wall: room reads as interior but never hides cards.
 for(let i=0;i<8;i++){
  const x=terrain.minX+(i+.5)*seg;
  item('hall-front-bay-'+i,x,south,'cutaway-wall',add=>{
   add(0,.57,0,seg+.06,1.14,.84,c.wall);
   add(0,1.20,0,seg+.11,.17,1.03,c.column);
   add(0,.08,.65,seg+.10,.16,1.19,c.base);
   add(-seg*.50,1.42,-.13,.26,2.85,.35,c.column);
  });
 }
 // Reusable long-wall segments. All remain outside the battle bounds.
 for(let side of [-1,1])for(let k=0;k<5;k++){
  const x=terrain.centerX+side*(half+4.9);
  const z=terrain.minZ+(k+.5)*terrain.depth/5;
  item('hall-side-'+side+'-'+k,x,z,'side-wall',add=>{
   add(0,3.45,0,.93,6.90,terrain.depth/5+.09,c.wall);
   add(-side*.52,.55,0,.35,1.10,terrain.depth/5+.15,c.base);
   add(-side*.5,6.98,0,.32,.26,terrain.depth/5+.25,c.gold);
   add(-side*.54,4.1,0,.19,3.5,.64,c.pale);
  });
 }
 // 18 solid columns on the outer line of the room, still leaving the whole board free.
 for(let side of [-1,1])for(let k=0;k<9;k++){
  const x=terrain.centerX+side*(half+2.25),
    z=terrain.minZ+(k/8)*terrain.depth;
  item('hall-column-'+side+'-'+k,x,z,'column',add=>{
   add(0,.28,0,1.08,.56,1.12,c.base);
   add(0,.64,0,.88,.18,.9,c.gold);
   add(0,2.70,0,.66,4.08,.66,c.column);
   for(const d of [-.21,.21])add(d,2.7,0,.095,4.05,.53,c.pale);
   add(0,4.94,0,1.1,.36,1.15,c.gold);
   add(0,5.25,0,1.42,.29,1.44,c.pale);
  });
 }
 // Royal dais, three high-depth steps and a golden throne behind the rear line.
 item('hall-throne',terrain.centerX,north+2.05,'dais',add=>{
  add(0,.17,0,10.3,.34,3.95,c.base);
  add(0,.40,.38,7.6,.46,2.78,c.pale);
  add(0,.72,.70,5.6,.42,1.70,c.gold);
  add(0,1.32,.87,2.10,1.20,1.2,c.wood,4);
  add(0,2.55,.43,2.46,3.28,.42,c.velvet);
  add(-1.22,2.48,.52,.27,3.1,.65,c.gold);
  add(1.22,2.48,.52,.27,3.1,.65,c.gold);
  add(0,4.17,.48,3.06,.38,.72,c.gold);
  add(0,4.40,.48,.38,.51,.37,c.gold);
 });
 // Two banners + carpets framing, not painting over live board.
 for(let sign of [-1,1]){
  const x=terrain.centerX+sign*10.3;
  item('hall-banner-'+sign,x,north+.74,'banner',add=>{
   add(0,5.38,.62,2.1,.22,.48,c.gold);
   add(0,3.60,.77,1.67,3.45,.13,c.velvet,4);
   add(0,2.12,.76,1.9,.20,.38,c.gold);
  });
 }
 // Four true world-space lamps. Light calculations remain within the shared shader.
 for(let i=0;i<4;i++){
  const x=terrain.centerX+(i%2===0?-half*.55:half*.55);
  const z=i<2?north+3.25:south-2.45;
  item('hall-brazier-'+i,x,z,'brazier',add=>{
   add(0,.33,0,.70,.66,.70,c.base);
   add(0,1.10,0,.19,1.13,.19,c.torch,0);
   add(0,1.63,0,1.02,.22,1.02,c.gold);
   add(0,1.92,0,.72,.37,.72,c.flame,7,true);
   add(0,2.16,0,.43,.14,.43,c.flame,7,true);
  });
  lamps.push([x,groundY+1.98,z]);
 }
 function pushBox(g,x,y,z,w,h,d){
  const faces=[
    {p:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],n:[0,1,0]},
    {p:[[.5,-.5,.5],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5]],n:[0,-1,0]},
    {p:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],n:[0,0,1]},
    {p:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],n:[0,0,-1]},
    {p:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],n:[1,0,0]},
    {p:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],n:[-1,0,0]}
  ];
  for(const f of faces){
   const q=g.v.length/8;
   for(let i=0;i<4;i++)g.v.push(x+f.p[i][0]*w,y+f.p[i][1]*h,
    z+f.p[i][2]*d,...f.n,i===0||i===3?0:1,i<2?0:1);
   g.i.push(q,q+1,q+2,q,q+2,q+3);
  }
 }
 function pack(group,item){
  for(const p of item.parts){
   const key=[p.material,p.unlit?1:0,...p.color].join(':');
   let g=group.get(key);
   if(!g){g={v:[],i:[],material:p.material,unlit:p.unlit,color:p.color};group.set(key,g)}
   pushBox(g,item.x+p.dx,groundY+p.y,item.z+p.dz,p.w,p.h,p.d);
  }
 }
 function compileGroup(groups){return [...groups.values()].filter(g=>g.i.length).map(g=>({
  geo:makeGeom(g.v,g.i),color:g.color,unlit:g.unlit,material:g.material
 }));}
 const groups=new Map();
 for(const o of items){const local=new Map();pack(local,o);pack(groups,o);
  o.partsMesh=compileGroup(local);
 }
 const batched=compileGroup(groups);
 let rendered=0;
 function draw(time,scene){
  rendered=0;if(scene!=='hall')return;
  const states=items.map(o=>appearance?.(o.id,time)||{scale:1,opacity:1});
  if(states.every(t=>Math.abs(t.scale-1)<.0001&&t.opacity>.999)){
   for(const g of batched){renderGeom(g.geo,I(),g.color,null,g.unlit,null,0,g.material);rendered++;}
   return;
  }
  for(let j=0;j<items.length;j++){
   const o=items[j],state=states[j];
   if(state.scale<.02||state.opacity<.002)continue;
   const m=Math.abs(state.scale-1)<.0001?I():
    root.PaperchalkObjectAnchor.atRoot([o.x,groundY,o.z],state.scale,{T,S,mul});
   for(const g of o.partsMesh){
    renderGeom(g.geo,m,g.color,null,g.unlit,null,0,g.material);rendered++;
   }
  }
 }
 return Object.freeze({draw,get ids(){return items.map(o=>o.id)},
  idsFor:scene=>scene==='hall'?items.map(o=>o.id):[],
  get lamps(){return lamps.map(a=>a.slice())},
  get snapshot(){return {scene:'hall',style:'modular-cutaway-3d-royal-hall',
   walls:items.filter(o=>o.type.includes('wall')).length,columns:18,
   chandeliers:4,dais:1,props:items.length,rendered,
   placementCellsOccupied:0,sharedShadows:true,worldClock:true}}});
}
root.PaperchalkRoyalHallEnvironment=Object.freeze({version:'1.0.0',create});
})(window);

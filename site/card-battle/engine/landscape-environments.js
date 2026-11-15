/* Large, seamless 3D battle environments: coast, cliff, open ocean, cave.
 * All modes use the SAME live WebGL renderer, shadow map and world clock.
 * The existing 16x6 tactical cells are retained; each biome's REAL surface
 * fills those 96 cells (sand, cliff rock, ship deck, cave stone).
 * No prebuilt bridges, no facility impostors, no outside-the-board-only arena.
 */
(function(root){'use strict';
function create({terrain,makeGeom,renderGeom,I,T,S,mul,appearance,cube}){
 const W=terrain.width,D=terrain.depth,cx=terrain.centerX,cz=terrain.centerZ;
 const minX=terrain.minX,maxX=minX+W,minZ=terrain.minZ,maxZ=minZ+D;
 const floorY=terrain.topY-.80;
 const colors={
  sand:[.67,.61,.48,1],paleSand:[.75,.69,.55,1],dune:[.62,.57,.43,1],
  surf:[.64,.81,.81,1],water:[.19,.43,.54,1],deep:[.12,.34,.47,1],
  rock:[.41,.42,.42,1],rock2:[.48,.48,.46,1],rock3:[.32,.36,.40,1],
  shale:[.38,.39,.43,1],grass:[.40,.47,.32,1],pine:[.28,.39,.32,1],
  wood:[.44,.30,.23,1],plank:[.55,.39,.29,1],hull:[.24,.26,.28,1],
  railing:[.64,.48,.30,1],rope:[.64,.57,.45,1],
  cave:[.33,.34,.38,1],cave2:[.43,.42,.42,1],crystal:[.32,.57,.61,1],
  glow:[.59,.81,.79,1],stone:[.51,.50,.47,1],moss:[.35,.45,.36,1]
 };
 const map={coast:[],cliff:[],ocean:[],cave:[]};
 const lights={coast:[],cliff:[],ocean:[],cave:[]};
 const roof={};
 function part(scene,id,x,z,group,fn){
  const pieces=[];
  const put=(dx,dy,dz,w,h,d,color,material=3,unlit=false)=>{
   if(!(w>0&&h>0&&d>0))return;
   pieces.push({dx,dy,dz,w,h,d,color,material,unlit});
  };
  fn(put);
  map[scene].push({id,x,z,group,pieces});
 }
 // A box with real triangles and face normals (UVs in the same 8-float
 // format as the existing shared WebGL1 vertex buffer).
 const faces=[
  {v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],n:[0,1,0]},
  {v:[[.5,-.5,.5],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5]],n:[0,-1,0]},
  {v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],n:[0,0,1]},
  {v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],n:[0,0,-1]},
  {v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],n:[1,0,0]},
  {v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],n:[-1,0,0]}
 ];
 function box(g,x,y,z,w,h,d){
  for(const f of faces){
   const b=g.v.length/8;
   for(let n=0;n<4;n++){
    const v=f.v[n];g.v.push(x+v[0]*w,y+v[1]*h,z+v[2]*d,...f.n,
     n===0||n===3?0:1,n<2?0:1);
   }
   g.i.push(b,b+1,b+2,b,b+2,b+3);
  }
 }
 function compile(groups){
  return [...groups.values()].filter(g=>g.i.length).map(g=>({
   mesh:makeGeom(g.v,g.i),color:g.color,material:g.material,unlit:g.unlit
  }));
 }
 function append(groups,o){
  for(const p of o.pieces){
   const key=[p.material,p.unlit?1:0,...p.color].join(',');
   let g=groups.get(key);
   if(!g){
    g={v:[],i:[],material:p.material,unlit:p.unlit,color:p.color};
    groups.set(key,g);
   }
   box(g,o.x+p.dx,floorY+p.dy,o.z+p.dz,p.w,p.h,p.d);
  }
 }
 function boulder(scene,id,x,z,size,high=1,tint=colors.rock){
  part(scene,id,x,z,'boulder',put=>{
   put(0,size*.27,0,size*.92,size*.52,size*.74,tint);
   put(-size*.16,size*.53,-size*.12,size*.54,size*.38,size*.46,colors.rock2);
   put(size*.19,size*.19,size*.23,size*.46,size*.27,size*.45,colors.rock3);
   if(high>1)put(0,size*.85,0,size*.33,size*.55,size*.34,colors.shale);
  });
 }
 // ─── COAST: THE TACTICAL BOARD IS A REAL SAND BEACH ────────────────
 // The 16x6 tile mesh itself receives the sand material from the game engine.
 // Outboard 3D shore joins without a decorative wooden bridge.
 for(let i=0;i<14;i++){
  const x=minX+(i+.5)*W/14,z=minZ-1.2-(i%3)*.23;
  part('coast','coast-foam-'+i,x,z,'surf',put=>{
   put(0,.40,0,W/14+.05,.055,.92+(i%3)*.18,colors.surf,9);
   put(0,.25,-1.08,W/14+.06,.10,1.28,colors.water,9);
  });
 }
 for(let j=0;j<5;j++)for(let i=0;i<14;i++){
  const x=minX+(i+.5)*W/14,z=minZ-4.0-(j+.5)*11;
  part('coast','coast-sea-'+j+'-'+i,x,z,'water',put=>{
   put(0,.14,0,W/14+.035,.21,11.05,
    colors.water,9);
  });
 }
 // Sand dunes near the two flanks and the landward perimeter.
 for(let side of [-1,1])for(let i=0;i<12;i++){
  const x=cx+side*(W*.5+2.5+(i%3)*2.2);
  const z=minZ+1.1+(i*.73%Math.max(1,D-2));
  part('coast','coast-dune-'+side+'-'+i,x,z,'dune',put=>{
   const h=.55+(i%4)*.26;
   put(0,h*.5,0,3.2,h,3.25,i%3?colors.dune:colors.paleSand,2);
   put(-side*.42,h+.12,.44,1.2,.24,1.58,colors.sand,2);
  });
 }
 for(let i=0;i<20;i++){
  const side=i%2===0?-1:1;
  const x=cx+side*(W*.5+5.5+(i%3)*2);
  const z=minZ-13+(i*2.29)%(D+16);
  boulder('coast','coast-sea-rock-'+i,x,z,1.4+(i%5)*.36);
 }
 // Remote island headlands are real 3D masses, not one flat background.
 for(let i=0;i<9;i++){
  const x=cx+(i-4)*10.8,z=minZ-45-(i%3)*8.2;
  part('coast','coast-island-'+i,x,z,'island',put=>{
   const h=2+(i%5)*1.5;
   put(0,h*.43,0,8.4,h,5.8,colors.rock3);
   put(-.7,h+.18,.45,6.2,.46,4.4,colors.grass,1);
  });
 }
 // ─── CLIFF: AN ELEVATED ROCK PLATEAU OVER A DEEP CHASM ─────────────
 // The playable 16x6 tile top remains the walkable plateau; 3D outer faces
 // show 10–19 world-unit drops and real platforms (not painted gradients).
 for(let k=0;k<16;k++){
  const x=minX+(k+.5)*terrain.tileW,z=minZ-2.8;
  part('cliff','cliff-rim-'+k,x,z,'edge',put=>{
   const depth=12+(k%5)*1.45;
   put(0,-depth*.5+.35,0,terrain.tileW+.07,depth,5.4,
    [colors.rock,colors.rock2,colors.shale][k%3]);
   put(0,.08,1.25,terrain.tileW+.08,.22,2.25,colors.stone);
   put(.32,-depth+.84,-2.25,terrain.tileW*.65,1.3,1.4,colors.rock3);
  });
 }
 // The near (camera-facing) rim is a genuine vertical precipice.
 // Without its frontal face a top-down screenshot looks like a flat checker.
 for(let k=0;k<16;k++){
  const x=minX+(k+.5)*terrain.tileW,z=maxZ+2.0;
  part('cliff','cliff-near-face-'+k,x,z,'precipice',put=>{
   const drop=11+(k%6)*1.3;
   put(0,-drop*.5+.23,0,terrain.tileW+.055,drop,3.8,
    [colors.rock3,colors.rock,colors.shale][k%3]);
   put(0,.07,-1.3,terrain.tileW+.06,.24,1.7,colors.stone);
   put(.32,-drop*.66,1.16,terrain.tileW*.47,2.1,1.18,colors.rock2);
  });
 }
 for(const side of [-1,1])for(let k=0;k<8;k++){
  const x=cx+side*(W*.5+2.3),z=minZ+(k+.5)*D/8;
  part('cliff','cliff-flank-'+side+'-'+k,x,z,'wall',put=>{
   const drop=11+(k%4)*2.0;
   put(0,-drop*.5+.45,0,4.5,drop,D/8+.11,colors.rock3);
   put(-side*.42,.06,0,1.0,.22,D/8+.12,colors.stone);
   put(side*.9,-drop*.35,.3,2.15,2.9,1.45,colors.rock2);
  });
 }
 for(let i=0;i<24;i++){
  const x=cx+(i%8-3.5)*10.7,z=minZ-32-Math.floor(i/8)*15;
  part('cliff','mountain-valley-'+i,x,z,'mountain',put=>{
   const h=4+(i*7%9)*1.5;
   put(0,h*.5-4.5,0,6.4,h,7.6,[colors.rock3,colors.shale][i%2]);
   put(0,h-4.5+.16,0,3.7,.32,4.5,colors.rock);
  });
 }
 for(let i=0;i<13;i++){
  const side=i%2?-1:1,x=cx+side*(W*.5+1.2+i%3),z=minZ+(i*2.35)%D;
  boulder('cliff','cliff-debris-'+i,x,z,.8+(i%4)*.45,i%3===0?2:1);
 }
 // ─── OCEAN: SHIP-DECK TACTICAL ARENA SURROUNDED BY 3D SEA ─────────
 // The board material is planked decking, not a fake water tile that units
 // impossibly stand on; surrounding water is actual 3D ocean geometry.
 for(let row=0;row<10;row++)for(let col=0;col<10;col++){
  const x=cx+(col-4.5)*18,z=cz+(row-4.5)*17;
  part('ocean','open-ocean-'+row+'-'+col,x,z,'sea',put=>{
   put(0,.10,0,18.05,.23,17.05,
    colors.deep,9);
  });
 }
 // Real hull foundation wraps the actual 16x6 deck and sides; nothing
 // occupies the playable card tiles.
 part('ocean','ship-hull',cx,cz,'ship',put=>{
  put(0,-2.45,0,W+2.4,4.10,D+4.4,colors.hull,4);
  put(0,-.14,0,W+1.0,.38,D+1.6,colors.wood,4);
  for(let i=0;i<9;i++){
   const x=(i-4)*W/9;
   put(x,.20,0,.09,.09,D+1.4,colors.plank,4);
  }
  for(let j=0;j<7;j++){
   const z=(j-3)*D/7;
   put(0,.23,z,W+.7,.08,.11,colors.wood,4);
  }
 });
 for(let side of [-1,1])for(let k=0;k<11;k++){
  const z=minZ+(k+.5)*D/11;
  part('ocean','ship-railing-'+side+'-'+k,cx+side*(W*.5+1.2),z,'railing',put=>{
   put(0,.65,0,.24,1.30,.25,colors.wood,4);
   put(0,1.3,0,.43,.12,D/11+.18,colors.railing,4);
  });
 }
 for(const k of [-1,1]){
  part('ocean','ship-bow-'+k,cx,cz+k*(D*.5+3.5),'prow',put=>{
   put(0,-.45,0,W*.64,1.7,5.8,colors.hull,4);
   put(0,.45,0,W*.54,.35,4.9,colors.plank,4);
  });
 }
 // Two side masts are beyond the playable area so the camera keeps cards
 // unobstructed. Sail shapes remain flat 3D cloth, not sprites.
 for(const side of [-1,1]){
  const x=cx+side*(W*.5+4.6),z=cz+side*2.1;
  part('ocean','ship-mast-'+side,x,z,'mast',put=>{
   put(0,7.0,0,.54,14,.54,colors.wood,4);
   put(0,11.4,0,7.9,.19,.26,colors.wood,4);
   put(0,7.1,.10,7.0,7.6,.08,colors.rope,4);
   put(0,13.0,0,1.0,.35,.26,colors.railing,4);
  });
 }
 // ─── CAVE: REAL INTERIOR 3D WALLS, ROOF SHADOW AND CAVERN EXIT ──────
  for(let side of [-1,1])for(let k=0;k<10;k++){
  const x=cx+side*(W*.5+3.6),z=minZ+(k+.5)*D/10;
  part('cave','cave-wall-'+side+'-'+k,x,z,'wall',put=>{
   const h=7.8+(k%4)*.62;
   put(0,h*.5,0,5.2,h,D/10+.40,k%3===0?colors.cave2:colors.cave);
   put(-side*.42,1.15,.2,2.15,2.4,D/10*.77,colors.rock3);
   put(0,h+.55,0,5.8,.62,D/10+.47,colors.shale);
   const drip=(k%5)*.44+.75;
   put(-side*1.25,h-drip*.49,-.20,.52,drip,.46,colors.stone);
  });
 }
 for(let k=0;k<16;k++){
  const x=minX+(k+.5)*terrain.tileW;
  part('cave','cave-back-'+k,x,minZ-4.3,'wall',put=>{
   const gate=k===7||k===8;
   if(gate){
    put(0,7.0,0,terrain.tileW+.05,1.85,5.1,colors.cave2);
    put(-terrain.tileW*.45,3.6,0,.35,5.4,5.1,colors.cave);
    put(terrain.tileW*.45,3.6,0,.35,5.4,5.1,colors.cave);
   }else{
    put(0,4.0,0,terrain.tileW+.06,8.0,5.1,
     k%4===0?colors.rock2:colors.cave);
    put(0,7.9,0,terrain.tileW+.09,1.1,6.0,colors.shale);
   }
  });
 }
 for(let i=0;i<21;i++){
  const side=i%2?-1:1;
  const x=cx+side*(W*.5+1.65+(i%3)*.18);
  const z=minZ+(i*2.67)%D;
  part('cave','cave-stalagmite-'+i,x,z,'stalagmite',put=>{
   const h=1.05+(i%6)*.34;
   put(0,h*.35,0,.90,h*.70,.91,colors.stone);
   put(0,h*.78,0,.54,h*.62,.60,colors.rock2);
   put(0,h*1.15,0,.22,h*.36,.25,colors.cave2);
  });
 }
 for(let i=0;i<4;i++){
  const x=cx+(i%2?-W*.31:W*.31),
   z=cz+(i<2?-D*.45:D*.45);
  part('cave','cave-crystal-'+i,x,z,'crystal',put=>{
   put(0,.38,0,.77,.75,.76,colors.cave2);
   put(0,1.15,0,.45,1.5,.50,colors.crystal,7,true);
   put(.35,.84,.25,.21,1.0,.18,colors.glow,7,true);
  });
  lights.cave.push([x,floorY+1.3,z]);
 }
 // Roof casts REAL shadow in the existing depth pass but is hidden in
 // the color pass for the overhead battle camera (same as royal hall).
 roof.cave=()=>cube(cx,floorY+9.35,cz,W+12,.75,D+11,
  [1,1,1,1],3);

 const compiled={};let drawn=0,lastScene=null;
 for(const name of Object.keys(map)){
  const groups=new Map();
  for(const o of map[name]){
   const local=new Map();append(local,o);append(groups,o);
   o.meshes=compile(local);
  }
  compiled[name]=compile(groups);
 }
 function draw(t,scene){
  drawn=0;lastScene=scene;
  if(!map[scene])return;
  const arr=map[scene];
  const poses=arr.map(o=>appearance?.(o.id,t)||{scale:1,opacity:1});
  if(poses.every(p=>Math.abs(p.scale-1)<.0001&&p.opacity>.999)){
   for(const g of compiled[scene]){
    renderGeom(g.mesh,I(),g.color,null,g.unlit,null,0,g.material);drawn++;
   }
   return;
  }
  for(let i=0;i<arr.length;i++){
   const o=arr[i],p=poses[i];if(p.opacity<.002||p.scale<.025)continue;
   const m=Math.abs(p.scale-1)<.0001?I():
    root.PaperchalkObjectAnchor.atRoot([o.x,floorY,o.z],p.scale,{T,S,mul});
   for(const g of o.meshes){
    renderGeom(g.mesh,m,g.color,null,g.unlit,null,0,g.material);drawn++;
   }
  }
 }
 return Object.freeze({
  draw,
  drawRoofShadow:scene=>{if(roof[scene])roof[scene]()},
  idsFor:scene=>map[scene]?map[scene].map(o=>o.id):[],
  lampsFor:scene=>lights[scene]?lights[scene].map(p=>p.slice()):[],
  get snapshot(){return {
   scene:lastScene,biomes:Object.keys(map),
   coast:{sandBattlefield:true,shorelineModules:14,seaModules:70,bridgeCount:0},
   cliff:{elevatedBattlefield:true,dropHeight:[11,19],edgeModules:32},
   ocean:{deckBattlefield:true,seaModules:100,shipHulls:1,bridgeCount:0},
   cave:{stoneBattlefield:true,walls:36,crystalLamps:4,roofShadowOnly:true},
   drawn,lastPassDrawCalls:drawn,
   changesTacticalSlots:false,usesSharedWebGL:true,usesWorldClock:true
  }}
 });
}
root.PaperchalkLandscapeEnvironments=Object.freeze({version:'1.0.0',create});
})(window);

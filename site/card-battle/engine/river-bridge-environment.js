/* RIVERSIDE WOODEN BRIDGE: fifth modular 3D battlefield environment.
 * Stage 16x6 remains EXACTLY unchanged. The water, shore and bridge live
 * beyond the rear playable boundary and share the same WebGL/shadow/time.
 * All objects use stable world-space geometry, material batching and
 * per-prop scene-transition roots; no flat AI-generated background image.
 */
(function(root){'use strict';
function create({terrain,makeGeom,renderGeom,I,T,S,mul,appearance}){
 const minZ=terrain.minZ,centerX=terrain.centerX,waterY=terrain.topY-1.04;
 const far=minZ-14.65,near=minZ-1.10;
 const c={
  water:[.21,.46,.59,1],water2:[.24,.50,.64,1],water3:[.17,.42,.57,1],
  bank:[.46,.47,.39,1],earth:[.37,.36,.31,1],grass:[.36,.49,.29,1],
  brush:[.27,.41,.24,1],reed:[.56,.59,.34,1],stone:[.53,.55,.52,1],
  darkStone:[.40,.44,.46,1],wood:[.49,.32,.21,1],woodLight:[.59,.41,.26,1],
  posts:[.38,.28,.21,1],iron:[.26,.29,.31,1],foam:[.56,.76,.78,1]
 };
 const props=[];
 const addProp=(id,x,z,type,fn)=>{
  const parts=[],add=(dx,y,dz,w,h,d,col,mat=3,unlit=false)=>
   parts.push({dx,y,dz,w,h,d,col,mat,unlit});
  fn(add);props.push({id,x,z,type,parts});
 };
 // Six water strips run along X. Their material uses real-time shader ripples.
 // They are real horizontal 3D receivers, not painted texture behind the board.
 for(let r=0;r<6;r++)for(let col=0;col<8;col++){
  const x=terrain.minX+(col+.5)*terrain.width/8;
  const z=far+(r+.5)*(near-far)/6;
  addProp('river-water-'+r+'-'+col,x,z,'water',add=>{
   add(0,0,0,terrain.width/8+.018,.15,(near-far)/6+.025,
    [c.water,c.water2,c.water3][(r+col)%3],9);
   // Submerged stones at selected patches show true water depth.
   if((col*5+r*7)%17===0)add(.40,-.16,.25,1.32,.43,.85,c.darkStone);
  });
 }
 // Two banks, real 3D terraces and natural stone retaining edges.
 for(let col=0;col<16;col++){
  const x=terrain.minX+(col+.5)*terrain.tileW;
  for(let shore=0;shore<2;shore++){
   const z=shore===0?near+.28:far-.80;
   addProp('river-bank-'+shore+'-'+col,x,z,'shore',add=>{
    add(0,.13,0,terrain.tileW+.045,1.80,2.16,c.earth);
    add(0,1.09,0,terrain.tileW+.045,.20,2.18,c.grass);
    add(0,.41,shore===0?-.88:.88,terrain.tileW,.75,.36,c.stone);
    if(col%3===0)add(.62,1.27,shore===0?.54:-.54,.60,.23,.48,c.brush);
   });
  }
 }
 // Low angular rocks and grassy drift along both banks, well off board.
 for(let i=0;i<26;i++){
  const x=terrain.minX+.55+(i*1.917% (terrain.width-1));
  const shore=i%2===0?near+.96:far-1.4;
  addProp('river-rock-'+i,x,shore,'rock',add=>{
   const w=.53+(i%5)*.11;
   add(0,.63,0,w,.33,w*.89,i%3?c.stone:c.darkStone);
   if(i%3===0)add(.25,1.00,.18,.09,.73,.09,c.reed,1);
  });
 }
 // Bridge crosses Z over actual river water and connects both shorelines.
 const crossingLength=near-far+3.25,steps=26,bridgeWidth=5.35;
 for(let j=0;j<steps;j++){
  const z=far-1.3+(j+.5)*crossingLength/steps;
  const t=(j+.5)/steps;
  const arch=Math.sin(Math.PI*t)*.39;
  const y=waterY+1.44+arch;
  addProp('river-bridge-plank-'+j,centerX,z,'plank',add=>{
   add(0,y-waterY,0,bridgeWidth,.20,crossingLength/steps-.035,
     j%3===0?c.woodLight:c.wood,4);
   add(0,y-waterY-.14,0,bridgeWidth-.45,.13,crossingLength/steps-.035,c.posts,4);
  });
 }
 // Structural bridge stringers, balustrades and lower pier supports.
 for(const side of [-1,1]){
  addProp('river-bridge-stringer-'+side,centerX+side*(bridgeWidth*.5-.22),
   (near+far)/2,'stringer',add=>{
    add(0,1.00,0,.34,.34,crossingLength-.45,c.posts,4);
  });
  for(let j=0;j<=9;j++){
   const t=j/9,z=far-1.3+t*crossingLength,arch=Math.sin(Math.PI*t)*.39;
   const x=centerX+side*(bridgeWidth*.5-.12),baseY=waterY+1.44+arch;
   addProp('river-rail-'+side+'-'+j,x,z,'rail',add=>{
    add(0,baseY-waterY+.60,0,.24,1.16,.24,c.posts,4);
    add(0,baseY-waterY+1.17,0,.45,.14,.43,c.woodLight,4);
   });
  }
  addProp('river-upper-rail-'+side,centerX+side*(bridgeWidth*.5-.12),
   (far+near)/2,'rail',add=>{
    add(0,2.49,0,.18,.16,crossingLength-.4,c.woodLight,4);
    add(0,1.88,0,.12,.12,crossingLength-.6,c.wood,4);
  });
 }
 for(const z of [far+2.9,near-2.7]){
  for(const side of [-1,1]){
   addProp('river-support-'+z+'-'+side,centerX+side*1.7,z,'support',add=>{
    add(0,.70,0,.65,1.50,.70,c.stone);
    add(0,1.49,0,.92,.17,.88,c.darkStone);
   });
  }
 }
 // Far-shore silhouettes provide depth without blocking the play surface.
 for(let i=0;i<11;i++){
  const x=terrain.minX+(i+.5)*terrain.width/11;
  const z=far-5.3-(i%3)*1.35;
  addProp('river-pine-'+i,x,z,'tree',add=>{
   const height=3.3+(i%4)*.40;
   add(0,height*.46,0,.29,height*.92,.31,c.earth,4);
   for(let p=0;p<3;p++)
    add(0,height*.78+p*.56,0,1.7-p*.35,1.1,1.5-p*.30,c.brush,1);
  });
 }
 function addBox(g,x,y,z,w,h,d){
  const sides=[
   [[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5],[0,1,0]],
   [[.5,-.5,.5],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[0,-1,0]],
   [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5],[0,0,1]],
   [[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[0,0,-1]],
   [[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[1,0,0]],
   [[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-1,0,0]]
  ];
  for(const side of sides){
   const q=g.v.length/8;
   for(let j=0;j<4;j++)g.v.push(x+side[j][0]*w,y+side[j][1]*h,z+side[j][2]*d,
    ...side[4],j===0||j===3?0:1,j<2?0:1);
   g.i.push(q,q+1,q+2,q,q+2,q+3);
  }
 }
 function accumulate(groups,o){
  for(const p of o.parts){
   const key=[p.mat,p.unlit?1:0,...p.col].join('/');
   let g=groups.get(key);
   if(!g){g={v:[],i:[],col:p.col,mat:p.mat,unlit:p.unlit};groups.set(key,g)}
   addBox(g,o.x+p.dx,waterY+p.y,o.z+p.dz,p.w,p.h,p.d);
  }
 }
 const compile=m=>[...m.values()].map(g=>({geo:makeGeom(g.v,g.i),...g}));
 const full=new Map();
 for(const o of props){const groups=new Map();accumulate(groups,o);accumulate(full,o);
  o.geos=compile(groups);
 }
 const batch=compile(full);
 let drawCalls=0;
 function draw(time,scene){
  drawCalls=0;
  if(scene!=='river')return;
  const sampled=props.map(o=>appearance?.(o.id,time)||{scale:1,opacity:1});
  if(sampled.every(v=>Math.abs(v.scale-1)<.0001&&v.opacity>.999)){
   for(const g of batch){renderGeom(g.geo,I(),g.col,null,g.unlit,null,0,g.mat);drawCalls++}
   return;
  }
  for(let i=0;i<props.length;i++){
   const o=props[i],v=sampled[i];
   if(v.scale<.02||v.opacity<.002)continue;
   const m=Math.abs(v.scale-1)<.0001?I():
    root.PaperchalkObjectAnchor.atRoot([o.x,waterY,o.z],v.scale,{T,S,mul});
   for(const g of o.geos){renderGeom(g.geo,m,g.col,null,g.unlit,null,0,g.mat);drawCalls++}
  }
 }
 const ids=props.map(o=>o.id);
 return Object.freeze({draw,idsFor:scene=>scene==='river'?ids:[],
  get snapshot(){return {scene:'river',type:'3d-riverside-bridge',
   bridgePlanks:steps,waterPatches:48,shoreSegments:32,
   supportPiers:4,railPosts:20,farShoreTrees:11,
   materialWater:9,sharedShadows:true,sharedWorldClock:true,
   cardGrid:'16x6-unchanged',playableTilesOccupied:0,drawCalls}}});
}
root.PaperchalkRiverBridgeEnvironment=Object.freeze({version:'1.0.0',create});
})(window);

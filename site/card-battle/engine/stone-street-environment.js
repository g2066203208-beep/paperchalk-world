/* Night masonry street: a real, modular WebGL world-space environment.
 * Uses the same cube renderer, material atlas, shadows, card board and
 * per-object scene transition lifecycle as the existing forest/clearing.
 * Everything stays outside the 16x6 gameplay grid.
 */
(function(root){'use strict';
function create({terrain,cube,appearance}){
 const y=terrain.topY-.80,north=terrain.minZ-5.30,south=terrain.minZ+terrain.depth+5.30;
 const c={
  wall:[.55,.54,.49,1],plaster:[.43,.45,.46,1],slate:[.28,.32,.37,1],
  old:[.36,.38,.38,1],sand:[.62,.55,.43,1],trim:[.22,.24,.27,1],
  roof:[.24,.29,.33,1],ridge:[.34,.36,.38,1],door:[.24,.21,.19,1],
  dark:[.10,.13,.17,1],lit:[.85,.61,.34,1],iron:[.19,.22,.25,1],
  paving:[.32,.35,.38,1],curb:[.46,.46,.43,1]
 };
 const objects=[],lamps=[];
 function item(id,x,z,kind,build){
  const parts=[],add=(dx,py,dz,w,h,d,col,mat=3,unlit=false)=>
   parts.push({dx,py,dz,w,h,d,col,mat,unlit});
  build(add);objects.push({id,x,z,kind,parts});
 }
 const columns=[-19,-12.5,-6,.5,7,13.5,20];
 for(let row=0;row<2;row++)for(let i=0;i<columns.length;i++){
  if(row===0&&i===3)continue; // a genuine open alley in the northern row
  const x=columns[i],z=row===0?north:south,front=row===0?1:-1;
  const w=5.45,d=4.70,h=5.9+(i%3)*1.25+(row?0:.5);
  const colors=[c.wall,c.plaster,c.old,c.sand],wall=colors[(i+row*2)%4];
  item('street-house-'+row+'-'+i,x,z,'house',add=>{
   add(0,h/2,0,w,h,d,wall);
   add(0,h+.12,0,w+.32,.28,d+.34,c.roof);
   add(0,h+.30,0,w+.14,.15,d+.12,c.ridge);
   add(0,h-.44,front*(d/2+.04),w+.19,.17,.16,c.trim);
   for(const offset of [-w*.46,w*.46])
    add(offset,h*.47,front*(d/2+.07),.16,h*.87,.17,c.trim);
   const doorX=i%2===0?-.94:.96;
   add(doorX,1.20,front*(d/2+.08),1.16,2.38,.17,c.door,4);
   add(doorX,2.44,front*(d/2+.15),1.44,.17,.28,c.curb);
   add(doorX,.08,front*(d/2+.57),1.52,.16,.93,c.curb);
   add(doorX+.35,1.18,front*(d/2+.20),.075,.075,.075,c.lit,0,true);
   for(let floor=0;floor<2;floor++)for(const wx of [-1.58,1.58]){
    if(!floor&&Math.abs(wx-doorX)<.85)continue;
    const wy=2.15+floor*2.15,lit=(i+floor+row+(wx>0?1:0))%3!==0;
    add(wx,wy,front*(d/2+.11),1.23,1.32,.10,c.trim);
    add(wx,wy,front*(d/2+.18),.97,1.05,.08,lit?c.lit:c.dark,0,lit);
    add(wx,wy,front*(d/2+.24),.08,1.11,.09,c.trim);
    add(wx,wy,front*(d/2+.24),1.05,.08,.09,c.trim);
    add(wx,wy-.72,front*(d/2+.20),1.42,.16,.39,c.curb);
   }
   add(w*.32,h+.72,-d*.24,.55,1.22,.55,c.old);
   add(-w*.45,h*.45,-d*.48,.11,h*.90,.11,c.iron,0);
  });
 }
 // The alley is a sequence of physical depth modules, not a facade image.
 for(let k=0;k<5;k++){
  const z=north-4.7-k*3.5;
  item('street-alley-'+k,.5,z,'alley',add=>{
   add(-3.1,2.8,0,.46,5.6,3.28,c.old);
   add(3.1,3.2,0,.46,6.4,3.28,c.plaster);
   add(0,.065,0,5.7,.13,3.5,c.paving);
   add(-2.6,.18,0,.20,.32,3.5,c.curb);
   add(2.6,.18,0,.20,.32,3.5,c.curb);
  });
 }
 // Modular sidewalks, curbs and stone joints border the unchanged battle board.
 for(let side=0;side<2;side++){
  const z=side===0?terrain.minZ-1.08:terrain.minZ+terrain.depth+1.08;
  for(let k=0;k<12;k++)item('street-sidewalk-'+side+'-'+k,
   -20.2+k*3.68,z,'pavement',add=>{
    add(0,.17,0,3.60,.34,1.73,c.paving);
    add(0,.37,side===0?.83:-.83,3.57,.11,.14,c.curb);
    for(let j=-1;j<=1;j++)add(j*1.14,.35,0,.055,.017,1.64,c.trim);
   });
 }
 for(const [id,x,z] of [['nw',-16,terrain.minZ-2.5],
  ['ne',15.5,terrain.minZ-2.5],
  ['sw',-8.5,terrain.minZ+terrain.depth+2.5],
  ['se',17.5,terrain.minZ+terrain.depth+2.5]]){
  const h=5;
  item('street-lamp-'+id,x,z,'lamp',add=>{
   add(0,.30,0,.65,.60,.65,c.old);
   add(0,h*.50,0,.16,h,.16,c.iron,0);
   add(0,h-.37,0,.58,.16,.58,c.iron,0);
   add(0,h-.07,0,.44,.51,.44,c.lit,0,true);
   add(0,h+.28,0,.72,.15,.72,c.iron,0);
   add(0,h+.40,0,.23,.18,.23,c.iron,0);
  });
  lamps.push([x,y+h,z]);
 }
 for(let k=0;k<8;k++)item('street-bollard-'+k,
  -22+k*6.2,terrain.minZ-2.25,'bollard',add=>{
   add(0,.43,0,.34,.86,.34,c.old);
   add(0,.92,0,.50,.17,.50,c.curb);
  });
 const idsFor=scene=>scene==='street'?objects.map(o=>o.id):[];
 let drawn=0;
 function draw(now,scene){
  if(scene!=='street'){drawn=0;return;}
  drawn=0;
  for(const o of objects){
   const pose=appearance?.(o.id,now)||{scale:1,opacity:1};
   if(pose.scale<=.025||pose.opacity<=.002)continue;
   const scale=pose.scale;
   for(const p of o.parts){
    // Transition each object around its own world-space ground pivot.
    cube(o.x+p.dx*scale,y+p.py*scale,o.z+p.dz*scale,
     p.w*scale,p.h*scale,p.d*scale,p.col,p.mat,p.unlit);
    drawn++;
   }
  }
 }
 return Object.freeze({draw,idsFor,get propIds(){return idsFor('street')},
  get lamps(){return lamps.map(l=>l.slice())},
  get snapshot(){return{scene:'street',architecture:'modular-world-space-masonry',
   houseCount:13,alleyModules:5,lamps:lamps.length,
   pieces:objects.reduce((n,o)=>n+o.parts.length,0),
   rendered:drawn,placementCellsOccupied:0,usesSharedShadowMap:true,
   physicalNightLighting:true}}});
}
root.PaperchalkStoneStreetEnvironment=Object.freeze({version:'1.0.0',create});
})(window);

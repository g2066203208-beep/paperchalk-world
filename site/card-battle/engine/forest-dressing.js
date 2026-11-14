/* Lush world-space forest surround for the fixed camera, not a screenshot
 * or CSS illustration. Batched real geometry: canopies/trunks/rock clusters,
 * little flowers and grass blades. Every mesh can cast onto the shadow map.
 * Content remains beyond the exact 16x6 tactical board footprint.
 */
(function(root){'use strict';
function create({terrain,makeGeom,renderGeom,I,T,S,mul,appearance,enabled=true}){
 let seed=37171;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const groundY=terrain.topY-.8,hw=terrain.width/2,hd=terrain.depth/2;
 const meshes=[];
 function group(color,material=0){return{v:[],i:[],color,material};}
 const foliage=[
  group([.21,.36,.22,1],3),group([.27,.43,.25,1],3),
  group([.34,.49,.27,1],3),group([.39,.52,.30,1],3),
  group([.46,.58,.33,1],3)
 ];
 const bark=group([.33,.245,.16,1],4);
 const darkGrass=group([.25,.43,.24,1],1),lightGrass=group([.37,.54,.30,1],1);
 const petals=group([.94,.91,.76,1]),centers=group([.92,.72,.29,1]);
 const stone=group([.50,.53,.46,1],3),stoneHighlight=group([.61,.63,.55,1],3);
 const all=[...foliage,bark,darkGrass,lightGrass,petals,centers,stone,stoneHighlight];
 // Keep the 12-ish combined meshes for static frames, but ALSO retain each
 // prop's own small mesh. During transition only, animate each prop around its
 // world-space root. No group/object can ever collapse toward board center.
 const props=[];
 function capture(id,x,z,build){
  const before=all.map(g=>({v:g.v.length,i:g.i.length}));
  build();
  const parts=[];
  all.forEach((g,index)=>{
   const start=before[index];
   if(g.i.length===start.i)return;
   const firstVertex=start.v/8;
   parts.push({mesh:makeGeom(g.v.slice(start.v),
    g.i.slice(start.i).map(i=>i-firstVertex)),color:g.color,material:g.material});
  });
  if(parts.length)props.push({id,pivot:[x,groundY,z],meshes:parts});
 }

 function addTri(g,a,b,c,n){
  const offset=g.v.length/8;
  for(const p of [a,b,c])g.v.push(...p,...n,0,0);
  g.i.push(offset,offset+1,offset+2);
 }
 function addQuad(g,a,b,c,d,n){
  addTri(g,a,b,c,n);addTri(g,a,c,d,n);
 }
 function ellipsoid(g,x,y,z,rx,ry,rz,seedAngle=0){
  const sides=8,bands=4;
  for(let j=0;j<bands;j++){
   const v0=-Math.PI/2+j*Math.PI/bands,v1=-Math.PI/2+(j+1)*Math.PI/bands;
   for(let k=0;k<sides;k++){
    const a0=k*Math.PI*2/sides+seedAngle,a1=(k+1)*Math.PI*2/sides+seedAngle;
    const at=(v,a)=>[x+Math.cos(v)*Math.cos(a)*rx,y+Math.sin(v)*ry,z+Math.cos(v)*Math.sin(a)*rz];
    const p0=at(v0,a0),p1=at(v0,a1),p2=at(v1,a1),p3=at(v1,a0);
    const n0=[(p0[0]-x)/rx,(p0[1]-y)/ry,(p0[2]-z)/rz];
    const length=Math.hypot(...n0)||1,n=n0.map(t=>t/length);
    addQuad(g,p0,p1,p2,p3,n);
   }
  }
 }
 function cylinder(g,x,y,z,r,h){
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
   const p=(ang,yy)=>[x+Math.cos(ang)*r,yy,z+Math.sin(ang)*r];
   addQuad(g,p(a,y),p(b,y),p(b,y+h),p(a,y+h),[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
  }
 }
 // Dense framing around the OUTSIDE of the tactical board. Wide crowns fill
 // screen gutters; their roots remain well outside all 96 gameplay cells.
 const roots=[];
 for(let k=0;k<34;k++){
  const side=k%4,m=rand(),a=rand();
  const border=side<2?hw:hd;
  const d=side<2?terrain.depth:terrain.width;
  let x,z;
  if(side===0){x=-hw-(3.55+m*5.4);z=(a-.5)*(d+9)+terrain.centerZ;}
  if(side===1){x= hw+(3.55+m*5.4);z=(a-.5)*(d+9)+terrain.centerZ;}
  if(side===2){z=terrain.centerZ-hd-(3.4+m*4.8);x=(a-.5)*(d+11);}
  if(side===3){z=terrain.centerZ+hd+(4.0+m*5.4);x=(a-.5)*(d+10);}
  // Wideleaf trees visibly wrap top left and top right; low plants below.
  const sc=.72+rand()*.8;
  roots.push({x,z,sc,type:k%5===0?'pine':'broad',shade:Math.floor(rand()*foliage.length)});
 }
 const heroTrees=[
  [-20.9,terrain.centerZ-hd-3.85,1.50],[ -12.8,terrain.centerZ-hd-5.1,1.48],
  [ -3.7,terrain.centerZ-hd-6.0,1.55],[6.9,terrain.centerZ-hd-5.1,1.40],
  [18.3,terrain.centerZ-hd-4.1,1.55],
  [-hw-3.7,terrain.centerZ-6.8,1.65],
  [hw+4.4,terrain.centerZ-6.6,1.72],
  [-hw-4.1,terrain.centerZ+7.2,1.38],
  [hw+4.2,terrain.centerZ+7.1,1.41],
  [-15.8,terrain.centerZ+hd+5.6,1.60],
  [15.2,terrain.centerZ+hd+5.6,1.54]
 ];
 for(const [x,z,sc] of heroTrees)roots.push({x,z,sc,type:'broad',shade:Math.floor(rand()*5)});
 for(let treeIndex=0;treeIndex<roots.length;treeIndex++){
  const t=roots[treeIndex];
  capture('dressing-tree-'+treeIndex,t.x,t.z,()=>{
  const h=(t.type==='pine'?3.15:2.4)*t.sc;
  cylinder(bark,t.x,groundY,t.z,.20*t.sc,h);
  if(t.type==='broad'){
   const atY=groundY+h*.93;
   const lobes=[
    [-.95,.20,-.42,1.14,.88,1.06],
    [.77,.48,-.43,1.27,.91,1.01],
    [-.02,.72,.58,1.40,.98,1.15],
    [.10,1.22,-.26,1.26,.86,1.09],
    [.95,-.02,.47,1.05,.75,1.11]
   ];
   for(let j=0;j<lobes.length;j++){
    const [dx,dy,dz,rx,ry,rz]=lobes[j],col=foliage[(t.shade+j)%foliage.length];
    ellipsoid(col,t.x+dx*t.sc,atY+dy*t.sc,t.z+dz*t.sc,
     rx*t.sc,ry*t.sc,rz*t.sc,rand()*6.28);
   }
  }else{
   for(let j=0;j<3;j++){
    const q=.92-j*.2,r=1.25*t.sc*q;
    ellipsoid(foliage[(t.shade+j)%5],t.x,groundY+h*.62+j*.56*t.sc,t.z,r,.68*t.sc,r);
   }
  }
  });
 }
 // Sparse large faceted rock clusters remain away from the grid and
 // deliberately use different material response from leaves/paper/gold.
 const stones=[];
 for(let i=0;i<22;i++){
  const side=i%4,d=4.0+rand()*4.7,span=rand();
  let x,z;
  if(side===0){x=-hw-d;z=terrain.centerZ+(span-.5)*(terrain.depth+7);}
  if(side===1){x=hw+d;z=terrain.centerZ+(span-.5)*(terrain.depth+7);}
  if(side===2){z=terrain.centerZ-hd-d;x=(span-.5)*(terrain.width+7);}
  if(side===3){z=terrain.centerZ+hd+d;x=(span-.5)*(terrain.width+9);}
  stones.push({x,z,sc:.35+rand()*.7});
 }
 for(let i=0;i<stones.length;i++){
  const p=stones[i];
  capture('dressing-rock-'+i,p.x,p.z,()=>{
   ellipsoid(rand()>.45?stone:stoneHighlight,p.x,groundY+.32*p.sc,p.z,
    1.2*p.sc,.58*p.sc,1.00*p.sc,rand()*6.28);
  });
 }
 // Cream daisies on stalks, clustered near top, corners and bottom edge.
 let flowers=0;
 for(let cl=0;cl<24;cl++){
  const side=cl%4,span=rand(),dist=1.9+rand()*3.3;
  let x,z;
  if(side===0){x=-hw-dist;z=terrain.centerZ+(span-.5)*(terrain.depth+4);}
  if(side===1){x=hw+dist;z=terrain.centerZ+(span-.5)*(terrain.depth+4);}
  if(side===2){z=terrain.centerZ-hd-dist;x=(span-.5)*(terrain.width+4);}
  if(side===3){z=terrain.centerZ+hd+dist;x=(span-.5)*(terrain.width+5);}
  capture('dressing-flower-'+cl,x,z,()=>{
  for(let j=0;j<5;j++){
   const fx=x+(rand()-.5)*2.1,fz=z+(rand()-.5)*2.1;
   const fy=groundY+.28+rand()*.16,r=.12+rand()*.060;
   // Each bloom has actual sunlit petals and golden center.
   for(let k=0;k<5;k++){
    const ang=k*Math.PI*2/5,dx=Math.cos(ang),dz=Math.sin(ang);
    addTri(petals,[fx,fy,fz],[fx+dx*r*1.8-dz*r*.5,fy,fz+dz*r*1.8+dx*r*.5],
     [fx+dx*r*1.8+dz*r*.5,fy,fz+dz*r*1.8-dx*r*.5],[0,1,0]);
   }
   ellipsoid(centers,fx,fy+.014,fz,.075,.04,.075);
   flowers++;
  }
  });
 }
 // Tufts & blades with shadows cast by the same light-space camera.
 let grassBlades=0;
 // Ten closely spaced blades form one tiny ground-rooted clump. Animating
 // clumps independently avoids 650 GPU draw calls during a 0.6s transition.
 for(let patch=0;patch<65;patch++){
  const side=patch%4,edge=1.2+rand()*6.8,a=rand();
  let x,z;
  if(side===0){x=-hw-edge;z=terrain.centerZ+(a-.5)*(terrain.depth+13);}
  if(side===1){x=hw+edge;z=terrain.centerZ+(a-.5)*(terrain.depth+13);}
  if(side===2){z=terrain.centerZ-hd-edge;x=(a-.5)*(terrain.width+13);}
  if(side===3){z=terrain.centerZ+hd+edge;x=(a-.5)*(terrain.width+13);}
  capture('dressing-grass-'+patch,x,z,()=>{
   for(let blade=0;blade<10;blade++){
    const fx=x+(rand()-.5)*1.6,fz=z+(rand()-.5)*1.6;
    const g=blade%3===0?lightGrass:darkGrass,h=.25+rand()*.55;
    const r=.03+rand()*.075,dx=(rand()-.5)*.4,dz=(rand()-.5)*.3;
    addTri(g,[fx-r,groundY+.025,fz],[fx+r,groundY+.025,fz],
     [fx+dx,groundY+h,fz+dz],[0,.3,.95]);
    grassBlades++;
   }
  });
 }
 for(const g of all)if(g.i.length)meshes.push({mesh:makeGeom(g.v,g.i),color:g.color,material:g.material});
 let lastDrawCalls=0,animatedInstances=0;
 function draw(now,scene='forest'){
  if(!enabled||scene!=='forest'){lastDrawCalls=0;animatedInstances=0;return 0;}
  // Static visuals retain the ORIGINAL low-draw-call batched meshes.
  // Only transition frames use per-object meshes and their local anchors.
  const animating=props.some(p=>{
   const state=appearance?.(p.id,now);
   return state&&state.phase!=='steady';
  });
  if(!animating){
   const identity=I();
   for(const item of meshes)renderGeom(item.mesh,identity,item.color,null,false,null,0,item.material);
   animatedInstances=0;lastDrawCalls=meshes.length;return lastDrawCalls;
  }
  lastDrawCalls=0;animatedInstances=0;
  for(const p of props){
   const state=appearance?.(p.id,now)||{scale:1,opacity:1};
   if(state.opacity<=.002||state.scale<=.025)continue;
   const model=root.PaperchalkObjectAnchor.atRoot(p.pivot,state.scale,{T,S,mul});
   for(const item of p.meshes){
    renderGeom(item.mesh,model,item.color,null,false,null,0,item.material);
    lastDrawCalls++;
   }
   animatedInstances++;
  }
  return lastDrawCalls;
 }
 return Object.freeze({
  draw,
  get propIds(){return props.map(p=>p.id);},
  getAnchor(id){const p=props.find(q=>q.id===id);return p?[...p.pivot]:null;},
  get snapshot(){return {enabled,treeCount:roots.length,rocks:stones.length,
   flowers,grassBlades,batchedMeshes:meshes.length,localPivotProps:props.length,
   animatedInstances,lastDrawCalls,transitionPivot:'per-object-ground-root',
   style:'world-space-batched-static-local-animated-forest',castsShadows:true};}
 });
}
root.PaperchalkForestDressing=Object.freeze({version:'2.0.0-local-anchors',create});
})(window);

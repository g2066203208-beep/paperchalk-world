/* Production landscape mesh system: coast, cliff, ocean vessel and cavern.
 * Real faceted sculpted geometry, organic boundaries, continuous ocean,
 * true world-space shading, batched indexed WebGL1 meshes. All 16x6 logical
 * tactical positions remain unchanged. NO decorative/prebuilt bridges.
 */
(function(root){'use strict';
function create({terrain,makeGeom,renderGeom,I,T,S,mul,cube,appearance}){
 const W=terrain.width,D=terrain.depth,cx=terrain.centerX,cz=terrain.centerZ;
 const x0=terrain.minX,x1=x0+W,z0=terrain.minZ,z1=z0+D;
 const top=terrain.topY,base=terrain.topY-.8;
 const scenes=['coast','cliff','ocean','cave'],bins={},props={};
 const lamps={coast:[],cliff:[],ocean:[],cave:[]};
 const stats={},seed0=917243;
 const C={
  sand:[[.78,.70,.54,1],[.75,.67,.52,1],[.80,.72,.57,1],[.72,.65,.51,1]],
  wet:[[.49,.60,.56,1],[.54,.62,.56,1]],
  foam:[[.83,.93,.89,1],[.70,.87,.86,1]],
  water:[[.22,.49,.62,1],[.17,.42,.57,1]],
  rock:[[.49,.52,.52,1],[.45,.48,.50,1],[.53,.55,.53,1],[.42,.46,.49,1]],
  moss:[[.42,.49,.34,1],[.32,.40,.34,1]],
  wood:[[.51,.38,.28,1],[.57,.43,.30,1],[.43,.32,.24,1]],
  metal:[[.22,.26,.28,1],[.72,.58,.39,1]],
  cave:[[.36,.39,.42,1],[.40,.43,.45,1],[.44,.45,.44,1],[.33,.38,.41,1]],
  crystal:[[.45,.76,.79,1],[.30,.63,.72,1]]
 };
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const pi=Math.PI,TAU=2*pi;
 const rand=n=>{const v=Math.sin(n*127.1+seed0*.017)*43758.5453;return v-Math.floor(v);};
 const noise=(a,b)=>Math.sin(a*1.37+b*.91)*.47+Math.sin(a*.49-b*1.61)*.31+
  Math.cos(a*2.27+b*.54)*.22;
 const xyz=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const nrm=(a,b,c)=>{
  const u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const l=Math.hypot(...n)||1;return n.map(x=>x/l);
 };
 function group(scene,color,mat=3){
  if(!bins[scene])bins[scene]=new Map();
  const key=mat+'|'+color.join(',');
  let g=bins[scene].get(key);
  if(!g){g={v:[],i:[],color,mat};bins[scene].set(key,g);}
  return g;
 }
 function tri(scene,color,mat,a,b,c){
  const g=group(scene,color,mat),n=nrm(a,b,c),start=g.v.length/8;
  for(const p of [a,b,c])g.v.push(...p,...n,p[0]*.075+p[2]*.017,p[2]*.075-p[0]*.011);
  g.i.push(start,start+1,start+2);
 }
 function quad(scene,color,mat,a,b,c,d){
  // Preserve physically upright normals for horizontal beaches, decks and
  // sea even when procedural grid winding is reverse from the camera view.
  const n=nrm(a,b,c);
  if(n[1]<-.55&&Math.abs(a[1]-b[1])<.2&&Math.abs(b[1]-c[1])<.2){
   tri(scene,color,mat,a,c,b);tri(scene,color,mat,a,d,c);
  }else{
   tri(scene,color,mat,a,b,c);tri(scene,color,mat,a,c,d);
  }
 }
 function plane(scene,color,mat,xA,xB,zA,zB,y){
  quad(scene,color,mat,[xA,y,zA],[xB,y,zA],[xB,y,zB],[xA,y,zB]);
 }
 function ringRock(scene,id,x,y,z,rx,ry,rz,palette=C.rock){
  const n=9,bottom=[],middle=[],upper=[],summit=[];
  const tilt=(rand(id*.7)-.5)*.5;
  for(let i=0;i<n;i++){
   const a=TAU*i/n,q=.83+rand(id*19+i*11)*.29;
   const px=Math.cos(a)*rx*q,pz=Math.sin(a)*rz*q;
   bottom.push([x+px*1.22,y-.05+noise(i,id)*.10,z+pz*1.21]);
   middle.push([x+px,y+ry*.54+noise(i,id)*.16,z+pz]);
   upper.push([x+px*.61+tilt,y+ry*.99+noise(i,id)*.20,z+pz*.65]);
   summit.push([x+px*.17+tilt*.8,y+ry*1.19,z+pz*.17]);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   for(const [a,b,k] of [[bottom,middle,0],[middle,upper,1],[upper,summit,2]]){
    const color=palette[Math.floor(rand(id*17+k*13)*palette.length)%palette.length];
    quad(scene,color,3,a[i],a[j],b[j],b[i]);
   }
  }
  // Top closure (double-sided stone if the camera climbs)
  for(let i=0;i<n;i++)tri(scene,palette[(i+1)%palette.length],3,
   summit[i],summit[(i+1)%n],[x+tilt*.8,y+ry*1.3,z]);
 }
 function mound(scene,id,x,z,rx,rz,h,palette=C.sand){
  const n=11,outer=[],inner=[],peak=[x,top+h,z];
  for(let i=0;i<n;i++){
   const a=TAU*i/n,q=.81+rand(id*37+i*23)*.35;
   outer.push([x+Math.cos(a)*rx*q,top-.11,z+Math.sin(a)*rz*q]);
   inner.push([x+Math.cos(a)*rx*q*.64,top+h*.53+noise(i,id)*h*.10,z+Math.sin(a)*rz*q*.64]);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   quad(scene,palette[i%palette.length],2,outer[i],outer[j],inner[j],inner[i]);
   tri(scene,palette[(i+1)%palette.length],2,inner[i],inner[j],peak);
  }
 }
 function grass(scene,id,x,z,h,col=C.moss[0]){
  for(let k=0;k<5;k++){
   const a=TAU*k/5+id,dx=Math.cos(a)*h*.22,dz=Math.sin(a)*h*.20;
   const q=[x,top+.01,z],tip=[x+dx,top+h*(.65+rand(id+k)*.4),z+dz];
   tri(scene,col,1,[x-.09,top+.015,z-.04],[x+.09,top+.015,z+.05],tip);
  }
 }
 function sea(scene,zStart,zEnd,width=220,resX=68,resZ=36,level=top-1.36){
  const xs=[];
  for(let i=0;i<=resX;i++)xs.push(cx-width/2+i*width/resX);
  const beach=x=>zStart-.35+1.6*Math.sin(x*.105)+.56*Math.sin(x*.37);
  const at=(x,j)=>{
   const near=scene==='coast'?beach(x):zStart;
   return near+(zEnd-near)*(j/resZ);
  };
  const h=(x,z)=>level+.065*Math.sin(x*.18+z*.24)+.035*Math.cos(x*.45-z*.17);
  for(let j=0;j<resZ;j++)for(let i=0;i<resX;i++){
   const xA=xs[i],xB=xs[i+1],
    zA=at(xA,j),zB=at(xA,j+1),
    zC=at(xB,j),zD=at(xB,j+1);
   const q1=[xA,h(xA,zA),zA],q2=[xB,h(xB,zC),zC],
    q3=[xB,h(xB,zD),zD],q4=[xA,h(xA,zB),zB];
   quad(scene,C.water[0],9,q1,q2,q3,q4);
  }
 }
 function curvedRibbon(scene,fn,a,b,steps,width,col,mat){
  for(let i=0;i<steps;i++){
   const t0=a+(b-a)*i/steps,t1=a+(b-a)*(i+1)/steps;
   const A=fn(t0),B=fn(t1),Q=fn(t0+.002);
   const vx=Q[0]-A[0],vz=Q[2]-A[2],len=Math.hypot(vx,vz)||1;
   const n=[-vz/len,0,vx/len];
   const A1=xyz(A,n.map(v=>v*width*.5)),A2=xyz(A,n.map(v=>-v*width*.5));
   const B1=xyz(B,n.map(v=>v*width*.5)),B2=xyz(B,n.map(v=>-v*width*.5));
   quad(scene,col,mat,A1,B1,B2,A2);
  }
 }
 function beam(scene,color,mat,from,to,radius){
  const u=to.map((v,i)=>v-from[i]);const l=Math.hypot(...u)||1;
  const n=[-u[2]/l,0,u[0]/l],s=[n[0]*radius,0,n[2]*radius];
  const A=xyz(from,s),B=xyz(from,s.map(x=>-x));
  const C1=xyz(to,s),D1=xyz(to,s.map(x=>-x));
  quad(scene,color,mat,A,C1,D1,B);
  // Crossed upright face makes rope / mast visible from all view angles.
  quad(scene,color,mat,[from[0],from[1],from[2]+radius],
   [to[0],to[1],to[2]+radius],[to[0],to[1],to[2]-radius],
   [from[0],from[1],from[2]-radius]);
 }
 function edgeCliff(scene,side,segments,drop,roughness=1){
  // Morph from the exact rectangular gameplay edge at top to irregular
  // strata down the real precipice. This encloses the former straight slab.
  const bands=7,chain=[];
  const along=side==='north'||side==='south'?W:D;
  for(let i=0;i<=segments;i++){
   const q=i/segments;const u=side==='north'||side==='south'?x0+W*q:z0+D*q;
   const cols=[];
   for(let j=0;j<=bands;j++){
    const f=j/bands;
    const dy=-drop*f+(noise(i*.37,j*.49)*.42+noise(q*7,j))*(j===0?0:.46);
    const extend= f*(1.2+2.7*Math.sin(f*pi))+
      (j===0?0:(noise(i*.39,j*.73)*roughness*.72));
    const p=side==='north'?[u,top+dy,z0-extend]:
     side==='south'?[u,top+dy,z1+extend]:
     side==='west'?[x0-extend,top+dy,u]:
     [x1+extend,top+dy,u];
    cols.push(p);
   }
   chain.push(cols);
  }
  for(let i=0;i<segments;i++)for(let j=0;j<bands;j++){
   const p=chain[i],q=chain[i+1],shade=(Math.floor(i/9)+Math.floor(j/2))%C.rock.length;
   quad(scene,C.rock[shade],3,p[j],q[j],q[j+1],p[j+1]);
  }
 }
 function cone(scene,id,x,y,z,rx,h,palette,tipDown=false,material=3){
  const sides=8,tip=[x+noise(id*.3,.7)*.22,
   y+(tipDown?-h:h),z+noise(id*.2,.3)*.24];
  for(let i=0;i<sides;i++){
   const a=TAU*i/sides,b=TAU*(i+1)/sides;
   const q1=[x+Math.cos(a)*rx*(.85+rand(i+id)*.3),y,z+Math.sin(a)*rx],
    q2=[x+Math.cos(b)*rx*(.85+rand(i+id+1)*.3),y,z+Math.sin(b)*rx];
   tri(scene,palette[(i+id)%palette.length],material,q1,q2,tip);
  }
 }
 // Seamless sculpted shoulder connects precise card-space boundaries to
 // surrounding terrain without occupying any additional gameplay cell.
 // These are real material surfaces, not a gold border or visible slab wall.
 function shoulder(scene,sides,palette,width=6.2){
  const steps=scene==='cliff'?64:48,bands=5;
  const col=scene==='coast'?2:3;
  for(const side of sides){
   const isX=side==='north'||side==='south',
    length=isX?W:D,edge=isX?
      (side==='north'?z0:z1):(side==='west'?x0:x1);
   const norm=side==='north'||side==='west'?-1:1;
   const pos=(i,j)=>{
    const q=i/steps,f=j/bands;
    const along=(isX?x0:z0)+length*q;
    const jitter=norm*width*f*(1+.15*noise(q*7,f*3));
    const y=top-.14-f*.16+
     (f===0?0:noise(q*8,f*8)*.085*Math.sin(pi*f));
    return isX?[along,y,edge+jitter]:
     [edge+jitter,y,along];
   };
   for(let i=0;i<steps;i++)for(let j=0;j<bands;j++){
    const a=pos(i,j),b=pos(i+1,j),c=pos(i+1,j+1),d=pos(i,j+1);
    quad(scene,palette[Math.floor(i/16)%palette.length],col,a,b,c,d);
   }
  }
 }
 // ───────────── 01 COAST: organically eroded beach / surf ──────────
 {
  shoulder('coast',['south','west','east'],C.sand,9.0);
  // Shoreline curves across the full vista and physically meets the sand.
  const shore=x=>z0-10.7+Math.sin(x*.105)*1.6+Math.sin(x*.37)*.56;
  for(let i=0;i<64;i++)for(let j=0;j<13;j++){
   const xA=cx-W*.72+i*W*1.44/64,xB=cx-W*.72+(i+1)*W*1.44/64;
   const tA=j/13,tB=(j+1)/13;
   const vertex=(x,t)=>{
    const z=z0-(Math.max(0,t)*14.9)+
      Math.sin(x*.12+t*.9)*.26*t;
    const rel=(z0-z)/Math.max(1,z0-shore(x));
    const y=top-.018-.92*clamp(rel,0,1)**1.72+
      (noise(x*.21,t*13)*.065)*(Math.sin(pi*clamp(t,0,1))**2);
    return [x,y,z];
   };
   const a=vertex(xA,tA),b=vertex(xB,tA),c=vertex(xB,tB),d=vertex(xA,tB);
   quad('coast',C.sand[Math.min(3,Math.floor(j/4))],2,a,b,c,d);
  }
  // The water is a single uninterrupted triangulated surface, not cuboid
  // patches. Day/night highlight and travelling ripple normals are shader driven.
  sea('coast',z0-10.4,z0-167,W*3.1,68,36,top-1.17);
  for(let w=0;w<4;w++){
   curvedRibbon('coast',u=>{
    const x=cx-W*.78+W*1.56*u;
    return [x,top-1.08+w*.027,
     shore(x)-1.0+w*.72+.28*Math.sin(x*.61+w*1.72)];
   },0,1,120,.25+w*.07,
   C.foam[w%2],10);
  }
  for(let side of [-1,1])for(let j=0;j<16;j++){
   const x=cx+side*(W*.52+(j%4)*2.24),z=z0-5.0+j*.96;
   const id=11+j+(side+1)*17;
   ringRock('coast',id,x,top-.72,z,1.6+rand(id)*2.9,
    1.2+rand(id+3)*2.7,1.5+rand(id+8)*2.5);
  }
  for(let i=0;i<28;i++){
   const x=cx+(rand(i*8+14)-.5)*W*1.05;
   const z=z0-1.3+rand(i*13+7)*3.4;
   mound('coast',i+71,x,z,.9+rand(i)*1.55,.75+rand(i+4)*1.25,
    .24+rand(i*5)*.42);
  }
  for(let i=0;i<110;i++){
   const side=i%2?1:-1,x=cx+side*(W*.51+rand(i*14)*7.4),
    z=z0+(rand(i*17+4)*D*.88);
   grass('coast',i+18,x,z,.38+rand(i*3)*.78,i%3?C.moss[0]:C.moss[1]);
  }
  // Distant offshore stacks fade naturally under fog and reflect in the sea.
  for(let i=0;i<8;i++){
   const x=cx+(i-3.5)*W*.43,z=z0-48-(i%3)*11;
   ringRock('coast',i+160,x,top-3.3,z,4+(i%4)*1.5,
    3.8+(i%3)*1.6,3.5+(i%3)*2.0);
  }
  stats.coast={sandBattlefield:true,shorelineModules:64,seaModules:1,
   coastline:'curved-continuous-surf',rockForm:'faceted-sculpted',bridgeCount:0};
 }

 function mountainPeak(scene,id,x,y,z,rx,h,rz){
  // Sharp weather-eroded mountain silhouette. Unlike ringRock, the crest is
  // a narrow crooked ridge instead of a round flat-topped cylindrical cap.
  const n=11,low=[],shoulder=[],crest=[];
  const peak=[x+(rand(id*13)-.5)*rx*.36,y+h*1.14,
   z+(rand(id*17)-.5)*rz*.27];
  for(let i=0;i<n;i++){
   const a=TAU*i/n,q=.8+rand(id*8+i*19)*.34;
   const ux=Math.cos(a)*rx*q,uz=Math.sin(a)*rz*q;
   low.push([x+ux,y+.1*Math.sin(i),z+uz]);
   shoulder.push([x+ux*.73,y+h*(.30+rand(id+i*8)*.15),z+uz*.75]);
   crest.push([x+ux*.30,y+h*(.62+rand(id+i*13)*.17),z+uz*.31]);
  }
  const shades=[C.rock[3],C.rock[1],C.rock[0],C.rock[2]];
  for(let i=0;i<n;i++){
   const j=(i+1)%n,col=shades[Math.floor(i/3)%shades.length];
   quad(scene,col,3,low[i],low[j],shoulder[j],shoulder[i]);
   quad(scene,col,3,shoulder[i],shoulder[j],crest[j],crest[i]);
   tri(scene,col,3,crest[i],crest[j],peak);
  }
 }
 // ───────────── 02 CLIFF: multi-strata highland / abyss ────────────
 {
  shoulder('cliff',['north','south','west','east'],C.rock,2.2);
  edgeCliff('cliff','north',56,17);
  edgeCliff('cliff','south',56,20);
  edgeCliff('cliff','west',28,18);
  edgeCliff('cliff','east',28,16);
  // Distinct rocky ledges, with irregular silhouette and surface vegetation.
  for(let i=0;i<31;i++){
   const side=i%4;
   const x=side<2?cx+(side?1:-1)*(W*.51+1.7+rand(i+8)*5.2):
    cx+(rand(i*19)-.5)*W*1.5;
   const z=side>=2?cz+(side===2?-1:1)*(D*.54+2.6+rand(i+6)*4.2):
    cz+(rand(i*11+3)-.5)*D*1.5;
   ringRock('cliff',i+190,x,top-1.2,z,1.65+rand(i*4)*3.2,
    1.8+rand(i*5)*2.9,1.8+rand(i*9)*2.5);
  }
  for(let i=0;i<68;i++){
   const edge=i%4,rx=rand(i*6+4),rz=rand(i*7+5);
   const x=edge<2?cx+(edge===0?-1:1)*(W*.5+1.8+rx*3):
    x0+rx*W;
   const z=edge>=2?cz+(edge===2?-1:1)*(D*.5+1.6+rz*3):
    z0+rz*D;
   grass('cliff',i+310,x,z,.50+rand(i+6)*.64,
    i%5?C.moss[1]:C.moss[0]);
  }
  // True staggered mountains; broad faceted ridges make a visible horizon.
  for(let row=0;row<3;row++)for(let i=0;i<12;i++){
   const x=cx+(i-5.5)*12+(row%2)*4.2;
   const z=z0-25-row*19.2+rand(i*13+row)*6;
   const h=9+row*4+rand(i*7+row)*8;
   mountainPeak('cliff',400+row*12+i,x,top-20,z,
    8.0+rand(i*3)*3.6,h,9.5+rand(i*2)*4.4);
  }
  stats.cliff={elevatedBattlefield:true,dropHeight:[16,20],
   edgeModules:168,rockForm:'stratified-irregular-mesh'};
 }
 // ───────────── 03 OCEAN: complete curved vessel in vast sea ───────
 {
  sea('ocean',cz-130,cz+130,W*6,72,48,top-3.90);
  // Hull is long along X (16 cards), narrower across Z (6 cards).
  // Curved upper and lower cross sections form a proper ship silhouette.
  const count=34,rings=[],hullBottom=top-6.10;
  for(let i=0;i<=count;i++){
   const q=i/count,xx=x0-8+q*(W+16);
   const taper=clamp(Math.sin(pi*q)**.46,.07,1);
   const beamHalf=(D*.5+2.3)*taper;
   rings.push({
    x:xx,
    upperZ:beamHalf,
    lowerZ:beamHalf*.62,
    railY:top+.86+.46*Math.sin(pi*q),
    hullY:hullBottom+(1-taper)*2.6
   });
  }
  for(let i=0;i<count;i++){
   const a=rings[i],b=rings[i+1];
   for(const side of [-1,1]){
    const topA=[a.x,a.railY,cz+side*a.upperZ],
     topB=[b.x,b.railY,cz+side*b.upperZ],
     lowA=[a.x,a.hullY,cz+side*a.lowerZ],
     lowB=[b.x,b.hullY,cz+side*b.lowerZ];
    quad('ocean',C.wood[i%3],4,topA,topB,lowB,lowA);
    // A distinct raised gunwale and continuous wooden cap rail.
    const qA=[topA[0],topA[1]+.34,topA[2]],
     qB=[topB[0],topB[1]+.34,topB[2]];
    quad('ocean',C.wood[(i+1)%3],4,topA,topB,qB,qA);
   }
  }
  // Detailed deck boards exactly on the 16x6 playable footprint. They sit
  // under slot decals and never alter the authoritative terrain coordinates.
  for(let j=0;j<44;j++){
   const z=z0+(j+.5)*D/44,wood=C.wood[j%3];
   const y=top+.012+(j%5)*.001;
   plane('ocean',wood,4,x0+.055,x1-.055,z-D/93,z+D/93,y);
  }
  // Plank joints are interrupted between separate board lengths.
  for(let i=0;i<15;i++)for(let j=0;j<10;j++){
   const x=x0+(i+1)*W/16+(j%2)*.035,z=z0+(j+.5)*D/10;
   plane('ocean',C.wood[2],4,x-.021,x+.021,z-.77,z+.77,top+.023);
  }
  // Fitted bulwark posts, rail, deck cleats and captain's stern cabin are
  // all OUTSIDE the battle cells. No prebuilt bridge, no occupancy changes.
  for(let sgn of [-1,1]){
   for(let i=0;i<18;i++){
    const x=x0+(i+.5)*W/18,z=cz+sgn*(D*.5+1.53);
    beam('ocean',C.wood[1],4,[x,top+.26,z],[x,top+2.00,z],.14);
   }
   for(let j=0;j<4;j++){
    const za=cz+sgn*(D*.5+1.53),h=top+1.92-j*.39;
    beam('ocean',C.wood[j===0?1:2],4,[x0-2,h,za],[x1+2,h,za],.10);
   }
  }
  for(let side of [-1,1]){
   const x=cx+side*(W*.36+1.3),z=cz+side*(D*.5+3.0);
   beam('ocean',C.wood[2],4,[x,top+.3,z],[x,top+14.8,z],.32);
   beam('ocean',C.wood[1],4,[x-5.7,top+11.0,z],[x+5.7,top+11,z],.18);
   // Triangular spars and furled fabric read at strategy-camera distances.
   tri('ocean',[.79,.75,.65,1],4,
    [x-4.9,top+10.6,z],[x+5.1,top+10.6,z],
    [x,top+5.3,z-.40]);
   beam('ocean',C.metal[0],4,[x,top+14.3,z],
    [x-9.2,top+.3,z-side*2.2],.045);
   beam('ocean',C.metal[0],4,[x,top+14.3,z],
    [x+9.3,top+.3,z+side*2.0],.045);
  }
  // A raised bow/spur and captain stern do not intrude on tactical cells.
  ringRock('ocean',811,x1+7,top-2.3,cz,3.0,4.2,3.6,C.wood);
  ringRock('ocean',812,x0-7,top-2.8,cz,3.0,3.5,3.5,C.wood);
  stats.ocean={deckBattlefield:true,seaModules:1,shipHulls:1,
   hull:'curved-multi-section-vessel',deckPlanks:44,bridgeCount:0};
 }
 // ───────────── 04 CAVE: sculpted vault and mineral lighting ───────
 {
  shoulder('cave',['north','south','west','east'],C.cave,2.6);
  // Three enclosing strata: the main gameplay area remains walkable.
  // Curved rock bands replace the old straight cubic side walls.
  for(const side of [-1,1]){
   for(let i=0;i<28;i++){
    const z=z0+(i+.5)*D/28;
    const x=cx+side*(W*.5+2.5+1.1*Math.sin(i*.67));
    ringRock('cave',901+i+(side+1)*15,x,top-.9,z,
     3.1+rand(i+8)*1.6,5.2+rand(i+3)*4.5,2.7+rand(i+9),
     C.cave);
    if(i%3===0)cone('cave',21+i,x,top+6,z,.6,2.0+rand(i)*1.6,C.cave,true);
   }
  }
  // Ancient passage in the background: two irregular curved arch legs,
  // tapered vault above, and long tapering tunnel into dark interior.
  for(let i=0;i<30;i++){
   const x=x0+(i+.5)*W/30,center=Math.abs(x-cx)/W;
   const opening=center<.13;
   const z=z0-4.8+(rand(i*5)-.5)*1.15;
   if(opening){
    if(i%3===0)ringRock('cave',1020+i,x,top+4.9,z,1.9,3.8,2.2,C.cave);
   }else{
    ringRock('cave',1060+i,x,top-.84,z,2.6,6.7+rand(i)*3.2,
     3.2+rand(i+9)*1.4,C.cave);
   }
  }
  // Overhead stalactites/stone columns, varying silhouette and thickness.
  for(let i=0;i<39;i++){
   const side=i%3;
   const x=side===0?cx+(rand(i*7)-.5)*W*.65:
    cx+(side===1?-1:1)*(W*.51+2.5+rand(i*3)*3);
   const z=z0-5+rand(i*17)*D*1.35;
   const height=1.3+rand(i+9)*4.1;
   cone('cave',i+1110,x,top+7.6,z,.45+rand(i)*.54,height,C.cave,true);
  }
  for(let i=0;i<40;i++){
   const side=i%2?-1:1;
   const x=cx+side*(W*.49+2.1+rand(i*11)*3),
    z=z0+rand(i*9)*D;
   cone('cave',i+1170,x,top-.25,z,.35+rand(i)*.6,
    .9+rand(i*13)*2.7,C.cave);
  }
  // Glow crystals, real distinct geometry, and four local light positions.
  for(let i=0;i<4;i++){
   const x=cx+(i%2?-1:1)*(W*.5+1.7),z=cz+(i<2?-D*.39:D*.39);
   for(let k=0;k<5;k++){
    const h=1.7+(k%3)*.66+rand(i*7+k)*.45;
    cone('cave',1260+i*5+k,x+(k-2)*.33,top-.34,
     z+(k%2)*.28,.24+k*.033,h,C.crystal,false,7);
   }
   lamps.cave.push([x,top+1.8,z]);
  }
  // Patchy moss, wall rubble and wet rock at the cavern threshold.
  for(let i=0;i<73;i++){
   const x=x0+(rand(i*9)*W),z=z0-2.0-rand(i*5)*5.2;
   ringRock('cave',1320+i,x,top-.75,z,.32+rand(i)*.54,
    .27+rand(i+4)*.7,.32+rand(i+3)*.47,C.cave);
  }
  stats.cave={stoneBattlefield:true,walls:86,crystalLamps:4,
   roofShadowOnly:true,arch:'open-faceted-cavern',rockForm:'irregular-mesh'};
 }
 const compiled={};let active=null,drawCalls=0;
 for(const scene of scenes){
  // Keeping every material batch below 65535 VBO vertices is required on
  // WebGL1 (UNSIGNED_SHORT index buffers). Split any oversized group.
  const out=[];
  for(const g of bins[scene]?.values()||[]){
   const maxTriangles=17500,triTotal=g.i.length/3;
   for(let start=0;start<triTotal;start+=maxTriangles){
    const count=Math.min(maxTriangles,triTotal-start),
     vertices=g.v.slice(start*3*8,(start+count)*3*8);
    const idx=Array.from({length:count*3},(_,k)=>k);
    out.push({geo:makeGeom(vertices,idx),color:g.color,material:g.mat});
   }
  }
  compiled[scene]=out;
  props[scene]=['scenic-world-'+scene];
 }
 function draw(t,scene){
  drawCalls=0;active=scene;if(!compiled[scene])return;
  const a=appearance?.('scenic-world-'+scene,t)||{scale:1,opacity:1};
  if(a.scale<.015||a.opacity<.002)return;
  const m=Math.abs(a.scale-1)<.0001?I():
   root.PaperchalkObjectAnchor.atRoot([cx,base,cz],a.scale,{T,S,mul});
  for(const g of compiled[scene]){
   renderGeom(g.geo,m,g.color,null,false,null,0,g.material);
   drawCalls++;
  }
 }
 const drawRoofShadow=scene=>{
  if(scene==='cave')cube(cx,top+10.6,cz,W+14,.45,D+15,[1,1,1,1],3);
 };
 return Object.freeze({
  draw,drawRoofShadow,
  idsFor:scene=>props[scene]||[],
  lampsFor:scene=>(lamps[scene]||[]).map(a=>a.slice()),
  get snapshot(){return{
   scene:active,biomes:scenes.slice(),...stats,drawn:drawCalls,
   geometry:'organic-triangulated-worldspace',
   materialBatches:drawCalls,referenceScale:'1-card-per-tile',
   changesTacticalSlots:false,usesSharedWebGL:true,usesWorldClock:true
  }}
 });
}
root.PaperchalkLandscapeEnvironments=Object.freeze({version:'2.3.0',create});
})(window);

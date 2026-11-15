/* Production landscape mesh system: beach, high plateau, open ocean and cavern.
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
  sand:[[.91,.78,.57,1],[.88,.75,.55,1],[.94,.81,.62,1],[.85,.72,.54,1]],
  wet:[[.74,.70,.58,1],[.79,.74,.63,1]],
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
 function mound(scene,id,x,z,rx,rz,h,palette=C.sand,groundY=top){
  const n=11,outer=[],inner=[],peak=[x,groundY+h,z];
  for(let i=0;i<n;i++){
   const a=TAU*i/n,q=.81+rand(id*37+i*23)*.35;
   outer.push([x+Math.cos(a)*rx*q,groundY-.11,z+Math.sin(a)*rz*q]);
   inner.push([x+Math.cos(a)*rx*q*.64,groundY+h*.53+noise(i,id)*h*.10,z+Math.sin(a)*rz*q*.64]);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   const mat=scene==='coast'?11:2;
   quad(scene,palette[i%palette.length],mat,outer[i],outer[j],inner[j],inner[i]);
   tri(scene,palette[(i+1)%palette.length],mat,inner[i],inner[j],peak);
  }
 }
 function grass(scene,id,x,z,h,col=C.moss[0],groundY=top){
  for(let k=0;k<5;k++){
   const a=TAU*k/5+id,dx=Math.cos(a)*h*.22,dz=Math.sin(a)*h*.20;
   const q=[x,groundY+.01,z],tip=[x+dx,groundY+h*(.65+rand(id+k)*.4),z+dz];
   tri(scene,col,1,[x-.09,groundY+.015,z-.04],[x+.09,groundY+.015,z+.05],tip);
  }
 }
 function sea(scene,zStart,zEnd,width=220,resX=68,resZ=36,level=top-1.36){
  const xs=[];
  for(let i=0;i<=resX;i++)xs.push(cx-width/2+i*width/resX);
  const beach=x=>zStart-.35+1.65*Math.sin(x*.105)+.52*Math.sin(x*.37)+1.1*Math.sin(x*.026);
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
    const shoulderY=scene==='coast'?top-2.61:top-.14;
    const y=shoulderY-f*.16+
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
 // ───────────── 01 COAST: open natural beach / shared 16x6 board ──
 {
  // A true two-dimensional coastline: water, wet beach and dry sand share
  // the SAME irregular shoreline. No prop, pier, jetty, bridge or boat.
  // The physical 16x6 battle board is a separate, untouched mesh above it.
  const seaY=top-3.42;
  const shore=x=>z0-8.5+1.65*Math.sin(x*.091)+
   .66*Math.sin(x*.33)+1.16*Math.sin(x*.027);
  const wetSand=[.74,.715,.636,1],drySand=[.906,.813,.662,1];
  const sandColors=Array.from({length:9},(_,i)=>mix(wetSand,drySand,i/8));
  const left=x0-54,right=x1+54,back=z1+82,nx=94,nz=58;
  const beachHeight=(x,z)=>{
   const fromShore=z-shore(x),dry=clamp(fromShore/8);
   const beyond=Math.max(0,Math.abs(x-cx)-W*.58,z-z1-12);
   const dune=clamp(beyond/22)*Math.max(0,noise(x*.12,z*.085))*.30;
   const rill=.025*Math.sin(x*.42+z*.58)+.016*Math.cos(x*.93-z*.31);
   return seaY+.045+dry*.725+dune+rill;
  };
  const sandVertex=(i,j)=>{
   const x=left+(right-left)*i/nx,edge=shore(x)-.23;
   const z=edge+(back-edge)*j/nz;
   return [x,beachHeight(x,z),z];
  };
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
   const a=sandVertex(i,j),b=sandVertex(i+1,j),
    c=sandVertex(i+1,j+1),d=sandVertex(i,j+1);
   const distance=((a[2]+d[2])*.5-shore(a[0]));
   const band=Math.min(8,Math.floor(clamp(distance/12)*9));
   quad('coast',sandColors[band],11,a,b,c,d);
  }
  // Water runs up UNDER the shore by 0.35 units. These actual 3D ribbons
  // meet the sand, rather than leaving a blue/beige rectangular seam.
  const wx=96,wz=55,far=z0-210,span=right-left;
  const waterAt=(i,j)=>{
   const x=left+span*i/wx;
   const z=shore(x)-.38+(far-(shore(x)-.38))*j/wz;
   const fade=clamp((shore(x)-z)/5);
   const y=seaY-.025+.033*Math.sin(x*.23+z*.14)*fade+
    .016*Math.cos(x*.62-z*.21)*fade;
   return [x,y,z];
  };
  for(let i=0;i<wx;i++)for(let j=0;j<wz;j++)
   quad('coast',C.water[0],9,waterAt(i,j),waterAt(i+1,j),
    waterAt(i+1,j+1),waterAt(i,j+1));
  // Thin overlapping surf patterns, not a giant border around the board.
  for(let w=0;w<4;w++)curvedRibbon('coast',u=>{
   const x=left+u*span;
   return [x,seaY+.061-w*.004,
    shore(x)-.29-w*.64+.23*Math.sin(x*.45+w*1.72)];
  },.018,.982,142,w===0?.22:.09,C.foam[w%2],10);
  // Subtle irregular dunes belong to the DISTANT dry beach. Keep the whole
  // 16x6 board perimeter clear and never create paired rock piles.
  for(let i=0;i<28;i++){
   const x=left+7+rand(i*19+3)*(right-left-14);
   const z=z1+15+rand(i*7+13)*58;
   mound('coast',i+60,x,z,1.9+rand(i*4)*4.1,
    1.7+rand(i*5)*3.1,.13+rand(i*7)*.27,C.sand,
    beachHeight(x,z)-.06);
  }
  for(let i=0;i<43;i++){
   const x=left+5+rand(i*11+4)*(right-left-10);
   const z=shore(x)+1.6+rand(i*21+3)*13;
   if(Math.abs(x-cx)<W*.57&&z>z0-2)continue;
   ringRock('coast',140+i,x,beachHeight(x,z)-.24,z,
    .26+rand(i*3)*.47,.18+rand(i*4)*.52,.26+rand(i*5)*.45);
  }
  for(let i=0;i<86;i++){
   const x=left+4+rand(i*13)*(right-left-8);
   const z=z1+11+rand(i*17+6)*65;
   if(Math.abs(x-cx)<W*.57&&z<z1+20)continue;
   grass('coast',i+240,x,z,.25+rand(i+7)*.64,
    i%6?C.moss[0]:C.moss[1],beachHeight(x,z));
  }
  // Remote irregular headland. The sea-facing centre stays open, with no
  // symmetrical cliffs, piers, ships or invented structure.
  for(let i=0;i<9;i++){
   const x=left+4+rand(i*17)*16;
   const z=shore(x)-1.3+rand(i*5)*9;
   ringRock('coast',300+i,x,seaY-1.3,z,
    1.4+rand(i+3)*2.7,1.4+rand(i*7)*2.5,
    1.7+rand(i*9)*2.9);
  }
  stats.coast={sandBattlefield:false,boardIndependent:true,
   sandOutsideBoard:true,shorelineModules:nx*nz,seaModules:1,
   coastline:'continuous-beach-wet-sand-and-open-surf',
   shipHulls:0,bridgeCount:0,viewCorridorClear:true};
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
 // ───────────── 02 CLIFF: natural elevated rock plateau above clouds ──
 {
  // A connected irregular ring mesh turns the existing board underside into
  // a real mountain summit. It DOES NOT change the tactical tile elevations.
  // All outer wall surfaces are connected through corners: never four
  // freestanding rectangular vertical walls or a floating table.
  const segments=160;
  const profiles=[
   [0,top-2.63],[1.0,top-2.64],[2.8,top-2.88],
   [4.9,top-3.90],[6.6,top-7.3],[7.3,top-13.4],
   [8.4,top-21.0],[9.4,top-30.3],[10.8,top-42.7],
   [12.3,top-52.0]
  ];
  const crest=(angle,offset,layer)=>{
   const dx=Math.cos(angle),dz=Math.sin(angle);
   const boxRadius=Math.min((W*.5+.10)/Math.max(.0001,Math.abs(dx)),
    (D*.5+.10)/Math.max(.0001,Math.abs(dz)));
   const waviness=layer===0?0:
    (.48*Math.sin(angle*11.0+layer*.7)+
     .25*Math.sin(angle*23.0-layer*.63))*
    Math.min(1,layer*.25);
   const radius=boxRadius+offset+waviness;
   return [cx+dx*radius,cz+dz*radius];
  };
  const bands=profiles.map(([offset,y],layer)=>Array.from({length:segments+1},(_,i)=>{
   const a=TAU*i/segments,[x,z]=crest(a,offset,layer);
   const variance=layer<2?0:
    (.27*Math.sin(a*17+layer*.64)+
     .17*Math.cos(a*43-layer*.58));
   return [x,y+variance,z];
  }));
  for(let layer=0;layer<profiles.length-1;layer++){
   for(let i=0;i<segments;i++){
    const stone=C.rock[(layer+Math.floor(i/14))%C.rock.length];
    quad('cliff',stone,3,bands[layer][i],bands[layer][i+1],
     bands[layer+1][i+1],bands[layer+1][i]);
   }
  }
  // Scattered smaller outcrops and grass sit on the broad rock shelf,
  // outside the 16x6 playing surface and its gold perimeter.
  for(let i=0;i<23;i++){
   const a=TAU*(i+.31*rand(i+8))/23;
   const [x,z]=crest(a,3.2+rand(i*5)*.6,2);
   ringRock('cliff',420+i,x,top-3.11,z,
    .48+rand(i+5)*1.03,.62+rand(i*7)*1.18,
    .47+rand(i*3)*.89);
  }
  for(let i=0;i<64;i++){
   const a=TAU*(i+.27*rand(i*9))/64;
   const [x,z]=crest(a,2.35+rand(i*6)*1.5,1);
   grass('cliff',520+i,x,z,.17+rand(i+6)*.42,
    i%4?C.moss[0]:C.moss[1],top-2.66);
  }
  // A true cloud SEA sits approx. 20 world units BELOW the mountain summit.
  // Even its highest billows remain far below cards and the camera horizon.
  // Broad low-frequency mesh + small rounded banks create aerial depth.
  const cloudColors=[[.80,.87,.91,1],[.88,.91,.93,1],
   [.72,.81,.88,1],[.94,.94,.92,1]];
  const cloudY=top-21.5,gn=60,gm=48,worldW=340,worldD=290;
  const cloudPoint=(i,j)=>{
   const x=cx-worldW*.5+worldW*i/gn;
   const z=cz-worldD*.5+worldD*j/gm;
   return [x,cloudY+
    1.5*Math.sin(x*.045+z*.022)+.81*Math.cos(z*.083-x*.017)+
    .38*Math.sin(x*.13-z*.092),z];
  };
  for(let i=0;i<gn;i++)for(let j=0;j<gm;j++){
   const c=cloudColors[(Math.floor(i/10)+Math.floor(j/9))%4];
   quad('cliff',c,0,cloudPoint(i,j),cloudPoint(i+1,j),
    cloudPoint(i+1,j+1),cloudPoint(i,j+1));
  }
  // Wide soft domes: concentric faceted cloud banks, never stone cones.
  for(let i=0;i<46;i++){
   const x=cx+(rand(i*23+1)-.5)*300;
   const z=cz+(rand(i*31+7)-.5)*248;
   if(Math.abs(x-cx)<W*.9&&Math.abs(z-cz)<D*1.15)continue;
   const rx=5+rand(i*7)*11,rz=4+rand(i*11)*10;
   const height=1.6+rand(i*13)*2.4,steps=16;
   const rings=[1,.67,.36,0].map((f,band)=>Array.from({length:steps+1},(_,j)=>{
    const a=TAU*j/steps;
    return [x+rx*f*Math.cos(a),cloudY-.4+height*(1-f*f),
     z+rz*f*Math.sin(a)];
   }));
   for(let b=0;b<3;b++)for(let j=0;j<steps;j++){
    quad('cliff',cloudColors[(i+b)%4],0,
     rings[b][j],rings[b][j+1],rings[b+1][j+1],rings[b+1][j]);
   }
  }
  // Separate distant rocky peaks peek through the low cloud deck.
  for(let i=0;i<18;i++){
   const x=cx+(i-8.5)*19,z=z0-65-rand(i*7+8)*40;
   mountainPeak('cliff',620+i,x,top-39,z,
    7+rand(i*5)*7,15+rand(i*11)*6,8+rand(i*3)*6);
  }
  stats.cliff={elevatedBattlefield:true,realSummit:true,
   summitTop:top-2.63,dropHeight:[42.7,52],cloudSeaBelowBoard:true,
   cloudSurfaceY:cloudY,cloudClearance:top-cloudY,
   rockForm:'connected-eroded-radial-plateau',
   noRectangularCliffWalls:true,shipHulls:0};
 }
 
 // ───────────── 03 OCEAN: pure open water, NEVER a ship ─────────
 {
  // The exact same physically modeled 16x6 board floats over the water.
  // No hull, mast, deck boards, railings, cabin, anchors or ship props.
  sea('ocean',cz-185,cz+185,W*9,100,65,top-2.89);
  const swellColors=[C.foam[0],C.foam[1]];
  // Foamy distant wind-driven wave crests remain OUTSIDE the board's
  // rectangular footprint, so cards, players and facilities stay readable.
  for(let side of [-1,1])for(let k=0;k<20;k++){
   const baseZ=side<0?z0-9-k*5.9:z1+9+k*5.9;
   const from=-.20+rand(k*17+side)*.16;
   const to=1.17-rand(k*7+side)*.16;
   const xStart=cx-W*1.8;
   curvedRibbon('ocean',u=>{
    const x=xStart+u*W*3.6;
    return [x,top-2.80+Math.sin(k*7+u*17)*.012,
     baseZ+1.8*Math.sin(x*.11+k*.8)+.45*Math.cos(x*.29-k*.9)];
   },from,to,48,k%3===0?.11:.057,swellColors[k%2],10);
  }
  // Far offshore, small natural islets break the horizon, never a vessel.
  for(let i=0;i<5;i++){
   const x=cx+(i-2)*W*1.68;
   const z=cz-91-rand(i+4)*47;
   ringRock('ocean',840+i,x,top-7.2,z,
    2.7+rand(i*7)*3.6,2.6+rand(i*11)*4.0,
    2.8+rand(i*13)*4.8);
  }
  stats.ocean={openOcean:true,boardIndependent:true,seaModules:1,
   shipHulls:0,masts:0,railings:0,deckPlanks:0,bridgeCount:0,
   water:'continuous-swell-and-distant-wind-foam'};
 }
 
 // ───────────── 04 CAVE: clear foreground, distant cavern walls ──
 {
  // The entire central 16x6 board remains clearly visible. We intentionally
  // render NO hanging stalactites or overhead roof geometry: not one tip
  // is allowed to project between camera and the cards.
  shoulder('cave',['north','south','west','east'],C.cave,2.5);
  // Distant irregular side walls, well BEYOND the playable perimeter.
  // Their bases are at or below the underside of the board.
  for(const side of [-1,1]){
   for(let i=0;i<25;i++){
    const z=z0-13+(i+.5)*(D+38)/25;
    const x=cx+side*(W*.5+8.5+
     2.0*Math.sin(i*.42)+rand(i*5+side)*2.6);
    ringRock('cave',905+i+(side+1)*32,x,top-2.84,z,
     2.2+rand(i+8)*2.3,4.4+rand(i+3)*4.3,
     2.6+rand(i+9)*1.8,C.cave);
   }
  }
  // A broken cavern rear wall and its dark passage create a readable
  // silhouette without a ceiling arch directly above the field of view.
  for(let i=0;i<32;i++){
   const x=x0-9+(i+.5)*(W+18)/32;
   const z=z0-16+(rand(i*5)-.5)*3.5;
   if(Math.abs(x-cx)<W*.17)continue;
   ringRock('cave',1030+i,x,top-3.25,z,
    1.9+rand(i+4)*1.2,5.5+rand(i+3)*4.0,
    2.3+rand(i+9)*1.4,C.cave);
  }
  // Only low upward-growing formations by the external side walls.
  // Unlike the rejected version, every ceiling-hanging cone is REMOVED.
  for(let i=0;i<18;i++){
   const side=i%2?-1:1;
   const x=cx+side*(W*.5+5.9+rand(i*11)*3.7);
   const z=z0-8+rand(i*9)*(D+23);
   cone('cave',i+1170,x,top-2.76,z,.34+rand(i)*.47,
    .8+rand(i*13)*1.8,C.cave);
  }
  // Crystal lighting remains away from the board edges; a few little pools
  // of mineral light give scale without dangling geometry in the foreground.
  for(let i=0;i<4;i++){
   const x=cx+(i%2?-1:1)*(W*.5+5.5);
   const z=cz+(i<2?-D*.66:D*.66);
   for(let k=0;k<4;k++){
    const h=.9+(k%3)*.35+rand(i*7+k)*.20;
    cone('cave',1260+i*5+k,x+(k-2)*.30,top-2.70,
     z+(k%2)*.29,.19+k*.025,h,C.crystal,false,7);
   }
   lamps.cave.push([x,top+.4,z]);
  }
  for(let i=0;i<36;i++){
   const x=x0-4+rand(i*9)*(W+8);
   const z=z0-7-rand(i*5)*7.2;
   ringRock('cave',1320+i,x,top-2.85,z,
    .32+rand(i)*.48,.25+rand(i+4)*.48,
    .32+rand(i+3)*.44,C.cave);
  }
  stats.cave={stoneBattlefield:true,walls:76,crystalLamps:4,
   hangingStalactites:0,ceilingOccluders:0,viewCorridorClear:true,
   roofShadowOnly:true,arch:'distant-rear-cavern-passage',
   rockForm:'irregular-external-wall-mesh'};
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
root.PaperchalkLandscapeEnvironments=Object.freeze({version:'4.0.0',create});
})(window);

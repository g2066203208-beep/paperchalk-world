// Reusable, deterministic 1944 Normandy-inspired fictional settlement. Metre coordinates.
// Whitebox meshes first; material IDs are assigned separately by world-region.mjs.
export const PALETTE={grass:'#62694b',earth:'#746451',road:'#888276',cobble:'#88867e',stone:'#a6a59a',darkStone:'#72766f',trim:'#b9b6a4',plaster:'#b8b19a',cream:'#c7c1ad',ochre:'#b2a18a',rose:'#a38e80',wood:'#625345',woodLight:'#88735b',roof:'#75645e',roof2:'#535c61',roof3:'#81776a',glass:'#52676a',black:'#333936',iron:'#535754',water:'#526c6d',cloth:'#a0977b',red:'#895b50',blue:'#586e74',green:'#626d53',gold:'#b5a175',leaf:'#59634a',leaf2:'#778060',light:'#d7aa70',brick:'#987b6d',rubble:'#81786c',char:'#474744',asphalt:'#777974',mud:'#6d6250',moss:'#777e59',paper:'#c2b79b',white:'#d3d0bd',smoke:'#757a72',rail:'#45494a',rust:'#82614d'};
export function generateCity(seed=194406){
let rng=seed>>>0,rand=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296),pick=a=>a[Math.floor(rand()*a.length)];
const parts=[],colliders=[],buildings=[],shops=[],bridges=[],landmarks=[],smoke=[];
const add=(kind,pos,size,mat,extra={})=>{parts.push({kind,pos,size,mat,...extra});return parts.at(-1)};
const box=(x,y,z,w,h,d,m,extra)=>add('box',[x,y,z],[w,h,d],m,extra),cyl=(x,y,z,r,h,m,n=8,top=r)=>add('cylinder',[x,y,z],[r,h,top],m,{n});
const solid=(x,z,w,d)=>colliders.push([x-w/2,z-d/2,x+w/2,z+d/2]);
const surface=(x,z,w,d,y=.04,m='road')=>box(x,y-.12,z,w,.24,d,m);
const local=(x,z,r,u,v)=>[x+Math.cos(r)*u-Math.sin(r)*v,z+Math.sin(r)*u+Math.cos(r)*v];
const shopTypes=['BOULANGERIE','PHARMACIE','EPICERIE','CAFE','LIBRAIRIE','MERCERIE','BOUCHERIE','HOTEL','TABAC','CORDONNERIE'];
// Period façade families: limestone townhouses, slate mansions and older timber fronts.
const letters={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],Q:['010','101','101','111','011'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111']};
function house(x,z,w,d,floors,rot,commercial=false,ruin=false){
let h=3.05*floors,style=Math.abs(Math.round(x*13+z*7))%5,wall=style===0?'cream':style===1?'plaster':style===2?'stone':pick(['cream','ochre','plaster']),roof=style===1?'roof2':pick(['roof','roof2','roof3']);
const b=(u,y,v,a,hh,l,m)=>{let [X,Z]=local(x,z,rot,u,v);return l<=.035?add('face',[X,y,Z],[a,hh,0],m,{rot:rot+(v<0?Math.PI:0)}):box(X,y,Z,a,hh,l,m,{rot})};
const mesh=(u,y,v,vertices,faces,mat)=>{let [X,Z]=local(x,z,rot,u,v);let dims=[0,1,2].map(i=>Math.max(...vertices.map(p=>Math.abs(p[i])))*2);return add('mesh',[X,y,Z],dims,mat,{rot,vertices,faces})};
const beam=(x1,y1,x2,y2,v,t,m)=>{let L=Math.hypot(x2-x1,y2-y1),a=(y2-y1)/L*t/2,b=-(x2-x1)/L*t/2;mesh(0,0,v,[[x1+a,y1+b,0],[x2+a,y2+b,0],[x2-a,y2-b,0],[x1-a,y1-b,0]],[[0,1,2,3]],m)};
let wx=Math.abs(Math.cos(rot))*w+Math.abs(Math.sin(rot))*d,wz=Math.abs(Math.sin(rot))*w+Math.abs(Math.cos(rot))*d;
if(!ruin){
 b(0,h/2,0,w,h,d,wall);const rh=style===1?3.0+w*.18:2.2+rand()*1.6,frontGable=style===1;
 add('gable',[x,h,z],frontGable?[w+.22,rh,d+.24]:[d+.24,rh,w+.22],roof,{rot:frontGable?rot:rot+Math.PI/2});
 for(let side of [-1,1]){b(side*w*.36,h+rh*.68,0,.67,rh*.9,.72,'stone');b(side*w*.36,h+rh*1.13,0,.86,.16,.91,'trim');}
 for(let side of [-1,1]){
  b(0,h-.13,side*(d/2+.08),w+.12,.24,.27,'trim');
  for(let k=1;k<floors;k++)if(style!==1)b(0,k*3.05+.07,side*(d/2+.055),w,.13,.12,'trim');
  if(style===1){ // street-facing jettied timber front, filled gable and diagonal bracing
   if(side===1){
    mesh(0,h,d/2+.125,[[-w/2,0,0],[w/2,0,0],[0,rh,0]],[[0,1,2]],'cream');
    beam(-w/2,h,0,h+rh,d/2+.15,.18,'wood');beam(0,h+rh,w/2,h,d/2+.15,.18,'wood');
    beam(0,h,0,h+rh,d/2+.16,.16,'wood');
    b(0,h+rh*.31,d/2+.17,.76,.96,.08,'darkStone');b(0,h+rh*.31,d/2+.23,.58,.77,.04,'glass');
    for(let k=1;k<floors;k++){let yy=k*3.05;b(0,yy-.04,d/2+.20,w+.08,.19,.42,'wood');for(let sign of [-1,1]){beam(sign*w*.48,yy+.12,sign*w*.22,yy+1.0,d/2+.19,.13,'wood');beam(sign*w*.22,yy+.12,sign*w*.48,yy+1.0,d/2+.19,.13,'wood');}}
   }
   for(let j=0;j<=4;j++)b((j/4-.5)*(w-.18),h*.68,side*(d/2+.09),.16,h*.64,.15,'wood');
   for(let k=1;k<=floors;k++)b(0,Math.min(h-.09,k*3.05),side*(d/2+.10),w,.20,.18,'wood');
  }else if(style===2||style===4){
   for(let u of [-w/2+.16,w/2-.16])for(let k=1;k<Math.ceil(h/.55);k++)b(u,k*.55,side*(d/2+.09),k%2?.33:.48,.48,.14,'trim');
  }
 }
}
else{
 // Shell with real missing roof and uneven broken side walls.
 for(let s of [-1,1]){b(s*(w/2-.20),h*.37,0,.40,h*.74,d,wall);b(s*(w/2-.20),h*.82,-d*.29,.40,h*.23,d*.34,'brick')}
 b(0,h*.31,-d/2+.18,w,h*.62,.36,wall);
 for(let j=0;j<5;j++){let hh=1.4+rand()*2.4;b((j-2)*w/5,hh/2,d/2-.18,w/5+.02,hh,.40,j%2?'brick':wall)}
 for(let j=0;j<12;j++){let u=(rand()-.5)*w,v=(rand()-.5)*d;let hh=.20+rand()*.56;b(u,hh/2,v,.35+rand()*.8,hh,.32+rand()*.65,pick(['brick','rubble','wood','stone']))}
 smoke.push([x,h*.66,z]);
}
solid(x,z,wx,wz);b(0,.22,d/2+.05,w,.42,.18,'darkStone');
for(let s of [-1,1])for(let k=0;k<floors;k++){if(ruin&&k>0&&s===1)continue;if(commercial&&s===1&&k===0&&!ruin)continue;let n=Math.max(2,Math.round(w/2.5));for(let j=0;j<n;j++){let u=(j-(n-1)/2)*w/n,y=k*3.05+1.68;if(ruin&&k>0)continue;b(u,y,s*(d/2+.045),1.18,1.62,.13,'darkStone');b(u,y,s*(d/2+.125),.91,1.34,.06,ruin?'black':'glass');b(u,y,s*(d/2+.17),.07,1.36,.06,'woodLight');b(u,y,s*(d/2+.17),.94,.08,.06,'woodLight');b(u,y-.81,s*(d/2+.14),1.35,.12,.24,'trim');if(!ruin&&style!==1){b(u,y+.88,s*(d/2+.10),1.44,.20,.20,'trim');for(let t of [-1,1])b(u+t*.65,y,s*(d/2+.09),.12,1.65,.13,'trim');}if(!ruin&&style===3&&k===1){b(u,y-.77,s*(d/2+.39),1.48,.12,.65,'stone');for(let q=-2;q<=2;q++)b(u+q*.26,y-.43,s*(d/2+.68),.045,.56,.045,'iron');b(u,y-.13,s*(d/2+.68),1.34,.065,.08,'iron');}if(!ruin&&j%2===0){b(u-.75,y,s*(d/2+.13),.37,1.42,.10,'green');b(u+.75,y,s*(d/2+.13),.37,1.42,.10,'green')}}}
if(!ruin&&!commercial)for(let side of [-1,1])for(let k=0;k<floors;k++)for(let j=0;j<2;j++){let v=(j-.5)*d*.5;b(side*(w/2+.06),k*3.05+1.7,v,.13,1.4,1.1,'darkStone');b(side*(w/2+.15),k*3.05+1.7,v,.06,1.18,.88,'glass')}
if(commercial&&!ruin){
 const shopId=shops.length,type=shopTypes[shopId%shopTypes.length],frame=['green','wood','blue','red','woodLight'][shopId%5],sign=['black','green','blue','wood','red'][shopId%5],door=shopId%3===0?w*.28:0,front=d/2;
 b(0,1.45,front+.12,w-.17,2.9,.24,frame);
 b(door,1.22,front+.27,1.02,2.34,.15,'darkStone');b(door,1.48,front+.36,.76,1.55,.035,'glass');b(door,.36,front+.36,.72,.42,.035,'woodLight');
 b(door+.35,1.05,front+.40,.065,.16,.06,'gold');
 const spans=door===0?[[-w/2+.25,-.65],[.65,w/2-.25]]:[[-w/2+.23,door-.64],[door+.64,w/2-.23]];
 for(let [lo,hi] of spans){if(hi-lo<.45)continue;let mid=(lo+hi)/2,sw=hi-lo;
  b(mid,1.54,front+.26,sw,1.78,.07,'black');
  b(mid,1.54,front+.31,sw-.12,1.65,.035,'glass');
  b(mid,.58,front+.37,sw+.08,.14,.22,'woodLight');
  b(mid,1.52,front+.37,sw,.055,.10,'woodLight');
  for(let j=1;j<=Math.max(1,Math.floor(sw/1.0));j++)b(lo+j*sw/(Math.max(1,Math.floor(sw/1.0))+1),1.56,front+.37,.055,1.68,.09,'woodLight');
  // Modest silhouettes of period merchandise behind the window plane.
  for(let j=0;j<Math.min(6,Math.floor(sw/.32));j++){let xx=lo+.18+j*.30,hh=.13+(j%3)*.11,mat=type==='LIBRAIRIE'?['paper','red','wood'][j%3]:type==='BOULANGERIE'?'gold':['paper','cloth','woodLight'][j%3];b(xx,.76+hh/2,front+.325,.20,hh,.025,mat);}
 }
 b(0,2.83,front+.26,w-.28,.56,.17,sign);
 b(0,3.15,front+.29,w-.13,.10,.29,'trim');
 const unit=Math.min(.080,(w-.75)/(type.length*4)),total=(type.length*4-1)*unit;
 for(let i=0;i<type.length;i++){const glyph=letters[type[i]];if(!glyph)continue;for(let row=0;row<5;row++){let line=glyph[row];for(let j=0;j<3;){if(line[j]!=='1'){j++;continue}let end=j+1;while(end<3&&line[end]==='1')end++;b(-total/2+(i*4+(j+end-1)/2+.5)*unit,2.83+(2-row)*unit,front+.36,(end-j)*unit*.98,unit*.94,.025,'cream');j=end;}}}
 if(shopId%4!==2){let m=['cream','red','blue','green'][shopId%4],reach=1.12+(shopId%3)*.15,width=w-.25,n=shopId%3===0?1:8;
 for(let j=0;j<n;j++){let a=-width/2+j*width/n,bx=a+width/n,mat=n===1?m:j%2?'cloth':m;mesh(0,2.65,front+.29,[[a,.27,0],[bx,.27,0],[bx,-.15,reach],[a,-.15,reach]],[[0,3,2,1]],mat);b((a+bx)/2,2.40,front+.29+reach,bx-a,.22,.045,mat);}
 }
 if(shopId%4===0){b(w*.32,3.64,front+.60,.07,.08,.85,'iron');let [X,Z]=local(x,z,rot,w*.32,front+.91);box(X,3.39,Z,.11,.45,.58,sign,{rot});}
 if(type==='CAFE'){for(let t of [-1,1]){let [X,Z]=local(x,z,rot,t*w*.27,front+1.07);cyl(X,.70,Z,.37,.08,'woodLight',8);cyl(X,.34,Z,.05,.65,'iron',6);for(let side of [-1,1]){let [cx,cz]=local(x,z,rot,t*w*.27+side*.52,front+1.07);box(cx,.43,cz,.30,.07,.30,'wood',{rot});for(let v of [-1,1])box(cx+v*.10,.20,cz,.035,.40,.035,'iron')}}}
 if(type==='BOULANGERIE'||type==='EPICERIE'){b(w*.29,.39,front+.95,.82,.78,.58,'woodLight');for(let j=0;j<3;j++)b(w*.29+(j-1)*.21,.86,front+.95,.16,.17,.19,'gold');}
 let [sx,sz]=local(x,z,rot,0,front+.34);shops.push({type,x:sx,z:sz,rotation:rot,style:frame});
 }else if(!ruin){b(0,1.12,d/2+.12,1.20,2.24,.16,'wood');b(0,.12,d/2+.38,1.55,.24,.64,'stone')}
 buildings.push({x,z,w,d,floors,commercial,ruin});
}
function tree(x,z){cyl(x,1.5,z,.19,3,'wood',7,.10);add('foliage',[x,4,z],[1.9,3.4,1.6],'leaf');add('foliage',[x+.65,4.8,z-.22],[1.25,2.2,1.25],'leaf2')}
function lamp(x,z){cyl(x,.28,z,.26,.56,'darkStone');cyl(x,1.9,z,.065,3.25,'iron',6);box(x,3.56,z,.36,.48,.36,'iron');box(x,3.56,z,.28,.35,.38,'light');cyl(x,3.88,z,.30,.18,'iron',4,.04)}
function rubble(x,z,n=10){for(let i=0;i<n;i++){let h=.15+rand()*.42;box(x+(rand()-.5)*3,h/2,z+(rand()-.5)*2,.28+rand()*.60,h,.25+rand()*.55,pick(['brick','rubble','stone','wood']),{rot:rand()*Math.PI})}}
function bridge(x){let w=9,deck=2.15;for(let i=0;i<4;i++){let c=-15+i*10;for(let j=0;j<14;j++)add('arch',[x,-3.05,c],[4.3,.78,w],'stone',{a:j*Math.PI/14,b:(j+1)*Math.PI/14});for(let s of [-1,1])box(x,-1.6,c+s*4.7,w,2.3,1.25,'darkStone')}
box(x,deck-.30,0,w,.60,40,'stone');surface(x,0,w-.8,40,deck+.035,'cobble');for(let s of [-1,1]){box(x+s*4.12,deck+.55,0,.52,1.1,40,'stone');box(x+s*4.12,deck+1.13,0,.72,.18,40,'trim');solid(x+s*4.12,0,.52,40);add('ramp',[x,0,s*25],[w,deck,10],'cobble',{direction:s})}bridges.push({x,width:w,deck})}
// Same continuous river/road coordinates as the original V26 integration.
box(0,-1.6,-110,390,3.2,180,'grass');box(0,-1.6,110,390,3.2,180,'grass');box(0,-3.1,0,410,.2,40,'water');
const xs=[-144,-96,-48,0,48,96,144],zs=[-144,-96,-48,48,96,144];
for(let s of [-1,1]){box(0,-1,s*19.8,390,2,1,'darkStone');surface(0,s*24,380,7,.035,'cobble')}
for(let x of xs)for(let s of [-1,1]){surface(x,s*110,9,180,.045,'asphalt');for(let q of [-1,1])surface(x+q*5.8,s*110,2.6,168,.10,'stone')}
for(let z of zs){surface(0,z,368,9,.05,z===96?'road':'cobble');for(let q of [-1,1])surface(0,z+q*5.8,368,2.6,.105,'stone')}
// Street-level landmarks for the preserved old commercial quarter, same continuous world.
landmarks.push({name:'圣皮埃尔风格旧商业街',x:-72,z:96});
for(let x=-132;x<-12;x+=13){for(let side of [-1,1]){let z=96+side*6.4;cyl(x,.24,z,.095,.48,'iron',8);cyl(x,.51,z,.13,.10,'iron',8);}}

// Compact street-front blocks, narrower parcels, period masonry. Keep central axes open.
for(let ix=0;ix<xs.length-1;ix++)for(let s of [-1,1])for(let iz=0;iz<3;iz++){let xc=(xs[ix]+xs[ix+1])/2,zc=s*(iz===0?35:72+(iz-1)*48);if(s===-1&&iz===2&&Math.abs(xc)<49)continue;if(s===1&&iz===1&&Math.abs(xc)<25)continue;
for(let row of (iz===0?[s]:[-1,1])){
 let parcels=ix%2===0?5:4,raw=Array.from({length:parcels},()=>.75+rand()*.55),total=raw.reduce((a,b)=>a+b,0),span=35.7,left=xc-span/2;
 for(let j=0;j<parcels;j++){let w=span*raw[j]/total,x=left+w/2;left+=w;
  const main=s===1&&iz>0&&ix<3,z=iz===0?s*35.5:zc+row*(main?14.0:12.1),d=9.1+rand()*.6,commercial=main||iz!==2||j===1||j===2,ruined=rand()<(main?.035:s===1?.24:.13);
  house(x,z,w-.08,d,main?3+Math.floor(rand()*2):2+Math.floor(rand()*3),row===1?0:Math.PI,commercial,ruined);
 }
}}
for(let x of [-96,0,96])bridge(x);
// Civilian square and administrative quarter; no medieval crenellations or fantasy towers.
surface(0,72,38,35,.065,'cobble');landmarks.push({name:'市政广场',x:0,z:72});for(let s of [-1,1])for(let z of [60,84]){lamp(s*13,z);tree(s*16,z)}
cyl(0,.42,72,1.7,.84,'stone',12);cyl(0,.86,72,1.85,.18,'trim',12);cyl(0,.96,72,1.45,.05,'water',12);solid(0,72,3.2,3.2);
surface(0,-132,90,68,.06,'cobble');landmarks.push({name:'市政厅与教堂',x:0,z:-132});
house(-25,-144,28,19,3,0,false,false);house(25,-144,28,19,3,0,false,false);
box(0,5.2,-154,17,10.4,19,'stone');solid(0,-154,17,19);add('gable',[0,10.4,-154],[18,4.6,20],'roof2');
box(0,10,-141,5.6,20,5.6,'stone');solid(0,-141,5.6,5.6);for(let y of [10.2,18.9,20])box(0,y,-141,6.0,.25,6.0,'trim');cyl(0,26,-141,3.65,12,'roof2',8,.03);for(let side of [-1,1]){box(side*2.3,15.5,-138.15,.58,5.6,.22,'trim');box(side*2.3,19.3,-138.15,.8,.8,.8,'trim');}box(0,13.4,-138.15,1.7,3.3,.14,'black');box(0,5.2,-138.08,2.0,3.9,.16,'wood');for(let s of [-1,1])for(let z of [-150,-156,-162])box(s*8.6,6.0,z,.15,3,1.25,'glass');
for(let z of zs)for(let x of xs){lamp(x+6.6,z+6.4);if((x+z)%96===0)tree(x-6.8,z-6.8)}
// Parked civilian lorries, period street furniture, broken masonry and sparse smoke sources.
for(let [x,z] of [[53,89],[-53,41],[101,-55],[-101,-103]]){box(x,.58,z,1.85,.26,4.6,'black');box(x,1.42,z+1.12,1.85,1.44,1.68,'green');box(x,1.62,z+1.96,1.46,.58,.10,'glass');box(x,1.08,z-1,1.82,.88,2.50,'wood');for(let s of [-1,1])for(let j of [-1,1])cyl(x+s*.92,.48,z+j*1.4,.45,.26,'black',8);solid(x,z,2,4.7)}
for(let s of [-1,1])for(let x=-160;x<=160;x+=16){lamp(x,s*24);if((x+160)%48===0)rubble(x,s*31,6)}
// Railway goods yard along the western margin: rail sleepers, warehouse, platforms.
for(let z=-180;z<=180;z+=2.8){if(Math.abs(z)<32)continue;box(-166,.08,z,3.2,.16,.34,'wood');for(let s of [-1,1])box(-166+s*.82,.20,z,.10,.12,2.8,'rail')}
for(let z of [65,108,-65,-108])house(-177,z,10,15,2,Math.PI/2,false,false);
landmarks.push({name:'货运铁路',x:-166,z:90});
return {seed,parts,colliders,buildings,shops,bridges,landmarks,smoke,spawn:[0,1.7,91],bounds:[-185,-192,185,192]}
}
export function walkHeight(city,x,z){if(Math.abs(z)<30){let b=city.bridges.find(b=>Math.abs(x-b.x)<b.width/2-.45);if(b){let a=Math.abs(z);return a<=20?b.deck+.15:Math.max(0,b.deck*(30-a)/10)+.12}if(Math.abs(z)<19.5)return null}return .12}

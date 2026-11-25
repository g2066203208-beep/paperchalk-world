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
function house(x,z,w,d,floors,rot,commercial=false,ruin=false){
let h=3.05*floors,wall=pick(['plaster','cream','ochre','stone','rose']),roof=pick(['roof','roof2','roof3']);
const b=(u,y,v,a,hh,l,m)=>{let [X,Z]=local(x,z,rot,u,v);return box(X,y,Z,a,hh,l,m,{rot})};
let wx=Math.abs(Math.cos(rot))*w+Math.abs(Math.sin(rot))*d,wz=Math.abs(Math.sin(rot))*w+Math.abs(Math.cos(rot))*d;
if(!ruin){b(0,h/2,0,w,h,d,wall);add('gable',[x,h,z],[w+.45,1.8+rand()*1.3,d+.35],roof,{rot});b(w*.31,h+1.65,-d*.22,.73,2.45,.73,'brick');b(w*.31,h+2.92,-d*.22,.91,.15,.91,'stone')}
else{
 // Shell with real missing roof and uneven broken side walls.
 for(let s of [-1,1]){b(s*(w/2-.20),h*.37,0,.40,h*.74,d,wall);b(s*(w/2-.20),h*.82,-d*.29,.40,h*.23,d*.34,'brick')}
 b(0,h*.31,-d/2+.18,w,h*.62,.36,wall);
 for(let j=0;j<5;j++){let hh=1.4+rand()*2.4;b((j-2)*w/5,hh/2,d/2-.18,w/5+.02,hh,.40,j%2?'brick':wall)}
 for(let j=0;j<12;j++){let u=(rand()-.5)*w,v=(rand()-.5)*d;let hh=.20+rand()*.56;b(u,hh/2,v,.35+rand()*.8,hh,.32+rand()*.65,pick(['brick','rubble','wood','stone']))}
 smoke.push([x,h*.66,z]);
}
solid(x,z,wx,wz);b(0,.22,d/2+.05,w,.42,.18,'darkStone');
for(let s of [-1,1])for(let k=0;k<floors;k++){if(ruin&&k>0&&s===1)continue;if(commercial&&s===1&&k===0&&!ruin)continue;let n=Math.max(2,Math.round(w/2.5));for(let j=0;j<n;j++){let u=(j-(n-1)/2)*w/n,y=k*3.05+1.68;if(ruin&&k>0)continue;b(u,y,s*(d/2+.045),1.18,1.62,.13,'darkStone');b(u,y,s*(d/2+.125),.91,1.34,.06,ruin?'black':'glass');b(u,y,s*(d/2+.17),.07,1.36,.06,'woodLight');b(u,y,s*(d/2+.17),.94,.08,.06,'woodLight');b(u,y-.81,s*(d/2+.14),1.35,.12,.24,'trim');if(!ruin&&j%2===0){b(u-.75,y,s*(d/2+.13),.37,1.42,.10,'green');b(u+.75,y,s*(d/2+.13),.37,1.42,.10,'green')}}}
if(!ruin)for(let side of [-1,1])for(let k=0;k<floors;k++)for(let j=0;j<2;j++){let v=(j-.5)*d*.5;b(side*(w/2+.06),k*3.05+1.7,v,.13,1.4,1.1,'darkStone');b(side*(w/2+.15),k*3.05+1.7,v,.06,1.18,.88,'glass')}
if(commercial&&!ruin){let type=shopTypes[shops.length%shopTypes.length];b(0,1.36,d/2+.10,w-.7,2.72,.16,'wood');b(0,1.16,d/2+.20,1.16,2.30,.12,'black');for(let s of [-1,1]){b(s*w*.27,1.58,d/2+.21,w*.34,1.58,.10,'glass');b(s*w*.27,1.58,d/2+.28,.10,1.58,.10,'woodLight');b(s*w*.27,1.58,d/2+.28,w*.34,.09,.10,'woodLight');b(s*w*.27,.57,d/2+.25,w*.34,.16,.38,'trim')}
 b(0,2.94,d/2+.22,w-.9,.48,.18,'black');
 if(shops.length%3!==0){let m=pick(['cream','red','blue','green']);for(let j=0;j<8;j++){b((j-3.5)*(w-.45)/8,3.05,d/2+.78,(w-.45)/8,.11,1.38,j%2?'cloth':m);b((j-3.5)*(w-.45)/8,2.88,d/2+1.44,(w-.45)/8,.24,.09,j%2?'cloth':m)}}
 let [sx,sz]=local(x,z,rot,0,d/2+.34);shops.push({type,x:sx,z:sz,rotation:rot}); // sign art added as mesh strokes in world module
 if(type==='BOULANGERIE'||type==='EPICERIE'){b(w*.31,.42,d/2+1.03,1.1,.84,.72,'woodLight');for(let j=0;j<4;j++)b(w*.31+(j-1.5)*.23,.93,d/2+1.02,.20,.18,.22,'gold')}
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
for(let z of zs){surface(0,z,368,9,.05,'cobble');for(let q of [-1,1])surface(0,z+q*5.8,368,2.6,.105,'stone')}
// Compact street-front blocks, narrower parcels, period masonry. Keep central axes open.
for(let ix=0;ix<xs.length-1;ix++)for(let s of [-1,1])for(let iz=0;iz<3;iz++){let xc=(xs[ix]+xs[ix+1])/2,zc=s*(iz===0?35:72+(iz-1)*48);if(s===-1&&iz===2&&Math.abs(xc)<49)continue;if(s===1&&iz===1&&Math.abs(xc)<25)continue;
for(let row of (iz===0?[s]:[-1,1]))for(let j=0;j<3;j++){let x=xc+(j-1)*10.9,z=iz===0?s*35.5:zc+row*8.4,w=8.8+rand()*.9,d=9+rand()*1.2;let ruined=rand()<(s===1?.24:.13);house(x,z,w,d,2+Math.floor(rand()*2),row===1?0:Math.PI,iz!==2||j===1,ruined)}}
for(let x of [-96,0,96])bridge(x);
// Civilian square and administrative quarter; no medieval crenellations or fantasy towers.
surface(0,72,38,35,.065,'cobble');landmarks.push({name:'市政广场',x:0,z:72});for(let s of [-1,1])for(let z of [60,84]){lamp(s*13,z);tree(s*16,z)}
cyl(0,.42,72,1.7,.84,'stone',12);cyl(0,.86,72,1.85,.18,'trim',12);cyl(0,.96,72,1.45,.05,'water',12);solid(0,72,3.2,3.2);
surface(0,-132,90,68,.06,'cobble');landmarks.push({name:'市政厅与教堂',x:0,z:-132});
house(-25,-144,28,19,3,0,false,false);house(25,-144,28,19,3,0,false,false);
box(0,5.2,-154,17,10.4,19,'stone');solid(0,-154,17,19);add('gable',[0,10.4,-154],[18,4.6,20],'roof2');
box(0,10,-141,5.6,20,5.6,'stone');solid(0,-141,5.6,5.6);cyl(0,23,-141,4.0,6,'roof2',4,.03);box(0,13.4,-138.15,1.7,3.3,.14,'black');box(0,5.2,-138.08,2.0,3.9,.16,'wood');for(let s of [-1,1])for(let z of [-150,-156,-162])box(s*8.6,6.0,z,.15,3,1.25,'glass');
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

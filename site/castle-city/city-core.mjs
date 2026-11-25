// Shared seeded medieval city generator. World units are metres. No external imagery.
export const VERSION='0.1.0';
export const PALETTE={grass:'#657c52',earth:'#80735a',road:'#a59d89',cobble:'#918d80',stone:'#b5ad98',darkStone:'#858477',trim:'#d0c4a5',plaster:'#d9c5a1',cream:'#e6d7b8',ochre:'#c3a16f',rose:'#b38a75',wood:'#624b3b',woodLight:'#98734d',roof:'#835149',roof2:'#596971',roof3:'#8b7753',glass:'#495c60',black:'#383b36',iron:'#4b5050',water:'#527e84',cloth:'#b58455',red:'#9d5548',blue:'#577a83',green:'#687d58',gold:'#c9aa6b',leaf:'#627c48',leaf2:'#849052',light:'#f1c98a'};
export function generateCity(seed=20261125){
let state=seed>>>0;const rand=()=>((state=Math.imul(1664525,state)+1013904223>>>0)/4294967296),pick=a=>a[Math.floor(rand()*a.length)];
const parts=[],colliders=[],buildings=[],shops=[],bridges=[],landmarks=[];
const add=(kind,pos,size,mat,extra={})=>{parts.push({kind,pos,size,mat,...extra});return parts.at(-1)};
const box=(x,y,z,w,h,d,m,extra)=>add('box',[x,y,z],[w,h,d],m,extra);
const cylinder=(x,y,z,r,h,m,n=8,rTop=r)=>add('cylinder',[x,y,z],[r,h,rTop],m,{n});
const roof=(x,y,z,w,h,d,m)=>add('gable',[x,y,z],[w,h,d],m);
const solid=(x,z,w,d)=>colliders.push([x-w/2,z-d/2,x+w/2,z+d/2]);
const surface=(x,z,w,d,y=.02,m='road')=>box(x,y-.12,z,w,.24,d,m);
const roadsX=[-144,-96,-48,0,48,96,144],roadsZ=[-144,-96,-48,48,96,144];
const shopTypes=['BAKERY','APOTHECARY','BOOKS','TAILOR','TAVERN','SMITH','POTTERY','FLORIST','GROCER','INN','FISH','CANDLE'];
const goods=['woodLight','gold','green','red','cream','blue'];
function local(x,z,rot,u,v){return [x+Math.cos(rot)*u-Math.sin(rot)*v,z+Math.sin(rot)*u+Math.cos(rot)*v]}
function shopFront(x,z,rot,w,type,id){
 const b=(u,y,v,a,h,d,m)=>{let [X,Z]=local(x,z,rot,u,v);box(X,y,Z,a,h,d,m,{rot})};
 b(0,1.35,.08,w-1.0,2.7,.18,'wood');b(0,1.33,.20,1.25,2.55,.10,'black');for(let s of [-1,1]){b(s*w*.26,1.57,.22,w*.32,1.6,.10,'glass');b(s*w*.26,1.57,.29,.10,1.65,.12,'woodLight');b(s*w*.26,1.57,.30,w*.32,.10,.12,'woodLight');b(s*w*.26,.63,.33,w*.35,.15,.45,'trim')}
 b(0,2.98,.14,w-.7,.48,.24,'wood');b(0,3.31,.66,w-.4,.12,1.35,'woodLight');
 let color=pick(['red','blue','green','cloth']);for(let j=0;j<8;j++){b(-w*.43+(j+.5)*w*.86/8,3.20,.86,w*.86/8+.01,.11,1.48,j%2?'cream':color);b(-w*.43+(j+.5)*w*.86/8,3.04,1.56,w*.86/8+.01,.30,.09,j%2?'cream':color)}
 let [sx,sz]=local(x,z,rot,0,.29);add('sign',[sx,2.98,sz],[w-.9,.39,.06],'wood',{rot,text:type});
 for(let s of [-1,1]){b(s*(w*.38),.36,1.15,.8,.72,.65,'woodLight');for(let j=0;j<3;j++)b(s*w*.38+(j-1)*.22,.80,1.16,.19,.23,.27,pick(goods))}
 shops.push({id,type,x,z,rotation:rot});
}
function house(x,z,w,d,floors,rot,commercial=false){
 const h=3.2*floors,mat=pick(['plaster','cream','ochre','rose']),rm=pick(['roof','roof2','roof3']);
 box(x,h/2,z,w,h,d,mat,{rot});let wx=Math.abs(Math.cos(rot))*w+Math.abs(Math.sin(rot))*d,wz=Math.abs(Math.sin(rot))*w+Math.abs(Math.cos(rot))*d;solid(x,z,wx,wz);
 const b=(u,y,v,a,h,d,m)=>{let [X,Z]=local(x,z,rot,u,v);box(X,y,Z,a,h,d,m,{rot})};
 add('gable',[x,h,z],[w+.65,2.0+rand()*1.4,d+.65],rm,{rot});
 for(let s of [-1,1]){b(s*(w/2-.08),h/2,d/2+.03,.18,h,.15,'wood');b(s*(w/2-.08),h/2,-d/2-.03,.18,h,.15,'wood')}
 for(let k=0;k<=floors;k++)for(let s of [-1,1])b(0,k*3.2+.10,s*(d/2+.04),w,.20,.18,'wood');
 for(let s of [-1,1])for(let k=0;k<floors;k++){if(commercial&&s===1&&k===0)continue;let n=Math.max(2,Math.round(w/2.8));for(let j=0;j<n;j++){let u=(j-(n-1)/2)*w/n,yy=k*3.2+1.75;b(u,yy,s*(d/2+.055),1.28,1.65,.13,'wood');b(u,yy,s*(d/2+.135),.99,1.38,.08,'glass');b(u,yy,s*(d/2+.19),.09,1.38,.08,'trim');b(u,yy,s*(d/2+.19),.99,.09,.08,'trim');b(u,yy-.81,s*(d/2+.19),1.42,.14,.28,'trim');if(k>0&&j%2===0){b(u-.80,yy,s*(d/2+.12),.34,1.45,.12,'woodLight');b(u+.80,yy,s*(d/2+.12),.34,1.45,.12,'woodLight')}}}
 // Visible side elevations, not a billboard.
 for(let side of [-1,1])for(let k=1;k<floors;k++)for(let j=0;j<2;j++){let v=(j-.5)*d*.46;b(side*(w/2+.06),k*3.2+1.75,v,.13,1.30,1.05,'wood');b(side*(w/2+.15),k*3.2+1.75,v,.08,1.05,.80,'glass')}
 if(commercial){let [fx,fz]=local(x,z,rot,0,d/2);shopFront(fx,fz,rot,w,shopTypes[shops.length%shopTypes.length],shops.length)}else{b(0,1.15,d/2+.10,1.35,2.30,.18,'wood');b(0,.13,d/2+.40,1.7,.25,.72,'stone')}
 let [cx,cz]=local(x,z,rot,w*.29,-d*.18);box(cx,h+2.3,cz,.82,2.7,.85,'darkStone');box(cx,h+3.64,cz,1.04,.22,1.06,'stone');
 buildings.push({x,z,w,d,floors,commercial});
}
function lamp(x,z){cylinder(x,.24,z,.32,.48,'stone');cylinder(x,1.60,z,.075,2.7,'iron',6);box(x,3.01,z,.38,.52,.38,'iron');box(x,3.01,z,.30,.40,.40,'light');add('cylinder',[x,3.36,z],[.32,.22,.04],'iron',{n:4})}
function tree(x,z){cylinder(x,1.35,z,.16,2.7,'wood',7,.11);add('foliage',[x,3.3,z],[1.45,2.2,1.45],'leaf');add('foliage',[x+.4,4.05,z-.22],[1.1,1.6,1.1],'leaf2')}
function crate(x,z,y=.45){box(x,y,z,.9,.9,.9,'woodLight');for(let s of [-1,1])box(x+s*.35,y,z+.46,.12,.9,.06,'wood')}
function barrel(x,z){cylinder(x,.56,z,.46,1.12,'woodLight',10,.43);for(let y of [.20,.87])cylinder(x,y,z,.47,.09,'iron',10)}
function wall(x,z,w,d,h=9){box(x,h/2,z,w,h,d,'stone');solid(x,z,w,d);let along=w>d,n=Math.floor((along?w:d)/3.2);for(let j=0;j<n;j++){let t=(j-(n-1)/2)*3.2;box(x+(along?t:0),h+.62,z+(along?0:t),along?1.65:d,1.24,along?d:1.65,'stone')}}
function tower(x,z,r,h,cone=true){cylinder(x,h/2,z,r,h,'stone',12);solid(x,z,r*1.72,r*1.72);cylinder(x,h-.12,z,r+.45,.7,'trim',12);for(let j=0;j<12;j++){let a=j*Math.PI/6;cylinder(x+Math.cos(a)*(r-.2),h+.62,z+Math.sin(a)*(r-.2),.68,1.25,'stone',4)}if(cone)cylinder(x,h+3.4,z,r+.2,6.5,'roof2',12,.04)}
function archBridge(x){
 let w=9,z0=-20,z1=20,span=10,deck=2.15;
 // Four real arch openings: segmented voussoirs and separate piers; no solid wall in opening.
 for(let i=0;i<4;i++){let c=z0+span*(i+.5);for(let j=0;j<14;j++){let a=j*Math.PI/14,b=(j+1)*Math.PI/14;add('arch',[x,-3.05,c],[4.3,.78,w], 'stone',{a,b});}for(let s of [-1,1])box(x,-1.6,c+s*4.7,w,2.3,1.25,'darkStone')}
 box(x,deck-.30,0,w,.60,40,'stone');surface(x,0,w-1,40,deck+.03,'cobble');
 for(let s of [-1,1]){box(x+s*4.12,deck+.55,0,.52,1.1,40,'stone');box(x+s*4.12,deck+1.13,0,.72,.18,40,'trim');solid(x+s*4.12,0,.52,40);for(let z=-18;z<=18;z+=6)box(x+s*4.12,deck+.63,z,.82,1.4,.85,'trim')}
 for(let s of [-1,1])add('ramp',[x,0,s*25],[w,deck,10],'cobble',{direction:s});
 bridges.push({x,width:w,deck});
}
 // River runs east-west. Two separated terrain banks, no hidden terrain through river.
 box(0,-1.6,-110,390,3.2,180,'grass');box(0,-1.6,110,390,3.2,180,'grass');
 box(0,-3.1,0,410,.2,40,'water');for(let s of [-1,1]){box(0,-1.0,s*19.8,390,2.0,1,'darkStone');surface(0,s*24,380,7,.035,'cobble')}
 for(let x of roadsX)for(let s of [-1,1])surface(x,s*110,10,180,.04,'cobble');
 for(let z of roadsZ)surface(0,z,368,10,.045,'cobble');
 // Staggered parcels with service alleys; main streets remain clear.
 for(let ix=0;ix<roadsX.length-1;ix++)for(let s of [-1,1])for(let iz=0;iz<3;iz++){
 let xc=(roadsX[ix]+roadsX[ix+1])/2,zc=s*(48+iz*48-24);if(iz===0)zc=s*33;
 if(s===-1&&iz===2&&Math.abs(xc)<49)continue;
 if(s===1&&iz===1&&Math.abs(xc)<25)continue;
 for(let row of (iz===0?[s]:[-1,1]))for(let j=0;j<3;j++){let x=xc+(j-1)*11,z=iz===0?s*35.4:zc+row*8.3,d=9+rand()*1.5,w=8.8+rand()*1.1,rot=row===1?0:Math.PI;house(x,z,w,d,2+Math.floor(rand()*2),rot,iz!==2||j===1)}
 }
 for(let x of [-96,0,96])archBridge(x);
 // Market square with actual stalls, well, and goods.
 surface(0,72,82,36,.055,'road');landmarks.push({name:'中央集市',x:0,z:72});
 for(let s of [-1,1])for(let i=0;i<5;i++){let x=s*(12+i*6.8),z=65+(i%2)*14;box(x,.8,z,4.2,.18,2.3,'woodLight');for(let a of [-1,1])for(let b of [-1,1])box(x+a*1.9,1.5,z+b*.95,.14,3,.14,'wood');let c=pick(['red','blue','green','cloth']);for(let j=0;j<6;j++)box(x-1.75+j*.70,3.0,z,.70,.14,2.9,j%2?'cream':c);for(let j=0;j<5;j++)box(x-1.6+j*.8,1.05,z,.48,.32,.55,pick(goods));solid(x,z,4.2,2.3)}
 cylinder(0,.50,72,2,1,'stone',12);cylinder(0,1.02,72,2.2,.22,'trim',12);cylinder(0,1.15,72,1.5,.06,'water',12);cylinder(0,1.65,72,.30,1.1,'stone');solid(0,72,3.4,3.4);
 // Castle precinct with gate opening and courtyard, real surrounding towers.
 surface(0,-132,90,68,.065,'road');landmarks.push({name:'王城',x:0,z:-132});
 for(let s of [-1,1]){wall(s*45,-136,3,64,10);wall(s*26,-104,38,3,10);tower(s*45,-104,5.2,15);tower(s*45,-168,5.2,16);tower(s*8,-104,3.2,12,false)}
 wall(0,-168,90,3,10);box(0,10.25,-104,12,3.5,3.1,'stone'); // gateway underneath remains open
 box(0,9.5,-151,32,19,22,'stone');solid(0,-151,32,22);add('gable',[0,19,-151],[34,8,24],'roof2');for(let s of [-1,1])tower(s*19,-152,4.2,24);
 for(let k=0;k<3;k++)for(let j=-2;j<=2;j++){box(j*5.6,4.2+k*4.5,-139.9,1.4,2.5,.18,'darkStone');box(j*5.6,4.2+k*4.5,-139.77,1.02,2.1,.08,'glass')}
 for(let s of [-1,1]){house(s*28,-130,12,12,2,s===1?Math.PI/2:-Math.PI/2,false);tree(s*18,-116)}
 // City perimeter walls; openings on the axial streets.
 for(let s of [-1,1]){for(let z of [-145,-65,65,145])wall(s*185,z,3,76,8);for(let x of [-135,-45,45,135])wall(x,s*192,78,3,8);for(let z of [-184,-30,30,184])tower(s*185,z,4.5,12,false)}
 for(let z of roadsZ)for(let x of roadsX){lamp(x+5.9,z+5.9);if((x+z)%96===0)tree(x-6.5,z-6.5)}
 for(let s of [-1,1])for(let x=-170;x<=170;x+=12){lamp(x,s*24);if(x%24===-2){barrel(x,s*28);crate(x+1.25,s*28)}}
 // River moorings and small boats.
 for(let x of [-154,-126,126,154]){let s=x<0?1:-1;box(x,-.28,s*15,4.5,.22,9,'woodLight');for(let j of [-1,1])cylinder(x+j*1.8,-.85,s*11,.20,2.3,'wood');box(x,-2.7,s*8,5.8,.5,2.1,'wood');box(x,-2.35,s*8,4.8,.22,1.8,'woodLight')}
 return {seed,parts,colliders,buildings,shops,bridges,landmarks,spawn:[0,1.7,91],bounds:[-185,-192,185,192]};
}
export function walkHeight(city,x,z){if(Math.abs(z)<30){let b=city.bridges.find(b=>Math.abs(x-b.x)<b.width/2-.45);if(b){let a=Math.abs(z);return a<=20?b.deck+.15:Math.max(0,b.deck*(30-a)/10)+.12}if(Math.abs(z)<19.5)return null}return .12}
export function canWalk(city,x,z,r=.30){let [a,b,c,d]=city.bounds;if(x<a+r||x>c-r||z<b+r||z>d-r||walkHeight(city,x,z)===null)return false;return !city.colliders.some(q=>x>q[0]-r&&x<q[2]+r&&z>q[1]-r&&z<q[3]+r)}
export function auditCity(city){return {buildings:city.buildings.length,shops:city.shops.length,bridges:city.bridges.length,parts:city.parts.length,colliders:city.colliders.length,finite:city.parts.every(p=>[...p.pos,...p.size].every(Number.isFinite)),spawnClear:canWalk(city,city.spawn[0],city.spawn[2]),bridgeCenters:city.bridges.map(b=>canWalk(city,b.x,0)),riverBlocked:!canWalk(city,24,0)}}

// Shared geometry expansion used by both WebGL and software verification.
export function triangles(part,emit){
 const [x,y,z]=part.pos,[w,h,d]=part.size,a=part.rot||0,c=Math.cos(a),s=Math.sin(a);
 const tr=p=>[x+c*p[0]-s*p[2],y+p[1],z+s*p[0]+c*p[2]];
 const tri=(a,b,c)=>emit(tr(a),tr(b),tr(c),part);
 const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d)};
 function cube(v){for(let f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])quad(...f.map(i=>v[i]))}
 if(part.kind==='box'||part.kind==='sign'){let A=w/2,B=h/2,C=d/2;cube([[-A,-B,-C],[A,-B,-C],[A,B,-C],[-A,B,-C],[-A,-B,C],[A,-B,C],[A,B,C],[-A,B,C]])}
 else if(part.kind==='gable'){let A=w/2,C=d/2;quad([-A,0,-C],[-A,0,C],[0,h,C],[0,h,-C]);quad([A,0,C],[A,0,-C],[0,h,-C],[0,h,C]);tri([-A,0,C],[A,0,C],[0,h,C]);tri([A,0,-C],[-A,0,-C],[0,h,-C]);}
 else if(part.kind==='cylinder'){let n=part.n||8;for(let i=0;i<n;i++){let a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,A=[Math.cos(a)*w,-h/2,Math.sin(a)*w],B=[Math.cos(b)*w,-h/2,Math.sin(b)*w],C=[Math.cos(b)*d,h/2,Math.sin(b)*d],D=[Math.cos(a)*d,h/2,Math.sin(a)*d];quad(A,D,C,B);tri([0,-h/2,0],A,B);tri([0,h/2,0],C,D)}}
 else if(part.kind==='arch'){let p=(r,t,X)=>[X,r*Math.sin(t),r*Math.cos(t)],v=[p(w,part.a,-d/2),p(w,part.b,-d/2),p(w+h,part.b,-d/2),p(w+h,part.a,-d/2),p(w,part.a,d/2),p(w,part.b,d/2),p(w+h,part.b,d/2),p(w+h,part.a,d/2)];cube(v)}
 else if(part.kind==='ramp'){let A=w/2,B=d/2,lo=part.direction===1?h:0,hi=part.direction===1?0:h;cube([[-A,0,-B],[A,0,-B],[A,lo,-B],[-A,lo,-B],[-A,0,B],[A,0,B],[A,hi,B],[-A,hi,B]])}
 else if(part.kind==='foliage'){let p=[[0,h/2,0],[w,0,0],[0,0,d],[-w,0,0],[0,0,-d],[0,-h/2,0]];for(let i=1;i<=4;i++){let j=i%4+1;tri(p[0],p[j],p[i]);tri(p[5],p[i],p[j])}}
}

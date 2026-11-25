
const CLEANER=(()=>{
const palette={jacket:[77,83,65],cuff:[55,59,45],shorts:[63,68,49],tights:[55,43,42],boot:[91,72,48],sole:[56,48,39],glove:[107,89,49],apron:[112,72,57],pocket:[129,83,64],seam:[77,49,40],scarf:[130,49,43],scarfDark:[103,37,34],hair:[76,63,57],hairLight:[99,84,74],hairDark:[57,48,44],wood:[143,109,72],steel:[82,82,83],edge:[146,143,138],iron:[49,47,48],gold:[190,148,66],paper:[208,210,189],bottle:[48,71,67],cap:[121,118,105]};
const avg=(P,f)=>[0,1,2].map(k=>f.reduce((v,i)=>v+P[i][k],0)/f.length),sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,t)=>a.map(v=>v*t),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
function build(P,rest,quads,zones,show={hair:true,clothes:true,axe:true}){
let out=P.map(p=>p.slice()),faces=quads.map(f=>f.slice()),mats=quads.map(()=>'skin'),orig=quads.map((_,i)=>i),norm=P.map(()=>[0,0,0]);
function face(f,m){faces.push(f);mats.push(m);orig.push(-1)}
function vert(p){out.push(p);return out.length-1}
function patch(rows,m){let ids=rows.map(r=>r.map(vert));for(let j=0;j<ids.length-1;j++)for(let i=0;i<ids[j].length-1;i++)face([ids[j][i],ids[j][i+1],ids[j+1][i+1],ids[j+1][i]],m);return ids}
function rings(rows,m,cap=true){let ids=rows.map(r=>r.map(vert)),n=ids[0].length;for(let k=0;k<ids.length-1;k++)for(let j=0;j<n;j++)face([ids[k][j],ids[k][(j+1)%n],ids[k+1][(j+1)%n],ids[k+1][j]],typeof m==='function'?m(k,j):m);if(cap)for(let k of [0,ids.length-1]){let c=vert(avg(out,ids[k]));for(let j=0;j<n;j++)face(k===0?[c,ids[k][(j+1)%n],ids[k][j]]:[c,ids[k][j],ids[k][(j+1)%n]],typeof m==='function'?m(k,j):m)}return ids}
function box(x,y,z,w,h,d,m){let a=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>vert([x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2]));for(let f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])face(f.map(i=>a[i]),m)}
function tube(a,b,r1,r2,m,n=8){let d=unit(sub(b,a)),u=unit(cross(d,Math.abs(d[2])<.9?[0,0,1]:[0,1,0])),v=cross(d,u);return rings([a,b].map((p,k)=>Array.from({length:n},(_,i)=>add(p,add(mul(u,Math.cos(i*2*Math.PI/n)*(k?r2:r1)),mul(v,Math.sin(i*2*Math.PI/n)*(k?r2:r1)))))),m)}
function ell(y,rx,rz,cz=0,n=12){return Array.from({length:n},(_,i)=>{let t=i*Math.PI*2/n;return [Math.sin(t)*rx,y,cz+Math.cos(t)*rz]})}
if(show.clothes){
// Covered body faces become the clothing surface. Same index and pose, no hidden duplicate body.
for(let f of quads){let n=unit(cross(sub(P[f[1]],P[f[0]]),sub(P[f[2]],P[f[0]])));for(let i of f)norm[i]=add(norm[i],n)}
// Tailored ease: a garment envelope rather than a constant skin offset.
// The original covered vertices are reused, including all V48 joint corrections.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
function sample(rows,y){if(y<=rows[0][0])return rows[0].slice(1);for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){let a=rows[i-1],b=rows[i],t=(y-a[0])/(b[0]-a[0]);return a.slice(1).map((x,k)=>lerp(x,b[k+1],t))}return rows.at(-1).slice(1)}
const torso=[[1.23,.27,.20,.018],[1.36,.30,.226,.020],[1.49,.30,.226,.025],[1.67,.287,.226,.022],[1.86,.278,.239,.020],[1.98,.256,.173,.009],[2.06,.16,.125,0]];
const sleeves=[[1.445,.37,.069,.075],[1.49,.365,.111,.103],[1.61,.332,.117,.108],[1.73,.283,.124,.106],[1.86,.25,.122,.110],[1.97,.221,.102,.100],[2.025,.19,.078,.085]];
function restDelta(i){let p=rest[i],y=p[1],z=zones[i],sg=Math.sign(p[0])||1,x=Math.abs(p[0]);if(y>=2.075)return [0,0,0];if(z===1||z===2){if(y<1.445)return mul(unit(norm[i]),.014);let [cx,rx,rz]=sample(sleeves,y),dx=x-cx,dz=p[2],r=Math.hypot(dx/rx,dz/rz)||1,wr=.010*Math.sin((y-1.45)*65)*(1-smooth((y-1.64)/.25));let target=[sg*(cx+dx*Math.max(1.06,1/r)),y,dz*Math.max(1.08,1/r)];target[0]+=sg*wr*dx/(Math.hypot(dx,dz)||1);target[2]+=wr*dz/(Math.hypot(dx,dz)||1);return sub(target,p)}
if(z===3||z===4){let amt=y<.53?.044:y>1.10?.042:.008;return mul(unit(norm[i]),amt)}
let [rx,rz,cz]=sample(torso,y),dx=p[0],dz=p[2]-cz,ang=Math.atan2(dx/rx,dz/rz),r=Math.hypot(dx/rx,dz/rz)||1;let q=[dx*Math.max(1.025,1/r),y,cz+dz*Math.max(1.025,1/r)];let t=smooth((y-1.25)/.13)*(1-smooth((y-1.98)/.10));return mul(sub(q,p),t)}
for(let i=0;i<P.length;i++){let delta=restDelta(i); // rotate the offset into the local posed surface normal where the pose bends.
let n0=[0,0,0];for(let f of quads)if(f.includes(i)){let n=unit(cross(sub(rest[f[1]],rest[f[0]]),sub(rest[f[2]],rest[f[0]])));n0=add(n0,n)}let a=unit(n0),b=unit(norm[i]),v=cross(a,b),c=a.reduce((t,x,k)=>t+x*b[k],0);if(c>-.95){let u=cross(v,delta),w=cross(v,u);delta=add(delta,add(u,mul(w,1/(1+c))))}out[i]=add(P[i],delta)}
for(let [i,f] of quads.entries()){let y=avg(rest,f)[1],arm=f.filter(j=>zones[j]===1||zones[j]===2).length>=2,leg=f.filter(j=>zones[j]===3||zones[j]===4).length>=2;if(y>2.075)continue;mats[i]=arm?(y<1.44?'glove':y<1.50?'cuff':'jacket'):leg?(y<.365?'sole':y<.53?'boot':y>1.10?'shorts':'tights'):y<1.36?'shorts':'jacket'}
patch([[1.12,.318,.277],[1.31,.321,.280],[1.50,.316,.280],[1.68,.263,.277],[1.87,.185,.282],[1.91,.166,.278]].map(([y,w,z])=>[-1,-.5,0,.5,1].map(t=>[w*t,y,z-.026*t*t])),'apron');
for(let sg of [-1,1]){patch([[1.90,.258],[2.025,.151],[2.065,.015],[2.02,-.125],[1.86,-.164]].map(([y,z])=>[[sg*.115-.026,y,z],[sg*.115+.026,y,z]]),'apron');box(sg*.115,1.938,.239,.063,.044,.018,'cap');box(sg*.115,1.968,.221,.068,.015,.016,'iron');box(sg*.172,1.39,.291,.158,.218,.025,'pocket');box(sg*.172,1.50,.309,.168,.028,.02,'seam')}
box(0,1.80,.286,.115,.103,.014,'gold');box(0,1.80,.297,.082,.074,.012,'seam');box(0,1.80,.306,.024,.062,.008,'gold');box(0,1.80,.308,.059,.019,.008,'gold');
box(.174,1.405,.316,.098,.14,.010,'paper');for(let j=0;j<5;j++)box(.174,1.44-j*.018,.323,.070,.005,.003,'cuff');box(.174,1.48,.327,.035,.018,.012,'cap');
for(let x of [-.206,-.147]){tube([x,1.50,.306],[x,1.66,.306],.023,.020,'bottle');tube([x,1.66,.306],[x,1.68,.306],.022,.022,'cap')}
rings([[1.99,.207,.19],[2.075,.219,.244],[2.15,.201,.257],[2.214,.18,.222]].map(([y,rx,rz],k)=>ell(y,rx,rz,.012).map((p,j)=>[p[0],p[1]+.034*Math.sin(j*Math.PI/6+.5*k),p[2]])),(k,j)=>(j+k*3)%5===0?'scarfDark':'scarf',false);
// Hood behind the scarf, attached to jacket neckline.
rings([ell(1.96,.24,.17,-.035),ell(2.04,.28,.21,-.065),ell(2.09,.23,.17,-.075)],'jacket',false);
}
if(show.hair){
// Same folded, three-column card topology as marksman V19, tailored to the bob reference.
// Each panel has its own flow, crown overlap, width and hem. No latitude sphere or spiky fringe.
const crown=[2.965,2.936,2.845,2.695,2.505],rx=[.045,.19,.31,.369,.375],rz=[.052,.205,.307,.378,.367];
function panel(angles,ends,offset=0){let rows=[];for(let k=0;k<6;k++){let t=k/5;let idx=Math.min(4,k),row=[];for(let j=0;j<3;j++){let a=angles[j]+(1-t)*.18,ey=ends[j],y=k<4?crown[idx]:(k===4?(crown[3]+ey)*.5:ey),xrad=k<4?rx[idx]:k===4?.373:.345,zrad=k<4?rz[idx]:k===4?.375:.340;if(Math.cos(a)>.6&&k>=4){xrad=.365;zrad=.365}let ridge=j===1?.012:0;row.push([Math.sin(a)*(xrad+ridge+offset),y,Math.cos(a)*(zrad+ridge+offset)-.006])}rows.push(row)}let ids=patch(rows,'hair');return ids}
const pi=Math.PI;for(let j=0;j<8;j++){let a=.92+j*(2*pi-1.84)/8,b=.92+(j+1)*(2*pi-1.84)/8,mid=(a+b)/2;let end=2.235+.07*Math.abs(Math.sin(mid));panel([a-.025,mid,b+.025],[end+.023,end-.018,end+.012],(j%2)*.005)}
// Five broad irregular front cards follow an off-centre part; bottom edges are mostly straight.
const fringe=[[-.99,-.77,-.51,2.32,2.39,2.53],[-.55,-.36,-.14,2.54,2.48,2.50],[-.18,.035,.24,2.48,2.47,2.54],[.19,.37,.55,2.56,2.59,2.64],[.51,.74,.99,2.60,2.46,2.30]];
for(let [a,m,b,l,c,r] of fringe)panel([a,m,b],[l,c,r],.015);
const root=[-.06,2.95,.015],curve=[root,[-.15,3.002,.018],[-.25,3.02,.014],[-.33,2.99,.03]];for(let j=0;j<3;j++)tube(curve[j],curve[j+1],.010-j*.002,.008-j*.002,'hair',5);
}
if(show.axe){const hand=rest.map((p,i)=>i).filter(i=>zones[i]===2&&rest[i][1]<1.36),delta=sub(avg(P,hand),avg(rest,hand)),T=p=>add(p,delta);tube(T([-.36,1.42,.06]),T([-1.03,.58,.13]),.038,.052,'wood',8);
let outline=[[-.99,.70],[-1.15,.61],[-1.24,.48],[-1.17,.34],[-.78,.03],[-.64,.15],[-.55,.32],[-.70,.37],[-.82,.48]],layers=[-.046,.046].map(z=>outline.map(([x,y])=>vert(T([x,y,.13+z]))));for(let k=0;k<2;k++){let c=vert(T([-.98,.41,.13+(k?.046:-.046)]));for(let j=0;j<outline.length;j++)face([c,layers[k][j],layers[k][(j+1)%outline.length]],j>=3&&j<=5?'edge':'steel')}for(let j=0;j<outline.length;j++)face([layers[0][j],layers[0][(j+1)%outline.length],layers[1][(j+1)%outline.length],layers[1][j]],j>=3&&j<=5?'edge':'iron');tube(T([-1.06,.67,.13]),T([-1.19,.47,.13]),.065,.073,'iron',6);for(let z of [-.06,.06]){let p=T([-1.12,.57,.13+z]);tube(p,add(p,[0,0,z*.3]),.022,.022,'cap',8)}
}
return {positions:out,polygons:faces,mats,orig,baseCount:P.length};
}
function pixel(m,p,n){let c=palette[m]||[255,222,205],q=p.map(v=>Math.floor(v*92)),h=((Math.imul(q[0],73856093)^Math.imul(q[1],19349663)^Math.imul(q[2],83492791))>>>0)%17,shade=.78+.22*Math.max(0,n[1]*.45+n[2]*.8-n[0]*.15),v=(h-8)*.60;if(m.startsWith('hair')){let band=Math.max(0,1-Math.abs(p[1]-2.76)/.09);v=band*8+(h-8)*.23;shade=.88+.12*Math.abs(n[1]*.45+n[2]*.8-n[0]*.15);}if(['jacket','apron','pocket'].includes(m))v+=q[1]%23===0?-8:0;if(m==='wood')v+=(q[0]+q[1])%8===0?-10:0;return c.map(x=>Math.max(0,Math.min(255,x*shade+v)))}
return {build,pixel,palette};
})();
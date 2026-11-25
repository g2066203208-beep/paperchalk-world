
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
for(let i=0;i<P.length;i++){let y=rest[i][1],z=zones[i],amount=0;if(y<2.075){if(z===1||z===2)amount=y>1.445?.047:.017;else if(z===3||z===4)amount=y<.53?.035:y>1.10?.035:.009;else amount=.035}out[i]=add(P[i],mul(unit(norm[i]),amount))}
for(let [i,f] of quads.entries()){let y=avg(rest,f)[1],arm=f.filter(j=>zones[j]===1||zones[j]===2).length>=2,leg=f.filter(j=>zones[j]===3||zones[j]===4).length>=2;if(y>2.075)continue;mats[i]=arm?(y<1.44?'glove':y<1.50?'cuff':'jacket'):leg?(y<.365?'sole':y<.53?'boot':y>1.10?'shorts':'tights'):y<1.36?'shorts':'jacket'}
patch([[1.14,.295,.235],[1.33,.30,.255],[1.50,.277,.252],[1.68,.225,.218],[1.87,.177,.255],[1.91,.157,.246]].map(([y,w,z])=>[-1,-.5,0,.5,1].map(t=>[w*t,y,z-.045*t*t])),'apron');
for(let sg of [-1,1]){patch([[1.90,.258],[2.025,.151],[2.065,.015],[2.02,-.125],[1.86,-.164]].map(([y,z])=>[[sg*.115-.026,y,z],[sg*.115+.026,y,z]]),'apron');box(sg*.115,1.938,.239,.063,.044,.018,'cap');box(sg*.115,1.968,.221,.068,.015,.016,'iron');box(sg*.172,1.39,.263,.158,.218,.025,'pocket');box(sg*.172,1.50,.281,.168,.028,.02,'seam')}
box(0,1.80,.267,.115,.103,.014,'gold');box(0,1.80,.278,.082,.074,.012,'seam');box(0,1.80,.287,.024,.062,.008,'gold');box(0,1.80,.289,.059,.019,.008,'gold');
box(.174,1.405,.288,.098,.14,.010,'paper');for(let j=0;j<5;j++)box(.174,1.44-j*.018,.295,.070,.005,.003,'cuff');box(.174,1.48,.299,.035,.018,.012,'cap');
for(let x of [-.206,-.147]){tube([x,1.50,.273],[x,1.66,.273],.023,.020,'bottle');tube([x,1.66,.273],[x,1.68,.273],.022,.022,'cap')}
rings([[1.99,.207,.19],[2.075,.219,.244],[2.15,.201,.257],[2.214,.18,.222]].map(([y,rx,rz],k)=>ell(y,rx,rz,.012).map((p,j)=>[p[0],p[1]+.034*Math.sin(j*Math.PI/6+.5*k),p[2]])),(k,j)=>(j+k*3)%5===0?'scarfDark':'scarf',false);
// Hood behind the scarf, attached to jacket neckline.
rings([ell(1.96,.24,.17,-.035),ell(2.04,.28,.21,-.065),ell(2.09,.23,.17,-.075)],'jacket',false);
}
if(show.hair){
let rows=[];for(let k=0;k<5;k++){let rx=[.055,.25,.357,.369,.337][k],rz=[.065,.256,.365,.374,.354][k];rows.push(Array.from({length:18},(_,j)=>{let a=j*2*Math.PI/18,c=Math.cos(a),y=[2.947,2.91,2.785,2.60,2.23+.39*Math.max(0,c)**2][k];return [Math.sin(a)*rx,y,rz*c-.018]}))}rings(rows,(k,j)=>j%7===3?'hairLight':j%5===2?'hairDark':'hair',false);
for(let j=0;j<7;j++){let x=-.267+j*.085,tip=2.49+.13*Math.abs(x)/.27+(j===4?.075:0),z=.346+.014*(1-Math.abs(x)/.27),w=.066;let ids=[[x-w,2.83,.217],[x+w,2.83,.217],[x+w*.68,tip+.028,z],[x-w*.45,tip,z],[x+.018,2.665,z+.046]].map(vert);for(let [a,b] of [[0,1],[1,2],[2,3],[3,0]])face([ids[a],ids[b],ids[4]],(a+j)%5===0?'hairLight':'hair')}
for(let sg of [-1,1])patch([[[sg*.31,2.72,.18],[sg*.355,2.68,.045]],[[sg*.329,2.43,.204],[sg*.371,2.40,.016]],[[sg*.28,2.19,.166],[sg*.34,2.21,-.025]]],'hairDark');
tube([-.08,2.924,0],[-.21,2.99,.01],.012,.009,'hair',5);tube([-.21,2.99,.01],[-.31,2.967,.025],.009,.003,'hair',5);
}
if(show.axe){const hand=rest.map((p,i)=>i).filter(i=>zones[i]===2&&rest[i][1]<1.36),delta=sub(avg(P,hand),avg(rest,hand)),T=p=>add(p,delta);tube(T([-.36,1.42,.06]),T([-1.03,.58,.13]),.038,.052,'wood',8);
let outline=[[-.99,.70],[-1.15,.61],[-1.24,.48],[-1.17,.34],[-.78,.03],[-.64,.15],[-.55,.32],[-.70,.37],[-.82,.48]],layers=[-.046,.046].map(z=>outline.map(([x,y])=>vert(T([x,y,.13+z]))));for(let k=0;k<2;k++){let c=vert(T([-.98,.41,.13+(k?.046:-.046)]));for(let j=0;j<outline.length;j++)face([c,layers[k][j],layers[k][(j+1)%outline.length]],j>=3&&j<=5?'edge':'steel')}for(let j=0;j<outline.length;j++)face([layers[0][j],layers[0][(j+1)%outline.length],layers[1][(j+1)%outline.length],layers[1][j]],j>=3&&j<=5?'edge':'iron');tube(T([-1.06,.67,.13]),T([-1.19,.47,.13]),.065,.073,'iron',6);for(let z of [-.06,.06]){let p=T([-1.12,.57,.13+z]);tube(p,add(p,[0,0,z*.3]),.022,.022,'cap',8)}
}
return {positions:out,polygons:faces,mats,orig,baseCount:P.length};
}
function pixel(m,p,n){let c=palette[m]||[255,222,205],q=p.map(v=>Math.floor(v*92)),h=((Math.imul(q[0],73856093)^Math.imul(q[1],19349663)^Math.imul(q[2],83492791))>>>0)%17,shade=.78+.22*Math.max(0,n[1]*.45+n[2]*.8-n[0]*.15),v=(h-8)*.60;if(m.startsWith('hair'))v+=((q[0]+Math.floor(q[1]*.2))%9===0?8:0);if(['jacket','apron','pocket'].includes(m))v+=q[1]%23===0?-8:0;if(m==='wood')v+=(q[0]+q[1])%8===0?-10:0;return c.map(x=>Math.max(0,Math.min(255,x*shade+v)))}
return {build,pixel,palette};
})();
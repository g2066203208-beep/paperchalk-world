
const CLEANER=(()=>{
const palette={jacket:[77,83,65],cuff:[55,59,45],shorts:[63,68,49],tights:[55,43,42],boot:[91,72,48],sole:[56,48,39],glove:[107,89,49],apron:[112,72,57],pocket:[129,83,64],seam:[77,49,40],scarf:[130,49,43],scarfDark:[103,37,34],hair:[91,79,72],hairLight:[105,91,82],hairDark:[75,64,58],wood:[143,109,72],steel:[82,82,83],edge:[146,143,138],iron:[49,47,48],gold:[190,148,66],paper:[208,210,189],bottle:[48,71,67],cap:[121,118,105]};
const avg=(P,f)=>[0,1,2].map(k=>f.reduce((v,i)=>v+P[i][k],0)/f.length),sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,t)=>a.map(v=>v*t),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
function build(P,rest,quads,zones,show={hair:true,clothes:true,axe:true}){
let out=P.map(p=>p.slice()),faces=quads.map(f=>f.slice()),mats=quads.map(()=>'skin'),orig=quads.map((_,i)=>i),norm=P.map(()=>[0,0,0]),restNorm=P.map(()=>[0,0,0]);
function face(f,m){faces.push(f);mats.push(m);orig.push(-1)}
function vert(p){out.push(p);return out.length-1}
function patch(rows,m){let ids=rows.map(r=>r.map(vert));for(let j=0;j<ids.length-1;j++)for(let i=0;i<ids[j].length-1;i++)face([ids[j][i],ids[j][i+1],ids[j+1][i+1],ids[j+1][i]],m);return ids}
function rings(rows,m,cap=true){let ids=rows.map(r=>r.map(vert)),n=ids[0].length;for(let k=0;k<ids.length-1;k++)for(let j=0;j<n;j++)face([ids[k][j],ids[k][(j+1)%n],ids[k+1][(j+1)%n],ids[k+1][j]],typeof m==='function'?m(k,j):m);if(cap)for(let k of [0,ids.length-1]){let c=vert(avg(out,ids[k]));for(let j=0;j<n;j++)face(k===0?[c,ids[k][(j+1)%n],ids[k][j]]:[c,ids[k][j],ids[k][(j+1)%n]],typeof m==='function'?m(k,j):m)}return ids}
function box(x,y,z,w,h,d,m){let a=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>vert([x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2]));for(let f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])face(f.map(i=>a[i]),m)}
function tube(a,b,r1,r2,m,n=8){let d=unit(sub(b,a)),u=unit(cross(d,Math.abs(d[2])<.9?[0,0,1]:[0,1,0])),v=cross(d,u);return rings([a,b].map((p,k)=>Array.from({length:n},(_,i)=>add(p,add(mul(u,Math.cos(i*2*Math.PI/n)*(k?r2:r1)),mul(v,Math.sin(i*2*Math.PI/n)*(k?r2:r1)))))),m)}
function ell(y,rx,rz,cz=0,n=12){return Array.from({length:n},(_,i)=>{let t=i*Math.PI*2/n;return [Math.sin(t)*rx,y,cz+Math.cos(t)*rz]})}
if(show.clothes){
// Covered body faces become the clothing surface. Same index and pose, no hidden duplicate body.
for(let f of quads){let n=unit(cross(sub(P[f[1]],P[f[0]]),sub(P[f[2]],P[f[0]])));let rn=unit(cross(sub(rest[f[1]],rest[f[0]]),sub(rest[f[2]],rest[f[0]])));for(let i of f){norm[i]=add(norm[i],n);restNorm[i]=add(restNorm[i],rn)}}
// Tailored ease: a garment envelope rather than a constant skin offset.
// The original covered vertices are reused, including all V48 joint corrections.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
function sample(rows,y){if(y<=rows[0][0])return rows[0].slice(1);for(let i=1;i<rows.length;i++)if(y<=rows[i][0]){let a=rows[i-1],b=rows[i],t=(y-a[0])/(b[0]-a[0]);return a.slice(1).map((x,k)=>lerp(x,b[k+1],t))}return rows.at(-1).slice(1)}
const torso=[[1.23,.27,.20,.018],[1.36,.30,.226,.020],[1.49,.30,.226,.025],[1.67,.287,.226,.022],[1.86,.278,.239,.020],[1.98,.256,.173,.009],[2.06,.16,.125,0]];
const sleeves=[[1.445,.37,.069,.075],[1.49,.365,.111,.103],[1.61,.332,.117,.108],[1.73,.283,.124,.106],[1.86,.25,.122,.110],[1.97,.221,.102,.100],[2.025,.19,.078,.085]];
function restDelta(i){let p=rest[i],y=p[1],z=zones[i],sg=Math.sign(p[0])||1,x=Math.abs(p[0]);if(y>=2.075)return [0,0,0];if(z===1||z===2){if(y<1.445)return mul(unit(restNorm[i]),.014);let [cx,rx,rz]=sample(sleeves,y),dx=x-cx,dz=p[2],r=Math.hypot(dx/rx,dz/rz)||1,wr=.010*Math.sin((y-1.45)*65)*(1-smooth((y-1.64)/.25));let target=[sg*(cx+dx*Math.max(1.06,1/r)),y,dz*Math.max(1.08,1/r)];target[0]+=sg*wr*dx/(Math.hypot(dx,dz)||1);target[2]+=wr*dz/(Math.hypot(dx,dz)||1);return sub(target,p)}
if(z===3||z===4){let amt=y<.53?.044:y>1.10?.042:.008;return mul(unit(restNorm[i]),amt)}
let [rx,rz,cz]=sample(torso,y),dx=p[0],dz=p[2]-cz,ang=Math.atan2(dx/rx,dz/rz),r=Math.hypot(dx/rx,dz/rz)||1;let q=[dx*Math.max(1.025,1/r),y,cz+dz*Math.max(1.025,1/r)];let t=smooth((y-1.25)/.13)*(1-smooth((y-1.98)/.10));return mul(sub(q,p),t)}
for(let i=0;i<P.length;i++){let delta=restDelta(i); // rotate the offset into the local posed surface normal where the pose bends.
let a=unit(restNorm[i]),b=unit(norm[i]),v=cross(a,b),c=a.reduce((t,x,k)=>t+x*b[k],0);if(c>-.95){let u=cross(v,delta),w=cross(v,u);delta=add(delta,add(u,mul(w,1/(1+c))))}out[i]=add(P[i],delta)}
for(let [i,f] of quads.entries()){let y=avg(rest,f)[1],arm=f.filter(j=>zones[j]===1||zones[j]===2).length>=2,leg=f.filter(j=>zones[j]===3||zones[j]===4).length>=2;if(y>2.075)continue;mats[i]=arm?(y<1.44?'glove':y<1.50?'cuff':'jacket'):leg?(y<.365?'sole':y<.53?'boot':y>1.10?'shorts':'tights'):y<1.36?'shorts':'jacket'}
patch([[1.12,.318,.277],[1.31,.321,.280],[1.50,.316,.280],[1.68,.263,.277],[1.87,.185,.282],[1.91,.166,.278]].map(([y,w,z])=>[-1,-.5,0,.5,1].map(t=>[w*t,y,z-.026*t*t])),'apron');
for(let sg of [-1,1]){patch([[1.90,.287],[2.025,.174],[2.065,.015],[2.02,-.125],[1.86,-.164]].map(([y,z])=>[[sg*.115-.026,y,z],[sg*.115+.026,y,z]]),'apron');box(sg*.115,1.938,.262,.063,.044,.018,'cap');box(sg*.115,1.968,.245,.068,.015,.016,'iron');box(sg*.172,1.39,.291,.158,.218,.025,'pocket');box(sg*.172,1.50,.309,.168,.028,.02,'seam')}
box(0,1.80,.286,.115,.103,.014,'gold');box(0,1.80,.297,.082,.074,.012,'seam');box(0,1.80,.306,.024,.062,.008,'gold');box(0,1.80,.308,.059,.019,.008,'gold');
box(.174,1.405,.316,.098,.14,.010,'paper');for(let j=0;j<5;j++)box(.174,1.44-j*.018,.323,.070,.005,.003,'cuff');box(.174,1.48,.327,.035,.018,.012,'cap');
for(let x of [-.206,-.147]){tube([x,1.50,.306],[x,1.66,.306],.023,.020,'bottle');tube([x,1.66,.306],[x,1.68,.306],.022,.022,'cap')}
rings([[1.99,.207,.19],[2.075,.219,.244],[2.15,.201,.257],[2.214,.18,.222]].map(([y,rx,rz],k)=>ell(y,rx,rz,.012).map((p,j)=>[p[0],p[1]+.034*Math.sin(j*Math.PI/6+.5*k),p[2]])),(k,j)=>(j+k*3)%5===0?'scarfDark':'scarf',false);
// Hood behind the scarf, attached to jacket neckline.
rings([ell(1.96,.24,.17,-.035),ell(2.04,.28,.21,-.065),ell(2.09,.23,.17,-.075)],'jacket',false);
}
if(show.hair){
// V03: individually authored left / ridge / right stations. No spherical shell,
// common latitude rings, radial replication or thin spikes. The part sweeps left.
const hairStart=faces.length;
const cards=[
["back-centre",[
 [[-.115,2.972,-.035],[.015,3.035,-.075],[.145,2.972,-.045]],
 [[-.177,2.916,-.229],[.010,2.976,-.283],[.192,2.912,-.231]],
 [[-.190,2.704,-.355],[.020,2.742,-.426],[.211,2.695,-.350]],
 [[-.175,2.452,-.359],[.035,2.463,-.428],[.220,2.445,-.342]],
 [[-.127,2.298,-.305],[.041,2.278,-.365],[.188,2.316,-.313]]
]],
["back-left",[
 [[-.265,2.902,.025],[-.204,2.975,-.026],[-.093,2.974,-.055]],
 [[-.359,2.785,-.095],[-.321,2.879,-.205],[-.163,2.916,-.241]],
 [[-.390,2.565,-.154],[-.352,2.660,-.330],[-.170,2.711,-.385]],
 [[-.365,2.351,-.160],[-.325,2.415,-.338],[-.159,2.463,-.380]],
 [[-.318,2.245,-.113],[-.268,2.285,-.304],[-.110,2.314,-.325]]
]],
["back-right",[
 [[.084,2.976,-.056],[.218,2.978,-.023],[.282,2.892,.012]],
 [[.167,2.916,-.242],[.334,2.862,-.218],[.363,2.775,-.099]],
 [[.183,2.706,-.384],[.364,2.645,-.337],[.399,2.547,-.149]],
 [[.198,2.461,-.374],[.352,2.400,-.319],[.408,2.350,-.115]],
 [[.169,2.319,-.324],[.301,2.283,-.278],[.358,2.298,-.098]]
]],
["left-side-main",[
 [[-.092,3.008,.077],[-.214,2.996,.076],[-.283,2.914,-.036]],
 [[-.261,2.901,.210],[-.374,2.847,.125],[-.373,2.765,-.098]],
 [[-.307,2.655,.263],[-.421,2.669,.093],[-.386,2.565,-.174]],
 [[-.288,2.414,.267],[-.404,2.414,.072],[-.371,2.352,-.170]],
 [[-.248,2.233,.189],[-.353,2.235,.026],[-.337,2.268,-.122]]
]],
["right-side-main",[
 [[.118,3.011,.057],[.241,2.986,.057],[.282,2.900,-.049]],
 [[.268,2.890,.204],[.370,2.837,.129],[.378,2.768,-.105]],
 [[.312,2.660,.240],[.420,2.646,.083],[.397,2.558,-.161]],
 [[.313,2.418,.201],[.409,2.412,.061],[.418,2.355,-.100]],
 [[.295,2.295,.153],[.386,2.295,.042],[.409,2.335,-.093]]
]],
["fringe-wide-left",[
 [[-.155,2.964,-.058],[.006,3.060,-.034],[.127,3.015,.031]],
 [[-.279,2.875,.223],[-.114,3.010,.258],[.067,2.966,.275]],
 [[-.317,2.704,.281],[-.155,2.847,.429],[.030,2.819,.348]],
 [[-.276,2.545,.298],[-.146,2.655,.434],[.004,2.654,.385]],
 [[-.201,2.500,.310],[-.108,2.528,.398],[-.036,2.552,.367]]
]],
["fringe-centre-under",[
 [[.014,3.011,.041],[.087,3.034,.083],[.175,2.968,.080]],
 [[-.029,2.924,.305],[.059,2.960,.355],[.172,2.913,.286]],
 [[-.048,2.760,.374],[.037,2.809,.422],[.146,2.777,.365]],
 [[-.033,2.609,.360],[.053,2.654,.405],[.147,2.661,.350]],
 [[-.014,2.565,.344],[.047,2.568,.386],[.095,2.607,.357]]
]],
["fringe-right-narrow",[
 [[.112,3.012,.024],[.210,2.992,.101],[.273,2.904,.088]],
 [[.129,2.923,.278],[.234,2.916,.312],[.294,2.840,.211]],
 [[.157,2.745,.350],[.261,2.788,.359],[.326,2.735,.246]],
 [[.164,2.643,.320],[.253,2.633,.345],[.314,2.599,.244]],
 [[.206,2.618,.306],[.252,2.594,.317],[.283,2.609,.264]]
]],
["left-temple-lock",[
 [[-.185,2.963,.130],[-.270,2.938,.149],[-.316,2.850,.070]],
 [[-.268,2.796,.298],[-.354,2.806,.282],[-.383,2.733,.159]],
 [[-.294,2.594,.297],[-.369,2.623,.294],[-.402,2.570,.139]],
 [[-.277,2.390,.269],[-.361,2.409,.264],[-.386,2.374,.112]],
 [[-.215,2.211,.167],[-.277,2.209,.191],[-.305,2.255,.117]]
]],
["right-temple-lock",[
 [[.209,2.955,.126],[.277,2.932,.153],[.325,2.855,.080]],
 [[.267,2.785,.277],[.355,2.799,.255],[.388,2.725,.138]],
 [[.295,2.603,.267],[.381,2.626,.234],[.404,2.568,.113]],
 [[.276,2.415,.226],[.363,2.438,.211],[.396,2.414,.081]],
 [[.264,2.308,.143],[.325,2.294,.158],[.351,2.317,.098]]
]]];
// Inner overlapping cards remain darker, outer ridges get modest directional color.
for(const [name,rows] of cards){patch(rows,name==='back-centre'||name==='fringe-centre-under'?'hairDark':'hair')}
// Bridge the crown and part with a real swept lock; the visible fringe edge
// has distinct tapered ends rather than a continuous helmet rim.
patch([
 [[-.018,3.044,.001],[.079,3.062,.048],[.149,3.016,.089]],
 [[.049,2.990,.230],[.124,3.014,.288],[.209,2.950,.236]],
 [[.087,2.820,.362],[.155,2.852,.405],[.211,2.804,.339]],
 [[.106,2.663,.359],[.158,2.681,.399],[.199,2.684,.333]],
 [[.139,2.614,.343],[.162,2.604,.369],[.184,2.651,.348]]
],'hair');
// Offset broad swept left fringe: curved front ridge, changing width, independent tip.
patch([
 [[-.118,3.010,.071],[-.028,3.074,.085],[.044,3.040,.115]],
 [[-.235,2.929,.244],[-.121,3.019,.311],[-.005,2.984,.301]],
 [[-.253,2.777,.353],[-.166,2.858,.447],[-.071,2.822,.413]],
 [[-.213,2.592,.367],[-.160,2.642,.449],[-.088,2.648,.412]],
 [[-.177,2.530,.351],[-.140,2.515,.410],[-.110,2.556,.400]]
],'hairLight');
// Large back-side locks with a separate silhouette and continuous ridge.
patch([
 [[-.042,3.039,-.062],[-.151,3.028,-.100],[-.224,2.965,-.089]],
 [[-.143,2.951,-.234],[-.283,2.940,-.292],[-.358,2.822,-.186]],
 [[-.196,2.730,-.380],[-.334,2.752,-.390],[-.406,2.605,-.210]],
 [[-.180,2.499,-.386],[-.345,2.482,-.381],[-.399,2.424,-.166]],
 [[-.239,2.324,-.302],[-.326,2.268,-.310],[-.371,2.305,-.175]]
],'hair');
patch([
 [[.020,3.044,-.056],[.126,3.041,-.093],[.211,2.967,-.082]],
 [[.119,2.950,-.236],[.261,2.939,-.304],[.352,2.817,-.197]],
 [[.184,2.733,-.376],[.332,2.738,-.399],[.405,2.592,-.208]],
 [[.176,2.515,-.389],[.338,2.514,-.380],[.414,2.443,-.147]],
 [[.214,2.347,-.335],[.319,2.319,-.328],[.393,2.355,-.153]]
],'hair');
const curl=[[-.06,3.020,.045],[-.125,3.095,.039],[-.215,3.128,.044],[-.304,3.115,.053],[-.345,3.080,.062],[-.348,3.060,.071]];
// A single continuous five-sided tapered curved mesh, visible from front and side.
rings(curl.map((p,i)=>{let d=unit(sub(curl[Math.min(i+1,curl.length-1)],curl[Math.max(0,i-1)])),u=unit(cross(d,[0,0,1])),v=cross(d,u),r=[.014,.013,.010,.007,.004,.002][i];return Array.from({length:5},(_,j)=>add(p,add(mul(u,r*Math.cos(j*2*Math.PI/5)),mul(v,r*Math.sin(j*2*Math.PI/5))))) }),'hairDark',true);
}
if(show.axe){const hand=rest.map((p,i)=>i).filter(i=>zones[i]===2&&rest[i][1]<1.36),delta=sub(avg(P,hand),avg(rest,hand)),T=p=>add(p,delta);tube(T([-.36,1.42,.06]),T([-1.03,.58,.13]),.038,.052,'wood',8);
let outline=[[-.99,.70],[-1.15,.61],[-1.24,.48],[-1.17,.34],[-.78,.03],[-.64,.15],[-.55,.32],[-.70,.37],[-.82,.48]],layers=[-.046,.046].map(z=>outline.map(([x,y])=>vert(T([x,y,.13+z]))));for(let k=0;k<2;k++){let c=vert(T([-.98,.41,.13+(k?.046:-.046)]));for(let j=0;j<outline.length;j++)face([c,layers[k][j],layers[k][(j+1)%outline.length]],j>=3&&j<=5?'edge':'steel')}for(let j=0;j<outline.length;j++)face([layers[0][j],layers[0][(j+1)%outline.length],layers[1][(j+1)%outline.length],layers[1][j]],j>=3&&j<=5?'edge':'iron');tube(T([-1.06,.67,.13]),T([-1.19,.47,.13]),.065,.073,'iron',6);for(let z of [-.06,.06]){let p=T([-1.12,.57,.13+z]);tube(p,add(p,[0,0,z*.3]),.022,.022,'cap',8)}
}
return {positions:out,polygons:faces,mats,orig,baseCount:P.length};
}
function pixel(m,p,n){let c=palette[m]||[255,222,205],q=p.map(v=>Math.floor(v*92)),h=((Math.imul(q[0],73856093)^Math.imul(q[1],19349663)^Math.imul(q[2],83492791))>>>0)%17,shade=.78+.22*Math.max(0,n[1]*.45+n[2]*.8-n[0]*.15),v=(h-8)*.60;if(m.startsWith('hair')){v=(h-8)*.12;shade=.79+.21*Math.abs(n[1]*.45+n[2]*.8-n[0]*.15);}if(['jacket','apron','pocket'].includes(m))v+=q[1]%23===0?-8:0;if(m==='wood')v+=(q[0]+q[1])%8===0?-10:0;return c.map(x=>Math.max(0,Math.min(255,x*shade+v)))}
return {build,pixel,palette};
})();
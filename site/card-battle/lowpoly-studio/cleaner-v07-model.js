
const CLEANER=(()=>{
const palette={jacket:[77,83,65],cuff:[55,59,45],shorts:[63,68,49],tights:[55,43,42],boot:[91,72,48],sole:[56,48,39],glove:[107,89,49],apron:[112,72,57],pocket:[129,83,64],seam:[77,49,40],scarf:[130,49,43],scarfDark:[103,37,34],hair:[94,83,77],hairLight:[97,86,80],hairDark:[82,72,66],wood:[143,109,72],steel:[82,82,83],edge:[146,143,138],iron:[49,47,48],gold:[190,148,66],paper:[208,210,189],bottle:[48,71,67],cap:[121,118,105]};
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
// V07: V05 silhouette restoration; no V06 strand duplication or stripe materials. The scalp is only a recessed root coverage layer, not the visible hairstyle.
// Reuse the actual head topology to stop light skin appearing between root overlaps.
const roots=new Map(),center=[0,2.55,-.005];
for(let fi=0;fi<quads.length;fi++){let c=avg(rest,quads[fi]);if(quads[fi].every(i=>rest[i][1]>2.20)&&(c[1]>2.73||(c[1]>2.43&&c[2]<.10)))mats[fi]='hairDark';}
for(const f of quads){const c=avg(rest,f);if(!f.every(i=>rest[i][1]>2.20)||!(c[1]>2.61||(c[1]>2.43&&c[2]<.17)||(c[1]>2.34&&c[2]<.035)))continue;
  face(f.map(i=>{if(!roots.has(i))roots.set(i,vert(add(P[i],mul(unit(sub(rest[i],center)),.027))));return roots.get(i)}),'hairDark');
}
// Small recessed crossing lock at crown. It bridges the gap between the
// back and front root paths, not a visible helmet or global shell.
patch([
 [[-.185,2.950,-.075],[-.085,3.008,-.080],[.015,2.997,-.075]],
 [[-.18,2.973,.026],[-.065,3.020,.023],[.065,3.008,.035]],
 [[-.165,2.936,.147],[-.053,2.999,.149],[.071,2.962,.148]]
],'hair');
patch([
 [[-.025,2.994,-.079],[.090,3.020,-.080],[.205,2.958,-.063]],
 [[-.015,3.003,.020],[.102,3.027,.031],[.206,2.977,.039]],
 [[.024,2.958,.137],[.134,2.992,.153],[.222,2.920,.147]]
],'hair');
// Each row defines a left edge, crest and right edge. Hand-authored swept locks,
// differing root paths and hem lengths, with overlaps only where strands interleave.
function lock(rows,material='hair'){
// Only insert curved intermediate stations at the crown; keep the broad V05 panels.
// Smooth the upper contour without subdividing across the fold or changing the ends.
let refined=[];for(let i=0;i<rows.length-1;i++){refined.push(rows[i]);if(i<3){let row=rows[i].map((p,j)=>p.map((v,k)=>{let a=rows[Math.max(0,i-1)][j][k],b=v,c=rows[i+1][j][k],d=rows[Math.min(rows.length-1,i+2)][j][k];return (-a+9*b+9*c-d)/16}));refined.push(row)}}refined.push(rows.at(-1));patch(refined,material);
}
// Back fall: crown flows backwards then turns outward a little at the nape.
lock([
[[-.14,2.969,-.01],[.014,3.016,-.033],[.15,2.970,-.025]],
[[-.19,2.918,-.185],[.008,2.976,-.233],[.19,2.915,-.193]],
[[-.205,2.786,-.297],[.014,2.831,-.374],[.213,2.779,-.292]],
[[-.20,2.613,-.342],[.016,2.642,-.407],[.22,2.613,-.34]],
[[-.16,2.418,-.343],[.024,2.426,-.404],[.19,2.415,-.34]],
[[-.13,2.288,-.322],[.021,2.270,-.380],[.16,2.294,-.320]],
[[-.115,2.112,-.275],[.026,2.083,-.326],[.147,2.124,-.285]]
],'hair');
lock([
[[-.25,2.902,.06],[-.18,2.982,.014],[-.035,3.011,-.019]],
[[-.32,2.817,-.018],[-.29,2.935,-.16],[-.11,2.94,-.202]],
[[-.382,2.67,-.09],[-.352,2.793,-.282],[-.16,2.8,-.343]],
[[-.383,2.49,-.11],[-.345,2.58,-.35],[-.168,2.61,-.377]],
[[-.34,2.32,-.09],[-.305,2.39,-.325],[-.15,2.405,-.369]],
[[-.303,2.234,-.10],[-.283,2.265,-.305],[-.122,2.31,-.323]],
[[-.286,2.103,-.114],[-.264,2.081,-.268],[-.111,2.118,-.293]]
]);
lock([
[[.014,3.012,-.025],[.16,2.985,-.018],[.251,2.903,.035]],
[[.11,2.946,-.203],[.28,2.932,-.171],[.332,2.819,-.04]],
[[.16,2.808,-.351],[.35,2.79,-.278],[.382,2.669,-.10]],
[[.165,2.614,-.381],[.354,2.586,-.351],[.39,2.486,-.12]],
[[.14,2.417,-.37],[.32,2.39,-.329],[.408,2.328,-.117]],
[[.127,2.311,-.34],[.289,2.288,-.32],[.392,2.302,-.12]],
[[.112,2.128,-.299],[.273,2.108,-.286],[.376,2.159,-.107]]
]);
// Left curtain: one long curved cheek lock, tapered around the chin.
lock([
[[-.055,3.012,.04],[-.145,3.018,.08],[-.24,2.957,.054]],
[[-.16,2.958,.185],[-.284,2.946,.188],[-.335,2.84,.095]],
[[-.255,2.816,.267],[-.365,2.806,.225],[-.38,2.72,.069]],
[[-.277,2.622,.281],[-.395,2.629,.195],[-.405,2.57,.011]],
[[-.267,2.431,.263],[-.375,2.434,.186],[-.383,2.407,.026]],
[[-.265,2.27,.197],[-.338,2.255,.174],[-.359,2.285,.045]],
[[-.247,2.104,.151],[-.318,2.075,.153],[-.343,2.133,.052]],
[[-.203,2.069,.143],[-.274,2.036,.157],[-.304,2.080,.085]]
]);
// Right curtain: lifted above the ear, then a small rear flick.
lock([
[[.04,3.01,.02],[.16,3.007,.079],[.252,2.942,.052]],
[[.164,2.957,.176],[.284,2.929,.193],[.334,2.826,.065]],
[[.255,2.811,.27],[.364,2.79,.217],[.38,2.706,.035]],
[[.291,2.625,.244],[.397,2.61,.172],[.399,2.545,-.01]],
[[.307,2.448,.096],[.377,2.425,.054],[.398,2.386,-.078]],
[[.299,2.28,.075],[.357,2.27,.058],[.389,2.321,-.071]],
[[.275,2.145,.052],[.341,2.124,.053],[.380,2.170,-.065]]
]);
// A narrow long front sidelock in front of left cheek, not joined to the back.
lock([
[[-.184,2.96,.15],[-.24,2.969,.17],[-.28,2.925,.13]],
[[-.247,2.83,.292],[-.31,2.842,.288],[-.347,2.786,.20]],
[[-.266,2.651,.32],[-.327,2.68,.32],[-.358,2.64,.245]],
[[-.258,2.43,.29],[-.323,2.455,.289],[-.351,2.429,.22]],
[[-.247,2.243,.22],[-.294,2.234,.242],[-.324,2.255,.18]],
[[-.228,2.088,.169],[-.274,2.060,.189],[-.296,2.102,.139]]
],'hair');
// Separate right cheek lock, in front of the ear, tapering onto the scarf.
lock([
[[.176,2.960,.153],[.219,2.965,.187],[.258,2.930,.148]],
[[.234,2.833,.292],[.282,2.849,.322],[.316,2.797,.249]],
[[.253,2.639,.305],[.302,2.656,.335],[.336,2.613,.249]],
[[.251,2.446,.269],[.302,2.450,.295],[.332,2.421,.213]],
[[.244,2.265,.207],[.285,2.251,.241],[.311,2.260,.171]],
[[.230,2.114,.170],[.264,2.099,.192],[.285,2.127,.143]]
],'hair');
// Independent fringe lanes follow a shared visual part but not a common sphere.
// Long broad left bang, narrow middle bang, short right bang. Keep the visible
// tips near the eye line, with a small intentional part ABOVE the eyebrows.
lock([
[[-.13,2.969,-.018],[.015,3.043,-.017],[.119,3.014,.035]],
[[-.205,2.94,.184],[-.066,3.017,.226],[.073,2.971,.215]],
[[-.27,2.818,.289],[-.116,2.91,.377],[.036,2.854,.33]],
[[-.252,2.65,.323],[-.122,2.718,.403],[.016,2.694,.371]],
[[-.196,2.502,.318],[-.117,2.54,.394],[-.018,2.565,.373]],
[[-.167,2.481,.329],[-.101,2.486,.380],[-.039,2.518,.359]]
]);
lock([
[[.005,3.015,.019],[.078,3.034,.055],[.151,2.997,.056]],
[[-.018,2.962,.214],[.056,2.999,.262],[.148,2.951,.232]],
[[-.022,2.84,.338],[.065,2.874,.388],[.156,2.83,.333]],
[[-.012,2.695,.357],[.075,2.721,.405],[.163,2.704,.352]],
[[.012,2.565,.351],[.079,2.586,.381],[.136,2.61,.339]],
[[.013,2.525,.337],[.075,2.54,.369],[.126,2.556,.344]]
]);
lock([
[[.10,3.006,.013],[.18,3.005,.057],[.255,2.948,.069]],
[[.142,2.95,.214],[.221,2.958,.252],[.298,2.87,.158]],
[[.171,2.835,.32],[.252,2.858,.343],[.325,2.789,.24]],
[[.19,2.711,.329],[.273,2.731,.342],[.329,2.688,.244]],
[[.207,2.62,.302],[.272,2.627,.314],[.307,2.63,.262]],
[[.226,2.588,.285],[.27,2.59,.301],[.293,2.613,.271]]
]);
// Fine but broad foreground strand across the left side, shading follows the fold.
lock([
[[-.075,3.029,.032],[-.025,3.05,.05],[.037,3.032,.08]],
[[-.171,2.974,.207],[-.118,3.009,.269],[-.049,2.977,.253]],
[[-.23,2.826,.331],[-.169,2.878,.423],[-.094,2.839,.391]],
[[-.22,2.667,.354],[-.165,2.695,.435],[-.108,2.69,.407]],
[[-.166,2.525,.354],[-.142,2.519,.415],[-.11,2.553,.389]]
],'hairLight');
// Original leftward flyaway: connected taper; root buried under crown.
const curl=[[-.06,3.008,.035],[-.13,3.079,.032],[-.223,3.11,.034],[-.31,3.10,.04],[-.365,3.06,.052],[-.38,3.035,.06]];
rings(curl.map((p,i)=>{let d=unit(sub(curl[Math.min(i+1,curl.length-1)],curl[Math.max(0,i-1)])),u=unit(cross(d,[0,0,1])),v=cross(d,u),r=[.010,.010,.008,.006,.004,.0018][i];return Array.from({length:5},(_,j)=>add(p,add(mul(u,r*Math.cos(j*2*Math.PI/5)),mul(v,r*Math.sin(j*2*Math.PI/5))))) }),'hair',true);
}
if(show.axe){const hand=rest.map((p,i)=>i).filter(i=>zones[i]===2&&rest[i][1]<1.36),delta=sub(avg(P,hand),avg(rest,hand)),T=p=>add(p,delta);tube(T([-.36,1.42,.06]),T([-1.03,.58,.13]),.038,.052,'wood',8);
let outline=[[-.99,.70],[-1.15,.61],[-1.24,.48],[-1.17,.34],[-.78,.03],[-.64,.15],[-.55,.32],[-.70,.37],[-.82,.48]],layers=[-.046,.046].map(z=>outline.map(([x,y])=>vert(T([x,y,.13+z]))));for(let k=0;k<2;k++){let c=vert(T([-.98,.41,.13+(k?.046:-.046)]));for(let j=0;j<outline.length;j++)face([c,layers[k][j],layers[k][(j+1)%outline.length]],j>=3&&j<=5?'edge':'steel')}for(let j=0;j<outline.length;j++)face([layers[0][j],layers[0][(j+1)%outline.length],layers[1][(j+1)%outline.length],layers[1][j]],j>=3&&j<=5?'edge':'iron');tube(T([-1.06,.67,.13]),T([-1.19,.47,.13]),.065,.073,'iron',6);for(let z of [-.06,.06]){let p=T([-1.12,.57,.13+z]);tube(p,add(p,[0,0,z*.3]),.022,.022,'cap',8)}
}
return {positions:out,polygons:faces,mats,orig,baseCount:P.length};
}
function pixel(m,p,n){let c=palette[m]||[255,222,205],q=p.map(v=>Math.floor(v*92)),h=((Math.imul(q[0],73856093)^Math.imul(q[1],19349663)^Math.imul(q[2],83492791))>>>0)%17,shade=.78+.22*Math.max(0,n[1]*.45+n[2]*.8-n[0]*.15),v=(h-8)*.60;if(m.startsWith('hair')){v=(h-8)*.12;shade=.86+.14*Math.abs(n[1]*.45+n[2]*.8-n[0]*.15);}if(['jacket','apron','pocket'].includes(m))v+=q[1]%23===0?-8:0;if(m==='wood')v+=(q[0]+q[1])%8===0?-10:0;return c.map(x=>Math.max(0,Math.min(255,x*shade+v)))}
return {build,pixel,palette};
})();
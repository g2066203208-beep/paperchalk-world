export function solve(M,id,t){
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>mul(a,1/(len(a)||1)),cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),sm=x=>{x=cl(x);return x*x*(3-2*x)},mix=(a,b,u)=>add(mul(a,1-u),mul(b,u)),rx=(v,a)=>[v[0],v[1]*Math.cos(a)-v[2]*Math.sin(a),v[1]*Math.sin(a)+v[2]*Math.cos(a)];
function rotate(v,a,b){a=unit(a);b=unit(b);let n=cross(a,b),c=cl(dot(a,b),-1,1);if(c<-.99999){n=unit(cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,0,1]));return sub(mul(n,2*dot(v,n)),v)}return add(add(mul(v,c),cross(n,v)),mul(n,dot(n,v)/(1+c)));}
const floor=.3213431245877313,restHip=[0,1.36,0];let frames,targets,body,contacts=[],props=[],phase;
const grip=(x,y,z=.48)=>[x,y,z],foot=(x,y,z=.46)=>[x,y,z];
if(id==="climb"){
let initial=[grip(.37,2.38),grip(-.37,2.30),foot(.24,.79),foot(-.24,.73)],next=[grip(.40,2.66),grip(-.40,2.58),foot(.28,1.07),foot(-.28,1.01)];
let order=[2,0,3,1],u=cl(t)*4,j=Math.min(3,Math.floor(u)),f=sm(u-j);targets=initial.map((p,i)=>{let step=order.indexOf(i);if(step<j)return next[i];if(step>j)return p;let q=mix(p,next[i],f);q[2]-=(i<2?.12:.16)*Math.sin(Math.PI*f);return q});contacts=targets.map((p,i)=>order[j]!==i||f<.00001||f>.99999);let rise=.28*sm(t);body=[.035*Math.sin(t*2*Math.PI),1.45+rise,.03];phase=["右脚找点","右手上攀","左脚找点","左手上攀"][j];props=[...initial,...next].map((p,i)=>({p,kind:i%4<2?"hand":"foot"}));
}else{
let F=[
{t:0,b:[0,1.28,-1.0],pitch:5,h:[[.33,1.45,-.72],[-.33,1.47,-.95]],f:[[.11,floor,-.66],[-.11,floor,-1.25]],c:[false,false,true,true],name:"助跑"},
{t:.18,b:[0,1.40,-.45],pitch:15,h:[[.33,1.78,-.06],[-.33,1.68,-.15]],f:[[.13,floor,-.25],[-.13,floor,-.88]],c:[false,false,true,false],name:"蹬地"},
{t:.35,b:[0,1.57,.16],pitch:77,h:[[.24,1.16,.77],[-.24,1.16,.77]],f:[[.18,.94,-.48],[-.18,.78,-.62]],c:[true,true,false,false],name:"双手撑箱"},
{t:.53,b:[0,1.62,.40],pitch:80,h:[[.24,1.16,.77],[-.24,1.16,.77]],f:[[.36,1.44,.30],[-.36,1.39,.23]],c:[true,true,false,false],name:"收腿越障"},
{t:.69,b:[0,1.83,1.44],pitch:27,h:[[.38,1.75,1.55],[-.38,1.72,1.50]],f:[[.13,.91,1.98],[-.13,.84,1.72]],c:[false,false,false,false],name:"腾空"},
{t:.85,b:[0,1.22,2.08],pitch:23,h:[[.46,1.64,2.44],[-.46,1.62,2.40]],f:[[.14,floor,2.31],[-.14,floor,2.03]],c:[false,false,true,true],name:"落地缓冲"},
{t:1,b:[0,1.29,2.45],pitch:5,h:[[.33,1.49,2.65],[-.33,1.48,2.43]],f:[[.14,floor,2.31],[-.14,floor,2.53]],c:[false,false,true,false],name:"恢复跑姿"}];
let j=0;while(j<F.length-2&&t>F[j+1].t)j++;let a=F[j],b=F[j+1],u=sm((t-a.t)/(b.t-a.t));body=mix(a.b,b.b,u);targets=[...a.h,...a.f].map((p,i)=>mix(p,[...b.h,...b.f][i],u));contacts=a.c.map((v,i)=>v&&b.c[i]&&len(sub([...a.h,...a.f][i],[...b.h,...b.f][i]))<1e-6||u<1e-6&&v||u>1-1e-6&&b.c[i]);phase=u<.5?a.name:b.name;frames={pitch:a.pitch+(b.pitch-a.pitch)*u};props=[{p:[0,1.16,.77],kind:"box"}];
}
let pitch=id==="climb"?-.03:frames.pitch*Math.PI/180;
const torso=q=>{let v=sub(q,restHip),w=sm((q[1]-1.34)/.24);return add(body,rx(v,pitch*w))};
let bones=[],chains=[];
for(let side of [1,-1])for(let type of ["arm","leg"]){
let j=(side===1?0:1)+(type==="arm"?0:2),A=type==="arm"?[side*.205,1.965,0]:[side*.145,1.36,0],B=type==="arm"?[side*.272,1.695,0]:[side*.1,.918,0],C=type==="arm"?[side*.365,1.465,.019]:[side*.075,.429,0],E=type==="arm"?[side*.407,1.27,.032]:[side*.075,.33,.10];
let a=torso(A),l1=len(sub(B,A)),l2=len(sub(C,B)),endDir=type==="arm"?id==="climb"?unit([side*.05,.76,.65]):unit([0,-.92,.4]):id==="climb"?unit([0,-.55,.83]):unit([0,-.72,.70]);let e=targets[j],cGoal=sub(e,mul(endDir,len(sub(E,C)))),d=sub(cGoal,a),dist=cl(len(d),Math.abs(l1-l2)+.0001,l1+l2-.0001),axis=unit(d),c=add(a,mul(axis,dist));let pole=type==="arm"?[side*.9,-.7,-.28]:[side*(id==="climb"?.95:.55),.05,1];let bend=unit(sub(pole,mul(axis,dot(pole,axis)))),along=(l1*l1-l2*l2+dist*dist)/(2*dist),height=Math.sqrt(Math.max(0,l1*l1-along*along)),b=add(add(a,mul(axis,along)),mul(bend,height)),actual=add(c,mul(endDir,len(sub(E,C))));
let trans=(q,R,S,r,s)=>add(r,rotate(sub(q,R),sub(S,R),sub(s,r)));
chains.push({zone:type==="arm"?(side===1?1:2):(side===1?3:4),A,B,C,E,a,b,c,actual,trans});
bones.push({a,b,c,end:actual,target:e,locked:contacts[j],limb:j,error:len(sub(actual,e))});
}
let P=M.positions.map((q,i)=>{let z=M.zones[i],base=torso(q);if(!z)return base;let ch=chains.find(c=>c.zone===z),{A,B,C,E,a,b,c,actual,trans}=ch;let upper=trans(q,A,B,a,b),lower=trans(q,B,C,b,c),end=trans(q,C,E,c,actual);let arm=z<3,along=sm((B[1]+(arm?.09:.13)-q[1])/(arm?.18:.26)),wrist=sm((C[1]+(arm?.045:.055)-q[1])/(arm?.09:.11));let v=mix(mix(upper,lower,along),end,wrist);let attach=arm?sm((1.99-q[1])/.32):sm((1.39-q[1])/.40);if(i===161||i===162)attach=0;return mix(base,v,attach)});
let modules=Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(torso)}]));return {positions:P,modules,bones,props,phase,targets,contacts,body}
}

export function correct(M,P){
let Q=P.map(p=>p.slice()),sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function cosine(f){let [a,b,c,d]=f.map(i=>Q[i]),n=cross(sub(b,a),sub(c,a)),m=cross(sub(c,a),sub(d,a));return dot(n,m)/Math.max(1e-12,Math.hypot(...n)*Math.hypot(...m))}
let allowed=M.positions.map(p=>(p[1]>1.10&&p[1]<1.62)||(p[1]>1.80&&p[1]<2.08));let fs=M.polygons.filter(f=>f.every(i=>allowed[i]));
for(let pass=0;pass<12;pass++){let changed=0;for(let f of fs){let cos=cosine(f);if(cos>=.06)continue;let grad=[],sum=0;for(let i of f){let g=[];for(let k=0;k<3;k++){let x=Q[i][k],h=.0001;Q[i][k]=x+h;let a=cosine(f);Q[i][k]=x-h;let b=cosine(f);Q[i][k]=x;g.push((a-b)/(2*h))}grad.push(g);sum+=dot(g,g)}if(sum<1e-8)continue;let scale=Math.min(.018/(Math.sqrt(sum)||1),(.13-cos)/sum*.8);for(let j=0;j<4;j++){let i=f[j],v=Q[i].map((x,k)=>x+grad[j][k]*scale),d=sub(v,P[i]),len=Math.hypot(...d);if(len>.065)v=P[i].map((x,k)=>x+d[k]*.065/len);Q[i]=v}changed++}if(!changed)break}return Q}


export function evaluate(M,id,t){let q=solve(M,id,t);q.positions=correct(M,q.positions);return q}

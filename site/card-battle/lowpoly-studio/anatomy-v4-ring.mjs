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
let P=skin(M,chains,body,pitch,restHip,{"ta":false,"tl":false,"aw":0.14,"lw":0.3,"squeeze":0,"arm":0.32,"leg":0.4,"torso":0.5,"armW":[[0.65,0.35,0,0],[0,1,0,0],[0,0.9,0.1,0],[0,0.5,0.5,0],[0,0,1,0],[0,0,0.5,0.5]],"legW":[[0.6,0.4,0,0],[0,1,0,0],[0,0.9,0.1,0],[0,0.5,0.5,0],[0,0,1,0],[0,0,1,0],[0,0,0.5,0.5],[0,0,0,1],[0,0,0,1]]});
let modules=Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(torso)}]));return {positions:P,modules,bones,props,phase,targets,contacts,body}
}

export function correct(M,P){
let Q=P.map(p=>p.slice()),sub=(a,b)=>a.map((x,i)=>x-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function cosine(f){let [a,b,c,d]=f.map(i=>Q[i]),n=cross(sub(b,a),sub(c,a)),m=cross(sub(c,a),sub(d,a));return dot(n,m)/Math.max(1e-12,Math.hypot(...n)*Math.hypot(...m))}
let allowed=M.positions.map((p,i)=>!rigidGroup(i)&&!ringBinding(i)&&!shaftRing(M,i)&&((M.zones[i]>=3&&p[1]>1.10&&p[1]<1.62)||(p[1]>1.80&&p[1]<2.08)||(!M.zones[i]&&p[1]>1.10&&p[1]<1.62)));let fs=M.polygons.filter(f=>f.every(i=>allowed[i]));
for(let pass=0;pass<12;pass++){let changed=0;for(let f of fs){let cos=cosine(f);if(cos>=.06)continue;let grad=[],sum=0;for(let i of f){let g=[];for(let k=0;k<3;k++){let x=Q[i][k],h=.0001;Q[i][k]=x+h;let a=cosine(f);Q[i][k]=x-h;let b=cosine(f);Q[i][k]=x;g.push((a-b)/(2*h))}grad.push(g);sum+=dot(g,g)}if(sum<1e-8)continue;let scale=Math.min(.018/(Math.sqrt(sum)||1),(.13-cos)/sum*.8);for(let j=0;j<4;j++){let i=f[j],v=Q[i].map((x,k)=>x+grad[j][k]*scale),d=sub(v,P[i]),len=Math.hypot(...d);if(len>.065)v=P[i].map((x,k)=>x+d[k]*.065/len);Q[i]=v}changed++}if(!changed)break}return Q}


export function evaluate(M,id,t){let q=solve(M,id,t);q.positions=correct(M,q.positions);return q}

function skin(M,chains,body,pitch,restHip,config={}){
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>mul(a,1/(Math.hypot(...a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const qm=(a,b)=>[a[0]*b[0]-dot(a.slice(1),b.slice(1)),...add(add(mul(b.slice(1),a[0]),mul(a.slice(1),b[0])),cross(a.slice(1),b.slice(1)))],con=a=>[a[0],-a[1],-a[2],-a[3]],rot=(q,v)=>qm(qm(q,[0,...v]),con(q)).slice(1);
function align(a,b){a=norm(a);b=norm(b);let d=dot(a,b);return d<-.99999?[0,...norm(cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,0,1]))]:norm([1+d,...cross(a,b)])}
const dq=(q,A,B)=>[q,mul(qm([0,...sub(B,rot(q,A))],q),.5)];
function blend(list,p){let ref=list.reduce((a,b)=>a[1]>b[1]?a:b)[0][0],r=[0,0,0,0],d=r.slice();for(let [[q,v],w] of list){let s=dot(ref,q)<0?-w:w;r=add(r,mul(q,s));d=add(d,mul(v,s))}let l=Math.hypot(...r)||1;r=mul(r,1/l);d=mul(d,1/l);d=sub(d,mul(r,dot(r,d)));return add(rot(r,p),mul(qm(d,con(r)).slice(1),2))}
let tq=[Math.cos(pitch/2),Math.sin(pitch/2),0,0],root=dq([1,0,0,0],restHip,body),chest=dq(tq,restHip,body);
let bones=chains.map(ch=>{let {A,B,C,E,a,b,c,actual}=ch;let q1=align(sub(B,A),sub(b,a));let q2=(ch.zone<3?config.ta:config.tl)?qm(align(rot(q1,sub(C,B)),sub(c,b)),q1):align(sub(C,B),sub(c,b));let q3=(ch.zone<3?config.ta:config.tl)?qm(align(rot(q2,sub(E,C)),sub(actual,c)),q2):align(sub(E,C),sub(actual,c));return {...ch,d:[dq(q1,A,a),dq(q2,B,b),dq(q3,C,c,)] .map((x,i)=>i===2?dq(q3,C,c):x)}}); 
let rings=ringMap(M);return M.positions.map((p,i)=>{let z=M.zones[i],x=Math.abs(p[0]),ring=shaftRing(M,i),y=ring?ring.reduce((a,j)=>a+M.positions[j][1],0)/ring.length:p[1],w=sm((y-1.34)/.24),L=[[root,1-w],[chest,w]];let ch=bones.find(b=>b.zone===z);let bind=ringBinding(i);let rr=rings[i];if(rr){let b=bones.find(b=>b.zone===rr[0]),arm=rr[0]<3,j=rr[1],W=arm?config.armW:config.legW,k=Math.floor(j),u=j-k,v=W[k].map((x,i)=>x*(1-u)+(W[Math.min(k+1,W.length-1)][i])*u);let list=[[arm?chest:root,v[0]],[b.d[0],v[1]],[b.d[1],v[2]],[b.d[2],v[3]]];return blend(list,p)}if(bind){let b=bones.find(b=>b.zone===bind[0]);return bind[1]===1?blend([[b.d[1],1]],p):blend([[b.d[1],1-0.5],[b.d[2],0.5]],p)}let rg=rigidGroup(i);if(rg)return blend([[bones.find(b=>b.zone===rg).d[2],1]],p);let attach=0;if(ch){let arm=z<3;attach=arm?sm((2.04-y)/(config.arm||.25)):sm((1.47-y)/(config.leg||.34));if(i===161||i===162)attach=0;}else if(config.torso){if(y>1.78&&y<2.10){ch=bones.find(b=>b.zone===(p[0]>0?1:2));attach=config.torso*sm((x-.09)/.12)*sm((y-1.78)/.10)*sm((2.12-y)/.10)}else if(y>1.28&&y<1.5){ch=bones.find(b=>b.zone===(p[0]>0?3:4));attach=config.torso*sm((x-.055)/.14)*sm((1.5-y)/.20)}}
if(ch&&attach>0){let arm=ch.zone<3,along=sm((ch.B[1]+(arm?config.aw:config.lw)-y)/(arm?2*config.aw:2*config.lw)),end=sm((ch.C[1]+(arm?.045:.055)-y)/(arm?.09:.11));L=L.map(([q,v])=>[q,v*(1-attach)]);L.push([ch.d[0],attach*(1-end)*(1-along)],[ch.d[1],attach*(1-end)*along],[ch.d[2],attach*end])}let out=blend(L,p);if(ch&&attach>.8&&config.squeeze){let arm=ch.zone<3,half=arm?config.aw:config.lw,delta=Math.abs(y-ch.B[1]),bend=1-dot(norm(sub(ch.b,ch.a)),norm(sub(ch.c,ch.b)));if(delta<half*1.5){let center=blend(L,[ch.B[0],p[1],ch.B[2]]),g=1-config.squeeze*sm(bend/1.7)*sm(1-delta/(half*1.5));out=add(center,mul(sub(out,center),g));}}return out})
}

function rigidGroup(i){for(let side=0;side<2;side++){let o=side*116;if(i>=200+o&&i<=225+o)return 1+side;if(i>=268+o&&i<=279+o||i>=420&&i<=427&&i%2===side)return 3+side}return 0}

export function shape(M,P){let results=[];for(let g=1;g<=4;g++){let ids=M.positions.map((_,i)=>i).filter(i=>rigidGroup(i)===g),max=0,abs=0;for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){let a=ids[i],b=ids[j],l=Math.hypot(...M.positions[a].map((x,k)=>x-M.positions[b][k])),d=Math.hypot(...P[a].map((x,k)=>x-P[b][k]));if(l>1e-8){max=Math.max(max,Math.abs(d/l-1));abs=Math.max(abs,Math.abs(d-l))}}results.push({group:g,vertices:ids.length,maxRelative:max,maxAbsolute:abs})}return results}

function ringBinding(i){for(let s=0;s<2;s++){let o=s*116;if(i>=188+o&&i<194+o)return [s+1,1];if(i>=194+o&&i<200+o)return [s+1,3];if(i>=256+o&&i<262+o||i===412+s||i===414+s)return [s+3,1];if(i>=262+o&&i<268+o||i===416+s||i===418+s)return [s+3,3]}return null}

function shaftRing(M,i){for(let side=0;side<2;side++){let o=side*116;for(let j of [1,2,4]){let ids=Array.from({length:6},(_,k)=>164+o+j*6+k);if(ids.includes(i))return ids}for(let j of [1,4,5]){let ids=[...Array.from({length:6},(_,k)=>226+o+j*6+k),396+4*(j-1)+side,398+4*(j-1)+side];if(ids.includes(i))return ids}}return null}
function ringMap(M){let map={};for(let s=0;s<2;s++)for(let type of ["arm","leg"]){let o=s*116,n=type==="arm"?6:9,z=type==="arm"?s+1:s+3;let rings=Array.from({length:n},(_,j)=>[...Array.from({length:6},(_,k)=>(type==="arm"?164:226)+o+j*6+k),...(type==="leg"&&j>0?[396+4*(j-1)+s,398+4*(j-1)+s]:[])]);rings.forEach((a,j)=>a.forEach(i=>map[i]=[z,j]));for(let j=0;j<n-1;j++)for(let a of rings[j])for(let b of rings[j+1]){let p=M.positions[a].map((x,k)=>(x+M.positions[b][k])/2),i=M.positions.findIndex((q,i)=>i>=440&&M.zones[i]===z&&q.every((x,k)=>Math.abs(x-p[k])<1e-9));if(i>=0)map[i]=[z,j+.5]}}return map}

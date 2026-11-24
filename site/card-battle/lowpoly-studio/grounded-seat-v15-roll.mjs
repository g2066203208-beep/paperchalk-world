// Grounded seated IK. Rigid body segment lengths and all locked shapes are unchanged.
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(1e-9,len(a))),cl=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=x=>x*Math.PI/180,rx=(p,a)=>[p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
function aim(a,b){let u=unit(a),v=unit(b),c=cl(dot(u,v),-1,1),n=cross(u,v),s=len(n);if(s<1e-9){if(c>0)return p=>p.slice();n=unit(cross(u,Math.abs(u[0])<.8?[1,0,0]:[0,1,0]));return p=>sub(mul(n,2*dot(n,p)),p)}n=mul(n,1/s);return p=>add(add(mul(p,c),mul(cross(n,p),s)),mul(n,dot(n,p)*(1-c)))}
const twist=(p,n,a)=>{n=unit(n);return add(add(mul(p,Math.cos(a)),mul(cross(n,p),Math.sin(a))),mul(n,dot(n,p)*(1-Math.cos(a))))};
const around=(a,b,R)=>p=>add(b,R(sub(p,a)));
function ik(S,T,l1,l2,pole){let u=unit(sub(T,S)),d=cl(len(sub(T,S)),Math.abs(l1-l2)+.0001,l1+l2-.0001),W=add(S,mul(u,d)),a=(l1*l1-l2*l2+d*d)/(2*d),b=Math.sqrt(Math.max(0,l1*l1-a*a)),v=unit(sub(pole,mul(u,dot(u,pole))));return{E:add(S,add(mul(u,a),mul(v,b))),W}}
export function seat(M,B,o={}){
 let H=[0,1.36,0],tilt=rad(o.tilt??0),raw=around(H,H,p=>rx(p,tilt)),ground=Math.min(...B.filter(v=>v.locked&&v.owner==='torso').map(v=>raw(v.rest)[1])),F={torso:p=>add(raw(p),[0,-ground,0])},joints=[];
 for(let [s,side] of [[1,'R'],[-1,'L']]){
 let hp=[s*.145,o.hy??1.33,o.hz??.06],kn=[s*.1,.918,0],an=[s*.075,.429,0],Hip=F.torso(hp),footMin=Math.min(...B.filter(v=>v.owner==='foot_'+side&&v.locked).map(v=>v.rest[1])),An=[s*(o.ax??.22),an[1]-footMin,o.az??.52],leg=ik(Hip,An,len(sub(kn,hp)),len(sub(an,kn)),[s*(o.pole??.15),1,0]),K=leg.E;
 let rt=aim(sub(kn,hp),sub(K,Hip)),rs=aim(sub(an,kn),sub(leg.W,K));F['thigh_'+side]=around(hp,Hip,p=>twist(rt(p),sub(K,Hip),rad(s*(o.roll??0))));F['shin_'+side]=around(kn,K,p=>twist(rs(p),sub(leg.W,K),rad(s*(o.shroll??0))));F['foot_'+side]=around(an,leg.W,p=>p.slice());
 let S0=[s*.205,1.965,0],E0=[s*.272,1.695,0],W0=[s*.365,1.465,.019],S=F.torso(S0),target=add(K,[s*(o.wx??.11),o.wy??-.045,o.wz??.10]),arm=ik(S,target,len(sub(E0,S0)),len(sub(W0,E0)),[s*(o.ep??1),-.65,.05]),E=arm.E,W=arm.W;
 F['upperArm_'+side]=around(S0,S,aim(sub(E0,S0),sub(E,S)));F['forearm_'+side]=around(E0,E,aim(sub(W0,E0),sub(W,E)));F['hand_'+side]=around(W0,W,aim([s*.05,-.23,.01],[-s,-.18,-.08]));
 joints.push({side,Hip,K,An:leg.W,footTarget:An,S,E,W,requestedWrist:target});
 }
 let positions=B.map(v=>F[v.owner](v.rest)),modules=Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(F.torso)}]));return {positions,modules,transforms:F,joints}
}

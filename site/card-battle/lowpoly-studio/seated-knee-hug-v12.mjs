import {build, evaluate, clips} from './body-motion-v11-core.mjs';
// Dedicated seated knee-hug pose. No muscle simulation. Explicit two-bone arm targets.
// Reuses V46 source and V11 quad topology, preserves all source IDs.
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(1e-9,len(a))),cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t)),rad=x=>x*Math.PI/180,rx=(p,a)=>[p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
const mean=(P,ids)=>mul(ids.reduce((a,i)=>add(a,P[i]),[0,0,0]),1/ids.length);
const ring=(o,j,b=164)=>Array.from({length:6},(_,i)=>b+o+6*j+i);
function aim(from,to){let u=unit(from),v=unit(to),c=cl(dot(u,v),-1,1),a=cross(u,v),l=len(a);if(l<1e-8){if(c>0)return p=>p.slice();a=unit(cross(u,Math.abs(u[0])<.8?[1,0,0]:[0,1,0]));return p=>sub(mul(a,2*dot(a,p)),p)}a=mul(a,1/l);return p=>add(add(mul(p,c),mul(cross(a,p),l)),mul(a,dot(a,p)*(1-c)))}
function ik(S,T,L1,L2,pole){let dir=unit(sub(T,S)),d=cl(len(sub(T,S)),Math.abs(L1-L2)+.001,L1+L2-.001),W=add(S,mul(dir,d)),x=(L1*L1-L2*L2+d*d)/(2*d),y=Math.sqrt(Math.max(0,L1*L1-x*x)),p=unit(sub(pole,mul(dir,dot(pole,dir))));return {E:add(S,add(mul(dir,x),mul(p,y))),W}}
export function buildSeat(D){let M=build(D);let edges=new Map();for(let f of D.polygons)for(let j=0;j<4;j++){let a=f[j],b=f[(j+1)%4];edges.set([a,b].sort((a,b)=>a-b).join(':'),[a,b])}M.armParents=[];for(let i=440;i<M.positions.length;i++){if(M.zones[i]!==1&&M.zones[i]!==2)continue;for(let [a,b] of edges.values()){let u=sub(M.positions[b],M.positions[a]),t=dot(sub(M.positions[i],M.positions[a]),u)/dot(u,u);if(t>0&&t<1&&len(sub(M.positions[i],add(M.positions[a],mul(u,t))))<1e-8){M.armParents.push({i,a,b,t});break}}}return M}
export function seated(M,opt={}){
 let h=opt.h??115,k=opt.k??95,tilt=opt.tilt??-22,pitch=opt.pitch??10,params={hr:h,hl:h,kr:k,kl:k,pitch,sr:0,sl:0,er:0,el:0};
 clips.seatTarget=[{t:0,...params},{t:1,...params}];let result=evaluate(M,'seatTarget',.5),P=result.positions.map(p=>p.slice()),root=mean(P,[147,153]),rot=p=>add(root,rx(sub(p,root),rad(tilt)));P=P.map(rot);let modules=Object.fromEntries(Object.entries(result.modules).map(([key,m])=>[key,{...m,positions:m.positions.map(rot)}]));
 let targets=[],grip=opt.grip??1;
 for(let [s,o] of [[1,0],[-1,116]]){
  // Preserve shin, rotate shoe/foot around ankle and blend only ankle ring.
  let ankle=mean(P,ring(o,6,226)),restAnkle=mean(M.positions,ring(o,6,226));
  for(let j=6;j<=8;j++)for(let i of [...ring(o,j,226),396+4*(j-1)+(s===1?0:1),398+4*(j-1)+(s===1?0:1)]){let goal=add(ankle,sub(M.positions[i],restAnkle));P[i]=mix(P[i],goal,j===6?.4:1)}
  if(grip<=0)continue;let neutral=P.slice();let knee=mean(P,ring(o,3,226)),shin=mean(P,ring(o,4,226)),S=mean(P,ring(o,0)),restS=[s*.205,1.965,0],restE=[s*.272,1.695,0],restW=[s*.365,1.465,.019];
  // actual shoulder center anchored at the chest-side shoulder mesh, not global coordinates
  S=add(S,[s*.045,.040,0]);let target=add(mix(knee,shin,.12),[s*(opt.wx??.15),opt.wy??.035,opt.wz??.10]);
  let {E,W}=ik(S,target,len(sub(restE,restS)),len(sub(restW,restE)),[s*1.8,-.9,.15]);let u=aim(sub(restE,restS),sub(E,S)),v=aim(sub(restW,restE),sub(W,E)),handDir=unit([-s, -.20, .12]),hr=aim([s*.05,-.23,.01],handDir);
  let upper=p=>add(S,u(sub(p,restS))),fore=p=>add(E,v(sub(p,restE))),hand=p=>add(W,hr(sub(p,restW)));
  for(let i=164+o;i<226+o;i++){let j=Math.floor((i-164-o)/6),p=M.positions[i],a=upper(p),b=fore(p),c=hand(p);if(j===0){P[i]=mix(P[i],a,.10)}else if(j===1){P[i]=mix(P[i],a,.80)}else if(j===2){P[i]=a}else if(j===3){P[i]=mix(a,b,.5)}else if(j===4){P[i]=b}else if(j===5){P[i]=mix(b,c,.5)}else P[i]=c}
  if(grip<1)for(let i=164+o;i<226+o;i++)P[i]=mix(neutral[i],P[i],grip);
  targets.push({side:s===1?'R':'L',shoulder:S,elbow:E,wrist:W,requestedWrist:target,knee,ankle,handTip:mean(P,ring(o,8)),upperLength:len(sub(E,S)),foreLength:len(sub(W,E))});
 }
 if(grip>0)for(let {i,a,b,t} of M.armParents)P[i]=mix(P[a],P[b],t);
 let butt=Math.min(...[159,160,163,153,154,155,151,152].map(i=>P[i][1])),sole=Math.min(...[...ring(0,8,226),...ring(116,8,226)].map(i=>P[i][1])),dy=-Math.min(butt,sole);
 P=P.map(v=>add(v,[0,dy,0]));for(let m of Object.values(modules))m.positions=m.positions.map(v=>add(v,[0,dy,0]));for(let b of targets)for(let k of ['shoulder','elbow','wrist','requestedWrist','knee','ankle','handTip'])b[k]=add(b[k],[0,dy,0]);
 return{positions:P,modules,params,targets,buttGap:butt+dy,footGap:sole+dy};
}

export function makeSeatClip(M,target){
 let raw=seated(M,target.options),offset=target.positions.map((v,i)=>sub(v,raw.positions[i])),smooth=t=>{t=cl(t);return t*t*(3-2*t)};
 let restFloor=Math.min(...M.positions.map(v=>v[1]));
 return function sample(t){
  t=cl(t);if(t===0)return {positions:M.positions.map(v=>[v[0],v[1]-restFloor,v[2]]),modules:Object.fromEntries(Object.entries(M.modules).map(([k,m])=>[k,{...m,positions:m.positions.map(v=>[v[0],v[1]-restFloor,v[2]])}]))};if(t===1)return target;
  let a=smooth(t),g=smooth((t-.28)/.65),o=target.options;
  let q=seated(M,{h:o.h*a,k:o.k*smooth(t/.92),tilt:o.tilt*smooth((t-.15)/.85),pitch:o.pitch*a,wx:o.wx,wy:o.wy,wz:o.wz,grip:g});
  let w=smooth((t-.60)/.40);q.positions=q.positions.map((v,i)=>add(v,mul(offset[i],w)));let low=Math.min(...q.positions.map(v=>v[1]));if(low<0){q.positions=q.positions.map(v=>add(v,[0,-low,0]));for(let m of Object.values(q.modules))m.positions=m.positions.map(v=>add(v,[0,-low,0]))}return q;
 }
}

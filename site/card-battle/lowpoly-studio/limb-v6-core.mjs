import {refine} from './motion-v2-core.mjs';
import {pose as kneePose} from './knee-v5-core.mjs';
// Symmetric additional forearm-to-wrist rings, no triangulation.
export function build(D){return refine(D,["arm0","arm2","arm3","arm4","leg2","leg3"])}
export function arm(M,deg,wrist=0,side=0,opts={}){
 const s=side?-1:1,o=side*116,z=side+1,K=[s*.272,1.695,0],W=[s*.365,1.465,.019],h=deg*Math.PI/360,a=h*2;
 const unit=p=>p.map(x=>x/Math.hypot(...p)),u=unit([s*.30,-1,0]),v=[0,0,1],dot=(p,q)=>p.reduce((n,x,i)=>n+x*q[i],0),sub=(p,q)=>p.map((x,i)=>x-q[i]),add=(p,q)=>p.map((x,i)=>x+q[i]),mul=(p,k)=>p.map(x=>x*k);
 const coord=(p,k)=>{let d=sub(p,k),y=dot(d,u),f=d[2];return {y,f,r:sub(sub(d,mul(u,y)),mul(v,f))}};
 const rot=(p,k,t)=>{let {y,f,r}=coord(p,k);return add(k,add(r,add(mul(u,y*Math.cos(t)-f*Math.sin(t)),mul(v,y*Math.sin(t)+f*Math.cos(t)))))};
 const ring=j=>Array.from({length:6},(_,i)=>164+o+j*6+i);let idx=new Map();for(let j=0;j<6;j++)ring(j).forEach(i=>idx.set(i,j));for(let j=0;j<5;j++)for(let i of ring(j))for(let b of ring(j+1)){let p=M.positions[i].map((v,k)=>(v+M.positions[b][k])/2);let k=M.positions.findIndex((q,k)=>k>=440&&M.zones[k]===z&&q.every((x,j)=>Math.abs(x-p[j])<1e-9));if(k>=0)idx.set(k,j+.5)}
 return M.positions.map((p,i)=>{if(M.zones[i]!==z)return p.slice();let j=idx.get(i);if(j===undefined||j>=4){let q=p;if(wrist){let weight=j===4?0:j===4.5?.2:j===5?.6:1;q=rot(q,W,wrist*Math.PI/180*weight)}return rot(q,K,a)}
 if(!deg)return p.slice();let q=p.slice(),{y,f,r}=coord(p,K),t=j<3?0:j>3?a:h,outer=f<-.025;
 if(j===3&&!outer){y*=1-Math.min(1,deg/25)**2*(3-2*Math.min(1,deg/25));f*=1-(opts.c??.65)*Math.sin(h)**2}
 else if(j===2.5||j===3.5){let k=outer?(opts.f??.4):Math.max(0,Math.min(opts.f??.4,(-f+.025)*3));t=j===2.5?h*k:a-h*k}
 if(f>0&&j!==3&&j>=2){let delta=j<3?t:a-t,theta=h-delta;if(theta>1e-5)f=Math.min(f,Math.max(.002,(Math.abs(y)*Math.cos(theta)-.001*Math.sin(h))/Math.sin(theta)))}
 q=add(K,add(r,add(mul(u,y),mul(v,f))));return rot(q,K,t);
 });
}
export function pose(M,p={}){let K=kneePose(M,p.kr||0,p.kl||0),R=arm(M,p.er||0,p.wr||0,0),L=arm(M,p.el||0,p.wl||0,1);return K.map((v,i)=>M.zones[i]===1?R[i]:M.zones[i]===2?L[i]:v)}
export function handError(M,P,side){let ids=Array.from({length:26},(_,i)=>200+side*116+i),err=0;for(let a of ids)for(let b of ids){let d=Math.hypot(...M.positions[a].map((x,k)=>x-M.positions[b][k]));if(d>1e-8)err=Math.max(err,Math.abs(Math.hypot(...P[a].map((x,k)=>x-P[b][k]))/d-1))}return err}

/* Slots & Daggers reference study: three-dimensional physical coin whitebox.
 * Original implementation, not copied from or claimed to match the game's source.
 * World: x=left/right, y=desk depth, z=vertical. Deterministic 120Hz.
 * Convex cylinder SAT support projections + angular point impulses + contact friction.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperchalkSlot3D=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const STEP=1/120,PI=Math.PI,TAU=PI*2;
 const WORLD=Object.freeze({left:-3.94,right:.92,near:-1.04,far:1.04,floor:0,ceiling:4.40,
   chute:[.70,0,1.42],radius:.235,thickness:.076,gravity:26});
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
 const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
 const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const len=a=>Math.hypot(a[0],a[1],a[2]);
 const norm=a=>{const d=len(a);return d>1e-9?mul(a,1/d):[0,0,0];};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const qnorm=q=>{const l=Math.hypot(...q);return q.map(x=>x/l);};
 const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
   a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
   a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
   a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
 const qrotate=(q,v)=>{
  const t=mul(cross(q,v),2);return add(v,add(mul(t,q[3]),cross(q,t)));
 };
 const axisAngle=(a,t)=>{const s=Math.sin(t*.5),n=norm(a);return [n[0]*s,n[1]*s,n[2]*s,Math.cos(t*.5)];};
 function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;
  let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return((t^(t>>>14))>>>0)/4294967296;};}
 function updateBasis(c){c.n=qrotate(c.q,[0,0,1]);c.u=qrotate(c.q,[1,0,0]);c.v=qrotate(c.q,[0,1,0]);}
 function supportRadius(c,axis){const h=Math.abs(dot(c.n,axis));return c.r*Math.sqrt(Math.max(0,1-h*h))+c.h*h;}
 function support(c,dir){const nproj=dot(c.n,dir),lateral=sub(dir,mul(c.n,nproj));
  const d=len(lateral);return add(c.p,add(d>1e-7?mul(lateral,c.r/d):[0,0,0],mul(c.n,(nproj>=0?c.h:-c.h))));}
 function axisMin(a,b){const diff=sub(b.p,a.p),n=[a.n,b.n,norm(diff),cross(a.n,b.n)];
  const ar=sub(diff,mul(a.n,dot(diff,a.n))),br=sub(diff,mul(b.n,dot(diff,b.n)));
  n.push(ar,br,cross(a.n,br),cross(b.n,ar),cross(a.n,b.n));
  // Additional directions guard edge-to-edge contacts for tilted discs.
  for(const ax of [a.u,a.v])for(const bx of [b.u,b.v])n.push(cross(ax,bx));
  let best=null,depth=1e5;
  for(const axis of n){const l=len(axis);if(l<1e-7)continue;
   const q=mul(axis,1/l),dc=dot(diff,q),over=supportRadius(a,q)+supportRadius(b,q)-Math.abs(dc);
   if(over<-.0005)return null;
   if(over<depth){depth=over;best=dc>=0?q:mul(q,-1);}
  }
  return best?{n:best,depth:Math.max(0,depth)}:null;
 }
 function invI(c,torque){ // symmetric world-space inverse inertia for thin circular cylinder
  if(c.sleep)return [0,0,0];
  const parallel=dot(c.n,torque),perp=sub(torque,mul(c.n,parallel));
  return add(mul(perp,c.invIT),mul(c.n,parallel*c.invIN));
 }
 function pointV(c,r){return add(c.vel,cross(c.w,r));}
 function apply(c,j,r){if(c.sleep)return;
  c.vel=add(c.vel,mul(j,c.im));c.w=add(c.w,invI(c,cross(r,j)));
 }
 function impactPair(a,b,normal,depth,impactCallback,iteration){
  // Velocity solver includes angular momentum at the actual rim/face contact.
  const sum=(a.sleep?0:a.im)+(b.sleep?0:b.im);
  if(!sum)return;
  const correction=Math.min(depth,.18)*.58/sum;
  a.p=sub(a.p,mul(normal,correction*(a.sleep?0:a.im)));
  b.p=add(b.p,mul(normal,correction*(b.sleep?0:b.im)));
  const pa=support(a,normal),pb=support(b,mul(normal,-1));
  const cp=mul(add(pa,pb),.5),ra=sub(cp,a.p),rb=sub(cp,b.p);
  const relative=sub(pointV(b,rb),pointV(a,ra)),vn=dot(relative,normal);
  if(vn>=-.005)return;
  const raN=cross(ra,normal),rbN=cross(rb,normal);
  const d=sum+dot(raN,invI(a,raN))+dot(rbN,invI(b,rbN));
  const restitution=vn< -2?.32:0;
  const j=clamp(-(1+restitution)*vn/Math.max(d,.01),0,9);
  apply(a,mul(normal,-j),ra);apply(b,mul(normal,j),rb);
  const tangent=sub(relative,mul(normal,vn)),ts=len(tangent);
  if(ts>.015){const t=mul(tangent,1/ts),raT=cross(ra,t),rbT=cross(rb,t);
   const td=sum+dot(raT,invI(a,raT))+dot(rbT,invI(b,rbT));
   const jt=clamp(-ts/Math.max(.01,td),-j*.37,j*.37);
   apply(a,mul(t,-jt),ra);apply(b,mul(t,jt),rb);
  }
  if(iteration===0&&vn< -1.6){impactCallback('coin',-vn);a.hits++;b.hits++;}
 }
 function impactPlane(c,planeNormal,depth,onHit,wallName,iteration){
  if(depth<=0)return;
  c.p=add(c.p,mul(planeNormal,Math.min(depth,.18)*.85));
  const cp=support(c,mul(planeNormal,-1)),r=sub(cp,c.p),v=pointV(c,r),vn=dot(v,planeNormal);
  if(vn>=-.02)return;
  const rn=cross(r,planeNormal);
  const denom=c.im+dot(rn,invI(c,rn));
  const e=vn< -2?.29:0;
  const j=clamp(-(1+e)*vn/Math.max(.01,denom),0,18);
  apply(c,mul(planeNormal,j),r);
  const tang=sub(v,mul(planeNormal,vn)),l=len(tang);
  if(l>.015){const t=mul(tang,1/l),rt=cross(r,t);
   const td=c.im+dot(rt,invI(c,rt));
   const jt=clamp(-l/Math.max(td,.01),-j*.54,j*.54);
   apply(c,mul(t,jt),r);
  }
  if(iteration===0&&vn< -1.7){onHit(wallName,-vn);c.hits++;}
 }
 class Simulation{
  constructor(opts={}){
   this.seed=(opts.seed??20261118)>>>0;
   this.requested=clamp(Math.floor(opts.count??48),1,100);
   this.initialPile=clamp(Math.floor(opts.initialPile??18),0,36);
   this.reset();
  }
  _newCoin(p,old=false){
   const r=WORLD.radius*(.97+this.rand()*.06),h=WORLD.thickness*.5;
   const mass=1,body={id:++this.nextId,p:[...p],vel:[0,0,0],w:[0,0,0],
    q:[0,0,0,1],n:[0,0,1],u:[1,0,0],v:[0,1,0],r,h,im:1/mass,
    invIT:12/(mass*(3*r*r+4*h*h)),invIN:2/(mass*r*r),sleep:old,quiet:old?2:0,
    age:0,old,hits:0};
   return body;
  }
  reset(){this.rand=rng(this.seed);this.coins=[];this.nextId=0;this.tick=0;this.time=0;
   this.emitted=0;this.phase='ready';this.nextEmit=0;this.coinContacts=0;this.planeContacts=0;
   this.peakSpeed=0;this.peakHeight=0;this.finishedAt=null;
   // Existing saved currency is a set of 3D rigid bodies, in several real layers.
   for(let i=0;i<this.initialPile;i++){
    const column=i%6,layer=Math.floor(i/6);
    const x=-3.56+column*.62,y=-.54+(column%2)*.53,z=(layer+.5)*WORLD.thickness+.003;
    const c=this._newCoin([x,y,z],true);c.q=axisAngle([0,0,1],this.rand()*TAU);
    c.p[2]=(layer+.5)*WORLD.thickness+.006;updateBasis(c);this.coins.push(c);
   }
   return this;
  }
  start(count=this.requested){this.requested=clamp(Math.floor(count),1,100);
   if(this.phase==='ready'){this.phase='firing';this.nextEmit=this.time;return this;}
   this.emitted=0;this.phase='firing';this.nextEmit=this.time;this.finishedAt=null;return this;
  }
  _emit(){if(this.emitted>=this.requested)return;
   const i=this.emitted++,v=this.rand;
   const p=[WORLD.chute[0]+(v()-.5)*.035,(v()-.5)*.18,WORLD.chute[2]+(v()-.5)*.15];
   const coin=this._newCoin(p);
   const kick=.94+v()*.36;
   coin.vel=[-(10.5+v()*6.5)*kick,(v()-.5)*11.5,(4.5+v()*8.5)*kick];
   // Launch with arbitrary 3D orientation, spins in all three axes.
   coin.q=qmul(axisAngle(norm([v()-.5,v()-.5,v()-.5]),v()*PI*.75),axisAngle([1,0,0],(v()-.5)*1.5));
   coin.w=[(v()-.5)*45,(v()-.5)*45,(v()-.5)*44];
   updateBasis(coin);this.coins.push(coin);
   this.peakSpeed=Math.max(this.peakSpeed,len(coin.vel));
  }
  _schedule(){const progress=this.emitted/this.requested;
   // Mechanical burst: densely clustered high-pressure front, easing tail.
   const dt=progress<.12?.013:progress<.77?.017:progress<.94?.025:.044;
   this.nextEmit=this.time+dt+this.rand()*.004;
  }
  _planes(c,hit,iter){
   const tests=[[[0,0,1],c.p[2]-supportRadius(c,[0,0,1])],
     [[0,0,-1],WORLD.ceiling-c.p[2]-supportRadius(c,[0,0,1])],
     [[1,0,0],c.p[0]-WORLD.left-supportRadius(c,[1,0,0])],
     [[-1,0,0],WORLD.right-c.p[0]-supportRadius(c,[1,0,0])],
     [[0,1,0],c.p[1]-WORLD.near-supportRadius(c,[0,1,0])],
     [[0,-1,0],WORLD.far-c.p[1]-supportRadius(c,[0,1,0])]];
   for(let i=0;i<tests.length;i++){const [n,gap]=tests[i];
    if(gap<0)impactPlane(c,n,-gap,hit,i===0?'ground':'wall',iter);
   }
  }
  _integrate(c){if(c.sleep)return;
   c.age+=STEP;c.vel[2]-=WORLD.gravity*STEP;
   // Coin spin and toss damp by air; contact friction handles actual impact decay.
   c.vel=mul(c.vel,.9992);c.w=mul(c.w,.9985);
   c.p=add(c.p,mul(c.vel,STEP));
   c.w=c.w.map(v=>clamp(v,-56,56));
   const spin=len(c.w)*STEP;
   if(spin>1e-9)c.q=qnorm(qmul(axisAngle(c.w,spin),c.q));
   updateBasis(c);
  }
  _contacts(){
   const hit=(type,speed)=>{if(type==='coin')this.coinContacts++;else this.planeContacts++;};
   // A narrow 3D bounding sphere broadphase; only actual 3D overlaps solve SAT.
   const pairs=[];
   for(let i=0;i<this.coins.length;i++)for(let j=i+1;j<this.coins.length;j++){
    const a=this.coins[i],b=this.coins[j];
    if(a.sleep&&b.sleep)continue;
    if(len(sub(a.p,b.p))>a.r+b.r+.035)continue;
    pairs.push([a,b]);
   }
   for(let iter=0;iter<5;iter++){
    for(const [a,b] of pairs){const c=axisMin(a,b);
     if(c){if(a.sleep||b.sleep){ // old pile really reacts to the new 3D impact
       const moving=a.sleep?b:a;
       if(len(moving.vel)>1.3){a.sleep=false;b.sleep=false;a.quiet=0;b.quiet=0;}
      }
      impactPair(a,b,c.n,c.depth,hit,iter);
     }
    }
    for(const c of this.coins)if(!c.sleep)this._planes(c,hit,iter);
   }
  }
  step(){if(this.phase==='ready')return this;
   this.tick++;this.time=this.tick*STEP;
   while(this.phase==='firing'&&this.emitted<this.requested&&this.time>=this.nextEmit){this._emit();this._schedule();}
   for(const c of this.coins)this._integrate(c);
   this._contacts();
   let awake=0;
   for(const c of this.coins){this.peakHeight=Math.max(this.peakHeight,c.p[2]);
    if(c.sleep)continue;
    const speed=len(c.vel),turn=len(c.w);
    // Only rest when supported by the actual 3D floor / another 3D coin.
    const bottom=c.p[2]-supportRadius(c,[0,0,1]);
    const supported=bottom<.042||this.coins.some(other=>other!==c&&
      Math.abs(c.p[0]-other.p[0])<c.r+other.r&&
      Math.abs(c.p[1]-other.p[1])<c.r+other.r&&
      Math.abs(c.p[2]-other.p[2])<.19&&other.p[2]<c.p[2]);
    if(supported&&speed<1.8){
      c.vel[0]*=.87;c.vel[1]*=.87;c.vel[2]*=.65;c.w=mul(c.w,.71);
    }
    if(supported&&len(c.vel)<.85&&len(c.w)<2.4){c.quiet+=STEP;
     if(c.quiet>.16){c.sleep=true;c.vel=[0,0,0];c.w=[0,0,0];}}
    else c.quiet=0;
    if(!c.sleep)awake++;
   }
   if(this.phase==='firing'&&this.emitted===this.requested)this.phase='settling';
   if(this.phase==='settling'&&!awake){this.phase='settled';this.finishedAt=this.time;}
   return this;
  }
  seek(ms){this.reset();this.start(this.requested);this.advance(ms/1000);return this;}
  advance(seconds){const n=Math.floor(clamp(seconds,0,30)/STEP+1e-9);
   for(let i=0;i<n;i++)this.step();return this;}
  snapshot(){const count=this.coins.length,all=this.coins.filter(c=>c.sleep).length;
   const zRange=[Math.min(...this.coins.map(c=>c.p[2])),Math.max(...this.coins.map(c=>c.p[2]))];
   return {tick:this.tick,time:+this.time.toFixed(5),emitted:this.emitted,requested:this.requested,
    total:count,sleeping:all,coinContacts:this.coinContacts,planeContacts:this.planeContacts,
    peakSpeed:+this.peakSpeed.toFixed(2),peakHeight:+this.peakHeight.toFixed(2),
    zRange,phase:this.phase,finishedAt:this.finishedAt,
    coins:this.coins.map(c=>({id:c.id,p:c.p.map(x=>+x.toFixed(4)),
      q:c.q.map(x=>+x.toFixed(5)),vel:c.vel.map(x=>+x.toFixed(3)),sleep:c.sleep,old:c.old}))};
  }
 }
 return Object.freeze({Simulation,WORLD,STEP,math:{qrotate,axisAngle,dot,cross,supportRadius,axisMin}});
});
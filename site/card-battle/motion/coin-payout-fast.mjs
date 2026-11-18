/**
 * High-density, real XYZ coin impulses using spatial-hash neighbourhoods.
 * Full 10-facet visual geometry is unchanged. Each fast body has its own
 * 3D position, velocity, orientation, spin and contact history; collisions
 * use a low-cost conservative disc approximation (not Cannon's exact convex SAT).
 * Arcade physics, NOT a claim of 500 precise Cannon convex bodies.
 *
 * Why: a 500-coin Cannon convex pile has an extreme CPU cost in a browser.
 * Contact resolution is constrained to near neighbours in the basin.
 */
import {COIN,BASIN,CAPS} from './coin-payout-rigid.mjs';
export const FAST_DT=1/60;
const R=COIN.radius,H=COIN.height;
const DIAMETER=R*2;
const CONTACT_XZ=DIAMETER*.89;
const CONTACT_XZ2=CONTACT_XZ*CONTACT_XZ;
const FLOOR=H*.5;
const CELL=DIAMETER;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function vec(x=0,y=0,z=0){return {x,y,z,length(){return Math.hypot(this.x,this.y,this.z)}}}
function normalize(q){const n=1/Math.max(1e-8,Math.hypot(q.x,q.y,q.z,q.w));q.x*=n;q.y*=n;q.z*=n;q.w*=n;}
function spinQuaternion(b,dt){
 const q=b.quaternion,w=b.angularVelocity,half=dt*.5;
 const x=q.x,y=q.y,z=q.z,s=q.w;
 q.x+=half*(w.x*s+w.y*z-w.z*y);
 q.y+=half*(w.y*s+w.z*x-w.x*z);
 q.z+=half*(w.z*s+w.x*y-w.y*x);
 q.w-=half*(w.x*x+w.y*y+w.z*z);
 normalize(q);
}
export class FastCoinPayout{
 constructor({seed=20261118,maxCoins=CAPS.max}={}){
  this.random=rng(seed);this.seed=seed;this.maxCoins=maxCoins;
  this.coins=[];this.world={contacts:[],gravity:vec(0,-COIN.gravity,0)};
  this.tick=0;this.time=0;this.phase='ready';this.totalEmitted=0;
  this.batchTarget=0;this.batchEmitted=0;this.nextEmission=0;
  this.contactCount=0;this.groundContacts=0;this.peakHeight=0;this.escapedEver=0;
  this.physicsModel='3D spatial-hash coin-disc impulses';
  this.grid=new Map();this.collisionEvents=[];
 }
 fire(n=240){
  if(this.coins.length>=this.maxCoins)return 0;
  const num=clamp(Math.round(n)||120,1,this.maxCoins-this.coins.length);
  this.batchTarget=num;this.batchEmitted=0;this.phase='firing';this.nextEmission=this.time;
  return num;
 }
 addCoin(pos,vel,spin){
  const q={x:(this.random()-.5)*.16,y:(this.random()-.5)*.14,z:(this.random()-.5)*.16,w:1};normalize(q);
  const b={position:vec(...pos),velocity:vec(...vel),angularVelocity:vec(...spin),quaternion:q,
   sleepState:0,mass:.145,userData:{kind:'coin',id:this.coins.length},idle:0,prevY:pos[1]};
  this.coins.push(b);return b;
 }
 emit(){
  if(this.coins.length>=this.maxCoins)return;
  const r=this.random,slot=this.batchEmitted;
  const zlane=((slot%7)-3)*.062+(r()-.5)*.032;
  const strength=.94+r()*.12;
  this.addCoin([BASIN.chute[0]+(r()-.5)*.010,BASIN.chute[1]+((slot%3)-1)*.015,zlane],
    [-(17.5+r()*3.2)*strength,(-7.0-r()*2.2)*strength,(r()-.5)*1.8],
    [(r()-.5)*24,(r()-.5)*34,(r()-.5)*27]);
  this.batchEmitted++;this.totalEmitted++;
  const p=this.batchEmitted/this.batchTarget;
  const interval=p<.13?.0105:p<.82?.0132:p<.94?.016:.021;
  this.nextEmission=this.time+interval+(r()-.5)*.001;
  if(this.batchEmitted===this.batchTarget)this.phase='settling';
 }
 // An analytical impulse at a solid wall, no teleport or extra visible wall.
 wallHit(b,axis,low,high,half){
  const p=b.position,v=b.velocity;
  const lo=low+half,hi=high-half;
  if(p[axis]>=lo&&p[axis]<=hi)return false;
  const face=p[axis]<lo?lo:hi;
  const speed=v[axis];p[axis]=face;
  if((face===lo&&speed<0)||(face===hi&&speed>0))v[axis]=-speed*.09;
  if(axis==='x'){v.z*=.85;v.y*=.7}
  else {v.x*=.85;v.y*=.7}
  b.angularVelocity.x*=.62;b.angularVelocity.z*=.62;
  return true;
 }
 resolvePair(a,b){
  if(a.sleepState===2&&b.sleepState===2)return;
  const p=a.position,q=b.position,dx=q.x-p.x,dz=q.z-p.z,d2=dx*dx+dz*dz;
  if(d2>CONTACT_XZ2)return;
  const yDist=q.y-p.y,absY=Math.abs(yDist);
  // Thin discs: vertical contact for falling onto an overlapping face.
  // Use previous Y to avoid tunnelling through 4cm discs in a 60Hz step.
  const upper=yDist>=0?b:a,lower=yDist>=0?a:b;
  const top=lower.position.y+H*.985;
  const wasAbove=upper.prevY>=top-H*.5;
  const verticalContact=(absY>=H*.40||wasAbove&&upper.velocity.y<-.08)&&
   absY<Math.max(.24,H*4)&&upper.position.y<top;
  if(verticalContact){
   const depth=top-upper.position.y;
   if(depth>0&&depth<.34){
    const approach=upper.velocity.y-lower.velocity.y;
    // Strong impacts can reawaken a settled coin; small pressure does not.
    if(lower.sleepState===2 && approach < -3.5){
      lower.sleepState=0;lower.idle=0;
    }
    const lowerFree=lower.sleepState!==2;
    if(upper.sleepState===2){lower.position.y-=depth;}
    else {upper.position.y+=depth*(lowerFree?.83:1);
      if(lowerFree)lower.position.y-=depth*.17;}

    if(approach<0){upper.velocity.y=lower.velocity.y-approach*.06;
     if(lowerFree)lower.velocity.y+=approach*.07;}
    upper.velocity.x*=.88;upper.velocity.z*=.88;
    upper.angularVelocity.x*=.64;upper.angularVelocity.z*=.64;
    if(approach<-.55){upper.idle=0;if(lowerFree)lower.idle=0;}
    this.contactCount++;this.pushContact(upper,lower);return;
   }
  }
  // Side impact: a disc occupies real area in XZ, not a spherical 40cm bubble.
  if(absY>H*2.7)return;
  const dist=Math.sqrt(d2)||.00001,penetration=CONTACT_XZ-dist;
  if(penetration<=0)return;
  const nx=dist>.001?dx/dist:(a.userData.id%2?1:-1),nz=dist>.001?dz/dist:0;
  // Heavy side-on hit dislodges old coins instead of turning the pile to stone.
  if(a.sleepState===2 && (b.velocity.x-a.velocity.x)*nx+(b.velocity.z-a.velocity.z)*nz < -3.2){a.sleepState=0;a.idle=0;}
  if(b.sleepState===2 && (b.velocity.x-a.velocity.x)*nx+(b.velocity.z-a.velocity.z)*nz < -3.2){b.sleepState=0;b.idle=0;}
  const aMove=a.sleepState===2?0:1,bMove=b.sleepState===2?0:1;
  if(!aMove&&!bMove)return;
  const inv=1/(aMove+bMove);
  p.x-=nx*penetration*inv*aMove;p.z-=nz*penetration*inv*aMove;
  q.x+=nx*penetration*inv*bMove;q.z+=nz*penetration*inv*bMove;
  const rv=(b.velocity.x-a.velocity.x)*nx+(b.velocity.z-a.velocity.z)*nz;
  if(rv<0){const impulse=-(1.07)*rv*inv;
   if(aMove){a.velocity.x-=impulse*nx;a.velocity.z-=impulse*nz}
   if(bMove){b.velocity.x+=impulse*nx;b.velocity.z+=impulse*nz}
  }
  a.angularVelocity.y*=.84;b.angularVelocity.y*=.84;
  if(rv<-.45){a.idle=b.idle=0;}
  this.contactCount++;this.pushContact(a,b);
 }
 pushContact(a,b){
  // Report a few true current XYZ contacts for the existing small light glints.
  if(this.world.contacts.length>=32)return;
  this.world.contacts.push({bi:a,bj:b,ri:vec((b.position.x-a.position.x)*.5,
   (b.position.y-a.position.y)*.5,(b.position.z-a.position.z)*.5)});
 }
 buildGrid(){
  this.grid.clear();
  for(let i=0;i<this.coins.length;i++){
   const p=this.coins[i].position;
   const k=(Math.floor((p.x-BASIN.left)/CELL)+2)*32+Math.floor((p.z-BASIN.back)/CELL)+2;
   let arr=this.grid.get(k);
   if(!arr){arr=[];this.grid.set(k,arr)}arr.push(i);
  }
 }
 step(){
  if(this.phase==='firing'){
   while(this.batchEmitted<this.batchTarget&&this.time+1e-8>=this.nextEmission)this.emit();
  }
  const dt=FAST_DT;this.world.contacts.length=0;
  const damping=Math.exp(-.18*dt),angDamp=Math.exp(-1.9*dt);
  for(const b of this.coins){
   if(b.sleepState===2)continue;
   const p=b.position,v=b.velocity,w=b.angularVelocity;
   b.prevY=p.y;
   v.y-=COIN.gravity*dt;
   v.x*=damping;v.z*=damping;
   p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;
   w.x*=angDamp;w.y*=angDamp;w.z*=angDamp;
   spinQuaternion(b,dt);
   if(p.y<FLOOR){
    p.y=FLOOR;
    if(v.y<0)v.y=-v.y*.055;
    v.x*=.85;v.z*=.85;w.x*=.53;w.z*=.53;
    b.quaternion.x*=.88;b.quaternion.z*=.88;normalize(b.quaternion);
    this.groundContacts++;
   }
   this.wallHit(b,'x',BASIN.left,BASIN.right,R*.83);
   this.wallHit(b,'z',BASIN.back,BASIN.front,R*.83);
  }
  // Uniform 3D-space occupancy allows a bounded near-neighbour search.
  this.buildGrid();
  for(let pass=0;pass<2;pass++){
   for(let i=0;i<this.coins.length;i++){
    const a=this.coins[i],p=a.position;
    const ix=Math.floor((p.x-BASIN.left)/CELL)+2;
    const iz=Math.floor((p.z-BASIN.back)/CELL)+2;
    for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
     const arr=this.grid.get((ix+ox)*32+(iz+oz));if(!arr)continue;
     for(const j of arr){if(j<=i)continue;this.resolvePair(a,this.coins[j]);}
    }
   }
  }
  let moving=0;
  for(const b of this.coins){
   const p=b.position,v=b.velocity;
   if(b.sleepState!==2){
    if(p.y<FLOOR){p.y=FLOOR;if(v.y<0)v.y=0}
    this.wallHit(b,'x',BASIN.left,BASIN.right,R*.83);
    this.wallHit(b,'z',BASIN.back,BASIN.front,R*.83);
    const slow=Math.hypot(v.x,v.y,v.z)<.30&&p.y<1.35;
    b.idle=slow?b.idle+dt:0;
    if(b.idle>.27){b.sleepState=2;v.x=v.y=v.z=0;
      b.angularVelocity.x=b.angularVelocity.y=b.angularVelocity.z=0;
    }else moving++;
   }
   if(p.y>this.peakHeight)this.peakHeight=p.y;
   if(p.x<BASIN.left-.25||p.x>BASIN.right+.25||p.z<BASIN.back-.25||p.z>BASIN.front+.25)this.escapedEver++;
  }
  if(this.phase==='settling'&&moving===0)this.phase='settled';
  this.tick++;this.time=this.tick*dt;
  return this;
 }
 advanceFrames(n){for(let i=0;i<Math.max(0,Math.min(12000,n|0));i++)this.step();return this;}
 getSnapshot(){
  let moving=0,min=Infinity,max=-Infinity,inBasin=0;
  for(const b of this.coins){
   if(b.sleepState!==2)moving++;
   const p=b.position;min=Math.min(min,p.y);max=Math.max(max,p.y);
   if(p.x>=BASIN.left-.25&&p.x<=BASIN.right+.25&&p.z>=BASIN.back-.25&&p.z<=BASIN.front+.25)inBasin++;
  }
  return {tick:this.tick,time:+this.time.toFixed(3),count:this.coins.length,
   emitted:this.batchEmitted,target:this.batchTarget,totalEmitted:this.totalEmitted,
   moving,asleep:this.coins.length-moving,contacts:this.contactCount,
   groundContacts:this.groundContacts,peakHeight:+this.peakHeight.toFixed(3),
   pileY:[min===Infinity?0:min,max===-Infinity?0:max],
   real3D:true,collisionShape:'optimized XYZ thin-disc impulses',
   escapedEver:this.escapedEver,inBasin,bowl:BASIN,
   radius:R,height:H,phase:this.phase,physicsModel:this.physicsModel};
 }
 destroy(){this.coins.length=0;this.world.contacts.length=0;this.grid.clear()}
}
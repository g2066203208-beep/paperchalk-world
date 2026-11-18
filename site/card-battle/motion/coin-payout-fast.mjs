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
import {COIN,BASIN,CAPS} from './coin-payout-shared.mjs';
export const FAST_DT=1/60;
const R=COIN.radius,H=COIN.height;
const DIAMETER=R*2;
const CONTACT_XZ=DIAMETER*.995; // full visible disc footprint; previous .89 meant 11% clipping
const CONTACT_XZ2=CONTACT_XZ*CONTACT_XZ;
const FLOOR=H*.5;
const CELL=DIAMETER;
const POSITION_PASSES=5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function vec(x=0,y=0,z=0){return {x,y,z,length(){return Math.hypot(this.x,this.y,this.z)}}}
function normalize(q){const n=1/Math.max(1e-8,Math.hypot(q.x,q.y,q.z,q.w));q.x*=n;q.y*=n;q.z*=n;q.w*=n;}
// Conservative world-Y projection of the REAL tilted flat cylinder.
// The old collision code assumed coins were always flat even while their
// rendered quaternions tipped them through their neighbours.
function halfHeight(q){
 const ny=Math.max(-1,Math.min(1,1-2*(q.x*q.x+q.z*q.z)));
 return R*Math.sqrt(Math.max(0,1-ny*ny))+(H*.5)*Math.abs(ny);
}

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
  this.physicsModel='3D spatial-hash oriented-disc separation (non-SAT)';
  this.overlapPairs=0;this.maxOverlap=0;
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
   sleepState:0,mass:.145,userData:{kind:'coin',id:this.coins.length},idle:0,prevY:pos[1],halfY:halfHeight(q)};
  this.coins.push(b);return b;
 }
 emit(){
  if(this.coins.length>=this.maxCoins)return;
  const r=this.random,slot=this.batchEmitted;
  // Two physically non-overlapping outlet lanes: no twin coins spawned at
  // the same place in the same simulation step. Alternate at the real chute.
  const zlane=(slot%2?1:-1)*.255+(r()-.5)*.015;
  const strength=.94+r()*.12;
  this.addCoin([BASIN.chute[0]+(r()-.5)*.010,BASIN.chute[1]+((slot%3)-1)*.006,zlane],
    [-(17.5+r()*3.2)*strength,(-7.0-r()*2.2)*strength,(r()-.5)*1.8],
    [(r()-.5)*24,(r()-.5)*34,(r()-.5)*27]);
  this.batchEmitted++;this.totalEmitted++;
  const p=this.batchEmitted/this.batchTarget;
  const interval=p<.13?.0125:p<.82?.0142:p<.94?.017:.024;
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
  const bothSleeping=a.sleepState===2&&b.sleepState===2;
  const p=a.position,q=b.position,dx=q.x-p.x,dz=q.z-p.z;
  const d2=dx*dx+dz*dz;
  if(d2>=CONTACT_XZ2)return;
  const dy=q.y-p.y,absY=Math.abs(dy);
  // The collision envelope matches the visual tilted coin, not only the
  // physical thickness of a perfectly horizontal coin.
  const targetY=a.halfY+b.halfY;
  if(absY>=targetY)return;
  const dist=Math.sqrt(d2);
  const px=CONTACT_XZ-dist,py=targetY-absY;
  if(px<=0||py<=0)return;
  this.overlapPairs++;
  const ratioX=px/CONTACT_XZ,ratioY=py/targetY;
  const heavilyCoincident=px>R*.65 && absY<H*.80;
  // A congested pile at the basin floor MUST stack rather than ghost through.
  const isVertical=heavilyCoincident ||
    (ratioY<ratioX && absY>0.002)||
    (absY>H*.7 && ratioY<.82);
  let aMove=a.sleepState===2?0:1,bMove=b.sleepState===2?0:1;
  if(bothSleeping){
    if(px<.008&&py<.002)return;
    // Reopen a single newest resting body when a late coin pressure contacts
    // it. A permanently frozen overlapping pair used to pass through forever.
    b.sleepState=0;b.idle=0;bMove=1;
  }
  const factor=1/(aMove+bMove);
  if(isVertical){
    const dir=Math.abs(dy)<.003?1:dy>=0?1:-1;
    const corr=py+0.0005;
    p.y-=dir*corr*factor*aMove;
    q.y+=dir*corr*factor*bMove;
    const rel=(b.velocity.y-a.velocity.y)*dir;
    if(rel<0){
      const impulse=-(1.035)*rel*factor;
      if(aMove)a.velocity.y-=dir*impulse;
      if(bMove)b.velocity.y+=dir*impulse;
    }
    if(aMove){a.velocity.x*=.91;a.velocity.z*=.91;a.angularVelocity.x*=.57;a.angularVelocity.z*=.57;}
    if(bMove){b.velocity.x*=.91;b.velocity.z*=.91;b.angularVelocity.x*=.57;b.angularVelocity.z*=.57;}
  }else{
    const nx=dist>.0001?dx/dist:(a.userData.id%2?1:-1);
    const nz=dist>.0001?dz/dist:0;
    const corr=px+0.0005;
    p.x-=nx*corr*factor*aMove;p.z-=nz*corr*factor*aMove;
    q.x+=nx*corr*factor*bMove;q.z+=nz*corr*factor*bMove;
    const rel=(b.velocity.x-a.velocity.x)*nx+(b.velocity.z-a.velocity.z)*nz;
    if(rel<0){
      const impulse=-(1.05)*rel*factor;
      if(aMove){a.velocity.x-=nx*impulse;a.velocity.z-=nz*impulse;}
      if(bMove){b.velocity.x+=nx*impulse;b.velocity.z+=nz*impulse;}
    }
    a.angularVelocity.y*=.78;b.angularVelocity.y*=.78;
  }
  // Only a significant incoming impact breaks resting / sleep progression.
  if(aMove && Math.hypot(a.velocity.x,a.velocity.y,a.velocity.z)>.65)a.idle=0;
  if(bMove && Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z)>.65)b.idle=0;
  this.contactCount++;
  this.pushContact(a,b);
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
   // Fallen coins settle FACE-UP, instead of remaining edge-on at arbitrary
   // quaternions and intersecting neighbouring face textures. Preserve Y spin.
   if(p.y<.85 && v.y<2.5){
    b.quaternion.x*=.48;b.quaternion.z*=.48;
    w.x*=.35;w.z*=.35;normalize(b.quaternion);
   }
   b.halfY=halfHeight(b.quaternion);
   if(p.y<b.halfY){
    p.y=b.halfY;
    if(v.y<0)v.y=-v.y*.055;
    v.x*=.85;v.z*=.85;w.x*=.53;w.z*=.53;
    b.quaternion.x*=.77;b.quaternion.z*=.77;normalize(b.quaternion);
    b.halfY=halfHeight(b.quaternion);
    p.y=Math.max(p.y,b.halfY);
    this.groundContacts++;
   }
   this.wallHit(b,'x',BASIN.left,BASIN.right,R);
   this.wallHit(b,'z',BASIN.back,BASIN.front,R);
  }
  // Uniform 3D-space occupancy allows a bounded near-neighbour search.
  this.buildGrid();
  for(let pass=0;pass<POSITION_PASSES;pass++){
   if(pass>0)this.buildGrid(); // previous corrections may cross grid cells
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
  // Pair iterations can temporarily push the lower coin BELOW the floor.
  // Clamp floor and walls BEFORE stacking: clamping afterwards used to move
  // older coins up and RE-INTERSECT previously resolved neighbours.
  for(const b of this.coins){
   if(b.position.y<b.halfY){b.position.y=b.halfY;if(b.velocity.y<0)b.velocity.y=0;}
   this.wallHit(b,'x',BASIN.left,BASIN.right,R);
   this.wallHit(b,'z',BASIN.back,BASIN.front,R);
  }
  // Final non-penetration constraint. The previous lightweight solver let
  // coins fall asleep inside each other because horizontal impulses cannot
  // rearrange a congested multi-layer pile. Resolve *visible* intersections
  // deterministically in ascending creation order: newer coins must rest on
  // top of occupied volumes, not pass through existing metal.
  this.buildGrid();
  for(let j=0;j<this.coins.length;j++){
   const b=this.coins[j],p=b.position;
   const ix=Math.floor((p.x-BASIN.left)/CELL)+2;
   const iz=Math.floor((p.z-BASIN.back)/CELL)+2;
   let corrections=0;
   const beforeStackY=p.y;
   for(let pass=0;pass<100;pass++){
    let target=p.y;
    for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
     const bucket=this.grid.get((ix+ox)*32+(iz+oz));if(!bucket)continue;
     for(const i of bucket){
      if(i>=j)continue;
      const a=this.coins[i],q=a.position;
      const dx=p.x-q.x,dz=p.z-q.z;
      if(dx*dx+dz*dz>=CONTACT_XZ2)continue;
      const separation=b.halfY+a.halfY+.0015;
      const dy=p.y-q.y;
      if(Math.abs(dy)<separation-.001 && q.y+separation>target){
       target=q.y+separation;
      }
     }
    }
    if(target<=p.y+.0001)break;
    p.y=target;corrections++;
   }
   if(corrections){
    // Support corrections of ~1 cm per gravity step are not impacts.
    // Reset sleep only for substantial displacements or incoming momentum.
    const impactSpeed=Math.hypot(b.velocity.x,b.velocity.y,b.velocity.z);
    if(b.velocity.y<0)b.velocity.y=0;
    if(p.y-beforeStackY>.065 || impactSpeed>1.0){
     b.sleepState=0;b.idle=0;
    }
   }
  }
  let moving=0;
  for(const b of this.coins){
   const p=b.position,v=b.velocity;
   if(b.sleepState!==2){
    if(p.y<b.halfY){p.y=b.halfY;if(v.y<0)v.y=0}
    this.wallHit(b,'x',BASIN.left,BASIN.right,R);
    this.wallHit(b,'z',BASIN.back,BASIN.front,R);
    const slow=Math.hypot(v.x,v.y,v.z)<.22&&p.y<1.35;
    b.idle=slow?b.idle+dt:0;
    if(b.idle>.52){b.sleepState=2;v.x=v.y=v.z=0;
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
 // Spatial broadphase-based visible intersection guard. This checks ALL
 // bodies, including asleep ones; the previous implementation only tested
 // dynamic contacts and gave a false clean bill of health to frozen ghosts.
 countVisibleIntersections(){
  let penetrating=0,maxPenetration=0;
  // Grid is rebuilt after each collision stage in step(); no O(n^2) scan.
  for(let j=0;j<this.coins.length;j++){
   const b=this.coins[j],p=b.position;
   const ix=Math.floor((p.x-BASIN.left)/CELL)+2;
   const iz=Math.floor((p.z-BASIN.back)/CELL)+2;
   for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){
    const arr=this.grid.get((ix+ox)*32+(iz+oz));if(!arr)continue;
    for(const i of arr){if(i>=j)continue;
     const a=this.coins[i],q=a.position;
     const dx=p.x-q.x,dz=p.z-q.z,dist=Math.hypot(dx,dz);
     if(dist>=CONTACT_XZ)continue;
     const vertical=b.halfY+a.halfY,dy=Math.abs(p.y-q.y);
     if(dy>=vertical)continue;
     const depth=Math.min((CONTACT_XZ-dist)/CONTACT_XZ,(vertical-dy)/vertical);
     if(depth>.01){penetrating++;maxPenetration=Math.max(maxPenetration,depth);}
    }
   }
  }
  return {penetrating,maxPenetration:+maxPenetration.toFixed(4)};
 }
 getSnapshot(){
  let moving=0,min=Infinity,max=-Infinity,inBasin=0;
  for(const b of this.coins){
   if(b.sleepState!==2)moving++;
   const p=b.position;min=Math.min(min,p.y);max=Math.max(max,p.y);
   if(p.x>=BASIN.left-.25&&p.x<=BASIN.right+.25&&p.z>=BASIN.back-.25&&p.z<=BASIN.front+.25)inBasin++;
  }
  const overlaps=this.countVisibleIntersections();
  return {tick:this.tick,time:+this.time.toFixed(3),count:this.coins.length,
   emitted:this.batchEmitted,target:this.batchTarget,totalEmitted:this.totalEmitted,
   moving,asleep:this.coins.length-moving,contacts:this.contactCount,
   groundContacts:this.groundContacts,peakHeight:+this.peakHeight.toFixed(3),
   pileY:[min===Infinity?0:min,max===-Infinity?0:max],
   real3D:true,collisionShape:'oriented conservative disc envelope + spatial XYZ impulses',
   overlapPairs:this.overlapPairs,halfHeightAware:true,
   overlappingCoins:overlaps.penetrating,maxOverlap:overlaps.maxPenetration,
   escapedEver:this.escapedEver,inBasin,bowl:BASIN,
   radius:R,height:H,phase:this.phase,physicsModel:this.physicsModel};
 }
 destroy(){this.coins.length=0;this.world.contacts.length=0;this.grid.clear()}
}
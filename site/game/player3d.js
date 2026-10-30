/* PAPERWORLD grounded first-person controller.
 * World X forward, Y left, Z up. Capsule-like footprint circles with AABB
 * swept/substep collision and axis sliding; fixed ground/eye stance heights.
 * Pure logic for deterministic browser + GitHub Actions testing.
 */
export const STANCES=Object.freeze({
 stand:Object.freeze({height:1.78,eye:1.64,speed:4.1,accel:14,brake:19}),
 crouch:Object.freeze({height:1.05,eye:.91,speed:1.9,accel:10,brake:17}),
 prone:Object.freeze({height:.46,eye:.34,speed:.76,accel:7,brake:13})
});
export const PERSON_RADIUS=.34,PLAYER_START=Object.freeze([0,0,0]);
const minmax=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(current,target,maxStep)=>current+minmax(target-current,-maxStep,maxStep);
export function townColliders(){
 const solid=[];
 const box=(x,y,w,d,z=0,h=24)=>solid.push({minX:x-w/2,maxX:x+w/2,minY:y-d/2,maxY:y+d/2,minZ:z,maxZ:z+h});
 // Mirror occupied boxes in world3d.js, excluding architectural decoration.
 for(let i=-7;i<=7;i++){
  const x=i*10+4;
  for(const j of [-3,-2,-1,1,2,3]){
   const y=j*10.5+2;
   if(Math.abs(x)<9&&Math.abs(y)<12)continue;
   const seed=Math.abs(i*23+j*17);
   const w=4.6+(seed%3)*.7;
   box(x,y,w,5.5,.1,3+(seed%5)*1.2+.25);
  }
 }
 box(30,0,9.5,10,.1,13);
 // Trees have trunk collision, but not huge invisible rectangular crown blocks.
 for(let x=-45;x<=60;x+=10)for(const y of [-6.5,6.5]){
  if(x>=24&&x<=37)continue;
  box(x,y,.68,.68,0,2);
 }
 box(66,-22,4,4,14,18);
 return solid;
}
export function collides(x,y,z,height,radius,colliders){
 // This is circle-vs-rect in XY plus true height interval overlap in Z.
 for(const b of colliders){
  if(z+height<=b.minZ||z>=b.maxZ)continue;
  const cx=minmax(x,b.minX,b.maxX),cy=minmax(y,b.minY,b.maxY);
  if((x-cx)**2+(y-cy)**2<(radius-.0001)**2)return true;
 }
 return false;
}
export function postureFromTilt(deltaDegrees,current){
 // Hold the dedicated stance-gesture control, tilt phone FORWARD (nose down)
 // from its captured orientation, then release. Camera-look mode unaffected.
 if(deltaDegrees>=46)return 'prone';
 if(deltaDegrees>=17)return 'crouch';
 if(deltaDegrees<=-16)return 'stand';
 return current;
}
export class PlayerBody{
 constructor(colliders=townColliders()){
  this.colliders=colliders;
  this.position={x:PLAYER_START[0],y:PLAYER_START[1],z:PLAYER_START[2]};
  this.velocity={x:0,y:0};
  this.radius=PERSON_RADIUS;this.stance='stand';this.requested='stand';
  this.eyeHeight=STANCES.stand.eye;this.bobPhase=0;this.bob=0;
  this.distance=0;this.blocked=false;this.moving=false;
 }
 setStance(kind){
  if(!Object.hasOwn(STANCES,kind))return false;
  this.requested=kind;return true;
 }
 canStand(kind){
  const h=STANCES[kind]?.height;
  return !!h&&!collides(this.position.x,this.position.y,this.position.z,h,this.radius,this.colliders);
 }
 step(dt,axes,yaw=0,sprint=false){
  dt=minmax(Number(dt)||0,0,1/20);if(dt<=0)return;
  if(this.stance!==this.requested){
   if(this.canStand(this.requested))this.stance=this.requested;
   else this.requested=this.stance;
  }
  const profile=STANCES[this.stance];
  // Camera moves continuously when standing/crouching/proning, without teleport.
  const a=1-Math.exp(-dt/Math.max(.06,this.stance==='prone'?.26:.19));
  this.eyeHeight+=(profile.eye-this.eyeHeight)*a;
  const forward=minmax(Number(axes?.forward)||0,-1,1),side=minmax(Number(axes?.side)||0,-1,1);
  const length=Math.max(1,Math.hypot(forward,side));
  const f=forward/length,r=side/length;
  // Y is LEFT; right-handed player strafe right is negative Y.
  const cx=Math.cos(yaw),sy=Math.sin(yaw);
  const wx=cx*f+sy*r,wy=sy*f-cx*r;
  const speed=profile.speed*(sprint&&this.stance==='stand'?1.46:1);
  const vx=wx*speed,vy=wy*speed;
  const driving=Math.hypot(wx,wy)>.015;
  const accel=(driving?profile.accel:profile.brake)*dt;
  this.velocity.x=approach(this.velocity.x,vx,accel);
  this.velocity.y=approach(this.velocity.y,vy,accel);
  if(!driving&&Math.hypot(this.velocity.x,this.velocity.y)<.015){
   this.velocity.x=0;this.velocity.y=0;
  }
  let dx=this.velocity.x*dt,dy=this.velocity.y*dt;
  const beforeX=this.position.x,beforeY=this.position.y;
  this.blocked=false;
  // Swept stepping is bounded to <= 0.12m per substep, preventing tunnel-through
  // at high FPS or when a frame stalls. Slide on free axes.
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
  dx/=n;dy/=n;
  for(let i=0;i<n;i++){
   const tryX=minmax(this.position.x+dx,-88.7,88.7);
   if(!collides(tryX,this.position.y,this.position.z,profile.height,this.radius,this.colliders)){
    this.position.x=tryX;
   }else{this.velocity.x=0;this.blocked=true}
   const tryY=minmax(this.position.y+dy,-88.7,88.7);
   if(!collides(this.position.x,tryY,this.position.z,profile.height,this.radius,this.colliders)){
    this.position.y=tryY;
   }else{this.velocity.y=0;this.blocked=true}
  }
  const traveled=Math.hypot(this.position.x-beforeX,this.position.y-beforeY);
  this.moving=traveled>.0002;this.distance+=traveled;
  if(this.moving)this.bobPhase+=traveled*(this.stance==='stand'?11:7);
  // Very gentle walking camera motion, zero when idle. No head sway on prone.
  const targetBob=this.moving&&this.stance==='stand'?Math.sin(this.bobPhase)*.018:0;
  this.bob+=(targetBob-this.bob)*(1-Math.exp(-dt*12));
 }
 get eye(){return [this.position.x,this.position.y,this.position.z+this.eyeHeight+this.bob]}
 get snapshot(){return {position:{...this.position},velocity:{...this.velocity},stance:this.stance,requested:this.requested,
  eyeHeight:+this.eyeHeight.toFixed(3),eye:this.eye.map(v=>+v.toFixed(3)),blocked:this.blocked,moving:this.moving,
  distance:+this.distance.toFixed(2),speed:+Math.hypot(this.velocity.x,this.velocity.y).toFixed(3)}}
}

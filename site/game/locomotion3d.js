/* PAPERWORLD reliable ground locomotion.
 * No estimated GPS/room coordinates, gait spikes or fake squat detection.
 * Continuous joystick / WASD velocity and explicit stance buttons only.
 * Z is up; ground-plane circles slide against walls.
 */
import {clamp} from './motion3d.js';
export const STANCES=Object.freeze({
 stand:{height:1.68,speed:3.0,radius:.32},
 crouch:{height:1.06,speed:1.4,radius:.32},
 prone:{height:.43,speed:.68,radius:.32}
});
export function blocked(x,y,radius,solids=[]){
 if(Math.abs(x)>88-radius||Math.abs(y)>88-radius)return true;
 for(const box of solids){
  const bx=clamp(x,box.x-box.w/2,box.x+box.w/2);
  const by=clamp(y,box.y-box.d/2,box.y+box.d/2);
  if((x-bx)**2+(y-by)**2<radius*radius)return true;
 }
 return false;
}
export class BodyMotor{
 constructor(solids=[]){
  this.solids=solids;
  this.position={x:0,y:0,z:STANCES.stand.height};
  this.velocity={x:0,y:0};
  this.stance='stand';this.targetHeight=STANCES.stand.height;
  this.traveled=0;this.bumped=false;this.moving=false;
 }
 setStance(name){
  if(!Object.hasOwn(STANCES,name))return false;
  this.stance=name;this.targetHeight=STANCES[name].height;
  return true;
 }
 update(dt,control={},yaw=0){
  dt=clamp(dt,0,.1);
  const cfg=STANCES[this.stance];
  let f=clamp(Number(control.forward)||0,-1,1),side=clamp(Number(control.side)||0,-1,1);
  const size=Math.hypot(f,side);
  if(size>1){f/=size;side/=size}
  const speed=cfg.speed*(control.sprint&&this.stance==='stand'?1.45:1);
  const vx=(Math.cos(yaw)*f-Math.sin(yaw)*side)*speed;
  const vy=(Math.sin(yaw)*f+Math.cos(yaw)*side)*speed;
  // Continuous analog command: fast response, no pulse/timeout/re-arm.
  const tau=size>.04?.045:.058,k=1-Math.exp(-dt/tau);
  this.velocity.x+=(vx-this.velocity.x)*k;
  this.velocity.y+=(vy-this.velocity.y)*k;
  if(size<.01&&Math.hypot(this.velocity.x,this.velocity.y)<.015){
   this.velocity.x=0;this.velocity.y=0;
  }
  const ax=this.velocity.x*dt,ay=this.velocity.y*dt;
  const n=Math.max(1,Math.ceil(Math.hypot(ax,ay)/.055));
  const startX=this.position.x,startY=this.position.y;
  this.bumped=false;
  for(let i=0;i<n;i++){
   const x=this.position.x+ax/n,y=this.position.y+ay/n;
   if(!blocked(x,this.position.y,cfg.radius,this.solids))this.position.x=x;
   else{this.velocity.x=0;this.bumped=true}
   if(!blocked(this.position.x,y,cfg.radius,this.solids))this.position.y=y;
   else{this.velocity.y=0;this.bumped=true}
  }
  const moved=Math.hypot(this.position.x-startX,this.position.y-startY);
  this.traveled+=moved;this.moving=moved>1e-5;
  this.position.z+=(this.targetHeight-this.position.z)*(1-Math.exp(-dt/.17));
  // Disable artificial walking head-bob: it caused visual judder on phones.
  return {eye:[this.position.x,this.position.y,this.position.z],
   stance:this.stance,position:{...this.position},speed:Math.hypot(this.velocity.x,this.velocity.y),bumped:this.bumped};
 }
 snapshot(){
  return {position:{...this.position},stance:this.stance,
   height:+this.position.z.toFixed(3),speed:+Math.hypot(this.velocity.x,this.velocity.y).toFixed(3),
   bumped:this.bumped,moving:this.moving};
 }
}

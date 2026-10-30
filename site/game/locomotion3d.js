/* PAPERWORLD — local-only 3D first-person locomotion, Z-up world.
 * Head heights and player collision are real camera translations through
 * depth-tested geometry. Gestural stance uses deliberate HOLD modifier:
 * moving the phone for looking alone NEVER changes body stance.
 */
import {clamp,RAD,wrap} from './motion3d.js';

export const STANCES=Object.freeze({
 stand:{height:1.68,speed:3.0,radius:.32,eyeBob:.018},
 crouch:{height:1.06,speed:1.35,radius:.32,eyeBob:.008},
 prone:{height:.43,speed:.64,radius:.32,eyeBob:.003}
});
export const MOTION_CONFIG=Object.freeze({
 stepPeak:.84,stepRelease:.34,minStepMs:200,maxStepMs:1250,stepTimeoutMs:900,
 squatPulse:2.1,squatBrake:1.25,squatMinMs:90,squatMaxMs:740,squatCooldownMs:1000,
 crouchOn:29,crouchOff:23,proneOn:62,proneOff:54
});
export const hypot2=(x,y)=>Math.hypot(x,y);
export function blocked(x,y,radius,solids){
 if(Math.abs(x)>88-radius||Math.abs(y)>88-radius)return true;
 for(const b of solids){
  const cx=clamp(x,b.x-b.w/2,b.x+b.w/2),cy=clamp(y,b.y-b.d/2,b.y+b.d/2);
  if((x-cx)**2+(y-cy)**2<radius*radius)return true;
 }
 return false;
}
export class BodyMotor{
 constructor(solids=[]){
  this.solids=solids;this.position={x:0,y:0,z:STANCES.stand.height};
  this.stance='stand';this.targetHeight=STANCES.stand.height;
  this.velocity={x:0,y:0};this.bob=0;this.traveled=0;
  this.walkMode=false;this.stepDirection=1;this.steps=0;this.cadence=0;this.lastStep=-Infinity;
  this.filteredAccel=0;this.stepArmed=true;this.stepMotion=0;
  this.motionAvailable=false;this.postureGesture=false;this.postureAnchor=0;this.postureAngle=0;
  this.sprinting=false;this.bumped=false;this.now=0;
  this.physicalStanceMode=false;this.verticalPhase=0;this.verticalStart=0;
  this.lastVerticalAction=-Infinity;this.verticalActions=0;this.verticalAcceleration=0;
  this.gaitThreshold=MOTION_CONFIG.stepPeak;
 }
 setStance(name){
  if(!(name in STANCES))return false;
  this.stance=name;this.targetHeight=STANCES[name].height;return true;
 }
 startPosture(pitch){
  if(!Number.isFinite(pitch))return false;
  this.postureGesture=true;this.postureAnchor=pitch;this.postureAngle=0;
  return true;
 }
 updatePosture(pitch){
  if(!this.postureGesture||!Number.isFinite(pitch))return this.stance;
  const deg=Math.abs(wrap(pitch-this.postureAnchor))/RAD;
  this.postureAngle=deg;
  // Separate thresholds for entering/leaving: no chatter at boundaries.
  const c=MOTION_CONFIG;
  if(this.stance==='prone'){
   if(deg<c.proneOff)this.setStance(deg>=c.crouchOff?'crouch':'stand');
  }else if(this.stance==='crouch'){
   if(deg>=c.proneOn)this.setStance('prone');
   else if(deg<c.crouchOff)this.setStance('stand');
  }else{
   if(deg>=c.proneOn)this.setStance('prone');
   else if(deg>=c.crouchOn)this.setStance('crouch');
  }
  return this.stance;
 }
 stopPosture(){this.postureGesture=false;this.postureAngle=0}
 ingestAcceleration(x,y,z,timestamp){
  if(![x,y,z,timestamp].every(Number.isFinite))return false;
  // Browser acceleration excludes gravity; displacement cannot be integrated
  // reliably due to sensor noise. Detect explicit step-like peaks instead.
  const magnitude=Math.hypot(x,y,z);
  this.filteredAccel+=.20*(magnitude-this.filteredAccel);
  const activity=Math.max(magnitude*.72+this.filteredAccel*.28,0);
  this.motionAvailable=true;
  if(activity<MOTION_CONFIG.stepRelease)this.stepArmed=true;
  if(this.walkMode&&this.stepArmed&&activity>=this.gaitThreshold&&timestamp-this.lastStep>MOTION_CONFIG.minStepMs){
   const interval=timestamp-this.lastStep;
   this.stepArmed=false;this.steps++;
   this.cadence=interval<=MOTION_CONFIG.maxStepMs?60000/interval:105;
   this.lastStep=timestamp;
   return true;
  }
  return false;
 }
 // Detect a deliberate down/up or up/down translation of the handset.
 // This is a discrete body action, NOT a claim to know absolute height.
 // A full two-phase pulse and cooldown are required; steady tilt cannot trigger it.
 ingestVerticalAcceleration(worldUpAccel,timestamp){
  if(![worldUpAccel,timestamp].every(Number.isFinite))return null;
  this.verticalAcceleration=worldUpAccel;
  if(!this.physicalStanceMode||this.postureGesture||this.walkMode)return null;
  const c=MOTION_CONFIG;
  if(timestamp-this.lastVerticalAction<c.squatCooldownMs)return null;
  const downFirst=this.stance==='stand',sign=downFirst?-1:1;
  if(this.verticalPhase&&timestamp-this.verticalStart>c.squatMaxMs)this.verticalPhase=0;
  const signed=worldUpAccel*sign;
  if(!this.verticalPhase){
   if(signed>c.squatPulse){this.verticalPhase=1;this.verticalStart=timestamp}
   return null;
  }
  const elapsed=timestamp-this.verticalStart;
  if(elapsed>=c.squatMinMs&&signed<-c.squatBrake){
   this.verticalPhase=0;this.lastVerticalAction=timestamp;this.verticalActions++;
   const next=downFirst?'crouch':this.stance==='prone'?'crouch':'stand';
   this.setStance(next);return next;
  }
  return null;
 }
 setWalkMode(on){this.walkMode=!!on;if(!on){this.stepMotion=0;this.stepArmed=true}}
 setWalkDirection(value){this.stepDirection=Number(value)<0?-1:1}
 setGaitThreshold(value){this.gaitThreshold=clamp(Number(value)||.84,.45,2.3)}
 setPhysicalStanceMode(on){this.physicalStanceMode=!!on;this.verticalPhase=0;this.lastVerticalAction=-Infinity}
 movementFromSteps(timestamp){
  if(!this.walkMode||timestamp-this.lastStep>MOTION_CONFIG.stepTimeoutMs)return 0;
  const elapsed=timestamp-this.lastStep;
  const fade=clamp((MOTION_CONFIG.stepTimeoutMs-elapsed)/350,0,1);
  return this.stepDirection*clamp(this.cadence/112,.55,1)*fade;
 }
 update(dt,control,yaw,nowMs){
  dt=clamp(dt,0,.05);this.now=nowMs;
  const stance=STANCES[this.stance],forward=clamp(control.forward||0,-1,1),side=clamp(control.side||0,-1,1);
  const mobileStep=this.movementFromSteps(nowMs);
  let f=forward,s=side;
  // Explicit joystick / keyboard ALWAYS wins over inertial step direction.
  // Real step gesture supports both forward AND backward without double speed.
  if(this.walkMode&&Math.abs(mobileStep)>.01&&Math.abs(forward)<.08)f=mobileStep;
  const mag=hypot2(f,s);
  if(mag>1){f/=mag;s/=mag}
  const speed=stance.speed*(control.sprint&&this.stance==='stand'?1.48:1);
  // X forward, Y left; positive strafe is left.
  const fx=Math.cos(yaw),fy=Math.sin(yaw),lx=-Math.sin(yaw),ly=Math.cos(yaw);
  const desiredX=(fx*f+lx*s)*speed,desiredY=(fy*f+ly*s)*speed;
  const k=1-Math.exp(-dt/Math.max(.018,mag>.01?.085:.06));
  this.velocity.x+=(desiredX-this.velocity.x)*k;
  this.velocity.y+=(desiredY-this.velocity.y)*k;
  const distance=hypot2(this.velocity.x,this.velocity.y)*dt;
  const steps=Math.max(1,Math.ceil(distance/.08));
  const vx=this.velocity.x*dt/steps,vy=this.velocity.y*dt/steps;
  this.bumped=false;
  for(let i=0;i<steps;i++){
   const px=this.position.x+vx,py=this.position.y+vy;
   if(!blocked(px,this.position.y,stance.radius,this.solids))this.position.x=px;
   else{this.velocity.x=0;this.bumped=true}
   if(!blocked(this.position.x,py,stance.radius,this.solids))this.position.y=py;
   else{this.velocity.y=0;this.bumped=true}
  }
  // Grounded on the flat road. Smooth eye-height transition with separate
  // exponential damping, so changing stance never teleports the camera.
  const heightEase=1-Math.exp(-dt/.19);
  this.position.z+=(this.targetHeight-this.position.z)*heightEase;
  const actualTravel=hypot2(this.velocity.x,this.velocity.y)*dt;
  this.traveled+=actualTravel;
  const moving=Math.min(1,hypot2(this.velocity.x,this.velocity.y)/Math.max(stance.speed,.01));
  this.bob=stance.eyeBob*moving*Math.sin(this.traveled*11.7);
  return {eye:[this.position.x,this.position.y,this.position.z+this.bob],stance:this.stance,
   position:{...this.position},speed:hypot2(this.velocity.x,this.velocity.y),bumped:this.bumped};
 }
 snapshot(){
  return {position:{...this.position},stance:this.stance,height:+this.position.z.toFixed(3),
   speed:+hypot2(this.velocity.x,this.velocity.y).toFixed(3),bumped:this.bumped,
   steps:this.steps,cadence:+this.cadence.toFixed(1),walkMode:this.walkMode,stepDirection:this.stepDirection,
   gaitThreshold:this.gaitThreshold,physicalStanceMode:this.physicalStanceMode,
   verticalActions:this.verticalActions,verticalAcceleration:+this.verticalAcceleration.toFixed(2),
   postureGesture:this.postureGesture,postureAngle:+this.postureAngle.toFixed(1)};
 }
}

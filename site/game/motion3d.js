// PAPERWORLD orientation controller · physically correct Z-X'-Y'' device angles.
// WORLD: X forward, Y left, Z up (right-handed). All angles in radians.
// Device: x screen-right, y screen-top, z screen-out; do NOT equate raw alpha/beta/gamma with game yaw/pitch/roll.
export const RAD=Math.PI/180;
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const mul=(a,b)=>[
 a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
 a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
 a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
 a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]
];
const axis=(a,t)=>[Math.cos(t/2),a[0]*Math.sin(t/2),a[1]*Math.sin(t/2),a[2]*Math.sin(t/2)];
export const rotate=(q,v)=>{
 const [w,x,y,z]=q;
 const t=[2*(y*v[2]-z*v[1]),2*(z*v[0]-x*v[2]),2*(x*v[1]-y*v[0])];
 return [v[0]+w*t[0]+(y*t[2]-z*t[1]),v[1]+w*t[1]+(z*t[0]-x*t[2]),v[2]+w*t[2]+(x*t[1]-y*t[0])];
};
export function deviceQuaternion(alpha,beta,gamma,screenAngle=0){
 // W3C intrinsic Z-X'-Y''; compensate current UI screen rotation on device axis.
 return mul(mul(mul(axis([0,0,1],alpha*RAD),axis([1,0,0],beta*RAD)),axis([0,1,0],gamma*RAD)),axis([0,0,1],-screenAngle*RAD));
}
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function sensorAxes(alpha,beta,gamma,screenAngle=0){
 const q=deviceQuaternion(alpha,beta,gamma,screenAngle);
 return {forward:rotate(q,[0,0,-1]),right:rotate(q,[1,0,0]),up:rotate(q,[0,1,0])};
}
export const qConjugate=q=>[q[0],-q[1],-q[2],-q[3]];
export const qMultiply=mul;
export const qNormalize=q=>{
 const n=Math.hypot(...q);
 return n>1e-9?q.map(x=>x/n):null;
};
export function relativeAngles(qBase,qNow){
 const base=qNormalize(qBase),now=qNormalize(qNow);
 if(!base||!now)return null;
 let delta=mul(qConjugate(base),now);
 // Quaternion sign q and -q are the SAME pose. Make relative rotation short.
 if(delta[0]<0)delta=delta.map(v=>-v);
 // Decompose intrinsic device-local Y (heading) / X (pitch) / Z (screen roll).
 // This is crucial: the old world-gravity roll reading was 0 for many
 // upright-phone sideways tilts due to W3C Euler gimbal lock.
 const right=rotate(delta,[1,0,0]),up=rotate(delta,[0,1,0]),face=rotate(delta,[0,0,1]);
 const pitch=Math.asin(clamp(-face[1],-1,1));
 const cp=Math.cos(pitch);
 const yaw=Math.abs(cp)>.025?Math.atan2(face[0],face[2]):0;
 const roll=Math.abs(cp)>.025?Math.atan2(right[1],up[1]):2*Math.atan2(delta[3],delta[0]);
 return {yaw:wrap(yaw),pitch,roll:wrap(roll)};
}
export class MotionPose{
 constructor(){
  this.bias={yaw:0,pitch:0,roll:0};
  this.target={yaw:0,pitch:0,roll:0};
  this.pose={yaw:0,pitch:0,roll:0};
  this.latest=null;this.sensorSeen=false;this.calibrated=false;
  this.referenceQ=null;this.currentQ=null;this.lastSource='none';
  this.screenAngle=0;this.sensitivity=.78;this.smooth=.085;
  this.deadzone=.30*RAD;this.comfort=true;
  this.status='等待传感器';this.origin=null;
 }
 ingest(alpha,beta,gamma,screenAngle=0){
  if(![alpha,beta,gamma,screenAngle].every(Number.isFinite))return false;
  const q=deviceQuaternion(alpha,beta,gamma,screenAngle);
  return this._accept(q,'web',{alpha,beta,gamma,screenAngle});
 }
 ingestQuaternion(w,x,y,z){
  if(![w,x,y,z].every(Number.isFinite))return false;
  return this._accept([w,x,y,z],'native',null);
 }
 _accept(q,source,raw){
  const unit=qNormalize(q);if(!unit)return false;
  // Prefer native rotation-vector sensor over WebView's missing/inconsistent
  // deviceorientation. Web fallback remains usable in mobile browsers.
  if(source==='web'&&this.lastSource==='native')return false;
  // Native and W3C reference frames are NOT interchangeable. Zero once
  // when switching to the more reliable native Android rotation sensor.
  if(source==='native'&&this.lastSource==='web')this.calibrated=false;
  this.currentQ=unit;this.sensorSeen=true;this.lastSource=source;
  this.latest=raw||{quaternion:[...unit]};
  if(!this.calibrated)this.recenter();
  this.refreshTarget();this.status='体感已连接';return true;
 }
 recenter(){
  if(!this.currentQ)return false;
  this.referenceQ=[...this.currentQ];
  this.bias={yaw:0,pitch:0,roll:0};
  this.pose={yaw:0,pitch:0,roll:0};
  this.target={yaw:0,pitch:0,roll:0};
  this.origin=this.latest?{...this.latest}:null;
  this.calibrated=true;this.status='已校准';return true;
 }
 refreshTarget(){
  if(!this.currentQ||!this.referenceQ||!this.calibrated)return;
  const angles=relativeAngles(this.referenceQ,this.currentQ);
  if(!angles)return;
  const gain=this.sensitivity;
  const t={
   yaw:wrap(angles.yaw*gain*(this.comfort?.78:1)),
   pitch:clamp(angles.pitch*gain*(this.comfort?.72:1),-80*RAD,80*RAD),
   roll:clamp(angles.roll, -90*RAD,90*RAD)
  };
  for(const key of ['yaw','pitch','roll']){
   let next=t[key];
   const change=key==='yaw'?wrap(next-this.target[key]):next-this.target[key];
   if(Math.abs(change)<this.deadzone*.15)continue;
   this.target[key]=next;
  }
 }
 step(dt){
  dt=clamp(dt,0,.07);
  const fac=1-Math.exp(-dt/Math.max(.035,this.smooth));
  for(const key of ['yaw','pitch','roll']){
   const diff=key==='yaw'?wrap(this.target.yaw-this.pose.yaw):this.target[key]-this.pose[key];
   const limit=(key==='yaw'?(this.comfort?85:180):key==='pitch'?(this.comfort?60:120):180)*RAD*dt;
   const delta=clamp(diff*fac,-limit,limit);
   this.pose[key]=key==='yaw'?wrap(this.pose[key]+delta):this.pose[key]+delta;
  }
  return {...this.pose};
 }
 setComfort(v){this.comfort=!!v;this.refreshTarget()}
 setSensitivity(v){this.sensitivity=clamp(Number(v)||.78,.5,1.6);this.refreshTarget()}
 setResponse(v){this.smooth=clamp(Number(v)||.15,.025,.3)}
 manual(dyaw,dpitch,droll){
  // Preserve mouse/keyboard heading even without a sensor.
  this.target.yaw=wrap(this.target.yaw+dyaw);
  this.target.pitch=clamp(this.target.pitch+dpitch,-80*RAD,80*RAD);
  this.target.roll=clamp(this.target.roll+droll,-90*RAD,90*RAD);
 }
 get degrees(){return Object.fromEntries(['yaw','pitch','roll'].map(k=>[k,Math.round(this.pose[k]/RAD)]))}
}
export function cameraBasis(pose){
 const {yaw,pitch,roll}=pose,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const forward=[cp*cy,cp*sy,sp],right=[sy,-cy,0],up=[-sp*cy,-sp*sy,cp],c=Math.cos(roll),s=Math.sin(roll);
 return {forward,right:[right[0]*c+up[0]*s,right[1]*c+up[1]*s,right[2]*c+up[2]*s],
  up:[up[0]*c-right[0]*s,up[1]*c-right[1]*s,up[2]*c-right[2]*s]};
}
export function projectionMatrix(pose,aspect,eye=[0,0,2.2],fov=64,near=.09,far=130){
 const {forward,right,up}=cameraBasis(pose),tf=Math.tan(fov*RAD/2),sx=1/(tf*aspect),sy=1/tf;
 // Column-major, clip: (dot(right,d)*sx, dot(up,d)*sy, A*depth+B, depth).
 const A=(far+near)/(far-near),B=-2*far*near/(far-near);
 const row=(basis,mult)=>[...basis.map(v=>v*mult),-dot(basis,eye)*mult];
 const r0=row(right,sx),r1=row(up,sy),r2=row(forward,A),r3=row(forward,1);r2[3]+=B;
 return new Float32Array([r0[0],r1[0],r2[0],r3[0],r0[1],r1[1],r2[1],r3[1],
  r0[2],r1[2],r2[2],r3[2],r0[3],r1[3],r2[3],r3[3]]);
}

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
export class MotionPose{
 constructor(){
  this.bias={yaw:0,pitch:0,roll:0};this.target={yaw:0,pitch:0,roll:0};
  this.pose={yaw:0,pitch:0,roll:0};
  this.latest=null;this.sensorSeen=false;this.calibrated=false;
  this.screenAngle=0;this.sensitivity=1;this.smooth=0.105;this.deadzone=.20*RAD;
  this.status='等待传感器';this.origin=null;
 }
 ingest(alpha,beta,gamma,screenAngle=0){
  if(![alpha,beta,gamma].every(Number.isFinite))return false;
  const basis=sensorAxes(alpha,beta,gamma,screenAngle);
  // Heading from horizontal projection of device's view axis; at zenith retain previous heading.
  const f=basis.forward,ground=Math.hypot(f[0],f[1]);
  const heading=ground>0.03?Math.atan2(f[1],f[0]):(this.latest?.yaw??0);
  const pitch=Math.atan2(f[2],ground);
  // Tilt of screen's RIGHT edge relative to gravity. Has full +/-90° range.
  const roll=Math.atan2(basis.right[2],basis.up[2]);
  this.latest={yaw:heading,pitch,roll,alpha,beta,gamma,screenAngle};
  this.sensorSeen=true;this.status='体感已连接';
  if(!this.calibrated)this.recenter();
  this.refreshTarget();return true;
 }
 recenter(){
  if(!this.latest)return false;
  this.bias={yaw:this.latest.yaw,pitch:this.latest.pitch,roll:this.latest.roll};
  this.origin={...this.latest};
  this.pose={yaw:0,pitch:0,roll:0};this.target={yaw:0,pitch:0,roll:0};
  this.calibrated=true;this.status='已校准';return true;
 }
 refreshTarget(){
  if(!this.latest||!this.calibrated)return;
  const t={
   yaw:wrap(this.latest.yaw-this.bias.yaw)*this.sensitivity,
   pitch:clamp(wrap(this.latest.pitch-this.bias.pitch)*this.sensitivity,-85*RAD,85*RAD),
   roll:clamp(wrap(this.latest.roll-this.bias.roll)*this.sensitivity,-95*RAD,95*RAD)
  };
  for(const name of ['yaw','pitch','roll']){
   if(Math.abs(name==='yaw'?wrap(t[name]-this.target[name]):t[name]-this.target[name])<this.deadzone*.32)continue;
   this.target[name]=t[name];
  }
 }
 step(dt){
  dt=clamp(dt,0,.07);
  const factor=1-Math.exp(-dt/Math.max(.018,this.smooth));
  for(const name of ['yaw','pitch','roll']){
   let diff=name==='yaw'?wrap(this.target.yaw-this.pose.yaw):this.target[name]-this.pose[name];
   if(Math.abs(diff)<this.deadzone&&Math.abs(diff)<.0008)diff=0;
   this.pose[name]=name==='yaw'?wrap(this.pose.yaw+diff*factor):this.pose[name]+diff*factor;
  }
  return {...this.pose};
 }
 setSensitivity(n){this.sensitivity=clamp(Number(n)||1,.5,1.6);this.refreshTarget()}
 setResponse(v){this.smooth=clamp(Number(v)||.105,.025,.25)}
 manual(dyaw,dpitch,droll){
  // Browser fallback, kept separate from sensors; manual controls are never hidden.
  this.target.yaw=wrap(this.target.yaw+dyaw);
  this.target.pitch=clamp(this.target.pitch+dpitch,-85*RAD,85*RAD);
  this.target.roll=clamp(this.target.roll+droll,-95*RAD,95*RAD);
 }
 get degrees(){return Object.fromEntries(['yaw','pitch','roll'].map(k=>[k,Math.round(this.pose[k]/RAD)]))}
}
export function cameraBasis(pose){
 const {yaw,pitch,roll}=pose,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const forward=[cp*cy,cp*sy,sp],right=[sy,-cy,0],up=[-sp*cy,-sp*sy,cp],c=Math.cos(roll),s=Math.sin(roll);
 return {forward,right:[right[0]*c+up[0]*s,right[1]*c+up[1]*s,right[2]*c+up[2]*s],
  up:[up[0]*c-right[0]*s,up[1]*c-right[1]*s,up[2]*c-right[2]*s]};
}
export function projectionMatrix(pose,aspect,eye=[0,0,2.2],fov=72,near=.09,far=130){
 const {forward,right,up}=cameraBasis(pose),tf=Math.tan(fov*RAD/2),sx=1/(tf*aspect),sy=1/tf;
 // Column-major, clip: (dot(right,d)*sx, dot(up,d)*sy, A*depth+B, depth).
 const A=(far+near)/(far-near),B=-2*far*near/(far-near);
 const row=(basis,mult)=>[...basis.map(v=>v*mult),-dot(basis,eye)*mult];
 const r0=row(right,sx),r1=row(up,sy),r2=row(forward,A),r3=row(forward,1);r2[3]+=B;
 return new Float32Array([r0[0],r1[0],r2[0],r3[0],r0[1],r1[1],r2[1],r3[1],
  r0[2],r1[2],r2[2],r3[2],r0[3],r1[3],r2[3],r3[3]]);
}

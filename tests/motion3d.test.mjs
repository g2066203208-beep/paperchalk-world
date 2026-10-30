import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionPose,sensorAxes,cameraBasis,projectionMatrix,RAD,wrap,deviceQuaternion,relativeAngles,qMultiply} from '../site/game/motion3d.js';
const deg=n=>n/RAD;
const close=(a,b,eps=.12)=>assert.ok(Math.abs(a-b)<eps,'expected '+a+' ~= '+b);
test('X forward Y left Z up: orthogonal camera axes',()=>{
 const b=cameraBasis({yaw:0,pitch:0,roll:0});
 assert.deepEqual(b.forward,[1,0,0]);assert.deepEqual(b.right,[0,-1,0]);assert.deepEqual(b.up.map(v=>v===0?0:v),[0,0,1]);
 const y=cameraBasis({yaw:Math.PI/2,pitch:0,roll:0});close(y.forward[0],0);close(y.forward[1],1);
 const p=cameraBasis({yaw:0,pitch:Math.PI/4,roll:0});close(p.forward[2],Math.SQRT1_2);
 const roll=cameraBasis({yaw:0,pitch:0,roll:Math.PI/2});close(roll.right[2],1);
});
test('Z-axis heading, pitch, recenter and smooth yaw wrap',()=>{
 const m=new MotionPose();
 assert.equal(m.ingest(null,null,null),false);
 m.setComfort(false);m.setSensitivity(1);
 m.ingest(0,90,0);close(deg(m.target.yaw),0);
 m.ingest(47,90,0);close(deg(m.target.yaw),47);
 for(let i=0;i<60;i++)m.step(1/60);
 assert.ok(deg(m.pose.yaw)>46&&deg(m.pose.yaw)<48);
 m.recenter();close(deg(m.pose.yaw),0);
 m.ingest(47,65,0);close(deg(m.target.pitch),-25);
 close(deg(wrap(179*RAD-(-179*RAD))),-2);
});
test('90 degree side lie, sensor compensation, smoothing limits',()=>{
 const m=new MotionPose();m.manual(0,0,90*RAD);
 for(let i=0;i<40;i++)m.step(1/60);
 assert.ok(deg(m.pose.roll)>85);
 assert.ok(cameraBasis(m.pose).right[2]>.99);
 m.setSensitivity(2);assert.equal(m.sensitivity,1.6);
 m.setResponse(.001);assert.equal(m.smooth,.025);
 assert.ok(deviceQuaternion(0,90,0,90).every(Number.isFinite));
 assert.ok(sensorAxes(20,70,30,90).forward.every(Number.isFinite));
});
test('real sensor poses: sideways handset maps to 90-degree body roll, not yaw',()=>{
 const m=new MotionPose();
 m.setComfort(false);m.setSensitivity(1);
 m.ingest(0,90,0); // upright phone, screen top points upward
 m.ingest(-90,0,90); // same gaze with phone laid on its side
 close(deg(m.target.yaw),0);
 close(deg(m.target.pitch),0);
 close(deg(m.target.roll),-90);
 for(let i=0;i<70;i++)m.step(1/60);
 assert.ok(deg(m.pose.roll)<-89);
});
test('relative quaternion detects real left/right tilt when old gravity Euler output was zero',()=>{
 const base=deviceQuaternion(0,90,0);
 const roll=theta=>[Math.cos(theta/2),0,0,Math.sin(theta/2)];
 const qMul=qMultiply;
 const left=qMul(base,roll(45*RAD)),right=qMul(base,roll(-35*RAD));
 const l=relativeAngles(base,left),r=relativeAngles(base,right);
 close(deg(l.roll),45);close(deg(r.roll),-35);
 close(deg(l.yaw),0);close(deg(l.pitch),0);
 assert.ok(Math.abs(l.roll)>0.7);
});
test('native quaternion source takes priority and recenters reference without camera snap',()=>{
 const m=new MotionPose();
 m.ingest(0,90,0);
 m.ingest(30,90,0);
 assert.ok(m.target.yaw>0);
 const base=deviceQuaternion(0,90,0);
 assert.equal(m.ingestQuaternion(...base),true);
 close(m.target.yaw,0,.001);
 assert.equal(m.lastSource,'native');
 const q=qMultiply(base,[Math.cos(25*RAD/2),0,0,Math.sin(25*RAD/2)]);
 m.ingestQuaternion(...q);
 assert.ok(m.target.roll>20*RAD);
 assert.equal(m.ingest(60,90,0),false,'native device stream wins');
 assert.ok(m.target.roll>20*RAD);
});
test('matrix is true perspective depth projection',()=>{
 const p=projectionMatrix({yaw:0,pitch:0,roll:0},1,[0,0,2.2]);
 assert.equal(p.length,16);assert.ok(p.every(Number.isFinite));
 const clip=(m,v)=>[0,1,2,3].map(i=>m[i]*v[0]+m[i+4]*v[1]+m[i+8]*v[2]+m[i+12]);
 const center=clip(p,[10,0,2.2]);
 close(center[0],0);close(center[1],0);assert.ok(center[3]>0);
 const pitched=clip(projectionMatrix({yaw:0,pitch:Math.PI/4,roll:0},1,[0,0,2.2]),[10,0,2.2]);
 assert.ok(pitched[1]<0);
});


test('disabling gyro discards calibration and preserves the manual heading',()=>{
 const m=new MotionPose();m.ingest(0,90,0);m.ingest(45,90,0);
 for(let i=0;i<25;i++)m.step(1/60);
 const heading=m.pose.yaw;assert.ok(heading>0&&m.sensorSeen);
 m.disconnectSensor();
 assert.equal(m.sensorSeen,false);
 assert.equal(m.calibrated,false);
 assert.equal(m.lastSource,'none');
 close(m.pose.yaw,heading,1e-8);close(m.target.yaw,heading,1e-8);
 assert.equal(m.pose.roll,0);assert.equal(m.target.roll,0);
 m.manual(-.2,0,0);assert.ok(m.target.yaw<heading);
 m.ingest(25,90,0);assert.equal(m.calibrated,true);
 close(m.target.yaw,0,1e-8);
});
test('camera right turn is negative yaw in X-forward Y-left world',()=>{
 const m=new MotionPose();m.manual(-100*.0033,0,0);
 for(let i=0;i<20;i++)m.step(1/60);
 assert.ok(m.pose.yaw<0);
 assert.ok(cameraBasis(m.pose).forward[1]<0,'right turn faces world -Y');
});

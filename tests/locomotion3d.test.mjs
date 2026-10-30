import test from 'node:test';
import assert from 'node:assert/strict';
import {BodyMotor,STANCES,MOTION_CONFIG,blocked} from '../site/game/locomotion3d.js';
const near=(a,b,e=.13)=>assert.ok(Math.abs(a-b)<=e,'expected '+a+' near '+b);
test('standing, crouching, prone change real eye-height smoothly, never teleport',()=>{
 const m=new BodyMotor();
 const a=m.update(1/60,{},0,0);
 near(a.eye[2],1.68,.02);
 m.setStance('crouch');
 const b=m.update(1/60,{},0,17);
 assert.ok(b.eye[2]<1.68&&b.eye[2]>1.06);
 for(let i=0;i<110;i++)m.update(1/60,{},0,20+i*17);
 near(m.position.z,STANCES.crouch.height,.01);
 m.setStance('prone');
 for(let i=0;i<110;i++)m.update(1/60,{},0,3000+i*17);
 near(m.position.z,STANCES.prone.height,.01);
 m.setStance('stand');
 for(let i=0;i<110;i++)m.update(1/60,{},0,6000+i*17);
 near(m.position.z,1.68,.01);
});
test('WASD forward X, lateral Y, diagonal normalization and stance movement speeds',()=>{
 const m=new BodyMotor();for(let i=0;i<180;i++)m.update(1/60,{forward:1},0,i*17);
 assert.ok(m.position.x>7&&Math.abs(m.position.y)<.001);
 const x=m.position.x;
 for(let i=0;i<60;i++)m.update(1/60,{side:1},0,3000+i*17);
 assert.ok(m.position.y>2,'positive side is world Y left at yaw=0');
 m.setStance('prone');
 const previous=m.position.x;
 for(let i=0;i<120;i++)m.update(1/60,{forward:1},0,4000+i*17);
 assert.ok(m.position.x-previous<1.5,'prone crawling slower than walking');
 assert.ok(x>6);
});
test('true circular wall collision and axis-separated sliding',()=>{
 const walls=[{x:3,y:0,w:2,d:2}];
 assert.equal(blocked(3,0,.32,walls),true);
 assert.equal(blocked(0,0,.32,walls),false);
 const m=new BodyMotor(walls);
 for(let i=0;i<250;i++)m.update(1/60,{forward:1},0,i*17);
 assert.ok(m.position.x<1.7,'cannot walk through solid house wall');
 const beforeY=m.position.y;
 for(let i=0;i<140;i++)m.update(1/60,{forward:1,side:1},0,5000+i*17);
 assert.ok(m.position.y>beforeY+1,'can slide sideways along a blocking wall');
 assert.ok(m.position.x<88);
});
test('stand/crouch/prone tilt gesture requires a deliberate hold and uses hysteresis',()=>{
 const m=new BodyMotor();
 assert.equal(m.updatePosture(100*Math.PI/180),'stand','tilt without hold has no effect');
 assert.ok(m.startPosture(0));
 m.updatePosture(30*Math.PI/180);assert.equal(m.stance,'crouch');
 m.updatePosture(26*Math.PI/180);assert.equal(m.stance,'crouch','near-threshold jitter does not flicker');
 m.updatePosture(64*Math.PI/180);assert.equal(m.stance,'prone');
 m.updatePosture(57*Math.PI/180);assert.equal(m.stance,'prone','prone exit has lower hysteresis');
 m.updatePosture(52*Math.PI/180);assert.equal(m.stance,'crouch');
 m.updatePosture(18*Math.PI/180);assert.equal(m.stance,'stand');
 m.stopPosture();assert.equal(m.updatePosture(80*Math.PI/180),'stand');
});
test('acceleration peak gait: idle noise cannot walk, repeated real steps move, timeout stops',()=>{
 const m=new BodyMotor();m.setWalkMode(true);
 for(let n=0;n<120;n++)m.ingestAcceleration(.1,.2,.12,n*16);
 assert.equal(m.steps,0);
 assert.equal(m.movementFromSteps(2000),0);
 for(const t of [2500,3000,3500,4000]){
  m.ingestAcceleration(.1,.1,.1,t-45); // re-arm
  assert.equal(m.ingestAcceleration(2.0,.2,.6,t),true);
  m.update(1/60,{},0,t);
 }
 assert.equal(m.steps,4);
 assert.ok(m.movementFromSteps(4100)>.1);
 for(let i=0;i<50;i++)m.update(1/60,{},0,4200+i*17);
 assert.equal(m.movementFromSteps(5000),0,'must not auto-walk indefinitely');
 m.setWalkMode(false);assert.equal(m.movementFromSteps(4500),0);
});

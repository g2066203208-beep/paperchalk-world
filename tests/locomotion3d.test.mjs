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

test('sensitive forward AND reverse walking steps never override explicit joystick direction',()=>{
 const m=new BodyMotor();
 m.setWalkMode(true);m.setGaitThreshold(.60);
 m.ingestAcceleration(.05,.07,.04,500);
 assert.equal(m.ingestAcceleration(1.25,0,0,600),true);
 assert.ok(m.movementFromSteps(610)>0,'physical step immediately moves forward');
 const first=m.update(.050,{},0,610).position.x;
 assert.ok(first>0);
 m.setWalkDirection(-1);
 m.ingestAcceleration(.05,.06,.02,930);
 assert.equal(m.ingestAcceleration(1.3,0,0,1100),true);
 assert.ok(m.movementFromSteps(1110)<0,'physical step can move backward');
 const before=m.position.x;
 for(let i=0;i<10;i++)m.update(.05,{},0,1110+i*20);
 assert.ok(m.position.x<before,'reverse step moves real world X backwards');
 const override=m.position.x;
 for(let i=0;i<18;i++)m.update(.05,{forward:1},0,1320+i*20);
 assert.ok(m.position.x>override,'forward joystick must override reverse gait mode');
 assert.equal(m.movementFromSteps(2200),0,'gait stops on timeout');
 m.setWalkMode(false);
 assert.equal(m.movementFromSteps(1450),0);
});
test('physical down-up squat and up-down stand gestures, no false positives while idle',()=>{
 const m=new BodyMotor();
 m.setPhysicalStanceMode(true);
 for(let t=0;t<2000;t+=25){
  const v=Math.sin(t/60)*.22;
  assert.equal(m.ingestVerticalAcceleration(v,t),null);
 }
 assert.equal(m.stance,'stand');
 assert.equal(m.ingestVerticalAcceleration(-2.5,2100),null);
 assert.equal(m.ingestVerticalAcceleration(1.7,2380),'crouch');
 assert.equal(m.stance,'crouch');
 // Wrong-direction pulses and cooldown cannot immediately stand the player.
 assert.equal(m.ingestVerticalAcceleration(-2.2,2480),null);
 assert.equal(m.ingestVerticalAcceleration(2.1,2650),null);
 assert.equal(m.stance,'crouch');
 assert.equal(m.ingestVerticalAcceleration(2.4,3500),null);
 assert.equal(m.ingestVerticalAcceleration(-1.6,3820),'stand');
 assert.equal(m.stance,'stand');
 assert.equal(m.verticalActions,2);
 m.setPhysicalStanceMode(false);
 m.ingestVerticalAcceleration(-3,5100);m.ingestVerticalAcceleration(3,5500);
 assert.equal(m.stance,'stand','unrequested sensor motions do not adjust body');
});
test('step gait and squat classifier do not fight each other',()=>{
 const m=new BodyMotor();
 m.setWalkMode(true);m.setPhysicalStanceMode(true);
 m.ingestVerticalAcceleration(-3,1000);
 m.ingestVerticalAcceleration(2.3,1200);
 assert.equal(m.stance,'stand','no auto-squat during walking');
 m.setWalkMode(false);
 m.ingestVerticalAcceleration(-3,1900);
 m.ingestVerticalAcceleration(2.3,2110);
 assert.equal(m.stance,'crouch');
});

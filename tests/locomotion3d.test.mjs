import test from 'node:test';
import assert from 'node:assert/strict';
import {BodyMotor,STANCES,blocked} from '../site/game/locomotion3d.js';
const near=(v,target,eps=.08)=>assert.ok(Math.abs(v-target)<eps,'expected '+v+' near '+target);
test('standing, crouching and prone are explicit inputs with smooth eye height',()=>{
 const b=new BodyMotor();near(b.position.z,1.68);
 b.setStance('crouch');b.update(1/60,{},0);
 assert.ok(b.position.z<1.68&&b.position.z>1.06);
 for(let i=0;i<100;i++)b.update(1/60,{},0);near(b.position.z,STANCES.crouch.height);
 b.setStance('prone');for(let i=0;i<100;i++)b.update(1/60,{},0);near(b.position.z,STANCES.prone.height);
 b.setStance('stand');for(let i=0;i<100;i++)b.update(1/60,{},0);near(b.position.z,STANCES.stand.height);
 assert.equal(b.setStance('invalid'),false);
});
test('continuous forward and backward control changes actual position every frame',()=>{
 const b=new BodyMotor();for(let i=0;i<90;i++)b.update(1/60,{forward:1},0);
 const x=b.position.x;assert.ok(x>3.8);
 for(let i=0;i<95;i++)b.update(1/60,{forward:-1},0);
 assert.ok(b.position.x<x-3.5);
 const y=b.position.x;for(let i=0;i<30;i++)b.update(1/60,{forward:0},0);
 assert.ok(Math.abs(b.position.x-y)<.15,'released control stops rapidly');
 near(b.velocity.x,0,.015);
});
test('smooth walk across 30/60/90/120Hz and irregular frame delivery',()=>{
 function traveled(pattern){
  const b=new BodyMotor();let t=0,i=0;
  while(t<3-.000001){const dt=Math.min(pattern[i++%pattern.length],3-t);b.update(dt,{forward:1},0);t+=dt}
  return b.position.x;
 }
 const reference=traveled([1/60]);
 for(const p of [[1/30],[1/90],[1/120],[.008,.019,.031,.013,.026]])
  assert.ok(Math.abs(traveled(p)-reference)<.12,'distance must be frame-rate independent');
});
test('real walls block movement, sliding sideways still possible',()=>{
 const wall=[{x:3,y:0,w:2,d:2}],b=new BodyMotor(wall);
 assert.equal(blocked(3,0,.32,wall),true);
 for(let i=0;i<220;i++)b.update(1/60,{forward:1},0);
 assert.ok(b.position.x<1.72);
 for(let i=0;i<120;i++)b.update(1/60,{forward:1,side:1},0);
 assert.ok(b.position.y>1);
});
test('inaccurate acceleration walking / squat and tilt-to-stance removed',()=>{
 const b=new BodyMotor();
 for(const old of ['ingestAcceleration','ingestVerticalAcceleration','startPosture','setWalkMode'])
  assert.equal(typeof b[old],'undefined');
 assert.equal(b.snapshot().stance,'stand');
});

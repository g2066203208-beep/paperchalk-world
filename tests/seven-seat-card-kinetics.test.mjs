import assert from 'node:assert/strict';
import {
 TABLE_CARD_TIMING,sampleTableCard,tableFlightPoint,springTo
} from '../site/card-battle/motion/seven-seat-card-kinetics.mjs';
assert(TABLE_CARD_TIMING.deploy<=700,'deploy cannot resemble 3.8s prize reveal');
assert(TABLE_CARD_TIMING.action<500,'action play must feel immediate');
assert(TABLE_CARD_TIMING.draw<=500,'manual draw must be brisk');
for(const kind of Object.keys(TABLE_CARD_TIMING)){
 const total=TABLE_CARD_TIMING[kind];
 const a=sampleTableCard(0,kind),b=sampleTableCard(total,kind);
 assert.equal(a.t,0);assert.equal(b.t,1);
 assert.equal(b.complete,true);
 assert.equal(b.travel,1);
 assert(Math.abs(b.roll)<.01,'no endless spinning at card rest');
 assert.equal(b.elevation,0,'card must land at zero lift without indefinite hovering');
 for(let frame=0;frame<=total;frame+=8){
  const q=sampleTableCard(frame,kind);
  const point=tableFlightPoint({x:20,y:750},{x:500,y:250},q);
  assert([q.yaw,q.roll,q.pitch,q.scale,point.x,point.y].every(Number.isFinite));
  assert(q.scale>.93&&q.scale<1.14,'card should stay thin rigid paper, never giant elastic blob');
 }
}
const deployStart=sampleTableCard(0,'deploy');
const deployMid=sampleTableCard(330,'deploy');
const deployEnd=sampleTableCard(660,'deploy');
assert(Math.abs(deployStart.yaw-Math.PI)<.001);
assert(deployMid.yaw>0&&deployMid.yaw<Math.PI);
assert.equal(deployEnd.yaw,0,'portrait faces camera on landing');
assert.equal(sampleTableCard(0,'action').yaw,0,'attack cards fly face up, no fake prize turn');
assert(sampleTableCard(180,'draw').yaw>2,'a drawn card stays face down at first');
assert.equal(sampleTableCard(475,'draw').yaw,0,'quick draw flips to ink side near landing');
assert.equal(sampleTableCard(610,'deploy').arrived,true,
 'landing beat must exist BEFORE final cleanup, not randomly depend on collision');
const stationary=springTo(1,0,1,.016);
assert(Math.abs(stationary.position-1)<1e-9);
let x=0,v=0;for(let i=0;i<180;i++){const s=springTo(x,v,1,1/120);x=s.position;v=s.velocity;}
assert(Math.abs(x-1)<.005,'semi-implicit spring converges without a long sloppy wobble');
console.log('PASS Black Jacket-inspired deterministic 420-660ms lift/flip/slide with guaranteed weighted impact and spring convergence');

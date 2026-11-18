/* Standalone 3D whitebox payout physics assertions, Node only. */
'use strict';
const assert=require('node:assert/strict');
const {Simulation,WORLD,STEP,math}=require('../site/card-battle/motion/slot-3d-physics.js');
assert.equal(STEP,1/120);
assert(WORLD.thickness>0,'coin must have physical thickness');
assert(WORLD.ceiling>WORLD.chute[2]);
for(const n of [12,48,76]){
 const s=new Simulation({count:n,seed:20261118,initialPile:18});s.start();
 s.advance(.5);
 assert(s.emitted>=Math.min(n,9),'coins must be high rate emitted');
 assert(s.peakSpeed>17,'coin should blast at high speed, not drip slowly');
 assert(s.coins.slice(18).some(c=>Math.abs(c.vel[1])>1),'must have Y-depth velocity');
 assert(s.coins.slice(18).some(c=>c.p[2]>1.8),'must have positive Z ballistic motion');
 assert(s.coins.slice(18).some(c=>Math.abs(c.q[0])+Math.abs(c.q[1])>.3),'must have real X/Y axis flip quaternion');
 s.advance(2.6);
 assert.equal(s.emitted,n,'all requested coins emitted');
 assert.equal(s.coins.length,18+n);
 assert(s.coinContacts>n/2,'coins must contact other coins in three dimensions');
 assert(s.planeContacts>10,'coins must contact desk and boundaries');
 s.advance(4.1);
 assert(s.coins.some(c=>c.p[2]>WORLD.thickness*2.3),'Z axis pile needs several levels');
 for(const c of s.coins){
  assert(c.p.every(Number.isFinite),'all physical coords finite');
  assert(c.q.every(Number.isFinite),'all orientation quaternion coords finite');
  assert(c.p[0]>=WORLD.left-.40&&c.p[0]<=WORLD.right+.40,'coins must stay in X physical enclosure');
  assert(c.p[1]>=WORLD.near-.40&&c.p[1]<=WORLD.far+.40,'coins must stay in Y depth enclosure');
  assert(c.p[2]>=-.2&&c.p[2]<=WORLD.ceiling+.4,'coins must remain in Z enclosure');
 }
 console.log('3D payout',n,{speed:s.peakSpeed.toFixed(2),height:s.peakHeight.toFixed(2),
  coins:s.coins.length,contacts:s.coinContacts,settled:s.coins.filter(c=>c.sleep).length});
}
const a=new Simulation({count:48,seed:121212,initialPile:18});a.seek(1380);
const b=new Simulation({count:48,seed:121212,initialPile:18});b.seek(1380);
assert.deepEqual(a.snapshot(),b.snapshot(),'same seed and fixed timestep must match same frame');
const c=new Simulation({count:12,initialPile:18});c.start();c.advance(6);
const before=c.coins.length;c.start(12);c.advance(5);
assert.equal(c.coins.length,before+12,'subsequent payout joins persistent pile without erasing it');
assert(c.coins.some(coin=>coin.old),'initial saved currency remains physical');
const first=c.coins.find(coin=>coin.old);
assert(first.p.length===3&&first.w.length===3,'all existing coins remain 3D rigid bodies');
const d=new Simulation({count:12,seed:3434});d.start();d.advance(.3);
const beforeQ=d.coins[18].q.slice();d.advance(.2);
assert.notDeepEqual(d.coins[18].q,beforeQ,'coin orientation is genuinely dynamic');
console.log('PASS 3D whitebox: real XYZ velocities, angular velocities, collisions, persistence, stacking, reproducible seek');
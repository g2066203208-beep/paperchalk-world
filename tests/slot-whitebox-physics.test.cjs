/* npm independent deterministic physics QA; no screenshots, no fake counters. */
'use strict';
const assert=require('node:assert/strict');
const {Payout,WORLD,STEP}=require('../site/card-battle/motion/slot-whitebox-physics.js');
assert.equal(STEP,1/120);
for(const amount of [12,48,76]){
 const a=new Payout({count:amount,seed:20261118}).launch();
 const b=new Payout({count:amount,seed:20261118}).launch();
 for(let tick=0;tick<1200;tick++){a.step();b.step();}
 assert.deepEqual(a.snapshot(),b.snapshot(),'fixed seed/120Hz must be bit reproducible');
 assert.equal(a.emitted,amount,'every coin must leave the physical mouth');
 assert.equal(a.coins.length,amount);
 assert(a.coinImpacts>amount*.9,'require dynamic coin-vs-coin collision, not independent particle bounce');
 assert(a.wallImpacts>=amount*.25,'require collisions with catch tray / walls');
 assert(a.coins.filter(c=>c.sleeping).length>=amount*.9,'coin pile must settle');
 assert(a.maxOverlap()<1.0,'no significant coin interpenetration after the pile settles');
 for(const c of a.coins){
  assert(Number.isFinite(c.x)&&Number.isFinite(c.y));
  assert(c.x-c.r>=WORLD.left-.06 && c.x+c.r<=WORLD.right+.06,'coin escapes side wall');
  assert(c.y+c.r<=WORLD.floor+.06,'coin passes through tray');
 }
 // A fixed timestamp should be reproducible regardless of prior playback.
 const q=new Payout({count:amount,seed:777}).launch().advance(2.5).snapshot();
 const r=new Payout({count:amount,seed:777}).seek(2500).snapshot();
 assert.deepEqual(q,r,'seek(ms) must fully rebuild the same physics frame');
 console.log(`PASS whitebox ${amount}: coin impacts ${a.coinImpacts}, tray/wall ${a.wallImpacts}, sleeping ${a.coins.filter(c=>c.sleeping).length}, overlap ${a.maxOverlap().toFixed(2)}`);
}
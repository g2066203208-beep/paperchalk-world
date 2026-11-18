/* Reference-framed physical whitebox: real LEFT pile and persistent contacts. */
'use strict';
const assert=require('node:assert/strict');
const {Payout,WORLD,STEP}=require('../site/card-battle/motion/slot-whitebox-physics.js');
assert.equal(STEP,1/120);
assert(WORLD.chuteX<WORLD.machineX,'hopper must be in left flank of real machine');
assert(WORLD.right<WORLD.machineX,'coin pile must stay LEFT of machine');
assert(WORLD.right-WORLD.left<240,'no invented full screen U-shaped tray');
for(const amount of [12,48,76]){
 const a=new Payout({count:amount,seed:20261118,initialPile:18}).launch();
 const b=new Payout({count:amount,seed:20261118,initialPile:18}).launch();
 for(let tick=0;tick<1200;tick++){a.step();b.step();}
 assert.deepEqual(a.snapshot(),b.snapshot(),'same seed must exactly replay deterministic 120Hz physics');
 const end=a.snapshot();
 assert.equal(end.emitted,amount,'every newly paid coin must leave a side chute one-by-one');
 assert.equal(a.coins.length,amount+18,'initial physical pile persists while new coins arrive');
 assert(a.coinImpacts>amount,'new coins must contact each other and the pre-existing pile');
 assert(a.wallImpacts>0,'floor and side boundaries physically collide with coins');
 assert.equal(end.sleeping,end.alive,'every coin must eventually be able to settle');
 assert(end.maxOverlap<.2,'pile should not visibly interpenetrate at rest');
 assert.equal(end.phase,'settled');
 for(const c of a.coins){
  assert(Number.isFinite(c.x)&&Number.isFinite(c.y));
  assert(c.x-c.r>=WORLD.left-.08&&c.x+c.r<=WORLD.right+.08,'escaped left region');
  assert(c.y+c.r<=WORLD.floor+.08,'fell through tabletop');
 }
 const q=new Payout({count:amount,seed:777,initialPile:18}).launch().advance(2.5).snapshot();
 const r=new Payout({count:amount,seed:777,initialPile:18}).seek(2500).snapshot();
 assert.deepEqual(q,r,'exact frame seek must recreate the physical motion');
 console.log(`PASS left-pile ${amount}: ${end.coinImpacts} mutual hits; ${end.sleeping}/${end.alive} sleeping; overlap ${end.maxOverlap}`);
}
// First payout finishes, then a second burst must strike the SAME pile.
const continuous=new Payout({count:12,seed:321,initialPile:18}).launch().advance(10);
const before=continuous.coins.length;
continuous.append(12).advance(10);
assert.equal(continuous.coins.length,before+12,'next spin must NOT clear pre-existing pile');
assert.equal(continuous.snapshot().sleeping,continuous.coins.length);
assert(continuous.coinImpacts>40,'second burst must have real collisions');
console.log('PASS persistent pile across consecutive spins');
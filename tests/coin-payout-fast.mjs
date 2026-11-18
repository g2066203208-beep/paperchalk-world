/** Regression tests for the browser's default O(N-near) fast gold-pile physics. */
import assert from 'node:assert/strict';
import {FastCoinPayout,FAST_DT} from '../site/card-battle/motion/coin-payout-fast.mjs';
import {COIN,BASIN,CAPS} from '../site/card-battle/motion/coin-payout-rigid.mjs';
assert.equal(FAST_DT,1/60);
assert(COIN.height/(COIN.radius*2)>.085&&COIN.height/(COIN.radius*2)<.125,
  'the coins should visibly show a rim, not be 3%-thick paper');
const outputs=[];
for(const count of [120,240,420]){
 const a=new FastCoinPayout({seed:20261118});
 assert.equal(a.fire(count),count);
 const t=performance.now();
 a.advanceFrames(count===120?280:count===240?500:490);
 const elapsed=performance.now()-t;
 const s=a.getSnapshot();
 assert.equal(s.count,count,'all coins emitted, not an abbreviated visual batch');
 assert.equal(s.escapedEver,0,'rigid bowl walls must contain all coins');
 assert.equal(s.inBasin,count);
 assert(s.contacts>count,'coin-to-coin spatial contacts must be calculated');
 assert(s.groundContacts>0,'heavy coins must collide with the base of the bowl');
 assert(s.asleep>0,'real friction and damping should let coins settle');
 assert(s.peakHeight>1.0,'the chute remains visibly above the real basin floor');
 assert(a.coins.every(b=>Number.isFinite(b.position.x)&&Number.isFinite(b.position.y)&&Number.isFinite(b.position.z)));
 assert(a.coins.every(b=>b.position.y>=COIN.height/2-1e-5),'coins cannot fall through solid floor');
 assert(a.coins.some(b=>Math.abs(b.quaternion.x)>.01||Math.abs(b.quaternion.z)>.01),
   '3D angular orientation must be simulated, not a flat sprite particle');
 // Conservative bound: avoid regression to multi-second SAT bottlenecks.
 assert(elapsed<8000,`fast ${count}-coin physics took ${Math.round(elapsed)}ms`);
 outputs.push({coins:count,steps:s.tick,wallMs:Math.round(elapsed),contacts:s.contacts,
   escaped:s.escapedEver,asleep:s.asleep,peakY:s.peakHeight});
 a.destroy();
}
const b=new FastCoinPayout({seed:13});
b.fire(120);b.advanceFrames(280);const before=b.coins.length;
assert.equal(before,120);
assert.equal(b.fire(420),CAPS.max-before);
b.advanceFrames(520);
const s=b.getSnapshot();
assert.equal(s.count,CAPS.max,'second burst uses same persistent gold pile');
assert.equal(s.escapedEver,0);
assert.equal(s.inBasin,CAPS.max);
assert.equal(b.coins[0].userData.id,0,'first jackpot persists after adding coins');
outputs.push({persisted:true,coins:s.count,contacts:s.contacts});
console.log('PASS fast 3D coin-disc collision + gravity + stacking',JSON.stringify(outputs));
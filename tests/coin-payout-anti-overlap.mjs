/** Regression: the visible ten-sided disks may NEVER occupy the same 3D region. */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {FastCoinPayout} from '../site/card-battle/motion/coin-payout-fast.mjs';
import {COIN,BASIN,CAPS} from '../site/card-battle/motion/coin-payout-shared.mjs';

const results=[];
for(const [count,frames] of [[120,310],[240,470],[420,720],[500,940]]){
 const sim=new FastCoinPayout({seed:20261118});
 sim.fire(count);
 const t0=performance.now();
 let checked=0;
 for(let f=0;f<frames;f++){
  sim.step();
  if(f%15===0||f===frames-1){
   const snap=sim.getSnapshot();
   assert.equal(snap.overlappingCoins,0,`${count} coins: frame ${f} contains ${snap.overlappingCoins} overlapping pairs (max ${snap.maxOverlap})`);
   assert.equal(snap.escapedEver,0,`${count} coins: frame ${f} escapes the 3D catch basin`);
   assert(snap.halfHeightAware, 'collision volumes must account for each face tilt');
   checked++;
  }
 }
 const s=sim.getSnapshot(),elapsed=performance.now()-t0;
 assert.equal(s.count,count);
 assert.equal(s.overlappingCoins,0);
 assert.equal(s.inBasin,count);
 assert(s.contacts>count,'coins really collide, not a particle-only visual');
 assert(s.asleep>10,'piled coins must eventually rest');
 assert(elapsed<9500,`regression: ${count} coins took ${elapsed.toFixed(0)} ms for ${frames} steps`);
 results.push({count,frames,checked,ms:Math.round(elapsed),contacts:s.contacts,asleep:s.asleep,pilePeak:s.pileY[1],overlapPairs:s.overlappingCoins});
}
// Deliberately start coins inside each other and below each other's side: the
// final support projection MUST untangle even pairs that would go to sleep.
const packed=new FastCoinPayout({seed:5});
for(let i=0;i<6;i++){
 const body=packed.addCoin([-2.2+i*.008,COIN.height*.5,.02],[0,0,0],[0,0,0]);
 body.sleepState=i%2===0?2:0;
}
for(let i=0;i<28;i++)packed.step();
const pp=packed.getSnapshot();
assert.equal(pp.overlappingCoins,0,'overlapped resting disks must be separated rather than left as ghosts');
assert.equal(pp.inBasin,6);
console.log('PASS 3D ORIENTED COIN ANTI-INTERPENETRATION',JSON.stringify(results));
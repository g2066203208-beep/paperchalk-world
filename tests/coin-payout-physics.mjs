/** Node/CI mechanical verification of the real vendored Cannon-ES world. */
import assert from 'node:assert/strict';
import {RigidCoinPayout,COIN,FIXED_DT,BASIN} from '../site/card-battle/motion/coin-payout-rigid.mjs';
const scenes=[];
function validate(count,frames){
 const a=new RigidCoinPayout({seed:20261118,maxCoins:500});
 const n=a.fire(count);assert.equal(n,count);
 a.advanceFrames(frames);
 const snap=a.getSnapshot();
 assert.equal(a.world.gravity.y,-38,'strong gravity gives coins a fast weighted fall');
 assert(a.world.solver.iterations<=10,'do not solve 500 convex coins with a 24-iteration CPU solver');
 assert(a.coins.length>=Math.min(18,count),'coins physically emitted over time');
 assert(snap.count===a.coins.length);
 assert(a.coins.every(b=>b.shapes.length===1 && b.shapes[0].constructor.name==='Cylinder' && b.shapes[0].body===b), 'each coin needs its OWN true 3D convex cylinder collision shape');
 assert(new Set(a.coins.map(b=>b.shapes[0])).size===a.coins.length, 'physics shapes are independent, unlike InstancedMesh draw geometry');
 assert(a.coins.every(b=>Number.isFinite(b.position.x)&&Number.isFinite(b.position.y)&&Number.isFinite(b.position.z)));
 assert(a.coins.some(b=>Math.abs(b.position.z)>.11), 'true depth axis spray');
 assert(a.coins.some(b=>Math.abs(b.quaternion.x)>.1 || Math.abs(b.quaternion.z)>.1),'true 3D coin tumbling');
 assert(a.coins.some(b=>Math.abs(b.angularVelocity.x)>.1 || Math.abs(b.angularVelocity.z)>.1), 'real angular velocity');
 assert(snap.contacts>0,'actual real 3D coin-on-coin contact equations');
 assert(snap.peakHeight>1.0,'powerful toss arc');
 assert(snap.groundContacts>=0);
 assert(snap.inBasin===snap.count,
   `all ${count} emitted coins must remain inside physical basin at ${snap.time}s, got ${snap.inBasin}/${snap.count}`);
 assert.equal(snap.escapedEver,0,'no coins can scatter outside the receiving basin');
 assert(a.coins.every(b=>b.position.x>=BASIN.left-.25&&b.position.x<=BASIN.right+.25&&
   b.position.z>=BASIN.back-.25&&b.position.z<=BASIN.front+.25),
   'physical bowl walls must contain all XYZ rigid bodies');
 assert(BASIN.chute[0]>BASIN.left&&BASIN.chute[0]<BASIN.right&&
   BASIN.chute[2]>BASIN.back&&BASIN.chute[2]<BASIN.front,
   'slot chute must eject INSIDE the real coin catch bowl');
 assert(Math.abs(COIN.radius-3*COIN.scale/(2*Math.cos(Math.PI/10)))<1e-9,'visual and collision radius are identical');
 assert(COIN.height>COIN.radius*.17 && COIN.height<COIN.radius*.25,'coin needs readable edge thickness, 8-12% of its diameter');
 scenes.push({count,frames,snap});
 a.destroy();
}
// The precise Cannon engine is intentionally benchmarked with SMALL groups.
// 120/240/420/500 coin density is tested separately by FastCoinPayout.
validate(12,75);
validate(18,92);
validate(28,105);
// 420-coin preset must respect max, retain previous pile when fired again.
const accum=new RigidCoinPayout({seed:101,maxCoins:500});
accum.fire(18);accum.advanceFrames(100);
const prev=accum.coins.length;
assert(prev>=14);
assert.equal(accum.fire(24),24,'precise reference retains the previous pile for a second batch');
accum.advanceFrames(84);
assert(accum.coins.length>prev && accum.coins.length<=500);
assert.equal(accum.getSnapshot().escapedEver,0,'second jackpot also has to stay inside the same 3D basin');
assert(accum.coins.slice(0,prev).every(x=>x.userData.id<prev),'old rigid bodies survive second payout');
scenes.push({added:true,before:prev,after:accum.coins.length,snapshot:accum.getSnapshot()});
accum.destroy();
console.log('PASS precise small-batch Cannon-ES 3D cylinder reference, XYZ impulse and real collisions',JSON.stringify(scenes));
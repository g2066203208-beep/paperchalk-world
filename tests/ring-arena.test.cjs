/* Ring battle math: actor worlds STAY FIXED; only camera orbit can move.
 * This contract forbids fake sliding cut-outs and any reused proxy cubes.
 */
'use strict';
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
const radius=p=>Math.hypot(p.x,p.z);
const keys=['x','y','z','angle','height'];
for(const mode of ['outer','inner']){
 const actors=arena.layout(mode);
 assert.equal(actors.allies.length,4);
 assert.equal(actors.enemies.length,4);
 assert.strictEqual(arena.layout(mode),actors,'same frozen layout reused');
 const people=[...actors.allies,...actors.enemies];
 assert.equal(new Set(people.map(p=>p.slot)).size,8,'8 independent L2D slots');
 assert.equal(actors.allies[0].slot,'player');
 assert.ok(people.every(p=>Object.isFrozen(p)),'all world anchors frozen');
 for(const p of people){
  assert.equal(p.y,0,'every foot is exactly on the floor');
  const ring=p.team==='ally'?(mode==='outer'?arena.SPEC.outerRoleRadius:arena.SPEC.innerRoleRadius):
    (mode==='outer'?arena.SPEC.innerRoleRadius:arena.SPEC.outerRoleRadius);
  near(radius(p),ring);
 }
 const views=[0,.16,.45,.76,1].map(p=>arena.camera(mode,p));
 for(let i=1;i<views.length;i++){
  near(radius(views[i].eye),radius(views[0].eye));
  assert.notEqual(views[i].eye.x,views[i-1].eye.x,'camera must orbit');
 }
 const stable=people.map(p=>keys.map(k=>p[k]));
 for(const t of [0,.25,.5,1]){
  const cam=arena.camera(mode,t);
  near(radius(cam.eye),mode==='outer'?arena.SPEC.outerCameraRadius:arena.SPEC.innerCameraRadius);
  assert.ok(radius(cam.eye)<arena.SPEC.wallRadius);
  for(let i=0;i<people.length;i++){
   assert.deepEqual(keys.map(k=>people[i][k]),stable[i]);
  }
  const hero=people[0];
  assert.ok(arena.project(hero,cam).valid);
  const top=arena.project({...hero,y:hero.height},cam);
  const shoe=arena.project(hero,cam);
  assert.ok(top.valid&&top.y>shoe.y,'head projects above grounded shoe');
 }
 const start=arena.project(people[0],views[0]);
 const end=arena.project(people[0],views[4]);
 assert.ok(Math.abs(start.x-end.x)>.10,'fixed hero shifts on SCREEN due to camera only');
}
assert.ok(arena.SPEC.innerCameraRadius<arena.SPEC.innerRoleRadius);
assert.ok(arena.SPEC.outerCameraRadius>arena.SPEC.outerRoleRadius);
console.log('PASS: fixed world-space L2D formation; only two real camera orbits move');
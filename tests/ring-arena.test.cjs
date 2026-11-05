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
 assert.deepEqual(arena.visibleActors(mode).map(p=>p.id),
   ['hero','enemy-1','enemy-2','enemy-3','enemy-4'],
   'battle view draws only heroine plus enemy characters');
 assert.deepEqual(arena.HIDDEN_ALLY_IDS,['ally-2','ally-3','ally-4'],
   'teammates hidden without deleting their permanent standing anchors');
 assert.ok(arena.visibleActors(mode).every(p=>!arena.HIDDEN_ALLY_IDS.includes(p.id)));

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
// The broad arena keeps physical separation (not a tiny ring with overlapping L2Ds).
const s=arena.SPEC;
const ringGap=s.outerRoleRadius-s.innerRoleRadius;
assert.ok(s.wallRadius>=17&&s.wallRadius>=s.outerRoleRadius+4.5,
 'battle must have genuine curved-wall clearance and broad circular floor');
assert.ok(ringGap>=2.2&&ringGap<=2.8,'opposing rings need physical clearance without becoming distant');
const angleRange=values=>(Math.max(...values)-Math.min(...values))*180/Math.PI;
assert.ok(angleRange(arena.formation.allies)<45,'allied team no longer scatters around the arena');
assert.ok(angleRange(arena.formation.enemies)<50,'enemy team no longer scatters around the arena');
const minChord=(radius,angles)=>Math.min(...angles.flatMap((a,i)=>angles.slice(i+1).map(b=>2*radius*Math.sin(Math.abs(b-a)/2))));
assert.ok(minChord(s.innerRoleRadius,arena.formation.enemies)>2.1,
 'adjacent enemy anchors must not intersect');
assert.ok(minChord(s.innerRoleRadius,arena.formation.allies)>1.8,
 'adjacent allied anchors must not intersect');
for(const mode of ['outer','inner']){
  const hero=arena.layout(mode).allies[0];
  const left=arena.project(hero,arena.camera(mode,0));
  const right=arena.project(hero,arena.camera(mode,1));
  assert.ok(left.x<-.25&&right.x>.25,
    'the heroine must stay cinematic, left-to-right, while camera orbits stationary cast');
}
assert.ok(arena.SPEC.innerCameraRadius<arena.SPEC.innerRoleRadius);
assert.ok(arena.SPEC.outerCameraRadius>arena.SPEC.outerRoleRadius);
assert.ok(arena.SPEC.outerCameraRadius<arena.SPEC.wallRadius-2.0,
 'camera must not approach or cut through cylindrical wall');
assert.ok(arena.SPEC.innerCameraRadius<arena.SPEC.innerRoleRadius-2.0,
 'inner camera must remain clearly inside the front actor circle');
console.log('PASS: fixed world-space L2D formation; only two real camera orbits move');
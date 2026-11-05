'use strict';
// Fixed 3D battle-composition regression: only camera switches, never actors.
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
const distance=p=>Math.hypot(p.x,p.z);
const spectator='hero,enemy-1,enemy-2,enemy-3,enemy-4';
assert.equal(arena.SPEC.stageType,'shallow-arc');
assert.deepEqual(arena.SHOT_NAMES,['左侧','全景','右侧']);
assert.equal(arena.CAMERA_STOPS.outer.length,3);
assert.equal(arena.CAMERA_STOPS.inner.length,3);
assert.deepEqual(arena.HIDDEN_ALLY_IDS,['ally-2','ally-3','ally-4']);
for(const mode of ['outer','inner']){
 const original=arena.layout(mode);
 assert.equal(original.allies.length,4);assert.equal(original.enemies.length,4);
 assert.equal(arena.visibleActors(mode).map(a=>a.id).join(','),spectator);
 assert.strictEqual(arena.layout(mode),original,'scene is immutable');
 assert.ok(Object.isFrozen(original.allies)&&Object.isFrozen(original.enemies));
 for(const actor of [...original.allies,...original.enemies]){
  assert.ok(Object.isFrozen(actor));
  near(actor.y,0);
  const r=actor.team==='ally'?
   (mode==='outer'?arena.SPEC.outerRoleRadius:arena.SPEC.innerRoleRadius):
   (mode==='outer'?arena.SPEC.innerRoleRadius:arena.SPEC.outerRoleRadius);
  near(distance(actor),r);
 }
 // Camera API is a FINITE shot selector (no free fractional camera orbit).
 assert.deepEqual([-.7,0,.3,.5,.8,1.1,1.6,2,20].map(x=>arena.camera(mode,x).index),
  [0,0,0,1,1,1,2,2,2]);
 assert.ok(arena.camera(mode,0).shot==='left');
 assert.ok(arena.camera(mode,1).shot==='center');
 assert.ok(arena.camera(mode,2).shot==='right');
 for(const index of [0,1,2]){
  const cam=arena.camera(mode,index);
  assert.ok(cam.fov>=40&&cam.fov<=56);
  assert.ok(cam.eye.y>1.3&&cam.eye.y<1.6);
  assert.ok(distance(cam.eye)<arena.SPEC.wallRadius);
  for(const actor of [...original.allies,...original.enemies])near(actor.y,0);
  // Single shared pinhole camera and world-foot coordinates.
  const hero=original.allies[0];
  const head=arena.project({...hero,y:hero.height},cam);
  const foot=arena.project(hero,cam);
  assert.ok(head.valid&&foot.valid&&head.y>foot.y);
  const projected=original.enemies.map(actor=>({
   actor,
   head:arena.project({...actor,y:actor.height},cam),
   foot:arena.project(actor,cam)
  }));
  for(const p of projected){
   assert.ok(p.head.valid&&p.foot.valid);
   assert.ok(Math.abs(p.head.x)<.94 && Math.abs(p.foot.x)<.94);
   assert.ok(p.head.y<.9&&p.foot.y>-.95,
    'all enemies have complete full-body height in the film camera');
   assert.ok((p.head.y-p.foot.y)*360>195,
    'opponents must be prominently displayed at 1280x720');
  }
 }
 // Interpolated render values are permitted only BETWEEN approved poses.
 const first=arena.camera(mode,0),last=arena.camera(mode,2);
 const partial=arena.blendCamera(first,last,.25);
 near(partial.eye.x,first.eye.x*.75+last.eye.x*.25);
 near(partial.fov,first.fov*.75+last.fov*.25);
 assert.ok(Math.abs(first.eye.x-last.eye.x)>.1);
 assert.deepEqual(arena.layout(mode),original);
}
const centerAngle=0,outerEdge=arena.SPEC.wallArcHalfAngle*.85;
const o0=arena.backdropPoint('outer',centerAngle);
const o1=arena.backdropPoint('outer',outerEdge);
const i0=arena.backdropPoint('inner',centerAngle);
const i1=arena.backdropPoint('inner',outerEdge);
// Same projected wall X geometry, opposite physical curvature as SEEN
// by the cameras (outside looks -Z; inside looks +Z).
near(o0.x,i0.x);near(o1.x,i1.x);
assert.ok(o0.z>o1.z,'outer camera sees near center/far wings');
assert.ok(i0.z>i1.z,'inner camera sees far center/near wings looking +Z');
assert.ok(i1.z>10.8,'curved wall is BEHIND the enemy formation');
console.log('PASS: fixed 3-shot cinematic cameras, inverted surround wall and 4 visible L2D enemies');

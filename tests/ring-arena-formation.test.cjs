'use strict';
/* True aligned 4v4 horizontal ranks and one controllable shoulder camera per friendly. */
const assert=require('node:assert/strict');
const ring=require('../site/game/ring-arena-runtime.js');
const scene=ring.layout('outer'),hero=scene.allies[0],base=ring.camera('outer');
const immutable=JSON.stringify(scene);
const friendX=scene.allies.map(a=>a.x),enemyX=scene.enemies.map(a=>a.x);
assert.deepEqual(scene.allies.map(a=>a.z),[9.30,9.30,9.30,9.30],
 'four teammates MUST occupy one world-space horizontal rank');
assert.deepEqual(scene.enemies.map(a=>a.z),[6.80,6.80,6.80,6.80],
 'four opponents MUST occupy one world-space horizontal rank');
assert.ok(scene.allies.every(a=>a.y===0)&&scene.enemies.every(a=>a.y===0));
assert.ok(Math.abs(scene.allies[0].x+1.05)<1e-9,'heroine remains fixed at approved x');
assert.ok(Math.abs(base.eye.x+.28)<1e-9&&Math.abs(base.eye.z-10.40)<1e-9,
 'protagonist initial camera coordinates do not change');
assert.ok(Math.abs(scene.allies[0].z-scene.enemies[0].z-2.5)<1e-9,
 'both complete lines have exactly 2.50m of empty floor between them');
for(let i=1;i<4;i++){
 const friendlyStep=friendX[i-1]-friendX[i];
 const enemyStep=enemyX[i]-enemyX[i-1];
 assert.ok(Math.abs(friendlyStep-enemyStep)<1e-7,
  'both ranks must have matching 1-to-1 lateral lane spacing, rank '+i);
}
const allyUV=ring.FEMALE07_BACK_UV;
const foeUV={left:.347,right:.6634,top:.0032,bottom:1};
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 for(const chosen of scene.allies){
  const cam=ring.allyViewCamera(base,hero,chosen,0,0,aspect);
  const selected=ring.portraitVisibleBounds(chosen,cam,allyUV,aspect);
  const foes=scene.enemies.map(a=>ring.portraitVisibleBounds(a,cam,foeUV,aspect));
  assert.ok(cam.shoulderRig&&cam.actorRootUnchanged,
   'switching control must never move the actor root');
  assert.deepEqual(cam.shoulderPivot,{x:chosen.x,y:chosen.height*.88,z:chosen.z},
   'camera world pivot must move to the selected teammate');
  assert.equal(cam.heroYawDeg,0,'mouse look never rotates the selected actor');
  assert.ok(selected.valid&&selected.right>-.96&&selected.left<1,
   'controlled teammate must actually be visible in their shoulder view');
  assert.ok(foes.every(b=>b.valid&&b.left>-.96&&b.right<.96),
   'every camera must preserve all 4 enemy portraits including on narrow phones');
  assert.ok(foes.slice(1).every((b,i)=>b.left-foes[i].right>.027),
   'all four enemies must remain visually separated in each player view');
  assert.ok(foes[0].left-selected.right>.075,
   'selected teammate must not cover the first enemy');
 }
}
// The approved original heroine framing is exactly unchanged.
assert.deepEqual(ring.allyViewCamera(base,hero,hero,0,0,1917/906),
 ring.shoulderCamera(base,hero,0,0,1917/906));
for(const chosen of scene.allies){
 for(const look of [-1,0,1]){
  const cam=ring.allyViewCamera(base,hero,chosen,look,0,1917/906);
  assert.deepEqual(cam.shoulderPivot,{x:chosen.x,y:chosen.height*.88,z:chosen.z});
  assert.ok(Math.abs(cam.lookYawDeg)<=22.00001);
 }
}
assert.equal(JSON.stringify(scene),immutable,
 'perspective switching must preserve all eight immutable world positions');
console.log('PASS two aligned four-person ranks, 4 selectable real over-shoulder views, all 4 foes visible');

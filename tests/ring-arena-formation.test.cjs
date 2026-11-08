'use strict';
/* P5-inspired spacious battle layout. The approved New Moon shoulder camera
 * and female-07 BACK rigs are immutable. Only actual actor positions and the
 * opponent group's visual distance/height may be changed. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ring=require('../site/game/ring-arena-runtime.js');
const scene=ring.layout('outer'),original=JSON.stringify(scene);
const outerFriendly=[[-1.05,9.30],[-1.72,7.95],[.98,9.45],[-1.05,8.32]];
const outerEnemies=[[-.20,6.35],[.45,6.35],[1.10,6.35],[1.75,6.35]];
assert.deepEqual(scene.allies.map(a=>[a.x,a.z]),outerFriendly);
assert.deepEqual(scene.enemies.map(a=>[a.x,a.z]),outerEnemies);
assert.ok(new Set(scene.allies.map(a=>a.z)).size>2,
 'four people MUST NOT be crowded into the same near-camera row');
for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)
 assert.ok(Math.hypot(scene.allies[i].x-scene.allies[j].x,
 scene.allies[i].z-scene.allies[j].z)>.7,
 'separate teammates physically in 3D: '+i+','+j);
assert.ok(scene.enemies.every(e=>e.height===1.70),
 'mild, consistent opponent art-size correction, no changed camera');
assert.deepEqual(ring.HIDDEN_ALLY_IDS,[]);
assert.deepEqual(ring.visibleActors('outer').map(a=>a.id),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
const src=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
const bridge=fs.readFileSync(path.resolve(__dirname,'../site/dev/character-bridge.js'),'utf8');
assert.doesNotMatch(src,/STAGE_SPECTATORS|STAGE_FG|stageTransition\s*=|function stagePosition/,
 'do not swap allies or use a camera-avoidance pose trick');
assert.match(src,/stagePresentation:'p5-spaced-fixed-all-back-command-team'/,
 'default 3D presentation uses spacious fixed world anchors');
assert.match(bridge,/const keys=originalMode\?\['player'\]:\['player','ally2','ally3','ally4'\]/,
 'all four players retain independent genuine female-07 L2D canvases');
assert.match(bridge,/await assign\(key,targetId,'back',false\)/,
 'all four player models remain BACK-only');
for(const a of scene.allies){
 const r=ring.actorWorldRight(a,'outer');
 assert.ok(r.x>.998&&Math.abs(r.z)<.051,'no side-view fakery: '+a.id);
}
const cam=ring.camera('outer'),hero=scene.allies[0];
assert.deepEqual(cam.eye,{x:-.28,y:1.5,z:10.4});
assert.deepEqual(cam.focus,{x:-.24,y:1.5,z:5.4});
assert.equal(cam.fov,66);
assert.deepEqual(ring.SHOULDER_LOOK_LIMITS,{
 yawLeftDeg:7.5,yawRightDeg:7.5,pitchUpDeg:3.5,pitchDownDeg:3.5
});
const html=fs.readFileSync(path.resolve(__dirname,'../site/index.html'),'utf8');
assert.match(html,/p5-wide-neighbor-fixed-camera-comfort-v2-20261108/,
 'HTML must force actual battle source reload rather than stale cache');
assert.match(html,/const comfortableLook=v=>/,
 'mouse neutral deadzone and continuous smoothstep must exist');
assert.match(html,/stage\.dataset\.scene==='ring-arena'\?4\.5:7/,
 'battle cursor must have gentler independent easing');

assert.equal(ring.CAMERA_STOPS.outer.length,1);
const visibleWidth=r=>r.valid?Math.max(0,Math.min(1,r.right)-
 Math.max(-1,r.left))/Math.max(.001,r.right-r.left):0;
for(const aspect of [1917/906,1280/720,844/390]){
 const originalView=ring.allyViewCamera(cam,hero,hero,0,0,aspect);
 const canon=ring.shoulderCamera(cam,hero,0,0,aspect);
 assert.deepEqual(originalView.eye,canon.eye);
 assert.deepEqual(originalView.focus,canon.focus);
 for(const active of scene.allies){
  const shot=ring.allyViewCamera(cam,hero,active,0,0,aspect);
  assert.ok(shot.shoulderRig&&shot.actorRootUnchanged);
  assert.equal(shot.fov,66);
  assert.equal(shot.eye.y,1.5);
  assert.equal(shot.controlledActorId,active.id);
  assert.deepEqual(shot.shoulderPivot,{x:active.x,y:active.height*.88,z:active.z});
  const friends=scene.allies.map(a=>ring.portraitVisibleBounds(a,shot,
   ring.FEMALE07_BACK_UV,aspect));
  const foes=scene.enemies.map(a=>ring.portraitVisibleBounds(a,shot,
   {left:.30,right:.69,top:0,bottom:1},aspect));
  assert.ok(foes.every(f=>f.valid),'4 original enemy L2Ds have real 3D projections');
  if(aspect>1.2){
   assert.ok(foes.every(f=>f.left>-.99&&f.right<.99),
    'all four enemy silhouettes remain horizontally visible at '+active.id);
   assert.ok(Math.max(...friends.filter((a,i)=>scene.allies[i].id!==active.id)
    .map(visibleWidth))>=.20,
    'at least one adjacent teammate is visible; never demand all 4 at once');
  }
  assert.ok(visibleWidth(friends[scene.allies.indexOf(active)])>.4,
   'controlled actor is a genuine close shoulder portrait, not artificially reduced');
  for(const x of [-1,0,1]){
   const look=ring.allyViewCamera(cam,hero,active,x,0,aspect);
   assert.equal(look.fov,66);
   assert.deepEqual(look.shoulderPivot,shot.shoulderPivot);
  }
 }
}
assert.equal(JSON.stringify(scene),original,
 'control switching must NEVER reposition the actual eight actors');
assert.equal(ring.camera('inner').fov,52);
console.log('PASS P5-style wide immutable 4-player formation, one visible neighbor, 4 clear foes and original shoulder camera');

'use strict';
/* Immutable 4v4 lane geometry, physically shared WebGL camera and actors. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const arena=require('../site/game/ring-arena-runtime.js');
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,a+' != '+b);
assert.equal(arena.SPEC.stageType,'compact-convenience-curved-aisle');
assert.deepEqual(arena.HIDDEN_ALLY_IDS,[]);
const rendererSource=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(rendererSource,/gl\.uniform1f\(portrait\.uOpacity,1\)/,
 'all eight actual L2D quads draw at full opacity');
assert.doesNotMatch(rendererSource,/blocksTarget\s*=|occludes\?\.035|portrait\.uOpacity\s*,\s*occludes/,
 'no teammate opacity or culling heuristics ever return');
assert.doesNotMatch(rendererSource,
 /STAGE_SPECTATORS|stagePosition\(|stageTransition\s*=|stageYaw/,
 'four rear-facing team members must NEVER be moved, yawed or side-staged');
assert.match(rendererSource,/stagePresentation:'four-rear-facing-allies-one-fixed-rank'/,
 'the game must expose the strict standing one-row rear-view layout');
assert.match(rendererSource,/runtime\.libraryPlayer\?\.model\?\.characterId==='female-07'/,
 'battle display must accept the REAL female-07 back rig from the studio');
assert.match(rendererSource,/runtime\.img\?\.dataset\?\.characterSide==='back'/,
 'all four 3D battle actor sources use BACK art, not front or synthetic side views');
assert.equal(arena.portraitFit(800,1200,1024).height,1024);
assert.ok(arena.renderPixelRatio(1920,1080,4)<1.1);
assert.equal(arena.CAMERA_STOPS.outer.length,1,'one shared physical camera rig');
const base=arena.camera('outer'),scene=arena.layout('outer'),hero=scene.allies[0];
assert.deepEqual(arena.visibleActors('outer').map(a=>a.id),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.deepEqual(scene.allies.map(a=>[a.x,a.z]),[[-1.05,9.3],[-.25,9.3],[.55,9.3],[1.35,9.3]]);
assert.deepEqual(scene.enemies.map(a=>[a.x,a.z]),[[-1.05,6.8],[-.25,6.8],[.55,6.8],[1.35,6.8]]);
close(base.eye.y,1.5);close(base.fov,66);
assert.deepEqual(base.eye,{x:-.28,y:1.5,z:10.4});
assert.deepEqual(base.focus,{x:-.24,y:1.5,z:5.4});
assert.ok(arena.responsiveFov(66,9/16)>arena.responsiveFov(66,16/9));
const original=JSON.stringify(scene);
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 for(const active of scene.allies){
  const neutral=arena.allyViewCamera(base,hero,active,0,0,aspect);
  assert.ok(neutral.shoulderRig&&neutral.actorRootUnchanged);
  assert.deepEqual(neutral.shoulderPivot,
   {x:active.x,y:active.y+active.height*.88,z:active.z});
  assert.equal(neutral.controlledActorId,active.id);
  assert.equal(neutral.fov,66,'the heroine-approved lens is never changed');
  assert.equal(neutral.eye.y,1.5,'the heroine-approved eye height is never raised');
  assert.equal(neutral.focus.y,1.5,'the heroine-approved eye-level focus is preserved');
  assert.equal(neutral.heroYawDeg,0);
  const foeCenters=scene.enemies.map(e=>arena.project({
   x:e.x,y:e.height*.5,z:e.z
  },neutral,aspect));
  assert.ok(foeCenters.every(p=>p.valid),'four real ground-anchored foes project');
  for(const yaw of [-1,-.5,0,.5,1])for(const pitch of [-1,0,1]){
   const orbit=arena.allyViewCamera(base,hero,active,yaw,pitch,aspect);
   assert.ok(orbit.actorRootUnchanged);
   assert.deepEqual(orbit.shoulderPivot,neutral.shoulderPivot);
   // Mouse movement is natural head-look, NEVER a shoulder dolly/orbit.
   assert.deepEqual(orbit.eye,neutral.eye,
    'the real 3D shoulder eye must remain fixed at all cursor positions');
   assert.equal(orbit.fov,neutral.fov,'mouse cannot change the approved FOV');
   assert.ok(Math.abs(orbit.lookYawDeg)<=7.50001);
   assert.ok(Math.abs(orbit.lookPitchDeg)<=3.50001);
   assert.ok(Number.isFinite(arena.project({
    x:scene.enemies[0].x,y:.8,z:scene.enemies[0].z
   },orbit,aspect).x));
  }
 }
}
assert.equal(JSON.stringify(scene),original,'camera never moves either rank');
assert.equal(arena.camera('inner').fov,52,'unrelated scene camera stays untouched');
console.log('PASS aligned 4v4 and fully restored original fixed 66-degree shoulder camera');

'use strict';
/* Never change the approved New-Moon-style 66° heroine shoulder camera. */
const assert=require('node:assert/strict');
const ring=require('../site/game/ring-arena-runtime.js');
const scene=ring.layout('outer'),original=JSON.stringify(scene);
const xs=[-1.05,-.25,.55,1.35];
for(const mode of ['outer','inner']){
 const actors=ring.layout(mode);
 assert.deepEqual(actors.allies.map(a=>a.x),xs);
 assert.deepEqual(actors.enemies.map(a=>a.x),xs,
  'four enemies must occupy precisely corresponding lanes');
 assert.ok(actors.allies.every((a,i)=>a.x===actors.enemies[i].x));
 assert.ok([...actors.allies,...actors.enemies].every(a=>a.y===0));
}
assert.deepEqual(scene.allies.map(a=>a.z),[9.3,9.3,9.3,9.3]);
assert.deepEqual(scene.enemies.map(a=>a.z),[6.8,6.8,6.8,6.8]);

const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
const bridge=fs.readFileSync(path.resolve(__dirname,'../site/dev/character-bridge.js'),'utf8');
assert.doesNotMatch(source,/STAGE_SPECTATORS|STAGE_FG|stageTransition\s*=|function stagePosition/,
 'never resurrect the unwanted side-wing lineup or scripted position swapping');
assert.match(source,/stagePresentation:'four-rear-facing-allies-one-fixed-rank'/,
 'the actual 3D renderer must remain one straight rear-facing rank');
assert.match(bridge,/const keys=originalMode\?\['player'\]:\['player','ally2','ally3','ally4'\]/,
 'default battle must mount all four independently animated L2D back rigs');
assert.match(bridge,/const targetId=originalMode\?'protagonist':'female-07'/,
 'all four battle actors must be the user-approved female-07');
assert.match(bridge,/await assign\(key,targetId,'back',false\)/,
 'every party slot must mount the back view, not the front or a fake rotated pose');
for(const actor of scene.allies){
 const right=ring.actorWorldRight(actor,'outer');
 assert.ok(right.x>.998&&Math.abs(right.z)<.051,
  actor.id+' must face from the original full-back plane, not a sideways plane');
}

assert.deepEqual(ring.HIDDEN_ALLY_IDS,[]);
assert.deepEqual(ring.visibleActors('outer').map(a=>a.id),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
const base=ring.camera('outer'),hero=scene.allies[0];
assert.deepEqual(base.eye,{x:-.28,y:1.50,z:10.40},
 'the originally approved heroine camera EYE must never change');
assert.deepEqual(base.focus,{x:-.24,y:1.50,z:5.40},
 'the originally approved heroine camera FOCUS must never change');
assert.equal(base.fov,66,'the original wide-angle lens must not be altered');
assert.equal(ring.CAMERA_STOPS.outer.length,1);
for(const aspect of [1917/906,1280/720,844/390,390/844]){
 const actual=ring.allyViewCamera(base,hero,hero,0,0,aspect);
 const approved=ring.shoulderCamera(base,hero,0,0,aspect);
 assert.deepEqual(actual.eye,approved.eye);
 assert.deepEqual(actual.focus,approved.focus);
 assert.equal(actual.fov,66);
 assert.equal(actual.eye.y,1.5);
 assert.equal(actual.focus.y,1.5);
 assert.deepEqual(actual.shoulderPivot,{x:hero.x,y:hero.height*.88,z:hero.z});
 for(const chosen of scene.allies){
  const shot=ring.allyViewCamera(base,hero,chosen,0,0,aspect);
  const selected=ring.portraitVisibleBounds(chosen,shot,ring.FEMALE07_BACK_UV,aspect);
  const foes=scene.enemies.map(a=>ring.portraitVisibleBounds(a,shot,
   {left:.30,right:.69,top:0,bottom:1},aspect));
  assert.ok(shot.shoulderRig&&shot.actorRootUnchanged);
  assert.equal(shot.fov,66);
  assert.equal(shot.eye.y,1.5);
  assert.equal(shot.focus.y,1.5);
  assert.equal(shot.controlledActorId,chosen.id);
  assert.deepEqual(shot.shoulderPivot,{x:chosen.x,y:chosen.height*.88,z:chosen.z});
  assert.ok(selected.valid&&selected.left<1&&selected.right>-1);
  assert.ok(foes.every(e=>e.valid),'all enemies exist in true 3D');
  if(aspect>=1)assert.ok(foes.every(e=>e.left>-.98&&e.right<.98),
   'all four target billboards appear on desktop without moving the approved lens');
  for(const look of [-1,0,1]){
   const other=ring.allyViewCamera(base,hero,chosen,look,0,aspect);
   assert.deepEqual(other.shoulderPivot,shot.shoulderPivot);
   assert.ok(Math.abs(other.lookYawDeg)<=22.0001);
   assert.equal(other.eye.y,1.5);
   assert.equal(other.fov,66);
  }
 }
}
assert.deepEqual(ring.allyViewCamera(base,hero,hero,0,0,1917/906).eye,
 {x:-.28,y:1.5,z:10.4});
assert.equal(JSON.stringify(scene),original,'world roots must never move with camera');
console.log('PASS original 66° New-Moon heroine TPS preserved, four aligned world lanes, eight opaque actors');

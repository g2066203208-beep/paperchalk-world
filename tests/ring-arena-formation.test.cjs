'use strict';
/* Four exact head-on world-space lanes and a camera that follows any player. */
const assert=require('node:assert/strict');
const ring=require('../site/game/ring-arena-runtime.js');
const scene=ring.layout('outer'),original=JSON.stringify(scene);
const xs=[-1.95,-.65,.65,1.95];
assert.deepEqual(scene.allies.map(a=>a.x),xs,'player rank X coordinates');
assert.deepEqual(scene.enemies.map(a=>a.x),xs,'enemy rank X coordinates');
assert.deepEqual(scene.allies.map(a=>a.z),[9.30,9.30,9.30,9.30]);
assert.deepEqual(scene.enemies.map(a=>a.z),[6.80,6.80,6.80,6.80]);
assert.ok(scene.allies.every((a,i)=>a.x===scene.enemies[i].x),'true face-to-face lanes');
assert.ok([...scene.allies,...scene.enemies].every(a=>a.y===0),'shoes on the same ground');
assert.deepEqual(ring.HIDDEN_ALLY_IDS,[]);
assert.deepEqual(ring.visibleActors('outer').map(a=>a.id),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.deepEqual(ring.layout('inner').allies.map(a=>a.x),xs);
assert.deepEqual(ring.layout('inner').enemies.map(a=>a.x),xs);
const base=ring.camera('outer'),hero=scene.allies[0],heroUv=ring.FEMALE07_BACK_UV;
for(const aspect of [1917/906,1280/720,844/390,390/844]){
 for(const chosen of scene.allies){
  const shot=ring.allyViewCamera(base,hero,chosen,0,0,aspect);
  const selected=ring.portraitVisibleBounds(chosen,shot,heroUv,aspect);
  const enemies=scene.enemies.map(a=>ring.portraitVisibleBounds(a,shot,
   {left:.30,right:.69,top:0,bottom:1},aspect));
  assert.ok(shot.shoulderRig&&shot.actorRootUnchanged,'actual world-space shoulder rig');
  assert.deepEqual(shot.shoulderPivot,{x:chosen.x,y:chosen.height*.88,z:chosen.z});
  assert.equal(shot.controlledActorId,chosen.id);
  assert.ok(Number.isFinite(shot.composition.score),'bounded deterministic camera solution');
  assert.ok(selected.valid,'selected actor actually exists in the 3D projection');
  assert.ok(selected.right>-1&&selected.left<1,'selected actor remains visible');
  assert.ok(enemies.every(r=>r.valid),'four real opponents must project into the view');
  assert.ok(enemies.every(r=>r.right>-1&&r.left<1),
   'all four enemies must remain horizontally on screen');
  const allies=scene.allies.map(a=>ring.portraitVisibleBounds(a,shot,heroUv,aspect));
  const projectedOverlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-
   Math.max(a.left,b.left))*Math.max(0,Math.min(a.top,b.top)-
   Math.max(a.bottom,b.bottom));
  for(const e of enemies){
   const faceZone={...e,bottom:e.top-.28*(e.top-e.bottom)};
   assert.ok(allies.every(a=>projectedOverlap(a,faceZone)<.001),
    'every enemy HEAD remains visually uncovered by all four real teammates');
  }
  if(aspect>1.35)for(const a of allies){
   const visibleWidth=Math.max(0,Math.min(1,a.right)-Math.max(-1,a.left));
   assert.ok(visibleWidth>=.13,
    'all four teammate silhouettes must stay visibly present in wide battle views');
  }
  assert.equal(shot.heroYawDeg,0);
  console.log('role',chosen.id,'aspect',aspect.toFixed(3),
   'shoulder',shot.composition.side,'score',shot.composition.score.toFixed(2),
   'eye',shot.eye.x.toFixed(2),shot.eye.y.toFixed(2),shot.eye.z.toFixed(2));
  for(const look of [-1,1]){
   const orbit=ring.allyViewCamera(base,hero,chosen,look,0,aspect);
   assert.deepEqual(orbit.shoulderPivot,shot.shoulderPivot);
   assert.ok(Math.abs(orbit.lookYawDeg)<=22.0001,'reasonable original mouse-look limits');
  }
 }
}
assert.equal(JSON.stringify(scene),original,'camera cannot move any actor anchor');
console.log('PASS: four precisely aligned 4v4 lanes, four camera-aware viewpoints, no culling');

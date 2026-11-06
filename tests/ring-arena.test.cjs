'use strict';
// Cinematic two-camera verification against the user-supplied Crescent Moon
// gameplay reference: truly close heroine, readable 4-enemy midground,
// unchanged real-world L2D anchors, and responsive 3D projection.
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<=e,a+' != '+b);
assert.equal(arena.SPEC.stageType,'wide-cinematic-arc');
assert.ok(arena.SPEC.wallRadius>=30);
assert.ok(arena.SPEC.floorWidth>=80);
assert.deepEqual(arena.SHOT_NAMES,['左侧','右侧']);
assert.deepEqual(arena.HIDDEN_ALLY_IDS,['ally-2','ally-3','ally-4']);
assert.ok(arena.responsiveFov(56,9/16)>arena.responsiveFov(56,16/9));
for(const mode of ['outer','inner']){
 const scene=arena.layout(mode),before=JSON.stringify(scene);
 assert.equal(scene.allies.length,4);
 assert.equal(scene.enemies.length,4);
 assert.equal(arena.CAMERA_STOPS[mode].length,2,
  'there must be exactly two fixed camera stations');
 assert.deepEqual(arena.visibleActors(mode).map(p=>p.id),
  ['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.ok(Object.isFrozen(scene.allies)&&Object.isFrozen(scene.enemies));
 for(const p of [...scene.allies,...scene.enemies]){
  assert.ok(Object.isFrozen(p));near(p.y,0);
  assert.ok(p.height>1.5&&p.height<1.7);
 }
 assert.deepEqual([-.5,0,.3,.49,.5,.8,1,1.5,2,100].map(n=>arena.camera(mode,n).index),
  [0,0,0,0,1,1,1,1,1,1],
  'camera must NEVER settle on a middle or fractional station');
 assert.deepEqual([0,1].map(i=>arena.camera(mode,i).shot),['left','right']);
 const hero=scene.allies[0];
 for(const index of [0,1]){
  const c=arena.camera(mode,index);
  const p=arena.project({...hero,y:hero.height*.52},c);
  const body=arena.portraitBounds(hero,c);
  assert.ok(body.valid&&p.valid);
  assert.ok(index===0?p.x<-.49&&p.x>-.82:p.x>.49&&p.x<.82,
   'hero body must occupy the left or right foreground, not clip offscreen');
  assert.ok(body.heightFraction>.78&&body.heightFraction<1.30,
   'close-up heroine is legitimately nearer than camera, no sprite CSS scaling');
  assert.ok(body.top>.50&&body.top<.98,'near heroine head remains visible');
  // The original back portrait is intentionally cropped BELOW the image,
  // not by trimming its L2D texture or editing the authoring rig.
  const foeBounds=scene.enemies.map(a=>arena.portraitBounds(a,c));
  const safety=arena.battleVisualSafety(mode,index);
  assert.ok(safety.valid&&safety.clear,'fixed 3D shot must have a clear actual-hero silhouette safe lane');
  assert.ok(safety.gap>=.045,'even the most-left/right full enemy quad may not intersect the heroine near shot');
  for(const aspect of [16/9,4/3,9/16]){
   const resized=arena.battleVisualSafety(mode,index,aspect);
   assert.ok(resized.valid&&resized.clear,
    'resizing game cannot allow the heroine to cover any enemy in '+mode+'/'+index+'/'+aspect);
  }
  for(const aspect of [16/9,4/3,9/16]){
   for(const foe of scene.enemies){
    const b=arena.portraitBounds(foe,c,aspect);
    assert.ok(b.valid);
    assert.ok(b.left>-.97&&b.right<.97,'enemy cropped horizontally');
    assert.ok(b.top<.94&&b.bottom>-.94,'enemy cropped vertically');
   }
  }
  for(const foe of foeBounds)assert.ok(foe.heightFraction>.22&&foe.heightFraction<.42,
   'foes occupy visible middle distance, never become tiny or cover the near heroine');
  // Real actor heads, not the transparent quads alone, must sit in separated
  // projected slots; this catches a small ring or a camerawise pile-up.
  const xCenters=scene.enemies.map(enemy=>
   arena.project({...enemy,y:enemy.height*.5},c).x).sort((a,b)=>a-b);
  for(let i=1;i<xCenters.length;i++)
   assert.ok(xCenters[i]-xCenters[i-1]>.20,
    'adjacent enemies must be visibly spaced in the final camera');
  assert.ok(xCenters[0]>-.78&&xCenters[3]<.79,
   'whole opponent group must fit inside its intended midground region');
  assert.equal(JSON.stringify(scene),before,'camera changes must never move a character');
 }
 const nearLens=arena.camera(mode,0).eye;
 const heroDistance=Math.hypot(nearLens.x-hero.x,nearLens.z-hero.z);
 assert.ok(heroDistance<(mode==='outer'?2.3:2.5),
  'hero near-camera distance in world metres, not a fake sprite scale');
 const blend=arena.blendCamera(arena.camera(mode,0),arena.camera(mode,1),.25);
 near(blend.eye.x,.75*arena.camera(mode,0).eye.x+.25*arena.camera(mode,1).eye.x);
 assert.equal(JSON.stringify(scene),before);
}
const o0=arena.backdropPoint('outer',0),o1=arena.backdropPoint('outer',1);
const i0=arena.backdropPoint('inner',0),i1=arena.backdropPoint('inner',1);
near(o0.x,i0.x);near(o1.x,i1.x);
assert.ok(o0.z>o1.z&&i0.z>i1.z&&i0.z>o0.z);
console.log('PASS: 2 fixed close over-shoulder cameras; near hero; 4 full foes; frozen actor coordinates; responsive lens');

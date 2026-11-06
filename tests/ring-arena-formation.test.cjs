'use strict';
/* V31 composition contract for user-supplied female-07 rear view:
 * one close foreground hero, exactly FOUR readable opponents on a common
 * 3D ground plane, all feet horizontally level in the SAME live camera.
 * No per-sprite CSS hacks, no hidden world anchor changes during idle.
 */
const assert=require('node:assert/strict');
const ring=require('../site/game/ring-arena-runtime.js');
const format=n=>Math.round(n*1000)/1000;
for(const mode of ['outer','inner']){
 const camera=ring.camera(mode),formation=ring.layout(mode);
 const visible=ring.visibleActors(mode);
 assert.equal(camera.shot,'left');
 assert.equal(camera.eye.y,camera.focus.y);
 assert.equal(camera.eye.x,camera.focus.x,'yaw cannot stagger enemy size');
 assert.deepEqual(visible.map(a=>a.id),
  ['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.equal(formation.enemies.length,4);
 assert.equal(new Set(formation.enemies.map(a=>a.z)).size,1,
  'all four enemies must share the same REAL camera depth (not appear scattered in screenshot)');
 assert.ok(Math.abs(formation.allies[0].z-camera.eye.z)>1.25,'hero must not intersect camera');
 for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
  const hero=formation.allies[0];
  const foot=a=>ring.project({x:a.x,y:0,z:a.z},camera,aspect);
  const feet=formation.enemies.map(foot);
  const coords=feet.map(p=>p.x);
  const spacing=coords.slice(1).map((v,i)=>v-coords[i]);
  assert.ok(feet.every(p=>p.valid));
  assert.ok(feet.every(p=>Math.abs(p.y-feet[0].y)<.001),
   'foe shoe bottoms must align on one projected floor line at aspect '+aspect);
  assert.ok(spacing.every(d=>d>.20&&d<.29),
   'four distinct enemies with comfortable even foot spacing at aspect '+aspect);
  assert.ok(Math.max(...spacing)-Math.min(...spacing)<.001,
   'opponent row must be truly even, not visually random perspective');
  const safety=ring.battleVisualSafety(mode,0,aspect,ring.FEMALE07_BACK_UV);
  assert.ok(safety.valid&&safety.clear,'actual female07 weapon + enemy bounds in safe zone');
  assert.ok(safety.hero.left>-.99,'left shoulder/head/ponytail must not be cropped');
  assert.ok(safety.hero.right<-.23,'foreground hero belongs in left visual zone');
  assert.ok(safety.gap>.055,'no body or weapon overlap with enemy1');
  assert.ok(safety.foes[0].left>-.25&&safety.foes[3].right<.925,
   'foe row must occupy screen right, yet be entirely on camera');
  assert.ok(Math.abs(foot(hero).x)<.72);
  const heightFractions=safety.foes.map(x=>x.heightFraction);
  assert.ok(Math.max(...heightFractions)-Math.min(...heightFractions)<.005,
   'enemy heights cannot be randomly different due to depth');
  if(aspect===1917/906)
   console.log('V31 '+mode+' 1917x906:',{
    heroine:[format(safety.hero.left),format(safety.hero.right)],
    enemyFeet:coords.map(format),
    enemySoleY:feet.map(p=>format(p.y)),
    gap:format(safety.gap)
   });
 }
}
console.log('PASS: both 3D battle topologies have 4 equally spaced grounded foes right of uncropped female07 at every aspect ratio');

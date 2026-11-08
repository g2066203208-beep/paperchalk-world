'use strict';
/* Visually grounded original Live2D four-foe row with close TPS heroine. */
const assert=require('node:assert/strict');
const r=require('../site/game/ring-arena-runtime.js');
const scene=r.layout('outer'),hero=scene.allies[0],base=r.camera('outer');
const before=JSON.stringify(scene);
assert.ok(scene.enemies.every(a=>a.y===0&&a.z===6.80));
assert.ok(Math.abs(scene.enemies[3].x-scene.enemies[0].x-3.84)<.001);
assert.ok(scene.allies.slice(1).every(a=>a.z>=7.85&&a.z<=9.45),
 'all three teammates belong to the near-side player zone');
assert.ok(Math.min(...scene.allies.map(a=>a.z))-
 Math.max(...scene.enemies.map(a=>a.z))>=1.04,
 'there must be a genuine physical empty battle lane between allied and enemy halves');
assert.deepEqual(scene.allies.slice(1).map(a=>[a.x,a.z]),
 [[-1.28,7.88],[-2.45,8.15],[-1.82,8.20]],
 'allies stay near the heroine, in staggered near-side depths without blocking foes');
const uv={'enemy-1':{left:.31,right:.69,top:0,bottom:1},
 'enemy-2':{left:.32,right:.69,top:0,bottom:1},
 'enemy-3':{left:.30,right:.76,top:0,bottom:1},
 'enemy-4':{left:0,right:.58,top:0,bottom:1}};
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 const cam=r.shoulderCamera(base,hero,0,0,aspect);
 const feet=scene.enemies.map(a=>r.project({x:a.x,y:0,z:a.z},cam,aspect));
 assert.ok(feet.every(x=>x.valid));
 const silhouettes=scene.enemies.map(a=>r.portraitVisibleBounds(a,cam,uv[a.id],aspect));
 const allies=scene.allies.slice(1).map(a=>r.portraitBounds(a,cam,aspect));
 const foes=scene.enemies.map(a=>r.portraitBounds(a,cam,aspect));
 assert.ok(allies.every(a=>a.heightFraction>foes[0].heightFraction*1.25),
  'allies must read as NEAR-SIDE world-space bodies larger than distant foes');
 const squadSilhouettes=scene.allies.slice(1).map(a=>
  r.portraitVisibleBounds(a,cam,r.FEMALE07_BACK_UV,aspect));
 const uniformEnemyUv={left:.31,right:.69,top:0,bottom:1};
 const leftmostEnemy=r.portraitVisibleBounds(scene.enemies[0],cam,uniformEnemyUv,aspect);
 const teammateRight=Math.max(...squadSilhouettes.map(b=>b.right));
 assert.ok(leftmostEnemy.left-teammateRight>.045,
  'all teammate bodies must leave the leftmost enemy readable, at every aspect ratio');
 assert.ok(scene.allies.slice(1).every(a=>a.x>=-2.5&&a.x<=-1.2),
  'all teammates occupy the heroine physical cluster, never the right enemy wing');
 if(aspect===1917/906)assert.ok(squadSilhouettes.every(b=>b.right>-.99&&b.left<.96),
  'all three teammates must appear within the default landscape camera');
 assert.ok(allies.every(a=>a.valid),'three allies must use the same camera and ground geometry');
 assert.ok(silhouettes.slice(1).every((b,i)=>b.left-silhouettes[i].right>.035),
  'enemy source-alpha outlines are distinct under true perspective');
 const safe=r.battleVisualSafety('outer',0,aspect,r.FEMALE07_BACK_UV,cam);
 assert.ok(safe.clear&&safe.valid&&safe.gap>.05,'all five must fit center TPS view');
 assert.ok(safe.hero.right<safe.foes[0].left,'close heroine must not cover first enemy');
 if(aspect===1917/906){
  assert.ok(safe.hero.left<-.99&&safe.hero.right>-.28);
  assert.ok(safe.hero.top>.47&&safe.hero.top<.55,
   'default head must project into upper screen without hiding the targets');
  assert.ok(safe.foes[3].right<.93);
 }
}
for(const x of [-1,-.5,0,.5,1]){
 const cam=r.shoulderCamera(base,hero,x,0,1917/906);
 assert.equal(cam.actorRootUnchanged,true);
 assert.deepEqual(cam.shoulderPivot,{x:hero.x,y:hero.y+hero.height*.88,z:hero.z});
 assert.equal(cam.heroYawDeg,0,'cursor must not turn the heroine');
 const relX=cam.eye.x-hero.x,relZ=cam.eye.z-hero.z;
 assert.ok(Math.abs(Math.hypot(relX,relZ)-cam.shoulderBoomMeters)<.00001);
}
assert.equal(JSON.stringify(scene),before);
console.log('PASS 4v4 same-source formation: hero and camera locked; team fully near-side; all enemies unobstructed');

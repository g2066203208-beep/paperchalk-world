'use strict';
/* Visually grounded original Live2D four-foe row with close TPS heroine. */
const assert=require('node:assert/strict');
const r=require('../site/game/ring-arena-runtime.js');
const scene=r.layout('outer'),hero=scene.allies[0],base=r.camera('outer');
const before=JSON.stringify(scene);
assert.ok(scene.enemies.every(a=>a.y===0&&a.z===7.45));
assert.ok(Math.abs(scene.enemies[3].x-scene.enemies[0].x-4.3)<.001);
const uv={'enemy-1':{left:.31,right:.69,top:0,bottom:1},
 'enemy-2':{left:.32,right:.69,top:0,bottom:1},
 'enemy-3':{left:.30,right:.76,top:0,bottom:1},
 'enemy-4':{left:0,right:.58,top:0,bottom:1}};
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 const cam=r.shoulderCamera(base,hero,0,0,aspect);
 const feet=scene.enemies.map(a=>r.project({x:a.x,y:0,z:a.z},cam,aspect));
 assert.ok(feet.every(x=>x.valid));
 const silhouettes=scene.enemies.map(a=>r.portraitVisibleBounds(a,cam,uv[a.id],aspect));
 assert.ok(silhouettes.slice(1).every((b,i)=>b.left-silhouettes[i].right>.035),
  'enemy source-alpha outlines are distinct under true perspective');
 const safe=r.battleVisualSafety('outer',0,aspect,r.FEMALE07_BACK_UV,cam);
 assert.ok(safe.clear&&safe.valid&&safe.gap>.05,'all five must fit center TPS view');
 assert.ok(safe.hero.right<safe.foes[0].left,'close heroine must not cover first enemy');
 if(aspect===1917/906){
  assert.ok(safe.hero.left<-.95&&safe.hero.right>-.55);
  assert.ok(safe.foes[3].right<.93);
 }
}
for(const x of [-1,-.5,0,.5,1]){
 const cam=r.shoulderCamera(base,hero,x,0,1917/906);
 assert.equal(cam.actorRootUnchanged,true);
 assert.deepEqual(cam.shoulderPivot,{x:hero.x,y:hero.y+hero.height*.88,z:hero.z});
 const relX=cam.eye.x-hero.x,relZ=cam.eye.z-hero.z;
 assert.ok(Math.abs(Math.hypot(relX,relZ)-cam.shoulderBoomMeters)<.00001);
}
assert.equal(JSON.stringify(scene),before);
console.log('PASS hero stays foreground in rigid third-person shoulder rig, foes grounded with individual contours');

'use strict';
/* One standard encounter. World-space foes use real perspective, never CSS. */
const assert=require('node:assert/strict');
const ring=require('../site/game/ring-arena-runtime.js');
const f=n=>Number(n.toFixed(3));
const mode='outer',cam=ring.camera(mode),scene=ring.layout(mode);
const foes=scene.enemies,all=ring.visibleActors(mode),snapshot=JSON.stringify(scene);
assert.equal(foes.length,4);
assert.deepEqual(all.map(a=>a.id),['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.ok(foes.every(a=>a.y===0),'all shoes sit on y=0 of real WebGL ground');
assert.ok(Math.max(...foes.map(a=>a.x))-Math.min(...foes.map(a=>a.x))>4,'use shop width');
assert.ok(Math.max(...foes.map(a=>a.z))-Math.min(...foes.map(a=>a.z))>1,'natural staggered depth');
assert.ok(new Set(foes.map(a=>a.z)).size===4,'not a uniform lineup');
assert.deepEqual([ring.LOOK_LIMITS.yawLeftDeg,ring.LOOK_LIMITS.yawRightDeg,
 ring.LOOK_LIMITS.pitchUpDeg,ring.LOOK_LIMITS.pitchDownDeg],[22,22,12,12]);
const uv={'enemy-1':{left:.31,right:.69,top:0,bottom:1},
 'enemy-2':{left:.32,right:.69,top:0,bottom:1},
 'enemy-3':{left:.30,right:.76,top:0,bottom:1},
 'enemy-4':{left:0,right:.58,top:0,bottom:1}};
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 const feet=foes.map(a=>ring.project({x:a.x,y:0,z:a.z},cam,aspect));
 assert.ok(feet.every(p=>p.valid));
 const silhouettes=foes.map(a=>ring.portraitVisibleBounds(a,cam,uv[a.id],aspect));
 const gaps=silhouettes.slice(1).map((b,i)=>b.left-silhouettes[i].right);
 assert.ok(gaps.every(g=>g>.025),'world-space alpha silhouettes must remain distinct');
 const safety=ring.battleVisualSafety(mode,0,aspect,ring.FEMALE07_BACK_UV);
 assert.ok(safety.valid&&safety.clear&&safety.gap>.055);
 assert.ok(safety.hero.left>-.999&&safety.hero.right<-.23);
 assert.ok(safety.foes[3].right<.93);
 const baseline=feet.map(p=>p.y);
 assert.ok(Math.max(...baseline)-Math.min(...baseline)>.015);
 if(aspect===1917/906)console.log('ONE encounter 1917x906',
  {foeX:feet.map(p=>f(p.x)),footY:feet.map(p=>f(p.y)),gaps:gaps.map(f)});
}
// Freedom to look toward a wall means NOT every opponent must remain onscreen.
for(const x of [-1,-.5,0,.5,1])for(const y of [-1,0,1]){
 const looked=ring.immersiveCamera(cam,x,y);
 assert.deepEqual(looked.eye,cam.eye,'camera stays at fixed world eye');
 assert.equal(looked.fov,cam.fov);
 assert.ok(ring.project({x:0,y:1.5,z:0},looked).valid);
}
assert.equal(JSON.stringify(scene),snapshot,'cursor turn never moves ArtMesh anchors');
console.log('PASS one spaced battle, real floor, 50-degree horizontal look sweep');

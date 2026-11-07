'use strict';
/* Centred, grounded one-row battle: no crowding and no two-sided surround. */
const assert=require('node:assert/strict');
const r=require('../site/game/ring-arena-runtime.js');
const cam=r.camera('outer'),scene=r.layout('outer'),foes=scene.enemies;
const before=JSON.stringify(scene);
assert.deepEqual(r.visibleActors('outer').map(x=>x.id),
 ['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.equal(foes.length,4);
assert.ok(foes.every(a=>a.y===0&&a.z===7.45));
assert.ok(Math.abs(foes.at(-1).x-foes[0].x-4.30)<.001);
assert.ok(scene.allies[0].x<-.7);
const crop={'enemy-1':{left:.31,right:.69,top:0,bottom:1},
 'enemy-2':{left:.32,right:.69,top:0,bottom:1},
 'enemy-3':{left:.30,right:.76,top:0,bottom:1},
 'enemy-4':{left:0,right:.58,top:0,bottom:1}};
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 const p=foes.map(a=>r.project({x:a.x,y:0,z:a.z},cam,aspect));
 assert.ok(p.every(q=>q.valid));
 assert.ok(Math.abs(p.reduce((s,q)=>s+q.x,0)/4)<.09,
  'four opponents must be visually centered');
 assert.ok(p.every(q=>Math.abs(q.y-p[0].y)<.001),
  'foes must share one real 3D ground baseline');
 const silhouette=foes.map(a=>r.portraitVisibleBounds(a,cam,crop[a.id],aspect));
 assert.ok(silhouette.slice(1).every((b,i)=>b.left-silhouette[i].right>.07),
  'silhouettes must remain individually legible, including last coat');
 const safe=r.battleVisualSafety('outer',0,aspect,r.FEMALE07_BACK_UV);
 assert.ok(safe.valid&&safe.clear&&safe.gap>.07,
  'cropped foreground protagonist cannot cover opponents');
 assert.ok(safe.hero.right<-.70,
  'near-camera protagonist should naturally crop at the left edge');
 if(aspect===1917/906)console.log('VISUAL CENTER',p.map(q=>+q.x.toFixed(3)));
}
for(const x of [-1,0,1])for(const y of [-1,0,1]){
 const look=r.immersiveCamera(cam,x,y);
 assert.deepEqual(look.eye,cam.eye,'one fixed-pivot camera; no layer parallax');
}
assert.equal(JSON.stringify(scene),before);
console.log('PASS centred real-world four-opponent line and fixed-pivot camera');

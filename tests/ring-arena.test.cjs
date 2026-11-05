'use strict';
/* World-space cinematic battle framing regression based on supplied
 * reference gameplay frames. No per-character camera-space shortcuts.
 */
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const approx=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,a+' != '+b);
assert.equal(arena.SPEC.stageType,'wide-cinematic-arc');
assert.ok(arena.SPEC.wallRadius>=30,'large performance environment, no tiny circle');
assert.ok(arena.SPEC.floorWidth>=80);
assert.deepEqual(arena.SHOT_NAMES,['左侧','全景','右侧']);
assert.deepEqual(arena.HIDDEN_ALLY_IDS,['ally-2','ally-3','ally-4']);
assert.ok(arena.responsiveFov(52,9/16)>arena.responsiveFov(52,16/9),
 'portrait must expand vertical FOV and retain horizontal composition');
for(const mode of ['outer','inner']){
 const scene=arena.layout(mode),orig=JSON.stringify(scene);
 assert.equal(scene.allies.length,4);assert.equal(scene.enemies.length,4);
 assert.equal(arena.visibleActors(mode).map(p=>p.id).join(','),
  'hero,enemy-1,enemy-2,enemy-3,enemy-4');
 assert.strictEqual(arena.layout(mode),scene);
 assert.ok(Object.isFrozen(scene.allies)&&Object.isFrozen(scene.enemies));
 for(const actor of [...scene.allies,...scene.enemies]){
  assert.ok(Object.isFrozen(actor));approx(actor.y,0);
  assert.ok(actor.height>=1.5&&actor.height<=1.7);
 }
 const spread=Math.max(...scene.enemies.map(p=>p.x))-
  Math.min(...scene.enemies.map(p=>p.x));
 assert.ok(spread>=4.1,'four opponents must occupy a WIDE shallow arc');
 const h=scene.allies[0];
 assert.ok(scene.enemies.every(p=>mode==='outer'?p.z<h.z:p.z>h.z),
  'two surround modes use opposite physical depth directions');
 assert.deepEqual([-.5,.3,.7,1.3,1.7,4].map(k=>arena.camera(mode,k).index),
  [0,0,1,1,2,2],'only three fixed camera stations');
 for(const index of [0,1,2]){
  const camera=arena.camera(mode,index);
  assert.equal(camera.shot,['left','center','right'][index]);
  assert.ok(camera.fov>=40&&camera.fov<=55);
  for(const aspect of [16/9,4/3,9/16]){
   const boxes=scene.enemies.map(p=>arena.portraitBounds(p,camera,aspect));
   boxes.forEach(box=>{
    assert.ok(box.valid);
    assert.ok(box.left>=-.97&&box.right<=.97,
      'enemy horizontally clipped at '+mode+'/'+index+'/'+aspect);
    assert.ok(box.top<=.98&&box.bottom>=-.98,
      'enemy vertically clipped at '+mode+'/'+index+'/'+aspect);
   });
  }
  const hero=arena.portraitBounds(h,camera);
  assert.ok(hero.valid&&hero.left<1&&hero.right>-1,
   'heroine must stay partially inside frame');
  if(index!==1){
   assert.ok(hero.heightFraction>=.72,'heroine must dominate near-camera foreground');
   const bodyCenter=arena.project({...h,y:h.height*.5},camera);
   assert.ok(bodyCenter.valid&&Math.abs(bodyCenter.x)>=.35&&Math.abs(bodyCenter.x)<=.85,
    'actual visible actress center, not a blank corner of transparent L2D canvas');
  }
  const foes=scene.enemies.map(p=>arena.portraitBounds(p,camera));
  assert.ok(foes.every(q=>q.heightFraction>=.23),
   'foes must be legible middle-ground figures');
  assert.equal(JSON.stringify(scene),orig,'camera must not alter actor world anchors');
 }
 const from=arena.camera(mode,0),to=arena.camera(mode,2);
 const between=arena.blendCamera(from,to,.25);
 approx(between.eye.x,from.eye.x*.75+to.eye.x*.25);
 approx(between.fov,from.fov*.75+to.fov*.25);
}
const o0=arena.backdropPoint('outer',0),o1=arena.backdropPoint('outer',1);
const i0=arena.backdropPoint('inner',0),i1=arena.backdropPoint('inner',1);
approx(o0.x,i0.x);approx(o1.x,i1.x);
assert.ok(o0.z>o1.z&&i0.z>i1.z);
assert.ok(i0.z>o0.z,'inner surround wall uses opposite physical view');
console.log('PASS: wide camera-aware staging, foreground heroine, 4 visible foes, 3 fixed shots, responsive WebGL FOV');

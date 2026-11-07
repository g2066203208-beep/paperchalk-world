'use strict';
// Fixed-left 3/4 rear cinematic battle: geometry, art proportions and safety.
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const approx=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,a+' != '+b);
assert.equal(arena.SPEC.stageType,'compact-convenience-curved-aisle');
assert.deepEqual(arena.SHOT_NAMES,['固定左机位']);
assert.deepEqual(arena.HIDDEN_ALLY_IDS,['ally-2','ally-3','ally-4']);
assert.ok(arena.responsiveFov(56,9/16)>arena.responsiveFov(56,16/9));
assert.equal(arena.portraitFit(800,1200,1024).height,1024);
approx(arena.portraitFit(800,1200,1024).width,1024*2/3);
assert.equal(arena.portraitFit(1200,800,1024).width,1024);
assert.ok(arena.renderPixelRatio(1920,1080,4)<1.1);
assert.ok(arena.renderPixelRatio(844,390,3)<=1.75);
assert.ok(arena.renderPixelRatio(1920,1080,1)<=1);
for(const mode of ['outer','inner']){
 const scene=arena.layout(mode),original=JSON.stringify(scene),c=arena.camera(mode,0);
 assert.equal(arena.CAMERA_STOPS[mode].length,1,'a 3/4 back texture has ONE valid view');
 assert.equal(scene.allies.length,4);assert.equal(scene.enemies.length,4);
 assert.deepEqual(arena.visibleActors(mode).map(a=>a.id),
  ['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.ok(Object.isFrozen(scene.allies)&&Object.isFrozen(scene.enemies));
 for(const n of [-99,-1,0,.6,1,2,50]){
  assert.equal(arena.camera(mode,n).index,0,'alternate shot must be impossible');
  assert.equal(arena.camera(mode,n).shot,'left');
  assert.deepEqual(arena.camera(mode,n).eye,c.eye);
 }
 approx(c.eye.y,c.focus.y);
 approx(c.eye.y,1.50);
 approx(arena.VERTICAL_LENS_SHIFT,.23);
 assert.ok(Math.abs(arena.cameraPitchDeg(c))<.001,'true horizontal eye-level optics');
 approx(c.focus.x,.78);
 approx(c.eye.x,c.focus.x);
 assert.ok(c.fov>=50&&c.fov<=60);
 const hero=scene.allies[0],heroMiddle=arena.project({...hero,y:.81},c);
 assert.ok(heroMiddle.valid&&heroMiddle.x<-.50&&heroMiddle.x>-.70,
  'fixed view must keep 3/4 heroine in the LEFT foreground');
 const heroBounds=arena.portraitBounds(hero,c);
 assert.ok(heroBounds.valid&&heroBounds.heightFraction>.8&&heroBounds.heightFraction<1.3);
 const safety=arena.battleVisualSafety(mode,0);
 assert.ok(safety.valid&&safety.clear&&safety.gap>.045,
  'hero silhouette and all enemy quads need clear separated lanes');
 assert.ok(safety.hero.top>.35&&safety.hero.top<.65,
  'eye-height over-shoulder framing must not put heroine head against ceiling');
 const centers=scene.enemies.map(e=>arena.project({...e,y:e.height*.5},c).x);
 const mean=centers.reduce((a,b)=>a+b,0)/4;
 assert.ok(mean>.30&&mean<.43,
   'both four-enemy rows occupy the right battle lane after silhouette spacing');
 const ordered=[...centers].sort((a,b)=>a-b);
 for(let i=1;i<ordered.length;i++)assert.ok(ordered[i]-ordered[i-1]>.185);
 const feet=scene.enemies.map(e=>arena.project({x:e.x,y:0,z:e.z},c));
 assert.ok(scene.enemies.every(actor=>actor.y===0),
  'all four shoes physically touch the same world y=0 floor');
 const visualBaseline=feet.map(p=>p.y);
 assert.ok(Math.max(...visualBaseline)-Math.min(...visualBaseline)>.06,
  'natural 3D near/far formation produces varied projected baseline');
 for(const e of safety.foes){
  assert.ok(e.top>.1&&e.top<.5&&e.bottom>-.62&&e.bottom<.06);
  assert.ok(e.heightFraction>.30&&e.heightFraction<.61);
 }
 for(const aspect of [16/9,4/3,9/16]){
  const res=arena.battleVisualSafety(mode,0,aspect);
  assert.ok(res.valid&&res.clear,'portrait, tablet and desktop must keep enemies legible');
 }
 assert.equal(JSON.stringify(scene),original,'a camera/viewport may never move game actors');
}
console.log('PASS: fixed-left 3/4 battle, 4 closer foes, exact 1-camera contract, ground-safe projection');

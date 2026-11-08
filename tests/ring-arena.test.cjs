'use strict';
/* Real right-shoulder TPS rig, human-scale proportions, 3D ground contact. */
const assert=require('node:assert/strict');
const arena=require('../site/game/ring-arena-runtime.js');
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,a+' != '+b);
assert.equal(arena.SPEC.stageType,'compact-convenience-curved-aisle');
assert.deepEqual(arena.HIDDEN_ALLY_IDS,[],'all four friendly actors must take part in the battle');
assert.equal(arena.portraitFit(800,1200,1024).height,1024);
assert.ok(arena.renderPixelRatio(1920,1080,4)<1.1);
assert.equal(arena.CAMERA_STOPS.outer.length,1,'one shoulder camera base, not switching angles');
const base=arena.camera('outer'),scene=arena.layout('outer'),hero=scene.allies[0];
assert.deepEqual(arena.visibleActors('outer').map(a=>a.id),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.ok(scene.enemies.every(a=>a.y===0&&a.z===6.80));
assert.ok(scene.allies.slice(1).every(a=>a.z>=8.25),
 'every squadmate must stand in the heroine near-side physical zone');
close(base.eye.y,1.5);close(base.eye.x,-.28);close(base.eye.z,10.40);
close(base.fov,66);
assert.ok(arena.responsiveFov(66,9/16)>arena.responsiveFov(66,16/9));
const initial=JSON.stringify(scene);
for(const aspect of [1917/906,1920/1080,1280/720,844/390,390/844]){
 const cam=arena.shoulderCamera(base,hero,0,0,aspect);
 const safe=arena.battleVisualSafety('outer',0,aspect,arena.FEMALE07_BACK_UV,cam);
 assert.ok(safe.valid&&safe.clear,'no ally/foe overlap in the center view '+aspect);
 assert.ok(safe.gap>.05);
 assert.ok(cam.shoulderRig&&cam.actorRootUnchanged);
 assert.equal(cam.lookYawDeg,0);
 assert.ok(cam.shoulderBoomMeters>=1.1&&cam.shoulderBoomMeters<=2.65);
 const visibleWidth=Math.max(0,Math.min(1,safe.hero.right)-Math.max(-1,safe.hero.left));
 assert.ok(visibleWidth>.25,'foreground heroine remains visibly large');
 const heel=scene.enemies.map(a=>arena.project({x:a.x,y:0,z:a.z},cam,aspect));
 const squad=scene.allies.slice(1).map(a=>arena.project({x:a.x,y:0,z:a.z},cam,aspect));
 assert.ok(squad.every(p=>p.valid),'three squadmates share the actual 3D floor');
 assert.ok(heel.every(p=>p.valid),'all 4 enemies grounded and in front of camera');
}
const c=arena.shoulderCamera(base,hero,0,0,1917/906);
const safe=arena.battleVisualSafety('outer',0,1917/906,arena.FEMALE07_BACK_UV,c);
assert.ok(safe.hero.left<-.99&&safe.hero.right<-.20&&safe.hero.right>-.28);
assert.ok(safe.hero.top>.47&&safe.hero.top<.55);
const heroBillboard=arena.portraitBounds(hero,c,1917/906);
assert.ok(heroBillboard.heightFraction>1.45&&heroBillboard.heightFraction<1.65,
 'hero must have an immersive large close-up rather than a distant card');
assert.ok(safe.foes.every(f=>f.heightFraction>.41&&f.heightFraction<.46),
 'enemy sizes must remain natural at true world distance');
const foePositions=scene.enemies.map(e=>arena.project({x:e.x,y:e.height*.5,z:e.z},c,1917/906).x);
assert.ok(foePositions[0]<0&&foePositions.at(-1)>.72,
 'foes remain readable beyond the heroine shoulder');
for(const yaw of [-1,-.5,0,.5,1])for(const pitch of [-1,0,1]){
 const cam=arena.shoulderCamera(base,hero,yaw,pitch,1917/906);
 const displacement=Math.hypot(cam.eye.x-base.eye.x,cam.eye.z-base.eye.z);
 const boom=Math.hypot(cam.eye.x-hero.x,cam.eye.z-hero.z);
 close(boom,arena.shoulderCamera(base,hero,0,0,1917/906).shoulderBoomMeters,1e-7);
 assert.ok(displacement<1.5);
 close(cam.heroYawDeg,0,1e-7);
 const pivot={x:hero.x,y:hero.y+hero.height*.88,z:hero.z};
 const neutral=arena.shoulderCamera(base,hero,0,pitch,1917/906);
 close(arena.project(pivot,cam,1917/906).x,
  arena.project(pivot,neutral,1917/906).x,1e-6);
 assert.ok(Math.abs(cam.lookYawDeg)<=22.0001&&Math.abs(cam.lookPitchDeg)<=12.0001);
 const originalShadowRight=arena.actorWorldRight(hero,'outer',cam.heroYawDeg);
 assert.ok(Number.isFinite(originalShadowRight.x)&&Number.isFinite(originalShadowRight.z));
 // Shoulder follows the same yaw and does not teleport the foe's art or root.
 const enemyRight=arena.actorWorldRight(scene.enemies[0],'outer',cam.heroYawDeg);
 close(enemyRight.x,1);close(enemyRight.z,0);
}
assert.equal(JSON.stringify(scene),initial,'third-person camera must NEVER move actors');
const inner=arena.camera('inner');
assert.equal(inner.fov,52,'legacy opposite-direction environment remains intact');
console.log('PASS 4v4 authored world-space actors and realistic shoulder foreground');

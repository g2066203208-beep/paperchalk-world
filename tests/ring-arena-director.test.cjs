'use strict';
const assert=require('node:assert/strict');
const director=require('../site/game/ring-arena-director.js');
const {CARD}=require('../site/combat-lab/engine.js');
const arena=require('../site/game/ring-arena-runtime.js');
assert.deepEqual(director.pickCard(CARD),{
 key:'slash',name:CARD.slash.name,type:'attack',damage:12,w:1,a:1,r:1
});
assert.equal(director.DURATION,580);
assert.equal(director.REDUCED_DURATION,330);
assert.deepEqual(director.STAGES.map(x=>x.id),[
 'lock','approach','windup','swing','impact','reaction','recover']);
assert.equal(director.REFERENCE.fps,30);
assert.equal(director.REFERENCE.frames,699);
assert.deepEqual(director.REFERENCE.entries,[79,178,315,416]);
assert.deepEqual(director.REFERENCE.exits,[128,228,368,470]);
assert.throws(()=>director.createAttack('enemy-5',0),/Invalid/);
assert.throws(()=>director.createAttack('enemy-1',NaN),/clock/);
assert.equal(director.hasEnemyHitPortrait('enemy-2'),true);
assert.equal(director.hasEnemyHitPortrait('enemy-1'),false);
assert.equal(director.hasEnemyHitPortrait('enemy-3'),false);
assert.equal(director.hasEnemyHitPortrait('enemy-4'),false);
assert.equal(director.ART.maleEnemy,'./assets/characters/enemy-suit-hit-no-hud.webp');
const approx=(a,b,epsilon=.0001)=>assert.ok(Math.abs(a-b)<epsilon,
 a+' != '+b);
for(const mode of ['outer','inner']){
 const original=arena.layout(mode),snap=JSON.stringify(original);
 const hero=original.allies[0],target=original.enemies[1],camera=arena.camera(mode,0);
 const attack=director.createAttack('enemy-2',0,{mode});
 const shot=director.duelCamera(camera);
 assert.equal(shot.shot,'left');
 approx(camera.eye.y,camera.focus.y);
 approx(shot.eye.y,camera.eye.y);
 assert.ok(shot.fov<camera.fov);
 for(const aspect of [16/9,4/3,9/16]){
  const duet=director.duelLayout(shot,arena.project,aspect,hero,target);
  const p1=arena.project({...duet.hero,y:1},shot,aspect);
  const p2=arena.project({...duet.target,y:1},shot,aspect);
  assert.ok(p1.valid&&p2.valid,'duel participants stay on screen');
  approx(p1.x,-.27);approx(p2.x,+.27);
  assert.deepEqual(duet.actorIds,['hero','enemy-2']);
  approx(duet.hero.z,duet.target.z);
  const center=director.sample(attack,285);
  assert.equal(center.stage,'impact');assert.equal(center.hit,true);
  assert.ok(center.stageStrength>.98);
  const vm=director.actorMotion('enemy-2',attack,center,hero,target,duet);
  const hm=director.actorMotion('hero',attack,center,hero,target,duet);
  const hWorld={...hero,x:hero.x+hm.x,z:hero.z+hm.z};
  const eWorld={...target,x:target.x+vm.x,z:target.z+vm.z};
  const displayCamera=director.cinematicCamera(camera,attack,center,target);
  const pHero=arena.project({...hWorld,y:1},displayCamera,aspect);
  const pEnemy=arena.project({...eWorld,y:1},displayCamera,aspect);
  assert.ok(pHero.valid&&pEnemy.valid);
  assert.ok(pHero.x<-.15&&pHero.x>-.45,'hero enters left-center stage');
  assert.ok(pEnemy.x>.15&&pEnemy.x<.55,'target enters right-center stage');
  assert.equal(arena.cameraPitchDeg(displayCamera),0);
  const spectator=director.actorMotion('enemy-3',attack,center,hero,target,duet);
  assert.deepEqual(spectator,{x:0,y:0,z:0,scale:1});
  const final=director.sample(attack,580);
  assert.equal(final.finished,true);
  assert.deepEqual(director.actorMotion('hero',attack,final,hero,target,duet),
   {x:0,y:0,z:0,scale:1});
  assert.deepEqual(director.cinematicCamera(camera,attack,final,target),camera,
   'exactly return to canonical eye-height rest camera');
 }
 for(const [ms,stage] of [[0,'lock'],[80,'approach'],[150,'windup'],
  [250,'swing'],[290,'impact'],[390,'reaction'],[500,'recover'],[580,'done']]){
  assert.equal(director.sample(attack,ms).stage,stage);
 }
 assert.equal(director.sample(attack,266).hit,false);
 assert.equal(director.sample(attack,267).hit,true);
 assert.equal(director.poseFor('hero',attack,director.sample(attack,285)),'attack');
 assert.equal(director.poseFor('enemy-2',attack,director.sample(attack,285)),'hurt-art');
 assert.equal(director.poseFor('enemy-3',attack,director.sample(attack,285)),'idle');
 assert.equal(JSON.stringify(original),snap,'all source character anchors immutable');
}
// Hit feedback is sampled on the same timeline as both ground-anchored
// actors; it never relies on a CSS animation advancing independently.
const before=director.sample(director.createAttack('enemy-2',0),260);
const contact=director.sample(director.createAttack('enemy-2',0),290);
const aftermath=director.sample(director.createAttack('enemy-2',0),390);
assert.equal(before.hit,false);
assert.equal(contact.hit,true);
assert.ok(contact.fxOpacity>0&&contact.damageOpacity>0);
assert.equal(aftermath.fxOpacity,0);
assert.ok(aftermath.damageOpacity>0);
assert.equal(director.sample(director.createAttack('enemy-2',0),580).stageStrength,0);
const reduced=director.createAttack('enemy-1',0,{reducedMotion:true});
assert.equal(director.sample(reduced,330).finished,true);
assert.equal(director.sample(reduced,200).shake,0);
console.log('PASS V24: video-referenced center stage, BOTH actor silhouettes 36.5%/63.5%, responsive views, exact restoration');

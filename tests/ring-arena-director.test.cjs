'use strict';
/* Deterministic director QA; cinematic motion must not touch authored combat rules. */
const assert=require('node:assert/strict');
const director=require('../site/game/ring-arena-director.js');
const {CARD}=require('../site/combat-lab/engine.js');
const arena=require('../site/game/ring-arena-runtime.js');
assert.deepEqual(director.pickCard(CARD),{
 key:'slash',name:CARD.slash.name,type:'attack',damage:12,w:1,a:1,r:1
});
assert.equal(CARD.slash.damage,12);
assert.equal(director.CARD.damage,CARD.slash.damage);
assert.deepEqual(director.STAGES.map(x=>x.id),['lock','windup','swing','impact','reaction','recover']);
assert.equal(director.STAGES[0].from,0);
assert.equal(director.STAGES.at(-1).to,director.DURATION);
assert.equal(director.sample(null,0).stage,'idle');
assert.throws(()=>director.createAttack('ally-2',0),/Invalid/);
assert.throws(()=>director.createAttack('enemy-5',0),/Invalid/);
assert.throws(()=>director.createAttack('enemy-1',NaN),/clock/);
for(const mode of ['outer','inner']){
 const scene=arena.layout(mode);
 const old=JSON.stringify(scene);
 const camera=arena.camera(mode,0);
 const target=scene.enemies[1];
 const attack=director.createAttack('enemy-2',0,{mode});
 assert.equal(attack.mode,mode);
 let phases=[];
 for(const [t,phase] of [[0,'lock'],[70,'windup'],[200,'swing'],
  [335,'impact'],[460,'reaction'],[575,'recover'],[650,'done']]){
  const state=director.sample(attack,t);
  assert.equal(state.stage,phase);
  phases.push(state.stage);
  assert.ok(state.zoom>=0&&state.zoom<=1);
  assert.equal(state.hit,t>=335);
  const heroM=director.actorMotion('hero',attack,state);
  const victim=director.actorMotion('enemy-2',attack,state);
  assert.ok(Number.isFinite(heroM.z)&&Number.isFinite(victim.z));
  assert.deepEqual(director.actorMotion('enemy-3',attack,state),
   {x:0,y:0,z:0,scale:1});
  const cine=director.cinematicCamera(camera,attack,state,target);
  assert.equal(cine.shot,'left');
  assert.ok(Math.abs(cine.eye.y-cine.focus.y)<1e-9,
   'director must retain eye-level, not tilt up or down');
  assert.ok(cine.fov<=camera.fov);
  assert.equal(arena.cameraPitchDeg(cine),0);
  if(t>=650)assert.deepEqual(cine,camera,'exact return to canonical rest camera');
 }
 assert.deepEqual(phases,['lock','windup','swing','impact','reaction','recover','done']);
 assert.equal(JSON.stringify(scene),old,'camera, actors and formation are immutable');
 const p=director.projectScreen(arena.project,target,camera,16/9);
 assert.ok(p.valid&&p.x>5&&p.x<95&&p.y>0&&p.y<90);
}
const reduced=director.createAttack('enemy-1',0,{reducedMotion:true});
assert.equal(director.sample(reduced,300).finished,true);
assert.equal(director.sample(reduced,200).shake,0);
assert.ok(director.sample(reduced,270).advance<director.sample(
 director.createAttack('enemy-1',0),900).advance+1);
assert.equal(director.DURATION,650);
assert.equal(director.ART.hero,'./assets/characters/hero-axe-attack.webp');
assert.equal(director.ART.maleEnemy,'./assets/characters/enemy-suit-hit.webp');
assert.equal(director.hasEnemyHitPortrait('enemy-1'),false);
assert.equal(director.hasEnemyHitPortrait('enemy-2'),true);
assert.equal(director.hasEnemyHitPortrait('enemy-3'),false);
assert.equal(director.hasEnemyHitPortrait('enemy-4'),false);
assert.equal(director.sample(director.createAttack('enemy-2',0),200).cut,'attacker');
assert.equal(director.sample(director.createAttack('enemy-2',0),455).cut,'victim');
assert.equal(director.sample(director.createAttack('enemy-2',0),575).cut,'none');
assert.equal(director.STAGES[2].to-director.STAGES[2].from,185);
assert.equal(director.STAGES[3].to-director.STAGES[3].from,75);
assert.equal(director.sample(director.createAttack('enemy-2',0),314).hit,false);
assert.equal(director.sample(director.createAttack('enemy-2',0),315).hit,true);
assert.equal(director.sample(director.createAttack('enemy-2',0),650).cut,'none');
console.log('PASS director V21: 650ms decisive hard cuts, 75ms impact, exact restoration and identity-safe art');

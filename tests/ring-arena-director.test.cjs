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
assert.deepEqual(director.STAGES.map(x=>x.id),['lock','windup','swing','impact','recover']);
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
 for(const [t,phase] of [[0,'lock'],[250,'windup'],[630,'swing'],
  [800,'impact'],[1060,'recover'],[1540,'done']]){
  const state=director.sample(attack,t);
  assert.equal(state.stage,phase);
  phases.push(state.stage);
  assert.ok(state.zoom>=0&&state.zoom<=1);
  assert.equal(state.hit,t>=800);
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
  if(t>=1540)assert.deepEqual(cine,camera,'exact return to canonical rest camera');
 }
 assert.deepEqual(phases,['lock','windup','swing','impact','recover','done']);
 assert.equal(JSON.stringify(scene),old,'camera, actors and formation are immutable');
 const p=director.projectScreen(arena.project,target,camera,16/9);
 assert.ok(p.valid&&p.x>5&&p.x<95&&p.y>0&&p.y<90);
}
const reduced=director.createAttack('enemy-1',0,{reducedMotion:true});
assert.equal(director.sample(reduced,460).finished,true);
assert.equal(director.sample(reduced,300).shake,0);
assert.ok(director.sample(reduced,270).advance<director.sample(
 director.createAttack('enemy-1',0),900).advance+1);
console.log('PASS director: canonical slash card, deterministic 5 beats, target-only motion, eye-line, exact reset and reduced motion');

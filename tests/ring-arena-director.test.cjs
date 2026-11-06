'use strict';
const assert=require('node:assert/strict');
const director=require('../site/game/ring-arena-director.js');
const {CARD}=require('../site/combat-lab/engine.js');
const arena=require('../site/game/ring-arena-runtime.js');
const approx=(a,b,eps=.0001)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
assert.deepEqual(director.pickCard(CARD),
 {key:'slash',name:CARD.slash.name,type:'attack',damage:12,w:1,a:1,r:1});
assert.equal(director.FPS,30);
assert.equal(director.FRAME_COUNT,58);
approx(director.FRAME_MS,1000/30);
approx(director.DURATION,1933.3333333333335);
assert.equal(director.REDUCED_DURATION,director.DURATION);
assert.deepEqual(director.STAGES.map(x=>x.id),[
 'lock','approach','swing','impact','reaction','hold','recover','settle'
]);
assert.equal(director.REFERENCE.fps,30);
assert.equal(director.REFERENCE.frames,699);
assert.deepEqual(director.REFERENCE.entries,[79,178,315,416]);
assert.deepEqual(director.REFERENCE.exits,[128,228,365,465]);
assert.deepEqual(director.ORIGINAL_CLIPS.map(x=>x.impact),[81,180,318,418]);
assert.deepEqual(director.ORIGINAL_CLIPS.map(x=>x.holdEnd),[127,227,364,464]);
assert.deepEqual(director.ORIGINAL_CLIPS.map(x=>x.originalQueue),[134,234,372,473]);
assert.throws(()=>director.createAttack('enemy-5',0),/Invalid/);
assert.throws(()=>director.createAttack('enemy-1',NaN),/clock/);
assert.equal(director.hasEnemyHitPortrait('enemy-2'),true);
assert.equal(director.hasEnemyHitPortrait('enemy-3'),false);
assert.equal(director.ART.maleEnemy,'./assets/characters/enemy-suit-hit-no-hud.webp');
for(const [name,track]of Object.entries(director.TRACKS)){
 assert.equal(track.length,59,'ALL source-reference-authorable frames '+name);
 assert.ok(track.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
 assert.equal(track[0],name==='damageRise'?0:0);
}
const attack=director.createAttack('enemy-2',0);
const frames=Array.from({length:59},(_,i)=>director.sampleFrame(attack,i));
for(let i=0;i<=director.FRAME_COUNT;i++){
 const v=frames[i];
 assert.equal(v.frame,i,'exact original 30fps sampling index');
 assert.equal(v.stage,i===58?'done':
  director.STAGES.find(s=>i>=s.from&&i<s.to).id);
 assert.equal(v.hit,i>=3,'single hit before arrival, native frame '+i);
 if(i<58)assert.equal(director.sample(attack,i*director.FRAME_MS+1).frame,i);
}
assert.equal(frames[0].stage,'lock');
assert.ok(frames[1].heroProgress>0.40,'fast approach in one 30fps frame');
assert.ok(frames[2].heroProgress>0.80&&frames[2].heroProgress<1);
assert.equal(director.poseFor('hero',attack,frames[2]),'attack');
assert.equal(frames[3].stage,'impact');
assert.equal(frames[3].hit,true);
assert.equal(frames[3].heroProgress,1);
assert.ok(frames[4].recoil>frames[3].recoil);
assert.equal(director.poseFor('enemy-2',attack,frames[3]),'hurt-art');
for(let i=9;i<=48;i++){
 assert.equal(frames[i].stage,'hold','hold is the BATTLE artwork result, not idle');
 assert.equal(frames[i].heroProgress,1);
 assert.equal(frames[i].victimProgress,1);
 assert.ok(frames[i].zoom>=.99);
 assert.equal(director.poseFor('hero',attack,frames[i]),'attack');
 assert.equal(director.poseFor('enemy-2',attack,frames[i]),'hurt-art');
}
assert.equal(frames.filter(v=>v.stage==='hold').length,40);
assert.equal(frames[49].stage,'recover');
assert.equal(frames[49].heroProgress,1);
for(let i=49;i<=55;i++){
 assert.equal(director.poseFor('hero',attack,frames[i]),'attack',
  'attacker keeps combat artwork through return frame '+i);
 assert.equal(director.poseFor('enemy-2',attack,frames[i]),'hurt-art',
  'victim keeps hurt artwork through return frame '+i);
}
assert.ok(frames[51].heroProgress<frames[50].heroProgress);
assert.equal(frames[55].heroProgress,0,'attacker is back at ORIGINAL ground anchor');
assert.equal(frames[55].victimProgress,0,'victim is back at ORIGINAL ground anchor');
assert.equal(director.poseFor('hero',attack,frames[55]),'attack');
assert.equal(director.poseFor('enemy-2',attack,frames[55]),'hurt-art');
assert.equal(frames[56].stage,'settle');
assert.equal(director.poseFor('hero',attack,frames[56]),'idle',
 'ONLY after reaching anchor does original heroine L2D return');
assert.equal(director.poseFor('enemy-2',attack,frames[56]),'idle',
 'ONLY after reaching anchor does original opponent L2D return');
assert.ok(frames[56].zoom>0,'camera is last to settle');
assert.equal(frames[57].zoom,0);
assert.equal(frames[58].stage,'done');
assert.equal(frames[58].finished,true);
assert.equal(frames[58].heroProgress,0);
assert.equal(frames[58].victimProgress,0);
assert.equal(frames[58].zoom,0);
assert.equal(frames[20].damageOpacity,0);
assert.equal(frames.filter(s=>s.heroPose).length,54);
assert.equal(frames.filter(s=>s.victimPose).length,53);
assert.throws(()=>director.sampleFrame(attack,59),/Invalid frame/);
for(const mode of ['outer','inner']){
 const original=arena.layout(mode),snap=JSON.stringify(original);
 const hero=original.allies[0],target=original.enemies[1],base=arena.camera(mode,0);
 const curr=director.createAttack('enemy-2',0,{mode});
 const shot=director.duelCamera(base);
 assert.equal(shot.shot,'left');
 approx(base.eye.y,base.focus.y);
 approx(shot.eye.y,base.eye.y);
 assert.ok(shot.fov<=base.fov-14,'match large original cinematic zoom');
 for(const aspect of [16/9,4/3,9/16]){
  const duet=director.duelLayout(shot,arena.project,aspect,hero,target);
  const p1=arena.project({...duet.hero,y:1},shot,aspect);
  const p2=arena.project({...duet.target,y:1},shot,aspect);
  assert.ok(p1.valid&&p2.valid);
  approx(p1.x,-.40);approx(p2.x,.40);
  assert.deepEqual(duet.actorIds,['hero','enemy-2']);
  approx(duet.hero.z,duet.target.z);
  const mid=frames[20],heroDelta=director.actorMotion('hero',curr,mid,hero,target,duet);
  const victimDelta=director.actorMotion('enemy-2',curr,mid,hero,target,duet);
  const display=director.cinematicCamera(base,curr,mid,target);
  const left=arena.project({x:hero.x+heroDelta.x,y:1,z:hero.z+heroDelta.z},display,aspect);
  const right=arena.project({x:target.x+victimDelta.x,y:1,z:target.z+victimDelta.z},display,aspect);
  assert.ok(left.valid&&right.valid);
  assert.ok(left.x<-.35&&left.x>-.45,'left safe duel point');
  assert.ok(right.x>.35&&right.x<.45,'right safe duel point');
  assert.equal(arena.cameraPitchDeg(display),0);
  assert.deepEqual(director.actorMotion('enemy-3',curr,mid,hero,target,duet),
   {x:0,y:0,z:0,scale:1});
  assert.deepEqual(director.actorMotion('hero',curr,frames[58],hero,target,duet),
   {x:0,y:0,z:0,scale:1});
  assert.deepEqual(director.cinematicCamera(base,curr,frames[58],target),base);
 }
 assert.equal(JSON.stringify(original),snap,'no source L2D ground-anchor edits');
}
const reduced=director.createAttack('enemy-1',0,{reducedMotion:true});
assert.equal(director.sample(reduced,director.DURATION).finished,true);
assert.equal(director.sampleFrame(reduced,3).shake,0);
console.log('PASS V29: 699-frame SOURCE timing, 59 authored 30fps samples, 46+ focus frames, single-frame hit, action poses persist until home and lens fully settles last');

'use strict';
const assert=require('node:assert/strict');
const director=require('../site/game/ring-arena-director.js');
const {CARD}=require('../site/combat-lab/engine.js');
const arena=require('../site/game/ring-arena-runtime.js');
const approx=(a,b,eps=.0001)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
assert.deepEqual(director.pickCard(CARD),
 {key:'slash',name:CARD.slash.name,type:'attack',damage:12,w:1,a:1,r:1});
assert.equal(director.FPS,30);
assert.equal(director.FRAME_COUNT,21);
approx(director.FRAME_MS,1000/30);
assert.equal(director.DURATION,700);
assert.equal(director.REDUCED_DURATION,700);
assert.deepEqual(director.STAGES.map(x=>x.id),
 ['lock','approach','windup','swing','impact','reaction','hold','recover']);
assert.equal(director.REFERENCE.fps,30);
assert.equal(director.REFERENCE.frames,699);
assert.deepEqual(director.REFERENCE.entries,[79,178,315,416]);
assert.deepEqual(director.REFERENCE.exits,[128,228,368,470]);
assert.throws(()=>director.createAttack('enemy-5',0),/Invalid/);
assert.throws(()=>director.createAttack('enemy-1',NaN),/clock/);
assert.equal(director.hasEnemyHitPortrait('enemy-2'),true);
assert.equal(director.hasEnemyHitPortrait('enemy-3'),false);
assert.equal(director.ART.maleEnemy,'./assets/characters/enemy-suit-hit-no-hud.webp');
for(const [name,track]of Object.entries(director.TRACKS)){
 assert.equal(track.length,22,'every '+name+' frame explicitly authored');
 assert.ok(track.every(x=>x>=0&&x<=1));
}
const attack=director.createAttack('enemy-2',0);
const frames=Array.from({length:22},(_,i)=>director.sampleFrame(attack,i));
for(let i=0;i<frames.length;i++){
 assert.equal(frames[i].frame,i);
 assert.equal(frames[i].stage,i===21?'done':director.STAGES.find(s=>i>=s.from&&i<s.to).id);
 assert.equal(frames[i].hit,i>=4,'damage threshold frame only');
 assert.equal(director.sample(attack,i*director.FRAME_MS+1).frame,i,
  'sub-frame game render must not advance an authored keyframe');
}
assert.equal(frames[0].heroProgress,0);
assert.ok(frames[2].heroProgress>0);
assert.ok(frames[3].heroProgress<1,'attack begins during transit');
assert.equal(frames[3].stage,'swing');
assert.equal(director.poseFor('hero',attack,frames[3]),'attack');
assert.equal(frames[4].hit,true);
assert.ok(frames[4].heroProgress<1,'collision precedes arrival');
assert.equal(director.poseFor('enemy-2',attack,frames[4]),'hurt-art');
assert.equal(frames[5].stage,'reaction');
assert.equal(frames[5].heroProgress,1);
assert.equal(director.poseFor('hero',attack,frames[5]),'attack',
 'do NOT change attack portrait merely because the attacker reached center');
assert.ok(frames[6].recoil>frames[5].recoil,'target recoils AFTER contact');
assert.equal(frames[10].stage,'hold');
assert.equal(frames[10].heroProgress,1);
assert.equal(frames[10].victimProgress,1);
assert.equal(director.poseFor('enemy-2',attack,frames[10]),'hurt-art',
 'do NOT change hurt portrait while still in middle stage');
assert.ok(frames[12].damageOpacity>0,'a few frames retain damage result');
assert.equal(frames[14].damageOpacity,0);
assert.equal(frames[15].stage,'recover');
assert.ok(frames[17].heroProgress<frames[16].heroProgress);
assert.equal(frames[19].heroProgress,0);
assert.equal(frames[19].victimProgress,0);
assert.equal(director.poseFor('hero',attack,frames[19]),'attack',
 'attacker still uses combat portrait on first frame BACK at authored anchor');
assert.equal(director.poseFor('enemy-2',attack,frames[19]),'hurt-art',
 'victim still uses hit portrait on first frame BACK at authored anchor');
for(let i=2;i<19;i++){
 assert.equal(director.poseFor('hero',attack,frames[i]),'attack',
  'hero original portrait must NEVER appear before returning; frame '+i);
}
for(let i=4;i<19;i++){
 assert.equal(director.poseFor('enemy-2',attack,frames[i]),'hurt-art',
  'target original portrait must NEVER appear before returning; frame '+i);
}
assert.equal(frames[20].heroProgress,0);
assert.equal(frames[20].victimProgress,0);
assert.equal(director.poseFor('hero',attack,frames[20]),'idle',
 'hero restores original portrait ONLY AFTER arrival at original anchor');
assert.equal(director.poseFor('enemy-2',attack,frames[20]),'idle',
 'victim restores original portrait ONLY AFTER arrival at original anchor');
assert.ok(frames[19].zoom>0&&frames[20].zoom>0,
 'camera framing must stay cinematic until BOTH portraits have returned');
assert.equal(frames[21].zoom,0,'camera resets after pose restoration');
assert.equal(frames[21].stage,'done');
assert.equal(frames[21].stageStrength,0);
assert.equal(frames[21].finished,true);
assert.equal(frames.filter(s=>s.stage==='hold').length,6,
 'no prolonged 1-second static center pose');
assert.equal(frames.filter(s=>s.victimPose).length,16);
assert.equal(frames.filter(s=>s.heroPose).length,18);
assert.throws(()=>director.sampleFrame(attack,22),/Invalid frame/);
for(const mode of ['outer','inner']){
 const original=arena.layout(mode),snap=JSON.stringify(original);
 const hero=original.allies[0],target=original.enemies[1],camera=arena.camera(mode,0);
 const curr=director.createAttack('enemy-2',0,{mode});
 const shot=director.duelCamera(camera);
 assert.equal(shot.shot,'left');
 approx(camera.eye.y,camera.focus.y);
 approx(shot.eye.y,camera.eye.y);
 for(const aspect of [16/9,4/3,9/16]){
  const duet=director.duelLayout(shot,arena.project,aspect,hero,target);
  const p1=arena.project({...duet.hero,y:1},shot,aspect);
  const p2=arena.project({...duet.target,y:1},shot,aspect);
  assert.ok(p1.valid&&p2.valid);
  approx(p1.x,-.27);approx(p2.x,+.27);
  assert.deepEqual(duet.actorIds,['hero','enemy-2']);
  approx(duet.hero.z,duet.target.z);
  const moving=director.sampleFrame(curr,3),center=director.sampleFrame(curr,5);
  const before=director.actorMotion('hero',curr,moving,hero,target,duet);
  assert.notEqual(before.x,0);
  assert.ok(moving.heroProgress<1&&moving.victimProgress<1);
  const hm=director.actorMotion('hero',curr,center,hero,target,duet);
  const vm=director.actorMotion('enemy-2',curr,center,hero,target,duet);
  const hWorld={...hero,x:hero.x+hm.x,z:hero.z+hm.z};
  const eWorld={...target,x:target.x+vm.x,z:target.z+vm.z};
  const displayCamera=director.cinematicCamera(camera,curr,center,target);
  const pHero=arena.project({...hWorld,y:1},displayCamera,aspect);
  const pEnemy=arena.project({...eWorld,y:1},displayCamera,aspect);
  assert.ok(pHero.valid&&pEnemy.valid);
  assert.ok(pHero.x<-.10&&pHero.x>-.28);
  assert.ok(pEnemy.x>.15&&pEnemy.x<.55);
  assert.equal(arena.cameraPitchDeg(displayCamera),0);
  assert.deepEqual(director.actorMotion('enemy-3',curr,center,hero,target,duet),
   {x:0,y:0,z:0,scale:1});
  assert.deepEqual(director.actorMotion('hero',curr,frames[21],hero,target,duet),
   {x:0,y:0,z:0,scale:1});
  assert.deepEqual(director.cinematicCamera(camera,curr,frames[21],target),camera);
 }
 assert.equal(JSON.stringify(original),snap);
}
const reduced=director.createAttack('enemy-1',0,{reducedMotion:true});
assert.equal(director.sample(reduced,700).finished,true);
assert.equal(director.sample(reduced,133.34).shake,0);
console.log('PASS V28: 22 authored 30fps frames, action/hurt art persist UNTIL origin, then original L2D returns before camera reset');

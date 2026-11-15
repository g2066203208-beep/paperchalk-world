'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const root={};root.window=root;vm.createContext(root);
for(const path of [
 'site/card-battle/engine/world-time.js',
 'site/card-battle/engine/visual-look.js'
])vm.runInContext(fs.readFileSync(path,'utf8'),root,{filename:path});
const w=root.PaperchalkWorldTime,look=root.PaperchalkVisualLook;
assert.equal(w.parse('06:30'),390);
assert.equal(w.parse('23:59'),1439);
assert.equal(w.parse('24:00',77),77);
assert.equal(w.parse('anything',77),77);
assert.equal(w.parse(-1),1439);
const noon=w.sample(720),midnight=w.sample(0),dawn=w.sample(360),dusk=w.sample(1080);
assert.equal(noon.phase,'day');
assert.equal(midnight.phase,'night');
assert.ok(dawn.daylight<noon.daylight);
assert.ok(dusk.daylight<noon.daylight);
assert.equal(noon.timeText,'12:00');
assert.ok(noon.lightDirection[1]>.6,'daylight sun is above the battlefield');
assert.ok(midnight.lightDirection[1]>.6,'night uses moonlight direction');
assert.ok(noon.nightFactor<.01);
assert.ok(midnight.nightFactor>.99);
assert.notEqual(JSON.stringify(noon.lightDirection),JSON.stringify(dusk.lightDirection));
const clock=w.create({startMinutes:1380,minutesPerSecond:1});
clock.tick(70);
assert.ok(clock.minutes>=1381.99&&clock.minutes<=1382.01,
 'frame hitch is capped, avoiding huge unobserved time jumps');
clock.setPaused(true);const before=clock.minutes;clock.tick(1);
assert.equal(clock.minutes,before);
clock.setTime('23:59');clock.setPaused(false);clock.tick(1);
assert.equal(clock.snapshot().timeText,'00:00');
clock.setRate(10);clock.tick(1);
assert.equal(clock.snapshot().timeText,'00:10');
for(const id of ['forest','clearing','street','hall']){
 const day=look.evaluate(id,noon),night=look.evaluate(id,midnight);
 assert.ok(day.ambient>night.ambient,id+' sun light must dim at night');
 assert.ok(day.background[0]>night.background[0],id+' clear sky must darken');
 assert.ok(day.fogDensity>0&&night.fogDensity>0);
 assert.notEqual(JSON.stringify(day.sunDirection),JSON.stringify(night.sunDirection));
 assert.equal(day.nightFactor,0);
 assert.equal(night.nightFactor,1);
 // A single global clock samples the new scene WITHOUT resetting its minute.
 assert.ok(clock.snapshot().minutes>=10);
}
assert.equal(look.evaluate('street',noon).nightFactor,0,'street lights off by day');
assert.equal(look.evaluate('street',midnight).nightFactor,1,'street lights on at night');
console.log('SHARED_WORLD_CLOCK_PASS',JSON.stringify({
 phases:[noon.phase,dawn.phase,dusk.phase,midnight.phase],
 scenePresets:['forest','clearing','street','hall'],
 clock:clock.snapshot().timeText,
 sunrise:dawn.lightDirection,noon:noon.lightDirection,midnight:midnight.lightDirection
}));

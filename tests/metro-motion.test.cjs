'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const motion=require('../site/game/metro-motion.js');
const environment=require('../site/game/scene-environments.js').get('metro');
test('subway is stationary on its platform until a real departure',()=>{
 const driver=motion.create({now:()=>1200});
 const start=driver.snapshot();
 assert.equal(start.distanceMeters,0);
 assert.equal(start.speedMps,0);
 assert.equal(start.stationExposure,1);
 assert.equal(start.phase,'docked');
 assert.equal(start.moving,false);
 assert.equal(driver.snapshot(5400).distanceMeters,0,'wall-clock alone must not scroll a parked train');
 assert.equal(driver.begin(5400),true);
 assert.equal(driver.begin(5401),false,'double click cannot launch overlapping rides');
 assert.equal(driver.snapshot(5400).distanceMeters,0);
});
test('one metro leg accelerates, cruises, slows, enters another actual station, then stops',()=>{
 const {DURATION_MS:D,LEG_METERS:M}=motion;
 let last=-1,peak=0;
 const stages=new Set();
 for(let ms=0;ms<=D;ms+=40){
  const f=motion.sampleLeg(ms);
  assert.ok(f.positionMeters>=last-1e-9,'position must never run backwards');
  assert.ok(f.positionMeters<=M+1e-7);
  assert.ok(f.speedMps>=0&&f.stationExposure>=0&&f.stationExposure<=1);
  last=f.positionMeters;peak=Math.max(peak,f.speedMps);
  stages.add(f.phase);
 }
 assert.ok(peak>=12,'cruise should read as a real moving train');
 assert.equal(motion.sampleLeg(0).speedMps,0);
 assert.equal(motion.sampleLeg(D).speedMps,0);
 assert.equal(motion.sampleLeg(0).stationExposure,1);
 assert.ok(motion.sampleLeg(D*.50).stationExposure<.01,'a tunnel has NO platform');
 assert.ok(motion.sampleLeg(D*.50).speedMps>motion.sampleLeg(D*.03).speedMps);
 assert.equal(motion.sampleLeg(D).positionMeters,M);
 for(const stage of ['departing','tunnel','arriving','docked'])assert.ok(stages.has(stage),stage);
});
test('actual travel distance is continuous across multiple stations and resets only when exiting',()=>{
 const D=motion.DURATION_MS,driver=motion.create({now:()=>100});
 assert.ok(driver.begin(100));
 const atMiddle=driver.snapshot(100+D/2);
 assert.ok(atMiddle.distanceMeters>20&&atMiddle.distanceMeters<70);
 const arrived=driver.snapshot(100+D);
 assert.equal(arrived.distanceMeters,motion.LEG_METERS);
 assert.equal(arrived.speedMps,0);
 assert.equal(arrived.moving,false);
 assert.ok(driver.begin(200+D));
 const second=driver.snapshot(200+D+D/2);
 assert.ok(second.distanceMeters>motion.LEG_METERS);
 assert.equal(driver.snapshot(200+2*D).distanceMeters,motion.LEG_METERS*2);
 assert.equal(driver.reset().distanceMeters,0);
});
test('front-on passenger camera stays fixed while train movement affects only scenery',()=>{
 assert.equal(environment.camera.mode,'fixed');
 assert.equal(environment.camera.composition,'front-elevation-no-floor');
 const eye=environment.camera.eye,focus=environment.camera.focus;
 assert.equal(eye.x,focus.x,'camera must look directly at train wall');
 assert.equal(eye.y,focus.y,'keep floor out of the camera');
 assert.equal(environment.camera.fovMode,'vertical');
 assert.ok(environment.camera.fov<=50);
});

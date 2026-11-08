'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const life=require('../site/game/metro-platform-life.js');
const platform=require('../site/game/metro-platform-3d.js');
const get=(p)=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const vertices=(data)=>Array.from({length:data.length/5},(_,i)=>({x:data[i*5],y:data[i*5+1],z:data[i*5+2]}));

test('8 distinct original full-body NPC portraits share the physical 3D world, not screen-fixed HUD',()=>{
 const svg=get('site/assets/metro/commuters/metro-commuter-atlas.svg');
 assert.match(svg,/<svg[^>]*viewBox="0 0 1536 384"/);
 assert.equal(life.PROFILE.length,8);
 assert.equal(new Set(life.PROFILE.map(p=>p.id)).size,8);
 assert.deepEqual(life.PROFILE.map(p=>p.frame),[0,1,2,3,4,5,6,7]);
 assert.equal(life.CELL_WIDTH,192);
 assert.equal(life.CELL_HEIGHT,384);
 assert.ok(life.PROFILE.some(p=>p.role==='sitting'));
 assert.ok(life.PROFILE.some(p=>p.role==='boarding-left'));
 assert.ok(life.PROFILE.some(p=>p.role==='alighting-left'));
 assert.ok(!svg.includes('<image'),'all drawings belong to the repo, not remote URLs');
});
test('physical bench seating, route panels, roof lights and floor are all genuine triangle meshes',()=>{
 const geometry=platform.build();
 for(const key of ['platformBack','platformFloor','platformCeiling','platformColumns',
  'platformLightboxes','platformBenches','platformWayfinding']){
  assert.ok(geometry[key].length>=30,key);
 }
 const bench=vertices(geometry.platformBenches);
 assert.ok(bench.some(v=>Math.abs(v.y-.43)<.001));
 assert.ok(bench.some(v=>Math.abs(v.y-1.05)<.001));
 assert.ok(bench.every(v=>v.z<6.0),'benches stay behind the yellow platform edge');
 assert.ok(vertices(geometry.platformWayfinding).every(v=>v.y>=1.94));
});
test('relative motion puts all people and platform columns in one station-centred frame',()=>{
 const at0=life.sample({distanceMeters:0,doorOpen:0,dwellMs:3000});
 const away=life.sample({distanceMeters:13,doorOpen:0,dwellMs:3000});
 const next=life.sample({distanceMeters:88,doorOpen:0,dwellMs:3000});
 assert.equal(life.stationOffset(0),0);
 assert.equal(life.stationOffset(13),13);
 assert.equal(life.stationOffset(88),0);
 assert.equal(at0.station,0);assert.equal(next.station,1);
 const student0=at0.passengers.find(p=>p.id==='student');
 const studentAway=away.passengers.find(p=>p.id==='student');
 // The waiting student's fidget can differ by clock, but world x offset is exact.
 assert.ok(Math.abs(studentAway.x-student0.x+13)<1e-8);
 assert.ok(life.sample({distanceMeters:44,stationExposure:0}).passengers.length===0);
});
test('boarding and alighting are synchronized to stopped train and opening metal doors',()=>{
 const closed=life.sample({doorOpen:0,dwellMs:5000,moving:false});
 const opened=life.sample({doorOpen:1,dwellMs:1750,moving:false});
 const driving=life.sample({doorOpen:0,dwellMs:5000,moving:true});
 const left=c=>c.passengers.find(p=>p.id==='hoodie');
 const exit=c=>c.passengers.find(p=>p.id==='worker');
 assert.equal(left(closed).z,6.15,'boarder waits behind safety line');
 assert.equal(exit(closed),undefined,'alighting person remains hidden behind closed train');
 assert.ok(left(opened).z>left(closed).z);
 assert.ok(left(opened).z<8.31);
 assert.ok(exit(opened).z<8.29,'alighting traveller moves away from train');
 assert.equal(left(driving).z,6.15,'boarding disabled while coach is moving');
 assert.equal(exit(driving),undefined,'no people exiting while rolling');
 assert.ok(opened.passengers.every(p=>p.opacity>=0&&p.opacity<=1));
});
test('lamp performance is light-space, deterministic, sparse and never tied to static sprites',()=>{
 assert.equal(life.lightCue(900,0,true),0);
 assert.ok(life.lightCue(900,0,false)>.9);
 assert.ok(life.lightCue(7525,0,false)<.5);
 assert.ok(life.lightCue(8000,0,false)>.9);
 const shader=get('site/game/ring-arena-runtime.js');
 assert.match(shader,/platformLampFactor/);
 assert.match(shader,/platformLife[.]sample/);
 assert.match(shader,/uPlatformExposure,transitMode\?platformExposure\*platformLampFactor/);
 assert.match(shader,/drawPlatformCommuters\(stationLife,vp\)/);
 assert.match(shader,/commuterAtlasStatus/);
 assert.match(shader,/\['platformBenches',12\]/);
 assert.match(shader,/\['platformWayfinding',13\]/);
 assert.match(shader,/uOpacity/);
 const html=get('site/index.html');
 assert.ok(html.indexOf('metro-platform-life.js')<html.indexOf('ring-arena-runtime.js'));
});

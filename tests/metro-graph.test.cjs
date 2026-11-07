'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=path.join(__dirname,'../site/game/metro-graph.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(core,'utf8'),context);
const metro=context.window.PaperWorldMetro;
test('all playable locations have a single source of station coordinates',()=>{
 for(const id of ['entrance','school','convenience','cafe','mall','park']){
   assert.ok(metro.STATIONS[id]);
   assert.equal(typeof metro.STATIONS[id].x,'number');
 }
});
test('same-line destinations do not invent transfers',()=>{
 const trip=metro.path('entrance','convenience');
 assert.deepEqual(Array.from(trip.transfers),[]);
 assert.deepEqual(Array.from(trip.lines),['住宅线']);
 assert.equal(trip.connections,3);
});
test('inter-line travel requires a real transfer at central interchange',()=>{
 const trip=metro.path('school','park');
 assert.equal(trip.transfers.length,1);
 assert.equal(trip.transfers[0],'central');
 assert.deepEqual(Array.from(trip.lines),['住宅线','环城线']);
});
test('future areas are not silently routable',()=>{
 assert.equal(metro.path('hospital','school'),null);
 assert.equal(metro.path('school','police'),null);
});
test('train conversations derive from day and pressure stage',()=>{
 const first=metro.conversation({stage:1,day:1,news:['城市生活']},
   metro.path('entrance','school'));
 assert.equal(first.length,3);
 assert.match(first[2].text,/城市生活/);
 const later=metro.conversation({stage:3,day:20,news:['联合调查']},
   metro.path('school','mall'));
 assert.match(later[2].text,/联合调查/);
});

test('line segment neighbors offer both real directions at intermediate stations',()=>{
 const line=metro.getLine('a'),options=metro.neighbors(line,'school');
 assert.equal(options.length,2);
 assert.deepEqual(options.map(o=>o.to),['central','entrance']);
 const ring=metro.getLine('b');
 assert.equal(ring.ring,true);
 assert.equal(metro.nextStop('b','northgate',1),'central');
 assert.equal(metro.nextStop('b','central',-1),'northgate');
});
test('metro board, next stop, transfer and 22:00 loop persist in world state',()=>{
 const world={window:{}};
 vm.runInNewContext(fs.readFileSync(core,'utf8'),world);
 const filename=path.join(__dirname,'../site/game/daily-life-state.js');
 world.module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),world);
 const life=world.module.exports;
 const storeData=new Map(),store={
  getItem:key=>storeData.get(key)||null,setItem:(key,val)=>storeData.set(key,val)
 };
 const e=life.create({storage:store});
 assert.equal(e.metroBoard('a',1).ok,false,'bedroom cannot board');
 assert.equal(e.travel('entrance').ok,true);
 assert.equal(e.metroBoard('a',1).ok,true);
 assert.equal(e.metroNext().station,'school');
 assert.equal(e.metroNext().station,'central');
 assert.equal(e.metroExit().station,'central');
 assert.equal(e.snapshot().location,'central');
 assert.equal(e.metroBoard('b',1).ok,true);
 assert.equal(e.metroNext().station,'cafe');
 const anomaly=e.metroRideToNight();
 assert.equal(anomaly.ok,true);
 assert.equal(anomaly.anomaly,true);
 assert.equal(e.snapshot().minute,1320);
 assert.equal(e.snapshot().nightStatus,'recalled');
 assert.equal(e.snapshot().metro.onboard,true);
 assert.equal(life.create({storage:store}).snapshot().metro.anomaly,true);
});

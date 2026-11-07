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

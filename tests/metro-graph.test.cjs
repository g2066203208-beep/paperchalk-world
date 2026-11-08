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
 assert.deepEqual(Array.from(options,o=>o.to),['central','entrance']);
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


test('Kirihama has exactly ten genuine lines, 170 separate stops and 19 physical interchanges',()=>{
 assert.equal(metro.LINES.length,10);
 assert.equal(Object.keys(metro.STATIONS).length,170);
 assert.equal(Object.values(metro.STATIONS).filter(s=>s.transfer).length,19);
 const routes=new Set();
 for(const line of metro.LINES){
  assert.ok(line.stops.length>=4,'not a true line: '+line.name);
  for(const station of line.stops){
   assert.ok(metro.STATIONS[station],'dangling stop on '+line.name);
   routes.add(station);
  }
  for(let i=1;i<line.stops.length;i++){
   assert.equal(metro.nextStop(line.id,line.stops[i-1],1),line.stops[i]);
   assert.equal(metro.nextStop(line.id,line.stops[i],-1),line.stops[i-1]);
  }
 }
 assert.equal(routes.size,170);
 for(const station of routes){
  assert.ok(metro.path('entrance',station),'station cannot be reached: '+station);
  assert.ok(metro.path(station,'entrance'),'station cannot return: '+station);
 }
});

test('a newly-authored station can actually be boarded and exited in the daily-life engine',()=>{
 const game={window:{}};
 vm.runInNewContext(fs.readFileSync(core,'utf8'),game);
 game.module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../site/game/daily-life-state.js'),'utf8'),game);
 const e=game.module.exports.create();
 assert.equal(e.travel('entrance').ok,true);
 assert.ok(game.module.exports.LOCATIONS['kh-e-11']);
 assert.equal(e.metroBoard('e',1).ok,true);
 const target=e.metroNext();
 assert.equal(target.ok,true);
 assert.equal(target.station,'kh-e-11');
 assert.equal(e.metroExit().ok,true);
 assert.equal(e.snapshot().location,'kh-e-11');
});

test('website always builds the complete subway station registry before game state',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
 const graph=html.indexOf('src="./game/metro-graph.js?');
 const life=html.indexOf('src="./game/daily-life-state.js?');
 assert.ok(graph>=0&&life>graph,'DailyLife must not initialize before MetroGraph');
 assert.equal(html.split('src="./game/metro-graph.js?').length,2,
  'MetroGraph should be evaluated once, not duplicated');
});

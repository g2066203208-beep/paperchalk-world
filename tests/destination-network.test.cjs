'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),window={};
for(const name of ['world-atlas','metro-graph','destination-network']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/game/'+name+'.js'),'utf8'),
 {window,console},{filename:name+'.js'});
}
const A=window.PaperWorldAtlas,M=window.PaperWorldMetro,N=window.PaperWorldDestinationNetwork;
test('all authored destinations have one station on a real two-way street/rail graph',()=>{
 const audit=N.audit();
 assert.equal(audit.cities,10);
 assert.equal(audit.locations,A.POIS.length);
 assert.ok(audit.locations>=120);
 assert.equal(audit.accessLines,40);
 assert.deepEqual(Array.from(audit.unreachable),[]);
 assert.deepEqual(Array.from(audit.oneWay),[]);
 const pinned=new Set(N.ACCESS_ROUTES.flatMap(r=>Array.from(r.stops)));
 for(const p of A.POIS)assert.ok(pinned.has(p.id),'no unconnected image pin: '+p.name);
 for(const c of A.CITIES)assert.ok(pinned.has(N.HUB(c.id)),'no isolated hub: '+c.id);
});
test('a destination is reachable from the player and always has a reverse leg',()=>{
 for(const p of A.POIS){
  const outward=N.journey('entrance',p.id),back=N.journey(p.id,'entrance');
  if(p.id==='entrance'){
   assert.equal(outward.minutes,0);assert.equal(back.minutes,0);continue;
  }
  assert.ok(outward?.legs.length,'outbound route missing: '+p.id);
  assert.ok(back?.legs.length,'return route missing: '+p.id);
  assert.equal(outward.stops.at(-1),p.id);
  assert.equal(back.stops.at(-1),'entrance');
  assert.ok(outward.legs.every(x=>x.minutes>0));
  assert.ok(back.legs.every(x=>x.minutes>0));
  assert.equal(outward.minutes,back.minutes,'two-way route differs: '+p.id);
 }
});
test('real subway stations preserve canonical grid coordinates across the independent journey graph',()=>{
 for(const [id,s] of Object.entries(M.STATIONS)){
  if(s.locked)continue;
  const p=N.at(id);
  assert.ok(p,'missing active subway station '+id);
  assert.equal(p.x,Math.round((840+s.gx*40)/40)*40);
  assert.equal(p.y,Math.round((480+s.gy*40)/40)*40);
 }
 const w=N.journey('school','entrance'),e=N.journey('entrance','school');
 assert.ok(w&&e);
});
test('regional rail, bus, highway and ferry links lead only to real city hubs',()=>{
 const cities=new Set(A.CITIES.map(c=>N.HUB(c.id)));
 for(const l of N.ROUTES.filter(l=>l.kind==='regional'))
  assert.ok(l.stops.every(s=>cities.has(s)),l.id+' invented a station');
 assert.ok(N.ROUTES.some(l=>l.mode==='ferry'));
 assert.ok(N.ROUTES.some(l=>l.mode==='metro'));
 assert.ok(!N.ROUTES.some(l=>l.stops.some(id=>M.STATIONS[id]?.locked)));
});
test('map code does not import a geographic backdrop or teleport to fake addresses',()=>{
 const map=fs.readFileSync(path.join(root,'site/game/transit-map-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 assert.ok(!map.includes('pw-dot-geography'));
 assert.ok(!map.includes('pw-dot-terrain-land'));
 assert.ok(!map.includes('for(const l of atlas.LOCAL_TRANSIT_LINES)'),
  'bus/tram lines must not be rendered in the subway view');
 assert.ok(!map.includes('for(const l of network.ACCESS_ROUTES)'),
  'walking roads must not be rendered in the subway view');
 assert.ok(!map.includes("node=element('button','pw-dot-poi"),
  'generic destinations cannot become subway station cards');
 assert.ok(map.includes('previewMetroRoute(trip)'));
 assert.ok(map.includes('for(const l of metro.LINES)'));
 assert.ok(map.includes('name=station.label'));
 assert.ok(html.includes('destination-network.js'));
});


test('cross-city map actions invoke the actual travel engine rather than only opening a city diagram',()=>{
 const map=fs.readFileSync(path.join(root,'site/game/transit-map-ui.js'),'utf8');
 assert.match(map,/network\\.journey\\(here,destination\\)/);
 assert.match(map,/onWorldTravel\\?\\.\\(destination,journey\\)/);
 assert.match(map,/disabled:!viable\\|\\|!canRide/);
 assert.ok(!map.includes('availability?.(id,snapshot)'),
  'subway travel must not be blocked by the nearby school/store opening hours');
 assert.match(map,/if\\(!popup\\.hidden&&selected\\?\\.isConnected\\)positionPopup/);
});
test('world travel state can physically reach and return from a regional interchange',()=>{
 const game={window:{}};
 for(const filename of ['world-atlas','metro-graph','destination-network']){
  vm.runInNewContext(fs.readFileSync(path.join(root,'site/game/'+filename+'.js'),'utf8'),game);
 }
 game.module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'site/game/daily-life-state.js'),'utf8'),game);
 const engine=game.module.exports.create();
 assert.equal(engine.travel('entrance').ok,true);
 const outbound=engine.travel('hub-shiomi');
 assert.equal(outbound.ok,true,outbound.reason);
 assert.equal(engine.snapshot().location,'hub-shiomi');
 const returned=engine.travel('entrance');
 assert.equal(returned.ok,true,returned.reason);
 assert.equal(engine.snapshot().location,'entrance');
});

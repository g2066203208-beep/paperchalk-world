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
  assert.ok(outward?.legs.length,'outbound route missing: '+p.id);
  assert.ok(back?.legs.length,'return route missing: '+p.id);
  assert.equal(outward.stops.at(-1),p.id);
  assert.equal(back.stops.at(-1),'entrance');
  assert.ok(outward.legs.every(x=>x.minutes>0));
  assert.ok(back.legs.every(x=>x.minutes>0));
  assert.equal(outward.minutes,back.minutes,'two-way route differs: '+p.id);
 }
});
test('all metro-photo pins use the actual game subway coordinates and original station identities',()=>{
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
 assert.ok(map.includes('pw-dot-destination-stop'));
 assert.ok(map.includes('previewRegionalRoute(trip?.legs)'));
 assert.ok(html.includes('destination-network.js'));
});

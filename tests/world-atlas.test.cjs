'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const test=require('node:test');
const path=require('node:path');
const scope={window:{}};
for(const name of ['kirihama-location-plan','world-atlas'])
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../site/game/'+name+'.js'),'utf8'),scope);
const atlas=scope.window.PaperWorldAtlas;
test('Ten distinct settlements and 211 authored region sites, including 120 Kirihama locations',()=>{
 assert.equal(atlas.CITIES.length,10);
 assert.equal(atlas.POIS.length,211);
 assert.equal(atlas.POIS.filter(p=>p.city==='kirihama').length,120);
 assert.equal(new Set(atlas.POIS.map(p=>p.id)).size,atlas.POIS.length);
 for(const p of atlas.POIS){
  assert.ok(atlas.CITY_BY_ID[p.city],p.id);
  assert.ok(atlas.PHOTOS[p.photo],p.id+' photo missing');
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),p.id);
  assert.ok(p.x>=0&&p.x<=atlas.SIZE.width,p.id);
  assert.ok(p.y>=0&&p.y<=atlas.SIZE.height,p.id);
 }
});
test('Travel network connects every pair of metropolitan cities',()=>{
 for(const a of atlas.CITIES)for(const b of atlas.CITIES){
  const route=atlas.route(a.id,b.id);
  assert.ok(route,a.name+' -> '+b.name);
  if(a.id!==b.id){
   assert.ok(route.legs.length>=1,a.name+' -> '+b.name);
   assert.ok(route.minutes>0);
   assert.equal(route.legs[0].from,a.id);
   assert.equal(route.legs.at(-1).to,b.id);
  }
 }
});
test('Metro services are distinct from cross-city rail, coaches and ferries',()=>{
 assert.ok(atlas.METRO_LINES.length>=9);
 assert.ok(atlas.METRO_STOPS.length>=110);
 for(const l of atlas.METRO_LINES){
  assert.ok(atlas.CITY_BY_ID[l.city]);
  assert.ok(l.coords.every(p=>Math.hypot(p.x-atlas.CITY_BY_ID[l.city].x,
   p.y-atlas.CITY_BY_ID[l.city].y)<315));
 }
 assert.ok(atlas.LINKS.some(l=>l.mode==='ferry'));
 assert.ok(atlas.LINKS.some(l=>l.mode==='coach'));
 assert.ok(atlas.LINKS.some(l=>l.mode==='localrail'));
 assert.ok(atlas.LINKS.some(l=>l.mode==='highway'));
 for(const l of atlas.LINKS){
  assert.ok(l.stops.length>=2);
  for(const id of l.stops)assert.ok(atlas.CITY_BY_ID[id],l.id+' '+id);
 }
});
test('Fictional rumor index is grounded in visitable world coordinates',()=>{
 assert.ok(atlas.SITES.length>=45);
 for(const p of atlas.SITES)assert.ok(atlas.POI_BY_ID[p.place]);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const env=require('../site/game/scene-environments.js');
test('the train is a replaceable 3D environment asset on the original battle geometry',()=>{
 const metro=env.get('metro'),shop=env.get('convenience');
 assert.ok(metro&&shop);
 assert.equal(metro.wall.width,2172);
 assert.equal(metro.wall.height,724);
 assert.match(metro.wall.url,/cabin-master-illustrated\.webp$/);
 assert.notEqual(metro.wall.url,shop.wall.url);
 assert.equal(metro.wall.alphaWindows,true);
 assert.ok(Math.abs(metro.geometry.widthMeters/metro.geometry.heightMeters-(2172/724))<.06);
 for(const id of ['metro','convenience']){
  const e=env.get(id);
  for(const file of [e.wall.url,e.floor,e.ceiling])
   assert.ok(fs.existsSync(path.resolve(__dirname,'../site',file.replace(/^\.\//,''))),
    id+': '+file+' not registered');
 }
});
test('all city services have real named stops, with metro only in urban cities',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.resolve(__dirname,'../site/game/world-atlas.js'),'utf8'),scope={window:{}};
 vm.runInNewContext(source,scope);
 const a=scope.window.PaperWorldAtlas;
 const cities=new Set(a.LOCAL_TRANSIT_LINES.map(l=>l.city).concat('kirihama'));
 assert.equal(cities.size,10);
 assert.equal(a.LOCAL_TRANSIT_LINES.length,11);
 for(const route of a.LOCAL_TRANSIT_LINES){
  assert.ok(route.stops.length>=3);
  for(const id of route.stops){
   const stop=a.POI_BY_ID[id];
   assert.ok(stop);
   assert.equal(stop.city,route.city);
   assert.ok(stop.name&&!/\d+站$/.test(stop.name));
  }
  if(['naruba','okuzawa','homori','misaki','mizuho','urasima'].includes(route.city))
   assert.equal(route.mode,'bus');
 }
});

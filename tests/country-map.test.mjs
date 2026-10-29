import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD_WIDTH,WORLD_HEIGHT,REGIONS} from '../site/world/national-atlas.js';
import {DISTRICTS,SETTLEMENTS,TRANSPORT_SEGMENTS,districtAt,settlementsInBounds,transportInBounds,describeMapLocation} from '../site/world/country-detail.js';
test('large country has an indexed 12 by 8 administrative grid and 960 stable named locations',()=>{
 assert.equal(DISTRICTS.length,96);assert.equal(SETTLEMENTS.length,960);
 assert.equal(new Set(SETTLEMENTS.map(p=>p.id)).size,960);
 assert.equal(new Set(DISTRICTS.map(p=>p.id)).size,96);
 for(const s of SETTLEMENTS){assert.ok(s.name&&s.x>=0&&s.x<WORLD_WIDTH&&s.y>=0&&s.y<WORLD_HEIGHT);assert.ok(districtAt(s.x,s.y));}
 const near=describeMapLocation(125,112);assert.ok(near.district&&near.region&&near.nearby.length>0);
});
test('transport layers have dense rural access roads, region highways, and long-distance rail/sea',()=>{
 const roads=TRANSPORT_SEGMENTS.filter(s=>s.mode==='road');
 assert.ok(roads.length>=900);
 assert.ok(TRANSPORT_SEGMENTS.some(s=>s.mode==='rail'));
 assert.ok(TRANSPORT_SEGMENTS.some(s=>s.mode==='sea'));
 assert.ok(transportInBounds(0,0,360,240).length>=900);
 assert.ok(transportInBounds(115,100,135,120,'road').length>0);
 assert.ok(settlementsInBounds(0,0,360,240,'regional').length>=90);
 assert.ok(settlementsInBounds(0,0,360,240,'town').length>=200);
 assert.ok(settlementsInBounds(0,0,360,240,'village').length===960);
});
test('country geography is deterministically addressable from border to border',()=>{
 for(const [x,y] of [[0,0],[359,239],[125,112],[300,30],[92,78]]){
  const a=describeMapLocation(x,y),b=describeMapLocation(x,y);
  assert.deepEqual(a,b);
 }
 assert.equal(districtAt(-1,5),null);
 assert.equal(districtAt(360,5),null);
});

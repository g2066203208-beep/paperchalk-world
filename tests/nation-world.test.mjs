import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRY,REGIONS,STATIONS,NETWORK,MODE,terrainAt,roadGridAt,buildingAt,buildingsInBlock,
 resolveBuilding,interiorFor,allEdges,routeBetween,positionOnRoute} from '../site/nation/world-model.js';
import {runtime,createWorld,applyWorld} from '../site/core/game.js';
import {initialGame} from '../site/engine.js';
const state=initialGame();
const run=(w,type,more={})=>applyWorld(w,{module:'nation',type,...more},{...state,cash:12000});
test('a 1024 km square address space can be addressed without global allocation',()=>{
 assert.equal(COUNTRY.size*COUNTRY.metersPerTile/1000,1024);
 assert.equal(COUNTRY.chunk,32);
 assert.ok(REGIONS.length>=12);
 assert.ok(new Set(REGIONS.map(r=>r.id)).size===REGIONS.length);
 assert.deepEqual(terrainAt(10,1800).kind,'sea');
 assert.notEqual(terrainAt(940,2050).kind,'sea');
 assert.equal(terrainAt(5000,5000).kind,'outside');
});
test('all historic 48 property deed IDs correspond to stable addressable distinct buildings',()=>{
 const w=createWorld(state);
 const result=[];
 for(let i=0;i<48;i++){
  const x=934+(i%12)*4,y=2041+Math.floor(i/12)*4;
  const b=buildingAt(x,y,0,w.slices.estates);
  assert.ok(b,'failed property '+i);
  assert.equal(b.property,'lot-'+i);
  assert.equal(resolveBuilding(b.id,w.slices.estates).id,b.id);
  result.push(b.id);
 }
 assert.equal(new Set(result).size,48);
});
test('rural land is real geography with farms, forests and mines, not 16 identical city cards',()=>{
 for(const region of REGIONS){
  const buildings=[...Array(10)].flatMap((_,i)=>buildingsInBlock(Math.round(region.x)+i+1,Math.round(region.y)+i+2));
  assert.ok(buildings.length>0,region.name+' needs enterable local buildings');
  const building=buildings[0],room=interiorFor(building);
  assert.ok(room.fixtures.length>=5);
  assert.ok(room.characters.length>=2);
  assert.ok(new Set(room.fixtures.map(f=>f.id)).size===room.fixtures.length);
  assert.equal(interiorFor(building).id,room.id);
 }
});
test('road, rail and sea each have actual connected paths with distances and intermediate stations',()=>{
 for(const mode of Object.keys(MODE)){
  const edges=allEdges(mode);assert.ok(edges.length>=2);
  for(const edge of edges){
   assert.ok(edge.km>0&&STATIONS.some(s=>s.id===edge.a)&&STATIONS.some(s=>s.id===edge.b));
  }
 }
 const road=routeBetween('oldport','eastcity','road');
 assert.ok(road&&road.points.length>=4&&road.km>100);
 assert.equal(road.points[0].id,'oldport');
 assert.equal(road.points.at(-1).id,'eastcity');
 const rail=routeBetween('nightcity','mines','rail');
 assert.ok(rail&&rail.points.length>=2);
 const sea=routeBetween('northport','southport','sea');
 assert.ok(sea&&sea.km>100);
 assert.equal(routeBetween('oldport','eastcity','sea'),null);
 const mid=positionOnRoute(road,.52);
 assert.ok(mid&&Number.isFinite(mid.x)&&Number.isFinite(mid.y));
 assert.deepEqual(positionOnRoute(road,0),{x:road.points[0].x,y:road.points[0].y});
 assert.deepEqual(positionOnRoute(road,1),{x:road.points.at(-1).x,y:road.points.at(-1).y});
});
test('nation arrival, walking, entering, discovering, exiting and existing economy survive save load',()=>{
 let w=createWorld(state);
 assert.ok(w.slices.nation);
 assert.equal(w.slices.nation.station,'oldport');
 const p=buildingAt(938,2049,0,w.slices.estates);
 assert.ok(p);
 let r=run(w,'enter',{building:p.id});assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(w.slices.nation.inside,p.id);
 assert.equal(w.slices.nation.visited.length,1);
 const obj=interiorFor(p).fixtures[0];
 r=run(w,'inspect',{object:obj.id});assert.equal(r.ok,true,r.message);w=r.state;
 assert.equal(w.slices.nation.discoveries[0].id,obj.id);
 r=run(w,'exit');assert.equal(r.ok,true);w=r.state;
 assert.equal(w.slices.nation.inside,null);
 const after=JSON.parse(JSON.stringify(w));
 assert.equal(createWorld({...state,day:after.day},after).slices.nation.visited[0],p.id);
 r=run(w,'depart',{to:'capital',mode:'road'});assert.equal(r.ok,true,r.message);w=r.state;
 assert.ok(r.effects.some(e=>e.kind==='cash'&&e.amount<0));
 assert.ok(w.slices.nation.journey.path.points.length>=3);
 r=run(w,'arrive');assert.equal(r.ok,true);w=r.state;
 assert.equal(w.slices.nation.station,'capital');
 assert.equal(w.slices.nation.arrivals,1);
 assert.equal(run(w,'arrive').ok,false);
});
test('cannot cross nonadjacent blocks or enter distant buildings; no unexplained route teleport',()=>{
 let w=createWorld(state);
 const distant=buildingAt(980,1991,0,w.slices.estates);
 if(distant)assert.equal(run(w,'enter',{building:distant.id}).ok,false);
 assert.equal(run(w,'walk',{x:2000,y:1800}).ok,false);
 assert.equal(run(w,'walk',{x:10,y:1800}).ok,false);
 const sea=run(w,'depart',{to:'eastcity',mode:'sea'});
 assert.equal(sea.ok,false);
});

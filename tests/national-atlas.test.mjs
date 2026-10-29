import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD_WIDTH,WORLD_HEIGHT,WORLD_AREA,REGIONS,LINKS,terrainAt,facilitiesAt,regionAt,
 playerDistricts,atlasViewport,routeBetween} from '../site/world/national-atlas.js';
test('national atlas coordinates are stable, bounded and generated lazily',()=>{
 assert.equal(WORLD_AREA,86400);assert.equal(WORLD_WIDTH,360);assert.equal(WORLD_HEIGHT,240);
 assert.equal(terrainAt(-1,0),null);assert.equal(terrainAt(360,2),null);
 assert.deepEqual(terrainAt(127,112),terrainAt(127,112));
 assert.notDeepEqual(terrainAt(127,112),terrainAt(247,114));
 const tiles=atlasViewport(125,112,13,9);
 assert.equal(tiles.length,117);
 assert.ok(tiles.every(t=>Array.isArray(t.facilities)));
 assert.equal(atlasViewport(0,0,13,9).length,35,'clip visible tiles at national border');
});
test('real regions exist for urban, forestry, mining, shipping, farming and rail corridors',()=>{
 assert.ok(REGIONS.length>=12);
 for(const r of REGIONS)assert.equal(regionAt(r.x,r.y).id,r.id);
 for(const kind of ['forest','mining','harbor','farmland','industrial','shipyard'])assert.ok(REGIONS.some(r=>r.biome===kind));
 for(const edge of LINKS){assert.ok(REGIONS.some(r=>r.id===edge.a));assert.ok(REGIONS.some(r=>r.id===edge.b));assert.ok(['road','rail','sea'].includes(edge.mode));}
});
test('routes require connected transportation infrastructure',()=>{
 const same=routeBetween(REGIONS[0].id,REGIONS[0].id,'road');
 assert.equal(same.lengthKm,0);
 assert.ok(routeBetween('region-0','region-3','road')?.lengthKm>0);
 assert.ok(routeBetween('region-2','region-11','sea')?.stops.length>=2);
 assert.ok(routeBetween('region-6','region-5','rail')?.stops.length>=2);
 assert.equal(routeBetween('region-9','region-4','sea'),null);
});
test('each generated building has a stable unique entrance and regional identity',()=>{
 const list=[];for(let y=105;y<118;y++)for(let x=120;x<137;x++)list.push(...facilitiesAt(x,y));
 assert.ok(list.length>20);
 assert.equal(new Set(list.map(x=>x.id)).size,list.length);
 for(const p of list){assert.ok(p.kind&&p.region);assert.ok(terrainAt(p.x,p.y));}
});
test('existing player properties project to concrete national map positions',()=>{
 const w={slices:{estates:{parcels:Array.from({length:48},(_,i)=>({id:'lot-'+i,owner:i%3===0?'player':'market',building:null}))}}};
 const lots=playerDistricts(w);
 assert.equal(lots.length,48);assert.equal(new Set(lots.map(x=>x.id)).size,48);
 assert.ok(lots.every(l=>l.x>=0&&l.x<WORLD_WIDTH&&l.y>=0&&l.y<WORLD_HEIGHT));
});

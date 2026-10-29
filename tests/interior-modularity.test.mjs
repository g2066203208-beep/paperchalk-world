import test from 'node:test';import assert from 'node:assert/strict';
import {interiors,interiorFor,createInteriorRegistry} from '../site/world/interiors.js';
import {streetBuildingsAt} from '../site/world/walkable-street.js';

test('interiors have separate registries and can add/remove scene templates without changing app or map',()=>{
 const manager=createInteriorRegistry();
 manager.register('pharmacy',{matches:()=>true,rooms:['接待区','配药室','库存室','员工室']});
 assert.deepEqual(manager.registered(),['pharmacy']);
 const sample={id:'test-270',name:'药店',street:'新街270号'};
 assert.equal(manager.build(sample).template,'pharmacy');
 assert.equal(manager.build(sample).layout[2].id,'test-270-room-2');
 assert.ok(manager.remove('pharmacy'));
 assert.equal(manager.build(sample).template,'generic');
 assert.throws(()=>manager.register('broken',{matches:()=>true,rooms:['a']}),/invalid/);
});
test('registered interiors are per-building deterministic and their names are not global shared state',()=>{
 assert.ok(interiors.registered().length>=7);
 const city=streetBuildingsAt(125,112);
 const factory=streetBuildingsAt(247,114);
 const all=[...city,...factory].map(interiorFor);
 assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 assert.equal(new Set(all.flatMap(x=>x.layout.map(y=>y.id))).size,all.length*4);
 assert.ok(all.some(x=>x.room==='workshop'));
 assert.deepEqual(interiorFor(city[0]),interiorFor(city[0]));
});

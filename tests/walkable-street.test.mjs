import test from 'node:test';import assert from 'node:assert/strict';
import {streetBuildingsAt,findStreetPath,interiorFor,canStandAt} from '../site/world/walkable-street.js';

test('one city kilometre is full of distinct streets and stable building entrances',()=>{
 const a=streetBuildingsAt(125,112),b=streetBuildingsAt(125,112);
 assert.deepEqual(a,b);
 assert.ok(a.length>=10,'visible city tile is not just two generic background buildings');
 assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 for(const unit of a){
  assert.ok(unit.doorX>=unit.x&&unit.doorX<=unit.x+unit.w);
  assert.ok(unit.doorY>unit.y+unit.h);
  assert.ok(canStandAt(unit.doorX,unit.doorY,a),'doors must be physically reachable');
 }
});
test('all buildings have persistent unique interiors with rooms and positions',()=>{
 const places=[...streetBuildingsAt(125,112),...streetBuildingsAt(247,114)];
 const rooms=places.map(interiorFor);
 assert.equal(new Set(rooms.map(x=>x.id)).size,rooms.length);
 assert.ok(rooms.every(r=>r.rooms.length===4&&r.layout.length===4));
 assert.ok(rooms.some(r=>r.room==='workshop'));
 assert.notDeepEqual(rooms[0],rooms[rooms.length-1]);
});
test('actual walking path travels around building collisions instead of teleporting',()=>{
 const blocks=streetBuildingsAt(125,112);
 const start={x:124,y:100};
 const reachable=blocks.filter(b=>findStreetPath(start,{x:b.doorX,y:b.doorY},blocks).length);
 assert.ok(reachable.length>=blocks.length*.65,'walking engine must reach most real doors');
 for(const b of reachable){
  const path=findStreetPath(start,{x:b.doorX,y:b.doorY},blocks);
  assert.ok(path.every(p=>canStandAt(p.x,p.y,blocks)),'path crosses an occupied building: '+b.id);
  assert.equal(path.at(-1).x,b.doorX);
 }
});

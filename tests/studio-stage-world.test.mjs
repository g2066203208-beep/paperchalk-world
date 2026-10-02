import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaperStageWorld} from '../studio/world/PaperStageWorld.mjs';

test('the whole explorable route is one continuous full-depth paper ground',()=>{
  const world=createPaperStageWorld();
  assert.equal(world.platforms.length,1);
  for(let x=world.bounds.minX;x<=world.bounds.maxX;x+=.125){
    for(const z of [-30,-7.8,-4,0,2.9]){
      const candidates=world.floorCandidates(x,0,z);
      assert.equal(candidates.length,1,`hole at ${x}, ${z}`);
      assert.equal(candidates[0].platformId,'ground');
      assert.equal(candidates[0].oneWay,false);
      assert.ok(candidates[0].normal.y>.98);
    }
  }
  assert.equal(world.surfaceY(0),world.spawn.y);
});

test('every fold is position-continuous with unit outward support normals',()=>{
  const world=createPaperStageWorld(),profile=world.platforms[0].profile;
  for(const point of profile.slice(1,-1)){
    assert.ok(Math.abs(world.surfaceY(point.x-1e-5)-world.surfaceY(point.x+1e-5))<1e-5);
    const normal=world.groundBelow(point.x,3).normal;
    assert.ok(Math.abs(Math.hypot(normal.x,normal.y)-1)<1e-10);
  }
});

test('world geometry is immutable and invalid positions cannot supply a floor',()=>{
  const world=createPaperStageWorld();
  assert.throws(()=>{world.platforms[0].profile[0].y=99;},TypeError);
  assert.deepEqual(world.floorCandidates(NaN),[]);
  assert.deepEqual(world.floorCandidates(0,-1),[]);
  assert.equal(world.surfaceY(40),null);
  assert.equal(world.surfaceY(0,4),null);
  assert.equal(world.platformAt('missing'),null);
});

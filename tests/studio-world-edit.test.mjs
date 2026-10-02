import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../studio/world/PaperWorld.mjs';

const columns = Array.from({ length: 5 }, (_, index) => ({ x: index - 2, z: 0, h: 1 }));

test('dig and place update the cell source of truth, surface and collision', () => {
  const world = createWorld(columns);
  const changes = [];
  world.subscribe(change => changes.push(change));
  assert.equal(world.surfaceY(0), 1.5);
  assert.equal(world.collidesAABB({ minX: -.2, maxX: .2, minY: 1.1, maxY: 1.4 }), true);

  assert.deepEqual(world.digColumn(0), { changed: true, action: 'dig', x: 0, y: 1, z: 0, solid: true });
  assert.equal(world.surfaceY(0), .5);
  assert.equal(world.isSolidCell(0, 1), false);
  assert.equal(world.collidesAABB({ minX: -.2, maxX: .2, minY: 1.1, maxY: 1.4 }), false);
  assert.equal(world.placeColumn(0).changed, true);
  assert.equal(world.surfaceY(0), 1.5);
  assert.equal(world.digColumn(0).changed, true);
  assert.equal(world.surfaceY(0), .5);
  assert.equal(world.placeCell(0, 1).changed, true);
  assert.equal(world.surfaceY(0), 1.5);
  assert.equal(world.placeCell(0, 1).changed, false);
  assert.equal(changes.length, 4);
  assert.deepEqual(changes.map(change => change.action), ['dig', 'place', 'dig', 'place']);
});

test('explicit cell edits support holes while columns expose their highest visible paper surface', () => {
  const world = createWorld([{ x: 0, z: 0, bottom: 0, h: 2 }]);
  assert.equal(world.digCell(0, 1).changed, true);
  assert.equal(world.isSolidCell(0, 0), true);
  assert.equal(world.isSolidCell(0, 1), false);
  assert.equal(world.isSolidCell(0, 2), true);
  assert.equal(world.surfaceY(0), 2.5);
  assert.equal(world.queryTiles({ minX: -.4, maxX: .4, minY: .6, maxY: 1.4 }).length, 0);
  assert.deepEqual(world.getColumnRecords(), [{ x: 0, z: 0, h: 2 }]);
});

test('world state is deterministic and restores edits without changing the lane', () => {
  const world = createWorld(columns);
  world.digCell(-1, 1);
  world.placeCell(3, 3);
  const state = world.exportState();
  assert.equal(world.serialize(), JSON.stringify(state));
  assert.deepEqual(state.cells, ['-2,0', '-2,1', '-1,0', '0,0', '0,1', '1,0', '1,1', '2,0', '2,1', '3,3']);

  const restored = createWorld(columns);
  assert.equal(restored.restore(JSON.stringify(state)), true);
  assert.deepEqual(restored.exportState(), state);
  assert.equal(restored.surfaceY(-1), .5);
  assert.equal(restored.surfaceY(3), 3.5);
  assert.equal(restored.restore({ ...state, laneZ: 1 }), false);
  assert.deepEqual(restored.exportState(), state);
});

test('invalid edits and listener failures do not corrupt the world', () => {
  const world = createWorld([{ x: 0, z: 0, h: 0 }]);
  world.subscribe(() => { throw new Error('view failed'); });
  assert.throws(() => world.placeCell(.5, 1), /safe integer/);
  assert.equal(world.digCell(0, 4, 1).changed, false);
  assert.equal(world.isSolidCell(0, 0), true);
  assert.equal(world.restore('{'), false);
  assert.equal(world.restore({ format: 'paperworld-grid', version: 1, laneZ: 0, gridBounds: world.bounds, cells: [] }), false);
  assert.equal(world.placeCell(0, 1).changed, true);
  assert.equal(world.surfaceY(0), 1.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { TerrainPlayerSimulation } from '../studio/core/TerrainPlayerSimulation.mjs';
import { DensityTerrainWorld } from '../studio/world/DensityTerrainWorld.mjs';

const DT = 1 / 60;
function world(density, spawn = { x: 0, y: 0, z: 0 }) {
  return { density, step: .5, revision: 0, spawn, bounds: { minX: -20, maxX: 20, minY: -8, maxY: 10 },
    surfaceY() { throw new Error('Local collision must never use the highest surface.'); } };
}
function advance(simulation, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) simulation.update(DT, input);
  return simulation.snapshot();
}

test('density capsule accelerates, stops and jumps back onto a flat floor', () => {
  const simulation = new TerrainPlayerSimulation(world((x, y) => y));
  advance(simulation, .5, { horizontal: 1 });
  assert.equal(simulation.vx, simulation.options.speed);
  assert.ok(simulation.grounded);
  advance(simulation, .3);
  assert.equal(simulation.vx, 0);
  simulation.update(DT, { jumpPressed: true });
  let apex = simulation.y;
  for (let i = 0; i < 100; i++) { simulation.update(DT); apex = Math.max(apex, simulation.y); assert.equal(simulation.collidesAt(), false); }
  assert.ok(apex > 1.15 && apex < 1.3);
  assert.ok(Math.abs(simulation.y) < .003);
  assert.equal(simulation.grounded, true);
});

test('capsule follows continuous slopes uphill and downhill without jumping or floating', () => {
  const terrain = world((x, y) => y - x * .5, { x: 0, y: .06, z: 0 });
  const simulation = new TerrainPlayerSimulation(terrain);
  advance(simulation, .3);
  const start = simulation.snapshot();
  for (let i = 0; i < 100; i++) {
    simulation.update(DT, { horizontal: 1 });
    assert.equal(simulation.collidesAt(), false);
    assert.equal(simulation.grounded, true);
    assert.ok(Math.abs(simulation.y - simulation.x * .5) < .07);
  }
  assert.ok(simulation.x > 5 && simulation.y > 2.5);
  for (let i = 0; i < 100; i++) {
    simulation.update(DT, { horizontal: -1 });
    assert.equal(simulation.collidesAt(), false);
    assert.equal(simulation.grounded, true);
  }
  assert.ok(simulation.y < .5 && simulation.y >= start.y - .1);
});

test('cave motion and jumping use the local floor and roof underneath an upper terrain surface', () => {
  // Union of ground y<0 and an overhead earth slab 2.1<y<4.
  const simulation = new TerrainPlayerSimulation(world((x, y) => Math.min(y, Math.max(2.1 - y, y - 4))));
  advance(simulation, .6, { horizontal: 1 });
  assert.ok(simulation.x > 1.7 && Math.abs(simulation.y) < .003);
  simulation.update(DT, { jumpPressed: true });
  let highest = simulation.y;
  for (let i = 0; i < 100; i++) {
    simulation.update(DT);
    highest = Math.max(highest, simulation.y);
    assert.equal(simulation.collidesAt(), false);
  }
  assert.ok(highest > .4 && highest < .46);
  assert.ok(Math.abs(simulation.y) < .003);
  assert.equal(simulation.grounded, true);
  assert.equal(simulation.restore({ x: 0, y: 4.5, vy: -28 }), true);
  advance(simulation, .3);
  assert.ok(Math.abs(simulation.y - 4) < .003);
  assert.equal(simulation.grounded, true);
});

test('walls prevent sideways penetration and cannot be climbed by slope assistance', () => {
  const simulation = new TerrainPlayerSimulation(world((x, y) => Math.min(y, 2 - x)));
  advance(simulation, 2, { horizontal: 1 });
  assert.ok(Math.abs(simulation.x - 1.7) < .005);
  assert.ok(Math.abs(simulation.y) < .003);
  assert.equal(simulation.collidesAt(), false);
});

test('digging below the player removes support immediately and lands on the new local floor', () => {
  let dug = false;
  const terrain = world((x, y) => dug ? Math.max(y, Math.min(1.2 - Math.abs(x), y + 2)) : y);
  const simulation = new TerrainPlayerSimulation(terrain);
  assert.equal(simulation.grounded, true);
  dug = true; terrain.revision++;
  simulation.update(DT);
  assert.equal(simulation.grounded, false);
  assert.ok(simulation.vy < 0);
  advance(simulation, .7);
  assert.ok(Math.abs(simulation.y + 2) < .003);
  assert.equal(simulation.grounded, true);
});

test('respawn and save validation reject buried player positions; additive brushes avoid the capsule', () => {
  const terrain = world((x, y) => Math.max(y, Math.abs(x) - 2));
  const simulation = new TerrainPlayerSimulation(terrain);
  assert.equal(simulation.intersectsBrush({ x: 0, y: .8, z: 0 }, .5), true);
  assert.equal(simulation.intersectsBrush({ x: 2, y: .8, z: 0 }, .5), false);
  assert.equal(simulation.restore({ x: 0, y: -1 }), false);
  assert.equal(simulation.restore({ x: 3, y: 1 }), true);
  advance(simulation, 2);
  assert.equal(simulation.respawnCount, 1);
  assert.ok(Math.abs(simulation.x) < .001 && Math.abs(simulation.y) < .003);
  const saved = simulation.snapshot();
  assert.equal(simulation.restore(saved), true);
  assert.deepEqual(simulation.snapshot(), saved);
});

test('actual sampled terrain allows walking inside a dug tunnel below its unbroken surface', () => {
  const terrain = new DensityTerrainWorld();
  for (let x = -10; x <= -4; x += .5) terrain.digSphere({ x, y: -.5, z: 0 }, 1.45);
  const simulation = new TerrainPlayerSimulation(terrain);
  assert.equal(simulation.restore({ x: -7, y: -1.7 }), true);
  for (let i = 0; i < 50; i++) {
    simulation.update(DT, { horizontal: 1 });
    assert.equal(simulation.collidesAt(), false);
    assert.ok(simulation.y < -.9, 'Cave traversal must not snap to the roof surface.');
  }
  assert.ok(simulation.x > -4.6);
  assert.ok(simulation.grounded);
  assert.ok(terrain.surfaceY(-7, 0) > 1.5, 'The cave roof remains intact.');
});

test('steep terrain slides the capsule down instead of leaving it suspended without jump support', () => {
  const simulation = new TerrainPlayerSimulation(world((x, y) => y - x * 2, { x: 0, y: .5, z: 0 }));
  advance(simulation, .75);
  assert.ok(simulation.x < -.3 && simulation.y < -.3);
  assert.equal(simulation.collidesAt(), false);
});

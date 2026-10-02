import test from 'node:test';
import assert from 'node:assert/strict';
import { DensityTerrainWorld } from '../studio/world/DensityTerrainWorld.mjs';

test('large paper folds have planar interiors and meet continuously at a real crease', () => {
  const world = new DensityTerrainWorld();
  const ix = -2, iz = -2, span = 2.5;
  const a = world.foldHeight(ix, iz), b = world.foldHeight(ix + 1, iz);
  const c = world.foldHeight(ix, iz + 1), d = world.foldHeight(ix + 1, iz + 1);
  const height = (tx, tz) => world.authoredHeight((ix + tx) * span, (iz + tz) * span);
  for (const [tx, tz] of [[.5, .1], [.8, .25], [.9, .5]]) {
    const plane = a * (1 - tx) + b * (tx - tz) + d * tz;
    assert.ok(Math.abs(height(tx, tz) - plane) < 1e-10, 'the lower triangle stays on one plane');
    assert.ok(Math.abs(world.surfaceY((ix + tx) * span, (iz + tz) * span) - plane) < 1e-6,
      'the sampled collision surface preserves the broad plane away from its crease');
  }
  for (const [tx, tz] of [[.1, .5], [.25, .8], [.5, .9]]) {
    assert.ok(Math.abs(height(tx, tz) - (a * (1 - tz) + d * tx + c * (tz - tx))) < 1e-10,
      'the upper triangle stays on its own plane');
  }
  for (const t of [.2, .5, .8]) {
    assert.ok(Math.abs(height(t, t) - (a * (1 - t) + d * t)) < 1e-10);
    assert.ok(Math.abs(height(t + 1e-7, t) - height(t - 1e-7, t)) < 1e-6,
      'both fold faces meet without a height gap');
  }
  const lowerSlope = (b - a) / span, upperSlope = (d - c) / span;
  assert.ok(Math.abs(lowerSlope - upperSlope) > .01, 'the join changes plane direction instead of becoming a smooth curved mound');
});

test('authored volume has continuous hills, a flat spawn clearing, and a positive outer shell', () => {
  const world = new DensityTerrainWorld();
  assert.equal(world.step, .5);
  assert.equal(world.values.length, world.nx * world.ny * world.nz);
  assert.equal(world.index(2, 3, 4), (4 * world.ny + 3) * world.nx + 2);
  assert.ok(world.density(0, 0, 0) < 0);
  assert.ok(world.density(0, 2, 0) > 0);
  assert.ok(Math.abs(world.surfaceY(0, 0) - .5) < 1e-6);
  assert.ok(world.surfaceY(-7, -4) > 2.8);
  assert.ok(world.surfaceY(7, 3) > 2);
  const heights = Array.from({ length: 17 }, (_, index) => world.surfaceY(3 + index * .17, -2));
  assert.ok(new Set(heights.map(height => height.toFixed(3))).size > 12, 'slopes cannot be quantized into unit steps');
  for (let iz = 0; iz < world.nz; iz++) for (let iy = 0; iy < world.ny; iy++) for (let ix = 0; ix < world.nx; ix++) {
    if (ix === 0 || iy === 0 || iz === 0 || ix === world.nx - 1 || iy === world.ny - 1 || iz === world.nz - 1) assert.ok(world.values[world.index(ix, iy, iz)] > 0);
  }
  assert.ok(world.density(100, 0, 0) > 0);
  assert.equal(world.surfaceY(100, 0), null);
});

test('sphere subtraction creates an underground void with a floor and ceiling', () => {
  const world = new DensityTerrainWorld();
  const originalTop = world.surfaceY(0, 0);
  const result = world.digSphere({ x: 0, y: -1.75, z: 0 }, .9);
  assert.equal(result.changed, true);
  assert.ok(world.density(0, -1.75, 0) > .6, 'cave interior is air');
  assert.ok(world.density(0, -.3, 0) < 0, 'roof remains soil');
  assert.equal(world.surfaceY(0, 0), originalTop, 'digging a cave must preserve the intact ground above');
  const crossings = world.verticalCrossings(0, 0);
  assert.ok(crossings.length >= 4, 'terrain supports top, cave ceiling, cave floor, and bottom crossings');
  assert.deepEqual(crossings.slice(0, 3).map(crossing => crossing.type), ['floor', 'ceiling', 'floor']);
  assert.ok(world.density(0, -1.75, 1.5) < 0, 'the excavation is three-dimensional, not a full-depth 2D cut');
});

test('brush changes only local samples, leaves the outer shell sealed, and emits one revision', () => {
  const world = new DensityTerrainWorld();
  const before = world.values.slice();
  const events = [];
  world.subscribe(event => events.push(event));
  const center = { x: 1, y: .3, z: .4 };
  const result = world.digSphere(center, .85);
  assert.ok(result.changedSamples > 0 && result.changedSamples < 150);
  assert.equal(world.revision, 1); assert.equal(world.version, 1);
  assert.equal(events.length, 1);
  let count = 0;
  for (let iz = 0; iz < world.nz; iz++) for (let iy = 0; iy < world.ny; iy++) for (let ix = 0; ix < world.nx; ix++) {
    const index = world.index(ix, iy, iz);
    if (before[index] === world.values[index]) continue;
    count++;
    const distance = Math.hypot(world.min.x + ix * world.step - center.x, world.min.y + iy * world.step - center.y, world.min.z + iz * world.step - center.z);
    assert.ok(distance < 1.5);
    assert.ok(ix > 0 && iy > 0 && iz > 0 && ix < world.nx - 1 && iy < world.ny - 1 && iz < world.nz - 1);
  }
  assert.equal(count, result.changedSamples);
  world.digSphere({ x: 100, y: 100, z: 100 });
  assert.equal(world.revision, 1, 'an out-of-world brush is a no-op');
});

test('adding soil grows a rounded surface and gradients point from soil to air', () => {
  const world = new DensityTerrainWorld();
  const original = world.surfaceY(0, 0);
  world.addSphere({ x: 0, y: .7, z: 0 }, .85);
  assert.ok(world.surfaceY(0, 0) > original + .8);
  assert.ok(world.density(0, 1, 0) < 0);
  const normal = world.gradient(0, world.surfaceY(0, 0), 0);
  assert.ok(normal.y > .95);
  assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-6);
});

test('delta saves reproduce digs and additions exactly and reject invalid snapshots atomically', () => {
  const world = new DensityTerrainWorld();
  world.dig(1, -1.5, .5);
  world.add(-2, .7, 1);
  const state = world.exportState();
  assert.ok(state.edits.length > 0 && state.edits.length < world.values.length / 100);
  assert.equal('values' in state, false, 'save stores edit deltas, not the generated volume');
  const restored = new DensityTerrainWorld({ state: JSON.parse(world.serialize()) });
  for (let index = 0; index < world.values.length; index++) assert.ok(Math.abs(restored.values[index] - world.values[index]) < 1e-6, `sample ${index} changed during save/load`);
  const before = restored.values.slice();
  for (const invalid of [
    { ...state, step: .25 },
    { ...state, edits: [[0, -3]] },
    { ...state, edits: [[state.edits[0][0], Infinity]] },
    { ...state, edits: [state.edits[0], state.edits[0]] },
    { ...state, edits: [[-1, 3]] },
    '{invalid json',
  ]) {
    assert.equal(restored.restore(invalid), false);
    assert.deepEqual(restored.values, before);
  }
  const clean = new DensityTerrainWorld();
  assert.equal(restored.restore(clean.exportState()), true);
  assert.deepEqual(restored.values, clean.values);
});

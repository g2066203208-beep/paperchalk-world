import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaperStageWorld } from '../studio/world/PaperStageWorld.mjs';
import { StagePlayerSimulation } from '../studio/core/StagePlayerSimulation.mjs';
import { SaveStore } from '../studio/core/SaveStore.mjs';

function advance(player, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) player.update(1 / 60, input);
  return player.snapshot();
}

test('the entire continuous ground is freely walkable in both directions', () => {
  const world = createPaperStageWorld(), player = new StagePlayerSimulation(world);
  for (const direction of [1, -1, 1]) {
    for (let i = 0; i < 900; i++) {
      const state = player.update(1 / 60, { horizontal: direction });
      assert.equal(state.y, world.surfaceY(state.x));
      assert.equal(state.grounded, true);
      assert.equal(state.z, 0);
      assert.equal(state.vy, 0);
    }
    assert.equal(player.x, direction === 1 ? world.bounds.maxX - player.options.halfWidth : world.bounds.minX + player.options.halfWidth);
  }
  assert.ok(player.distance > 90);
});

test('movement accelerates, brakes and reverses facing without leaving the walking surface', () => {
  const player = new StagePlayerSimulation(createPaperStageWorld());
  const first = player.update(1 / 60, { horizontal: 1 });
  assert.ok(first.vx > 0 && first.vx < 3.4);
  assert.equal(advance(player, .5, { horizontal: 1 }).vx, 3.4);
  assert.equal(advance(player, .3).vx, 0);
  const returning = advance(player, .5, { horizontal: -1, jumpPressed: true });
  assert.equal(returning.facing, -1);
  assert.equal(returning.vy, 0);
  assert.equal(returning.y, player.world.surfaceY(returning.x));
});

test('saved positions remain freely reversible and reattach to changed ground height', () => {
  const records = new Map(), storage = { getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const saves = new SaveStore({ storage, key: 'paperworld.stage.save.v1' });
  const player = new StagePlayerSimulation(createPaperStageWorld());
  advance(player, 5, { horizontal: 1 });
  assert.equal(saves.save(player.snapshot()).ok, true);
  const restored = new StagePlayerSimulation(createPaperStageWorld());
  assert.equal(restored.restore({ ...saves.load().snapshot, y: 4, vy: 7 }), true);
  assert.equal(restored.x, player.x);
  assert.equal(restored.y, restored.world.surfaceY(restored.x));
  assert.equal(restored.snapshot().grounded, true);
  assert.ok(advance(restored, 3, { horizontal: -1 }).x < player.x - 9);
});

test('invalid state restores safely, movement clamps at world limits, and reset returns to spawn', () => {
  const world = createPaperStageWorld(), player = new StagePlayerSimulation(world);
  for (const value of [null, { x: NaN, y: 1 }, { x: 50, y: 5 }, { x: 0, y: 1, vx: Infinity }]) {
    assert.equal(player.restore(value), false);
    assert.equal(player.x, world.spawn.x);
  }
  assert.equal(player.restore({ x: 24.5, y: .6 }), true);
  advance(player, 1, { horizontal: 1 });
  assert.equal(player.x, world.bounds.maxX - player.options.halfWidth);
  assert.equal(player.vx, 0);
  player.reset();
  assert.equal(player.x, world.spawn.x);
  assert.equal(player.distance, 0);
});

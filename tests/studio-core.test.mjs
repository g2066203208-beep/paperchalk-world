import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../studio/world/PaperWorld.mjs';
import { PlayerSimulation } from '../studio/core/PlayerSimulation.mjs';
import { SaveStore, decodeSave, DEFAULT_SAVE_KEY } from '../studio/core/SaveStore.mjs';
import { InputActions } from '../studio/input/InputActions.mjs';

const DT = 1 / 60;
const flatColumns = (min = -10, max = 10) => Array.from({ length: max - min + 1 }, (_, i) => ({ x: min + i, z: 0, h: 0 }));
const flatWorld = () => createWorld(flatColumns());
function advance(simulation, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) simulation.update(DT, input);
  return simulation.snapshot();
}
function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
class FakeTarget {
  constructor() { this.handlers = new Map(); }
  addEventListener(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, new Set()); this.handlers.get(type).add(fn); }
  removeEventListener(type, fn) { this.handlers.get(type)?.delete(fn); }
  emit(type, values = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
    for (const fn of this.handlers.get(type) || []) fn(event);
    return event;
  }
}

test('world uses only the selected source row and centered cube surfaces', () => {
  const world = createWorld([{ x: 0, z: 0, h: 0 }, { x: 1, z: 0, h: 2 }, { x: 0, z: 1, h: 9 }]);
  assert.equal(world.surfaceY(0), .5);
  assert.equal(world.surfaceY(.51), 2.5);
  assert.equal(world.surfaceY(4), null);
  assert.equal(world.stats().cells, 4);
  assert.deepEqual(world.spawn, { x: 0, y: .5, z: 0 });
  assert.throws(() => createWorld([{ x: 0, z: 2, h: 0 }]), /no solid/);
});

test('simulation accelerates, brakes, reverses facing, and remains on gameplay Z=0', () => {
  const simulation = new PlayerSimulation(flatWorld());
  const first = simulation.update(DT, { horizontal: 1 });
  assert.ok(first.vx > 0 && first.vx < 3.4);
  const moving = advance(simulation, .5, { horizontal: 1 });
  assert.equal(moving.vx, 3.4);
  const stopped = advance(simulation, .3);
  assert.equal(stopped.vx, 0);
  assert.equal(stopped.y, .5);
  assert.equal(stopped.grounded, true);
  assert.ok(stopped.distance > moving.distance);
  assert.equal(simulation.restore({ ...stopped, z: 100 }), true);
  for (let i = 0; i < 20; i++) assert.equal(simulation.update(DT, { horizontal: -1, forward: 1, cameraYaw: Math.PI }).z, 0);
  assert.equal(simulation.snapshot().facing, -1);
});

test('a jump rises above a one-meter step and lands exactly on the floor', () => {
  const simulation = new PlayerSimulation(flatWorld());
  simulation.update(DT, { jumpPressed: true });
  let highest = simulation.y;
  for (let i = 0; i < 100; i++) { simulation.update(DT); highest = Math.max(highest, simulation.y); }
  assert.ok(highest > 1.6 && highest < 1.85, `Unexpected apex: ${highest}`);
  assert.equal(simulation.y, .5);
  assert.equal(simulation.vy, 0);
  assert.equal(simulation.grounded, true);
});

test('swept collision stops at walls, including a long update', () => {
  const world = createWorld([...flatColumns(), { x: 2, z: 0, h: 5 }]);
  const simulation = new PlayerSimulation(world);
  for (let i = 0; i < 30; i++) simulation.update(.1, { horizontal: 1 });
  assert.ok(Math.abs(simulation.x - 1.2) < 1e-6);
  assert.equal(simulation.vx, 0);
  assert.equal(world.collidesAABB(simulation.bodyAt()), false);
});

test('jumping into a ceiling cancels upward velocity without penetrating it', () => {
  const ceiling = [-1, 0, 1].map(x => ({ x, z: 0, bottom: 3, h: 3 }));
  const world = createWorld([...flatColumns(), ...ceiling]);
  const simulation = new PlayerSimulation(world);
  assert.equal(simulation.restore({ x: 0, y: .5 }), true);
  simulation.update(DT, { jumpPressed: true });
  let highest = simulation.y, hit = false;
  for (let i = 0; i < 90; i++) {
    simulation.update(DT);
    highest = Math.max(highest, simulation.y);
    if (Math.abs(simulation.y - .85) < .01 && simulation.vy <= 0) hit = true;
    assert.equal(world.collidesAABB(simulation.bodyAt()), false);
  }
  assert.ok(highest <= .850001);
  assert.equal(hit, true);
  assert.equal(simulation.y, .5);
  assert.equal(simulation.grounded, true);
});

test('a descending player lands on a raised platform rather than crossing it', () => {
  const world = createWorld([...flatColumns(), { x: 2, z: 0, h: 1 }]);
  const simulation = new PlayerSimulation(world);
  assert.equal(simulation.restore({ x: 2, y: 5, vy: -28 }), true);
  simulation.update(.1);
  advance(simulation, .2);
  assert.equal(simulation.y, 1.5);
  assert.equal(simulation.grounded, true);
  assert.equal(world.collidesAABB(simulation.bodyAt()), false);
});

test('coyote time permits a late edge jump but expires', () => {
  const world = createWorld(flatColumns(-2, 0));
  const simulation = new PlayerSimulation(world);
  simulation.restore({ x: .76, y: .5, vx: 3.4 });
  simulation.update(DT, { horizontal: 1 });
  assert.equal(simulation.grounded, false);
  advance(simulation, .05, { horizontal: 1 });
  simulation.update(DT, { jumpPressed: true, horizontal: 1 });
  assert.ok(simulation.vy > 0);

  simulation.restore({ x: .76, y: .5, vx: 3.4 });
  advance(simulation, .18, { horizontal: 1 });
  simulation.update(DT, { jumpPressed: true });
  assert.ok(simulation.vy < 0);
});

test('a jump pressed just before landing is buffered and fires once', () => {
  const simulation = new PlayerSimulation(flatWorld());
  simulation.restore({ x: 0, y: .8, vy: -3 });
  simulation.update(DT, { jumpPressed: true });
  advance(simulation, .1);
  assert.ok(simulation.vy > 0 && simulation.y > .5);
  advance(simulation, 1.5);
  assert.equal(simulation.y, .5);
  assert.equal(simulation.grounded, true);
});

test('falling out respawns safely and invalid restoration cannot embed the player', () => {
  const simulation = new PlayerSimulation(createWorld(flatColumns(-1, 1)));
  assert.equal(simulation.restore({ x: 2.4, y: 1 }), true);
  advance(simulation, 2);
  assert.equal(simulation.respawnCount, 1);
  assert.deepEqual(simulation.snapshot(), { x: 0, y: .5, z: 0, vx: 0, vy: 0, grounded: true, facing: 1, distance: 0 });
  assert.equal(simulation.restore({ x: 0, y: 0 }), false);
  assert.equal(simulation.restore({ x: NaN, y: 4 }), false);
  assert.equal(simulation.y, .5);
});

test('save round trip preserves a simulation snapshot and reset clears storage', () => {
  const storage = memoryStorage();
  const store = new SaveStore({ storage, now: () => 12345 });
  const simulation = new PlayerSimulation(flatWorld());
  advance(simulation, .3, { horizontal: 1 });
  const expected = simulation.snapshot();
  assert.equal(store.load().status, 'empty');
  assert.equal(store.save(expected).status, 'saved');
  const loaded = store.load();
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.savedAt, 12345);
  assert.deepEqual(loaded.snapshot, expected);
  const restored = new PlayerSimulation(flatWorld());
  assert.equal(restored.restore(loaded.snapshot), true);
  assert.deepEqual(restored.snapshot(), expected);
  assert.equal(store.clear().status, 'cleared');
  assert.equal(store.load().status, 'empty');
});

test('V1 feet-position saves migrate without trusting stale depth or motion', () => {
  const storage = memoryStorage();
  storage.setItem(DEFAULT_SAVE_KEY, JSON.stringify({ schemaVersion: 1, savedAt: 12, player: { x: 1, y: .5, z: 99, facing: -1, vx: 999 } }));
  const store = new SaveStore({ storage, now: () => 20 });
  const loaded = store.load();
  assert.equal(loaded.status, 'migrated');
  assert.equal(loaded.migrated, true);
  assert.deepEqual(loaded.snapshot, { x: 1, y: .5, z: 0, vx: 0, vy: 0, grounded: false, facing: -1, distance: 0 });
  assert.equal(store.save(loaded.snapshot).ok, true);
  assert.equal(store.load().migrated, false);
});

test('corrupt, foreign, unsupported and invalid numeric save data fail safely', () => {
  for (const raw of ['{', 'null', '[]', '{}', JSON.stringify({ schemaVersion: 2, savedAt: 1, player: { x: 0, y: .5 } })]) assert.equal(decodeSave(raw).status, 'corrupt');
  assert.equal(decodeSave(JSON.stringify({ schemaVersion: 99 })).status, 'unsupported');
  const storage = memoryStorage();
  const store = new SaveStore({ storage });
  const player = new PlayerSimulation(flatWorld()).snapshot();
  assert.equal(store.save({ ...player, y: NaN }).status, 'invalid');
  assert.equal(store.save({ ...player, z: 1 }).status, 'invalid');
  assert.equal(storage.data.size, 0);
  store.save(player);
  const saved = JSON.parse(storage.getItem(DEFAULT_SAVE_KEY));
  saved.player.vx = null;
  assert.equal(decodeSave(JSON.stringify(saved)).status, 'corrupt');
});

test('disabled or throwing storage never interrupts gameplay', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
  const snapshot = new PlayerSimulation(flatWorld()).snapshot();
  for (const storage of [null, blocked]) {
    const store = new SaveStore({ storage });
    assert.equal(store.load().status, 'unavailable');
    assert.equal(store.save(snapshot).status, 'unavailable');
    assert.equal(store.clear().status, 'unavailable');
  }
});

test('input consumes jump edges once and ignores browser shortcuts and text fields', () => {
  const target = new FakeTarget();
  const input = new InputActions({ target });
  assert.equal(target.emit('keydown', { code: 'KeyD' }).defaultPrevented, true);
  target.emit('keydown', { code: 'Space' });
  assert.deepEqual(input.consume(), { horizontal: 1, jumpPressed: true });
  target.emit('keydown', { code: 'Space', repeat: true });
  assert.deepEqual(input.consume(), { horizontal: 1, jumpPressed: false });
  target.emit('keyup', { code: 'Space' });
  target.emit('keydown', { code: 'Space' });
  assert.equal(input.consume().jumpPressed, true);
  target.emit('focusin', { target: { tagName: 'INPUT' } });
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  assert.equal(target.emit('keydown', { code: 'Space', target: { tagName: 'TEXTAREA' } }).defaultPrevented, false);
  assert.equal(target.emit('keydown', { code: 'KeyA', ctrlKey: true }).defaultPrevented, false);
  assert.equal(target.emit('keydown', { code: 'KeyD', target: { isContentEditable: true } }).defaultPrevented, false);
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.dispose();
});

test('Space stays native on buttons, links and their descendants without queuing a jump', () => {
  const target = new FakeTarget();
  const input = new InputActions({ target });
  const button = { tagName: 'BUTTON' };
  const controls = [
    button,
    { tagName: 'A' },
    { tagName: 'SPAN', closest: selector => selector.startsWith('button,') ? button : null },
    { tagName: 'DIV', getAttribute: name => name === 'role' ? 'button' : null },
    { tagName: 'DIV', getAttribute: name => name === 'role' ? 'link' : null },
  ];
  for (const control of controls) {
    assert.equal(target.emit('keydown', { code: 'Space', target: control }).defaultPrevented, false);
    assert.equal(target.emit('keyup', { code: 'Space', target: control }).defaultPrevented, false);
    assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  }
  assert.equal(target.emit('keydown', { code: 'KeyA', target: button }).defaultPrevented, true);
  assert.deepEqual(input.consume(), { horizontal: -1, jumpPressed: false });
  input.dispose();
});

test('Space on a details summary remains available to toggle it without jumping', () => {
  const target = new FakeTarget();
  const input = new InputActions({ target });
  const summary = { tagName: 'SUMMARY' };
  const nestedLabel = { tagName: 'SPAN', closest: selector => selector.includes('summary') ? summary : null };
  for (const control of [summary, nestedLabel]) {
    assert.equal(target.emit('keydown', { code: 'Space', target: control }).defaultPrevented, false);
    assert.equal(target.emit('keyup', { code: 'Space', target: control }).defaultPrevented, false);
    assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  }
  input.dispose();
});

test('focusing a range cancels held movement and lets slider keys retain native behavior', () => {
  const target = new FakeTarget();
  const input = new InputActions({ target });
  const range = { tagName: 'INPUT', type: 'range' };
  target.emit('keydown', { code: 'KeyD' });
  target.emit('keydown', { code: 'Space' });
  assert.equal(input.horizontal(), 1);
  target.emit('focusin', { target: range });
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  assert.equal(target.emit('keydown', { code: 'ArrowRight', target: range }).defaultPrevented, false);
  assert.equal(target.emit('keyup', { code: 'ArrowRight', target: range }).defaultPrevented, false);
  assert.equal(target.emit('keydown', { code: 'Space', target: range }).defaultPrevented, false);
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.dispose();
});

test('touch cancellation, lost focus, visibility and disposal clear pending actions', () => {
  const target = new FakeTarget(), viewport = new FakeTarget();
  target.document = new FakeTarget();
  const input = new InputActions({ target, viewport });
  input.setVirtualLeft(true); input.setVirtualJump(true);
  assert.deepEqual(input.consume(), { horizontal: -1, jumpPressed: true });
  input.setVirtualJump(true);
  assert.equal(input.consume().jumpPressed, false);
  viewport.emit('pointercancel');
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.setVirtualRight(true); input.pressJump(); target.emit('blur');
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.setVirtualHorizontal(1); input.pressJump(); target.document.hidden = true; target.document.emit('visibilitychange');
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.setVirtualHorizontal(-1); input.pressJump(); input.dispose(); input.dispose();
  target.emit('keydown', { code: 'Space' }); input.pressJump(); input.setVirtualRight(true);
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  assert.equal([...target.handlers.values()].reduce((sum, set) => sum + set.size, 0), 0);
});

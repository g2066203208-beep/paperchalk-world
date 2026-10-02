import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, decodeSave, DEFAULT_SAVE_KEY } from '../studio/core/SaveStore.mjs';
import { InputActions } from '../studio/input/InputActions.mjs';

const samplePlayer = () => ({ x: 1.2, y: .5, z: 0, vx: 2, vy: 0, grounded: true, facing: 1, distance: 1.2 });
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

test('save round trip preserves a simulation snapshot and reset clears storage', () => {
  const storage = memoryStorage();
  const store = new SaveStore({ storage, now: () => 12345 });
  const expected = samplePlayer();
  assert.equal(store.load().status, 'empty');
  assert.equal(store.save(expected).status, 'saved');
  const loaded = store.load();
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.savedAt, 12345);
  assert.deepEqual(loaded.snapshot, expected);
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
  const player = samplePlayer();
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
  const snapshot = samplePlayer();
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

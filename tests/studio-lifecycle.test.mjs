import test from 'node:test';
import assert from 'node:assert/strict';
import { installStudioLifecycle } from '../studio/core/Lifecycle.mjs';
import { SaveStore } from '../studio/core/SaveStore.mjs';
import { InputActions } from '../studio/input/InputActions.mjs';

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type, event = {}) { for (const handler of [...this.listeners.get(type) || []]) handler(event); }
  get count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}

function setup(extra = {}) {
  const target = new Target(); target.document = new Target();
  const events = [];
  const dispose = installStudioLifecycle({
    target,
    saveNow: () => { events.push('saved'); return true; },
    resetClock: () => events.push('reset'),
    resumeView: () => events.push('resize'),
    setNativeSuspended: suspended => events.push(suspended ? 'suspend' : 'resume'),
    discard: () => events.push('discard'),
    ...extra,
  });
  return { target, events, dispose };
}

test('native save hook returns real storage success and survives storage failure', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const store = new SaveStore({ storage, now: () => 100 });
  let snapshot = { x: 2, y: .5, z: 0, vx: 0, vy: 0, grounded: true, facing: 1, distance: 2 };
  const { target, dispose } = setup({ saveNow: () => store.save(snapshot).ok });
  assert.equal(target.PaperchalkSaveNow(), true);
  assert.deepEqual(store.load().snapshot, snapshot);
  snapshot = { ...snapshot, x: 3, distance: 3 };
  storage.setItem = () => { throw new Error('quota exceeded'); };
  assert.equal(target.PaperchalkSaveNow(), false);
  assert.equal(store.load().snapshot.x, 2);
  dispose();
  assert.equal('PaperchalkSaveNow' in target, false);
});

test('background and WebView pause save first and suspend without advancing time on resume', () => {
  const { target, events, dispose } = setup();
  target.document.hidden = true;
  target.document.emit('visibilitychange');
  assert.deepEqual(events.splice(0), ['saved', 'reset']);
  target.emit('paperchalk:pause');
  assert.deepEqual(events.splice(0), ['saved', 'suspend', 'reset']);
  target.emit('paperchalk:resume');
  assert.deepEqual(events.splice(0), ['resume', 'reset', 'resize']);
  target.document.hidden = false;
  target.document.emit('visibilitychange');
  assert.deepEqual(events.splice(0), ['reset', 'resize']);
  dispose();
  assert.equal(target.count + target.document.count, 0);
});

test('page cache suspension keeps the bridge; discarded navigation saves then tears down', () => {
  const { target, events, dispose } = setup();
  target.emit('pagehide', { persisted: true });
  assert.deepEqual(events.splice(0), ['saved', 'reset']);
  assert.equal(typeof target.PaperchalkSaveNow, 'function');
  target.emit('pageshow', { persisted: true });
  assert.deepEqual(events.splice(0), ['reset', 'resize']);
  target.emit('pagehide', { persisted: false });
  assert.deepEqual(events.splice(0), ['saved', 'reset', 'discard']);
  dispose();
});

test('back hook reports whether UI consumed Back and cleanup restores prior hook ownership', () => {
  const target = new Target(); target.document = new Target();
  const original = () => 'old';
  target.PaperchalkSaveNow = original;
  let inspectorOpen = true;
  const dispose = installStudioLifecycle({
    target, saveNow: () => true, resetClock() {},
    handleBack() { const consumed = inspectorOpen; inspectorOpen = false; return consumed; },
  });
  assert.equal(target.PaperchalkHandleBack(), true);
  assert.equal(target.PaperchalkHandleBack(), false);
  const staleSave = target.PaperchalkSaveNow;
  const replacement = () => true;
  target.PaperchalkHandleBack = replacement;
  dispose(); dispose();
  assert.equal(target.PaperchalkSaveNow, original);
  assert.equal(target.PaperchalkHandleBack, replacement);
  assert.equal(staleSave(), false);
  assert.equal(target.count + target.document.count, 0);
});

test('throwing save cannot prevent lifecycle input reset or leak into native evaluation', () => {
  const { target, events, dispose } = setup({ saveNow: () => { throw new Error('storage'); } });
  assert.equal(target.PaperchalkSaveNow(), false);
  target.emit('paperchalk:pause');
  assert.deepEqual(events, ['suspend', 'reset']);
  dispose();
});

test('a quick touch queues one movement tick, opposing holds stay neutral, cancellation clears it', () => {
  const target = new Target();
  const input = new InputActions({ target });
  input.setVirtualRight(true); input.setVirtualRight(false);
  assert.deepEqual(input.consume(), { horizontal: 1, jumpPressed: false });
  assert.deepEqual(input.consume(), { horizontal: 0, jumpPressed: false });
  input.setVirtualLeft(true);
  assert.equal(input.consume().horizontal, -1);
  input.setVirtualRight(true);
  assert.equal(input.consume().horizontal, 0);
  input.setVirtualLeft(false);
  assert.equal(input.consume().horizontal, 1);
  input.setVirtualRight(false);
  assert.equal(input.consume().horizontal, 0);
  input.setVirtualLeft(true); input.setVirtualLeft(false); input.cancel();
  assert.equal(input.consume().horizontal, 0);
  input.dispose();
});

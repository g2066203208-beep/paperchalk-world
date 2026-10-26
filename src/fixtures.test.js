import test from 'node:test';
import assert from 'node:assert/strict';
import {FIXTURE_DEFINITIONS, createFixtureState, setFixtureOpen, placeItem, moveItem, removeItem, itemsInFixture} from './fixtures.js';

const item = (id, widthCm = 12, heightCm = 18, depthCm = 10) =>
  ({id, sku: 'test-product', widthCm, heightCm, depthCm});

test('all physical fixtures are aspect-ratio independent, and the window never stores stock', () => {
  const state = createFixtureState();
  assert.equal(Object.keys(FIXTURE_DEFINITIONS).length, 14);
  assert.equal(state.fixtures.window.open, false);
  assert.equal(state.fixtures.counter.open, true);
  assert.equal(state.fixtures['upper-left'].open, false);
  assert.equal(placeItem(state, item('a'), 'window', 0, 0), false);
  assert.equal(setFixtureOpen(state, 'window', true), true);
  assert.equal(placeItem(state, item('a'), 'window', 0, 0), false);
  assert.equal(setFixtureOpen(state, 'window', false), true);
  assert.equal(setFixtureOpen(state, 'left-top', false), false);
  assert.equal(state.revision, 2);
});

test('closed cabinet and drawer block taking/placing, while contents persist when closed', () => {
  const state = createFixtureState();
  assert.equal(placeItem(state, item('tea'), 'upper-left', 0, 0), false);
  assert.equal(setFixtureOpen(state, 'upper-left', true), true);
  assert.equal(placeItem(state, item('tea'), 'upper-left', 0, 0), true);
  assert.equal(setFixtureOpen(state, 'upper-left', false), true);
  assert.equal(itemsInFixture(state, 'upper-left').length, 0, 'closed cabinet conceals its contents');
  assert.equal(state.items.tea.fixtureId, 'upper-left');
  assert.equal(moveItem(state, 'tea', 'counter', 0, 0), false);
  assert.equal(removeItem(state, 'tea'), false);
  assert.equal(setFixtureOpen(state, 'upper-left', true), true);
  assert.equal(moveItem(state, 'tea', 'counter', 0, 0), true);
  assert.equal(setFixtureOpen(state, 'drawer-left', true), true);
  assert.equal(moveItem(state, 'tea', 'drawer-left', 0, 0), false, '18cm tall product cannot fit 14cm drawer');
  assert.equal(removeItem(state, 'tea'), true);
  assert.equal(Object.keys(state.items).length, 0);
});

test('placement uses real centimetre bounds, depth, rotation and non-overlap', () => {
  const state = createFixtureState();
  assert.equal(placeItem(state, item('box', 25, 15, 18), 'left-top', 0, 0), true);
  const rev = state.revision;
  assert.equal(placeItem(state, item('overlap', 10, 10, 10), 'left-top', 20, 4), false);
  assert.equal(placeItem(state, item('too-wide', 40, 10, 10), 'left-top', 0, 0), false);
  assert.equal(placeItem(state, item('too-deep', 10, 10, 29), 'left-top', 26, 0), false);
  assert.equal(placeItem(state, item('off-edge', 12, 10, 10), 'left-top', 30, 0), false);
  assert.equal(placeItem(state, item('negative', 10, 10, 10), 'left-top', -1, 0), false);
  assert.equal(placeItem(state, item('bad', 0, 10, 10), 'left-top', 26, 0), false);
  assert.equal(placeItem(state, item('box', 10, 10, 10), 'right-top', 0, 0), false);
  assert.equal(state.revision, rev, 'rejected operations do not mutate state');
  assert.equal(placeItem(state, item('rotated', 30, 10, 10), 'right-top', 0, 0, true), true);
  assert.equal(state.items.rotated.rotated, true);
  assert.equal(placeItem(state, item('other', 10, 10, 10), 'left-top', 25, 0), true, 'edge-touching items are allowed');
});

test('host rejects stale multiplayer moves without losing or duplicating stock', () => {
  const state = createFixtureState();
  assert.equal(placeItem(state, item('bottle'), 'left-middle', 0, 0), true);
  const expectedOrigin = {fixtureId: 'left-middle', xCm: 0, yCm: 0};
  assert.equal(moveItem(state, 'bottle', 'counter', 0, 0, false, expectedOrigin), true);
  const after = JSON.stringify(state);
  assert.equal(moveItem(state, 'bottle', 'right-middle', 0, 0, false, expectedOrigin), false);
  assert.equal(JSON.stringify(state), after, 'stale action must be atomic');
  assert.equal(Object.keys(state.items).length, 1);
  assert.equal(state.items.bottle.fixtureId, 'counter');
  assert.equal(moveItem(state, 'bottle', 'right-middle', 0, 0, false, {fixtureId: 'counter', xCm: 0, yCm: 0}), true);
});

test('inventory survives JSON save/restore and rendering snapshots cannot mutate state', () => {
  const state = createFixtureState();
  assert.equal(setFixtureOpen(state, 'base-right', true), true);
  assert.equal(placeItem(state, item('milk'), 'base-right', 1, 2), true);
  assert.equal(setFixtureOpen(state, 'base-right', false), true);
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restored, state);
  assert.equal(itemsInFixture(restored, 'base-right').length, 0);
  assert.equal(setFixtureOpen(restored, 'base-right', true), true);
  const renderList = itemsInFixture(restored, 'base-right');
  renderList[0].xCm = 999;
  assert.equal(restored.items.milk.xCm, 1);
  assert.equal(moveItem(restored, 'milk', 'counter', 0, 0), true);
  assert.equal(itemsInFixture(restored, 'counter').length, 1);
});

test('untrusted item identifiers cannot change inventory object prototypes', () => {
  const state = createFixtureState();
  assert.equal(placeItem(state, item('__proto__'), 'counter', 0, 0), false);
  assert.equal(placeItem(state, item('constructor'), 'counter', 0, 0), false);
  assert.equal(moveItem(state, 'toString', 'counter', 0, 0), false);
  assert.equal(removeItem(state, '__proto__'), false);
  assert.equal(Object.getPrototypeOf(state.items), Object.prototype);
  assert.deepEqual(Object.keys(state.items), []);
});

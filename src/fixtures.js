/**
 * Independent, renderer-agnostic physical fixture prototype for the untitled kiosk.
 * Dimensions are provisional interior CENTIMETRES, NOT sprite pixels or approved art.
 * Screen aspect ratio must never change inventory capacity or item locations.
 * Host-only mutations; the UI and multiplayer protocol are deliberately untouched.
 */
const fixture = (kind, widthCm, heightCm, depthCm) =>
  Object.freeze({kind, widthCm, heightCm, depthCm, closable: kind === 'cabinet' || kind === 'drawer' || kind === 'window',
    storesItems: kind !== 'window'});

export const FIXTURE_DEFINITIONS = Object.freeze({
  window: fixture('window', 100, 90, 0),
  'upper-left': fixture('cabinet', 46, 32, 30),
  'upper-right': fixture('cabinet', 46, 32, 30),
  'left-top': fixture('shelf', 38, 30, 28),
  'left-middle': fixture('shelf', 38, 30, 28),
  'left-bottom': fixture('shelf', 38, 38, 34),
  'right-top': fixture('shelf', 38, 30, 28),
  'right-middle': fixture('shelf', 38, 30, 28),
  'right-bottom': fixture('shelf', 38, 38, 34),
  'base-left': fixture('cabinet', 45, 38, 42),
  'base-right': fixture('cabinet', 45, 38, 42),
  'drawer-left': fixture('drawer', 42, 14, 34),
  'drawer-right': fixture('drawer', 42, 14, 34),
  counter: fixture('counter', 110, 52, 50)
});

const positiveCm = n => Number.isSafeInteger(n) && n > 0 && n <= 200;
const coordinate = n => Number.isSafeInteger(n) && n >= 0;
const validId = s => typeof s === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(s) && !['constructor', 'prototype'].includes(s);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const accessible = (state, id) => own(FIXTURE_DEFINITIONS, id) && state.fixtures[id]?.open === true;
const bounds = (item, rotated) => rotated
  ? {w: item.heightCm, h: item.widthCm}
  : {w: item.widthCm, h: item.heightCm};
const intersects = (a, b) => a.xCm < b.xCm + b.w && a.xCm + a.w > b.xCm &&
  a.yCm < b.yCm + b.h && a.yCm + a.h > b.yCm;

export function createFixtureState() {
  return {
    version: 1, revision: 0,
    fixtures: Object.fromEntries(Object.entries(FIXTURE_DEFINITIONS)
      .map(([id, def]) => [id, {open: !def.closable}])),
    items: {}
  };
}

export function setFixtureOpen(state, fixtureId, open) {
  const def = FIXTURE_DEFINITIONS[fixtureId];
  if (!def?.closable || typeof open !== 'boolean' || !state.fixtures[fixtureId] ||
      state.fixtures[fixtureId].open === open) return false;
  state.fixtures[fixtureId].open = open;
  state.revision++;
  return true;
}

function canFit(state, item, fixtureId, xCm, yCm, rotated, excludeId = null) {
  const def = FIXTURE_DEFINITIONS[fixtureId];
  if (!def?.storesItems || !accessible(state, fixtureId) || !coordinate(xCm) ||
      !coordinate(yCm) || typeof rotated !== 'boolean') return false;
  const {w, h} = bounds(item, rotated);
  if (xCm + w > def.widthCm || yCm + h > def.heightCm || item.depthCm > def.depthCm) return false;
  const target = {xCm, yCm, w, h};
  for (const existing of Object.values(state.items)) {
    if (existing.id === excludeId || existing.fixtureId !== fixtureId) continue;
    const size = bounds(existing, existing.rotated);
    if (intersects(target, {...existing, ...size})) return false;
  }
  return true;
}

/** Place an external stock item exactly once; rejected placements never mutate state. */
export function placeItem(state, item, fixtureId, xCm, yCm, rotated = false) {
  if (!item || !validId(item.id) || !validId(item.sku) || own(state.items, item.id) ||
      !positiveCm(item.widthCm) || !positiveCm(item.heightCm) || !positiveCm(item.depthCm) ||
      !canFit(state, item, fixtureId, xCm, yCm, rotated)) return false;
  state.items[item.id] = {
    id: item.id, sku: item.sku, widthCm: item.widthCm, heightCm: item.heightCm,
    depthCm: item.depthCm, fixtureId, xCm, yCm, rotated
  };
  state.revision++;
  return true;
}

/**
 * Move an existing item atomically. An optional expected origin prevents stale
 * multiplayer inputs from silently moving an item that another player already took.
 */
export function moveItem(state, itemId, fixtureId, xCm, yCm, rotated = false, expectedOrigin = null) {
  const item = own(state.items, itemId) ? state.items[itemId] : null;
  if (!item || !accessible(state, item.fixtureId)) return false;
  if (expectedOrigin && (item.fixtureId !== expectedOrigin.fixtureId ||
      item.xCm !== expectedOrigin.xCm || item.yCm !== expectedOrigin.yCm)) return false;
  if (item.fixtureId === fixtureId && item.xCm === xCm && item.yCm === yCm && item.rotated === rotated) return false;
  if (!canFit(state, item, fixtureId, xCm, yCm, rotated, itemId)) return false;
  Object.assign(item, {fixtureId, xCm, yCm, rotated});
  state.revision++;
  return true;
}

/** Remove only an accessible item (e.g. after a completed sale). */
export function removeItem(state, itemId) {
  const item = own(state.items, itemId) ? state.items[itemId] : null;
  if (!item || !accessible(state, item.fixtureId)) return false;
  delete state.items[itemId];
  state.revision++;
  return true;
}

/** Read-only display snapshot; never exposes mutable inventory objects to the UI. */
export function itemsInFixture(state, fixtureId) {
  if (!accessible(state, fixtureId)) return [];
  return Object.values(state.items)
    .filter(item => item.fixtureId === fixtureId)
    .sort((a, b) => a.yCm - b.yCm || a.xCm - b.xCm || a.id.localeCompare(b.id))
    .map(item => ({...item}));
}

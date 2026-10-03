export const SAVE_SCHEMA_VERSION = 2;
export const DEFAULT_SAVE_KEY = 'paperworld.studio.save';
const FORMAT = 'paperworld-studio-save';
const MAX_SAVE_LENGTH = 64 * 1024;

function validPlayer(player) {
  return player && typeof player === 'object'
    && ['x', 'y', 'z', 'vx', 'vy', 'distance'].every(key => typeof player[key] === 'number' && Number.isFinite(player[key]) && Math.abs(player[key]) <= 1e7)
    && player.z === 0 && player.distance >= 0 && typeof player.grounded === 'boolean'
    && (player.facing === 1 || player.facing === -1);
}

function copyPlayer(player) {
  return { x: player.x, y: player.y, z: 0, vx: player.vx, vy: player.vy, grounded: player.grounded, facing: player.facing, distance: player.distance };
}

/** V1 stored feet x/y and facing only. V2 stores a complete simulation snapshot. */
export function decodeSave(text) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_LENGTH) return { ok: false, status: 'corrupt', snapshot: null };
  let record;
  try { record = JSON.parse(text); } catch { return { ok: false, status: 'corrupt', snapshot: null }; }
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { ok: false, status: 'corrupt', snapshot: null };
  const version = record.schemaVersion ?? record.version;
  if (version !== 1 && version !== SAVE_SCHEMA_VERSION) return { ok: false, status: typeof version === 'number' ? 'unsupported' : 'corrupt', snapshot: null };
  let player = record.player;
  if (version === 1) {
    if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return { ok: false, status: 'corrupt', snapshot: null };
    player = { x: player.x, y: player.y, z: 0, vx: 0, vy: 0, grounded: false, facing: player.facing === -1 ? -1 : 1, distance: 0 };
  }
  if (!validPlayer(player) || (version === SAVE_SCHEMA_VERSION && record.format !== FORMAT)) return { ok: false, status: 'corrupt', snapshot: null };
  const savedAt = record.savedAt ?? (version === 1 ? 0 : null);
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || savedAt < 0) return { ok: false, status: 'corrupt', snapshot: null };
  return { ok: true, status: version === 1 ? 'migrated' : 'loaded', snapshot: copyPlayer(player), savedAt, migrated: version === 1 };
}

/** Storage failures are normal outcomes, never exceptions that interrupt play. */
export class SaveStore {
  constructor(options = {}) {
    this.key = typeof options.key === 'string' && options.key ? options.key : DEFAULT_SAVE_KEY;
    this.hasProvidedStorage = Object.prototype.hasOwnProperty.call(options, 'storage');
    this.providedStorage = options.storage;
    this.now = typeof options.now === 'function' ? options.now : Date.now;
  }

  storage() {
    try {
      const storage = this.hasProvidedStorage ? this.providedStorage : globalThis.localStorage;
      return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function' ? storage : null;
    } catch { return null; }
  }

  load() {
    const storage = this.storage();
    if (!storage) return { ok: false, status: 'unavailable', snapshot: null };
    try {
      const text = storage.getItem(this.key);
      return text === null ? { ok: true, status: 'empty', snapshot: null } : decodeSave(text);
    } catch { return { ok: false, status: 'unavailable', snapshot: null }; }
  }

  save(snapshot) {
    if (!validPlayer(snapshot)) return { ok: false, status: 'invalid', snapshot: null };
    const storage = this.storage();
    if (!storage) return { ok: false, status: 'unavailable', snapshot: null };
    try {
      const savedAt = this.now();
      if (!Number.isFinite(savedAt) || savedAt < 0) return { ok: false, status: 'invalid', snapshot: null };
      const player = copyPlayer(snapshot);
      storage.setItem(this.key, JSON.stringify({ format: FORMAT, schemaVersion: SAVE_SCHEMA_VERSION, savedAt, player }));
      return { ok: true, status: 'saved', snapshot: player, savedAt, migrated: false };
    } catch { return { ok: false, status: 'unavailable', snapshot: null }; }
  }

  clear() {
    const storage = this.storage();
    if (!storage) return { ok: false, status: 'unavailable' };
    try { storage.removeItem(this.key); return { ok: true, status: 'cleared' }; }
    catch { return { ok: false, status: 'unavailable' }; }
  }
}

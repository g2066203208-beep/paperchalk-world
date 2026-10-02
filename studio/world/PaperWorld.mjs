const EPSILON = 1e-7;
const STATE_VERSION = 1;
const MAX_EDIT_COORDINATE = 1_000_000;

function cellKey(x, y) { return `${x},${y}`; }

function assertIntegerCoordinate(value, label) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_EDIT_COORDINATE) {
    throw new RangeError(`${label} must be a safe integer within the editable grid.`);
  }
}

function isFiniteBounds(bounds) {
  return bounds && ['minX', 'maxX', 'minY', 'maxY'].every(key => Number.isFinite(bounds[key]));
}

function copyBounds(bounds) { return { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY }; }

/**
 * Renderer-independent editable slice of centered one-meter cells.
 *
 * The renderer may use the column records for its paper silhouette, while the
 * cell set remains the source of truth for collision, digging and placement.
 */
export class PaperWorld {
  constructor(columns, { laneZ = 0, state = null } = {}) {
    if (!Array.isArray(columns)) throw new TypeError('World columns must be an array.');
    if (!Number.isFinite(laneZ)) throw new TypeError('The source lane must be finite.');
    this.laneZ = laneZ;
    this.cells = new Set();
    this.heights = new Map();
    this.listeners = new Set();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const column of columns) {
      if (!column || Math.abs((column.z ?? laneZ) - laneZ) > EPSILON) continue;
      const { x, h } = column;
      const bottom = column.bottom ?? 0;
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(h) || !Number.isSafeInteger(bottom)) {
        throw new TypeError('Column coordinates and heights must be integer cell centers.');
      }
      if (h < bottom || h - bottom > 4096) throw new RangeError('Invalid column height.');
      for (let y = bottom; y <= h; y++) this.cells.add(cellKey(x, y));
      minX = Math.min(minX, x - .5); maxX = Math.max(maxX, x + .5);
      minY = Math.min(minY, bottom - .5); maxY = Math.max(maxY, h + .5);
    }
    if (!this.cells.size) throw new RangeError('The source lane has no solid cells.');
    this.gridBounds = Object.freeze({ minX, maxX, minY, maxY });
    this._rebuildMetadata();
    if (state !== null && !this.restore(state, { emit: false })) throw new TypeError('Invalid world state.');
    const spawnX = this.heights.has(0) ? 0 : [...this.heights.keys()].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)[0];
    this.spawn = Object.freeze({ x: spawnX, y: this.surfaceY(spawnX), z: 0 });
  }

  _rebuildMetadata() {
    this.heights.clear();
    let minX = this.gridBounds?.minX ?? Infinity;
    let maxX = this.gridBounds?.maxX ?? -Infinity;
    let minY = this.gridBounds?.minY ?? Infinity;
    let maxY = this.gridBounds?.maxY ?? -Infinity;
    for (const key of this.cells) {
      const comma = key.indexOf(',');
      const x = Number(key.slice(0, comma));
      const y = Number(key.slice(comma + 1));
      this.heights.set(x, Math.max(y, this.heights.get(x) ?? -Infinity));
      minX = Math.min(minX, x - .5); maxX = Math.max(maxX, x + .5);
      minY = Math.min(minY, y - .5); maxY = Math.max(maxY, y + .5);
    }
    this.bounds = Object.freeze({ minX, maxX, minY, maxY });
  }

  _coordinate(x, y) {
    assertIntegerCoordinate(x, 'x');
    assertIntegerCoordinate(y, 'y');
  }

  _emit(change) {
    for (const listener of this.listeners) {
      try { listener(change, this); } catch { /* A view listener must not break gameplay. */ }
    }
  }

  /** Subscribe to cell edits. Returns an idempotent unsubscribe function. */
  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('World listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onChange(listener) { return this.subscribe(listener); }

  isSolidCell(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return this.cells.has(cellKey(Math.trunc(x), Math.trunc(y)));
  }

  topCell(x) {
    if (!Number.isFinite(x)) return null;
    const columnX = Math.floor(x + .5);
    const y = this.heights.get(columnX);
    return y === undefined ? null : { x: columnX, y, z: this.laneZ };
  }

  surfaceY(x, z = this.laneZ) {
    if (!Number.isFinite(x) || Math.abs(z - this.laneZ) > EPSILON) return null;
    const top = this.topCell(x);
    return top ? top.y + .5 : null;
  }

  /** Remove one cell. The edit is safe to call repeatedly and reports no-op edits. */
  digCell(x, y, z = this.laneZ, { emit = true } = {}) {
    this._coordinate(x, y);
    if (!Number.isFinite(z) || Math.abs(z - this.laneZ) > EPSILON) return { changed: false, action: 'dig', x, y, z };
    const key = cellKey(x, y);
    const changed = this.cells.delete(key);
    if (changed) this._rebuildMetadata();
    const result = { changed, action: 'dig', x, y, z: this.laneZ, solid: changed };
    if (changed && emit) this._emit(result);
    return result;
  }

  /** Place one cell. Existing cells are left untouched and reported as no-op edits. */
  placeCell(x, y, z = this.laneZ, { emit = true } = {}) {
    this._coordinate(x, y);
    if (!Number.isFinite(z) || Math.abs(z - this.laneZ) > EPSILON) return { changed: false, action: 'place', x, y, z };
    const key = cellKey(x, y);
    const changed = !this.cells.has(key);
    if (changed) {
      this.cells.add(key);
      this._rebuildMetadata();
    }
    const result = { changed, action: 'place', x, y, z: this.laneZ, solid: true };
    if (changed && emit) this._emit(result);
    return result;
  }

  /** Dig the visible top cell in a column. */
  digColumn(x, z = this.laneZ, options) {
    const top = this.topCell(x);
    return top ? this.digCell(top.x, top.y, z, options) : { changed: false, action: 'dig', x, y: null, z };
  }

  /** Place one cell directly above a column's visible top. */
  placeColumn(x, z = this.laneZ, options) {
    const columnX = Math.floor(x + .5);
    const top = this.topCell(columnX);
    const y = top ? top.y + 1 : Math.floor(this.gridBounds.minY + .5);
    return this.placeCell(columnX, y, z, options);
  }

  /** Return the editable slice as stable column records for the paper renderer. */
  getColumnRecords(z = this.laneZ) {
    if (Math.abs(z - this.laneZ) > EPSILON) return [];
    return [...this.heights.keys()].sort((a, b) => a - b).map(x => ({ x, z: this.laneZ, h: this.heights.get(x) }));
  }

  /** Return a deterministic, JSON-safe world state for persistence. */
  exportState() {
    return {
      format: 'paperworld-grid',
      version: STATE_VERSION,
      laneZ: this.laneZ,
      gridBounds: copyBounds(this.gridBounds),
      cells: [...this.cells].sort((a, b) => {
        const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number);
        return ax - bx || ay - by;
      }),
    };
  }

  state() { return this.exportState(); }
  serialize() { return JSON.stringify(this.exportState()); }

  /** Restore only a valid same-lane state; returns false without mutating on failure. */
  restore(input, { emit = true } = {}) {
    let state = input;
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch { return false; }
    }
    if (!state || typeof state !== 'object' || Array.isArray(state) || state.format !== 'paperworld-grid' || state.version !== STATE_VERSION) return false;
    if (!Number.isFinite(state.laneZ) || Math.abs(state.laneZ - this.laneZ) > EPSILON || !Array.isArray(state.cells) || !isFiniteBounds(state.gridBounds)) return false;
    const next = new Set();
    try {
      for (const key of state.cells) {
        if (typeof key !== 'string') return false;
        const parts = key.split(',');
        if (parts.length !== 2) return false;
        const x = Number(parts[0]), y = Number(parts[1]);
        this._coordinate(x, y);
        next.add(cellKey(x, y));
      }
    } catch { return false; }
    if (!next.size) return false;
    const previous = this.exportState();
    this.cells = next;
    this.gridBounds = Object.freeze(copyBounds(state.gridBounds));
    this._rebuildMetadata();
    const normalized = this.exportState();
    const changed = JSON.stringify(previous) !== JSON.stringify(normalized);
    if (changed && emit) this._emit({ changed: true, action: 'restore', state: normalized });
    return true;
  }

  /** Return cells intersecting a swept box; exact collision excludes touching edges. */
  queryTiles({ minX, maxX, minY, maxY }) {
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return [];
    const fromX = Math.max(Math.ceil(minX - .5), Math.ceil(this.bounds.minX + .5));
    const toX = Math.min(Math.floor(maxX + .5), Math.floor(this.bounds.maxX - .5));
    const fromY = Math.max(Math.ceil(minY - .5), Math.ceil(this.bounds.minY + .5));
    const toY = Math.min(Math.floor(maxY + .5), Math.floor(this.bounds.maxY - .5));
    const result = [];
    for (let x = fromX; x <= toX; x++) for (let y = fromY; y <= toY; y++) {
      if (this.isSolidCell(x, y)) result.push({ x, y, minX: x - .5, maxX: x + .5, minY: y - .5, maxY: y + .5 });
    }
    return result;
  }

  collidesAABB(box) {
    return this.queryTiles(box).some(tile => box.maxX > tile.minX + EPSILON && box.minX < tile.maxX - EPSILON && box.maxY > tile.minY + EPSILON && box.minY < tile.maxY - EPSILON);
  }

  stats() { return { cells: this.cells.size, columns: this.heights.size, laneZ: this.laneZ, gameplayZ: 0, bounds: { ...this.bounds } }; }
}

export function createWorld(columns, options) { return new PaperWorld(columns, options); }

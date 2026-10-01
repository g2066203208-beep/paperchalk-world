const EPSILON = 1e-7;

/** A renderer-independent slice of the demo's centered, one-meter cubes. */
export class PaperWorld {
  constructor(columns, { laneZ = 0 } = {}) {
    if (!Array.isArray(columns)) throw new TypeError('World columns must be an array.');
    if (!Number.isFinite(laneZ)) throw new TypeError('The source lane must be finite.');
    this.laneZ = laneZ;
    this.cells = new Set();
    this.heights = new Map();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const column of columns) {
      if (!column || Math.abs((column.z ?? laneZ) - laneZ) > EPSILON) continue;
      const { x, h } = column;
      const bottom = column.bottom ?? 0;
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(h) || !Number.isSafeInteger(bottom)) {
        throw new TypeError('Column coordinates and heights must be integer cell centers.');
      }
      if (h < bottom || h - bottom > 4096) throw new RangeError('Invalid column height.');
      this.heights.set(x, Math.max(h, this.heights.get(x) ?? -Infinity));
      for (let y = bottom; y <= h; y++) this.cells.add(`${x},${y}`);
      minX = Math.min(minX, x - .5); maxX = Math.max(maxX, x + .5);
      minY = Math.min(minY, bottom - .5); maxY = Math.max(maxY, h + .5);
    }
    if (!this.cells.size) throw new RangeError('The source lane has no solid cells.');
    this.bounds = Object.freeze({ minX, maxX, minY, maxY });
    const spawnX = this.heights.has(0) ? 0 : [...this.heights.keys()].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b)[0];
    this.spawn = Object.freeze({ x: spawnX, y: this.surfaceY(spawnX), z: 0 });
  }

  isSolidCell(x, y) { return this.cells.has(`${x},${y}`); }

  surfaceY(x) {
    if (!Number.isFinite(x)) return null;
    const height = this.heights.get(Math.floor(x + .5));
    return height === undefined ? null : height + .5;
  }

  /** Return cells intersecting a swept box; exact collision excludes touching edges. */
  queryTiles({ minX, maxX, minY, maxY }) {
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return [];
    const result = [];
    const fromX = Math.max(Math.ceil(minX - .5), Math.ceil(this.bounds.minX + .5));
    const toX = Math.min(Math.floor(maxX + .5), Math.floor(this.bounds.maxX - .5));
    const fromY = Math.max(Math.ceil(minY - .5), Math.ceil(this.bounds.minY + .5));
    const toY = Math.min(Math.floor(maxY + .5), Math.floor(this.bounds.maxY - .5));
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

const FORMAT = 'paperworld-density';
const STATE_VERSION = 1;
const GENERATOR_VERSION = 2;
const EPSILON = 1e-6;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};
const smoothMin = (a, b, width) => {
  if (width <= 0) return Math.min(a, b);
  const h = clamp(.5 + .5 * (b - a) / width, 0, 1);
  return mix(b, a, h) - width * h * (1 - h);
};
const finitePoint = value => value && ['x', 'y', 'z'].every(axis => Number.isFinite(value[axis]));
const samePoint = (a, b) => finitePoint(a) && finitePoint(b) && ['x', 'y', 'z'].every(axis => Math.abs(a[axis] - b[axis]) < EPSILON);

/**
 * A sampled three-dimensional solid. Negative density is soil; positive is air.
 * Rendering and collision consume the same trilinearly interpolated volume.
 * The samples are an invisible editing grid, never a collection of render cubes.
 */
export class DensityTerrainWorld {
  constructor({
    step = .5,
    min = { x: -18, y: -5, z: -18 },
    max = { x: 18, y: 7, z: 8 },
    state = null,
  } = {}) {
    if (!Number.isFinite(step) || step <= 0 || step > 2 || !finitePoint(min) || !finitePoint(max)) {
      throw new TypeError('Density terrain requires finite bounds and a positive sample step.');
    }
    for (const axis of ['x', 'y', 'z']) {
      const cells = (max[axis] - min[axis]) / step;
      if (cells < 4 || !Number.isInteger(cells)) throw new RangeError('Density terrain bounds must align with the sample step.');
    }
    this.step = step;
    this.min = Object.freeze({ ...min });
    this.max = Object.freeze({ ...max });
    this.nx = Math.round((max.x - min.x) / step) + 1;
    this.ny = Math.round((max.y - min.y) / step) + 1;
    this.nz = Math.round((max.z - min.z) / step) + 1;
    const count = this.nx * this.ny * this.nz;
    if (count > 2_000_000) throw new RangeError('Density terrain exceeds its sample budget.');
    this.values = new Float32Array(count);
    this.baseline = new Float32Array(count);
    this.foldHeights = new Map();
    this.edits = new Map();
    this.listeners = new Set();
    this.revision = 0;
    this.version = 0;
    this.laneZ = 0;
    this.bounds = Object.freeze({ minX: min.x, maxX: max.x, minY: min.y, maxY: max.y, minZ: min.z, maxZ: max.z });
    for (let iz = 0; iz < this.nz; iz++) for (let iy = 0; iy < this.ny; iy++) for (let ix = 0; ix < this.nx; ix++) {
      const x = min.x + ix * step, y = min.y + iy * step, z = min.z + iz * step;
      const index = this.index(ix, iy, iz);
      // A positive outer sample shell makes the finite volume watertight.
      this.values[index] = this._isBoundary(ix, iy, iz) ? step : this._authoredDensity(x, y, z);
    }
    this.baseline.set(this.values);
    if (state !== null && !this.restore(state, { emit: false })) throw new TypeError('Invalid density terrain state.');
    const spawnX = clamp(0, min.x + step * 2, max.x - step * 2);
    const spawnZ = clamp(0, min.z + step * 2, max.z - step * 2);
    this.spawn = Object.freeze({ x: spawnX, y: this.surfaceY(spawnX, spawnZ) ?? .5, z: spawnZ });
  }

  index(ix, iy, iz) { return (iz * this.ny + iy) * this.nx + ix; }

  _isBoundary(ix, iy, iz) {
    return ix === 0 || iy === 0 || iz === 0 || ix === this.nx - 1 || iy === this.ny - 1 || iz === this.nz - 1;
  }

  _indexIsBoundary(index) {
    const ix = index % this.nx;
    const iy = Math.floor(index / this.nx) % this.ny;
    const iz = Math.floor(index / (this.nx * this.ny));
    return this._isBoundary(ix, iy, iz);
  }

  /** Sample broad landforms at the corners of large paper folds. */
  foldHeight(ix, iz) {
    const key = ix + ',' + iz;
    if (this.foldHeights.has(key)) return this.foldHeights.get(key);
    const x = ix * 2.5, z = iz * 2.5;
    const gaussian = (cx, cz, sx, sz, height) => height * Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
    const hills = gaussian(-7.2, -3.8, 5.4, 4.5, 2.7)
      + gaussian(7.1, 3.1, 5.1, 4.4, 2.15)
      + gaussian(4.3, -8.2, 8.1, 4.9, 1.95)
      - gaussian(-2.0, 6.5, 5.8, 3.5, .48);
    const broadFold = Math.sin(x * .24 + z * .17) * .15 + Math.cos(z * .25 - x * .11) * .12;
    const clearing = smoothstep(1.8, 4.1, Math.hypot(x, z * .82));
    const height = .5 + (hills + broadFold) * clearing;
    this.foldHeights.set(key, height);
    return height;
  }

  /** Linear interpolation across large triangles leaves visible, continuous creases. */
  authoredHeight(x, z) {
    const gx=x/2.5,gz=z/2.5,ix=Math.floor(gx),iz=Math.floor(gz);
    const tx=gx-ix,tz=gz-iz;
    const a=this.foldHeight(ix,iz),b=this.foldHeight(ix+1,iz);
    const c=this.foldHeight(ix,iz+1),d=this.foldHeight(ix+1,iz+1);
    // Align folds with the extraction grid's x/z diagonal. Opposing diagonals
    // were sampled into little zigzags that broke one paper face into shards.
    const folded=tx>=tz ? a*(1-tx)+b*(tx-tz)+d*tz
      : a*(1-tz)+d*tx+c*(tz-tx);
    return folded-this.bankDrop(x,z);
  }

  bankDrop(x,z) {
    const edge=2.8+x*.12+Math.abs(x+2)*.08;
    return 1.25*clamp((z-edge)/.55,0,1);
  }

  _authoredDensity(x, y, z) {
    const margin = this.step * .65;
    const shell = Math.max(
      this.min.x + margin - x, x - this.max.x + margin,
      this.min.z + margin - z, z - this.max.z + margin,
      this.min.y + margin - y,
    );
    return Math.max(y - this.authoredHeight(x, z), shell);
  }

  /** Trilinear interpolation of the authoritative density samples. */
  density(x, y, z = 0) {
    if (![x, y, z].every(Number.isFinite)) return Infinity;
    if (x < this.min.x || x > this.max.x || y < this.min.y || y > this.max.y || z < this.min.z || z > this.max.z) {
      return this.step + Math.hypot(Math.max(this.min.x - x, 0, x - this.max.x), Math.max(this.min.y - y, 0, y - this.max.y), Math.max(this.min.z - z, 0, z - this.max.z));
    }
    const gx = (x - this.min.x) / this.step, gy = (y - this.min.y) / this.step, gz = (z - this.min.z) / this.step;
    const ix = Math.min(this.nx - 2, Math.floor(gx)), iy = Math.min(this.ny - 2, Math.floor(gy)), iz = Math.min(this.nz - 2, Math.floor(gz));
    const tx = gx - ix, ty = gy - iy, tz = gz - iz;
    const v = (dx, dy, dz) => this.values[this.index(ix + dx, iy + dy, iz + dz)];
    return mix(
      mix(mix(v(0, 0, 0), v(1, 0, 0), tx), mix(v(0, 1, 0), v(1, 1, 0), tx), ty),
      mix(mix(v(0, 0, 1), v(1, 0, 1), tx), mix(v(0, 1, 1), v(1, 1, 1), tx), ty), tz,
    );
  }

  gradient(x, y, z = 0) {
    const epsilon = this.step * .25;
    const dx = this.density(x + epsilon, y, z) - this.density(x - epsilon, y, z);
    const dy = this.density(x, y + epsilon, z) - this.density(x, y - epsilon, z);
    const dz = this.density(x, y, z + epsilon) - this.density(x, y, z - epsilon);
    const length = Math.hypot(dx, dy, dz);
    return length > EPSILON ? { x: dx / length, y: dy / length, z: dz / length } : { x: 0, y: 1, z: 0 };
  }

  /** Every vertical boundary, highest first; caves retain floor and ceiling. */
  verticalCrossings(x, z = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x <= this.min.x || x >= this.max.x || z <= this.min.z || z >= this.max.z) return [];
    const crossings = [];
    let upperY = this.max.y, upperValue = this.density(x, upperY, z);
    for (let iy = this.ny - 2; iy >= 0; iy--) {
      const lowerY = this.min.y + iy * this.step, lowerValue = this.density(x, lowerY, z);
      if ((upperValue >= 0) !== (lowerValue >= 0)) {
        const y = lowerY + (upperY - lowerY) * -lowerValue / (upperValue - lowerValue);
        crossings.push({ y, type: upperValue >= 0 ? 'floor' : 'ceiling', normal: this.gradient(x, y, z) });
      }
      upperY = lowerY; upperValue = lowerValue;
    }
    return crossings;
  }

  surfaceY(x, z = 0) { return this.verticalCrossings(x, z).find(crossing => crossing.type === 'floor')?.y ?? null; }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Density terrain listener must be a function.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(event) {
    for (const listener of this.listeners) { try { listener(event, this); } catch { /* Views cannot undo a completed edit. */ } }
  }

  /** Smooth CSG sphere edit; subtraction can make tunnels below intact ground. */
  brush(center, { radius = .85, mode = 'dig', smoothness = this.step * .22, emit = true } = {}) {
    if (!finitePoint(center)) throw new TypeError('A finite brush center is required.');
    if (!Number.isFinite(radius) || radius < this.step * .35 || radius > 8) throw new RangeError('Brush radius is outside the supported range.');
    if (mode !== 'dig' && mode !== 'add') throw new RangeError('Brush mode must be dig or add.');
    if (!Number.isFinite(smoothness) || smoothness < 0 || smoothness > radius) throw new RangeError('Invalid brush smoothness.');
    const reach = radius + smoothness + this.step;
    const from = {}, to = {};
    for (const [axis, count] of [['x', this.nx], ['y', this.ny], ['z', this.nz]]) {
      from[axis] = clamp(Math.floor((center[axis] - reach - this.min[axis]) / this.step), 1, count - 2);
      to[axis] = clamp(Math.ceil((center[axis] + reach - this.min[axis]) / this.step), 1, count - 2);
    }
    let changedSamples = 0;
    const changedMin = { x: Infinity, y: Infinity, z: Infinity }, changedMax = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (let iz = from.z; iz <= to.z; iz++) for (let iy = from.y; iy <= to.y; iy++) for (let ix = from.x; ix <= to.x; ix++) {
      const point = { x: this.min.x + ix * this.step, y: this.min.y + iy * this.step, z: this.min.z + iz * this.step };
      const sphere = Math.hypot(point.x - center.x, point.y - center.y, point.z - center.z) - radius;
      if (sphere > smoothness + this.step) continue;
      const index = this.index(ix, iy, iz), previous = this.values[index];
      const next = Math.fround(mode === 'dig' ? -smoothMin(-previous, sphere, smoothness) : smoothMin(previous, sphere, smoothness));
      if (Math.abs(next - previous) < EPSILON) continue;
      this.values[index] = next;
      const delta = Math.fround(next - this.baseline[index]);
      if (Math.abs(delta) < EPSILON) this.edits.delete(index); else this.edits.set(index, delta);
      for (const axis of ['x', 'y', 'z']) { changedMin[axis] = Math.min(changedMin[axis], point[axis]); changedMax[axis] = Math.max(changedMax[axis], point[axis]); }
      changedSamples++;
    }
    if (changedSamples) { this.revision++; this.version = this.revision; }
    const result = { changed: changedSamples > 0, action: mode, center: { ...center }, radius, changedSamples, revision: this.revision, bounds: changedSamples ? { min: changedMin, max: changedMax } : null };
    if (changedSamples && emit) this._emit(result);
    return result;
  }

  dig(x, y, z = 0, options = {}) { return this.brush({ x, y, z }, { ...options, mode: 'dig' }); }
  add(x, y, z = 0, options = {}) { return this.brush({ x, y, z }, { ...options, mode: 'add' }); }
  digSphere(center, radius = .85, options = {}) { return this.brush(center, { ...options, radius, mode: 'dig' }); }
  addSphere(center, radius = .85, options = {}) { return this.brush(center, { ...options, radius, mode: 'add' }); }

  exportState() {
    return { format: FORMAT, version: STATE_VERSION, generatorVersion: GENERATOR_VERSION, step: this.step, min: { ...this.min }, max: { ...this.max }, edits: [...this.edits].sort((a, b) => a[0] - b[0]) };
  }

  serialize() { return JSON.stringify(this.exportState()); }

  /** Validate the entire delta snapshot before replacing the current volume. */
  restore(input, { emit = true } = {}) {
    let state = input;
    if (typeof input === 'string') { try { state = JSON.parse(input); } catch { return false; } }
    if (!state || state.format !== FORMAT || state.version !== STATE_VERSION || state.generatorVersion !== GENERATOR_VERSION || state.step !== this.step || !samePoint(state.min, this.min) || !samePoint(state.max, this.max) || !Array.isArray(state.edits) || state.edits.length > this.values.length) return false;
    const nextEdits = new Map();
    for (const row of state.edits) {
      if (!Array.isArray(row) || row.length !== 2) return false;
      const [index, delta] = row;
      if (!Number.isSafeInteger(index) || index < 0 || index >= this.values.length || this._indexIsBoundary(index) || !Number.isFinite(delta) || Math.abs(delta) > 64 || nextEdits.has(index)) return false;
      if (Math.abs(delta) >= EPSILON) nextEdits.set(index, Math.fround(delta));
    }
    const next = this.baseline.slice();
    for (const [index, delta] of nextEdits) next[index] = this.baseline[index] + delta;
    let changed = false;
    for (let index = 0; index < next.length; index++) { if (next[index] !== this.values[index]) { changed = true; break; } }
    if (changed) { this.values.set(next); this.edits = nextEdits; this.revision++; this.version = this.revision; }
    if (changed && emit) this._emit({ changed: true, action: 'restore', revision: this.revision, bounds: { min: { ...this.min }, max: { ...this.max } } });
    return true;
  }

  stats() { return { format: FORMAT, dimensions: 3, samples: this.values.length, editedSamples: this.edits.size, step: this.step, revision: this.revision, nx: this.nx, ny: this.ny, nz: this.nz, bounds: { ...this.bounds } }; }
}

export function createDensityWorld(options) { return new DensityTerrainWorld(options); }

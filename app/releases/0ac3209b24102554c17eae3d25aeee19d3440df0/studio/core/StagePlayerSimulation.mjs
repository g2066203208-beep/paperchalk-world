const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (value, target, delta) => value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
const DEFAULTS = Object.freeze({ speed: 3.4, acceleration: 28, deceleration: 32, halfWidth: .28 });
const PAPER_LAYER_COUNT = 3;

/** Free horizontal exploration on the authored continuous paper ground. */
export class StagePlayerSimulation {
  constructor(world, options = {}) {
    if (!world?.spawn || !world.bounds || typeof world.surfaceY !== 'function') throw new TypeError('A paper stage world is required.');
    this.world = world;
    this.options = { ...DEFAULTS };
    for (const name of Object.keys(DEFAULTS)) {
      if (options[name] === undefined) continue;
      if (!Number.isFinite(options[name]) || options[name] <= 0) throw new RangeError(`Invalid movement option: ${name}`);
      this.options[name] = options[name];
    }
    this.reset();
  }

  reset() {
    this.x = this.world.spawn.x;
    this.y = this.world.surfaceY(this.x) ?? this.world.spawn.y;
    this.vx = 0; this.facing = 1; this.distance = 0;
    this.paperLayer = 0;
    return this.snapshot();
  }

  restore(value) {
    const minX = this.world.bounds.minX + this.options.halfWidth;
    const maxX = this.world.bounds.maxX - this.options.halfWidth;
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)
      || value.x < minX || value.x > maxX
      || ['vx', 'distance'].some(key => value[key] !== undefined && !Number.isFinite(value[key]))) {
      this.reset(); return false;
    }
    const groundY = this.world.surfaceY(value.x);
    if (!Number.isFinite(groundY)) { this.reset(); return false; }
    this.x = value.x; this.y = groundY;
    this.vx = clamp(value.vx ?? 0, -this.options.speed, this.options.speed);
    this.facing = value.facing === -1 ? -1 : 1;
    this.distance = Math.max(0, value.distance ?? 0);
    this.paperLayer = Number.isInteger(value.paperLayer) && value.paperLayer >= 0 && value.paperLayer < PAPER_LAYER_COUNT
      ? value.paperLayer : 0;
    return true;
  }

  setPaperLayer(layer) {
    if (!Number.isInteger(layer) || layer < 0 || layer >= PAPER_LAYER_COUNT) return false;
    if (this.paperLayer === layer) return false;
    this.paperLayer = layer;
    return true;
  }

  update(dt, { horizontal = 0 } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return this.snapshot();
    dt = Math.min(dt, .1);
    const axis = Number.isFinite(horizontal) ? clamp(horizontal, -1, 1) : 0;
    if (axis) this.facing = axis < 0 ? -1 : 1;
    this.vx = approach(this.vx, axis * this.options.speed, (axis ? this.options.acceleration : this.options.deceleration) * dt);
    const desired = this.x + this.vx * dt;
    const x = clamp(desired, this.world.bounds.minX + this.options.halfWidth, this.world.bounds.maxX - this.options.halfWidth);
    const y = this.world.surfaceY(x);
    if (Number.isFinite(y)) {
      this.distance += Math.abs(x - this.x); this.x = x; this.y = y;
    } else this.vx = 0;
    if (desired !== x) this.vx = 0;
    return this.snapshot();
  }

  snapshot() {
    return { x: this.x, y: this.y, z: 0, vx: this.vx, vy: 0, grounded: true,
      facing: this.facing, distance: this.distance, groundY: this.y, paperLayer: this.paperLayer };
  }
}

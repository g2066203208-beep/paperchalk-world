const EPSILON = 1e-7;
const approach = (value, target, delta) => value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
const DEFAULTS = Object.freeze({
  speed: 3.4, acceleration: 28, airAcceleration: 18, deceleration: 32,
  airDeceleration: 10, gravity: 22, jumpSpeed: 7.4, terminalSpeed: 28,
  coyoteTime: .1, jumpBufferTime: .12, halfWidth: .30, height: 1.65,
});

/** X/Y physics. y is the player's feet; gameplay z is always zero. */
export class PlayerSimulation {
  constructor(world, options = {}) {
    if (!world?.spawn || typeof world.queryTiles !== 'function' || typeof world.collidesAABB !== 'function') throw new TypeError('A PaperWorld is required.');
    this.world = world;
    this.options = { ...DEFAULTS };
    for (const name of Object.keys(DEFAULTS)) {
      if (options[name] === undefined) continue;
      if (!Number.isFinite(options[name]) || options[name] <= 0) throw new RangeError(`Invalid physics option: ${name}`);
      this.options[name] = options[name];
    }
    this.respawnCount = 0;
    this.reset();
  }

  bodyAt(x = this.x, y = this.y) {
    return { minX: x - this.options.halfWidth, maxX: x + this.options.halfWidth, minY: y, maxY: y + this.options.height };
  }

  supportBelow() {
    return this.world.collidesAABB({ minX: this.x - this.options.halfWidth + EPSILON, maxX: this.x + this.options.halfWidth - EPSILON, minY: this.y - .015, maxY: this.y - EPSILON });
  }

  reset() {
    this.x = this.world.spawn.x; this.y = this.world.spawn.y;
    this.vx = 0; this.vy = 0; this.facing = 1; this.distance = 0;
    this.grounded = this.supportBelow(); this.coyote = this.grounded ? this.options.coyoteTime : 0;
    this.jumpBuffer = 0;
    return this.snapshot();
  }

  restore(value) {
    const valid = value && Number.isFinite(value.x) && Number.isFinite(value.y)
      && ['vx', 'vy', 'distance'].every(key => value[key] === undefined || Number.isFinite(value[key]));
    const bounds = this.world.bounds;
    if (!valid || value.x < bounds.minX - 2 || value.x > bounds.maxX + 2 || value.y < bounds.minY - 4 || value.y > bounds.maxY + 32 || this.world.collidesAABB(this.bodyAt(value.x, value.y))) {
      this.reset(); return false;
    }
    this.x = value.x; this.y = value.y;
    this.vx = Math.max(-this.options.speed, Math.min(this.options.speed, value.vx ?? 0));
    this.vy = Math.max(-this.options.terminalSpeed, Math.min(this.options.jumpSpeed, value.vy ?? 0));
    this.facing = value.facing === -1 ? -1 : 1; this.distance = Math.max(0, value.distance ?? 0);
    this.grounded = this.vy <= 0 && this.supportBelow();
    if (this.grounded) this.vy = 0;
    this.coyote = this.grounded ? this.options.coyoteTime : 0; this.jumpBuffer = 0;
    return true;
  }

  moveHorizontal(delta) {
    if (!delta) return;
    const start = this.bodyAt();
    let target = this.x + delta;
    const sweep = { ...start, minX: Math.min(start.minX, target - this.options.halfWidth), maxX: Math.max(start.maxX, target + this.options.halfWidth) };
    for (const tile of this.world.queryTiles(sweep)) {
      if (start.maxY <= tile.minY + EPSILON || start.minY >= tile.maxY - EPSILON) continue;
      if (delta > 0 && start.maxX <= tile.minX + EPSILON && target + this.options.halfWidth > tile.minX) target = Math.min(target, tile.minX - this.options.halfWidth);
      if (delta < 0 && start.minX >= tile.maxX - EPSILON && target - this.options.halfWidth < tile.maxX) target = Math.max(target, tile.maxX + this.options.halfWidth);
    }
    const moved = target - this.x;
    this.x = target; this.distance += Math.abs(moved);
    if (Math.abs(moved - delta) > EPSILON) this.vx = 0;
  }

  moveVertical(delta) {
    const start = this.bodyAt();
    let target = this.y + delta, landed = false;
    const sweep = { ...start, minY: Math.min(start.minY, target), maxY: Math.max(start.maxY, target + this.options.height) };
    for (const tile of this.world.queryTiles(sweep)) {
      if (start.maxX <= tile.minX + EPSILON || start.minX >= tile.maxX - EPSILON) continue;
      if (delta < 0 && start.minY >= tile.maxY - EPSILON && target < tile.maxY) { target = Math.max(target, tile.maxY); landed = true; }
      if (delta > 0 && start.maxY <= tile.minY + EPSILON && target + this.options.height > tile.minY) target = Math.min(target, tile.minY - this.options.height);
    }
    if (Math.abs(target - this.y - delta) > EPSILON) this.vy = 0;
    this.y = target;
    this.grounded = landed || (this.vy <= 0 && this.supportBelow());
    if (this.grounded && this.vy < 0) this.vy = 0;
  }

  update(dt, { horizontal = 0, jumpPressed = false } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return this.snapshot();
    dt = Math.min(dt, .1);
    const axis = Number.isFinite(horizontal) ? Math.max(-1, Math.min(1, horizontal)) : 0;
    if (jumpPressed) this.jumpBuffer = this.options.jumpBufferTime;
    if (axis) this.facing = axis < 0 ? -1 : 1;
    const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const step = dt / substeps;
    for (let i = 0; i < substeps; i++) {
      this.coyote = this.grounded ? this.options.coyoteTime : Math.max(0, this.coyote - step);
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = this.options.jumpSpeed; this.grounded = false; this.coyote = 0; this.jumpBuffer = 0;
      } else this.jumpBuffer = Math.max(0, this.jumpBuffer - step);
      const rate = axis ? (this.grounded ? this.options.acceleration : this.options.airAcceleration) : (this.grounded ? this.options.deceleration : this.options.airDeceleration);
      this.vx = approach(this.vx, axis * this.options.speed, rate * step);
      this.vy = Math.max(-this.options.terminalSpeed, this.vy - this.options.gravity * step);
      this.moveHorizontal(this.vx * step);
      this.moveVertical(this.vy * step);
      if (this.y < this.world.bounds.minY - 8 || this.x < this.world.bounds.minX - 20 || this.x > this.world.bounds.maxX + 20) {
        this.respawnCount++; this.reset(); break;
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return { x: this.x, y: this.y, z: 0, vx: this.vx, vy: this.vy, grounded: this.grounded, facing: this.facing, distance: this.distance };
  }
}

const EPSILON = 1e-6;
const SKIN = .0015;
const approach = (value, target, delta) => value < target ? Math.min(value + delta, target) : Math.max(value - delta, target);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const DEFAULTS = Object.freeze({
  speed: 3.4, acceleration: 28, airAcceleration: 18, deceleration: 32,
  airDeceleration: 10, gravity: 22, jumpSpeed: 7.4, terminalSpeed: 28,
  coyoteTime: .1, jumpBufferTime: .12, halfWidth: .30, height: 1.65,
  maxSlope: .95,
});

/** Feet-based X/Y capsule motion against the local density field, including caves. */
export class TerrainPlayerSimulation {
  constructor(world, options = {}) {
    if (!world?.spawn || !world.bounds || typeof world.density !== 'function') throw new TypeError('A density terrain world is required.');
    this.world = world;
    this.options = { ...DEFAULTS };
    for (const name of Object.keys(DEFAULTS)) {
      if (options[name] === undefined) continue;
      if (!Number.isFinite(options[name]) || options[name] <= 0) throw new RangeError(`Invalid physics option: ${name}`);
      this.options[name] = options[name];
    }
    if (this.options.height < this.options.halfWidth * 2) throw new RangeError('Capsule height must be at least its diameter.');
    this.sampleSpacing = Math.min(.1, (world.step || .5) / 4);
    this.samples = this.createSamples();
    this.respawnCount = 0;
    this.reset();
  }

  createSamples() {
    const points = [], r = this.options.halfWidth - SKIN, h = this.options.height;
    const rows = Math.ceil((h - 2 * SKIN) / this.sampleSpacing);
    for (let row = 0; row <= rows; row++) {
      const y = SKIN + (h - 2 * SKIN) * row / rows;
      const bend = Math.max(0, this.options.halfWidth - y, y - (h - this.options.halfWidth));
      const extent = Math.sqrt(Math.max(0, r * r - bend * bend));
      const columns = Math.max(2, Math.ceil(2 * extent / this.sampleSpacing));
      for (let col = 0; col <= columns; col++) points.push({ x: -extent + 2 * extent * col / columns, y });
    }
    return points;
  }

  bodyAt(x = this.x, y = this.y) {
    return { minX: x - this.options.halfWidth, maxX: x + this.options.halfWidth,
      minY: y, maxY: y + this.options.height, minZ: -.12, maxZ: .12 };
  }

  /** Reject additive brushes touching this swept volume before changing the world. */
  intersectsBrush(center, radius, margin = .08) {
    if (!center || !Number.isFinite(radius) || radius < 0) return false;
    const r = this.options.halfWidth;
    const nearestY = clamp(center.y, this.y + r, this.y + this.options.height - r);
    return Math.hypot(center.x - this.x, center.y - nearestY, center.z ?? 0) < radius + r + margin;
  }

  contactAt(x = this.x, y = this.y) {
    let contact = null, minimum = -EPSILON;
    for (const point of this.samples) {
      const px = x + point.x, py = y + point.y;
      const density = this.world.density(px, py, 0);
      if (density < minimum) { minimum = density; contact = { x: px, y: py, density }; }
    }
    return contact;
  }

  collidesAt(x = this.x, y = this.y) { return this.contactAt(x, y) !== null; }

  normalAt(contact) {
    const d = .025;
    const g = this.world.gradient?.(contact.x, contact.y, 0);
    const gx = g?.x ?? g?.[0] ?? (this.world.density(contact.x + d, contact.y, 0) - this.world.density(contact.x - d, contact.y, 0));
    const gy = g?.y ?? g?.[1] ?? (this.world.density(contact.x, contact.y + d, 0) - this.world.density(contact.x, contact.y - d, 0));
    const length = Math.max(EPSILON, Math.hypot(gx, gy));
    return { x: gx / length, y: gy / length };
  }

  supports(contact) {
    return !!contact && this.normalAt(contact).y >= 1 / Math.sqrt(1 + this.options.maxSlope ** 2) - .025;
  }

  supportBelow() { return this.supports(this.contactAt(this.x, this.y - .025)); }

  reset() {
    this.x = this.world.spawn.x; this.y = this.world.spawn.y;
    // A saved landscape may cover the original spawn. Find nearby open air.
    const limit = this.world.bounds.maxY + this.options.height + 2;
    while (this.collidesAt() && this.y < limit) this.y += .1;
    this.vx = 0; this.vy = 0; this.facing = 1; this.distance = 0;
    this.grounded = this.supportBelow(); this.coyote = this.grounded ? this.options.coyoteTime : 0;
    this.jumpBuffer = 0;
    return this.snapshot();
  }

  restore(value) {
    const valid = value && Number.isFinite(value.x) && Number.isFinite(value.y)
      && ['vx', 'vy', 'distance'].every(key => value[key] === undefined || Number.isFinite(value[key]));
    const bounds = this.world.bounds;
    if (!valid || value.x < bounds.minX - 2 || value.x > bounds.maxX + 2 || value.y < bounds.minY - 4 || value.y > bounds.maxY + 32 || this.collidesAt(value.x, value.y)) {
      this.reset(); return false;
    }
    this.x = value.x; this.y = value.y;
    this.vx = clamp(value.vx ?? 0, -this.options.speed, this.options.speed);
    this.vy = clamp(value.vy ?? 0, -this.options.terminalSpeed, this.options.jumpSpeed);
    this.facing = value.facing === -1 ? -1 : 1; this.distance = Math.max(0, value.distance ?? 0);
    this.grounded = this.vy <= 0 && this.supportBelow();
    if (this.grounded) this.vy = 0;
    this.coyote = this.grounded ? this.options.coyoteTime : 0; this.jumpBuffer = 0;
    return true;
  }

  clearFraction(dx, dy) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) {
      const middle = (lo + hi) / 2;
      if (this.collidesAt(this.x + dx * middle, this.y + dy * middle)) hi = middle;
      else lo = middle;
    }
    return lo;
  }

  moveHorizontal(delta) {
    if (!delta) return;
    const target = this.x + delta;
    const contact = this.contactAt(target, this.y);
    if (!contact) { this.x = target; this.distance += Math.abs(delta); return; }
    // Follow walkable local slopes without lifting a player through a cave roof.
    const rise = Math.abs(delta) * this.options.maxSlope + .006;
    if (this.grounded && this.supports(contact) && !this.collidesAt(this.x, this.y + rise) && !this.collidesAt(target, this.y + rise)) {
      let lo = 0, hi = rise;
      for (let i = 0; i < 10; i++) {
        const middle = (lo + hi) / 2;
        if (this.collidesAt(target, this.y + middle)) lo = middle;
        else hi = middle;
      }
      this.x = target; this.y += hi; this.distance += Math.abs(delta);
      return;
    }
    const fraction = this.clearFraction(delta, 0);
    this.x += delta * fraction; this.distance += Math.abs(delta * fraction); this.vx = 0;
  }

  moveVertical(delta) {
    const count = Math.max(1, Math.ceil(Math.abs(delta) / (this.sampleSpacing * .6)));
    const part = delta / count;
    this.grounded = false;
    for (let i = 0; i < count; i++) {
      const contact = this.contactAt(this.x, this.y + part);
      if (!contact) { this.y += part; continue; }
      const fraction = this.clearFraction(0, part);
      this.y += part * fraction;
      this.grounded = part <= 0 && this.supports(contact);
      if (part < 0 && !this.grounded) {
        const normal = this.normalAt(contact);
        const slide = Math.sign(normal.x) * Math.min(.06, Math.abs(part) * 1.3);
        if (normal.y > .02 && slide && !this.collidesAt(this.x + slide, this.y)) {
          this.x += slide; this.distance += Math.abs(slide);
          return;
        }
      }
      this.vy = 0;
      return;
    }
    this.grounded = this.vy <= 0 && this.supportBelow();
    if (this.grounded && this.vy < 0) this.vy = 0;
  }

  snapDown(distance) {
    const contact = this.contactAt(this.x, this.y - distance);
    if (!this.supports(contact)) return;
    this.y -= distance * this.clearFraction(0, -distance);
    this.grounded = true; this.vy = 0;
  }

  update(dt, { horizontal = 0, jumpPressed = false } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return this.snapshot();
    dt = Math.min(dt, .1);
    const axis = Number.isFinite(horizontal) ? clamp(horizontal, -1, 1) : 0;
    if (jumpPressed) this.jumpBuffer = this.options.jumpBufferTime;
    if (axis) this.facing = axis < 0 ? -1 : 1;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      // Digging below the capsule takes effect before jump/support decisions.
      if (this.grounded && !this.supportBelow()) this.grounded = false;
      this.coyote = this.grounded ? this.options.coyoteTime : Math.max(0, this.coyote - step);
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = this.options.jumpSpeed; this.grounded = false; this.coyote = 0; this.jumpBuffer = 0;
      } else this.jumpBuffer = Math.max(0, this.jumpBuffer - step);
      const followGround = this.grounded;
      const rate = axis ? (this.grounded ? this.options.acceleration : this.options.airAcceleration) : (this.grounded ? this.options.deceleration : this.options.airDeceleration);
      this.vx = approach(this.vx, axis * this.options.speed, rate * step);
      this.vy = Math.max(-this.options.terminalSpeed, this.vy - this.options.gravity * step);
      const dx = this.vx * step;
      this.moveHorizontal(dx);
      this.moveVertical(this.vy * step);
      if (followGround && this.vy <= 0) this.snapDown(Math.abs(dx) * this.options.maxSlope + .028);
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

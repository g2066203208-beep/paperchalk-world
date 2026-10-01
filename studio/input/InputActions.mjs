const HANDLED = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space']);

function editable(target) {
  const tag = String(target?.tagName || '').toLowerCase();
  return ['input', 'textarea', 'select'].includes(tag) || target?.isContentEditable === true
    || Boolean(target?.closest?.('[contenteditable="true"], [contenteditable=""], [role="textbox"]'));
}

function nativeSpaceTarget(target) {
  const tag = String(target?.tagName || '').toLowerCase();
  return ['button', 'a', 'summary'].includes(tag) || ['button', 'link'].includes(target?.getAttribute?.('role'))
    || Boolean(target?.closest?.('button, a, summary, [role="button"], [role="link"]'));
}

/** Converts keyboard/touch edges into actions consumed once by a fixed physics tick. */
export class InputActions {
  constructor({ target = globalThis.window, viewport = null } = {}) {
    if (!target?.addEventListener) throw new TypeError('An input event target is required.');
    this.keys = new Set(); this.virtualLeft = false; this.virtualRight = false;
    this.virtualHorizontal = 0; this.virtualJump = false; this.jumpQueued = false;
    this.disposed = false; this.listeners = [];
    const listen = (object, type, handler, options) => {
      if (!object?.addEventListener) return;
      object.addEventListener(type, handler, options);
      this.listeners.push(() => object.removeEventListener(type, handler, options));
    };
    listen(target, 'keydown', event => {
      if (!HANDLED.has(event.code) || editable(event.target) || (event.code === 'Space' && nativeSpaceTarget(event.target)) || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault?.();
      if (event.code === 'Space' && !event.repeat && !this.keys.has('Space')) this.jumpQueued = true;
      this.keys.add(event.code);
    }, { passive: false });
    listen(target, 'keyup', event => {
      if (!HANDLED.has(event.code)) return;
      this.keys.delete(event.code);
      if (!editable(event.target) && !(event.code === 'Space' && nativeSpaceTarget(event.target)) && !event.ctrlKey && !event.metaKey && !event.altKey) event.preventDefault?.();
    });
    listen(target, 'blur', () => this.cancel());
    listen(target, 'pagehide', () => this.cancel());
    listen(target, 'focusin', event => { if (editable(event.target)) this.cancel(); });
    listen(target.document, 'visibilitychange', () => { if (target.document.hidden) this.cancel(); });
    listen(viewport, 'pointercancel', () => this.cancel());
    listen(viewport, 'lostpointercapture', () => this.cancel());
  }

  horizontal() {
    const keyboard = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    return keyboard || Math.max(-1, Math.min(1, this.virtualHorizontal + Number(this.virtualRight) - Number(this.virtualLeft)));
  }

  setVirtualHorizontal(value) { if (!this.disposed) this.virtualHorizontal = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
  setVirtualLeft(pressed) { if (!this.disposed) this.virtualLeft = Boolean(pressed); }
  setVirtualRight(pressed) { if (!this.disposed) this.virtualRight = Boolean(pressed); }
  pressJump() { if (!this.disposed) this.jumpQueued = true; }
  setVirtualJump(pressed) {
    if (this.disposed) return;
    if (pressed && !this.virtualJump) this.pressJump();
    this.virtualJump = Boolean(pressed);
  }

  consume() {
    const result = { horizontal: this.horizontal(), jumpPressed: this.jumpQueued };
    this.jumpQueued = false;
    return result;
  }

  cancel() {
    this.keys.clear(); this.virtualLeft = false; this.virtualRight = false;
    this.virtualHorizontal = 0; this.virtualJump = false; this.jumpQueued = false;
  }

  dispose() {
    if (this.disposed) return;
    for (const remove of this.listeners) remove();
    this.listeners.length = 0; this.cancel(); this.disposed = true;
  }
}

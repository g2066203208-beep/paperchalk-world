/** Owns the browser/native lifecycle bridge without retaining hooks after teardown. */
export function installStudioLifecycle({
  target = globalThis.window,
  document = target?.document,
  saveNow,
  resetClock,
  handleBack = () => false,
  setNativeSuspended = () => {},
  resumeView = () => {},
  discard = () => {},
} = {}) {
  if (!target?.addEventListener || typeof saveNow !== 'function' || typeof resetClock !== 'function') {
    throw new TypeError('Lifecycle requires an event target, save callback and clock reset.');
  }
  let disposed = false;
  const removers = [];
  const listen = (object, type, callback) => {
    if (!object?.addEventListener) return;
    object.addEventListener(type, callback);
    removers.push(() => object.removeEventListener(type, callback));
  };
  const save = () => {
    if (disposed) return false;
    try { return saveNow() === true; } catch { return false; }
  };
  const back = () => {
    if (disposed) return false;
    try { return handleBack() === true; } catch { return false; }
  };
  const ownedHooks = [
    ['PaperchalkSaveNow', save],
    ['PaperchalkHandleBack', back],
  ].map(([name, callback]) => {
    const previous = Object.getOwnPropertyDescriptor(target, name);
    Object.defineProperty(target, name, { value: callback, configurable: true, writable: true });
    return { name, callback, previous };
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) save();
    resetClock();
    if (!document.hidden) resumeView();
  });
  listen(target, 'blur', resetClock);
  listen(target, 'pagehide', event => {
    save();
    resetClock();
    if (!event.persisted) discard();
  });
  listen(target, 'pageshow', () => { resetClock(); resumeView(); });
  listen(target, 'paperchalk:pause', () => {
    save();
    setNativeSuspended(true);
    resetClock();
  });
  listen(target, 'paperchalk:resume', () => {
    setNativeSuspended(false);
    resetClock();
    resumeView();
  });
  return function disposeLifecycle() {
    if (disposed) return;
    disposed = true;
    for (const remove of removers) remove();
    for (const { name, callback, previous } of ownedHooks) {
      // Never overwrite a new owner installed after this instance.
      if (target[name] !== callback) continue;
      if (previous) Object.defineProperty(target, name, previous);
      else delete target[name];
    }
  };
}

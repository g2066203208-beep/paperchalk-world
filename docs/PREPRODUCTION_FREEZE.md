# 3D Production Freeze

The previous 2D preproduction freeze is retired.

From the Three.js-only migration onward:

1. Three.js is the sole world renderer.
2. New gameplay coordinates use X/Y/Z meters.
3. DOM may be used only for screen UI, not world entities.
4. No PixiJS, CardCamera or DOM world renderer may be reintroduced.
5. Player health is rendered in world space by Three.js.
6. Simulation remains fixed-step and renderer-independent.
7. Saves must remain schema-migratable.
8. Any renderer or hot-path change requires WebGL browser regression coverage.

# Paperchalk World Runtime Architecture

## Principles

Paperchalk World uses a hybrid browser-game architecture rather than forcing every concern into one abstraction.

- **ECS** owns dynamic gameplay entities and fixed-step systems.
- **Renderer contract** keeps simulation authoritative and allows DOM/Pixi backends to consume the same frame state.
- **DOM retained mode** remains appropriate for UI, dialogue, menus and accessibility-heavy controls.
- **PixiJS 8** is an optional dynamic-entity renderer and PaperPuppet host.
- **Fixed-step simulation** is used for combat; visual animation can run independently.
- **Spatial buckets and object pools** keep world queries and scrolling work bounded.
- **Lifecycle-bound loops** stop gameplay RAF work when the world is not active.

## Runtime layers

### 1. Core

`src/core/ecs-runtime.js`

A dependency-free sparse-set ECS. Components are stored as dense arrays plus sparse entity indices. Systems declare required components, phase and priority.

The first migration target is combat enemies. Existing enemy objects are temporarily stored as the `enemy` component so the current public APIs and renderer snapshots stay compatible. This is intentional: ECS migration is incremental, not a destructive rewrite.

### 2. Simulation

`src/game.js`

Still owns world traversal, player physics, interaction, inventory, dialogue and persistence. Combat enemies are scheduled through the ECS at the existing 60 Hz fixed step.

Future extractions should happen by domain, not by arbitrary file size:

1. `Transform`, `Health`, `Combat`, `AI`, `Patrol`, `Renderable` components.
2. NPC / pickup / projectile / temporary combat-effect entities.
3. Player combat state after enemy ECS parity is proven.
4. Input mapping and scene state machines.
5. Inventory/save services.

UI overlays and account/settings screens should **not** be converted into ECS entities.

### 3. Renderer boundary

`window.PaperchalkRuntime` exposes a renderer-neutral reused frame state. DOM rendering remains the safe default. `src/renderers/pixi-dynamic-renderer.mjs` subscribes to the same state and can be selected for controlled GPU testing.

### 4. Presentation

`styles/game.css`, HTML overlays and PaperPuppet animation remain presentation concerns. They can react to simulation state but do not own gameplay truth.

## Performance rules

- Do not re-create world DOM nodes while scrolling; reuse retained pools.
- Do not scan the full world for collision; use the spatial index.
- Do not run gameplay RAF on menu/auth/settings screens.
- Keep combat deterministic at a fixed step.
- Keep heavy UI and GPU assets lazy/deferred.
- Add a regression test whenever a hot-path optimization becomes an architectural invariant.
- Prefer measured DOM/Pixi/WebGL/WebGPU comparisons over switching backends for novelty.

## Migration status

- [x] Sparse-set ECS core
- [x] Enemy entities registered in ECS
- [x] Enemy AI scheduled by ECS at fixed combat step
- [x] ECS-aware combat queries
- [x] Lifecycle-bound gameplay RAF
- [x] CI guards for ECS and performance budgets
- [ ] Split legacy enemy object into granular components
- [ ] Migrate NPCs, pickups and projectiles
- [ ] Extract input/scene/save domains from the monolithic runtime

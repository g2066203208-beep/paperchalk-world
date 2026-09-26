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

`src/core/ecs-runtime.js`, `event-bus.js`, `game-state.js`, `save-runtime.js`, `card-camera.js`

The core layer is dependency-free. Sparse-set ECS stores dense component arrays plus sparse entity indices; deterministic events decouple domain side effects; the top-level app lifecycle is a finite-state machine; saves use schema migrations and a last-known-good backup. `card-camera.js` is the single X/Z/Y perspective authority for the outdoor open-card stage.

Combat enemies now expose granular `Transform`, `Health`, `Combat`, `AI`, `Patrol` and `Renderable` components while retaining a temporary compatibility object for unchanged renderer/debug APIs.

### 2. Content

`src/content/game-content.js`

Authored world graph, NPC dialogue, enemy archetypes, seed spawns and item definitions use stable IDs and are validated before game boot. Runtime code clones only the mutable state it needs.

### 3. Simulation

`src/game.js`

Acts as the compatibility composition root while domain systems are extracted. Combat enemies are scheduled through the ECS at the existing 60 Hz fixed step; world/NPC/enemy/item definitions no longer belong to the main loop.

Future extractions should happen by domain, not by arbitrary file size:

1. `Transform`, `Health`, `Combat`, `AI`, `Patrol`, `Renderable` components.
2. NPC / pickup / projectile / temporary combat-effect entities.
3. Player combat state after enemy ECS parity is proven.
4. Input mapping and scene state machines.
5. Inventory/save services.

UI overlays and account/settings screens should **not** be converted into ECS entities.

### 4. Renderer boundary

`window.PaperchalkRuntime` exposes a renderer-neutral reused frame state including player/enemy Z depth. `src/renderers/dom-card-projection.js` and `src/renderers/pixi-dynamic-renderer.mjs` consume the same `PaperchalkCardCamera` projection so DOM and GPU cannot drift into different perspective rules. DOM remains the safe default; Pixi can be selected for controlled GPU testing.

### 5. Presentation

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
- [x] Split enemy state into granular ECS component sources
- [x] Add deterministic event bus and app state machine
- [x] Add authored content registry + validation
- [x] Add schema-v3 saves, v2 migration and last-known-good backup
- [x] Add shared X/Z/Y card camera, infinite grid references and DOM/Pixi projection parity
- [ ] Migrate NPCs, pickups and projectiles into ECS where simulation benefits
- [ ] Extract input commands, scene traversal and inventory domains from the compatibility runtime

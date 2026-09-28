# Paperchalk World — Paper Stage Architecture

## 1. Rendering model

Production rendering remains Three.js r180 WebGL, but the game is intentionally **2.5D**.

```text
Input
  ↓
ECS fixed-step X/Y simulation
  ↓
TerrainWorld + Paper Entities
  ↓
PaperchalkRuntime snapshot
  ↓
World3DEngine
  ↓
Three.js WebGLRenderer
```

Z is a presentation coordinate. It separates far background, rear paper entities, the terrain sheet, actors and foreground paper entities.

## 2. Terrain

`src/terrain/terrain-runtime.js` owns the only block/voxel layer.

- tile size: 0.25 m
- chunk size: 64×64 cells
- depth: exactly one gameplay layer
- storage: Uint8Array
- coordinates: integer X/Y cell coordinates
- generation: FastNoiseLite 1.1.1; OpenSimplex2S for broad surface/caves, Perlin for detail, Cellular for material strata
- mutation: dig/place
- persistence: per-chunk edit deltas
- streaming: chunks outside the active window are unloaded and regenerated from seed when revisited

The renderer turns each visible chunk into one vertex-colored `BufferGeometry`. A tile is not a separate Three.js object.

The official FastNoiseLite JavaScript distribution is vendored under `vendor/fastnoise-lite/` with its MIT license header intact. Terrain generation remains deterministic from the world seed. A small built-in fallback is retained for diagnostics, but production reports `noiseBackend: "FastNoiseLite-1.1.1"`.

## 3. Paper entities

`src/entities/PaperSpriteEntity.js` owns non-terrain visuals.

Every building, tree, rock, player, NPC, enemy or prop is represented by a textured `PlaneGeometry` in the stage. The current development textures are generated into CanvasTexture objects so the renderer already exercises the final texture-plane path without returning to DOM/Pixi rendering.

Player facing uses a real paper flip: the plane rotates around Y toward 0 or π, becoming edge-on in the middle of the turn.

## 4. Gameplay simulation

`src/game.js` treats X as horizontal movement and Y as vertical movement. The player cannot walk through Z.

Terrain collision uses the same TerrainWorld cells used by rendering. Gravity, jump and horizontal movement are resolved against the X/Y block field. This allows the player to dig beneath themselves and fall into generated underground space.

## 5. Camera

Normal play locks the camera along the Z axis, preserving the side-on paper theatre composition.

The debug panel can:
- enable/disable the paper-stage camera lock
- switch the fixed observation axis between Z and X
- orbit freely when the lock is disabled
- inspect renderer/terrain statistics

## 6. Persistence

Schema V5 stores the paper-stage transform and terrain deltas:

```json
{
  "player": {"x": 0, "y": 3, "z": 0.45, "yaw": 0},
  "terrainEdits": [[0, -1, 123, 0]],
  "playerHp": 10,
  "worldMinutes": 360,
  "inventory": []
}
```

Negative Y is valid so underground positions can be saved. V2–V4 saves migrate into the single gameplay plane.

## 7. Removed systems

The old DOM Card Camera, Pixi renderer, PaperPuppet world renderer, 2D DOM actor, old background/traffic layers and volumetric procedural building/tree meshes are not production paths. Screen-space menus, inventory and the network-map canvas remain UI only.

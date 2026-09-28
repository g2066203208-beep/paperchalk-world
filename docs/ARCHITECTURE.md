# Paperchalk World — Three.js Production Architecture

## 1. Single rendering authority

The world has one production renderer: Three.js r180 WebGL.

```text
Input
  ↓
ECS fixed-step simulation
  ↓
PaperchalkRuntime snapshot
  ↓
World3DEngine
  ↓
Three.js Scene
  ↓
WebGLRenderer
```

DOM is not a world renderer. It is restricted to screen-space UI such as menus, inventory, the network map, camera controls and debug controls.

## 2. Gameplay state

`src/game.js` owns the authoritative player simulation using X/Y/Z coordinates.

The player ECS entity contains:

- Transform: x, y, z, yaw
- Velocity: x, y, z
- Health: current, max
- Player controller state: grounded, crouching, attacking, action

Movement and gravity run at a fixed 60 Hz step. 3D building collisions are resolved in X/Z; Y is vertical height.

## 3. Renderer

`src/engine3d/World3DEngine.js` owns:

- Scene
- PerspectiveCamera
- WebGLRenderer
- lighting and shadows
- procedural village geometry
- third-person camera rig
- player mesh
- 3D world-space health bar
- collider debug helpers

`src/renderers/three-world-renderer.mjs` is the lifecycle adapter. It lazy-loads Three.js, subscribes to `PaperchalkRuntime`, starts rendering on `paperchalk-world-enter`, and stops on `paperchalk-world-leave`.

## 4. Health UI

The health bar is a Three.js group attached directly to the player mesh.

It contains ten pieces: nine standard cells plus a tail cell. The group copies the camera quaternion every frame so it behaves as a world-space billboard. Damage and healing animate the 3D fill meshes; there is no DOM health bar.

## 5. Persistence

Save schema V4 stores:

```json
{
  "player": {"x":0,"y":0,"z":13,"yaw":3.14159},
  "playerHp":10,
  "worldMinutes":360,
  "inventory":[]
}
```

V2/V3 2D saves are migrated once into the native 3D transform.

## 6. Removed legacy renderer stack

The following are intentionally absent:

- Card Camera
- DOM card projection renderer
- PixiJS renderer
- PixiJS vendor bundle
- PaperPuppet runtime
- 2D player actor/sprite
- 2D ground/map/entity/traffic layers
- DOM health bar
- 2D world art asset tree

Tests fail if these systems return.

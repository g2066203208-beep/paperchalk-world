# Architecture

## Principle

MCUB keeps both simulations alive.

```text
┌──────────────── Minecraft / javaw.exe ────────────────┐
│ Minecraft physics, inventory, blocks, combat, items   │
│                    mc-core                            │
└────────────────────────┬───────────────────────────────┘
                         │ Local\\MCUB_v1
                         │ shared memory
┌────────────────────────┴───────────────────────────────┐
│                    mcub-host.exe                      │
│ transport + scheduling + stable adapter ABI           │
└────────────────────────┬───────────────────────────────┘
                         │ C ABI
              ┌──────────┼───────────┐
              │          │           │
           Unity      Unreal      Native game
           adapter     adapter       adapter
```

The host game is authoritative for its world. Minecraft is authoritative for Minecraft player movement and Minecraft mechanics.

## Why a separate host runtime?

Putting the entire bridge inside each injected DLL would make every adapter responsible for transport, versioning, buffering, crash handling and Minecraft synchronization.

Instead, an adapter only exposes host-specific facts. The runtime owns the stable protocol.

A future in-process mode may embed the runtime into a game plugin, but it must preserve the same ABI.

## Shared-memory ownership

The host runtime creates `Local\\MCUB_v1`. The MC process opens it.

Single-writer rules:

- Host writes `HostState`, entity table, input ring, host-event ring and collision ring.
- MC writes `McState` and MC-event ring.
- Both update only their own heartbeat field.

Latest-value state uses seqlocks. Ordered events use SPSC rings. Large variable collision payloads use a byte ring.

No JSON and no heap pointers cross the process boundary.

## Coordinates

All protocol coordinates are already in Minecraft space:

- X: east/right;
- Y: up;
- Z: south/forward;
- distance: blocks.

An adapter owns conversion from its engine.

The protocol carries `unitsPerBlock` only for diagnostics. The MC side never applies a Skyrim/Unreal/Unity-specific transform.

## Adapter ABI

An adapter exports:

```cpp
extern "C" const McubAdapterV1* mcub_create_adapter_v1();
```

The v1 table contains:

- lifecycle;
- host-state sampling;
- entity enumeration;
- application of the MC player state to the host puppet;
- MC event handling.

The runtime gives the adapter services for:

- logging;
- pushing host input;
- pushing host events;
- streaming collision messages.

This lets an adapter publish asynchronous engine information without knowing anything about the shared-memory implementation.

## Collision pipeline

The universal collision representation starts with exact triangles and AABBs.

```text
Host physics scene
      ↓ adapter
triangle / box batches
      ↓ shared memory
MC collision cache
      ↓
Minecraft collision hooks
```

A Fabric integration can derive two representations:

1. exact triangles for the local player and smooth slopes;
2. 8×8×8 sub-voxel occupancy for vanilla entity/block queries.

That preserves the useful SkyCraft idea without coupling the protocol to Creation Engine or Havok.

## Foreign entities

A host actor becomes a `McubEntityRecord` identified by an opaque 64-bit id.

Minecraft may mirror it as an invisible hittable proxy. MC combat produces a `McubGameEvent`; the adapter applies the result through the target game's own damage system.

No FormID, UObject pointer or Unity InstanceID appears in the MC core. Those are adapter implementation details.

## Renderer

Rendering is intentionally not hard-wired in protocol v1. The memory map reserves a render ring so the ABI can grow without breaking the state/event regions.

The intended split is:

- GUI / inventory / hand: transparent framebuffer overlay;
- blocks / players / entities: exported Minecraft geometry rendered by the host renderer when possible;
- generic fallback: depth-aware compositor backend.

Renderer backends will be separate from gameplay adapters so one DirectX/Vulkan backend can serve many games.

## Next implementation stages

1. Replace the mock MC client with a Fabric integration module.
2. Add `ForeignCollision` mixins to Minecraft.
3. Add a generic render backend.
4. Build Unity adapter.
5. Build Unreal adapter.
6. Port Skyrim into the adapter ABI as the first native-engine reference.

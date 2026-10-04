# MC Universal Bridge

MC Universal Bridge (MCUB) is a host-agnostic bridge for running the real Minecraft Java simulation beside another 3D game.

The goal is not "one hard-coded Minecraft mod per game". The goal is:

```text
Minecraft Java + MCUB core
          ↕
stable shared-memory protocol
          ↕
MCUB host runtime
          ↕
thin game / engine adapter
```

A target game keeps its world, NPCs, quests, saves, renderer and AI. Minecraft keeps Minecraft movement, inventory, blocks, items, combat and simulation. The bridge translates only the data that crosses the boundary.

## Current status — v0 foundation

This branch contains the first executable foundation:

- stable little-endian protocol v1;
- Windows named shared memory transport;
- seqlock state exchange for host and Minecraft player state;
- SPSC input, host-event and Minecraft-event rings;
- nearby foreign-entity table;
- streamed collision byte ring;
- versioned C adapter ABI;
- DLL host runtime;
- fake game adapter for end-to-end bring-up;
- Java 25 MC-side core that can connect without Minecraft dependencies;
- protocol layout smoke tests.

This is deliberately built before engine-specific adapters. If the fake adapter cannot connect cleanly, adding Skyrim, Unreal or Unity would only hide architectural bugs.

## Repository layout

```text
mc-universal-bridge/
├─ protocol/
│  └─ mcub_protocol.h
├─ host-sdk/
│  └─ include/mcub/host_adapter.h
├─ host-runtime/
│  ├─ CMakeLists.txt
│  └─ src/
├─ examples/
│  └─ fake-adapter/
├─ mc-core/
│  ├─ build.gradle
│  ├─ settings.gradle
│  └─ src/main/java/dev/mcub/core/
├─ tests/
│  └─ test_protocol_layout.py
└─ ARCHITECTURE.md
```

## Build the Windows host runtime

Requirements: Visual Studio 2022+ with C++ and CMake 3.25+.

```powershell
cd mc-universal-bridge/host-runtime
cmake -S . -B build -A x64
cmake --build build --config Release
```

This builds:

- `mcub-host.exe`
- `mcub-fake-adapter.dll`

Run:

```powershell
./build/Release/mcub-host.exe ./build/Release/mcub-fake-adapter.dll
```

The host creates `Local\\MCUB_v1`.

## Run the MC-side protocol client

The Java module intentionally has no Minecraft dependency yet. It proves that the MC side can attach to the exact ABI before Fabric mixins are introduced.

Use a local Gradle installation:

```powershell
cd mc-universal-bridge/mc-core
gradle run
```

Run it while `mcub-host.exe` is active. The mock MC process reads the fake game world, reports the fake actor, consumes collision messages and publishes an MC player state back to the host.

## Adapter rule

Game-specific logic is forbidden from the MC core.

Adapters may translate:

- host coordinates ↔ MC coordinates;
- host collision ↔ MCUB triangles / boxes;
- host actors ↔ MCUB entities;
- MC state ↔ host player puppet;
- host damage ↔ MCUB host events;
- MC damage / interaction ↔ MCUB MC events.

Adapters must not reimplement Minecraft mechanics.

## Target support tiers

- **Tier 0:** HUD / UI overlay only.
- **Tier 1:** Minecraft movement in the host world.
- **Tier 2:** blocks, liquids and Minecraft world interaction.
- **Tier 3:** bidirectional actor combat and interaction.
- **Tier 4:** renderer integration, persistence and game-specific polish.

Common engines should eventually reach Tier 1–3 mostly through engine adapters. Custom engines will still need game-specific discovery.

## Scope and safety

MCUB is intended for offline, single-player and mod-friendly games. It is not designed to bypass anti-cheat or protections in competitive online games.

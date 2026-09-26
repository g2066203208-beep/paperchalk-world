# Pre-production Architecture Freeze

This file locks the engine boundaries for full game production.

## Frozen decisions

1. Simulation owns gameplay truth. Renderers consume state; DOM/Pixi never become authoritative gameplay state.
2. ECS owns dynamic gameplay entities. UI, menus and accessibility-heavy surfaces remain retained DOM.
3. Authored content is data with stable IDs and validation before boot.
4. Cross-system side effects use the event bus instead of direct imports between combat, quests, loot, progression and narrative.
5. Top-level menu/auth/settings/world lifecycle uses an explicit finite-state machine.
6. Saves are versioned, forward-migrated and written with a last-known-good backup.
7. Combat remains fixed-step and deterministic. Visual refresh rate may vary by device.
8. Zero runtime dependency is the default. New packages require a measured or product-level reason.
9. Performance invariants require regression tests.
10. New content must not require adding unrelated blocks to src/game.js.

## Stable runtime layers

- src/core/: ECS, events, state and save codecs; future input command queue belongs here.
- src/content/: authored world, NPC, enemy, item, ability, quest and god definitions.
- src/systems/: extracted domain systems as the compatibility runtime shrinks.
- src/renderers/: DOM/Pixi presentation adapters only.
- src/puppet/: character presentation animation.
- src/game.js: compatibility composition root during migration; it must shrink over time.

## Required content rules

- Every authored entity has a stable string ID.
- References use IDs, not array positions.
- Content files are immutable at runtime; mutable simulation state is cloned into ECS/world state.
- Route endpoints must reference existing world node IDs.
- Enemy spawns must reference existing enemy archetypes.
- Save files store state IDs, never DOM nodes or renderer objects.

## Extraction order after this freeze

1. Input command map.
2. Enemy combat/AI systems.
3. Interaction/dialogue orchestration.
4. Inventory service.
5. Scene/world traversal service.
6. Local profile/save UI service.

Feature development can proceed in parallel with these extractions, but no new large feature should deepen the central runtime monolith.

# V19 · Attack Card Cinematic Director (Darkest Dungeon-style rhythm)

## Scope
A testable **presentation director** layered over the approved fixed-left, eye-height 3/4 WebGL battle scene. This is NOT a second camera-switch mode or a new combat-rules engine.

The card is **斧柄横扫 (slash)** from the existing `site/combat-lab/engine.js`: 12 damage, 1 wind-up / 1 active / 1 recovery time-grid ticks. The renderer takes the canonical description through `Timegrid.CARD` and independently runs a ~1.54s visual preview. The time-grid and deck remain authoritative for actual gameplay. No silent edits to draw piles, energy, action times, or enemy simulations.

## Visual direction and constraints
1. User clicks the graphical Attack card to enter target selection.
2. Four targets numbered **1–4** are anchored to real 3D projected enemy silhouettes, not floating arbitrarily on the canvas.
3. Tap a target or press 1–4. The director locks a selected actor, makes a small **temporary** in-place dolly and tighter FOV, winds up the heroine, advances the source plane a little, then plays a graphical diagonal axe arc.
4. A short hit-stop cue flashes the **selected target only**. Target recoils and `-12` appears over that actual projected position. End of demo action restores the camera and both sprites to their untouched world anchors.
5. In the standalone **preview only**, each enemy begins at 36 HP so repeated hits visibly update HP once per attack. This is a display rehearsal, not the persistent campaign combat state.
6. Heavy motion is reduced automatically for users with reduced-motion preferences. A rapid double-click, mode switch, hidden scene and repeated target cannot enqueue duplicate concurrent attacks.

## Invariants
- One left-side fixed CAMERA_STOPS per encounter mode; 3/4 art remains the same.
- The actual idle camera is eye-level (1.50 m, 0° pitch); cinematic moves must also keep a horizontal sightline.
- Canonical actor arrays are Object.freeze-immutable; no actor's actual x/y/z/height/rig data is mutated by any attack.
- The original approved Live2D parts and editor masks are never overwritten, stretched or painted over.
- Only the target flashes; no game-wide CSS tilt or zoom that misaligns target selectors.
- UI controls stay under the battle stage only; other scenes use their original controls.
- No copyrighted animation/audio footage or game assets are copied.

## Modules / tests
`site/game/ring-arena-director.js`: deterministic timeline, motion, camera cue and screen anchors.

`site/game/ring-arena-director.css`: responsive attack card, target numbering, transient FX. No global style overrides.

`site/game/ring-arena-runtime.js`: WebGL renderer integration and ephemeral actor copies.

`tests/ring-arena-director.test.cjs`: validates actual Timegrid slash card values, timing, zero vertical tilt, target-only motion, zero mutable position drift and exact return.

`tests/ring-arena-browser.mjs`: actually clicks Attack → #2 target in Chromium; captures selection, impact and return; checks only enemy #2 loses HP and all idle 3D camera/actor values are exactly restored.

Run `node tests/ring-arena.test.cjs && node tests/ring-arena-director.test.cjs` before publishing. The Playwright workflow uses Chromium WebGL software fallback for actual frame evidence.

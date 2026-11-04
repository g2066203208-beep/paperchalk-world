# Horror game runtime architecture — first performance and modularity pass (2026-11-04)

## Single source of truth
- **Scene registry:** site/scene-modules.js + generated scene-catalog, separate from rendering; new backgrounds are added under site/assets/scenes.
- **Narrative data:** site/game/story-content.js owns the existing classroom/bedroom lines. Story engine and save-state transitions remain in the page during migration.
- **Asset lifecycle:** site/game/scene-preloader.js deduplicates decoding; bounded LRU retains no more than three scene images and evicts failed loads for retry.
- **Gameplay state:** site/game/survival-state.js is the authoritative health/hunger/sanity state.
- **Rendering:** page owns one unchanged GPU/CPU fluid simulation and projected camera; site/game/frame-budget.js caps only the optional, CPU-heavy UI fog resample at 30 fps. Actual fluid remains rAF-driven.
- **UI composition:** site/game/dialogue-layout.css positions subtitles to the right of the foreground heroine without adding a rectangular black panel. site/game/phone-ui.js is independently owned.
- **Actors:** site/l2d and site/dev/character-bridge.js continue sharing canonical character parts and grounding. The close-up camera and enemy Z-plane are deliberately untouched.

## Performance constraints
1. Browser visibility resets optional drawing cadence; overlay interpolation uses measured elapsed time (clamped on resume).
2. No readback from the animated L2D canvas. Existing ground shoe sampling remains offscreen and memoized.
3. No additional requestAnimationFrame loop for secondary fog; it rides the existing world loop.
4. Do not hide the subtitle fog when a phone opens: the bottom belongs to text, right belongs to the phone. Existing layer assertions stay authoritative.
5. Any refactor of frame scheduling must pass the actual Playwright fog, camera, ground and phone tests, not screenshots alone.
6. L2D assets and scene images remain unchanged; this pass is not an art redraw or a gameplay-completeness claim.

## Verification
- node tests/game-runtime-modules.test.cjs
- node tests/game-render-budget-browser.mjs (requires Playwright Chromium)
- Existing UI fog and character camera Playwright suites.
- GitHub Actions Classroom and fog QA + UI fog fast real browser regression.

## Future modules (not yet completed)
Move legacy inline GPU/CPU fog algorithms, game-story transitions, the developer overlay and HUD DOM orchestration into separately tested runtime units. Add frame-time percentiles, memory instrumentation, long-duration idle/mobile measurements and full gameplay save migrations. Those changes should be incremental and must keep character rigs and camera geometry stable.

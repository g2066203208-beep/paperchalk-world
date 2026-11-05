# Paperchalk World | Game / DEV / L2D engineering QA baseline

Date: 2026-11-05. This document records verifiable repository behavior and safe future work; it does not declare all devices artifact-free or all game features complete.

## Immutable product constraints

- The approved protagonist face, body size, near-camera crop, outfit images, painted masks, bone hierarchy and authored world positions are source material, **not optimization knobs**. The near character may intentionally extend below the viewport; requiring both feet to be onscreen is an obsolete test.
- Five-face 3D classroom is first-person **pivot-only** Pan/Tilt: mouse right means look right, mouse down means look down, camera X/Y/Z do not move during this input. DEV fixed inspection viewpoints are separate from ordinary game controls.
- Background, projected actors, world fog, UI fog and close heroine have distinct ownership. Fog must remain live even when the DEV panel is open.
- The all-character Studio defaults to safe canvas pan. Secondary joint/motion sliders are discoverable via “更多动态参数”; do not reintroduce an always-expanded wall of buttons to satisfy stale tests.
- The project uses self-authored Canvas PartRig, not Cubism .moc3. Studio and game must use the same canonical character ID and authentic source-part textures.

## Delivered changes and QA sources

- PR #139: [DEV/L2D test + Pages quality-gate](https://github.com/g2066203208-beep/paperchalk-world/pull/139). Browser QA now tests the intended translucent professional DEV inspector plus the *independent* animated fog, and explicitly opens hidden advanced L2D controls before interacting with them.
- Release workflow `.github/workflows/character-editor-pages.yml` runs deterministic game/L2D tests and actual desktop/mobile Chromium fog and Studio smoke checks **before** uploading and deploying Pages. Failed checks block the deployment job.
- The runner is pinned to `ubuntu-24.04` because the pinned Playwright 1.56.1 cannot install Chromium dependencies on `ubuntu-latest` when it resolves to Ubuntu 26.04.
- Scene preloader `site/game/scene-preloader.js` keeps an in-flight promise map independent of its bounded completed-image LRU. Rapid scene changes no longer re-decode the same still-pending image if the LRU entry was evicted. See `tests/game-runtime-modules.test.cjs`.
- Browser QA clock and frame cadence assertions now wait for live clock/frame progress instead of assuming that two samples cannot cross a minute or that SwiftShader always renders a fixed number of frames in 1.4 seconds.
- PR #140: [bounded frame telemetry](https://github.com/g2066203208-beep/paperchalk-world/pull/140). `PaperWorldRenderMetrics().timing` exposes rolling FPS, mean/p50/p95 frame intervals and cumulative slow-frame counts. Exactly one existing world rAF records into a 240-sample ring; no second animation loop or Canvas readback.
- The long classroom QA expects the close-up heroine to intersect the bottom edge rather than insisting on fully visible shoes. Geometric screenshot tests must clip projected edges to the viewport before reading pixel values.

## Operational verification

1. A green Pages deployment proves the generated site passed its **own** included release gates. It does not replace the wider independent classroom, L2D module, and device workflows.
2. Before changes to actor renderer selection, verify `tests/test_l2d_studio_game_sync.cjs`, `tests/test_l2d_display_lifecycle.cjs`, game-character E2E and published L2D modules. A user-painted local rig cannot silently fall back to an older flat image.
3. Before changes to camera/fog, verify `tests/scene-camera.test.cjs`, `tests/classroom-box-camera.test.cjs`, full screenshot QA, viewport corner safety and phone landscape/portrait behavior.
4. When reviewing a red workflow, read the **first failing step and its log**. Do not overwrite approved art or alter gameplay merely because an old UI-appearance assertion needs updating.
5. Personal Studio edits save to same-origin IndexedDB; they are not GitHub publications. Asset/module export and explicit GitHub commit are required for portable cross-device release.

## Next performance work (not yet claimed complete)

- Profile Studio full-layer `snapshot()` and `save()` serialization, especially 20–25 part PNG Data URLs and 48-deep undo histories; introduce **tested** per-layer copy-on-write histories without risking stale artwork recovery.
- Long-session phone memory, context recovery, repeated actor/scene switching and quantile-based jank measurements using the new telemetry. Do not lower artist-approved face resolution just to chase an arbitrary FPS.
- Incrementally extract the legacy inline world fog, Dev DOM orchestration and save migrations from `site/index.html` into separately tested modules.
- Audit the separate flat-scene camera model (which still uses lateral offsets) before any unification. Preserve approved visual composition and do not force 3D pivot behavior onto existing flat scene art without visual sign-off.

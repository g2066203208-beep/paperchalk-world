# Ring Arena / fixed-left 3/4 combat camera · V17

This is a **single-camera** WebGL/L2D battle module. It is not the main campaign camera.

## Approved visual contract
- Fixed left over-shoulder view: one camera for `outer` and one corresponding left-foreground station for `inner`; no right camera, free drag, keyboard orbit or pose toggle.
- The same 3/4 back heroine artwork is reused in both modes. It has its own transparent WebP at `site/assets/characters/protagonist-back-combat-3q-final.webp`. This is a *static combat presentation*, **not** a separately rigged Live2D character.
- Original protagonist/other character L2D sources, DEV bindings, source masks and all character editors remain intact. For an emergency visual comparison, `?scene=ring-arena&heroPose=original` uses the real dynamic original back, with no data migration.
- The 4 enemies stay independent animated L2D textures and keep immutable scene-local world anchors; 3 other ally anchors are retained but not rendered in this cinematic mode.
- Eye and focus y are equal (1.32 m); the eye-level camera looks directly at the enemy group rather than the inter-party gap.
- Do not compensate for a 3:4 or 4:5 art sheet by stretching it to square. `portraitFit` letterboxes the portrait inside the square GPU upload texture.
- The 3/4 heroine only needs one GPU texture upload; animated opponents use sub-image updates.
- Use the same camera/view-projection for actor drawing and screen-space safety checks, including responsive portrait viewport FOV.

## Encounter composition
- `outer` enemies: (-1.65, 6.85), (-0.57, 6.47), (+0.57, 6.47), (+1.65, 6.85)
- `inner` enemies: (-1.62, 12.48), (-0.55, 12.87), (+0.55, 12.87), (+1.62, 12.48)
- The L2D alpha probe records the whole artwork *and* a separate upper-body reading lane. The long poleaxe may extend into the LOWER foreground without falsely failing the enemy-face readability check; its full alpha footprint remains available for visual QA. Camera-angle changes are never a reason to modify canonical source art.
- Subtle geometry-only contact shading is drawn under the 5 visible actors. The scene's floor rings follow encounter mode, not the now-removed camera debug stations.

## Verify before publish
Run `node tests/ring-arena.test.cjs` for one-camera, enemy focus, art proportions, screen safety and DPR budget.
Run `node tests/ring-arena-browser.mjs` with Playwright/Chromium after building the authored L2D assets.
Review `artifacts/ring-arena/final-left-3q-1280x720.png`, the inner-mode frame, 1920x1080, mobile landscape/portrait and the original-L2D rollback screenshot. Never use AI concept art as proof of the shipped WebGL frame.

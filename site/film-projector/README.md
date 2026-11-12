# Paper Cinema — approved-concept 2.5D stage

This is the game character-selection film projector stage, replacing the rejected geometric greybox and the older flat CSS demo. Open `/film-projector/` to play. The approved illustration is sliced into independent **RGBA WebP paper sprites** in `assets/`: background, blankable screen, filmstrip, projector body, separately rotating top and bottom reels, two curtains, floor, flower foreground, and volumetric-beam cue. `reference.webp` remains the approved original comparison image.

## Actual implementation

- Scene: `production.js`, `production.css`, `index.html`; engine: local Three.js from `../sphere-maze/vendor/three.module.js`.
- All visible machines and stage components use 2D textured **PlaneGeometry**. No `BoxGeometry`, `CylinderGeometry`, or 3D-model film projector. Parallax is actual Z-depth + fixed near-frontal perspective camera, and all silhouettes are independent images.
- A real `SpotLight` near the projector lens, `DirectionalLight`, `PointLight` and `HemisphereLight`, and `PCFSoftShadowMap` provide physical world lighting. The separate transparent projected-light paper cue and particles supplement that real light, rather than replacing it.
- Film choice advances the image projector reels, mechanical click, front selected gate and projection shutter. The seven approved monster hunter character asset paths are loaded from `site/assets/characters/monster-hunters/`, without changing or duplicating the original PNGs.
- **Artwork integrity:** Initial No.02 image is the user's approved film-room illustration, including its character mockup. On the other selections the screen swaps to the corresponding **official GitHub hunter original portrait**, on a deliberately neutral parchment surface. The five XP values are left unfilled where no canonical data exists; don't invent them.
- Clicking the projector crank/wheel advances; clicking film frames selects and advances; arrow keys or controls allow navigation. The illumination control shows a real-light off state. Comparison mode displays the approved illustration unchanged.
- The stage uses the original 1672×941 coordinate system. The painted image slices preserve exact alignment, while each has its own world-space Z layer and center pivot.

### QA

`tests/paper-cinema-production-browser.mjs` records normal scene, next frame, dark lighting, and original-art comparison on Chromium with software WebGL. Workflow: `.github/workflows/paper-cinema-production-qa.yml`.

### Still to paint later

The approved reference image is a **visual master**, not a set of genuinely orthographic individual paintings: some cutout silhouettes have the original composition's light already baked into their pixels. Future Anima per-object sprites can replace these texture URLs one by one, without changing the geometry, projector reel pivots or layout.
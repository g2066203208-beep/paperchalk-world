# 4v4 Ring Arena — canonical near-side cinematography

Updated 2026-11-08. This is a **design constraint** for the existing WebGL/L2D battlefield, not an invitation to recreate characters, paintings, or its camera.

## Non-negotiable framing

- **Heroine and ALL THREE teammates are on the player's side of the world**, nearest to the camera. All four enemies stand together at the opposite end. Do not distribute allies among the enemy silhouettes just to show eight whole bodies.
- Preserve a **large left-foreground heroine** in a true third-person over-shoulder shot, not a screen-space character HUD or a miniature full-body row.
- The camera and every actor, ceiling/wall/floor mesh, and live alpha-cast shadow use the same 3D view-projection. Cursor look orbits **only the camera**, never the heroine/world root or character body heading.
- Keep four grounded enemies individually recognizable in the normal centered view. During deliberate mouse look, incidental foreground occlusion is natural and must not trigger fake actor movement/avoidance.
- **Default battle staging uses uniform models on purpose:** four copies of the approved `female-07` back art for our team, four copies of the real `char-002` front L2D for enemies. This is a render-time source policy, NOT a destructive edit to any artist's saved L2D slot or PSD. `?formation=individual` restores distinct originally assigned roles for later production.

## Current reviewed position baseline (meters, y=0)

Coordinates below reflect the intentional hierarchy after comparing multiple real 1917×906 Chromium frames and a broad numeric sweep of **864,000 finite staging/camera samples**. The sweep is a candidate search, **not** a proof of global optimality in continuous 3D space.

| Actor | X | Z | Visual function |
| --- | ---: | ---: | --- |
| Heroine | -1.05 | 9.30 | Dominant left foreground; original back ArtMesh and axe |
| Ally 2 | -1.28 | 7.88 | Right/back partner, between heroine shoulder and enemy lane but not overlapping targets |
| Ally 3 | -2.45 | 8.15 | Left-side wing, visible along the left margin |
| Ally 4 | -1.15 | 8.55 | Behind heroine right shoulder; head offset from both heroine and ally 2 |
| Enemy 1 | -0.46 | 6.80 | Leftmost opposing target |
| Enemy 2 | 0.73 | 6.80 | Second target |
| Enemy 3 | 1.92 | 6.80 | Third target |
| Enemy 4 | 3.38 | 6.80 | Rightmost identical enemy-one portrait |

Every teammate is **at least 1.08m in physical depth nearer the camera** than the z=6.80 enemy rank. Keep the hero `(-1.05,9.30)` and lens exactly unchanged. The measured original-alpha projection at 1917×906 leaves roughly 68 pixels between any teammate and the first enemy; use the original PNG alpha crop, not padded 1024×1024 canvases, for target obstruction tests. Teammates are only allowed to obscure each other naturally on the LEFT, never the enemy target corridor.

Camera: eye `(-0.28, 1.50, 10.40)`, focus `(-0.24, 1.50, 5.40)`, horizontal composition reference `FOV=66°` and aspect 1917×906. Portrait FOV is adjusted to preserve targets.

## Rejected arrangements and why

- The former allied positions near `z=7.0–7.65`: friends appear in the enemy rank. Staging moved to 7.88–8.55 behind heroine so the near/far side stays clear.
- One friendly at far screen right with x≈2.1 and z≈8.2: technically near-side but visually appears separated from the heroine; this is banned in normal view.
- Three full-length companions packed across the hero's close-up body: destroys silhouettes and steals the heroine focal hierarchy. Natural partial silhouettes and shoulder cropping are preferable.
- Widening the lens or moving the whole camera dramatically backward solely to expose all eight full-body cutouts: makes the heroine too small and defeats the established immersive TPS shot.
- Artificial billboard scaling, floating shoes, front-face mirroring to fake back views, screen-space compositing, and moving actors in response to mouse look: forbidden.

## Verification

- `tests/ring-arena.test.cjs`: one close world-space camera, eight actors, static heroine heading.
- `tests/ring-arena-formation.test.cjs`: nearby squad stays in the near-side 3D band, and same-source transparent silhouettes NEVER touch the leftmost enemy on five aspect ratios.
- `scripts/qa-ring-visual.mjs`: screenshots from actual Chromium/WebGL, **four matching friendly and four matching enemy identities** with eight rendered world anchors, lamp/shadow behavior and mouse look.
- Always **inspect the screenshot**, not just JSON projection and successful CI status. After any spacing change, compare the normal 1917×906 view first, then review narrow landscape and mouse look.

The battle scene uses established character-source registry and existing modules; no dummy sprites or duplicate actor identities should be introduced just to fill a formation.

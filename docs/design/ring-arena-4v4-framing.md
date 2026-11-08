# 4v4 Ring Arena — canonical near-side cinematography

Updated 2026-11-08. This is a **design constraint** for the existing WebGL/L2D battlefield, not an invitation to recreate characters, paintings, or its camera.

## Non-negotiable framing

- **Heroine and ALL THREE teammates are on the player's side of the world**, nearest to the camera. All four enemies stand together at the opposite end. Do not distribute allies among the enemy silhouettes just to show eight whole bodies.
- Preserve a **large left-foreground heroine** in a true third-person over-shoulder shot, not a screen-space character HUD or a miniature full-body row.
- The camera and every actor, ceiling/wall/floor mesh, and live alpha-cast shadow use the same 3D view-projection. Cursor look orbits **only the camera**, never the heroine/world root or character body heading.
- Keep four grounded enemies individually recognizable in the normal centered view. During deliberate mouse look, incidental foreground occlusion is natural and must not trigger fake actor movement/avoidance.
- Authentic L2D sources stay intact. Currently three ally role sources are front-facing and some enemy assignments repeat the same character sources. Rear/quarter-back artwork will need to be authored separately; flipping or flattening a front PSD is not an acceptable substitute.

## Current reviewed position baseline (meters, y=0)

Coordinates below reflect the intentional hierarchy after comparing multiple real 1917×906 Chromium frames and a broad numeric sweep of **864,000 finite staging/camera samples**. The sweep is a candidate search, **not** a proof of global optimality in continuous 3D space.

| Actor | X | Z | Visual function |
| --- | ---: | ---: | --- |
| Heroine | -1.05 | 9.30 | Dominant left foreground; original back ArtMesh and axe |
| Ally 2 | -1.65 | 9.05 | Modestly smaller left-side teammate; face visible by the heroine |
| Ally 3 | -0.75 | 8.50 | Next near-side echelon; visible over/right of heroine's shoulder |
| Ally 4 | -0.85 | 8.25 | Furthest player-side teammate; offset slightly right so faces do not fuse |
| Enemy 1 | -0.46 | 6.80 | Leftmost opposing target |
| Enemy 2 | 0.73 | 6.80 | Second target |
| Enemy 3 | 1.92 | 6.80 | Third target |
| Enemy 4 | 3.38 | 6.80 | Rightmost wide original portrait |

Every teammate is **at least 1.45m in world depth closer to camera** than the enemy front rank; teammate x coordinates remain within 0.90m of heroine x. Do not tune the squad by making its z equal to 6.8.

Camera: eye `(-0.28, 1.50, 10.40)`, focus `(-0.24, 1.50, 5.40)`, horizontal composition reference `FOV=66°` and aspect 1917×906. Portrait FOV is adjusted to preserve targets.

## Rejected arrangements and why

- The former allied positions near `z=7.0–7.65`: the friendlies appear inside/next to the enemy rank, falsely suggesting opposing allegiance.
- One friendly at far screen right with x≈2.1 and z≈8.2: technically near-side but visually looks separated from the protagonist, misleading in a fixed camera screenshot.
- Three full-length companions packed across the hero's close-up body: destroys silhouettes and steals the heroine focal hierarchy. Natural partial silhouettes and shoulder cropping are preferable.
- Widening the lens or moving the whole camera dramatically backward solely to expose all eight full-body cutouts: makes the heroine too small and defeats the established immersive TPS shot.
- Artificial billboard scaling, floating shoes, front-face mirroring to fake back views, screen-space compositing, and moving actors in response to mouse look: forbidden.

## Verification

- `tests/ring-arena.test.cjs`: one close world-space camera, eight actors, static heroine heading.
- `tests/ring-arena-formation.test.cjs`: squad occupies the near side and keeps clear physical separation from enemies.
- `scripts/qa-ring-visual.mjs`: screenshots from actual Chromium/WebGL and eight-source L2D readiness, lamp/shadow behavior, mouse look.
- Always **inspect the screenshot**, not just JSON projection and successful CI status. After any spacing change, compare the normal 1917×906 view first, then review narrow landscape and mouse look.

The battle scene uses established character-source registry and existing modules; no dummy sprites or duplicate actor identities should be introduced just to fill a formation.

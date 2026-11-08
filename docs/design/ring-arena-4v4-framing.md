# 4v4 battle camera / controlled squad — canonical contract

Updated 2026-11-08. The project now has an actual **four-person player rank facing a four-person enemy rank**. Earlier staggered near-side wedges are NOT the current battle layout.

## Formation: immutable on the battlefield (meters; all soles y=0)

| Player role | X | Z | Opposing enemy | X | Z |
| --- | ---: | ---: | --- | ---: | ---: |
| Hero (player 1) | -1.05 | 9.30 | Enemy 1 | -0.46 | 6.80 |
| Ally 2 | -2.24 | 9.30 | Enemy 2 | 0.73 | 6.80 |
| Ally 3 | -3.43 | 9.30 | Enemy 3 | 1.92 | 6.80 |
| Ally 4 | -4.89 | 9.30 | Enemy 4 | 3.38 | 6.80 |

Both ranks have exactly the same lateral spacing, mirrored **1.19m / 1.19m / 1.46m**, and remain separated by **2.50m of empty floor**. Do not move individual allies forward into a depth wedge merely to show their full-body portraits. The canonical heroine world root stays **(-1.05, 0, 9.30)** and the original player-1 camera remains **eye (-0.28,1.50,10.40), focus (-0.24,1.50,5.40), fov 66°**.

The rows are mirrored in screen composition so that, from the very close player-1 shoulder, allies lie on the left, and opponents remain clearly visible on the right. This deliberately means farther-away teammates can be outside the tight close-up: do not fake their world position to force eight visible full-body portraits.

## Selectable control, one REAL perspective camera

- There are four accessible battle buttons (`data-control-ally=1..4`), and keyboard `1–4` or `Q / E` cycles selection when not choosing an enemy target. A touch player can tap.
- Only **one** world-camera/render context exists. Switching selection calls `allyViewCamera(base,originalHero,selected,...)`: the original heroine's baseline camera coordinates are NEVER rewritten. The new view uses the selected actor's immutable shoulder pivot.
- Different world X positions demand modest per-role camera yaw and boom to preserve **a visible active shoulder AND all four enemies**. Portrait phones adapt the boom independently to prevent offscreen controlled characters.
- Mouse look rotates this single 3D view, not any actor sprite or world root.
- At the default forward view the selected actor and all enemies are on screen. Other allies are on the real rank. A noncontrolled ally whose true alpha projection overlaps the enemy target area is rendered at 14% alpha **only for that frame**. This is a common third-person friendly occlusion rule: their positions, source textures, true contact shadows and animation are never changed.
- The active player role is exposed as `controlledActorId` and `controlCameraPivot` in `inspect()` for QA.

## Actual gameplay agency

`director.createAttack` receives the selected friendly as `attackerId`, and `poseFor` / `actorMotion` use that actor. The 3D attacker advances to the central clash and returns to their original rank, then the one camera restores behind **that same selected teammate**. No camera-only trick where heroine #1 performs attacks for everyone.

During the temporary uniform-art formation review:
- Our four characters render the exact approved `female-07` rear battle source.
- Their four opponents render the exact first enemy's animated original L2D source.
- Do not overwrite saved PSD rigs, team character assignments or the role identity registry; selection and same-art preview happen in render-time only. Query `?formation=individual` exposes the original model assignments for future art review.

## Regression / review

- `tests/ring-arena-formation.test.cjs`: parallel same-depth rows, spacing and four perspectives at five landscape/portrait ratios.
- `tests/ring-arena-browser.mjs`: actual role-selector clicks, camera pivot and unchanged positions, and a confirmed selected-teammate attack.
- `scripts/qa-ring-visual.mjs`: actual Chromium screenshots for default view and the other three views in addition to lighting/mouse-look.
- `site/game/ring-arena-runtime.js`: single WebGL renderer, source art/shadows unchanged by control switching.

Visual acceptance: 4 foes visible in default forward view from each controlled character, selected character visually close and in frame, no false enemy/ally crossing, no moving actors due to mouse/camera selection. Full-body visibility of all 8 people in one shot is **not** a requirement of an immersive shoulder camera and must not override correct battlefield formation.

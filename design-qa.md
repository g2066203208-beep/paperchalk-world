# Main menu design QA — 2026-10-27

Source visual truth: `design/menu/reference-approved.jpg` (user-selected composition).
Implementation: `design/menu/main-menu-1280x720.jpg`, captured in the cloud browser at 1280×720 CSS px, density 1.
Combined comparison: `design/menu/comparison.jpg`. Reference normalized from 1536×864 to 1280×720, without changing aspect ratio. State: title menu, local save exists, no overlay.

## Comparison history

- P1: earlier variants changed the composition into standalone signs and a neutral presentation character. Replaced with the approved canopy, notice-paper, original fullbody clerk leaning on counter, original foreground customer facing clerk, and correct foreground occlusion.
- P2: mixed object perspectives and ungrounded mug. Rebuilt background and foreground from the same source camera; mug is coupled to the gripping-hand layer using fullbody source coordinates.
- P2: Chinese font weight varied by platform. Added OFL-licensed Noto Sans CJK Black subset for menu labels, preserving real selectable/live text.
- P2: original screen-size-dependent clipping. Added source-space landscape staging and a portrait re-layout. 360×800, 390×844, 844×390, 1280×720 viewport/control-bound tests passed. Main actions >=44 CSS px. Settings and multi views scroll internally when necessary.

## Required fidelity surfaces

- Typography: Chinese Black display face; hierarchy and label wrapping verified. Original source title characterforms were image text; live text intentionally uses a stable licensed font.
- Spacing/layout: canopy, left notice, right clerk, foreground-left customer and foreground counter retain the source relationship. Portrait moves notice below the same interaction scene to preserve legibility.
- Color: navy/periwinkle/ivory/orange matches the selected source; character identity changes to auburn/ivory clip/orange scarf and mustard-beanie customer are intentional originality requirements.
- Images: complete transparent head-to-shoes character masters retained. Runtime head/body/forearm masks share a common source-space. No reference character is used as a runtime sprite. Full-view comparison and focused hand/cup, notice/type, alpha-edge inspections found no blocking placement issues.
- Copy/content: original three menu choices retained. First-time start versus resume is driven by the actual save. Nickname, room creation/join and settings are in secondary views.

## Browser checks

Cloud browser: title menu, settings, reduced-motion toggle, large text toggle, multiplayer entry, invalid room code, start, re-open menu, continue. Page console errors from terminal.local: none. Extension messages excluded.
Automated menu checks: 4 viewports passed; no page errors; settings persist; save/continue works; new-game cancel preserves current game.
Logic/syntax: 84 tests passed; module syntax passed; all 69 offline resources exist.

## Remaining limitations

Visual acceptance still belongs to the user. Small residual differences: exact display letterforms and simplified menu icons (P3). Existing non-menu gameplay NPC art has not been replaced in this menu change.
Local complete two-client regression is separately blocked at WebRTC handshake in the current runner; not represented as passed. Android physical-device rendering is not available here and is not claimed.

final result: passed

## Follow-up: store-entry transition

2026-10-27: planning commit `a37fe5a` first recorded the small-shop start, same-current-store menu, rich physical interactions and store-growth projection before implementation. Current view-switch now retreats the notice paper, approaches the window, and uses an opaque shutter to mask the camera/render-path change. Input remains blocked until the reveal finishes. Reduced-motion entry remains immediate. The multiplayer entry waits for a first valid host snapshot. Local 4-size menu checks plus full-motion entry/return and world-state preservation pass. Cloud browser inspected entering state, then playable world, then return to the same live game. This is the transition layer; a shared store projection and growth-driven menu are explicitly planned, not claimed implemented.

Previous runtime `624d745` passed the GitHub-hosted complete browser regression, page deployment and Android build. The earlier local WebRTC limitation did not reproduce on the GitHub runner.

## First-shop world scene v3 — 2026-10-27

This section supersedes the earlier non-menu art limitation. Current scope is an actual illustrated, interactive 2D world scene, not the preceding generated concept images.

- Reference grounding: approved navy/ivory/orange menu and cleaned interior concept, corrected against the user's continuous-counter and complete-object production requirements. This is a new gameplay composition, not a claim of pixel-identical cloning or user aesthetic approval.
- P0 fixed: goods are independent host-authoritative physical IDs, including a fixed storage socket; removing a unit does not recenter/rescale the remaining units. Capturing the ID at pointer-down prevents a late network update from retargeting the tap to a neighbor.
- P1 fixed: continuous counter, complete cabinet/drawer interior backing, drawer panels aligned to the source frame and available for interaction only after the opening animation completes.
- P1 fixed: fixed fixture coordinates across orientation, camera-local drag/shot selection, safe bounds and inverse transforms, individual goods targets available in close shots instead of oversized overlapping invisible hotspots.
- P1 fixed: main landscape camera retains the full head and handoff surface; speech chooses a side in landscape and chest-level space in portrait. Four original fullbody sources use localized facial overlays, with hands and stocked products independently drawn.
- Actual cloud browser inspected menu→world, stock close shot, one unit pickup, full shelf backing, restored held unit after reload, counter placement and physical register checkout. No app page exceptions observed.
- Local syntax checks and 92 unit tests pass. Five real browser viewport/DPR flows pass: 320×568/1, 390×844/3, 568×320/2, 844×390/3, 1280×720/1, including wrong-item recovery, commissions, procurement, recycling, five-sale settlement, next day and resume.
- A separate real-pointer camera test passes drag, rotate while holding, preserved unit identity, all fixture shots, continuous counter and open-drawer backing. Menu four-size and full-motion entry/return regression passes.
- Production sprites, geometry, prompts and source metadata reside in `assets/interior-v3/`; implementation and unimplemented scope are documented in `design/gameplay/INTERIOR_PRODUCTION_SPEC.md`. Current runtime remains Canvas/WebView, with fixed-view 2D pan/zoom, not unrestricted 3D rotation.
- P3: silver closed-eye patch has a small enlarged skin-tone seam. Physical Android device QA remains unavailable. GitHub-hosted multiplayer and Android build results must be verified separately after publication; local WebRTC handshake remains an environment limitation.

final result: passed

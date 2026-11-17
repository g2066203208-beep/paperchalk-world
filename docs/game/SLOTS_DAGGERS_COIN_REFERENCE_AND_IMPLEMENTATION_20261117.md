# Slots & Daggers — gold payout visual research + implementation audit
Date: 2026-11-17
Scope: original Paperchalk Snowbound game; research reference only, no commercial-game source/assets.

## Primary publisher/developer video and image references

1. 80 Level (2025-08-15), focused report on developer-posted WIP coin payout and sound effect:
   https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game
2. Developer-narrated trailer (minute 00:43–00:52: physical-feeling slot machine, individual coin clings, upgrade menu):
   https://www.dailymotion.com/video/x9sjabo
3. Official/press-kit trailer:
   https://www.youtube.com/watch?v=1c-5tsSO6_s
   https://www.igdb.com/games/slots-and-daggers/presskit
4. Official gameplay screenshots:
   https://slotsanddaggers.ateo.ch/
5. Game page, trailer, screenshots and player recordings:
   https://store.steampowered.com/app/3631290/Slots__Daggers/
   https://steamcommunity.com/app/3631290/
6. Interview with the developer, technical disclosure:
   https://indiegames.wtf/interviews/slots-daggers-the-roguelite-between-luck-and-strategy/
7. Full gameplay recording:
   https://www.youtube.com/watch?v=35dhkRyCvhU
8. Independent review of physical coin/metal impression:
   https://djmmtgamechangerdoc.wordpress.com/2025/11/18/slots-daggers-review-7-5-10/

## Verified facts versus deductions

**Developer-confirmed:** Unity project; mixed 2D and 3D; perspective rather than orthographic camera; most sprites cast shadows via Unity lighting; 3D models modeled in Blender; audio via FMOD. Developer personally emphasizes extensive work on physical interactions and coin sounds.

**Strong visual observations, not implementation confirmation:** Gold coins physically spin/tilt and gather at the left side of the machine; sharp warm highlights against a subdued black/brown background; coin spill, successive impacts and collectible money tray. The original implementation may use 3D meshes, sprites, a mix, or authored animations; do NOT claim access to their coin source.

**Not yet measured:** Reference-accurate per-frame payout launch interval, bounce restitution, total settle duration, audio envelope, exact reflectivity and color calibration. No claim of pixel-accurate clone from these references until video frames are extracted and compared with actual test recordings.

## Implemented in our actual playable game

- New original shader + 3D mesh module: site/card-battle/motion/slot-daggers-coins.js
  - Native WebGL 1 solid 3D coins: front/back faces, raised rings, beveled rim, physically present edge thickness, scalloped/milled edge shading
  - Per-coin orientation with independent spin, roll and tilt
  - Moving multi-lobe specular highlights, metal/environment fake reflection, radial stamped relief
  - Gravity and successive damped bounces on a common ground/payout tray
  - Time-varying soft contact shadows (separate pass) and staggered randomized payout
  - WebAudio transient metal partials for multiple landing impacts; respects in-game sound setting
  - Coins converge toward current resource counter at end; game state is NOT modified by this visual layer
- Live integration: site/card-battle/snowbound-journey.html
- Gold-gain/camp/choice triggers: site/card-battle/ui/snowbound-journey-ui.js
- Battle victory trigger: site/card-battle/motion/snowbound-motion.js
- Interactive original asset-free comparison lab: site/card-battle/coin-fx-lab.html
- Real Chrome three-screen video/frame capture: tests/slots-daggers-coins-browser.mjs
- GitHub Action: .github/workflows/slots-daggers-coin-fx-qa.yml

## QA contract

- Verify real WebGL program compiles, and canvas drawing buffer dimensions match desktop and mobile viewports.
- Capture at launch (~120ms), flip (~340ms), first bounce (~650ms), scatter (~980ms), settle (~1500ms) and collect (~2200ms). The relative timing is for OUR baseline, not verified reference timing.
- Capture full Chromium WebM; verify frame counter and alive coin count, rerun 12/48/76-coin variants without page reload.
- Verify the exact same module runs at the hosted playable Snowbound entrypoint.
- Manually inspect actual screenshots before calling a visual feature approved.
- Preserve battle turns, hero paintings and original resource counters.

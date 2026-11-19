# Seven-seat tabletop: Black Jacket motion/material rebuild (2026-11-20)

## User critique
“狗屎效果我让你还原黑杰克牌的动态你做了吗？你做的一点质感都没有”

**Verdict on previous implementation: NO, it was not a frame-by-frame Black Jacket recreation.** Earlier results were a playable seven-seat whitebox with generic spring flights and dark rectangles, not reference-calibrated visuals. Never tell the user it was visually complete.

## Real references inspected
- Official Steam Black Jacket page, app 3100370: https://store.steampowered.com/app/3100370/
- SteamDB official **Release Trailer** dated May 7, 2026, direct microtrailer: https://video.fastly.steamstatic.com/store_trailers/3100370/1468733886/c4a4a92911c349d943a85640db1327366095211b/1778169815/microtrailer.mp4
- Static reference: Black Jacket screenshots display warm worn parchment, dark green-blue playing field, drawn ink, aged/burnt borders, local amber highlights, overlapped physical card stacks and subtle contact shadows. NOT a flat corporate gray card-grid UI.
- Previous seven-seat actual Chrome motion: local development QA videos (prior run); looked glossy/flat, took up to 1.65sec, had ghost duplicates at destinations and sometimes no collision callback. Images from prior runs are NOT valid proof of final texture.
- Official video contact sheets extraction: .github/workflows/reference-black-jacket-motion-study.yml. **Do not claim exact numerical frame timing until the actual video frames have been inspected.**

## Source implementation now
1. `site/card-battle/motion/seven-seat-card-kinetics.mjs`: deterministic author-made lift → brisk table slide → face-down/face-up flip → hit → settle. Deploy 660ms, draw 475ms, action 465ms, enemy attack 420ms. These are authored approximations; not measured original game timings. `springTo` semi-implicit Euler follows directed trajectory, so avoids slow wandering high jumps.
2. `site/card-battle/motion/seven-seat-card-physics.mjs`: retained old slot Three.js physical card model and PMREM/multi-light environment; added a shared 128² microfiber normal texture, highly rough matte paper, original card back on back face, neutral thin (.017) cardboard cut edge, real dynamic elliptical under-card contact shadow, paper-card front stock under original character portrait. Action cards printed onto 336×486 warm aged parchment with multiple fine paper fibers and ink. All transient GPU geometry properly disposed after flights.
3. `site/card-battle/seven-seat-battle.mjs`: suppress the DOM target during arrival of physical 3D hero/draw card, then restore it on actual landing; ensure impact feedback happens every time instead of depending on a chance collision overshoot; 8–12 cheap amber/teal/blue sparks and expanding impact ring; subtle pointer-tilt glints that follow mouse hover, mobile input unaffected; 256² procedural woven felt grain under the playing table. Do not add a big modelled metal/gold frame.
4. `site/card-battle/styles/seven-seat-blackjack-table.css`: replace sterile dashboard teal cards and plain slots with dark worn felt, layered warm keylight, matte parchment action cards, crisp but thin paper edges, deep shadows, patterned card backs, dim amber glints, cloth texture, restrained status UI; responsive desktop and mobile.
5. `tests/seven-seat-card-kinetics.test.mjs`: exact motion timing, flip and settle endpoints, no endless spinning/giant character scaling, physics convergence at fixed timesteps.
6. `.github/workflows/seven-seat-battle-qa.yml`: real Chromium desktop 1440×900, phone portrait 390×844 and landscape 844×390; saves video and PNG frames; first complete rebuilt flow [run 44574214130](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44574214130) SUCCESS. Artifact [14555413016](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44574214130/artifacts/14555413016).

## Original characters protected
- The user-approved Anima 7-person circus and vampire illustrations, and user-approved burgundy/gold card-back, remain the real underlying game assets. NO generated substitute figures.
- User's specification: 7 adversary slots, 7 ally slots, person-deploy unlocks owner deck, drawn action cards nest under owner portrait, play on ally OR adversary.
- Old 3D slot route preserved in character-card-machine-legacy.html, live battle route https://g2066203208-beep.github.io/paperchalk-world/card-battle/character-card-machine.html

## Visual acceptance still pending
Static shots and passing Chromium functionality tests do **not** prove perfect fidelity to Black Jacket. Must inspect actual official video frame strips and compare with similarly timed frames from our actual Chrome WebM; refine ease, durations, ember pulses, card corner silhouette and reflection accordingly.

# Three visual modes — on-device comparison & source ledger
Date: 2026-11-17. These are independent playable programmatic visual STUDIES, not released final art and not pixel-identical reconstructions.

## Source A — user screenshot #1, quiet portrait-first combat
The two user-supplied screenshots are not licensed source assets. The screenshots have not been imported or rebroadcast into the game.
Design hypothesis (to confirm against visual QA): high-resolution 11:16 or similar whole-body character paintings should dominate the playable viewport; the environment is intentionally low-frequency and restrained.
Production components: stage cameras, distant muted hills, ground horizon, floor geometry lines, cast/AO contact shadows, ambient lighting on character alpha, soft 2D parallax, damage/lunge visual beats.
What to test: character visual dominance, white silhouette halos, whether feet land on one common believable plane, no disproportionate scaling on 390×844 phone.
Source artwork is ONLY existing Paperchalk Anima paintings:
 ../assets/characters/monster-hunters/04-bounty-markswoman.png
 ../assets/characters/crimson-vampires/pureblood-empress.png
Page: site/visual-studies/portrait-study-a.html

## Source B — user screenshot #2, expressive theatrical portrait combat
Design hypothesis: stronger theater framing improves readability and coherency of ornate full-body Anima characters, but stage illumination must avoid flattening actors into stickers.
Production components: bilateral velvet curtains as two front planes, stylized arched back flat, top valance, raked illuminated wood floor, footlight pool, striking motion and contact shadow.
Source artwork: 
 ../assets/characters/monster-hunters/02-blood-physician.png
 ../assets/characters/wonder-circus/ringmaster.png
Page: site/visual-studies/portrait-study-b.html

## Source C — Illusion Carnival / 幻象游园剧
First chapter official PV posted 2024-07-16 by KiZ_qi:
 https://www.bilibili.com/video/BV1Cx4y1x7kz/
Game's official screenshots and descriptions:
 https://store.steampowered.com/app/2796340/Illusion_Carnival/
Developer's alternative release:
 https://kiz-qi.itch.io/illusion-carnival
First-chapter game recording:
 https://www.bilibili.com/video/BV1a9bHe7E75/
Another complete first chapter:
 https://www.bilibili.com/video/BV1webHewEqg/
Screenshots and developer interview coverage:
 https://80.lv/articles/check-out-this-2-5d-indie-horror-inspired-by-ib-cult-of-the-lamb
Technical detection, NOT a source-code license:
 https://steamdb.info/app/2796340/

OBSERVABLE stage composition: wide camera, small world-sprite, enormous nearby gears and painted props, orange/yellow floor stage against saturated purple background, layered hand-drawn paper elements, camera and stage parallax, bold black contour and theater curtain top border. Do not infer the exact original mesh complexity, post shader or animation frame timings from screenshots alone.
Original independent interactive demonstration:
 - CSS 3D stage with a floor ellipse transformed into the XZ plane
 - 3 large rotating gears and 2 foreground masks at differing screen depths
 - a 7-pencil cluster, spotlight, button-flower, animated colored projectiles
 - original programmatically constructed paper traveller, NOT official character
 - mouse-induced parallax, tilted stage, light contrast toggle and 0.7s action
Page: site/visual-studies/carnival-study.html

## Shared QA and constraints
- Stage aspect ratio: entire client viewport at desktop 1920×1080 and mobile 390×844.
- All approved Anima painted PNG bytes remain untouched. Only temporary Canvas object URLs remove proven, border-connected whitish pixels; alpha mask is reused to blend character lighting.
- 2 actors present at actual near/far world feet without frames or floating cards.
- High contrast distinct from scene cannot come from arbitrary color filters on whole sprite.
- Scene-cinema animation uses root movement, slash/flash and soft hit.
- All three are visually separate URLs and have independent live controls.
- Real browser screenshot and WebM QA, never claim verification based on markup alone:
   tests/visual-studies-browser.mjs
   .github/workflows/visual-studies-qa.yml
- Do not copy Steam screenshots, music, animations or original game's source code into our public repo.
- Current work is a comparative prototype; official art textures, multi-frame combat animation and exact pixel measurements require source art and reference frame inspection.

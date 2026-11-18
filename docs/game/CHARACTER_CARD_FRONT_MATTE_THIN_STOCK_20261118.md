# Character card front blending + slender cut-paper stock (2026-11-18)

User request: 正面不够好，人物立绘白底和卡牌不一样，而且卡牌太厚。

Approved original characters and burgundy-gold back are precious art. NEVER redraw character PNG or bring back ugly modelled gold picture frame.

Implementation:
- site/card-battle/motion/card-portrait-matte.mjs: removes only the CONNECTED pale white photographic background starting at image borders. It does not globally erase white clothing, white hair or skin. Anti-aliased fringe is unmatted and edge RGB padded for mipmaps. It never writes to original PNG.
- site/card-battle/motion/character-card-machine.mjs: gets the Anima portrait into a canvas RGBA texture on demand, uses transparent FrontSide material over a color-matched burgundy paper plane. Front paper edge RGB sampled from approved back ~78/32/43; gentle warm taupe interior keeps ringmaster's burgundy coat readable. Existing paper grain normal/roughness maintained. No modelled gold trim.
- Physical neutral card cut-side changed from 0.042 (2.5% width) to 0.017 (about 1.0% width) while keeping rounded outline and real FrontSide edge triangles. Do not thicken it again.
- site/card-battle/character-card-machine.html cache key v7.

Tests:
- tests/card-portrait-matte.test.mjs: exterior white pixels gone while enclosed white shirt, pale glove, skin and original source bytes survive; colored background remains original.
- tests/character-card-machine-browser.mjs: Playwright three devices, actual ringmaster front, white matte removed, paper background active, edge 0.8–1.3% width, all real 3D interactions and payout preserved.
- .github/workflows/character-card-machine-qa.yml: source + Chrome QA and actual screenshot capture.

Source images with COLORFUL/scene backgrounds should retain background unless the user asks to change it. A heuristic matte is not segmentation truth. Do NOT declare perfect quality without inspecting real screenshots.

Game: https://g2066203208-beep.github.io/paperchalk-world/card-battle/character-card-machine.html
## Final visual QA and enclosed white gaps

First REAL Chrome screenshot (run 44333593637) showed the main white rectangle gone, but a trapped triangular white patch remained between the ringmaster's right arm and cane. This is genuinely an internal white background region, NOT a white shirt.
Second pass in card-portrait-matte.mjs now flood-fills large near-side, white-like enclosed components, while protecting the central white waistcoat and pale gloves. Unit test also covers an isolated enclosed white gap.
Final real Chrome run: https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44336157622 (success). All 3 viewports desktop 1440x900, phone portrait 390x844, landscape 844x390 passed; JS errors 0. The browser test requires >500 real white inner-gap pixels removed from the uploaded ringmaster original.
Permanent Chrome screenshots: site/card-battle/qa/character-card-machine/desktop-inspect-front.png, phone-inspect-front.png, desktop-inspect-card-stock-edge.png, phone-inspect-card-stock-edge.png.
Full PNG & WebM artifact: https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44336157622/artifacts/14442335913
Visual comparison with previous white-background build confirms removal of both the outer white box and trapped right-hand white wedge. The original ringmaster art remains unchanged, with white clothes intact. Sidewall is 0.017 card-world units (1.01% of width), a real thin neutral matte paper cut edge with no gold model frame.

Do not substitute screenshots from the older pre-second-pass run 44333593637. This final accepted code is commit 7c049948f8e236acb11a977487d999f9f5677838 plus Github Action screenshot writeback.
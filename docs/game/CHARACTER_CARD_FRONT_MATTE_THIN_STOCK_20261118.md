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
# 主游戏战斗画面｜Anima 整体预览＋独立场景素材提示词候选（2026-11-19）

## 当前任务
用户：“开始做游戏画面了，规划一下写一下提示词prompt出来”。

本稿是 **完整主游戏画面的构图策划和 Anima 提示词候选**，并未在 Anima 生图，也没有覆盖已审批的人物卡和卡背。优先保护已上传 35 张人物立绘及刚完成的酒红金线卡背。**不能为了画图重新 AI 生成原有角色。**

## 源码依据
- `site/card-battle/ENGINE_CONTRACT.md`: 实体七槽卡盒，每个已获得角色独立牌堆；开局 0 手动摸牌；共享手牌 10 张上限；牌盒可折叠；移动/悬停/抽卡与回合结算已分模块。
- `docs/game/ACTIVE_3D_CARD_BOARD_AND_RETIRED_TABLETOP_20261113.md`: 战场16×6真实格地，敌我各3×3可部署人物位置，左右设施建造区；机位可平移缩放；不能把原版变成纯平面假棋盘。
- `docs/game/FOREST_RUINS_HIGH_DETAIL_ANIMA_BATTLE_BACKGROUND_V2_20261118.md`: 真实空场景、前景接地平整、人物站位中景清晰，底部留操作 UI 视觉余量，不能把任意卡牌/人物/骰子画到背景。
- `site/card-battle/motion/character-card-machine.mjs`: 新的独立抽人物卡实体机，真正的卡纸厚度、酒红图、35人；它是 **获得角色与奖励时的动画场景**，不是永久霸占中部战斗场地的 UI。
- `site/data/art/seven-card-groups.v1.json`: 当前图像 manifest 五个已上架七人团。
- Anima official model card https://huggingface.co/circlestone-labs/Anima : Base 30–50 steps、CFG 4–5、er_sde 清晰线条。Natural language + tags 支持。**用户此轮明确沿用不加风格 LoRA、不写 safe/score 标签、负面只用六个质量词。**
- 借鉴 DICEOMANCER 官方 https://store.steampowered.com/app/2501600/DICEOMANCER/ 只参考 **战斗背景 + 中景目标 + 底部手牌** 信息层次，不复制它的 UI、风格、人物、任何原图。

## 不可冲突的方案
- 游戏分主战斗、人物抽卡、藏品收藏、卡牌放大四个模式；抽卡机不常驻主战斗主舞台。
- 视觉主角是已经批准的整幅角色卡（原插画，正面纸纹、背面原图），不是场景大装饰。默认演示 1–3 已部署友方角色与 1–3 敌人；3×3 逻辑九宫格和远处设施空间真实存在，但不能为了“九宫格”在手机屏幕里强行塞满十八个细碎人像。
- 16×6 地形和设施区**游戏引擎生成和交互**。Anima 只画有真实着地平面、完整空间感的环境背景，不能让它精确画 16×6 矩阵、准确血条数字或真实按钮功能。
- 横屏桌面 **1536×1024** 环境底图；手机竖屏主画面 **1024×1536** 先画一个“整画面 UI 排布候选”用于检查；正式程序适配不能只靠裁切图片。
- 手机概念屏：最上约8% 状态 HUD；中间约60% 战场与敌我卡牌位置；中下约17% 共享手牌；最下约15% 可折叠七槽人物牌盒和回合按钮。实际百分比由 CSS/WebGL 动态约束，不是要求 Anima 数像素。
- 场景：首个森林古石遗迹关卡。黑灰石、灰绿树、斑驳墙体、略暖日光与冷阴影。明暗和原来的暗酒红/香槟金卡背形成统一关系。不要娱乐赌场霓虹/超厚金框/悬空“巨型人物卡”/画好的假人物/照片白背景。

## Prompt A：全游戏画面预览稿，1024×1536 手机竖屏
仅供 UI 和美术大构图审稿。Anima 不保证准确文字、人物/格子数量，不能把这张图直接代替 HTML/WebGL 层。

```text
masterpiece, best quality, highres,

a complete polished mobile fantasy tactical card battle game screen, premium hand-painted anime game art, portrait orientation, refined antique storybook adventure atmosphere, a clearly playable user interface integrated with a beautiful illustrated fantasy battlefield, restrained elegant decorative design.

The gameplay battlefield is an old stone sanctuary in a shadowy woodland. In the upper and middle part of the image, an open level fighting ground of weathered slate and packed earth extends horizontally across the scene. Low ruined stone walls, mossy blocks, a few twisted forest roots, ancient arched stonework, soft gray-green foliage and distant muted trees give the place believable depth. A wide level central ground area has clear unobstructed standing positions, with enough negative space for two opposing groups of tall illustrated character cards. The battlefield is viewed almost frontally from a slightly elevated angle, with little perspective distortion, not a distant isometric board.

On the left and right parts of the fighting ground, show a few subtle, low-profile card-sized placement zones integrated naturally into the stone floor, with simple unobtrusive recessed corner indicators, leaving the center readable. The slots and ground support the weight of actual cards instead of making them float. Keep all character-card faces as plain neutral dark burgundy placeholders, without drawing any characters or painted figures, because the final game will insert its own original high-resolution portraits. Do not fill every empty battlefield position with cards.

The interface is a tasteful antique-fantasy print design using dark walnut brown, deep wine burgundy, charcoal slate and very delicate aged champagne-gold ink accents. At the top, a small unobtrusive status bar contains reserved empty plaques for hearts, resources, round and settings, with carefully balanced spacing. Near the bottom, a short arc of several real-looking small playing cards forms the interactive hand; their faces are neutral blank placeholder textures with thin paper edges, not thick plastic frames. Along the very bottom, a compact horizontal seven-compartment physical card case appears partially open, with a few card stacks and other slots empty. Beside it, a simple visible rounded end-turn control, with an empty unlettered surface.

The entire image feels like a cohesive screenshot from a professionally art-directed 2.5D fantasy game, rather than a decorative poster. Beautiful subtle contact shadows and coherent directional light anchor all card slots and objects. The middle zone has the most visual clarity and detail; side ruins frame the combat without blocking it. The lower controls remain large enough for a finger on a phone. Thin gold accents are printed rather than made of chunky modeled metal, and paper textures are matte, fibrous and tactile. Warm light touches the nearby stone and paper, while cool forest shade provides soft depth. Rich atmosphere with controlled highlights and restrained contrast, preserving crisp image readability.

No hero splash illustration, no cinematic title screen, no character portraits, no people, no random monsters, no floating giant cards, no casino slot machine, no fake detailed card text, no large lettering, no thick golden picture frames.
```

## Prompt B：可以作为生产素材使用的纯环境，1536×1024 横版

```text
masterpiece, best quality, highres,

highly polished anime fantasy game environment background, handcrafted illustrated forest sanctuary, old woodland stone ruins, detailed clean ink contours, delicately painted stone and plant textures, sophisticated 2D game art, wide horizontal composition, almost frontal view from a gently elevated camera, restrained natural perspective.

A complete abandoned stone sanctuary in a quiet old forest. The middle part of the illustration is a broad continuous level surface of weathered slate paving and compacted earth, naturally integrated into the surrounding ground, suitable for several full-height fantasy characters standing side by side. The ground extends toward both the left and the right sides of the picture, with clear believable physical contact surfaces, subtle cracks, softened stone edges, patches of dust and fine moss. Nothing occupies the central standing ground.

Low broken stone walls and small moss-covered retaining blocks stand in the background, followed by an ancient narrow arch, fragmented masonry, old tree trunks, trailing vines and shaded clusters of dark muted leaves. The largest tree trunks and ruins sit at the far left and far right of the composition, creating a natural frame without intruding into the central action area. A few distant forest trees and pale mist give depth, but the center behind the standing area remains calm, dark enough to distinguish detailed white, red and black character costumes.

Directional soft afternoon light from the upper left creates believable form on stones, bark and leaves. Cool blue-green indirect light fills the shadows; restrained warm bounce light rises from the ground. Fine contact shadows in roots, moss and stone joints, carefully separated material roughness, delicate variations of gray-green foliage, muted slate blue shadows, desaturated brown earth and slightly warm ancient limestone. Crisp line art and refined painted textures in the middle distance, gentle atmospheric perspective only in the far background. Premium, cohesive hand-drawn fantasy game environment, richly finished yet not overcrowded.

The lower part of the scene is an uninterrupted low-contrast continuation of the same stone and earth ground, suitable for separately composited game interface and cards. There are no raised platforms, tables, stairs or tall obstacles interrupting the combat standing ground. Only one complete environment, with consistent scale and lighting, prepared for original character drawings and interactive game objects to be added in the engine. Empty scene without characters, monsters, playing cards, dice, card frames, text, interface or logos.
```

## Negative for both (existing project standard)
```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## Suggested generation settings
- Anima Base, prompt A 1024×1536, prompt B 1536×1024.
- 35 steps, CFG 4.5, er_sde, seed randomized and written down after generation.
- No style LoRA, no @ artist tags, no score or safe tags.
- UI text and 16×6 literal grid are NOT reliably produced by Anima, so author UI and field in program; full gameplay prompt A only composition candidate.
- Once a scene is drawn, overlay REAL GitHub character artwork and card backs, compare in full 390×844 phone viewport and 1536×1024 desktop, check foot ground contact, image alpha, clarity, HUD overlap, 3/5 character densities, side-facility pan.

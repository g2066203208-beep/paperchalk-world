# 横屏雪地静态卡牌战斗背景｜Anima 提示词 V1（2026-11-15）

> **状态：候选提示词。未生成图片，未修改游戏场景或人物素材。** 用户要求先参考《雪居之地》（Wildfrost）真实实机截图，而非让 Anima 生成难以交互的整屏假 UI。本稿借鉴其分层/布局与雪地视觉原理，另行创作背景素材，不提取或冒充其游戏资产。

## 真实参考（已查看）

1. [Wildfrost 官方 Steam 截图和页面](https://store.steampowered.com/app/1811990/Wildfrost/) — 雪蓝色几乎平面的战场、两组横向角色卡、淡色菱形站位标、下方深褐木质手牌区域。
2. [Wildfrost 官方 press kit](https://www.wildfrostgame.com/presskit/) — 官方游戏介绍和图片素材来源。
3. [Wildfrost 官方网站](https://www.wildfrostgame.com/) — 游戏地图与基本演出风格。
4. [Wildfrost 宣传片场景分析](https://playcraft.space/gallery/wildfrost/battle-dragon-pepper-arc/) — 官方视频帧的独立分析：敌我站位、手牌、计数器的信息层次。

### 图片中可直接核实的关键事实

- 简洁浅蓝/青色雪地场景，远处低矮雪丘、轮廓化蓝松树，近景场地非常空旷；
- 卡牌以两排对抗，正面展示，透视弱、体积很小，不依赖 3D 镜头靠远景容纳全场；
- 低对比的白色菱形站位标识隐约分布在地面，视觉焦点仍是卡牌；
- 深棕色木质横向分隔板在战斗场下方，底部是独立手牌区；
- 游戏运行时组合卡框、人物、数字、状态、手牌。**这些内容不能与背景一起烘焙成永久不可替换的 PNG**。

## 图片生产规格

- **画面目标：1920×1080 横屏，16:9**。先按原参考游戏的横屏战斗逻辑，不能沿用被用户否决的竖屏黑帮办公室构图。
- **Anima Base 首测：1536×864**（同 16:9，便于输出后按比例高质量放大至 1920×1080），ER SDE / 35 steps / CFG 4.5。若具体服务/推理工作流不支持此画布，换同宽高比的可用尺寸；不声称模型必能精确生成 1920×1080。
- 使用 GitHub 现有 **normal** 风格 LoRA 原样完整文本；通用负向严格保留六项，不写 `safe`。
- 场景主体只画**雪地战斗背景 + 木质手牌区**，人物/卡框/血量/行动数字/UI 通过程序精准叠加，避免浪费已有 704×1024 原画。
- **布局配额仅为参考，不假装 Anima 能按像素完美执行：** 画面上方 ~72% 为雪地战场（最上部约 1/4 是远景树山）；下方 ~28% 为深棕色木质手牌区；中间提供两排无遮挡的卡牌摆放空地。
- 这个场景是**二维绘画**，无需要求 3D mesh；角色卡照样由 2D RGBA PNG 制作，站位由游戏引擎决定。
- GitHub 中七组织人物原图不得修改；背景不能把实际卡牌与人物直接绘制进去。

## 完整 Anima 正向提示词（直接复制）

```text
masterpiece, best quality, highres, 2d game background, illustrated winter battlefield background, beautifully finished hand-painted game environment, whimsical illustrated storybook fantasy, clear and restrained anime cel shading, clean confident line art, pastel winter color palette,

<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

A complete background illustration for the active battle screen of an original horizontal 2D card strategy game, a wide fixed camera view of a quiet magical snowfield where character cards will later be placed by the game engine. One continuous full-screen environment, drawn as a carefully designed flat 2D game backdrop rather than a three-dimensional board. A calm and charming winter forest in soft icy cyan, powder blue, pale snowy turquoise and muted desaturated navy, with a small amount of natural warm brown wood at the very bottom.

COMPOSITION:
16:9 horizontal widescreen composition. The top quarter shows an airy pale mint-blue winter sky, distant softly rounded snowy hills and a sparse row of simplified stylized blue pine trees. Snow piles sit along the distant horizon. A small dark blue pine partly enters from the top right edge; a larger snow-covered bush is tucked at the far left edge. The middle of the scene remains expansive, quiet, light-blue and visually uncluttered, specifically designed to display two horizontal rows of large character cards. The ground is a broad, almost flat powder-blue snowfield, gently viewed from a nearly frontal fixed camera. The snow surface shows subtle patches of pale color, a few broad soft shadows and widely spaced faint cream-white geometric diamond motifs indicating card placement zones, arranged in two horizontal parallel rows. The motifs are low contrast and thin so that future cards visually dominate. The field has no steep vanishing point, no strong foreshortening and no raised tile grid. The background scenery stays far behind the card placement surface and leaves the central two-thirds of the image unobstructed.

The playing field occupies approximately the upper 72 percent of the final image. Along the transition to the bottom section, paint one very clean straight horizontal dark walnut-brown wooden trim with a lightly carved beveled top edge; beneath it, the bottom 28 percent is an attractive broad, flat deep chocolate-brown wood and aged burgundy tabletop panel, designed as an empty hand-of-cards area. Use broad simple wood panels with a few subtle engraved diamond shapes, restrained hand-painted texture, softly rounded trim and a convincing tactile 2D illustration finish. Keep this lower area spacious and completely clear for the game engine to place several cards, deck and resource icons later. Make the separation between the cool battlefield and the warm wooden hand area unmistakably readable even at phone size.

VISUAL STYLE AND FUNCTION:
Soft atmospheric falling snow represented by only a few sparse small white flakes; simple thick-to-thin outlines, slightly irregular hand-painted silhouettes, playful yet carefully art-directed winter storybook environment. Clean flat color shapes with a small amount of delicate brush texture, gentle ambient occlusion under snowbanks, no harsh glossy reflections, no faux-photographic textures. Nearly orthographic fixed game camera and perfectly stable horizontal composition. Attractive quiet background that supports colorful character cards, emphasizing readability and negative space. The finished image is a reusable blank battlefield background asset: only scenery, ground lane markings and wooden hand zone are depicted. All character illustrations, cards, card frames, labels, stats, counters, interface icons, currency totals, buttons and text will be implemented later as separate runtime UI elements. No humanoid figure or creature is painted into the scenery.
```

## Anima 通用负向提示词

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 出图后真实验收

- [ ] 肉眼第一感觉与官方截图具有同类雪地场地构图：平、开阔、卡牌摆在画面上，不是等距 RPG 棋盘。
- [ ] 中间上、下两排能排下角色卡而不盖住关键风景。
- [ ] 木质手牌区在画面底部足够清楚、有明确水平分界，未画出固定手牌。
- [ ] 只有很淡的站位菱形纹样；未出现强透视的砖格/立方体雪平台。
- [ ] 人物、卡框、文字、数字、UI 都没有画到背景里。
- [ ] 同一张背景可复用到不同阵营和对局；无需每回合重画。

## 后续连接（暂不改动游戏）

先用该纯背景验证卡牌合成，再确定能否容纳现有精细全身立绘；不要默认人物必须改成半身或牺牲原画。候选审核通过后，再做其他季节地形的同结构背景。

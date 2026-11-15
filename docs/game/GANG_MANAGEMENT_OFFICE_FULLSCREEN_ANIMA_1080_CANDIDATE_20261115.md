# 黑帮经营管理｜首张完整 1080 竖屏游戏画面 Anima 提示词候选（2026-11-15）

> **最新用户方向：优先由 Anima 画一整张实际游玩画面，而不是先批量绘制单独人物立绘。** 当前为设计与提示词候选，未实际运行 Anima、没有生成图、未替换游戏文件。上一轮“先做角色01全身母图”的制作顺序暂缓，等用户审阅完整游戏画面后再选择是否拆层。

## 美术目标与镜头

- 类型：黑帮组织经营管理／人员管理／办公室事件交互／视觉小说式会面。
- 目标最终画面：**1080×1920（9:16 竖屏手机）**；首测推荐生成 **1088×1920**，左右各裁 4 px，获得 1080×1920。具体出图尺寸要以所用 Anima 前端支持为准；屏幕固定像素不等于 Anima 官方特殊优化分辨率。
- 构图：**第一人称黑帮老大坐在办公桌后**；桌面居于前景下段；手下到桌前汇报，人物面部与上半身居中央；建筑、家具和窗光承担环境氛围。主角不再另画一名坐在画面正中央的可见人物。
- 手机 UI 先由 Anima 一起**绘制装饰性外观与布局**，不要让模型负责准确生成中文文字与数据；这些交给代码叠加。画面实际布局遵循上部状态栏 / 中央人物+场景 / 中下部桌面 / 底部对话操作区。
- 本次可以让 Anima 画出“场景里有一个访客”的整体效果来验证美术；通过用户审核后，把 **办公室静态背景、桌面前景遮挡、人物、装饰性 UI 边框、窗口动态光照、按钮文字** 分离，避免每次访客变化都重绘整个屏幕。
- **优先确定整体审美**，人物衣着、脸和动作是本张测试的人物原型，不标为已批准的正式员工角色；禁止把“成片中已出现人物”直接误当成可换角色的独立 RGBA PNG。
- 官方模型信息以 [CircleStone Labs Anima](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md) 为准。本文采用本项目已锁定正常版 LoRA，官方推荐的 Anima Base 可首测 ER SDE / 35 steps / CFG 4.5；这只是参数起点，不能保证 9:16 超长画幅、精密人物手部或清晰汉字。

## Anima 正向提示词（完整可复制）

```text
masterpiece, best quality, highres, anime screenshot, visual novel game interface, single complete game screen, portrait mobile game screen, 9:16 composition, grounded contemporary crime drama, richly illustrated anime game background and game UI, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

A complete playable-screen composition for an original story-driven mafia management game, viewed from the seated player's eyes at the boss's office desk. The player is the gang boss receiving a subordinate who has come to report on a job. This is a coherent in-game screen with carefully placed interface elements, not a title screen, character poster, promotional artwork or an isometric map.

Frontal seated eye-level camera, natural human proportions, controlled perspective with long straight architectural lines, visually clear near/middle/far depth. The visitor stands at conversational distance on the far side of the office desk, centered, shown very large and clearly from the head to around the upper thighs, naturally integrated into the office rather than shown inside a trading card. A single adult woman in her early twenties, petite with realistic adult proportions, shoulder-length tousled dark chestnut hair, narrow warm brown eyes, lively observant expression and a slightly guarded half-smile. She wears a slightly worn cropped charcoal jacket over an ivory collared blouse, a loosely tied muted wine-red necktie, dark tailored straight trousers and understated street accessories. She holds a thin paper folder casually near her waist while the other hand rests naturally at her side. She is an individual working-class junior runner, not a glamorous fashion model, not a uniformed police officer. Her face, hairstyle and upper-body gesture are the primary focus, with a reserved believable story character pose suitable for prolonged dialogue.

The office feels like an inhabited, functioning underworld management office rather than a throne room. In the rear left, a tall window with a believable city exterior and gentle late-afternoon indirect daylight; a substantial wooden filing cabinet and shelves with ledgers and folders toward the right, a muted analog wall clock, utilitarian brass desk lamp, dark aged plaster walls, muted walnut wood furnishings, restrained warm gray, tobacco brown, burgundy and antique brass color accents. Layered lighting: cool soft window illumination and gentle warm desk lamp fill, readable shadows, a refined hand-painted illustrated material finish, crisp expressive linework, matte surfaces and disciplined cel shading, believable furniture dimensions, high-end polished 2D visual novel art.

A beautiful wooden office desk runs horizontally across the lower foreground, its top just beneath the visitor's visible hands, with a compact analog telephone, one neat open account ledger, a pen, an envelope tray and a small desk lamp base. The desk feels substantial but does not swallow half the screen. Keep enough clean unobstructed floor-to-waist space around the visitor so character art can later be layered over the environment.

Design the entire game's interface as part of this composition: a slim integrated status strip at the very top with subtle aged-paper and dark lacquer material, tiny quiet decorative containers at the upper corners for organization/day/funds data, a small vertically grouped set of clean inset management tabs along one side below the midline, and an elegant wide dialogue/action panel occupying only the bottommost portion below the desk foreground. The UI feels like premium illustrated office stationery and period-inspired administrative equipment, not futuristic HUD panels, metallic fantasy frames or ornate trading-card borders. Keep all text containers deliberately blank and clean so accurate Chinese type, numerical stats and interactive buttons can later be rendered by the game engine. Make the central character and spatial setting visually dominant, with a very deliberate mobile touchscreen layout.

A finished, unified premium mobile game screenshot, quiet crime-drama atmosphere, polished art direction, visually beautiful composition, adult cast aesthetic, subtle signs of lived-in daily life, strong readable silhouette, clearly separated foreground desk, middle-ground visitor and back office, detailed but never cluttered, full frame carefully composed with functional negative space for UI overlays.
```

## Anima 负向提示词（已确认通用六项，不加 safe）

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 分层落地与验收

1. 第一阶段仅测试完整画面：先看整体观感是否像一款能玩的精品黑帮经营游戏；不制作单人的空白证件照或战斗卡框来代替画面。
2. 确认镜头、人景比例与桌子遮挡关系后，绘制 **不带访客** 的同构背景和桌子遮罩。可先人工保留并修复首张游戏截图为背景，不能期望 Anima 重生成一张自动像素一致。
3. 已有完整人物立绘可后续加画为 1024×1536 全身母图，再由程序按当前镜头裁切成约大腿以上访客；用户原始美术保留。人物遮挡、桌面层与可点击区域分别独立。
4. 导出：实际背景图、带 Alpha 的人物源图、前景桌面遮罩、纯装饰 UI 源片。Anima 输出不自动等于带透明通道，需明确检验 RGBA Alpha；准确的中文、日期、组织资金等必须程序渲染。
5. 需在手机实际纵向尺寸评估：人脸是否清楚、办公室空间比例是否自然、家具不遮挡、状态及按钮是否可点击、中央人物是否能替换；夜晚/昼光应由场景灯光或独立遮罩控制，不把某一时刻的强烈固定窗光当通用全时段运行光效。

## 身份边界

这张女下属只是为了统一构图使用的**候选场景样角**，未批准“第一个正式黑帮成员”的真实身份或长相；不默认全员成年女性或同款衣服。当前只需用户验收完整首屏设计。

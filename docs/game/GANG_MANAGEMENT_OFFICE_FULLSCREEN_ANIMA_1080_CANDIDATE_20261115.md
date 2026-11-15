# 黑帮经营管理｜1080竖屏完整游戏界面 Anima 正式截图候选 V2（2026-11-15）

> **V2 纠错：上一版过度强调场景并要求 UI 容器留白，导致用户指出“UI 都没有”。此版明确将 HUD、状态数据、左侧功能导航、员工档案、经营事件文本、四项交互决策与底栏都作为首图中可见的实质内容。** 用户尚未批准，仍为提示词候选；未执行 Anima 或生成图片。

## 核心画面规格

- **最终目标 1080×1920，竖屏 9:16。** 推荐尝试 Anima 输出 1088×1920 后左右各裁 4 px；如果当前前端不支持该画幅则以可用尺寸试画并重新合成，不能虚报模型保证。
- 第一人称桌后视角：玩家是黑帮老大，对面是来汇报工作的手下；不把玩家本人画在正中央。
- **UI 不准留空：** 第一张用于评估游戏审美的效果图，应当**画出像已经在游玩的完整游戏截图**。Anima 尽量表现 UI 字符、数字和按钮，但不保证文字无错，后续正式程序用真实文本覆盖。
- 上部 0–11% 状态 HUD；左侧 12–58% 五项管理导航；中心 12–66% 访客与办公室；右侧 32–64% 员工资料；下部 68–96% 事件汇报与 2×2 经营决策；底边 96–100% 主导航。
- 当前图片中出现的「林柚」「西街事务」及数值仅是为了让试作截图**像真正有玩法的游戏**而写的临时示范，不是已获用户批准的世界观、角色档案或数值平衡。
- 美术统一在画面中描绘完整 UI，正式实装时将人物、环境、办公桌、UI 装饰单独拆层；中文、按钮与数值、动态光影、可点击区域仍由运行时负责。
- 画风采用 GitHub 中已确认 Anima normal 完整 LoRA，不擅加 `safe`；通用负面固定六项。
- 官方模型卡参考：https://huggingface.co/circlestone-labs/Anima/blob/main/README.md 。建议先试 Anima Base / ER SDE / 35 steps / CFG 4.5（只是试验起点，不保证复杂 UI 的文字/位置精确）。

## V2 完整可复制正向提示词

```text
masterpiece, best quality, highres, detailed anime game screenshot, polished Japanese-style 2D management simulation game UI, functional mobile game interface, portrait 9:16 full-screen gameplay screenshot, immersive crime syndicate management game, visually designed interactive HUD, clean hierarchy, professional UI/UX layout, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

A finished, fully populated, playable-looking vertical mobile game screen for an original modern mafia management and subordinate-management simulation. The player is sitting behind a desk as the boss, receiving a subordinate's report. The image MUST prominently show a complete real game HUD with readable-looking labels, filled numbers, stat bars, navigation controls, report text and decision buttons. The UI is a major part of the image rather than a decorative afterthought. The entire composition is one actual gameplay moment, not a key visual, character poster, menu illustration or empty visual-novel background.

SCREEN COMPOSITION AND VISUAL HIERARCHY, carefully designed for a 1080 by 1920 phone screen:
TOP HUD, upper 11 percent of screen: a sophisticated dark charcoal and warm cream management status header with the organization emblem and name at upper left, DAY 12 and a tiny clock, a distinct cash counter showing ¥48,600, a territory indicator 3/6, a red police attention/heat indicator 28%, and a small reputation value 72. All five game values appear as separate compact, functional HUD elements with small icons, clear typography, consistent alignment, attractive tactile materials and high contrast. A small settings button at the right edge.
LEFT MANAGEMENT RAIL, beneath the top bar, running from upper-middle to the center-left: five individually visible interactive navigation tabs in a slim vertical column with neat icons and short Chinese labels: 人员, 地盘, 任务, 账本, 情报. Give the current OFFICE/personnel tab a restrained cream highlight. These are practical game navigation buttons, not decorative wall fixtures.
CENTER MAIN SCENE, roughly 12 to 66 percent of screen: first-person desk-level office scene, with a single subordinate standing at conversation distance directly in front of the player's office desk. The visitor is the dominant character artwork and her head, upper torso and hands must remain unobstructed by overlays. A believable young adult female streetwise junior runner, short tousled dark chestnut hair, knowing playful expression, old charcoal short jacket, ivory shirt and a loosened burgundy tie, dark trousers. One hand naturally holds a thin envelope folder. She is human and expressive, with convincing adult anatomy, casual asymmetrical posture, a distinct face and clear soft cel-shaded linework. Render the visitor large, roughly head to mid-thigh, so she is identifiable in a mobile screenshot.
BACKGROUND OFFICE, behind the visitor: tastefully aged real criminal organization office, warm walnut cabinet, paper files, slightly worn wall plaster, framed city map, vintage telephone, practical desk lamp, urban window with natural late-afternoon daylight. The desk occupies a narrow horizontal foreground strip just below the visitor's hands, giving actual depth but not blocking the game's interface. Restrained golden-brown and gray environmental palette, illustrated anime visual-novel quality with coherent real room perspective.
RIGHT SUBORDINATE DATA PANEL, visually distinct narrow inset panel along the right of the central scene, roughly 32 to 64 percent screen height: a dark translucent profile panel with a small circular head portrait, name 林柚, designation 跑腿, employee level LV.1, readable numerical loyalty 忠诚 62, skill 能力 45, stress 压力 18, three short horizontal stat bars colored restrained cream/blue/red, plus two small meaningful icons for current assignment and mood. This UI card is attached to the screen and not a physical object in the office.
BOTTOM MANAGEMENT DECISION AREA, occupying the bottom 32 percent of the screen and clearly visible: a wide premium dialog/report panel with paper-like cream background, dark ink typography, bold short heading '西街事务' and an actual two-line report sentence about a rival gang wanting to negotiate on the western street. Beneath the report there are four substantial equal-sized tappable action buttons arranged in a balanced 2x2 grid. Every button has a short visible Chinese label and a specific small icon: 派人交涉, 先调查, 直接拒绝, 稍后处理. Display a small estimated cost or risk next to one or two choices, for example -¥2,000 or +警戒, so this unmistakably looks like a strategic management game with consequences.
BOTTOM EDGE NAVIGATION, integrated as a very slim bar: distinguishable tabs 办公室, 成员, 任务, 地盘, with a subtle active selection highlight. The interface must not overlap the four decisions or disappear into the frame.

Art direction: quiet but dangerous organized-crime office, rich hand-painted 2D materials, refined compact type scale, visually deliberate spacing, restrained aged paper, dark lacquered wood, dark charcoal ink and muted burgundy accents. Flat-screen UI panels float above the illustration with crisp functional edges, true button shapes, numeric meters and consistent spacing, distinct from the physical office environment. The UI should occupy substantial screen space, at least one third of the whole screenshot, while the character remains visually central. All UI slots are FILLED with plausible information rather than blank placeholders, and the screen feels like a real management game being played during an employee report. Prioritize recognizable game layout, clear data and meaningful decisions. Short Chinese labels are design guidance; final production type and exact numbers can be replaced by code after art approval.
```

## 通用负向提示词

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 第一张图必须通过的构图检查

- [ ] 顶部能看到：组织名、天数、资金、地盘、警戒与声望（不是空色块）。
- [ ] 左边能看到五个管理功能按钮（不是单纯圆点装饰）。
- [ ] 中央人脸足够大，办公室前景桌子有合理透视，人物处在桌子另一侧。
- [ ] 右侧资料有头像、姓名、职位、三条数值/进度条。
- [ ] 下方有**真正写了事件内容的汇报框**与四个清楚的、可点击样式的经营决策按钮。
- [ ] 底部显示不同管理页面标签；整屏必须看起来已经能游玩，而不只是角色站在办公室。
- [ ] UI 风格古典办公用品感且足够简洁，不做未来科技 HUD，不做华丽幻想卡牌外框。
- [ ] 如果 Anima 中文乱码，先用样图验收布局和 UI 层级，正式界面以程序字体替换；不能拿带乱码的生成图当可直接上线的 UI。
- [ ] 通过完整画面评审后再拆成真正可复用的办公室背景、桌前景、人物立绘与 UI 资源；**不先画人事证件照或组织卡框**。

## V1 状态

旧版 V1 的“文字容器留空”“只做细薄状态条与底部对话”的优先级被本版本否决；修正原因是当前阶段首图最重要的是验证**完整可玩游戏界面**，而不是纯概念环境美术。

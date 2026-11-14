# 农民组织｜工程师设施｜农田牌 Anima 独立素材提示词 V1（2026-11-14）

> **状态：仅新提示词候选，未运行 Anima、未有美术母图、未通过用户批准、未入游戏。** 本文件修正先前未核实 LoRA、擅加南瓜/稻草人/桶/农舍/卡牌 UI、未按设施透明素材交付的错误。

## 核对的原始规范

- CircleStone Labs 官方模型卡：https://huggingface.co/circlestone-labs/Anima （Prompting 和 Generation settings；Anima Base 支持英文标签与自然语言混用、画师用 @、er_sde/30–50steps/CFG4–5）。
- 仓库必读：`docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md`。
- 项目当前双画风：`docs/ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md` 和机器读取的 `site/data/art/anima-style-presets.v1.json`。没有明确选择“可爱版”，按照默认 **normal 正常版**，LoRA 三组件及权重原样引用，不另行添加 firedotinc。
- 用户对新 Anima 素材已明确要求：**正向不加 safe，负向只用通用六项质量词**，不是 Anima 官方默认推荐安全标签的逐字复制。
- `docs/game/SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md`：人物/设施原始素材 **704×1024 竖版**；设施完整独立主体、目标透明背景；704×1024 不是游戏棋盘长度；农田属于农民组织工程师农业生产设施。
- `docs/game/FARMER_FACTION_SEVEN_CLASS_CHARACTER_IDENTITY_CANON_20261113.md`：农民组织工程师对应农耕少女，建农田、水车等生产设施；这张素材只画农田，**不额外画人物/卡框/农舍/风景**。

## 出图目标

一张**单独的农田设施素材**（不是完整战斗卡框）：一块具有清楚轮廓的紧凑长方形耕地，三条规整土垄、嫩苗、简洁田埂与浅沟；轻微前上方 3/4 视角，整块农田在画框内，方便叠进 3D 棋盘一格设施区。没有理由未经批准就追加南瓜、木桶、篱笆、稻草人、农舍等其他主体。实际设施占地和玩法数值未获确认；先按单独完整单位绘图，不把像素尺寸换算成游戏格子数量。

**画布：704×1024（宽×高），竖版。** Anima 提示文字要求“transparent background”，但这并不能保证真正 RGBA Alpha，出图后需检查/分割。

## 完整正向提示词（正常版，独立复制）

```text
masterpiece, best quality, highres,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated farmland facility, one compact cultivated rectangular field plot, traditional rural farming plot, three neat parallel raised planting beds of rich dark brown freshly tilled soil, short healthy green seedlings planted at regular intervals, narrow shallow furrows between the rows, slightly uneven handmade earthen perimeter, clean and readable agricultural construction, a complete small farm module meant to be placed as one facility on a tactical game board, seen from a gently elevated front three-quarter angle, restrained perspective, clearly visible front edge and all three planting rows, centered object composition, the entire field plot visible within the frame, generous clear margins on all four sides, the farmland occupies most of the available width, isolated asset on a transparent background, vertical 704x1024 composition, delicate anime illustration, clean hand-drawn outlines, simple soft cel shading, warm earthy brown and natural muted green colors, clear shape separation, tidy visual hierarchy, cohesive 2D game illustration
```

## 完整通用负向提示词

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 建议首测生成设置（非官方唯一参数）

- Anima Base：704×1024，`er_sde`，35 steps，CFG 4.5。官方给的是较宽的适配范围：30–50 steps，CFG 4–5；此处用项目选择的首测点，不暗示已真实生成。
- 如实际使用 Turbo，不得原样套用 Base 配方；官方 Turbo 为 8–12 steps、CFG 1。
- 若使用 Forge Neo，在对应界面直接输入完整正向/负向。LoRA 标签是本项目工作流约定，不是官方模型的内置画师预设。

## 图片验收（未执行）

1. 画面唯一主角是完整、明确、可放置的矩形农田；不是远景稻田、宽阔农场或四周有建筑的风景。
2. 三条土垄与小苗的顺序和透视稳定，主体四周完整、不裁切，约略清楚体现单设施边界。
3. 农田造型与目前农民组织朴素、温暖的乡村时代感一致，不混入现代机械或其他组织设施。
4. 确认没有误画卡框、文本、无关小道具。真实 RGBA Alpha 另验；通过以后才能入库。

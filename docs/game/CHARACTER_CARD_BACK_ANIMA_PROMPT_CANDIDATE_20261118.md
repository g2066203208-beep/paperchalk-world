# 人物卡机 · 通用卡背 Anima 完整候选提示词（2026-11-18）

> **状态：用户要求先提供提示词；此文件是候选，不等于用户批准，不等于已出图/游戏中替换。** 不修改现有 35 张角色原图，不修改现有人物卡机代码。

## 本次已重读依据（出处）
- 官方原始模型卡（2026-11-18 现场再次查看）：https://huggingface.co/circlestone-labs/Anima
- 官方主 README、Prompting、Tag order、Natural language tips、Generation settings、Limitations。官方支持 Danbooru + 英文自然语言混写；Anima Base 推荐 30–50 steps、CFG 4–5、ER SDE 为清晰线条的默认候选；不保证精准对称和完整文本。
- GitHub：`docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md`、`docs/ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md`、`docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md`、`docs/game/FACTION_CARD_FRAME_ANIMA_PROMPTS_CANDIDATE_20261115.md`、`docs/game/CHARACTER_CARD_DISPENSER_3D_20261118.md`、`site/assets/cards/wonder-circus/README.md`、`site/assets/characters/wonder-circus/README.md`、`site/card-battle/motion/character-card-machine.mjs`、`site/data/art/anima-style-presets.v1.json`。
- 当前实际机器外观：哑黑金属、暖黄铜、暗红漆面；当前程序使用 3D 卡片正背贴图及翻面效果。把美丽的 35 张真实人像留给正面，背面统一、不可提前透露身份。

## 资产合同
- 仅生成**一张、平面、全幅、完整、不透明的卡背纹理**。与“透明中心卡框”不同；不能生成手持实体卡照片或桌面场景。
- 候选原始画布 **704×1024 px、竖向**，与人物立绘素材画幅比例相同；旧马戏团卡合成成品 `1024×1536` 是另一种尺寸，不混淆。
- **程序必须把真实 3D 卡牌几何的宽高比调整或适配为正确纹理比例；不能直接沿用当前卡机 `1.68/2.32` 的几何比例拉伸 704/1024 的图。**
- 正面原始人物立绘不动；卡背不包含任何角色、阵营归属、职业图标、强度信息，保证未知身份感。
- 使用 Anima 正常版（normal）LoRA 完整原文，项目禁止 `safe`，沿用用户批准的仅质量类六项负面。**注意 LoRA 是项目 Forge Neo 配置，不是 Anima 官方内置功能。**
- 电影化 Bloom、镜头角度、金属反射、背面卡片厚度、烫金材质微表面由游戏引擎接管；不要画固定强辉光和透视。
- 完成后必须验证：单张完整背面、图案主体居中、离四边留安全区域、没有文字、没有第二张卡/人物/拍摄场景、缩小之后中间徽记仍可辨认。Anima 不能保证准确像素和完美对称，必要时程序蒙版/人工修复。
- 源于旧世界观的符号请保持原创；**不要复制参考牌背的具体纹样、徽章或IP**。

## 建议首测参数（仅 Anima Base）
- 分辨率：704 × 1024
- Sampler：er_sde
- Steps：35
- CFG：4.5
- Seed：不伪造、待实际作图后记录
- 画风：normal（按用户 2026-11-09 原始 LoRA 完整文本）

## Positive（复制整段）
```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

single collectible fantasy character card back design, complete two-dimensional card reverse artwork, vertical portrait composition, straight-on orthographic view, centered symmetrical ornament, refined vintage playing card engraving, elegant hand-drawn decorative illustration.

The entire canvas is the printed back surface of one card. A deep midnight burgundy and blackened wine-red lacquered paper surface fills the full rectangle from edge to edge, with very subtle fine-grain paper and woven texture. A narrow continuous antique champagne-gold double-line border sits just inside the four edges, following softly rounded corners. Delicate restrained engraved flourishes decorate the four corners, balanced and consistent in scale.

At the precise visual center, a small original eight-point compass-star and faceted diamond emblem is enclosed by two thin concentric engraved circles. Four quiet, symmetrical curved filigree strokes connect the emblem visually to the surrounding negative space. The central emblem is clear and memorable at miniature playing-card size; the surrounding dark burgundy field remains spacious and calm. Fine shallow embossing, controlled metallic gold-foil accents, subtle ink wear, crisp clean linework, carefully balanced dark and light areas, sophisticated antique fantasy craftsmanship.

A single unified universal card back for many different character factions. The reverse is fully opaque and continuously patterned, with no portrait opening. No person, character portrait, animals, lettering, numbers, readable logo, rarity icons or interface labels. This is a flat game-ready card-back texture, not a photographed card, not a card held by someone, not a mockup on a table. Neutral even illumination and no baked-in glow; the game engine adds real metallic reflections and HDR lighting later.
```

## Negative（复制整段）
```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 下一步（只有用户认可后）
- 用 Anima 真正出图并人工审核；用户选择批准稿后再作为独立 `card-back` 纹理加入机台正反面模型，并截图检查中途不可提前透出人像；保留历史视觉资源和可回滚记录。

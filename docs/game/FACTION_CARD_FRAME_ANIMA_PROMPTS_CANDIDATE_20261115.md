# 七组织人物卡框 Anima 提示词候选｜2026-11-15

> **状态：提示词设计候选（NOT APPROVED；未执行 Anima、未生成卡框 PNG、未替换游戏内素材）。** 本文写入 GitHub 供试画与评审。用户未要求生成图片时禁止擅自调用生成器。所有原始人物画和既有成品卡保留不变。

## 已核实的依据

- 官方模型：[CircleStone Labs Anima](https://huggingface.co/circlestone-labs/Anima)（截至 2026-11-15 检查）。Danbooru 风格标签、英文自然语言描述及二者混用；Base 推荐 30–50 steps、CFG 4–5；ER SDE 适合更中性清晰的线条。Anima 不保证精密几何/准确文字或自动生成 RGBA alpha。
- 本项目 LoRA 风格锁：[新版正常/可爱预设](../ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md)；完整提示词采用 `normal` 原样整行，不能悄悄改权重。负向仅保留用户批准的通用六项；**正向不包含 safe**。
- 已核实 6 组织身份见 [七人组织真实登记](../../site/data/art/seven-card-groups.v1.json)；农民组织另见 [七职业身份](FARMER_FACTION_SEVEN_CLASS_CHARACTER_IDENTITY_CANON_20261113.md)。组织≠职业。
- 已正式提交的马戏团人物原画是 **704×1024 RGB PNG**，参见 [人物源图档案](../../site/assets/characters/wonder-circus/README.md)。原有马戏团白边合成卡则是 **1024×1536 RGBA**，见 [成品卡资料](../../site/assets/cards/wonder-circus/README.md)。两个尺寸对应两种不同制作环节，绝不能混为一谈。
- [《昆特牌》美术制作流程](https://www.playgwent.com/en/news/6591/gwent-cards-how-they-come-to-life) 明确区分人物插画、装饰卡框、图标、卡背与程序整合，采用相似的职责分层，但不直接复制其 UI。
- 现有卡战玩法可以随关卡放缩；卡框尺寸**不是**逻辑战场的一卡长度，不能由它推导物理占格。

## 资产分层与统一几何（项目方案，尚未获美术确认）

1. Anima 只画 **空的装饰性边框纹理 / frame-only paint**，不重画人物、背景、设施、职业字牌、数值、血条、图标和 UI。
2. **首测工作画布：704×1024 像素**，与原始人物卡画幅比例一致。若要覆盖既有马戏团 1024×1536 成品卡，需由程序用标准化边框模板重采样/适配，独立出合成成品；**不将两种画布视为同尺寸、同母版**。
3. 所有组织的外轮廓统一：正面 2D、竖向圆角矩形、薄窄边缘。边框纹理约占画布宽的 3–4%，中央肖像开窗约占宽 90%、高 92%；具体像素精度必须**由程序模板确定**，不是期望 Anima 逐像素满足。
4. Anima 生成的空中心和外侧用平整灰色作临时占位；RGBA 透明窗口和外圈剪裁由程序从**同一个精确几何蒙版**制作，不能因为 RGB 白底误判为真正透明。不要直接按灰色容差抠边，因为生成图可能有抗锯齿和材质偏色。
5. 整体版式保持永久相同（圆角、边框厚度、内窗、上中下基准线），材质不同：骑士瓷白银、恶魔商店黑金、魔女烟紫银、马戏团暗红奶油金、血族酒红黑银、猎人哑黑钢、农民米白浅木。
6. 正式游戏内的数值与职业识别均由引擎叠加；这批只是人物卡视觉皮肤候选。**先做马戏团 1 套试画、回合内按真实卡牌像素缩小检查，再批量化**，避免七套的结构漂移。可采用固定外圈蒙版 + 图生图/局部重绘统一结构。
7. Anima 官方不保证严格对称、无文字、真透明、同种子多图几何一致。偏离统一外轮廓须修稿或软件蒙版处理；不能靠在提示词里堆叠“EXACT”解决。

## 建议的首测参数

| 参数 | 值 |
| --- | --- |
| 参考模型 | **Anima Base**（非 Turbo；未在当前聊天内实际执行） |
| Sampler | **ER SDE** |
| Steps | **35**（位于官方 30–50 内） |
| CFG | **4.5**（位于官方 4–5 内） |
| 工作画布 | **704×1024，竖向**（项目素材画布建议，不是官方最优定值） |
| 项目 LoRA | **normal**，完整权重见下方每组正向 |
| 负向 | 固定六项，绝不加对象类禁词 |
| Seed | **未指定、未伪造**；选定一张标准边框后记录 seed 及元数据 |
| 后处理 | 标准轮廓/内窗 Alpha 蒙版，颜色校正，缩小后审查，再导入引擎 |

> 每套正向均是可独立复制的完整版。所有文案通过图外注释及资源文件命名记录，不烘焙进卡框。


## 1. 奇想马戏团（`wonder-circus`）

**材质锚点：** 暗红瓷漆 / 香槟金 / 微小菱格

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: a refined old-world circus ticket and theatre-prop finish, deep burgundy lacquer with a measured antique champagne-gold hairline and warm cream piping. Along the narrow perimeter, use a barely visible repeating harlequin diamond rhythm pressed into the lacquer, with one tiny understated gold star at each upper rounded corner and no raised object breaking the outer silhouette. The material should feel hand-painted, glossy only at the very narrow bevel, faintly aged yet meticulously maintained. Cheerful theatrical identity is expressed by craft, hue, and pinstriping, not by a tent-shaped card roof, ribbons, banners or protruding ornaments. Keep the overall impression elegant, expressive, light and instantly readable beside the group's vivid costumes.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 2. 骑士团（`knight-order`）

**材质锚点：** 象牙白珐琅 / 冷银 / 微弱纹章压印

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: ceremonial knightly equipment rendered as a refined thin ivory-white enamel border bound by satin-finished pale silver. Place a single narrow silver engraved line just inside the pale rim; tiny geometric heraldic knotwork is embossed into the two upper corners at almost flush depth. Use understated cool steel at the rounded corner bevels, warm bone-ivory enamel on the longer sides, and subtle natural metal-brush marks. Its atmosphere is disciplined, protective, formal and noble, avoiding oversized shield silhouettes, swords, crowns or Gothic cathedral silhouettes. The edge geometry stays exactly as slim and rounded as every other faction; identity comes only from the enamel/silver combination and restrained heraldic micro-engraving.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 3. 黑心恶魔商店集团（`demon-merchant`）

**材质锚点：** 墨黑漆 / 古金 / 细密契约刻线

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: a sophisticated sinister merchant house, midnight-black lacquer with a dark oxblood undertone, aged warm brass fillet and narrow satin antique-gold edging. Engrave a very fine repeating contract-ledger guilloche pattern into the outermost lacquer, with discreet paired corner flourishes resembling precision-cut seal engraving. The shine feels polished by frequent handling: a delicate warm metal glint along one edge and muted deeper red on the opposing edge. Rich but controlled mercantile prestige; avoid piles of coins, big demonic horns, jewels, gold chains or dangling seals. It should suggest a dangerous luxurious shop brand by texture and craftsmanship rather than cluttering the artwork or changing the approved shared frame silhouette.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 4. 七曜魔女工坊（`witch-workshop`）

**材质锚点：** 烟紫琉璃 / 暗银 / 极浅星轨蚀刻

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: fine magical workshop stationery, a dark smoky amethyst and ink-violet vitreous enamel on a thin blackened-silver foundation. Set delicate etched concentric celestial orbit fragments into the tiny corner curves, a barely visible silver filigree threading through the side rim, and a soft opalescent violet shift inside the hairline bevel. This is elegant hand-crafted arcane metalwork, not glowing particles or a magical portal. Reserve nearly all visual space for the transparent character art that will later be composited. Maintain crisp, narrow rounded edges without projecting stars, crystals, crescent moons or floating talismans; engraved micro-patterns should remain subordinate to the unified card geometry.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 5. 绯月血族（`crimson-vampires`）

**材质锚点：** 深酒红釉 / 氧化黑银 / 蔷薇细纹

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: a sober aristocratic heirloom with deep garnet-red vitreous lacquer, blackened silver edges and a thin cold polished silver inner line. Add a delicate miniature rose-vine engraving running only through the two lower corner fillets, as if cut directly into antique metal; let the top corners remain almost bare. Very low-gloss lacquer with one intentional edge reflection, sophisticated antique finish, intimate nocturnal nobility. The surface should feel centuries old but preserved. Do not let rose flowers, bat wings, blood droplets, candlelight, thorns or Gothic crowns become standalone ornaments. The overall card remains the same restrained slender rounded rectangle and must keep the figure unobstructed.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 6. 怪物猎人组织（`monster-hunters`）

**材质锚点：** 哑黑钢 / 枪灰拉丝 / 细磨损

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: historically grounded veteran field equipment, a thin matte charcoal gunmetal rim with a worn pale pewter inner pinstripe, subtle longitudinal brushed steel marks, tiny irregular abrasions at the very outside corners and softened dark oxidized seams. The finish is utilitarian, disciplined, cold, dangerous and understated, like a carefully maintained antique hunting instrument rather than gothic ceremonial armour. Use one narrow cool-gray highlight only on the inner bevel, preserving strong legibility at small sizes. Keep rounded geometry exactly consistent with the other factions and entirely avoid big firearms, knives, religious crosses, bird-beak motifs, hooks, chain links or grunge splatters extending into the portrait opening.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 7. 农民组织（`farmer-faction`）

**材质锚点：** 麦秆米白 / 蜂蜜色浅木 / 亚麻镶边

**Positive / 正向：**

```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
single isolated collectible character card frame UI artwork, elegant decorative frame texture only, front-facing two dimensional graphic asset, orthographic straight-on view, vertical portrait composition, one perfectly centered slender rounded rectangle with softly curved corners, balanced bilateral symmetry, uninterrupted slim exterior keyline and subtle inner edge, precisely aligned outer and inner contours, restrained craftsmanship with a coherent miniature scale, ample clean inset portrait window occupying roughly ninety percent of card width and ninety two percent of its height, very thin continuous rim approximately three to four percent of the canvas width, fine subtle highlights across the border material, quiet neutral diffuse studio illumination, flat uniform medium gray field inside the empty portrait opening and beyond the outside contour for later software masking, clean crisp edges suitable for UI compositing, no painted figure in the window, no scenery, no title plate, no printed letters, no digits, no interface status indicators. This is a flat ornamental overlay for a pre-existing full-body anime character image rather than a complete illustrated card.
Material direction: humble rustic handmade craft, natural flax-ivory cloth binding wrapped around a very slim honey-colored light wood border with the finest warm beige stitch line. The wood reveals soft delicate lengthwise grain, not thick planks; the linen shows tiny woven fibers and a gently worn edge. One extremely restrained dark oat-brown engraved corner stitch at each corner suggests practical repair and resourcefulness. Keep the look warm, modest, light and welcoming, with tactile materials rather than ornate metal. This is a finely finished handmade card frame, not a wooden fence or farm building; leave the center completely unobstructed and do not add tools, crops, wheat sheaves, ropes, buckets or protruding boards.
```

**Negative / 负向：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 试画与验收清单

- [ ] 先生成马戏团一张空卡框，**不带虚构角色**；人工核对内窗与外轮廓位置。
- [ ] 使用同一程序的可复用圆角透明蒙版（内外都需 Alpha）导出候选 PNG，检查是否残留灰背景。
- [ ] 按马戏团真实七人 RGBA 立绘和同一场景底图合成；**不修改已批准原画和角色身份**。
- [ ] 缩小到实际游戏战斗中的卡牌大小，确认 100% 的眉眼、头发、服饰与鞋子关键区域不被遮挡；评估手机 390×844。
- [ ] 七组织的外尺寸、框厚、圆角、开窗、视觉重心精确同源，不接受某一组织加大帐篷、盾牌、巨型徽章等改变结构。
- [ ] 仅在用户审核后才可进入正式资产目录与引擎皮肤注册。本次文档本身不代表 Anima 执行、PNG 制作、浏览器实测或美术批准。

## 注意许可

CircleStone Labs 官方模型页当前注明模型使用受非商业许可限制，但其 [License 说明](https://huggingface.co/circlestone-labs/Anima#license) 将模型使用和输出图片的后续商业用途作了区分。若涉及托管服务、发行或模型嵌入，须按官方许可及各 LoRA 许可证逐项核对，不以本提示词替代法律核查。

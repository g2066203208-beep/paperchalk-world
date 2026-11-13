# 农民组织｜战士·萝莉伐木工｜Anima 提示词 V3（2026-11-13）

> **状态：候选提示词；用户已明确否决 V2 实际生成图（过于西部牛仔、人物不够可爱）。** 本版 V3 只修正新提示词，不把这张失败图登记为批准素材，不覆盖其他已经批准的人物原画。
>
> **画布：704×1024 px（宽×高），竖版；单人完整全身；目标透明背景，导出后必须检查真实 Alpha。**
>
> **组织 × 职业 × 体型：农民组织 × 战士（伐木工）× 萝莉型。** 不是新职业；萝莉必须明确包含英文 `loli`；三体型是**不同人物**，以后同职业共用衣服剪裁语言而非同一张脸放大。
>
> 参照 [GitHub 统一小兵规则](FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md) / [七职业规则](../game/SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md)，本组织小兵正向提示词不加风格 LoRA、画师标签、`safe` 或画风标签。使用批准的通用负面。
>
> **来自 V2 用户实际出图的纠错：** 红棕颈巾、深色紧身马甲、重工具腰带、棕色宽裤与大靴的组合被评价为“像牛仔不像农民”；脸部偏冷、不够可爱。V3 放弃牛仔式服装，改为农庄童工助手感的乡村亚麻背带工作裙＋小围裙，配淡柔颜色和清楚的可爱圆脸；仍保留日常劈柴小斧头，姿势不要挥砍或越界。此处只描述童话农庄形象，不设定角色实际年龄或添加性感表现。

## V3 正向提示词（完整，可直接复制）

```text
masterpiece, best quality, 1girl, solo, loli, small petite girl, very short stature, small shoulders, short childlike limbs, round baby face, chubby soft cheeks, tiny rounded chin, big bright honey-amber eyes, delicate curved eyebrows, tiny button nose, small gentle closed-mouth smile, slightly rosy cheeks, a few delicate freckles on the nose, warm fair skin, soft fluffy light chestnut hair in two short low braided pigtails tied with small cream cotton ribbons, airy wispy bangs, a few naturally escaping strands, irresistibly cute and endearing little countryside woodcutter girl, simple farm village worker, farmer faction warrior.

She is dressed like a humble old-fashioned farming village girl who helps chop firewood at the family farm. She wears a soft ivory cotton blouse with slightly gathered sleeves rolled neatly to her elbows, a faded light sage-green linen pinafore work dress reaching just below her knees with a simple square neckline and broad shoulder straps, a small natural flax-colored apron tied at the back with two large plain patch pockets and a few hand-sewn repairs, cream cotton socks, and modest worn warm-brown lace-up work ankle boots with rounded toes. Loose, comfortable, practical countryside work clothes made of inexpensive natural fabrics, soft pastoral colors, gently rumpled and visibly hand-mended, a recognizable little farm girl silhouette. This outfit is the consistent base clothing design for later young-adult and mature lumberjack variants, with only size and tailoring adjusted for each different person.

In her right hand she loosely carries one small practical firewood hatchet with a short light wooden handle and a simple iron blade pointing downward beside her leg; the complete hatchet remains near her body and does not cover her dress or face. Her left hand lightly holds the edge of her apron pocket. She stands upright, facing mostly forward, in a natural relaxed small pose with one toe subtly turned inward and a slight friendly tilt of her head. A soft curious expression and tiny warm smile make her look lively and adorable while remaining a believable ordinary rural worker. Gentle everyday dialogue-portrait pose, not a battle action.

One single isolated character, nearly front-facing, complete full body, with all hair, ribbons, fingers, apron hem, hatchet, legs and both boot soles visible inside the portrait frame, character centered, generous empty safe margins above the hair, around the hatchet and both elbows, and below the boots, transparent background.
```

## 通用负面提示词

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 画面验收

1. 第一眼识别为朴素农庄女孩，不是西部牛仔、牛仔背心/领巾或冒险家。
2. 一眼有萝莉型娇小骨架、柔软圆脸、明亮眼睛与自然的小微笑；头身比例偏可爱，但不变成夸张两头身。
3. 小伐木斧自然垂在身侧，用于剧情对话立绘；斧头不遮脸和胸前衣服，不出界。
4. 衣着：奶油色棉麻衬衣、淡鼠尾草绿色过膝背带工作裙、亚麻浅米色小围裙、棉袜、圆头旧皮短靴，朴素材质。
5. 生成画布 704×1024；完整全身+全斧头+适当空白；透明通道以原图实际检测为准。
6. 不自行编造已获得批准的美术成果；失败图只做对照错误案例。

## 版本历史

- V1 / V2：旧版描述保留在 GitHub 历史提交中，V2 已经把 `loli` 写在开头，但**造型并未通过用户审美验收**。
- V3：依据用户提供的生成图及指出的“像牛仔、不够可爱”修改，待 Anima 生成和审核。

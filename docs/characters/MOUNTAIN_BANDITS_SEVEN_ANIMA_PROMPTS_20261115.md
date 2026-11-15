# 山道强盗团｜七人卡 Anima 完整提示词 V1（2026-11-15）

> 来源：用户在 2026-11-15 会话上传的七张实际 Anima 成图，按**上传顺序**归档。下面是依据成图视觉细节反向校对并可用于重绘的**复现候选提示词**，不谎称原始 PNG 内嵌生成提示词或固定 seed 已被读取。
>
> GitHub 对应资产计划目录 `site/assets/characters/mountain-bandits/`。七张均为 704×1024 / RGB 白底的原始 PNG；在确实写入 GitHub 后才能把资产状态改为 `published_original_pngs_verified`。原图与正向提示词分开验收，未经批准不覆盖原图。

## 生成设置（项目测试基线，不是官方唯一推荐）

- Model: **Anima Base**
- Canvas: **704 × 1024**（卡牌原始素材尺寸，不等于棋盘格）
- Sampler: **er_sde**
- Steps: **35**
- CFG: **4.5**
- Preset: **normal**。逐字使用 2026-11-09 三 LoRA 预设；不混入 cute 版 firedotinc LoRA。
- 构图：单人全身、头脚与大型道具完整入框、白底、无背景道具、无卡框；白底 RGB **不等于透明背景**。
- 年份/评分标签非官方强制；项目明确不加入 `safe`。
- Negative（每张通用、无需自行补充）：
```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```
- 注意：**复现候选不保证逐像素还原上传的图片**；没有源 seed 与工作流元数据，不能把这套文本冒充原图精确生成参数。

## 对应关系（用户上传顺序）

| 上传顺序 | 角色 | 正式职业 | 素材文件名 |
| --- | --- | --- | --- |
| 01 | 女寨主 | 战士 | `01-bandit-chief.png` |
| 02 | 山寨二当家 | 召唤师 | `02-bandit-deputy.png` |
| 03 | 黑市药师 | 医师 | `03-black-market-apothecary.png` |
| 04 | 机关拆车匠 | 工程师 | `04-bandit-tinkerer.png` |
| 05 | 飞贼 | 游击者 | `05-bandit-thief.png` |
| 06 | 伏路弩手 | 射手 | `06-bandit-crossbow.png` |
| 07 | 铁壁打手 | 守卫 | `07-bandit-guard.png` |

## 01｜女寨主（战士）

成图识别要点：棕红长发、橙瞳、露齿自信笑容；暗红披风、皮质胸衣、褐色长裤、金币袋；右肩扛宽弯刀。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
beautiful mature female mountain bandit chieftain, athletic curvy adult body, tall strong posture, bold wide grin showing teeth, amber-orange eyes, tousled long reddish brown hair swept to the side with loose windblown strands, weathered burgundy cape hanging from one shoulder, fitted dark brown lace-up leather bodice over a loose ivory linen shirt with rolled sleeves, deep plum sash around her waist, several antique coin pouches and brass ornaments, worn fitted brown trousers and rugged cuffed leather boots, a wide slightly curved steel saber resting across one shoulder, one hand gripping the sword handle and the other resting on her hip, charismatic fearless outlaw commander, relaxed and commanding stance,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 02｜山寨二当家（召唤师）

成图识别要点：蓬乱双侧短马尾、红发结、大暗红披风、号角靠嘴、叉腰，负责召集强盗喽啰。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
petite mischievous female second-in-command of a medieval mountain bandit gang, youthful compact body and slightly smug face, warm amber eyes, short wild dark brown hair styled into tousled short side ponytails tied with a little red ribbon, a playful small fang, oversized patched burgundy cloak draped over narrow shoulders, loose ivory linen blouse with laced collar, brown leather shorts, broad utility belt with square buckles, several small leather messenger pouches and a hanging signal whistle, mismatched brown leg stockings and folded worn leather ankle boots, raising a small aged brass signal horn to her mouth with her right hand while placing the other hand boldly on her hip, chin tilted up with a cheeky confident smile, an outlaw officer who summons human bandit reinforcements by blowing the horn rather than magical animals,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 03｜黑市药师（医师）

成图识别要点：紫黑波浪长发、半垂眼、酒红长裙，右手举药瓶，腰间有多瓶药剂。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
beautiful elegant mature female black-market apothecary who works for medieval outlaws, tall curvy figure, pale skin, violet half-lidded eyes, calm knowing smile, long wavy dark black-violet hair with soft side part, elaborate dark burgundy and plum long dress with a fitted black leather corset and full ankle-length skirt, gathered cream puff-sleeved blouse, fine red neck ribbon, subtle worn antique gold embroidered edging, compact leather apothecary bag at one hip, a leather belt holding three round glass bottles filled with amber and dark red medicine, holding up a small round glass potion bottle near her face with one elegant raised hand, the other hand casually resting along her waist, graceful restrained pose, worn dark leather boots visible below the hem, refined and cunning healer with stolen noble clothing,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 04｜机关拆车匠（工程师）

成图识别要点：棕色卷发、护目镜、雀斑、浅色衬衫、工具皮围裙；小镐和挂钩绳。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
energetic petite female medieval bandit trap engineer, bright round green eyes, freckles, short thick fluffy curly auburn hair with small tied side tufts, a pair of oversized round brass goggles perched over her bangs, cheerful toothy grin, off-white practical linen shirt with rolled sleeves, muted olive work apron with leather shoulder straps, sturdy brown leather tool belt with hammer, pliers, nails, metal picks and little pouches, large coiled hemp rope on the left hip, short patched brown trousers and worn leather work boots, holding a small iron-headed mattock upright in one hand and lifting a short hooked metal grappling tool tied to rope in the other, inventive practical highway ambush trap maker, lighthearted lively attitude, tools drawn at believable human scale,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 05｜飞贼（游击者）

成图识别要点：栗色短乱发、虎牙、橙眼，金币抛起、钱袋满腰、短裤、皮靴。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
petite fast-moving female fantasy highway bandit pickpocket, slim small build, cute lively round face, bright amber orange eyes, short messy chestnut brown hair framing her cheeks, cheeky toothy grin with one small fang, white buttoned linen shirt with rolled cuffs, sleeveless dark brown leather vest, soft dark burgundy neck scarf, short brown trousers, narrow leather belt and two full beige canvas purses overflowing with small gold coins, worn fingerless leather gloves and turned-down brown ankle boots, a small sheathed dagger at her hip, holding one gloved palm open while tossing a single golden coin just above her hand, other hand loosely gesturing near a stolen purse, playful unbalanced stance with a tilted head, light nimble scoundrel energy, coin and both feet entirely visible,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 06｜伏路弩手（射手）

成图识别要点：灰金色长发、冷淡表情、橄榄绿单肩斗篷、木弩、腰间箭袋。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
slender elegant young adult female medieval highway ambush crossbowwoman, long pale ash blonde hair with straight cut bangs and a long gathered side braid over one shoulder, sleepy narrow pale gray brown eyes and detached calm expression, muted olive green weathered hooded cloak covering both shoulders, ivory linen shirt with narrow lacing at the neck, fitted weathered brown trousers, leather belt with bolt quiver and small square pouch, leather gloves and tall cuffed brown travel boots, holding a sizable handcrafted wooden crossbow diagonally downward in front of the legs, ammunition bolts visible in the quiver, relaxed confident stance, sophisticated restrained sniper who quietly watches the road, no aggressive aiming pose,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 07｜铁壁打手（守卫）

成图识别要点：深棕短乱发、沉稳表情、毛皮领、拼布皮衣，竖立的大型铁箍木门盾。

**Positive prompt（完整复制）：**

```text
masterpiece, best quality, highres, score_7,
1girl, solo, original character,
<lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,
sturdy broad-shouldered young adult female mountain bandit defender with an androgynous tough-looking face, short spiky dark chestnut hair, warm brown eyes, calm expression, thick tan fur collar, dark brown leather-padded tunic over a cream rolled-sleeve shirt, heavy rectangular belt buckle, sturdy dark brown trousers with visible mismatched patches on both knees, wrapped shin guards, worn practical leather shoes, standing beside a tall rectangular improvised shield built from a salvaged carriage door, shield made of vertical wooden planks reinforced with two dark iron bands and rivets, one hand lightly supporting the upper side of the shield and the other relaxed at her side, protective immovable bodyguard stance, shield and entire body fully visible, no medieval plate armor,
refined anime fantasy full-body character illustration, clean expressive lineart, controlled cel shading, crisp hand-drawn details, natural muted colors, believable fabric and leather materials, balanced vertical character silhouette, full character from hair to boots visible, all held props fully in frame, generous top and bottom margins, front-facing three-quarter neutral standing pose, plain white background, isolated single character, no card frame
```

**Negative prompt：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```


## GitHub 规范与来源

- [Anima 官方提示词规范镜像摘要](../ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)
- [游戏 normal/cute 画风预设](../ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md)
- [固定七职业设计基线](../game/SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md)
- 原始图片的 SHA-256 与映射关系：`site/data/art/mountain-bandits.v1.json`
- 正向提示词为本次基于用户成图的视觉核对版；它们**不是**上一轮聊天提示词的逐字拷贝，也**不是**上传 PNG 隐藏元数据。

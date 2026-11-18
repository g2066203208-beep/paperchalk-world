# 人物卡机｜命运剧场场景 Anima 提示词候选（2026-11-18）

> 状态：**候选稿，未在 Anima 执行、未完成美术验收、未导入游戏**。保留现有 35 张人物原画、已批准卡背和全部机器代码。用户先要求讨论什么场景适合已画人物，再给可直接复制的场景提示词；本文件是独立新素材的尝试，不代表已制作完成。

## 现有项目实际依据
- 当前卡机说明：`docs/game/CHARACTER_CARD_DISPENSER_3D_20261118.md`；入口 `site/card-battle/character-card-machine.html`。
- 当前机器 PBR 代码：`site/card-battle/motion/character-card-machine.mjs`，机械外观主要是石墨黑 / 哑黑铁 / 暖黄铜 / 暗酒红，实时 Three.js 灯光与 Bloom，不能把这些作为假固定贴图画进主背景。
- 真实人物：`site/data/art/seven-card-groups.v1.json`；已上架五组共35张奇想马戏团、绯月血族、猎人、魔女工坊、恶魔商店原始立绘。
- Anima 提示词规则：`docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md`、`docs/ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md`、`docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md`。
- CircleStone Labs 官方模型卡： https://huggingface.co/circlestone-labs/Anima （2026-11-18 核对 Prompting/Generation settings：Base 30–50 steps，CFG 4–5，ER SDE 适合清晰线条）。
- **用户偏好**：正向不要 `safe`；负向只使用已锁定六项质量词；LoRA 用 normal 完整原文，不能擅自替换或新增。

## 艺术定位与制作用途
**旧世界的命运剧场 / The Theatre of Fate**：这不是拉斯维加斯赌场，不是赛博霓虹，也不是单一血族哥特教堂，而是能容纳全部组织的「古典收藏室 × 私人剧院 × 奇幻机械室」统一世界空间。以哑黑胡桃木、酒红布幔、旧黄铜、暗石材组成耐看的低饱和环境；灯光集中在真实3D卡机和抽出的角色卡。背景边缘稍丰富，中间干净。不要画阵营标志/人物立绘/第二台机器。

**第一张只生产可评审的环境概念/背景图**，不是替换整个3D场景的一张伪透视截图。正面中景构图，左右近似对称，中央大型暗色壁龛和地面留给程序3D机台。若采用场景母图进引擎，后续应分离远墙、左右装饰、地板法线/粗糙度和照明；不能把整张透视场景硬贴到3D室内而产生双重透视。手机竖屏必须单独检验/拓展图层，不直接从横图强裁核心舞台。

## Anima 正向 Positive（normal 版，可复制）
```text
masterpiece, best quality, highres, <lora:akipekoanima_v1_1:0.8> @akipekostyle <lora:Munji_Anima_AITK_KNA35_18ep2520_1024_20261031:1> @muji_style <lora:anima-highres-aesthetic-boost:1>,

anime fantasy game environment, highly polished hand-painted background art, an elegant mysterious old-world theatre of fate, a small private chamber used to display extraordinary collectible character cards. A complete empty interior environment, wide landscape composition, calm and balanced central framing, straight architectural verticals, natural gentle depth, slightly elevated frontal camera, carefully drawn perspective, precise believable room proportions.

An intimate theatrical room built from dark walnut wood, blackened carved oak, muted burgundy velvet, aged antique brass and dark polished stone. A broad recessed central wall alcove forms the clear focal area, framed by slim champagne-brass architectural trim. The central alcove is intentionally spacious, uncluttered and softly shadowed, with a simple subdued wine-black wall surface; it is reserved for a separately rendered three-dimensional card-drawing machine and its moving character card.

On the far left and far right, narrow gathered burgundy curtains, finely crafted wall panels, compact antique brass wall sconces, a few beautifully made drawers and collectible card display cabinets create delicate visual richness without competing with the center. An old timber ceiling beam and shallow upper arch provide a sense of enclosure. The lower part of the scene shows a broad uninterrupted dark walnut floor with fine material grain and a gentle geometric plank pattern, enough empty space for a heavy mechanical object to stand naturally.

Warm amber practical lamps illuminate the side walls and brushed metal edges; very subtle cool blue-gray ambient light softly separates the shadows. Rich but controlled dark values, crisp dark anime linework, soft hand-painted shadow shapes, carefully articulated materials, elegant cinematic composition, layered atmospheric depth, detailed edges, quieter center, beautiful subtle texture, refined fantasy illustration aesthetics. The environment supports vivid detailed full-body anime characters from different fantasy factions while allowing those character artworks to remain the brightest and most legible visual elements.

A standalone empty environment background to be used behind separately rendered 3D game objects. No characters, no card portraits, no foreground slot machine, no glowing magic circle, no title, no logos, no lettering, no game interface. Keep light sources grounded in the architecture, with restrained painted glow; the game engine will add real-time lighting, metallic reflections, contact shadows and HDR bloom.
```

## Negative（只使用项目既定六项）
```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 第一轮试画参数（未实际执行）
- Checkpoint: Anima Base
- Canvas: 1536×1024（横向场景构图母图，设计阶段候选；不代表手机已适配）
- Sampler: er_sde
- Steps: 35
- CFG: 4.5
- Seed: 实际出图后再记录，不虚构
- LoRA: normal 锁定全量原文

## 严格验收
1. 与现有马戏团/血族/猎人/魔女/恶魔商店角色缩小叠图：人物必须成为视觉中心，黑衣猎人仍能从中央背景清楚辨认。
2. 中央空出足以容纳真实卡机（既有机器由实时3D渲染），两侧装饰不抢卡牌翻面和奖励爆发效果。
3. 背景结构要稳，空间透视不能与当前 THREE OrthographicCamera 的略高斜视发生明显冲突。正式作为3D舞台时必须拆分贴图或重绘正面后墙，而非把整图平贴成房间。
4. 不将绘画中的反射、光斑、阴影冒充真实PBR或实时Bloom；所有真实金属反射、景深和动态光在引擎实现。
5. 手机390×844竖屏检查是否丢左右内容，必要时制作延伸墙面和竖屏版本；未通过不得宣称移动端完成。
6. Anima画出来的是候选，未经用户确认不覆盖游戏或角色素材。

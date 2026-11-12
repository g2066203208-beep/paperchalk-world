# 怪物猎人组织｜三名基层小兵 Anima 正式提示词规范（2026-11-12）

> 当前有效的用户覆盖规则。三种角色是 **萝莉型（prompt 必须明确写 `loli`）/ 少女型 / 成熟丰满型**，即三名完全不同的女性人物，不是一个人物的年龄变化或体型缩放。仅保存候选提示词；未经用户验收的图片不能称为已批准原画。

## 一、优先级与不可违反项

1. 每名角色 **一个单独完整英文正向 + 通用负面**；不拆片段，不靠前一条提示词补全。
2. **严格禁止在这批小兵的正向提示词中添加风格词、画师标签、风格 LoRA、任何 `<lora:...>`、`@akipekostyle`、`safe`。** 旧 NPC / 学生 / 画风预设中的相关行不是小兵模板。可保留 `masterpiece, best quality` 质量标签；人物所属年代及服装材质属于角色设计，并非新增风格 LoRA。
3. 少女和成熟型应明确为不同的成年人；萝莉型必须写字面 **`loli`** 并有明显幼态、短小比例。萝莉型保持无性化的制服与姿态；不要将成熟丰满体型移植给萝莉型。
4. 三人 **同一套古典黑色猎人制服**，胸前两排暗扣、高立领、膝下黑色长大衣、深灰马甲、黑高领内衬、窄腿裤、手套、同位置装备腰带/小包/短刀、黑色短靴。差异只能是适应骨架比例的尺码，不得换颜色、穿现代工装、换成现代战术马甲、或者变成七位高阶猎人的个人制服。
5. 气质冷峻危险、古典职业猎人，但这批是剧情**对话演出立绘**：不将性格表演固定到原始立绘；只用小幅、自然、彼此不同的站姿/手势。绝不挥大武器、跳跃、蹲地、持巨盾或遮挡脸部。
6. 三张均为独立正面偏轻微角度**完整单人全身像**：头发、衣摆、全部手指和靴底都在画框内；预留头顶、两侧、脚底安全边距。基准 **672×1024** 竖版，背景要求透明；实际导出后检查是否拥有真实 RGBA Alpha，不能因为提示词写透明就当成透明。
7. **统一负面仅**：`worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark`。无论年龄或服装设计如何，默认不得额外堆砌人物数量、体型、年龄、背景、透视等负面词。
8. 角色脸、眼、眉、鼻、嘴、骨架、发色、发质、肤色、比例各自独立。**不得同脸换发色或仅比例放大。**

## 二、三名猎人小兵｜完整可直接复制

### 01 萝莉型猎人小兵（必须有字面 loli）

**正向：**

```text
masterpiece, best quality, 1girl, solo, loli, petite, short stature, small body frame, childlike round face, soft full cheeks, a short rounded chin, large deep amber eyes with widely spaced brows, a tiny straight nose and small closed lips, pale ivory skin, short ash-brown straight bob hair cut at jaw level with uneven short bangs and one slim side braid tucked behind her left ear. She has small narrow shoulders, slender arms and legs, and a clearly diminutive silhouette; she is a different individual from the other hunter recruits. She wears the standard monster hunter recruit uniform: a long black old-fashioned double-breasted hunting overcoat reaching below the knees, a tall narrow standing collar, two vertical rows of small dark matte buttons, long fitted sleeves, a firmly belted waist, a dark charcoal waistcoat underneath, a plain black high-neck shirt, narrow black trousers, plain dark leather gloves, a narrow dark leather equipment belt with one small flat pouch on the left and one short sheathed hunting knife on the right, and close-fitting black leather ankle boots, tailored down for her small height without changing any garment structure, button placement, color, belt equipment or boots. Her expression is calm and neutral. She stands with her feet fairly close, slightly shifts her weight onto her right leg, and gently straightens the edge of her left glove using her right hand, a small contained everyday gesture. She is standing upright for a dialogue portrait, facing nearly forward, with both shoulders, both hands, and the whole outfit unobstructed. A single isolated character, full body from hair to boot soles, centered with wide empty margins above her head, around her elbows, and below her feet, no cropped limbs or clothing, transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

### 02 少女型猎人小兵

**正向：**

```text
masterpiece, best quality, 1girl, solo, young adult woman, medium height, lean athletic body, long narrow oval face, almond-shaped gray-blue eyes, gently angled eyebrows, a finely straight nose and a narrow defined mouth, light olive complexion, dark blue-black hair drawn back into a low straight ponytail with a few short side strands. Her shoulder width, face structure, hairstyle, height and complexion are entirely different from those of the other recruits. She wears the standard monster hunter recruit uniform: a long black old-fashioned double-breasted hunting overcoat reaching below the knees, a tall narrow standing collar, two vertical rows of small dark matte buttons, long fitted sleeves, a firmly belted waist, a dark charcoal waistcoat underneath, a plain black high-neck shirt, narrow black trousers, plain dark leather gloves, a narrow dark leather equipment belt with one small flat pouch on the left and one short sheathed hunting knife on the right, and close-fitting black leather ankle boots, with exactly the same coat design, buttons, collar, belt equipment, waistcoat, trousers, gloves and boots as every recruit, adjusted only to her own measurements. She has a natural attentive neutral expression, not an exaggerated personality expression. She stands in a restrained three-quarter torso orientation while keeping her face mostly toward the viewer, one gloved hand resting lightly against the front of her waist belt, the other arm relaxed at her side, and one foot placed a little behind the other. She is standing upright for a dialogue portrait, facing nearly forward, with both shoulders, both hands, and the whole outfit unobstructed. A single isolated character, full body from hair to boot soles, centered with wide empty margins above her head, around her elbows, and below her feet, no cropped limbs or clothing, transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

### 03 成熟丰满型猎人小兵

**正向：**

```text
masterpiece, best quality, 1girl, solo, mature adult woman, tall stature, mature beautiful long face with defined cheekbones and a strong softly rounded jaw, narrow muted green eyes, lower-set thick eyebrows, a distinct straight nose bridge and naturally full lips, warm tan skin, deep auburn wavy hair gathered into a substantial low chignon with one loose curl near the cheek. She has a visibly adult voluptuous silhouette with full bust, broad hips, a defined waist, strong shapely thighs, a fuller shoulder and pelvic frame; she is not an enlarged version of the other recruits and has completely independent facial features. She wears the standard monster hunter recruit uniform: a long black old-fashioned double-breasted hunting overcoat reaching below the knees, a tall narrow standing collar, two vertical rows of small dark matte buttons, long fitted sleeves, a firmly belted waist, a dark charcoal waistcoat underneath, a plain black high-neck shirt, narrow black trousers, plain dark leather gloves, a narrow dark leather equipment belt with one small flat pouch on the left and one short sheathed hunting knife on the right, and close-fitting black leather ankle boots, tailored to her mature full figure but with identical coat length style, same high collar, same buttons and seams, the same waistcoat, belt equipment, gloves, trousers and boots as the other two. Her expression is composed and emotionally neutral. She stands steadily with a slight turn of the shoulders, one gloved hand loosely resting at the side of her hip, and the other gloved hand touching the front of her coat near the lower buttons, with no dramatic action. She is standing upright for a dialogue portrait, facing nearly forward, with both shoulders, both hands, and the whole outfit unobstructed. A single isolated character, full body from hair to boot soles, centered with wide empty margins above her head, around her elbows, and below her feet, no cropped limbs or clothing, transparent background.
```

**负面：**

```text
worst quality, low quality, blurry, jpeg artifacts, chromatic aberration, watermark
```

## 三、资产与参考源

- 七名高阶猎人现有原画及登记：[`site/assets/characters/monster-hunters/README.md`](../../site/assets/characters/monster-hunters/README.md) 与 [`site/data/art/monster-hunters.v1.json`](../../site/data/art/monster-hunters.v1.json)。七人原画不得改动，也不能把七人的职业装备直接拼到小兵身上。
- 全阵营小兵上位合同：[`FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md`](FACTION_MINION_CHARACTER_IDENTITY_AND_PROMPT_RULES_V1_20261111.md)。
- 历史猎人气质定位：[`HUNTERS_FACTION_VISUAL_RULES_20261111.md`](HUNTERS_FACTION_VISUAL_RULES_20261111.md)。此前“不要强制全员长风衣”针对七人高阶成员；本批 **基层三人** 是用户后来要求的黑大衣统一制式例外。
- Anima 官方 Prompting 与 Generation settings：https://huggingface.co/circlestone-labs/Anima/blob/main/README.md 。官方写明提示词可混用英文标签及自然语言，并未规定必须添加画师或 LoRA。

## 四、状态

2026-11-12：三名**猎人**基层小兵完整提示词候选归档，**未生成或批准猎人小兵 PNG**，不声明已实装游戏。以后修改动作、外貌或者制服，都须重发对应角色的完整正向与通用负面。
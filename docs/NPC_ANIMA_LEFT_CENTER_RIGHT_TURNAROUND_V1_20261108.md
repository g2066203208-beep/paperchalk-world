# Anima NPC 三视图/四视图：LEFT / CENTER / RIGHT 单行构图规范 V1

**日期：2026-11-08。此文件是今后本项目 NPC 多视图提示词的唯一当前范本。**
**状态区分：** 三视图写法和截图由用户在会话中明确认可（构图方向正确）；下述新增第四格属于**待出图/待审核提示词**，不能谎称四格画作已经通过验收。
参考：[官方模型卡](https://huggingface.co/circlestone-labs/Anima) · [已整理的官方 Anima 提示规则](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md) · [本项目风格锁](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md) · [用户已批准 M003 老人原文](NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md)

## 为什么停止使用旧写法

多次失败稿把 `front view, side view, back view` 混在开头的标签串里，或使用 `FIRST: EXACT...` 大量重复强调，结果中间重复正面、第三格丢失背面、服装变更。**本项目用户认可的一次三视图出图所使用的是简短的 Anima 标签＋普通英文描述，并用 `LEFT FIGURE / CENTER FIGURE / RIGHT FIGURE` 指定空间位置。** 这是一种经本项目用户确认有效的**项目经验**，不是 Anima 官方承诺的强制布局语法。以后必须先用该写法，不得自动退回失败版。

## 不可违反的规范

- 三视图：**左：正面 0° / 中：严格朝左 90° 全身纯侧面 / 右：纯背面 180°**。四视图：**最左正面 / 左中纯左侧面 / 右中纯背面 / 最右纯正面特殊持续待机动作**。
- 三个基础视图同一中性站姿、手臂自然下垂；同一张图里角色的体型、发型、穿着、外套、内搭、领带、裤子、鞋子必须一致。
- 背面不能看见正脸；左侧面只能看见一侧脸部轮廓，鞋子和胸口都朝左。
- 不画眼睛、环境、家具、无关物品或额外 NPC。特殊动作必须符合人物生活、持续可循环；不能把一瞬间伸懒腰当持续待机。
- 修改已有成功的三格时，**只增加第四格所需要的段落**，其余人物外观和前三视图描述原样保持。四格负向中要删去原三视图的 `fourth figure`、`two frontal figures` 等会和新第四格冲突的词。
- 原项目画风 `@akipekostyle <lora:akipekoanima_v1_1:0.65>`。默认 **Anima Base / ER SDE / 35 steps / CFG 4.5 / 1536×1024**，这是项目首测组合不是官方唯一配方。
- 产出的白底 RGB **不等于**真正透明；只在用户批准后整理 RGBA 资产，不要覆盖其他已批准的 NPC。
- 已批准的 M003 老爷爷原始四格提示词、PNG 和透明图集全部保留，不因更新模板而改动。

## 一、已经获得用户正面认可的上班族三视图（保持原样）

### Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, adult man, office worker, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly three full-body drawings of one identical Japanese office worker in a single horizontal row. He is a 32-year-old man with short neatly combed dark brown hair, no visible eyes, a small nose, a small mouth, and an average build. He wears a light gray business suit jacket, matching light gray straight trousers, a white collared shirt, a dark navy necktie, and black leather shoes.

LEFT FIGURE: Front view. The man stands facing directly toward the viewer. His head, chest, shoulders, hips and shoes face forward. Both arms hang naturally at his sides.

CENTER FIGURE: Left-facing side profile. The same man stands turned 90 degrees to his left. His nose points left. Only one side of his face and one ear are visible. His chest, shoulders, hips and both shoes are seen directly from the side and face left. Both arms hang naturally at his sides.

RIGHT FIGURE: Back view. The same man stands facing directly away from the viewer. Only the back of his head, shoulders, suit jacket, trousers and shoes are visible. Both arms hang naturally at his sides.

All three figures are the same height and have identical body proportions, hairstyle, clothing, colors and shoes. All three figures have the same neutral standing posture, viewed from three different directions. Three complete full-body figures, evenly spaced, isolated on a plain white background.
```

### Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, repeated front views, duplicate characters, two frontal figures, frontal view in center, back view in center, frontal view on right, side view on right, three-quarter view, turned head, walking, running, sitting, different clothing, different faces, missing suit jacket, missing necktie, visible eyes, pupils, eyelashes, extra figures, fourth figure, cropped head, cropped feet, background scenery, furniture, text, watermark
```

## 二、上班族四视图：同一套外貌和前三格＋专属持续待机（新增候选）

第四格：**正面等地铁，双臂轻交叉，重心稍偏一腿，手指轻敲对侧手臂**。不坐下、不伸懒腰、不加手提物、不脱灰色西装、不变成另一套衣服。以此姿势作为后续可循环微动作的基础静态素材；生成图片本身不等于动画。

### Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, adult man, office worker, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly four full-body drawings of one identical Japanese office worker in a single horizontal row. He is a 32-year-old man with short neatly combed dark brown hair, no visible eyes, a small nose, a small mouth, and an average build. He wears a light gray business suit jacket, matching light gray straight trousers, a white collared shirt, a dark navy necktie, and black leather shoes.

FIRST FIGURE, FAR LEFT: Front view. The man stands facing directly toward the viewer. His head, chest, shoulders, hips and shoes face forward. Both arms hang naturally at his sides.

SECOND FIGURE, LEFT CENTER: Left-facing side profile. The same man stands turned 90 degrees to his left. His nose points left. Only one side of his face and one ear are visible. His chest, shoulders, hips and both shoes are seen directly from the side and face left. Both arms hang naturally at his sides.

THIRD FIGURE, RIGHT CENTER: Back view. The same man stands facing directly away from the viewer. Only the back of his head, shoulders, suit jacket, trousers and shoes are visible. Both arms hang naturally at his sides.

FOURTH FIGURE, FAR RIGHT: Front view, special idle pose. The same office worker is standing and waiting for the subway. His head, shoulders, torso, hips and shoes face directly toward the viewer. Both feet remain on the ground. His arms are loosely crossed in front of his chest, his shoulders are slightly relaxed, and his weight rests naturally on one leg. He has a slightly impatient but restrained posture, occasionally tapping the fingers of one hand against his opposite arm while waiting. This is a natural, continuous standing idle pose, not a dramatic gesture. He wears the exact same complete business suit, white shirt, navy necktie and black leather shoes.

All four figures are the same height and have identical body proportions, hairstyle, clothing, colors and shoes. The light gray suit jacket is properly worn over the white collared shirt and dark navy necktie in all four figures. The first three figures have the same neutral standing posture, viewed from three different directions. Only the fourth figure has the special standing idle pose.

Four complete full-body figures, evenly spaced, isolated on a plain white background, no additional objects, no furniture, no scenery.
```

### Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, incorrect character arrangement, repeated neutral standing poses in all four figures, frontal view in second figure, back view in second figure, three-quarter view in second figure, frontal view in third figure, side view in third figure, three-quarter back view in third figure, back view in fourth figure, side view in fourth figure, three-quarter view in fourth figure, turned torso in fourth figure, walking, running, sitting, stretching, raised arms above head, different clothing, different faces, different hairstyles, inconsistent body proportions, missing suit jacket, removed suit jacket, missing necktie, missing shirt, different suit colors, visible eyes, pupils, eyelashes, detailed eyes, bag, briefcase, smartphone, accessories, extra people, fifth figure, cropped head, cropped feet, background scenery, furniture, chair, bench, text, watermark
```

## 每次批量写下一位 NPC 的步骤

1. 当前会话先读官方来源/官方规则、本文件及画风锁；参考本项目已经成功的人物样图。
2. **仅替换角色身份/外貌/固定服装**和需要时的第四格个性待机；保留整个布局和空间指示框架；正面/侧面/背面不得换序。
3. 检查正向与负向：三视图恰好 3 人，四视图恰好 4 人；不得出现互相抵触的多人物否定词。
4. 给出**完整可直接复制**的正向和负向，不再要求用户拼接。
5. 用户生成后逐格检查朝向、服装、颜色、人数、脚底、头部；任何一项失败则不能标记美术批准。
6. 背景路人和重要 NPC 可使用同一构图，但身份设计和运行时灰阶处理另行决定；不得把不同 NPC 复制为同一人。

## 历史清理说明

- `NPC_ANIMA_FAST_PRODUCTION_WORKFLOW_V1_20261108.md` 的「必须先分别生成每个角度」仅是历史**失败后临时的候选方案**，已经被用户明确认可的单张横排方案取代；不可再当当前默认。
- M001 的旧失败候选 V3/V4/V5（反复堆词、饭袋、揉颈等）均不用于新的 NPC 提示词；M001/M002 现存待重画资料不代表它们的旧图被批准。

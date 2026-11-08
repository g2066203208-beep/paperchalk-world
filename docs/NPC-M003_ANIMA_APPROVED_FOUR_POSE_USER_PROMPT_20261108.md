# NPC-M003｜用户提供的老爷爷四格 Anima 正负向提示词原文

> **2026-11-08 收录**：用户在聊天中明确提供以下原文，纠正之前 GitHub 存储的是改写版本的问题。本文件逐字保留正向、负向内容和大小写、标点与段落，代码围栏仅用于展示。用户称此版为“老头的提示词”；与已批准图片的真实生成参数之间的对应关系尚未通过 PNG Info 验证。切勿推断 LoRA 0.65 是该图确切的 PNG 生成参数。不得再静默改写为另一份候选。

## Positive Prompt（完整原文）

```text
safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character sheet, multiple views, four full body depictions of the same elderly man, short gray hair, balding, wrinkled face, no visible eyes, small nose, small mouth, dark charcoal gray jacket, brown v-neck sweater vest, beige collared shirt, dark navy straight pants, black leather shoes, ordinary elderly man, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

Four separate depictions of exactly the same elderly man in one horizontal row, from left to right.

FIRST: EXACT FRONT VIEW, standing still, face looking directly forward, both shoulders facing the viewer, symmetrical frontal body, arms hanging naturally, both feet on the ground.

SECOND: EXACT 90 DEGREE LEFT SIDE PROFILE VIEW, standing still, entire body facing left, only one side of the face visible, shoulders and chest seen strictly from the side, feet pointing left, arms relaxed.

THIRD: EXACT BACK VIEW, standing still, entire body facing away from the viewer, back of head and jacket visible, arms at sides, both feet on the ground.

FOURTH: EXACT FRONT VIEW, sitting on an invisible seat, torso and shoulders facing directly toward the viewer, both knees pointing forward, both feet facing forward, holding an open newspaper with both hands, head slightly lowered while reading, natural relaxed seated posture.

The exact same face, hairstyle, gray jacket, brown sweater vest, beige collared shirt, navy pants and black leather shoes in all four depictions. The jacket is worn open over the sweater vest in every pose, including the seated pose.

Four full body figures, evenly spaced, consistent proportions, no furniture, no chair, no bench, no environment, isolated figures, simple background.
```

## Negative Prompt（完整原文）

```text
three-quarter view in first pose, front view in second pose, three-quarter view in second pose, front view in third pose, side view in fourth pose, three-quarter view in fourth pose, turned torso in fourth pose, walking, running, stepping, different outfits, different jacket colors, missing jacket, missing sweater vest, different hairstyles, different faces, chair, bench, subway seat, furniture, background scenery, excessive shading, excessive fabric folds, cropped feet, cropped head, extra characters, text, watermark
```

## 工作记录

- 此原文与此前 `site/data/npc/metro-commuter-npc-m003.v2.json` 中较短的改写提示词**不一致**；已以此用户提供文本更新 `production.positivePrompt` / `production.negativePrompt`，旧版本保留在 `production.previousRewrittenPrompt`，以免丢失历史。
- 原图、透明图集和四张 PNG 不动；用户批准的图像状态不等于有经过验证的生成元数据。
- 四格约束：纯正面站、朝左 90° 纯侧面站、纯背面站、纯正面坐着看报；四格不换脸不换衣，无椅子和背景。
- 下一位 M001 要参考**本原文的简短且分格清晰的组织结构**，不能复制老爷爷的外貌、报纸或衣服；不把未完成的新 NPC 冒充已批准的 M003。

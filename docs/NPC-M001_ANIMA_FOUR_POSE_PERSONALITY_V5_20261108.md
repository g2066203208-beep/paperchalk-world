# NPC-M001｜Anima 四格 V5：真正独立的生活动作（2026-11-08）

> 用户强调：**每个 NPC 都有自己的动作、神态、生活和个性**。前三格只统一方向，不统一人物气质。第四格是「此人标志性的生活瞬间」而不是所有人都坐着。此版优先于 V3/V4，仍是**候选、未生成、未批准**。

## 独立人物小传（设计提案，待用户审核）
- 下晚班的年轻通勤男性，话少、体贴、节俭，不愿引人注意；普通深蓝敞开夹克、米白 T 恤、炭灰裤、灰白鞋。
- **专属第四格**：纯正面站在原地，下班颈肩酸痛，**一只手揉后颈，一边忍不住轻轻打哈欠，另一只手提旧橄榄绿布饭袋**；眼皮沉、肩膀略不对称，嘴角尴尬。这一动作让人一眼看懂他今天累坏了，但又怕引人注意。
- 和 M003 老爷爷**正面坐着认真看报**、M002 女乘客**低头看手机**完全不同，不是三个人换不同头发重复坐姿。
- 布饭袋只出现在第四格，属于个人动作道具；三格基础朝向全部静止站姿，无其他道具。真实输出的透明 Alpha 需在生成后验证。

## Positive Prompt（Anima 直接整段复制）
```text
safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character sheet, multiple views, four full body depictions of the same young adult man, short slightly messy black hair with a neat fringe, narrow tired eyes drawn as tiny simple lines, small nose, small mouth, slender ordinary build, dark navy casual jacket worn open, off-white crew-neck t-shirt, charcoal straight pants, gray-white sneakers, a quiet and considerate young commuter returning home after a long shift, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

Four separate depictions of exactly the same young adult man in one horizontal row, from left to right.

FIRST: EXACT FRONT VIEW, standing still, face looking directly forward, both shoulders facing the viewer, symmetrical frontal body, slightly tired relaxed shoulders, arms hanging naturally, both feet on the ground.

SECOND: EXACT 90 DEGREE LEFT SIDE PROFILE VIEW, standing still, entire body facing left, only one side of the face visible, shoulders and chest seen strictly from the side, feet pointing left, arms relaxed.

THIRD: EXACT BACK VIEW, standing still, entire body facing away from the viewer, back of head and navy jacket visible, arms at sides, both feet on the ground.

FOURTH: EXACT FRONT VIEW, standing in place after a long work shift, chest and hips facing directly toward the viewer, both feet planted and pointing forward. He raises one hand to rub the back of his sore neck and opens his mouth in a small exhausted involuntary yawn, with heavy sleepy eyelids and one shoulder slightly higher than the other. His other hand carries a small worn dark-olive fabric lunch bag at his side. His expression is weary and a little self-conscious, as if he hopes nobody noticed the yawn. This is a natural asymmetric personal habit, not a generic standing pose, and he is NOT walking or stepping.

The exact same face, hairstyle, open dark navy jacket, off-white t-shirt, charcoal pants and gray-white sneakers in all four depictions. The jacket is worn open over the t-shirt in every pose, including the fourth special action. The small worn lunch bag appears ONLY in the fourth special action, without any lettering or logo.

Four full body figures, evenly spaced, consistent proportions, no furniture, no chair, no bench, no environment, isolated figures, simple background.
```

## Negative Prompt
```text
three-quarter view in first pose, front view in second pose, three-quarter view in second pose, front view in third pose, side view in fourth pose, three-quarter view in fourth pose, turned torso in fourth pose, walking, running, stepping, different outfits, different jacket colors, missing jacket, missing t-shirt, closed jacket, different hairstyles, different faces, generic neutral pose in fourth panel, sitting or seated pose in fourth panel, reading newspaper, checking smartphone, lunch bag in first three poses, chair, bench, subway seat, furniture, background scenery, excessive shading, excessive fabric folds, cropped feet, cropped head, extra characters, text, watermark
```

## 质量门槛与状态
- 依照用户提供的成功 M003 原文句式组织：身份段 → 四格横排 → FIRST / SECOND / THIRD / FOURTH → 服装锁 → 去环境。不以长篇控制术语覆盖四格结构。
- 第一格 0° 正面站；第二格 90° 朝左侧面站；第三格 180° 背面站；第四格严格 0° 正面揉颈哈欠提饭袋，**不是坐着**。
- 同一发型、脸、夹克敞开状态、T 恤、裤、鞋全四格一模一样；打哈欠时允许嘴形变化但不能换脸。
- 首测参数仅供试验：Anima Base / 1536×1024 / ER SDE / 35 steps / CFG 4.5；风格 LoRA 0.65 仅沿用用户提供 M003 提示词文本，真实 M003 PNG Info 未核实，不宣称这一定是已批准图的真实生成参数。
- 白底是 Anima 生成背景要求，不代表透明 PNG，需后期检查真实 RGBA。当前无获批 M001 原图，禁止发布游戏演员。

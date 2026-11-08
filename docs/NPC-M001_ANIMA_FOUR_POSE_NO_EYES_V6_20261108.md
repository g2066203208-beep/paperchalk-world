# NPC-M001｜Anima 严格四格无眼版 V6（2026-11-08）

> 用户纠错最终要求：**完全不要眼睛**；1/2/3 为纯正面/严格90°左侧面/纯背面，三格同一中性站姿，手臂自然放下；第四格**才是每个人独特的生活待机动作**。M001 原定位为劳累年轻通勤者，第四格正面坐着打瞌睡，不能擅自换成揉颈打哈欠，不能脱掉夹克。沿用 M003 用户实际提供的简洁四格提示结构，旧 V3–V5 均为失败候选。当前尚未产生新的 Anima 图像或经过用户批准。

## 正向提示词（完整复制）

```text
safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character sheet, multiple views, four full body depictions of the same young adult man, short straight black hair with simple bangs, no visible eyes, no drawn eyelids, no eye lines, no eyelashes, no pupils, blank upper face, small nose, small mouth, dark navy blue jacket, off-white crew-neck t-shirt, charcoal gray straight pants, gray-white sneakers, ordinary tired young commuter, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

Four separate depictions of exactly the same young adult man in one horizontal row, from left to right.

FIRST: EXACT FRONT VIEW, standing still, face looking directly forward, both shoulders facing the viewer, symmetrical frontal body, arms hanging naturally at his sides, both feet on the ground.

SECOND: EXACT 90 DEGREE LEFT SIDE PROFILE VIEW, standing still, entire body facing left, only one side of the face visible, shoulders and chest seen strictly from the side, feet pointing left, arms hanging naturally at his sides.

THIRD: EXACT BACK VIEW, standing still, entire body facing away from the viewer, back of head and jacket visible, arms hanging naturally at his sides, both feet on the ground.

FOURTH: EXACT FRONT VIEW, sitting on an invisible seat after a tiring day, torso and shoulders facing directly toward the viewer, both knees pointing forward, both feet facing forward. He is quietly dozing off, with his head slightly lowered toward his chest, shoulders relaxed, both hands resting loosely on his thighs, natural sleepy seated posture. His tiredness is conveyed only through his relaxed body posture and lowered head, not through drawn eyes or exaggerated facial expressions. No visible eyes, no eyelids, no eye lines, no eyelashes in this pose either.

The exact same face, hairstyle, navy jacket, off-white t-shirt, charcoal gray pants and gray-white sneakers in all four depictions. The jacket is worn open over the t-shirt in every pose, including the seated pose. All four depictions have the same minimalist facial design with absolutely no visible eyes or eye details.

The first three figures have identical neutral standing poses, with only their viewing directions changed. The fourth figure alone has the special seated sleeping pose.

Four full body figures, evenly spaced, consistent proportions, no furniture, no chair, no bench, no environment, isolated figures, simple background.
```

## 负向提示词（完整复制）

```text
visible eyes, drawn eyes, open eyes, closed eyes drawn, eyelid lines, eyelashes, pupils, irises, detailed eyes, expressive anime eyes, three-quarter view in first pose, front view in second pose, three-quarter view in second pose, front view in third pose, side view in fourth pose, three-quarter view in fourth pose, turned torso in fourth pose, standing in fourth pose, walking, running, stepping, different standing poses in first three figures, raised arms in first three figures, different outfits, different jacket colors, missing jacket, missing t-shirt, closed jacket, different hairstyles, different faces, exaggerated facial expressions, open mouth, yawning, different shoes, chair, bench, subway seat, furniture, background scenery, excessive shading, excessive fabric folds, cropped feet, cropped head, extra characters, text, watermark
```

## 生成与验收

- Anima Base；首轮 ER SDE / 35 Steps / CFG 4.5 / 1536×1024 横向；LoRA 标签沿用用户提供 M003 成功提示词中 `@akipekostyle <lora:akipekoanima_v1_1:0.65>`，不能把其当成已验证 PNG Info 元数据。
- 第一格纯正面静止站姿，第二格严格向左的 90° 纯侧面静止站姿，第三格纯背面静止站姿；三格**同一站立动作**，没有抬手、揉颈、走路、迈步。
- 第四格纯正面坐着打瞌睡：双膝和双鞋朝正前方，头低、肩放松、双手落在大腿，没有座椅。睡意靠姿态而不是画眼睛/眨眼/眼皮线表现。
- 四格都不画眼睛：无眼球、瞳孔、睫毛、眼线、闭眼弧线；仍可有小鼻小嘴，禁止夸张张嘴哈欠。
- 完全同一人、同一深蓝敞开夹克、米白 T 恤、炭灰裤、灰白运动鞋。**第四格也必须穿夹克**。无饭袋、手机、报纸等没有授权的道具。
- Anima 的白底预览并非真实透明；需要保留原图，待用户批准后再转出真实 RGBA 四格和拆分图；当前美术 `render.ready=false`，绝不入运行时。

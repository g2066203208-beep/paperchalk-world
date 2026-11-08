# 女主学校三人队学生妹①（SG01）｜自然动作三视图完整 Anima 提示词

> **2026-11-08，提示词候选，未出图。** 用户明确改变此前“前三格必须一模一样直立双手垂下”的约束：可以在三视图上设计自然且不同的生活动作，只要**身体的正面/纯左侧面/背面可辨认**，姿态舒适、不是夸张大动作。此规则对未来制作生效，不回溯修改既有批准原图。
>
> 官方模型卡：https://huggingface.co/circlestone-labs/Anima；项目必读：[官方摘要](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)、[空间构图基线](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)、[学校校服与美术锁](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md)。

## 第一位人物定位

- 学校三人队中的文静、娇小、轻声细语女生；高马尾；学生制服；无可见眼睛。
- 三格分别是 **正面低头看消息小步慢走 / 左 90° 侧面稍迈一步看手机 / 纯背面继续走、左手自然垂手机**。
- **手机全程同一只黑色手机，都在左手；** 不一格有一格没有，也不换手乱加道具。
- 学生三人队后续动作分工：第二位**开朗、轻快走路**，第三位**懒散自在、慢悠悠散步**。这是候选方向，不等于另两位已经有图。
- 所有动作腿部步幅小、重心合理、手臂有自然轻微变化；不遮挡正侧背轮廓、不超出全身画布。
- 保持阴天均匀漫射光，游戏运行时打动态光，不预烘焙强投影。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, petite, small frame, narrow shoulders, casual walking, holding smartphone, simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast daylight, white background.

A character reference sheet showing exactly three full-body drawings of the same petite Japanese schoolgirl in one horizontal row. She is a short, slender, quiet and gentle schoolgirl with narrow shoulders, a small youthful face, dark brown hair tied into a high ponytail, soft straight bangs, no visible eyes, a small nose and a small mouth with a subtle relaxed smile.

She wears a dark navy school blazer, a white collared shirt, a muted wine-red ribbon bow, a charcoal gray pleated skirt above the knees, black knee-high socks and brown loafers. She carries one small plain black smartphone in her left hand. Her clothes, hairstyle, hair length, ponytail position and smartphone are identical in all three drawings.

LEFT FIGURE: Front view. The girl is walking slowly toward the viewer, taking a small natural step forward. Her face, shoulders and torso face directly forward. She holds her smartphone naturally in her left hand in front of her waist, glancing slightly downward at the screen. Her right arm hangs loosely beside her body. A small relaxed smile, gentle and quiet everyday behavior.

CENTER FIGURE: Left-facing side profile. The same girl walks slowly toward the left, viewed directly from the side. Her nose, shoulders, chest, hips and shoes face left. One foot is slightly ahead of the other in a small natural walking step. Her left elbow is gently bent as she checks the smartphone near her waist. Her ponytail hangs naturally behind her head. A comfortable and understated walking posture.

RIGHT FIGURE: Back view. The same girl is walking away from the viewer with a small relaxed step. Her head, shoulders and torso face directly away from the viewer. Her left hand holds the same black smartphone lowered naturally beside her thigh. Her right arm hangs loosely with a slight natural walking swing. Her high ponytail and full school uniform are visible from behind.

The three figures show the same schoolgirl during three natural moments of walking while using her phone. Each drawing has a slightly different small everyday movement, while keeping the correct front, strict left side profile and back viewing directions. The same complete school uniform, hairstyle, body proportions and shoes appear in every drawing.

Gentle relaxed poses, small walking steps, natural arm movement, no exaggerated gestures, uniform soft overcast ambient light, even flat colors, minimal structural shading, no directional lighting or cast shadows.

Three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, repeated front views, front view in center, back view in center, front view on right, side view on right, three-quarter view, turned torso, looking backward, running, sprinting, jumping, dancing, exaggerated walking, long strides, wide leg spread, arms raised, dramatic gestures, unnatural walking posture, stiff identical poses, standing like a mannequin, different characters, different faces, different hairstyles, different ponytail positions, different clothing, missing blazer, missing ribbon, missing skirt, missing socks, different shoes, extra smartphones, smartphone in both hands, smartphone covering face, visible eyes, pupils, eyelashes, detailed eyes, large open mouth, backpack, handbag, extra accessories, hard shadows, strong contrast, rim light, dramatic lighting, glossy highlights, background scenery, furniture, extra people, fourth figure, cropped head, cropped feet, text, watermark
```

## 生成参数

Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`.

## 验收

1. 恰好三格，左正面、中央朝左严格侧面、右背面。**不要求三格动作一致**，不接受任何三分之四身体代替纯侧面。
2. 走路只小步，手与手机自然；无奔跑、跳跃、夸张扭身或交叉步遮挡身体。
3. 三格同一人、同一扎高马尾和刘海、同一制服、手机握在左手，无强投影或亮斑。
4. 只有用户实际批准了生成的图，才可以进入 NPC 图片库；文本保存不等于生图成功。

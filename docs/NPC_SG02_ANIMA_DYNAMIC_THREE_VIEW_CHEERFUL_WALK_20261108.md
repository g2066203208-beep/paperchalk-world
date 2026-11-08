# 学生妹三人队② SG02｜高挑开朗型 · 自然交谈轻快走三视图

**状态：提示词已完成，未使用 Anima 真实生成或审核。** 同校校服以 [女主原图校服规范](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md) 为准；视角沿用 [LEFT/CENTER/RIGHT](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)，动作允许不同但自然。依据 [Anima 官方提示说明](https://huggingface.co/circlestone-labs/Anima)，混合标签＋英文自然描述，无法承诺模型一次准确生成。

## 身份与动作区分
- 与 SG01 嫩棕色高马尾、娇小、慢走触屏不同：SG02 高挑、修长双腿、栗棕色颌边蓬松短发、外向健谈。不使用手机。
- 左 FRONT：开心地轻快小步朝前，右手胸前作小幅解释手势，左手自然摆动。
- 中 LEFT SIDE：严格向左迈小步，右肘稍弯、手在腰前随说话轻微比画，保持左侧面。
- 右 BACK：纯背面轻快走离，双臂自然摇摆，头发细微随动。
- 统一女主学校制服：接近黑色的深海军蓝合身外套、**两枚深炭灰扁圆纽扣**、白衬衫、**酒红细长领带**、炭灰短百褶裙、露膝盖的黑色小腿袜、深棕黑乐福鞋。无眼睛、眼皮和闭眼弧线。
- 低饱和阴天平涂，不画强光照或落地投影；三个角色不增加配角或道具。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, tall slender build, long legs, short fluffy chestnut brown hair, cheerful smile, natural walking, simple anime style, clean lineart, flat colors, muted colors, overcast daylight, white background.

A character reference sheet showing exactly three full-body drawings of the same Japanese high school girl in one horizontal row. She is a tall, lively and cheerful girl with long slender legs, a lean athletic build, naturally relaxed shoulders and youthful facial proportions. She has short fluffy chestnut brown hair reaching her jaw, a side-swept fringe and softly outward-curving hair ends. She has no visible eyes, no eyelids, no eyelashes, a small nose and a cheerful smiling mouth. Her hairstyle, body proportions and face remain identical in all three drawings.

She wears the same school uniform as the female protagonist: a fitted very dark midnight-navy single-breasted blazer with notched lapels, exactly two large flat dark charcoal front buttons arranged vertically, a small chest pocket and two lower pockets, a white collared shirt, a neatly tied narrow burgundy long necktie, a short charcoal gray pleated skirt reaching mid-thigh, plain black mid-calf socks leaving the knees visible, and dark brown-black leather penny loafers. Her blazer remains neatly closed in every view. All uniform details and colors remain identical.

LEFT FIGURE: Front view. The girl walks happily toward the viewer with a small light step, her right foot slightly forward. Her head, shoulders, chest and hips face directly forward. Her right hand is raised slightly in front of her chest with a small relaxed conversational gesture, as if she is telling a friend something funny. Her left arm swings naturally beside her body. Her mouth forms a cheerful open smile. Her pose is casual, friendly and lively.

CENTER FIGURE: Left-facing side profile. The same girl walks lightly toward the left, viewed directly from the side. Her nose, shoulders, chest, hips and both shoes face left. One foot steps naturally ahead of the other. Her right elbow is bent slightly as she makes a small conversational hand gesture near her waist, while her left arm remains relaxed. Her short fluffy hair moves gently with her step. Her mouth has a subtle cheerful smile.

RIGHT FIGURE: Back view. The same girl walks away from the viewer with a comfortable light step. Her head, shoulders, torso and hips face directly away. Her arms swing gently and naturally while walking, with one elbow slightly bent. The back of her short layered chestnut hair, navy blazer, pleated skirt, black mid-calf socks and loafers are clearly visible.

The three figures show the same lively schoolgirl in three different natural moments of walking and chatting. Her cheerful personality is expressed through small hand gestures, relaxed posture, gentle steps and smiling mouth. Each pose is different but comfortable and realistic. The front view, strict left-facing side profile and back view remain clear and accurate.

Identical face, hairstyle, hair length, school uniform, button count, clothing colors, proportions and shoes in every drawing. Uniform neutral overcast illumination, soft diffuse ambient light, even flat colors, minimal structural shading, no directional highlights, no cast shadows, no dramatic lighting.

Exactly three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyelashes, eyelids, closed-eye arcs, eye outlines, detailed eyes, eye highlights, different hairstyles, different hair lengths, ponytail, long straight hair, different characters, different body proportions, short stature, childlike proportions, gold buttons, brass buttons, yellow buttons, shiny metal buttons, one front button, three front buttons, extra buttons, ribbon bow, bow tie, untied necktie, loose necktie, different school uniform, missing blazer, missing necktie, open cardigan, long skirt, trousers, knee-high socks, thigh-high socks, tights, sneakers, high heels, handbag, backpack, smartphone, holding phone, exaggerated waving, arms above head, jumping, running, sprinting, dancing, exaggerated gestures, wide strides, unnatural walking, repeated front views, front view in center, back view in center, front view on right, side view on right, three-quarter view, turned torso, looking backward, extra characters, fourth figure, cropped head, cropped feet, hard shadows, directional sunlight, rim light, dramatic lighting, glossy highlights, scenery, furniture, text, watermark
```

## 参数与验收

Anima Base · ER SDE · 35 Steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`.

只接受一个角色三个朝向、自然且不夸张的步态手势、无眼睛、校服和发型跨视图完全一致、黑色双扣与长领带一致。其实际身高在游戏人物数据中单独确定，不在 Anima 文字里使用厘米值冒充尺度控制。

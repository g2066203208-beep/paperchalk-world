# 学生妹三人组 SG02｜黑皮辣妹、校服穿得松散｜Anima 三视图 V2

> **2026-11-08 用户明确改变 SG02 设计：第二位是晒黑肌肤的日式辣妹（gyaru），不会像第一位一样规规矩矩穿校服。** 此文档已用全新的完整正向和负向提示词**替换**旧“高挑开朗短栗棕 bob、校服规整”的过时设计。旧设计仅保留在 Git 历史中。
>
> 状态：提示词已完成，**未生成 SG02 人物 PNG，不是批准成品**。必须先读 [女主学校校服原版结构](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md)、[SG01 正确母图及三视图提示词](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)、[Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima)；自然语言与标签混用是官方支持的方式，但不保证一次生成严格三格。

## 角色与三格动作

- **身份：** 女主学校三人队第二位，明显高于 SG01、肩稍宽、结实而健康；深蜜棕晒黑肤色、蜂蜜金色齐肩波浪发、深色自然发根、侧分；**不画任何眼睛、眼皮、闭眼弧线**。性格自信俏皮，嘴角带一丝揶揄似的笑。
- **校服共性：** 同学校、同样深海军蓝近黑西装、白衬衫、酒红色细长长领带、炭灰短百褶裙、黑色小腿袜、深棕黑乐福鞋。前片必须保留 **两枚大号哑光暖深灰棕圆扣**，不可更改颜色或数量。
- **不规矩但不换校服：** 西装**始终敞开不扣**，衬衫领口最上方略松、**酒红长领带仍系着但结略松**，袜子稍微堆在小腿；三视图穿法一致。**不要领结、不要漏领带、不要把她画成另一个学校的制服**。
- **左正面：** 小步自信地迎面走，右手轻扶敞开的西装边缘，左臂自然摆，嘴角戏谑浅笑。
- **中纯左侧面：** 朝左自然慢走，右手靠近外套口袋，左臂摆动；完整 90° 侧身。
- **右纯背面：** 往远处轻松走，单手轻捋齐肩卷发发尾，另一手自然放松；身体始终完全背向。
- 阴天中性漫射光，平涂无强烈定向阴影；不添加手提包、手机、首饰、场景物品。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, Japanese gyaru schoolgirl, deep sun-tanned skin, honey blonde hair, tall girl, playful smile, simple anime style, clean lineart, flat colors, muted colors, soft overcast ambient light, white background.

A character turnaround sheet with exactly three full-body drawings of the same Japanese schoolgirl in one horizontal row. She is tall with longer legs, a strong healthy build, relaxed shoulders and a confident, teasing smile. She has deep warm golden-brown suntanned skin, shoulder-length loose wavy honey-blonde hair, darker roots and a side part. Same skin tone, hairstyle and proportions in every view. Her eye area is completely blank: no visible eyes, eyelids, eyelashes or closed-eye arcs.

She wears the SAME SCHOOL UNIFORM as the female protagonist, but casually: a fitted very dark midnight-navy school blazer WORN OPEN and UNBUTTONED, with exactly two large matte dark warm gray-brown round buttons with near-black rims still attached to its front; a white collared shirt with the top collar button slightly undone; a narrow burgundy LONG NECKTIE with a loose knot, clearly visible down the front; a short charcoal-gray pleated skirt reaching mid-thigh; black mid-calf socks slightly scrunched down; and dark brown-black leather penny loafers. All three views keep the blazer open, both buttons present and the same loosely tied burgundy necktie.

LEFT FIGURE: Front view. She walks toward the viewer in a small confident step. Her head, shoulders, chest and hips face straight forward. Her right hand casually touches the open blazer edge near her hip, leaving the necktie and buttons visible. Her left arm swings naturally, and her mouth has a playful half-smile.

CENTER FIGURE: Left-facing side profile. She walks left in a strict 90-degree side view. Her nose, shoulders, chest, hips and shoes face left. One foot is slightly ahead. Her right hand rests near the open blazer pocket while her other arm swings comfortably. Her wavy hair, open blazer and loose burgundy necktie match the front view.

RIGHT FIGURE: Back view. She takes a relaxed step away from the viewer, facing directly away with her head, shoulders, back and hips. One hand lightly brushes the end of her loose wavy hair near her shoulder, while the other arm hangs naturally. Her open blazer, charcoal pleated skirt, scrunched black socks and loafers remain unchanged.

Three natural everyday walking poses of exactly the same girl, slightly different small gestures, clear front, pure left side and pure back directions, consistent costume and hair. Three complete full-body figures, evenly spaced on a plain white background. Flat colors, gentle overcast diffuse ambient illumination, no strong baked lighting or cast shadows.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, pale skin, different skin tones, black ponytail, short dark bob hair, different hairstyles, different hair lengths, visible eyes, pupils, eyelashes, eyebrows, eyelid lines, closed-eye arcs, detailed eyes, closed blazer, buttoned blazer, missing blazer, missing buttons, one button, three buttons, gold buttons, brass buttons, shiny buttons, pure black buttons, missing burgundy necktie, bow tie, ribbon bow, bare collar, different school uniform, long skirt, trousers, black tights, thigh-high socks, sneakers, high heels, extra accessories, handbag, smartphone, dramatic posing, wide stride, running, jumping, dancing, twisted torso, three-quarter view, repeated front views, front view in middle, back view in middle, front view on right, side view on right, looking back, different characters, fourth figure, cropped head, cropped feet, harsh shadows, rim light, spotlight, shiny highlights, background scenery, furniture, text, watermark
```

## 参数
Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`。**这些是本项目的设置，不是 Anima 官方固定视角控制语言。**

验收：三面朝向必须清楚，人物晒黑肤色统一、卷发统一、衬衫领带都不丢、两颗深灰棕扣都在、西装始终敞开，动作小而不僵硬，无眼睛和预烘焙强光影。

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
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, Japanese gyaru, deep sun-tanned skin, long wavy honey blonde hair, confident smile, casual walking, school uniform, simple anime style, clean lineart, flat colors, muted colors, uniform overcast ambient light, white background.

A three-view character sheet showing exactly three full-body drawings of the same Japanese high school girl in one horizontal row. She is a tall, confident gyaru student with a sturdy healthy build, slightly broad shoulders, long legs and warm deep golden-brown sun-tanned skin. She has loose shoulder-length wavy honey-blonde hair with subtle darker roots, a side part and gently curled ends. Her hair length, hair color, wavy shape and tan skin tone are identical across all three drawings. She has no visible eyes, no eyelid lines, no eyelashes, a small nose and a playful confident smiling mouth. Her eye area is entirely blank in every view.

She wears the exact school uniform design of the female protagonist, but styles it casually: the very dark midnight-navy single-breasted blazer is WORN OPEN and unbuttoned, with its original TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with near-black rims still attached to the same front panel. Beneath it is a white collared shirt with the top collar button casually undone, and a NARROW BURGUNDY LONG NECKTIE with a slightly loosened knot that remains clearly visible down the shirt front. She wears the same short charcoal-gray pleated school skirt reaching mid-thigh, black mid-calf socks slightly scrunched around the calves, and dark brown-black penny loafers. The blazer stays open, both buttons stay present and the long tie stays on in every view.

LEFT FIGURE: Front view. She walks toward the viewer with a small relaxed, confident step. Her face, shoulders, chest and hips face straight forward. Her right hand casually holds the open edge of the blazer near her hip, without hiding the two buttons or burgundy tie. Her left arm swings loosely. Her mouth has an amused, friendly half-smile, with absolutely no eye marks.

CENTER FIGURE: Left-facing side profile. The same girl walks gently to the left, shown in a direct 90-degree side view. Her nose, shoulders, chest, hips and shoes all point left. Her right hand rests loosely near the open blazer pocket while her left arm swings naturally. Her wavy blonde hair hangs behind her shoulders, and the same loose burgundy necktie and white collar are visible from the side. One foot steps a little ahead of the other.

RIGHT FIGURE: Back view. The same girl strolls away with a small relaxed step. Her head, shoulders, back and hips face directly away from the viewer. One hand briefly brushes the ends of her loose wavy hair near her shoulder, the other arm hangs naturally. The open navy blazer, charcoal pleated skirt, scrunched black mid-calf socks and dark loafers match the other views.

All three figures are the identical tall tanned schoolgirl in three natural casual walking moments, with minor different arm gestures and small comfortable steps. Every view shows the same person, hair, skin tone, open school blazer, two matte gray-brown buttons, white shirt, long loose burgundy tie, skirt, socks and shoes. Exactly three separate complete full-body figures, evenly spaced, plain white background, soft flat colors, neutral diffuse overcast illumination, no baked shadows or bright highlights.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, pale skin, light porcelain skin, different skin tones, short dark hair, black ponytail, different hairstyles, different hair lengths, different roots, straight blunt bob, visible eyes, iris, pupils, eyelashes, eyebrows, eyelid lines, closed eyes, smiling eye arcs, detailed eyes, closed blazer, buttoned blazer, missing blazer, missing buttons, gold buttons, brass buttons, shiny metallic buttons, bright silver buttons, pure black flat buttons, one front button, three front buttons, missing long necktie, ribbon bow, bow tie, bare collar without necktie, missing white shirt, school uniform from another school, long skirt, pants, thigh-high socks, black tights, stockings, sneakers, high heels, extra accessories, handbag, smartphone, exaggerated pose, wide stride, running, jumping, dancing, bent torso, three-quarter view, turned head in back view, duplicate front views, front view in middle, back view in middle, front view on right, side view on right, different characters, fourth figure, cropped body, cropped feet, cropped head, directional lighting, hard shadows, rim light, glossy highlights, background scenery, furniture, text, watermark
```

## 参数
Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`。**这些是本项目的设置，不是 Anima 官方固定视角控制语言。**

验收：三面朝向必须清楚，人物晒黑肤色统一、卷发统一、衬衫领带都不丢、两颗深灰棕扣都在、西装始终敞开，动作小而不僵硬，无眼睛和预烘焙强光影。

# SG01｜学校女生三人组第一位 · V4（原版暖深棕灰双扣 + Akipeko 1.0）

> **更新 2026-11-08：用户上传的女主原始制服近景重新确认。** 原始外套有两枚**深棕灰（稍偏暖棕）、近黑色边缘**的大圆哑光纽扣，前一版“纯深炭灰/近黑色圆扣”的色彩说明并不准确。用户同时明确要求本批校服 NPC 使用 `<lora:akipekoanima_v1_1:1>`。本文件已将 V3 的正负向提示词**完整替换为 V4**；不继承错误的按钮描述。
>
> **出图状态：** 提示词已修订；用户先前提供的缺领带/错误纽扣截图属于退稿，不应登记为已批准三视图。原版人物图是服装参考，不是该 NPC 的生成图。

## 校服视觉依据

- 用户上传 `03_女主_基础站立_2048.png`：按钮特写确认是**两个深棕灰哑光圆扣，略暖的棕灰面、近黑的轮廓**，不是金银铜亮面金属，也不等于单纯冷炭灰。
- 西装：近黑深海军蓝合身翻领外套；两枚圆扣上下排列。白衬衫＋**细长酒红色领带必须露出**；炭灰色短百褶裙，黑色小腿袜露膝，深棕黑乐福皮鞋。
- SG01 只有一个娇小高马尾女学生；不能复制女主的长直发和眼睛。眼睛位置完全留白（无眼线、闭眼弧线、睫毛）。
- 三视图仍**左正面、中朝左纯侧面、右纯背面**，不同小幅、自然、连贯的慢走看手机动作；左手持同一手机，右手拇指确实触屏，不得只是举着手机。
- 默认阴天中性漫射光与低反差的平涂结构阴影；不加场景强灯光。**LoRA 1.0 为用户本次决定的本批学校 NPC 配置**，不是 Anima 官方保证风格或视角准确性。

依据：[学校制服准确参考](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md) / [Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima) / [项目三视图规范](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, character reference sheet, character turnaround, multiple views, full body, 1girl, petite teenage schoolgirl, high ponytail, walking slowly, using smartphone, simple anime style, clean lineart, flat colors, muted colors, neutral overcast daylight, white background.

A three-view character sheet showing exactly three full-body drawings of the same petite Japanese schoolgirl in one horizontal row. She has a small frame, narrow shoulders, a youthful round face, dark brown hair tied in a neat high ponytail, soft bangs, no visible eyes or eyelids, a small nose, and a gently smiling mouth. The area where eyes would be is blank in every drawing.

She wears the same school uniform as the female protagonist: a fitted very dark midnight-navy blazer with notched lapels, exactly TWO large ROUND MATTE DARK BROWN-GRAY buttons arranged vertically on the front, each button with a near-black rim. The buttons have a subdued warm brown-gray color, like the original heroine's buttons, never gold, silver, or metallic. The blazer has a small chest pocket and two lower pockets. Under it is a white collared shirt with a neatly tied NARROW BURGUNDY LONG NECKTIE, clearly visible on the chest. She wears a charcoal gray short pleated skirt reaching mid-thigh, black mid-calf socks exposing the knees and most of the calves, and dark brown-black leather loafers. Her clothing, button color and count, tie, ponytail and shoes match across all three drawings.

LEFT FIGURE: Front view. She walks slowly toward the viewer in a small comfortable step, her face, shoulders, chest and hips facing straight forward. She holds one small black smartphone upright in her left hand near her lower chest, slightly to the side of the necktie, while her right thumb gently scrolls the screen. She looks down slightly with a small smile. The burgundy necktie remains visible between the white collar and the phone; both front buttons remain visible on the blazer.

CENTER FIGURE: Left-facing side profile. The same girl walks toward the left in a short natural step. Her nose, shoulders, chest, hips and feet face left, viewed directly from the side. Her left hand holds the same phone in front of her waist, and her right thumb is touching the screen. Her head inclines slightly toward the phone, without turning her torso. Her ponytail, white collar, burgundy long necktie and blazer are consistent with the front view.

RIGHT FIGURE: Back view. The same girl walks gently away from the viewer with a relaxed small step, her head, shoulders, torso and hips facing directly away. Both forearms rest naturally in front of her waist as she continues using the same phone, mostly hidden from behind. Her high ponytail hangs down her back. The navy blazer, charcoal short pleated skirt, black mid-calf socks and loafers remain unchanged.

Three small natural moments of quietly walking and reading messages. Comfortable balance, consistent anatomy, identical character and uniform in all three drawings, correct front/strict left-side/back viewpoints, no exaggerated movement. Soft even diffuse overcast lighting, flat materials, minimal structural shading, no cast shadows or strong highlights. Three complete figures spaced horizontally on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyelashes, eyebrows, eye outlines, eyelid lines, closed eye arcs, eye highlights, detailed eyes, gold buttons, brass buttons, silver buttons, bright buttons, glossy metal buttons, black buttons without warm brown tone, extra buttons, one front button, three front buttons, missing front buttons, differently colored buttons, ribbon bow, bow tie, missing necktie, loose short necktie, necktie hidden behind smartphone, no shirt collar, different school uniform, open cardigan, oversized jacket, missing blazer, missing shirt, long skirt, pants, black tights, knee-high socks, thigh-high socks, sneakers, boots, different hairstyles, ponytail changes, different clothes, phone held unused at side, two phones, smartphone covering necktie, smartphone covering face, stiff arms, mannequin pose, large strides, running, jumping, dancing, overacting, exaggerated gestures, three-quarter view, rotated torso, front view in center, back view in center, front view on right, side view on right, repeated front views, extra characters, fourth figure, cropped head, cropped feet, directional sunlight, hard cast shadow, rim light, dramatic lighting, furniture, background scenery, text, watermark
```

## 参数
Anima Base / ER SDE / 35 Steps / CFG 4.5 / 1536×1024 / `@akipekostyle, <lora:akipekoanima_v1_1:1>`。

## 验收
三个朝向必须正确、人物一致、校服颜色与**两枚暖深棕灰色**纽扣吻合；细长酒红领带不遗漏；无眼睛、无闭眼弧线；手机实际在双手操作，脚步小而舒适。用户批准前不得入正式 NPC 游戏图集。

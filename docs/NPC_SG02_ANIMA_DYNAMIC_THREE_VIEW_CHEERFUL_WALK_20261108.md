# NPC-SG02 黑皮辣妹｜Anima V3：无眼睛三视图修正版

> **2026-11-08 实际出图未通过：用户反馈第二位仍出现眼睛。** 之前把 `Japanese gyaru` 等标签、表情与人物特征混写，虽然负向列有 `visible eyes`，Anima 依然可能生成典型带眼线和眼睛的二次元脸。这是模型视觉先验与文本约束的冲突，不能承诺靠字词必然解决。**V3 将“眼部完全留白，仅保留鼻子和嘴”放到正向人物脸结构的前端，并对每一视图明确眼部空白；从开头去掉容易诱发完整妆容的 `gyaru` 标签**，仍保留用户想要的晒黑肤色、卷发、松散校服和性格。
>
> **状态：完整修正提示词；原输出仍不通过，无 SG02 批准图片。** 画风 LoRA 1.0，同校制服结构以 [原图校服锁](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md) 为准。Anima 官方只支持标签、自然英语混写，并未承诺可靠压制特定脸部细节。
>
> **更可靠的修复路径：** 若已生成图除眼睛外其他部分满意，保留原图，用 img2img 局部重绘/修复蒙版**只处理眼部区域**，清除眼睛/眼线/睫毛/闭眼弧线、保持自然皮肤色块，同时保护发型、鼻子、嘴巴、衣服和身体姿势。若重画整张仍长眼睛，就不要继续加几十个重复的否定词。

## Positive Prompt
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, three full body views, tanned Japanese schoolgirl, honey blonde wavy hair, simple anime style, clean lineart, flat colors, muted colors, white background.

Exactly three full-body drawings of the same tall Japanese high school girl in a single horizontal row. She has warm deep golden-brown suntanned skin, shoulder-length loose wavy honey-blonde hair with darker roots, a side part, relaxed shoulders and long legs. Her face has a small nose and a playful curved mouth. The entire eye area between her bangs and her nose is plain uninterrupted skin, without any drawn eye shapes, eyelashes, eyebrows, closed-eye curves or eyelid lines. This blank eye area is the same in every view.

She wears the same school uniform design as the female protagonist, but with a relaxed fashionable attitude: a very dark midnight-navy blazer worn OPEN in all three views, exactly two large matte warm dark gray-brown round blazer buttons with near-black rims, a white collared shirt with its top button undone, a narrow burgundy LONG NECKTIE still loosely knotted and clearly visible, a charcoal gray short pleated skirt, slightly scrunched black mid-calf socks and dark brown-black loafers. The outfit, hairstyle, skin tone, button color and tie remain unchanged in all three drawings.

LEFT FIGURE: Front view. She walks toward the viewer with a small confident step. Her head, shoulders, chest and hips face forward. Her right hand lightly catches the edge of her open blazer near the hip, while her left arm swings naturally. Her playful smile is shown only by her mouth. Her upper face remains blank.

CENTER FIGURE: Left-facing side profile. The same girl takes a small step to the left in a strict 90-degree side view. Her nose, shoulders, chest, hips and shoes face left. One hand stays relaxed near her blazer pocket and the other swings gently. Only her nose and mouth are drawn on the face profile, with no eye or eyelid marks.

RIGHT FIGURE: Back view. The same girl walks away in a natural relaxed step, her head, shoulders, back and hips facing away. One hand casually brushes the ends of her wavy hair. The open blazer, skirt, socks and loafers exactly match the other figures.

Three natural understated walking poses, identical appearance in all views, complete figures from hair to shoes, even spacing, neutral overcast diffuse light, soft flat material colors, no dramatic highlights, no cast shadows, plain white background.
```

## Negative Prompt
```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, eyes, eye shapes, drawn eyes, pupils, irises, eyeliner, eye makeup, eyelashes, eyelid lines, eyebrows, closed eyes, closed-eye arcs, smiling eye arcs, eye highlights, upper face details, full anime face, pale skin, inconsistent skin tone, black ponytail, short black hair, different hair lengths, buttoned blazer, closed blazer, missing blazer, missing buttons, one button, three buttons, gold buttons, brass buttons, metallic buttons, missing burgundy necktie, ribbon bow, bare shirt collar, different school uniform, long skirt, trousers, tights, thigh-high socks, high heels, extra accessories, smartphone, jumping, running, dancing, twisted torso, three-quarter view, repeated front views, front view in center, back view in center, front view on right, side view on right, looking backward, different characters, extra figures, fourth figure, cropped feet, cropped head, hard shadows, rim light, spotlight, background scenery, furniture, text, watermark
```

## 设置和验收
Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`。三格：左正面，中纯朝左 90°，右纯背面；第一和第二格眼部必须**皮肤留白**，无眉眼、闭眼线、睫毛；西装三格敞开、两颗哑光暖灰棕扣、酒红长领带不消失，动作自然小幅。

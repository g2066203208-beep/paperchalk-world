# NPC-SG02 黑皮辣妹｜Anima V4：无眼睛已解决，纯左90°侧面待修

> **2026-11-08 最新验收：用户确认新版本已无眼睛；但侧面仍是斜侧、没有达到严格左 90°。SG02 尚未批准，不能上传为正式母图。** 不再大改已正确的正面/背面、晒黑肤色、发型和穿法。优先把现有图的侧面整个人物作为 img2img inpaint 蒙版，独立修复。
>
> **状态：仅无眼睛问题解决，侧面角度仍未通过。** 补充整个人物局部重绘提示词，避免重新生成时再次出现眼睛。
>
> **修复范围：** 不是再擦眼睛；这次蒙版必须覆盖**出错侧面人物从头到鞋的整个身体**，否则头、肩、臀和脚会保留旧斜角。其余两个人物保持未蒙版，不要修改。

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


## V4：仅修正左 90°纯侧面（img2img/Inpaint 完整提示词）

请将现有三视图作为 img2img 输入，**只遮罩实际画面中不合格的侧面人物整身（头发到鞋尖）**；正面、背面保持原始像素不动。旧正/负提示词为整张三视图重画备份，本节是当前推荐操作。

### Side-only Positive Prompt
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, full body, one Japanese high school girl, left-facing side profile, tanned skin, honey blonde wavy hair, school uniform, simple anime style, clean lineart, flat colors, muted colors, white background.

A full-body character drawing of the same tall, deep golden-brown suntanned Japanese schoolgirl from the reference image, seen from a TRUE 90-DEGREE LEFT SIDE PROFILE. The entire head, nose, neck, shoulders, chest, waist, hips, knees and both shoes all point directly LEFT. The viewer sees only ONE side of her face, ONE ear and the narrow side silhouette of her torso. The far shoulder is hidden behind the near shoulder. Her face has a small nose and mouth, while the entire eye area remains plain skin with no eyes or eyelid marks.

She has the identical shoulder-length wavy honey-blonde hair with darker roots as in the original image. She wears the exact same very dark midnight-navy school blazer OPEN and unbuttoned, two matte warm dark gray-brown buttons still attached to its front, white collared shirt, loosely tied narrow long burgundy necktie, short charcoal pleated skirt, slightly scrunched black mid-calf socks and dark brown-black loafers. The white collar and a little of the loose burgundy tie are naturally visible from the side without turning her chest toward the viewer.

She walks slowly toward the LEFT with a small relaxed step, one foot slightly ahead, arms resting comfortably with a natural walking swing. Her shoulders and pelvis are not twisted. The camera is exactly perpendicular to the side of her body, at normal standing eye level. Full figure from hair to shoes, plain white background, neutral diffuse overcast light, flat colors, no cast shadows.

This is a replacement for ONLY the side-profile figure in the existing three-view sheet. Preserve the other two figures completely unchanged.
```

### Side-only Negative Prompt
```text
worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, chromatic aberration, three-quarter view, 45-degree angle, 60-degree angle, oblique view, diagonal torso, front-facing chest, both shoulders visible separately, shoulders turned toward viewer, hips rotated toward viewer, front view, back view, looking at viewer, head turning, looking back, visible eyes, pupils, eyelashes, eyelid lines, closed-eye arcs, eyebrows, detailed eyes, pale skin, mismatched skin color, straight short hair, different hairstyle, missing wavy blonde hair, closed blazer, missing long burgundy tie, ribbon bow, gold buttons, metallic buttons, different school uniform, different shoes, exaggerated pose, running, jumping, arms raised, long walking stride, distorted hands, cropped feet, cropped head, furniture, scenery, hard shadows, strong highlights, text, watermark
```

注意：侧面正好 90°时，胸部领带/两颗正面纽扣**不一定能同时全部看见**，这是透视遮挡正常结果。必须保持它们在衣服上，但不要为了展示两个扣子强迫胸口旋转成斜侧面。生成完后才检查是否真正纯侧，不应提前宣布批准。LoRA 1.0，Anima Base，ER SDE，35 Steps，CFG 4.5。

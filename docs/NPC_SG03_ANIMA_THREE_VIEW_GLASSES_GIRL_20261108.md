# NPC-SG03｜第三个学校女生：圆框眼镜妹 · 赶时间的书包笔记本少女

> **2026-11-08 根据用户要求改版：** 不再做另一个“黑色短直 bob、身材细高、规规矩矩慢走的冷淡优等生”。SG03 需要与已认可的 SG01 手机高马尾及 SG02 高挑晒黑金发辣妹在**体型、面部道具、发型、随身用品、衣服穿法、具体生活动作**上显著不同。按用户「眼睛妹」的语境落实为**圆框眼镜妹**。普通路人仍然不绘制眼球，眼镜透明镜片后是自然肤色留白。
>
> 本提示词是直接从 [SG01 成功图序的 V2 固定填空母模板](ANIMA_SCHOOLGIRL_THREE_VIEW_FILL_IN_TEMPLATE_V2_20261108.md) **替换 11 个角色占位符**得到，模板镜头结构、校服、画风、双纽扣、无眼睛及阴天光照保持原样。SG01/SG02 已有母图不修改。尚未在 Anima 实际出图或美术验收。

## 性格差异与动作

- **辨识度：** 介于两人之间的中等身高、肩略圆/偏结实、圆脸；**深栗棕蓬松耳下短发**，碎刘海与外翘发尾；**细圆框眼镜**（透明镜片后不画眼睛）。不是 SG01 的娇小马尾，也不是 SG02 的晒黑长金发。
- **自己的故事感：** 有点急性子、担心赶不上课程，手里夹一册旧灰蓝笔记本，右肩背旧灰蓝帆布书包。
- **穿法：** 原校服深夜蓝单排双扣西装，**上扣扣好、下扣松开**；整洁白衬衫、**稍歪但完整的酒红长领带**、炭灰短百褶裙、规整黑色小腿袜、深棕黑乐福鞋。与 SG01 全扣整齐、SG02 全敞开明显不同。两颗哑光暖深灰棕纽扣始终存在。
- **左纯侧面：** 小步朝左急走，**右手扶右肩书包带**，左臂夹笔记本；面孔只有侧面、眼镜只见侧面的镜框。
- **中正面：** 一边快步走一边**用右食指轻推滑下的圆框眼镜**，左臂夹本子，略微焦急的嘴角，领带不被挡住。
- **右纯背面：** 小步往前，右手拉书包带，左肘夹笔记本；全身朝后，不回头。
- 同一角色三格**同一个书包右肩同一位置、同一本笔记本左臂、同一副眼镜**，缺道具则不通过。动作小但不同；无环境、无眼睛、无强投影。

## 变量映射（审计专用）

```text
[CHARACTER_TAGS] = medium height, thin round glasses, tousled short dark auburn hair, slightly sturdy schoolgirl, canvas shoulder bag, notebook, brisk walking
[BODY_PROPORTIONS] = an average-height, slightly sturdy and soft build with a round face, subtly rounded shoulders, practical short strides and a lively everyday silhouette
[SKIN_TONE] = natural warm beige skin with a soft, even complexion, identical in all three views
[HAIR_DETAILS] = dark auburn short tousled hair cut just below the ears, uneven wispy bangs and a few outward-flicked ends, with the same hair shape and length across all three views
[PERSONALITY_AND_MOUTH] = a slightly flustered but earnest expression conveyed only by a small crooked mouth and her purposeful movements
[UNIFORM_WEARING] = the dark navy school blazer neatly worn with its upper button fastened and lower button unfastened, a white shirt with clean cuffs slightly showing, a narrow burgundy LONG NECKTIE slightly crooked but clearly present, and flat black mid-calf socks worn neatly without scrunching
[PERSONAL_PROP] = She wears the same thin, dark metal ROUND EYEGLASSES in all three views. The clear spectacle lenses show only blank skin, with no drawn eyes or eyelids behind them. She carries one worn slate-blue canvas shoulder schoolbag on her RIGHT shoulder at her RIGHT hip, and one small closed gray-blue notebook with no lettering tucked firmly under her LEFT arm. The glasses, single bag and single notebook remain identical and visible or naturally occluded in every view.
[SIDE_ACTION] = She hurries in a small natural step toward the left while her right hand lightly grips the shoulder-bag strap near her collarbone; her left arm secures the closed notebook against her ribs, without rotating her chest toward the viewer. The thin round glasses are seen edge-on in profile
[FRONT_ACTION] = She takes a brisk but small step toward the viewer, holding the notebook tucked under her left arm while the bag strap rests on her right shoulder. Her right index finger lightly pushes the bridge of her round glasses back into place, like she is rushing to class. Her mouth forms a tiny worried smile. The notebook and hand do not cover her long burgundy necktie
[BACK_ACTION] = She continues walking away with a small quick step, the same canvas bag hanging from her right shoulder at her right hip, her right hand steadying its strap while her left elbow holds the notebook against her side. Her short messy auburn hair and rounded shoulder silhouette match the other views
[CUSTOM_NEGATIVE] = visible eyes behind glasses, eyes drawn through lenses, lens reflections covering face, missing glasses, oversized glasses, duplicate glasses, missing shoulder bag, bag on left shoulder, two bags, missing notebook, open book, floating notebook, white hair, honey blonde hair, long golden hair, high ponytail, different bag colors, missing burgundy tie, exaggerated running pose
```

## Positive Prompt（已完整填空，直接复制）

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, medium height, thin round glasses, tousled short dark auburn hair, slightly sturdy schoolgirl, canvas shoulder bag, notebook, brisk walking, simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast lighting, white background.

A single character turnaround sheet with exactly three full-body drawings of the same Japanese high school girl in one horizontal row. The first drawing shows her exact left side profile, the second drawing shows her directly from the front, and the third drawing shows her directly from behind. She has an average-height, slightly sturdy and soft build with a round face, subtly rounded shoulders, practical short strides and a lively everyday silhouette. Her skin tone is natural warm beige skin with a soft, even complexion, identical in all three views. Her hair is dark auburn short tousled hair cut just below the ears, uneven wispy bangs and a few outward-flicked ends, with the same hair shape and length across all three views. Her personality appears through a slightly flustered but earnest expression conveyed only by a small crooked mouth and her purposeful movements. She has a small nose, no visible eyes, no eyelid lines or eyelashes. The eye area is left completely blank in all three drawings.

She wears the identical school uniform design as the female protagonist: a fitted very dark midnight-navy single-breasted blazer with notched lapels, exactly TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with nearly black outer rims, vertically aligned on the front of the blazer. The button faces have a subtle brownish-gray tone like dark smoked stone, NOT shiny metal and NOT gold. She wears a white collared shirt, a clearly visible narrow burgundy LONG NECKTIE, a short charcoal gray pleated skirt reaching mid-thigh, black mid-calf socks leaving the knees exposed, and dark brown-black penny loafers. Her personal uniform-wearing style is the dark navy school blazer neatly worn with its upper button fastened and lower button unfastened, a white shirt with clean cuffs slightly showing, a narrow burgundy LONG NECKTIE slightly crooked but clearly present, and flat black mid-calf socks worn neatly without scrunching. She wears the same thin, dark metal ROUND EYEGLASSES in all three views. The clear spectacle lenses show only blank skin, with no drawn eyes or eyelids behind them. She carries one worn slate-blue canvas shoulder schoolbag on her RIGHT shoulder at her RIGHT hip, and one small closed gray-blue notebook with no lettering tucked firmly under her LEFT arm. The glasses, single bag and single notebook remain identical and visible or naturally occluded in every view.. The jacket, button design, necktie, skirt, socks, shoes and personal uniform-wearing style are identical in all three drawings.

LEFT FIGURE: Left-facing side profile. The same girl takes a small step to the left in a true 90-degree side view. Her nose, shoulders, chest, hips, knees and both shoes all face LEFT. Only one side of her face and one ear are visible; the far shoulder is hidden behind the near shoulder. She hurries in a small natural step toward the left while her right hand lightly grips the shoulder-bag strap near her collarbone; her left arm secures the closed notebook against her ribs, without rotating her chest toward the viewer. The thin round glasses are seen edge-on in profile. The same hairstyle, uniform and personal belongings are visible from the side, without twisting her chest toward the viewer. No eye details.

CENTER FIGURE: Front view. The same girl takes a small natural step toward the viewer, head, shoulders, chest, hips and shoes facing straight forward. She takes a brisk but small step toward the viewer, holding the notebook tucked under her left arm while the bag strap rests on her right shoulder. Her right index finger lightly pushes the bridge of her round glasses back into place, like she is rushing to class. Her mouth forms a tiny worried smile. The notebook and hand do not cover her long burgundy necktie. Her school uniform, long burgundy necktie and original two dark gray-brown buttons are recognizable, and her face remains without eye details.

RIGHT FIGURE: Back view. The same girl walks slowly away from the viewer, with her head, shoulders, back and hips facing directly away. She continues walking away with a small quick step, the same canvas bag hanging from her right shoulder at her right hip, her right hand steadying its strap while her left elbow holds the notebook against her side. Her short messy auburn hair and rounded shoulder silhouette match the other views. Her hairstyle, navy blazer, short charcoal pleated skirt, mid-calf socks and brown loafers match the other views. No part of her front face is visible.

Three gentle everyday walking moments, slightly varied natural steps and arm movement, consistent body proportions and costume across all three directions. Full figures from hair to shoes, evenly spaced on a clean plain white background. Neutral overcast ambient light, flat colors, minimal soft structural shading, no dramatic lighting or cast shadows.
```

## Negative Prompt（已完整填空，直接复制）

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyebrows, eyelashes, eyelid lines, closed-eye curves, smiling eye arcs, different faces, different body proportions, different skin tones, different hairstyles, different hair lengths, missing long necktie, bare shirt collar, ribbon bow, bow tie, missing white shirt, different school uniform, gold buttons, brass buttons, bronze buttons, copper buttons, yellow buttons, silver buttons, shiny metallic buttons, one button, three buttons, extra front buttons, missing buttons, different uniform wearing styles, different personal props, two frontal figures, repeated front views, front-facing left figure, three-quarter view on left, 45-degree side view, oblique side profile, shoulders angled toward viewer, face looking at camera in left figure, side view in center, back view in center, frontal view on right, side view on right, turned torso, looking backward, unnatural walking posture, huge steps, running, jumping, exaggerated gestures, extra people, fourth figure, cropped head, cropped feet, hard shadows, rim light, spotlight, background scenery, furniture, text, watermark, visible eyes behind glasses, eyes drawn through lenses, lens reflections covering face, missing glasses, oversized glasses, duplicate glasses, missing shoulder bag, bag on left shoulder, two bags, missing notebook, open book, floating notebook, white hair, honey blonde hair, long golden hair, high ponytail, different bag colors, missing burgundy tie, exaggerated running pose
```

## 固定生成参数及验收

Anima Base / ER SDE / 35 steps / CFG 4.5 / 1536×1024 / `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`.

**左纯朝左 90°侧面，中完全正面，右完全背面。** 仪表（眼镜镜框、书包、笔记本）应与方向对应，防止 3/4 角、重复正面、道具分裂。Anima 官方模型卡 https://huggingface.co/circlestone-labs/Anima 支持质量标签＋英语自然描述混写，但不承诺精确多视角；出图后需真实检查，未批准前不能当做已完成 NPC PNG。

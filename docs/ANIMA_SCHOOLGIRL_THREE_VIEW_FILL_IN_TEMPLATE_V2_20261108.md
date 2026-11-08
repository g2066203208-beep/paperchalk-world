# 校服女学生 Anima 三视图 V2｜根据 SG01 实际成功出图修正空间排列的固定填空模板

> **2026-11-08 使用真实图复核。** SG01 已认可的实际三视图从左到右是**纯左侧面 → 正面 → 背面**。上一个 V1 模板硬写成左正面／中侧面／右背面，而新 SG02 又生成了两个正面，现**以用户实际批准的 SG01 成片排列为 V2 空间规范**；**严禁再把侧面放中间并造成两个正面**。固定结构移植 SG01 成功提示词七段体系（质量/人物/校服/左/中/右/光照结束段），只有角色外貌、穿法、道具、三种微动作与定制负面词替换。原始 SG01 历史提示词和获批 PNG 不修改。
>
> 官方来源：https://huggingface.co/circlestone-labs/Anima ；三格严格符合文字是项目目标，官方不保证精确多视图控制。

## 母版锁定

- **七段固定顺序**：质量标签→同一人物定义→同校校服细节→左纯 90° 侧面→中纯正面→右纯背面→同一性结束语；不再换成单人物 inpaint。
- **三视顺序固定**：**LEFT side-facing left / CENTER front / RIGHT back**；不能让左边又成为 3/4 斜正面。
- **同校服**：非常深的午夜海军蓝西装、两枚哑光深暖灰棕圆扣、白衬衫、**长酒红领带**、炭灰短百褶裙、黑色小腿袜、深棕黑乐福鞋。**同校服但可有不同穿法**，严格三格一致；侧面若纽扣自然遮住属正确角度，不能为露纽扣旋胸。
- **无眼睛**：无瞳孔、眼皮弧线、眉眼、睫毛；不画背景、定向强光或落地烘焙阴影。
- **LoRA 固定**：`@akipekostyle, <lora:akipekoanima_v1_1:1.0>`；Anima Base / ER SDE / 35 steps / CFG 4.5 / 1536×1024。
- **只换槽位**：`[CHARACTER_TAGS]`, `[BODY_PROPORTIONS]`, `[SKIN_TONE]`, `[HAIR_DETAILS]`, `[PERSONALITY_AND_MOUTH]`, `[UNIFORM_WEARING]`, `[PERSONAL_PROP]`, `[SIDE_ACTION]`, `[FRONT_ACTION]`, `[BACK_ACTION]`, `[CUSTOM_NEGATIVE]`。替换完成必须检查没有剩余方括号。校服款式、两枚扣子、正侧背指令一概不自由重写。
- 仅增加与人物不冲突的 `[CUSTOM_NEGATIVE]`。不要在负向禁止这个人物已经要求的敞开西装、卷发、道具或其它穿法。

## Positive Prompt（占位模板）

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, [CHARACTER_TAGS], simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast lighting, white background.

A single character turnaround sheet with exactly three full-body drawings of the same Japanese high school girl in one horizontal row. The first drawing shows her exact left side profile, the second drawing shows her directly from the front, and the third drawing shows her directly from behind. She has [BODY_PROPORTIONS]. Her skin tone is [SKIN_TONE]. Her hair is [HAIR_DETAILS]. Her personality appears through [PERSONALITY_AND_MOUTH]. She has a small nose, no visible eyes, no eyelid lines or eyelashes. The eye area is left completely blank in all three drawings.

She wears the identical school uniform design as the female protagonist: a fitted very dark midnight-navy single-breasted blazer with notched lapels, exactly TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with nearly black outer rims, vertically aligned on the front of the blazer. The button faces have a subtle brownish-gray tone like dark smoked stone, NOT shiny metal and NOT gold. She wears a white collared shirt, a clearly visible narrow burgundy LONG NECKTIE, a short charcoal gray pleated skirt reaching mid-thigh, black mid-calf socks leaving the knees exposed, and dark brown-black penny loafers. Her personal uniform-wearing style is [UNIFORM_WEARING]. [PERSONAL_PROP]. The jacket, button design, necktie, skirt, socks, shoes and personal uniform-wearing style are identical in all three drawings.

LEFT FIGURE: Left-facing side profile. The same girl takes a small step to the left in a true 90-degree side view. Her nose, shoulders, chest, hips, knees and both shoes all face LEFT. Only one side of her face and one ear are visible; the far shoulder is hidden behind the near shoulder. [SIDE_ACTION]. The same hairstyle, uniform and personal belongings are visible from the side, without twisting her chest toward the viewer. No eye details.

CENTER FIGURE: Front view. The same girl takes a small natural step toward the viewer, head, shoulders, chest, hips and shoes facing straight forward. [FRONT_ACTION]. Her school uniform, long burgundy necktie and original two dark gray-brown buttons are recognizable, and her face remains without eye details.

RIGHT FIGURE: Back view. The same girl walks slowly away from the viewer, with her head, shoulders, back and hips facing directly away. [BACK_ACTION]. Her hairstyle, navy blazer, short charcoal pleated skirt, mid-calf socks and brown loafers match the other views. No part of her front face is visible.

Three gentle everyday walking moments, slightly varied natural steps and arm movement, consistent body proportions and costume across all three directions. Full figures from hair to shoes, evenly spaced on a clean plain white background. Neutral overcast ambient light, flat colors, minimal soft structural shading, no dramatic lighting or cast shadows.
```

## Negative Prompt（占位模板）

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyebrows, eyelashes, eyelid lines, closed-eye curves, smiling eye arcs, different faces, different body proportions, different skin tones, different hairstyles, different hair lengths, missing long necktie, bare shirt collar, ribbon bow, bow tie, missing white shirt, different school uniform, gold buttons, brass buttons, bronze buttons, copper buttons, yellow buttons, silver buttons, shiny metallic buttons, one button, three buttons, extra front buttons, missing buttons, different uniform wearing styles, different personal props, two frontal figures, repeated front views, front-facing left figure, three-quarter view on left, 45-degree side view, oblique side profile, shoulders angled toward viewer, face looking at camera in left figure, side view in center, back view in center, frontal view on right, side view on right, turned torso, looking backward, unnatural walking posture, huge steps, running, jumping, exaggerated gestures, extra people, fourth figure, cropped head, cropped feet, hard shadows, rim light, spotlight, background scenery, furniture, text, watermark, [CUSTOM_NEGATIVE]
```

## 验收原则

先数三格再看动作：左只有一个耳朵的纯朝左侧面，胸肩胯和脚尖都朝左；中完整正面且有酒红长领带；右完整背面。**如果左是斜正面、中又是正面，直接不通过，不能误写合格。** 需要确保三格发型、肤色、穿法一致。生成图可能不按指令输出，必须实际检查。

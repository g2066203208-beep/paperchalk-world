# SG01 学校三人队第一个女生｜Anima 三视图 V4：女主原版扣色 + LoRA 1.0

> **2026-11-08 用户指示**：旧版本把原版西装扣子误描述成纯深炭灰/黑色；这次重新比对用户上传的《03_女主_基础站立_2048.png》局部：**两枚大圆哑光深灰棕色纽扣，带近黑色描边，内部有少量暖棕灰色调；不是纯黑，也不是金铜金属光泽**。**LoRA 权重从 0.65 改为 1.0。** 本文件替换此前 V3 提示词；旧内容仅存在于 Git 历史。
>
> 状态：**Anima 完整提示词，尚未生成或批准新三视图 PNG，未游戏实装。** 女主的图片是校服参照，不要复制她的眼睛或脸。学校画风基准： [SCHOOL_UNIFORM_FEMALE_CANON_20261108.md](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md)。官方 Anima 模型卡：https://huggingface.co/circlestone-labs/Anima 。

## 最终约束

- **画风**：`@akipekostyle, <lora:akipekoanima_v1_1:1.0>`；只有新的学校学生图采用此次明确修改，不更改已有路人 M003/C001-C005 原图或它们各自的旧 LoRA 设置。
- **纽扣**：两颗大、哑光、深灰棕略暖色、外边近黑圆形纽扣；前片纵向整齐排列，不是金色铜色，不是纯黑填充平面。实际贴近用户原图。
- **校服**：深午夜蓝近黑修身两扣西装、白衬衫、酒红**长领带**、短款炭灰百褶裙、黑色小腿袜、深棕黑乐福鞋。
- **无眼睛**：眼球、瞳孔、眉眼、睫毛、眼皮线、笑眼弧线都不要；只通过嘴角和小幅生活动作表现情绪。
- **手机**：左手持手机、**右手食指触屏**，手势真正在操作；手机放在身体左侧腰前，不能遮挡长领带和两枚正面纽扣。背面手臂自然向前弯，手机被身体遮住合理。
- **三角度**：左完全正面、中纯朝左 90°、右纯背面，各有一个自然的小步行走瞬间；没有夸张步幅或扭身；完全相同人物和衣服。
- **阴天平涂**，场景真实光影交给游戏运行时。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, petite teenage schoolgirl, high ponytail, using smartphone while walking, simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast lighting, white background.

A single character turnaround sheet with exactly three full-body drawings of the same petite Japanese high school girl in one horizontal row. She has a small slender frame, narrow shoulders, a youthful round face, dark brown hair in a neat high ponytail with soft straight bangs, no visible eyes, no eyelid lines or eyelashes, a small nose and a gently smiling mouth. The eye area is left completely blank in all three drawings.

She wears the identical school uniform design as the female protagonist: a fitted very dark midnight-navy single-breasted blazer with notched lapels, EXACTLY TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with nearly black outer rims, vertically aligned on the front of the blazer. The button faces have a subtle brownish-gray tone like dark smoked stone, NOT shiny metal and NOT gold. She wears a white collared shirt, a clearly visible neatly knotted narrow burgundy LONG NECKTIE, a short charcoal gray pleated skirt reaching mid-thigh, black mid-calf socks leaving the knees exposed, and dark brown-black leather penny loafers. The jacket, button design, tie, skirt, socks and shoes are the same in all three drawings.

LEFT FIGURE: Front view. She takes a small natural step toward the viewer, head, shoulders, chest and hips facing straight forward. She holds one small black smartphone in her left hand slightly to the left of her waist, and naturally taps the phone screen with her right index finger, as if replying to a message. Her hands do not hide the long burgundy necktie or either of the two dark gray-brown blazer buttons. Her chin is gently lowered and her small mouth has a faint smile, with no eye details.

CENTER FIGURE: Left-facing side profile. The same girl takes a small step to the left in a true 90-degree side view. Her nose, shoulders, chest, hips and shoes all face left. She holds the same black smartphone just in front of her waist with her left hand and taps the screen with the right index finger. Her head leans slightly down toward the phone without twisting the torso. The same high ponytail and uniform are visible.

RIGHT FIGURE: Back view. The same girl walks slowly away from the viewer, with her head, shoulders, back and hips facing directly away. She takes a small natural step. Her forearms are comfortably bent in front of her waist while she continues looking at the same smartphone, mostly hidden from the rear. Her ponytail, midnight-navy jacket, short charcoal pleated skirt, mid-calf socks and loafers match the other views.

Three gentle everyday walking moments, slightly varied natural steps and arm movement, consistent body proportions and costume across all three directions. Full figures from hair to shoes, evenly spaced on a clean plain white background. Neutral overcast ambient light, flat colors, minimal soft structural shading, no dramatic lighting or cast shadows.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, gold buttons, brass buttons, bronze buttons, copper buttons, yellow buttons, silver buttons, bright metal buttons, shiny metallic buttons, jet black flat buttons, pale gray buttons, tiny buttons, one button, three buttons, extra front buttons, missing buttons, mismatched buttons, mismatched blazer, missing long necktie, bare shirt collar, ribbon bow, bow tie, loose necktie, untied necktie, missing white shirt, different school uniform, open cardigan, oversized coat, long skirt, pants, black tights, knee-high socks, thigh-high socks, sneakers, boots, visible eyes, pupils, irises, detailed eyes, eyebrows, eyelashes, eyelid lines, closed-eye curves, smiling eye arcs, different faces, different hairstyles, different ponytail heights, phone held idly at side, phone hiding necktie, phone hiding blazer buttons, phone covering face, extra smartphone, unnatural hands, stiff pose, huge steps, running, jumping, exaggerated gestures, repeated front views, front view in middle, back view in middle, front view on right, side view on right, three-quarter body view, turning torso, looking over shoulder, extra people, fourth figure, cropped head, cropped shoes, harsh shadows, rim light, spotlight, background scenery, furniture, text, watermark
```

## 建议参数

Anima Base / ER SDE / 35 Steps / CFG 4.5 / 1536×1024 / `<lora:akipekoanima_v1_1:1.0>`.

此为用户要求的本地 LoRA 权重，与 Anima 官方声称的固定推荐 LoRA 参数无关；模型不能保证文字一次实现完美角度或扣色。以实际 Anima 生成图作为验收依据。

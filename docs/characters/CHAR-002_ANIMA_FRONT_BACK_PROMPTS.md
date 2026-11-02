# CHAR-002 女二｜精简 Anima 正面/背面母版提示词 V2

> **仍是候选设计，未获美术验收。** 从两张独立全身图各生成一个人物，正背分别使用不同正向，不要在一个 1024x1024 画布上放两个女孩，也不要把一次 prompt 的 n=2 当作正背切换。每份正向均低于 500 英文词。样式需配合已批准女主原画作**美术参考**，文字不能保证自动完全统一。不可凭单人居中输出判定角色有 155cm，应在同地面线按 155:162 的高度比例验收。

## 正面 positive（138 个空格分词）

```text
masterpiece, best quality, score_7, safe, 1girl, solo, original character, female student, 18 years old, full body, standing, front view, facing viewer, looking at viewer, eye level, centered composition, exactly one person, petite slender figure, slightly short stature, chestnut brown hair, single high ponytail, wispy bangs, amber brown eyes, bright slightly rounded eyes, soft oval face, cheerful playful smile, fitted navy blue school blazer, single-breasted blazer, blazer buttoned, exactly two matte dark buttons vertically aligned on the front, matching dark sleeve buttons, white collared shirt, neat burgundy necktie, charcoal grey pleated skirt, white ankle socks on both legs, dark brown-black loafers, right hand on hip, left hand raised in a small friendly wave, simple balanced standing pose, hands visible, feet visible, plain white background, clean fine linework, restrained cel shading, consistent school uniform construction, no objects, no props, @akipekostyle<lora:akipekoanima_v1_1:1>
```

## 背面 positive（152 个空格分词）

```text
masterpiece, best quality, score_7, safe, 1girl, solo, original character, female student, 18 years old, full body, standing, back view, facing away from viewer, straight-on, eye level, centered composition, exactly one person, petite slender figure, slightly short stature, chestnut brown hair, single high ponytail tied at the crown, small muted blue hair tie, ponytail falling down the upper back, navy blue fitted school blazer, same single-breasted school uniform as front view, natural back seams, plain blazer back without buttons, matching dark sleeve buttons, white shirt collar visible from behind, charcoal grey pleated skirt with the same length and pleats as the front view, white ankle socks on both legs, dark brown-black loafers, right hand resting on hip, left hand raised beside shoulder, same balanced standing pose as front view, both feet visible, no face visible, no looking over shoulder, plain white background, clean fine linework, restrained cel shading, no objects, no props, @akipekostyle<lora:akipekoanima_v1_1:1>
```

## 两次生成共用 negative（86 个空格分词）

```text
worst quality, low quality, score_1, score_2, score_3, blurry, bad anatomy, bad hands, extra fingers, missing fingers, extra limbs, cropped head, cropped feet, out of frame, 2girls, multiple people, duplicate, side by side, character sheet, reference sheet, multiple views, split screen, half body, close-up, three-quarter view, side view, low ponytail, twintails, loose hair, gold buttons, mismatched buttons, open blazer, untucked shirt, loose hanging necktie, mismatched socks, one white sock and one grey sock, chibi, exaggerated perspective, running, jumping, props, school bag, books, detailed background, text, watermark, logo
```

## 审核固定参数

- 年龄18岁、155cm、46kg、B80/W62/H86cm、栗棕高单马尾、琥珀色眼睛属于**用户尚未批准的制作建议**；仅“单马尾、活泼、比女主稍矮”与“正面全身有个性动作”是用户明确提出。
- 同校制服**先锁定版型**：正面外套为合身、扣好、两颗哑光深色前门襟纽扣，袖扣深色，与女主一致；背面不凭空出现正面纽扣。裙褶、领口、领带和衣料阴影风格一致。
- 女二个人化可以体现在马尾、眼型、身材、神态、手势与统一成对的白短袜；不能每次随机变化制服结构、纽扣、发型和左右袜子颜色。
- 正面右手叉腰、左手抬起；背面保持**同一人物的同一动作**。禁止背面露眼、反转出现另一张脸、额外的马尾。
- 画师 tag、LoRA 权重沿用用户原始输入字面写法，不擅自 HTML 转义。

# 女主学校三人队学生妹① SG01｜准确同校校服＋自然小步看手机三视图

> **2026-11-08 纠错：此前版本校服不符合女主原图：错把酒红长领带画成蝴蝶结，袜高、外套形制和裙摆结构也不准。现已整体替换正负向提示词。旧版本仅供 Git 历史复盘，不再使用。**
>
> 本任务仍在**文字提示词待生成状态**；用户提供的 `03_女主_基础站立_2048.png` 是同校校服的视觉参考，不是 SG01 出图。详见 [女主学校女生校服准确参考锁](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md)。

## 角色定位和动作

- 独立于主角的娇小高马尾普通学生；无可见眼睛；眉眼细节不画，但嘴角、头部微倾、步幅体现文静性格。
- **左 FRONT：** 小步向前走，一只手拿手机在腰前，轻微低头、浅笑。
- **中 LEFT SIDE：** 纯左侧面，小步朝左走，左手仍握同一手机，动作自然。
- **右 BACK：** 背对镜头小步离开，手机在左手自然垂低。
- 同一套深海军蓝近黑西装＋白衬衫＋**细长酒红领带**＋**短炭灰百褶裙**＋**黑色小腿袜**＋**深棕黑色乐福鞋**；三格穿法一致。
- 阴天均匀漫射照明，场景灯光后期在游戏中完成；不烘焙方向阴影。动作可以自然变化，三视方向不可错误。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, petite, high ponytail, school uniform, holding smartphone, gentle walking, simple anime style, clean lineart, flat colors, muted colors, overcast ambient lighting, white background.

A three-view character reference sheet showing exactly three full-body drawings of the same petite Japanese high school girl in one horizontal row. She has a small frame, narrow shoulders, a youthful round face, dark brown hair tied in a neat high ponytail, soft straight bangs, no visible eyes, a small nose, and a small mouth with a gentle subtle smile. This is a different girl from the school heroine, with her own high ponytail and petite proportions.

She wears the same SCHOOL UNIFORM DESIGN as the female protagonist: a fitted very dark midnight-navy single-breasted school blazer with notched lapels, two dark front buttons and two lower front pockets, a white collared shirt, a narrow burgundy red LONG NECKTIE hanging down the shirt front, a charcoal gray SHORT PLEATED SKIRT reaching the middle of her thighs, plain BLACK MID-CALF SOCKS leaving both knees and most of the calves visible, and dark brown nearly black leather penny loafers. The blazer is worn closed in all three views. The neckwear is a long necktie, not a ribbon bow. The uniform design, colors, hem length, sock height and shoes match across all three figures.

LEFT FIGURE: Front view. She takes a short natural step toward the viewer, with her head, chest and shoulders facing directly forward. Her left hand holds a small plain black smartphone in front of her waist. Her right arm hangs loosely with a soft walking swing. She glances slightly downward and has a faint pleasant smile.

CENTER FIGURE: Left-facing side profile. The same girl takes a small relaxed step toward the left, seen directly from the side. Her nose, chest, shoulders, hips and shoes face left. Her left elbow is gently bent to hold the same smartphone near her waist. Her high ponytail hangs naturally behind her head. Her skirt, blazer, long burgundy tie, socks and loafers are identical to the front view.

RIGHT FIGURE: Back view. The same girl walks slowly away from the viewer with a small natural step. Her head, shoulders, torso and hips face directly away. Her left hand holds the same black smartphone lowered beside her thigh; her right arm swings a little. The same high ponytail, fitted navy school blazer, short charcoal pleated skirt, black mid-calf socks and dark brown loafers are visible from behind.

All three drawings show the identical schoolgirl and the exact same school uniform, hairstyle, ponytail height, body proportions and smartphone. The three views capture different gentle everyday walking moments without rotating the required front, strict left profile and back body directions.

Uniform soft diffuse overcast daylight, even flat material colors, minimal structural shading, no strong directional light, no cast shadow, no dramatic highlights. Exactly three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, ribbon bow, bow tie, neck ribbon, sailor uniform, different school uniform, light blue blazer, open cardigan, oversized jacket, cropped blazer, double-breasted jacket, missing blazer, missing white shirt, missing long burgundy necktie, green skirt, plaid skirt, long skirt, trousers, missing pleated skirt, knee-high socks, over-the-knee socks, thighhighs, black tights, pantyhose, bare ankles, sneakers, boots, high heels, missing loafers, different clothes, different colors, different ponytail positions, different hairstyles, different characters, visible eyes, pupils, eyelashes, detailed eyes, repeated front views, front view in center, back view in center, front view on right, side view on right, three-quarter view, turned torso, running, sprinting, jumping, dramatic gestures, giant walking strides, phone covering face, two phones, extra accessories, exaggerated shadows, rim light, spotlight, hard shadows, bright glossy highlights, background scenery, furniture, fourth figure, cropped feet, cropped head, text, watermark
```

## Anima 参数及验收

Anima Base / ER SDE / 35 steps / CFG 4.5 / 1536×1024，`@akipekostyle, <lora:akipekoanima_v1_1:0.65>`。官方支持标签和自然语言组合，但不保证精确三格空间方向，输出仍需验收。

核对：**是长领带不是蝴蝶结；小腿袜不是过膝袜；西装近黑海军蓝不是浅蓝；炭灰短百褶裙不是长绿裙**。与上传的女主校服照片逐项对照，不能自动换装。三格同一个人、同一高马尾、同一手机，三个方向可各有自然小动作。若输出与女主校服色形不符，必须退稿。

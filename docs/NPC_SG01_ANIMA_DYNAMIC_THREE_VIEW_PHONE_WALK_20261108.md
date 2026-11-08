# SG01｜学校三人队第一位 · 版本 V3：正确校服／无眼睛／自然操作手机三视图

> **2026-11-08，仍为待重画提示词；截图 V2 被用户明确否决，不得当成批准原画。** 用户指出：外套纽扣不匹配女主原图、正面出现眼睛且侧面出现闭眼弧线、手机只拿在手里没有真实互动动作。**本版全文替换旧稿。**
>
> 参考：女主原图 `03_女主_基础站立_2048.png`；[学校女生准确制服母版](SCHOOL_UNIFORM_FEMALE_CANON_20261108.md)；[官方 Anima 模型卡](https://huggingface.co/circlestone-labs/Anima)；[三视图左右位置合同](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。

## 硬性验收

- 制服纽扣：**女主原图两枚大圆深灰黑纽扣，上下排列；不能生成金色／铜色纽扣，也不能增减数量**。白衬衫、整齐酒红色细长领带、深海军蓝近黑合身西装、深灰短百褶裙、黑色小腿袜、深棕黑乐福鞋同样锁定。
- 无眼睛：**眼睛、瞳孔、睫毛、眼皮线、闭眼弧线一律不画**，不可用“微笑眯眼”取代无眼睛；性格通过嘴角、下巴、肩臂和走姿表现。
- 手机：同一部小黑色手机，左手持、**右手拇指触屏滚动**。不只是手垂着拿手机。正面、纯左侧面、纯背面三角度各有一帧自然慢走玩手机；背面手机部分被躯干遮挡属合理结果。
- 朝向：三视图横排 **LEFT 正面 / CENTER 朝左严格 90° 侧面 / RIGHT 正背面**。姿势可有适度小步幅变化，但不得旋转肩膀或背面回头。
- Akipeko LoRA 0.65、纯白背景、阴天漫射光、无强烈烘焙阴影。**图片本身未生成，绝不写批准或游戏已导入。**

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, petite teenage schoolgirl, high ponytail, walking slowly, using smartphone, simple anime style, clean lineart, flat colors, muted colors, soft overcast ambient light, white background.

A character sheet showing exactly three full-body drawings of the same petite Japanese schoolgirl in one horizontal row. She has a small narrow-shouldered build, dark brown hair in a neat high ponytail, soft bangs, a youthful round face, no drawn eyes, no eyelids, no eyelashes, a small nose, and a small mouth with a faint relaxed smile. Her face is completely blank at eye level in all three drawings.

She wears the same uniform design as the female protagonist: a fitted very dark midnight-navy single-breasted school blazer with notched lapels, exactly TWO large flat DARK CHARCOAL BUTTONS vertically aligned on the front, a small chest pocket and two lower pockets, a white collared shirt, a properly tied narrow burgundy LONG NECKTIE, a short charcoal gray pleated skirt reaching mid-thigh, black mid-calf socks leaving knees visible, and dark brown-black penny loafers. Both blazer buttons match the dark jacket, never gold or brass. The blazer is closed neatly in all views. The identical uniform and high ponytail appear in all three drawings.

LEFT FIGURE: Front view. She takes a small natural step toward the viewer while reading a message. Her head, shoulders, chest and hips face straight forward. She holds one small black smartphone upright with her left hand near her waist, and uses her right thumb to scroll on the screen. Both elbows stay comfortably close to her body. Her chin is slightly lowered, her mouth forms a subtle smile, and the eye area has no drawn features.

CENTER FIGURE: Left-facing side profile. The same girl walks gently toward the left, viewed directly from the side. Her nose, shoulders, chest, hips and shoes face left. One foot is slightly ahead in a short relaxed step. She holds the same phone in her left hand just in front of her waist, and her right thumb lightly touches the screen. Her head dips slightly toward the phone without twisting her torso. Her ponytail keeps the same length and height.

RIGHT FIGURE: Back view. The same girl takes a small step away from the viewer. Her head, shoulders and torso face directly away. Her forearms rest naturally in front of her waist as she continues using the same phone, mostly hidden from the rear. Her head is slightly lowered, and the high ponytail hangs down her back. Her uniform, skirt, socks and shoes remain unchanged.

Three natural moments of the same everyday action, gentle walking while checking a message. Different small leg and arm movements, comfortable balance, no exaggerated posing. Three identical character designs, evenly spaced, fully visible from head to shoes. Uniform soft diffuse overcast light, minimal structural shading, no harsh cast shadows or bright highlights, plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, eye outlines, closed eyes, closed-eye arcs, eyelid lines, eyelashes, pupils, irises, eyebrows, eye highlights, facial eye marks, gold buttons, brass buttons, yellow buttons, shiny metal buttons, extra front buttons, missing blazer buttons, one front button, three front buttons, mismatched button colors, bow tie, ribbon bow, untied necktie, loose crooked tie, different school uniform, light blue jacket, cardigan, missing blazer, missing necktie, long skirt, tights, knee-high socks, thigh-high socks, sneakers, different hairstyles, different ponytails, extra phones, two smartphones, smartphone hanging unused at side, phone held behind back, phone covering face, idle mannequin pose, stiff arms, wide strides, sprinting, running, jumping, dancing, exaggerated gestures, turned shoulders, three-quarter view, repeated front views, frontal figure in center, side figure on right, looking backward, different characters, cropped feet, cropped head, extra figures, fourth figure, directional sunlight, hard shadows, rim light, dramatic lighting, scenery, furniture, text, watermark
```

## 参数
Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536 × 1024 · `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`。位置段落属于项目有效经验，不是 Anima 官方可靠控制语法。

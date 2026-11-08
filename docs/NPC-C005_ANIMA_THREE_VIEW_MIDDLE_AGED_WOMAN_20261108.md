# NPC-C005｜中年女性路人｜Anima 三视图母图完整提示词

> 状态：**仅正式提示词，待用户在 Anima 出图；无实际 PNG，未批准，未注册游戏**。这位人物的剪影与 C002/C003 明显不同（套头毛衣＋A 字裙＋裤袜＋短靴）。遵守阴天中性漫射光，不烘焙场景光影；发型跨三视图完全统一。2026-11-08。

依照 [Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima) / [本项目官方提示词规范](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md) / [已确认的 LEFT/CENTER/RIGHT 构图](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md) / [人物风格锁](ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md)。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, middle-aged woman, casual commuter clothing, simple anime style, clean lineart, flat colors, muted colors, overcast daylight, soft diffuse ambient lighting, white background.

A character turnaround sheet showing exactly three full-body drawings of one identical middle-aged Japanese woman in a single horizontal row. She has a medium build, slightly rounded shoulders, a mature face with subtle lines around her mouth, short straight dark chestnut brown bob hair ending at her chin, a neat side part, no visible eyes, a small nose and a small mouth. Her hair has the same length, shape and side part in all three drawings, without shiny highlights.

She wears a muted burgundy red crew-neck pullover sweater with long sleeves, a deep olive green A-line midi skirt reaching below her knees, plain black opaque tights, and dark brown flat ankle boots. The sweater is worn neatly over the waistband of the skirt. She wears no cardigan, jacket, handbag or accessories.

LEFT FIGURE: Front view. The woman stands facing directly toward the viewer. Her head, chest, shoulders, hips and shoes face forward. Both arms hang naturally at her sides. The burgundy sweater and olive green skirt are fully visible.

CENTER FIGURE: Left-facing side profile. The same woman stands turned 90 degrees to her left. Her nose points left. Only one side of her face and one ear are visible. Her chest, shoulders, hips and both boots are seen directly from the side and face left. Both arms hang naturally at her sides. The bob hairstyle and skirt length match the front view.

RIGHT FIGURE: Back view. The same woman stands facing directly away from the viewer. Only the back of her short chestnut brown bob hair, burgundy pullover sweater, olive green skirt, black tights and brown ankle boots are visible. Both arms hang naturally at her sides.

All three drawings show the same woman with identical hairstyle, body proportions, clothing, colors and shoes. The burgundy sweater remains a pullover without buttons or an opening. The olive green A-line skirt has the same shape and length in all three drawings. All three figures are the same height and have the same neutral standing posture, viewed from three different directions.

Uniform neutral overcast daylight, very soft diffuse ambient illumination, clean flat material colors, minimal soft structural shading, no directional highlights, no cast shadows, no dramatic lighting, no baked scene lighting.

Three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, repeated front views, two frontal figures, front view in center, back view in center, front view on right, side view on right, three-quarter view, turned head, walking, running, sitting, different characters, different body proportions, different hairstyles, different hair lengths, long hair, ponytail, bun, shiny hair highlights, visible eyes, pupils, eyelashes, detailed eyes, cardigan, jacket, coat, hoodie, buttoned sweater, open sweater, trousers, jeans, shorts, missing skirt, different skirt length, different skirt color, missing tights, different shoes, high heels, handbag, backpack, smartphone, jewelry, accessories, hard shadows, deep black shading, dramatic lighting, strong contrast, rim light, backlight, spotlight, cast shadow, ground shadow, glossy highlights, excessive fabric folds, extra people, fourth figure, cropped head, cropped feet, background scenery, furniture, text, watermark
```

## 生成设置

Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536×1024 · `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`。这些是项目参数，不是官方三视图硬性保证。

三视图为左正面、中纯左侧面、右背面。全身完整、服装一致、发型一致、白背景、阴天均匀漫射光。只建立新人物 C005 的待生图档，不覆盖 C001-C004/M003。

# NPC-C004｜年轻男性街头路人 · 三视图阴天无烘焙光影重画

> **状态：用户提供的新截图被指出存在三面发型不统一、光影过重，属于待重画候选；并非批准图，更不是 GitHub 已入库原画。**
>
> **当前标准**：普通路人仅正面 / 纯左侧面 / 纯背面三视图；发型、面部、服装、鞋子三面统一。**无预烘焙场景光照与阴影**，默认阴天中性漫射光，动态灯光由游戏渲染处理。与用户已有风格 LoRA 0.65 保持一致。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, young adult man, casual streetwear, simple anime style, clean lineart, flat colors, muted colors, uniform soft ambient light, overcast daylight, white background.

A character turnaround sheet showing exactly three full-body drawings of one identical young Japanese man in a single horizontal row. He has short tousled black hair, a soft uneven fringe above his forehead, short natural side hair covering the temples, and the same small loose hair tufts at the crown and back of his head in every drawing. His hair is entirely black with no white streaks or shiny highlights. He has no visible eyes, a small nose, a small mouth, a lean build, and slightly broad shoulders. He wears an oversized dark forest green pullover hoodie with the hood resting down behind his neck, loose khaki cargo pants with two side pockets, and black-and-white low-top canvas sneakers.

LEFT FIGURE: Front view. The man stands facing directly toward the viewer. His head, chest, shoulders, hips and shoes face forward. Both arms hang naturally at his sides. The short black fringe and side hair match the other views.

CENTER FIGURE: Left-facing side profile. The same man stands turned 90 degrees to his left. His nose points left. Only one side of his face and one ear are visible. His shoulders, chest, hips and both shoes are seen directly from the side and face left. His side hair is short and natural, not shaved, and the crown and back hair match the front and back views. Both arms hang naturally at his sides.

RIGHT FIGURE: Back view. The same man stands facing directly away from the viewer. Only the back of his short black tousled hair, lowered green hood, khaki cargo pants and black-and-white sneakers are visible. The hair has the same short length and small loose tufts as in the front and side views. Both arms hang naturally at his sides.

All three drawings show the same person with identical hairstyle, hair length, clothing, colors, body proportions and shoes. The dark green hoodie stays on with the hood down, and the khaki pants have the same side pockets in every view. All three figures are the same height and have the same neutral standing posture, viewed from three different directions.

Uniform neutral overcast daylight, very soft diffuse ambient illumination without a visible light direction. Flat, even material colors on the face, hair, hoodie, pants and shoes. No directional highlights, no cast shadows, no dramatic dark areas, no baked lighting. The game will add scene lighting separately.

Three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, different hairstyles, different hair lengths, different bangs, shaved sides, undercut, long hair, spiky back hair, white hair streaks, white hair highlights, glossy hair, repeated front views, two frontal figures, front view in center, back view in center, front view on right, side view on right, three-quarter view, turned head, walking, running, sitting, raised arms, inconsistent clothing, different hoodie colors, missing hood, hood worn over head, missing cargo pockets, different pants colors, different shoes, visible eyes, pupils, eyelashes, shiny highlights, directional sunlight, hard shadows, deep black shading, strong contrast, harsh cel shading, dramatic lighting, rim light, backlight, spotlight, cast shadow, ground shadow, ambient occlusion, reflected light, colored lighting, extra people, fourth figure, cropped head, cropped feet, background scenery, furniture, text, watermark
```

## 生成参数与验收

- **Anima Base**，**ER SDE**，**35 Steps**，**CFG 4.5**，**1536×1024**，`@akipekostyle` 与 `<lora:akipekoanima_v1_1:0.65>`。
- 图片顺序：**LEFT=正面、CENTER=朝左纯侧面、RIGHT=纯背面**；三张同一男性、相同发型及服装。
- 发型：**三面都是黑色短碎发，刘海不过眼，头顶/后脑只有少量松散短发束**；不可侧面突然剃短、正面留长发、背面长尖刺或白色高光。
- 服装：深森林绿套头连帽卫衣（帽子放下）、宽松卡其工装裤、黑白低帮帆布鞋；三面一致。
- 光影：**统一阴天漫射环境，基础贴图平涂，没有明确光源方向、深黑阴影、白色反光或脚底投影**。允许线条与少量结构色差用于读形，不把动态光影画死在人物身上。
- 注意：自然语言不等于官方角度/服装硬约束；最终以实际生成三视图验收为准。白底不等于透明 PNG。
- 官方来源：[Anima model card](https://huggingface.co/circlestone-labs/Anima)；[本项目官方提示词核对版](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)；[当前三视图基准](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。

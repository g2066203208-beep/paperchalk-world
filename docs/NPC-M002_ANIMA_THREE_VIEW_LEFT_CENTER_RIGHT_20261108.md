# NPC-M002｜Anima 三视图（左正面 / 中纯左侧面 / 右背面）

> **状态：仅提示词待生成，未批准图片，未上游戏。** 2026-11-08 用户取消为每个普通 NPC 画第四格的要求；本稿仅画三格。保持 M002 已登记外貌（米色开衫、灰蓝上衣、藏蓝长裤、白鞋）不变，**不画手机动作**。原 M002 v2 四格草案保留为历史，不再作为当前画稿。
>
> 依照 [用户已确认的 LEFT/CENTER/RIGHT NPC 模板](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。 [Anima 官方说明](https://huggingface.co/circlestone-labs/Anima) / [官方规则归档](ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)；此空间布局是本项目验证经验而非官方专用控制语法。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, character reference sheet, character turnaround, multiple views, full body, adult woman, subway commuter, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly three full-body drawings of one identical Japanese female subway commuter in a single horizontal row. She is a young adult woman with straight shoulder-length dark brown hair, neat bangs, no visible eyes, a small nose, a small mouth, and a natural average build. She wears a light beige cardigan worn open over a muted light blue shirt, dark navy straight ankle-length trousers, and plain white low-top sneakers.

LEFT FIGURE: Front view. The woman stands facing directly toward the viewer. Her head, chest, shoulders, hips and shoes face forward. Both arms hang naturally at her sides.

CENTER FIGURE: Left-facing side profile. The same woman stands turned 90 degrees to her left. Her nose points left. Only one side of her face and one ear are visible. Her chest, shoulders, hips and both shoes are seen directly from the side and face left. Both arms hang naturally at her sides.

RIGHT FIGURE: Back view. The same woman stands facing directly away from the viewer. Only the back of her head, shoulder-length hair, cardigan, trousers and shoes are visible. Both arms hang naturally at her sides.

All three figures are the same height and have identical body proportions, hairstyle, clothing, colors and shoes. The light beige cardigan remains open over the muted light blue shirt in all three drawings. All three figures have the same neutral standing posture, viewed from three different directions. Three complete full-body figures, evenly spaced, isolated on a plain white background.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, repeated front views, duplicate characters, two frontal figures, frontal view in center, back view in center, frontal view on right, side view on right, three-quarter view, turned head, walking, running, sitting, different clothing, different faces, different hairstyles, different hair lengths, missing cardigan, closed cardigan, missing shirt, different cardigan colors, skirt, dress, high heels, visible eyes, pupils, eyelashes, detailed eyes, smartphone, handbag, backpack, accessories, extra figures, fourth figure, cropped head, cropped feet, background scenery, furniture, text, watermark
```

## 生成参数与验收

- Anima Base / ER SDE / 35 steps / CFG 4.5 / 1536×1024。
- `@akipekostyle, <lora:akipekoanima_v1_1:0.65>`；不开 Munji。
- 恰好三个人物：**LEFT 正面 → CENTER 左 90° 侧面 → RIGHT 纯背面**。
- 全三格同一人物发型、米色开衫永远敞开、浅蓝上衣、藏蓝裤、白鞋，站姿一致，手臂下垂。无眼睛、手机、桌椅、背景。
- 白底 RGB 不等于透明 RGBA。用户批准出图后才能进一步处理透明素材及正式登记。

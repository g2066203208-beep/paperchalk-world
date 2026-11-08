> **已否决 / 停用：** 用户实测原图造型不满意（发福、显老、过重的衣物阴影）。本文件只用于历史记录；不要再使用。新的 C006 正式候选请使用 [清爽年轻路人 V2](NPC-C006_ANIMA_THREE_VIEW_CLEAN_CASUAL_YOUNG_MAN_20261108.md)。

# NPC-C006｜通用城市路人·普通休闲男性｜Anima 三视图完整提示词 V1

> **用户 2026-11-08 更正开发顺序：优先做街道、地铁、商场、社区、公园等处均可出现的普通市民，暂不做场景专属职业路人。** 原 C006「地铁维修工」仅为未出图提示词，已撤销优先使用资格，不属于已批准 NPC。本稿接替 C006 规划，**没有生成或上传任何人物 PNG，未游戏实装**。

## 角色外观

- 约35岁，普通成年男性，身高平均、**略微发福**、圆肩和少许小肚子、自然不精致的方圆脸。
- 深栗棕微卷短发，额角轻微后退，无眼睛、小鼻子、平和小嘴。
- **暖浅灰米色敞开棉质休闲衬衫外套**（两只胸袋）、内搭**暗砖红T恤**、褪色深蓝直筒牛仔裤、灰白休闲帆布鞋。
- 没有包、手机、眼镜、帽子、职业胸牌和工作道具；在城市生活场景中任何地方出现都合理。
- LEFT 左侧90°自然小步走／CENTER 正面左手随意插裤袋、右臂自然下垂／RIGHT 背面小步离开。动作适度、服装道具与发型三面一致。
- 与已有 C001 灰西装男、C004 深绿连帽衫青年、M003 深灰夹克老人、C002 米色开衫女性、C005 红毛衣女性不同。

## Positive Prompt

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, adult man, casual clothes, short wavy brown hair, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly three full-body drawings of the same ordinary Japanese adult man in a single horizontal row. He is a man in his mid thirties with an average-height slightly heavyset build, gently rounded shoulders, a small natural belly, short softly wavy dark chestnut-brown hair with a subtle receding hairline, a rounded square face, no visible eyes, a small nose and a small relaxed mouth. He looks like an everyday civilian, not a uniformed worker or a story protagonist. His body proportions, hairstyle and face are identical in all three drawings.

He wears a light warm gray-beige casual cotton overshirt, worn OPEN with the sleeves down, a plain muted brick-red crew-neck T-shirt underneath, faded dark blue straight-leg jeans without cargo pockets, and worn off-white low-top casual sneakers. The overshirt has a small collar, two simple chest pockets, and no logos or visible text. The same open overshirt, T-shirt, denim trousers and sneakers remain identical in all three drawings. He carries no bag, phone or other objects.

LEFT FIGURE: Left-facing side profile. The same man takes a small natural step toward the left in a true 90-degree side view. His nose, shoulders, chest, hips and shoes all face left. Only one side of his face and one ear are visible. His arms rest comfortably by his sides with a gentle walking swing, and the open overshirt hangs naturally without changing its shape.

CENTER FIGURE: Front view. The same man faces directly toward the viewer. His head, shoulders, chest, hips and shoes face forward. He stands with his weight shifted slightly onto one leg. His left hand rests loosely in a front jeans pocket while his right arm hangs naturally. His mouth forms a mild everyday expression, not a dramatic smile.

RIGHT FIGURE: Back view. The same man takes a small relaxed step away from the viewer, with his head, shoulders, back and hips facing directly away. Only the back of his short wavy hair, open overshirt, straight-leg jeans and casual sneakers is visible. Both arms hang naturally with a subtle walking swing.

All three figures are the same man with identical height, build, hair, facial proportions, clothing, colors and shoes. Three comfortable everyday poses, clearly viewed from the left side, directly from the front, and directly from behind. Three complete full-body figures, evenly spaced, isolated on a plain white background. Neutral overcast diffuse light, flat colors, restrained cel shading, no hard shadows, no dramatic lighting or ground shadows.
```

## Negative Prompt

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyebrows, eyelashes, eyelid lines, detailed eyes, different faces, different hairstyles, different body proportions, different clothing, different colors, different shoes, closed overshirt, missing overshirt, missing red T-shirt, suit, school uniform, work uniform, mechanic coverall, hoodie, cargo trousers, long coat, tie, cap, badge, logo, text on clothes, bag, backpack, smartphone, carried tools, repeated front views, two frontal figures, front view on left, side view in center, back view in center, front view on right, side view on right, three-quarter view, twisted shoulders, turned head, looking back, jumping, running, exaggerated gestures, extra people, fourth figure, cropped head, cropped feet, furniture, street scene, background scenery, hard shadows, rim light, spotlight, ground shadow, watermark
```

## 参数和边界

Anima Base · ER SDE · 35 Steps · CFG 4.5 · 1536 × 1024 · `@akipekostyle, <lora:akipekoanima_v1_1:1.0>` · Seed -1（WebUI 随机）。[Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima) 允许自然语言和标签混合，并建议 Base 30–50 steps、CFG 4–5；这不构成多视图绝对可靠保证。

**按已通过 SG01、SG02 源图的实际空间排列**：左纯朝左90°侧面、中纯正面、右纯背面。模型输出后仍以实际可见方向验收；不能把正面重复、3/4侧面或换衣算通过。无眼睛，白底，无烘焙阴影。**C006 只有提示词，获用户批准实际原图后才能登记母图。**

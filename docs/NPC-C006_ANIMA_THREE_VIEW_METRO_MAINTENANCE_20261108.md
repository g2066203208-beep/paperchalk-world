> **已作废（2026-11-08）**：用户明确要求先做所有城市地点通用的普通路人，维修工是场景限定职业，暂不开发。本文件仅保留旧草稿记录，**不要按此出图，不属于 NPC-C006 当前设计**。请改用 [NPC-C006 普通休闲男性完整三视图提示词](NPC-C006_ANIMA_THREE_VIEW_EVERYDAY_CASUAL_MAN_20261108.md)。

# NPC-C006｜地铁夜班维修工大叔：Anima 三视图 G1 提示词

**状态：仅完整正向/负向提示词，未生成 PNG、未通过美术验收、未实际进入游戏。** SG03 眼镜妹按用户最新要求暂停，不用失败提示词继续修改。本角色使用**一个新编号**，不覆盖任何既有 NPC。

## 基于已完成三视图的复核

- [SG01 已认可三视图正向和负向](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)、[SG02 用户已接受新图的三视图提示词](NPC_SG02_ANIMA_DYNAMIC_THREE_VIEW_CHEERFUL_WALK_20261108.md)提供基本结构：质量/LoRA 标签→同一个人的身体外貌→同一套衣服→LEFT/CENTER/RIGHT 各自明确方向和少量自然动作→相同人物与白底、漫射光收尾。
- 用户真正通过的三视图源图为**左纯侧面、中正面、右纯背面**，因此本次按此成图顺序输出。避免此前 SG03 眼镜/书包变形等复杂装备，一位维修工穿一件连体工作服，身上无道具。
- 现有市民 C001 西装上班族、C004 连帽卫衣青年、M003 看报老人等已经存在。C006 采用**矮壮宽肩、微凸肚子、粗短灰黑发、暗青绿色连体工作服**，轮廓和职业身份均不重复。
- 发型、拉链、衣领、胸袋、裤腿和鞋子三格相同；无眼睛。三格可有自然不同动作，但**绝不扭转视角**。
- 此处 LoRA 为 `@akipekostyle, <lora:akipekoanima_v1_1:1.0>`；不改变既有 NPC 已批准素材中使用的参数。

## Positive Prompt（完整复制）

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, middle-aged man, station maintenance worker, stocky build, short salt-and-pepper hair, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly three full-body drawings of the same Japanese middle-aged maintenance worker in a single horizontal row. He is a man in his late forties with a short stocky body, broad shoulders, a slightly rounded belly, thick forearms, a square jaw, short coarse black hair with gray at the temples, no visible eyes, a small nose and a small tired mouth. His proportions, hairstyle and face are identical in all three drawings.

He wears a muted dark teal-green long-sleeved mechanic's coverall with a small pointed collar, a closed front zipper, two square chest pockets and two large hip pockets, a faded gray undershirt visible only at the neck, and worn matte black work shoes. The same one-piece coverall, pocket placement, collar, sleeves, loose trouser legs, undershirt and shoes appear in all three drawings. No cap, badge, backpack or tools.

LEFT FIGURE: Left-facing side profile. The same man is viewed directly from the left in a true 90-degree side profile. His nose, shoulders, chest, hips and both shoes face left. Only one side of his face and one ear are visible. He takes a small unhurried step, with his left hand lightly adjusting the cuff of his right sleeve near his waist.

CENTER FIGURE: Front view. The same man faces directly toward the viewer. His head, shoulders, chest, hips and shoes face forward. He stands with his weight resting naturally on one leg. His right hand loosely rests in the right hip pocket of the coverall while his left arm hangs at his side. His small mouth has a slightly weary, relaxed expression.

RIGHT FIGURE: Back view. The same man faces directly away from the viewer. Only the back of his short gray-black hair, shoulders, coverall and shoes is visible. He takes a small relaxed step away, with one arm swinging gently and the other resting near his side.

All three figures are the same man with identical height, body proportions, hairstyle, clothing colors, pocket layout and shoes. Three distinct but subtle everyday poses, with clear left side, front and back viewing directions. Three complete full-body figures, evenly spaced, isolated on a plain white background. Neutral diffuse overcast lighting, even flat colors, minimal structural shading, no dramatic light or cast shadows.
```

## Negative Prompt（完整复制）

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyelashes, eyelids, eyebrows, detailed eyes, different faces, different hairstyles, different body proportions, different clothing, different pocket placement, different coverall colors, unzipped coverall, bare chest, short sleeves, suit jacket, necktie, school uniform, hoodie, apron, hat, safety helmet, glasses, badge, text, tools, backpack, two frontal figures, repeated front views, front view on left, side view in center, back view in center, front view on right, side view on right, three-quarter view, turned head, twisted torso, exaggerated walking, running, jumping, arms raised, extra figures, fourth figure, cropped head, cropped feet, background scenery, furniture, dramatic lighting, rim light, hard shadows, ground shadow, watermark
```

## 生成设置与验收

Anima Base · ER SDE · 35 Steps · CFG 4.5 · 1536×1024 · LoRA 1.0 · Seed -1（随机）。官方模型卡：https://huggingface.co/circlestone-labs/Anima 。此处的三格方位提示词是项目已实践写法，**不是**模型对多视图保证控制的语法。

重点验收：左纯朝左 90° 侧面、中直接正面、右完整背面；发型、连体服颜色与四个口袋布局一致；无眼睛、无背景家具、无额外工具和配件；全部人物完整不裁脚。若出图未达标则不入正式人物集。

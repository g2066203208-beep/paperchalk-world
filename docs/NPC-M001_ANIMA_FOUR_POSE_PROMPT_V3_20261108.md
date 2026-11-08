# NPC-M001｜Anima Base 严格四格重画提示词 V3（2026-11-08）

> **状态：待 Anima 生成与用户验收，不是已批准图片；旧三视图不能回流游戏。** 这是「下一 NPC」的优先修复对象，延续原已认可的年轻男性身份、服装，不引入新角色。

## 目标与四格顺序
1. **第一格**：纯正面、双脚着地、双臂自然下垂的**静止站姿**。
2. **第二格**：**严格朝画面左侧的 90° 纯侧面**、静止站姿。
3. **第三格**：**纯背面**、静止站姿。
4. **第四格**：**纯正面坐着打瞌睡**，保留全身和鞋，但不画任何座椅、车厢或扶手。

四格同一个人、同一套衣服、同一个发型和轮廓。前 3 格是角色朝向参考，**不是走路动作帧**。第四格是生活行为特殊姿态，不能用新衣服、新人物或任何车厢背景代替。

## 模型与首轮设置
- Forge Neo → **Anima Base**（不是 Turbo）；txt2img，画布 **1536×1024 横向**；**ER SDE / 35 steps / CFG 4.5**。这是项目基于官方范围的起始测试组合，不宣称为官方唯一最优。
- 画风 trigger：`@akipekostyle`；仓库沿用的 LoRA alias：`<lora:akipekoanima_v1_1:0.65>`。若本机卡片自动插入的名称不同，以**真实卡片 alias** 为准，并记录实际名称与版本。
- 首轮不开其他画风/美化/旋转/Character Sheet LoRA，不同时开启多种角色参考法。对于已认可的旧男 NPC 身份原图，后续跨姿态修复可单独测试 ImageStitch Integrated + `<lora:anima_ref_adapter_pilot_r32:1>`，但**仅在 Forge Neo 参考扩展实际开启、源图确认为本人的情况下使用**，不能把 pilot 标签当普通美术 LoRA。
- 纯白预览、透明背景字样或棋盘格预览**都不能证明 PNG 有真实 Alpha**。正式游戏入库必须输出透明 RGBA、检查背景 Alpha、边缘干净，并保留未经修改的原图。
- 必须保留原始 seed、PNG Info、model/LoRA 文件名、CFG、采样器、尺寸、重绘/参考设置和失败理由。

## 完整正向提示词（整段复制，禁止分段拼接）

```text
masterpiece, best quality, score_7, safe, 1man, adult male, original character, @akipekostyle, <lora:akipekoanima_v1_1:0.65>, four-view character turnaround sheet, four full-body depictions of exactly the SAME ordinary young adult subway commuter in one single horizontal row, flat muted colors, clean anime lineart, restrained cel shading, simple natural cloth folds, non-heroic everyday appearance, clear isolated silhouettes, transparent background, no visible environment.

DESIGN IDENTITY LOCK FOR ALL FOUR PANELS: one ordinary man in his late twenties with short straight black hair and a short neat fringe, a modest slightly tired face with understated tiny dark eyes, small nose and closed mouth, average height and average slender build, natural shoulder width, no beard and no glasses. He wears exactly the SAME dark navy blue casual jacket worn open, with a simple collar and discreet dark front fasteners, the SAME plain off-white crew-neck T-shirt fully visible beneath the open jacket, the SAME straight charcoal gray trousers with an ordinary waistband, and the SAME gray-and-white low-top sneakers with white soles. Identical hair shape, facial proportions, body proportions, jacket hem length, sleeve length, shirt neckline, trouser cut, shoe shape and exact garment colors in ALL FOUR drawings. The four drawings show four poses of ONE character, not four different people.

PANEL 1, FAR LEFT — STRICT FRONT STATIC STANDING: the head, face, chest, shoulders, waist, pelvis, knees, toes and both shoes face directly toward the viewer, with perfectly square frontal alignment and no three-quarter rotation. Both arms hang naturally at the sides with empty hands. Weight is balanced on both planted feet; no stride and no stepping. A quiet neutral everyday expression.

PANEL 2, SECOND FROM LEFT — STRICT 90-DEGREE LEFT SIDE STATIC STANDING: an exact orthographic left-facing profile of the same man; the nose, chest, hips, knees and both toes point strictly LEFT, not toward the viewer, not at a three-quarter angle. Only one side of the face is visible. Arms hang naturally beside the torso, legs together with both feet planted; no stride, no stepping, no walking motion. The jacket remains open with the same off-white T-shirt visible from the side.

PANEL 3, THIRD FROM LEFT — STRICT BACK STATIC STANDING: the same man facing exactly away from the viewer, entire back of head, shoulders, jacket, trousers and heels shown, no part of the face visible, no head turn and no three-quarter angle. Both arms lowered, both feet planted, absolutely no gait. Preserve the exact jacket color and length, the hair outline, charcoal trousers and gray-and-white shoes from the other panels.

PANEL 4, FAR RIGHT — STRICT FRONT SPECIAL ACTION ONLY: the same exhausted man sitting upright in a natural front-facing seated pose after a long workday, silently dozing; his head bows slightly forward, eyes are closed, shoulders soften, both hands rest separately on his thighs, knees bend forward, both feet remain visible and face directly toward the viewer. Face, chest, pelvis, knees and shoes remain FRONTAL, without side or three-quarter rotation. Show the seated BODY POSE ONLY, with absolutely NO chair, bench, subway seat, furniture or surrounding objects. His navy jacket remains OPEN and fully present; the off-white T-shirt, charcoal trousers and gray-white sneakers are exactly the SAME as panels 1–3.

COMPOSITION: exactly four separated full-body figures, one horizontal row in the specified left-to-right order, equal underlying anatomical scale and matching head size; the fourth figure is shorter on the canvas solely because he is seated. Ample clear margin above all heads and below every shoe, hands and footwear completely visible, no panels cropped and no overlapping figures. These are reusable 2.5D NPC game sprites, not an illustration of a train, not a dramatic poster and not four new outfits. Only the fourth figure performs a special action. No scenery, no train, no platform, no walls, no floor, no furniture, no props, no captions, no borders, no drop shadows, no painted checkerboard.
```

## 完整负向提示词（Base CFG 4.5 使用）

```text
worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, chromatic aberration, different characters, four different men, 4boys, face drift, hairstyle change, clothing change, costume variants, mismatched jacket, missing jacket, closed jacket, missing off-white undershirt, wrong color T-shirt, changed pants, different sneakers, beard, glasses, exaggerated anime eyes, exaggerated heroic proportions, chibi, giant head, 3d render, photorealism, excessive highlights, multiple rows, split composition, extra figures, extra limbs, missing limbs, extra fingers, fused hands, first view three-quarter, second view front, second view three-quarter, second view right-facing, third view side, visible face in back view, fourth view side, fourth view three-quarter, walking, running, stepping, stride, dynamic action in first three figures, chair, seat, bench, subway interior, train window, rail, station, phone, backpack, bag, furniture, scenery, gradients, ground plane, floor, cast shadow, background illustration, checkerboard pattern, text, numbering, watermark, logo, cropped head, cropped hands, cropped shoes, out of frame, overlapping bodies.
```

## 四格验收门槛
- 方向：正面必须 0°；侧面严格 90° 朝左，脸/胸/脚同向；背面严格 180°；第四格恢复 0° 正面。任一格 3/4 视角不合格。
- 身份：四格同一张脸/头型、头身比例、发际线、衣服剪裁、颜色、鞋型；衣服缺失或第四格换装即否决。
- 姿态：前三格完全静止不迈步；第四格只能是坐着小睡，手在腿上、两只鞋完整，无座椅。
- 画面：四格一排，全身、头发、手、鞋都完整，不要人物与人物相互重叠；不得画车厢、站台、地板、阴影、文字。
- 输出：真实透明 RGBA 图集和四张独立 PNG；统一身体像素参考、脚底锚点与比例。未有用户明确批准，不得设置 `artApproved=true`、`production=true`，不得进入运行时。
- 2.5D 游戏内：单相机一致的投影/地面脚底接触/远近缩放与灯光匹配，不能漂浮、不能巨大抢镜，不得以 CSS 百分比强贴。

## 依据
- [Anima 官方模型卡](https://huggingface.co/circlestone-labs/Anima)：tags + 英文自然语言、推荐前缀、Base 范围、ER SDE 的描述。
- [Forge Neo 参考适配器 README](https://github.com/eduardoabreu81/anima-reference-forge-neo)：pilot 标签 + ImageStitch Integrated，禁用并行自带 Anima Edit reference。
- [上一位 M003 真正入库的四格标准](../site/data/npc/metro-commuter-npc-m003.v2.json) 和 [人物集](../site/data/npc/README.md)。

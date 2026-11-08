# NPC-C006｜干净亲切的48岁发福大叔｜Anima 通用城市路人三视图 V3

> **2026-11-08 用户明确纠正：** 可以画略微发福的中年大叔，问题在于上一图的人脸难看、阴影脏和气质让人不舒服；不要因为上一稿失败就换成与现有 NPC 年龄重复的24岁年轻男性。**C006 固定设计为48岁左右、普通体型稍发福、干净亲切、自然耐看、能在任意城市生活场景出现的中年市民**。既有 C006 维修工稿、发福但显老脏影稿和24岁青年稿均标记为历史废弃候选；任何旧图都未经正式批准。
>
> 来源以 [NPC 多视图范本](NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)、[SG01 已通过出图](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)、[SG02 已获用户视觉认可的三视图提示词](NPC_SG02_ANIMA_DYNAMIC_THREE_VIEW_CHEERFUL_WALK_20261108.md)为基础。使用简洁 Anima 标签 + 7段英文：开头/人物/服饰/左侧面/中正面/右背面/一致性；不添加冗长自造指令。官方模型卡：https://huggingface.co/circlestone-labs/Anima 。

## 设计锁定
- **年龄：** 约48岁、中年阶段；与现有20来岁青年及老爷爷拉开年龄层
- **体型：** 中等身高、肩略宽、微凸自然肚子、身体稳重健康，不追求瘦弱美少年或夸张肥胖
- **脸型：** 圆润的方圆脸，干净短发略带灰丝，微笑嘴角、小鼻子；全无可见眼睛，脸部结构必须保留，不准画黑色三角鼻影、脏块脸影
- **衣服：** 静蓝灰敞开休闲夹克、暖米白T恤、深炭灰舒适直筒裤、干净棕灰低帮鞋，**非职业服**，任何城市环境可用
- **动作：** 左纯90°侧面慢走；中正面左手裤袋、温和微笑；右纯背面悠闲离开；不同但小幅自然
- **光影：** 均匀阴天漫射、少量简洁赛璐璐结构色块、无脸部大块黑影、无地面投影

## Positive Prompt
```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, middle-aged man, friendly ordinary civilian, slightly chubby build, neat short brown hair, simple anime style, clean lineart, flat colors, simple cel shading, muted colors, white background.

A character turnaround sheet showing exactly three full-body drawings of the same Japanese middle-aged man in a single horizontal row. He is about 48 years old, average height, with a comfortably sturdy build, slightly broad relaxed shoulders, a natural modest belly, strong legs, a gently rounded square face and a pleasant mature appearance. He has neat short dark brown hair with a few soft gray strands near the temples, a natural side part, a small nose and a small friendly relaxed mouth. No visible eyes, no eyelid lines or eyelashes. His face is softly shaped with clean, subtle contours and gentle coloring, without harsh dark face shadows. He looks like an approachable ordinary man going about his day. His hairstyle, facial shape and body proportions are identical in all three drawings.

He wears a clean muted slate-blue casual jacket with a simple short collar, worn OPEN with both sleeves down, a plain warm ivory crew-neck cotton T-shirt underneath, dark charcoal-gray straight-leg casual trousers with a comfortable fit around the waist, and clean brown-gray low-top casual shoes. The jacket has two simple side pockets, with no logos or text. The outfit fits his natural build comfortably without looking tight or oversized. The same jacket, shirt, trousers and shoes appear in all three drawings. No bag, phone, glasses, hat, uniform or other objects.

LEFT FIGURE: Left-facing side profile. The same man takes a small unhurried step to the left in a true 90-degree side view. His nose, shoulders, chest, hips and both shoes face directly left. Only one side of his face and one ear are visible. His arms swing gently in a comfortable everyday walking motion, and the jacket hangs naturally around his modest belly.

CENTER FIGURE: Front view. The same man faces directly toward the viewer. His head, shoulders, chest, hips and shoes all face forward. He stands comfortably with his weight slightly resting on one leg, his left hand loosely in a front trouser pocket and his right arm relaxed at his side. His small mouth has a mild warm smile, and his face retains its natural shape and soft subtle shading without drawn eyes.

RIGHT FIGURE: Back view. The same man takes a small relaxed step away from the viewer. His head, shoulders, back and hips face directly away. Only the back of his neatly cut hair, slate-blue jacket, charcoal trousers and brown-gray shoes is visible. His arms hang naturally with a slight walking swing.

All three figures show the same middle-aged man, with identical body shape, natural belly size, hairstyle, jacket, shirt, trousers, shoe design and colors. Three comfortable, understated everyday poses, clearly viewed from the pure left side, the front and the back. Three complete full-body drawings evenly spaced on a plain white background. Neutral overcast diffuse illumination, clean flat color blocks, restrained soft cel shading, no harsh face shadows, no blotchy dark shading, no dramatic lighting or ground shadows.
```

## Negative Prompt
```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, pupils, irises, eyelashes, eyelid lines, eyebrows, detailed eyes, distorted face, missing nose, missing mouth, harsh angular face, sunken cheeks, exaggerated wrinkles, severe frown, aggressive expression, greasy hair, unkempt hair, exaggerated obesity, giant belly, caricature proportions, bodybuilder, teenage boy, elderly man, white hair, beard, mustache, dirty clothes, stained fabric, blotchy shadows, dark patches across face, triangular dark nose shadow, strong directional light, mismatched clothing, different hairstyles, different body proportions, closed jacket, missing jacket, suit, school uniform, work uniform, jumpsuit, hoodie, tie, bag, backpack, phone, glasses, hat, logos, text on clothes, repeated front views, two frontal figures, front view on left, side view in center, back view in center, front view on right, side view on right, three-quarter view, twisted shoulders, turned head, looking back, jumping, running, dramatic gestures, extra people, fourth figure, cropped head, cropped feet, furniture, street scenery, background scenery, rim light, spotlight, ground shadow, watermark
```

## 参数及状态
Anima Base · ER SDE · 35 Steps · CFG 4.5 · 1536×1024 · `<lora:akipekoanima_v1_1:1.0>` · Seed -1（随机）。**V3 尚未生成图片，也尚未用户验收；不得作为已批准 NPC 美术资产。**
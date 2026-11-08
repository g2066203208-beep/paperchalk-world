# 学校女生 NPC｜Anima 三视图可填空母模板 V1

**生效：2026-11-08。来自已获用户认可的第一位女生 SG01 三视图的成功全文结构。** 凡新增同校普通女生 NPC，**先从此母模板复制，不得擅自重写固定部分**。允许改动的只有下面列出的方括号占位符。不要把失败的 SG02 侧面单人 inpaint 提示词当成后续默认流程。

## 固定与可变边界

**固定（锁死）：** 质量和风格开头；`@akipekostyle, <lora:akipekoanima_v1_1:1.0>`；**一人三图，同一横排**；`LEFT FIGURE: Front view`、`CENTER FIGURE: Left-facing side profile`、`RIGHT FIGURE: Back view` 及各段身体完整朝向；无眼睛、眉眼线、睫毛、笑眼弧线；同校校服固定形制与两颗**暖深灰棕色哑光**圆纽扣、白衬衫、**酒红色长领带**、炭灰短百褶裙、小腿黑袜、深棕黑乐福鞋；三格形象和个人穿法统一；阴天平涂、纯白无场景。

**只改这些槽位：**

| 占位符 | 应填入的内容 |
| --- | --- |
| `[CHARACTER_TAGS]` | 此角色特有的简短 Anima 标签，例如 hair color/body build/tanned skin，不得含 eyes |
| `[BODY_PROPORTIONS]` | 一段完整英文身体描述，体现每个 NPC 的高矮、肩宽、体态、腿长，**三面同一个比例** |
| `[SKIN_TONE]` | 肤色，与其他两面完全一致 |
| `[HAIR_DETAILS]` | 颜色、发长、刘海、发束与扎发方式、发尾；三视一致 |
| `[PERSONALITY_AND_MOUTH]` | 只用嘴和肢体体现心情，不写眼睛、眼妆、眉毛 |
| `[UNIFORM_WEARING]` | **只改穿法**：西装扣好或敞开、长领带结是否松、袜子是否略堆等；不准改学校校服设计、纽扣颜色/数量、裙子类型、鞋子 |
| `[PERSONAL_PROP]` | 道具约束的完整英文句子；没道具填 `She carries no extra props.`，有道具须写清左右手和三格一致 |
| `[FRONT_ACTION]` | **纯正面**的特有自然动作：脚步、手势、轻微重心变化 |
| `[SIDE_ACTION]` | **纯朝左侧面**的特有自然动作：脚步、手势；不可让胸口或肩膀回转 |
| `[BACK_ACTION]` | **纯背面**的特有自然动作；不可回头露脸 |
| `[CUSTOM_NEGATIVE]` | 仅针对人物可能画错的事项补 2–8 个负面词；不写与个人穿法或道具相冲突的否定词 |

注意：槽位填完后，**删除所有未填方括号**，交付完整正向/负向文本；不要让用户在 Anima 里自己拼接。尤其是上一张人物穿西装敞开、手持物品时，负向不可以写 `open blazer`、`smartphone` 等与正向互相抵消的词。侧面**不强求看见两颗正面纽扣**，这是正确 90° 视角的合理遮挡。

## Positive Prompt（母模板；方括号是唯一允许编辑的地方）

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1.0>, character reference sheet, character turnaround, multiple views, full body, teenage schoolgirl, [CHARACTER_TAGS], simple anime style, clean lineart, flat colors, muted colors, soft diffuse overcast lighting, white background.

A single character turnaround sheet with exactly three full-body drawings of the same Japanese high school girl in one horizontal row. She is [BODY_PROPORTIONS]. Her skin is [SKIN_TONE]. Her hair is [HAIR_DETAILS]. Her personality is expressed through [PERSONALITY_AND_MOUTH]. She has a small natural nose, no visible eyes, no eyelid lines, no eyelashes, no eyebrows and no closed-eye curves. The eye area is completely blank in all three drawings.

She wears the same SCHOOL UNIFORM DESIGN as the female protagonist: a fitted very dark midnight-navy single-breasted school blazer with notched lapels, exactly TWO LARGE MATTE DARK WARM GRAY-BROWN ROUND BUTTONS with nearly black rims fixed vertically on the front, a white collared shirt, a narrow burgundy LONG NECKTIE, a short charcoal-gray pleated skirt reaching mid-thigh, black mid-calf socks leaving the knees exposed, and dark brown-black penny loafers. Her specific personal way of wearing this same uniform is [UNIFORM_WEARING]. [PERSONAL_PROP]. The blazer construction, two buttons, shirt, long necktie, skirt, socks, shoes and personal wearing style remain identical across all three drawings.

LEFT FIGURE: Front view. The girl is seen directly from the front. Her head, shoulders, chest and hips face straight forward. [FRONT_ACTION]. The same hairstyle, school uniform and personal items are clearly recognizable, with the eye area left blank.

CENTER FIGURE: Left-facing side profile. The same girl is seen directly from the left-facing 90-degree side. Her nose, shoulders, chest, hips and shoes all face left. Only one side of her face and one ear are visible. Her torso is directly side-on, with the far shoulder hidden behind the near shoulder. [SIDE_ACTION]. Her appearance, uniform wearing style and personal items remain consistent with the front view. No eyes or eyelid lines are drawn.

RIGHT FIGURE: Back view. The same girl is seen directly from behind. Her head, shoulders, back and hips face away from the viewer. No part of her face is visible. [BACK_ACTION]. The rear silhouette of the same hairstyle, blazer, skirt, socks, shoes and personal items remains consistent with the other drawings.

Three natural moments of the same person's everyday behavior, with small, comfortable differences in arms, legs and body weight. No exaggerated poses or twisting that changes the required viewing angles. Identical face shape, skin tone, hair, outfit, proportions and props across all three directions. Three complete full-body figures evenly spaced on a clean plain white background. Neutral overcast ambient light, flat colors, minimal soft structural shading, no dramatic lighting or cast shadows.
```

## Negative Prompt（通用母模板）

```text
worst quality, low quality, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, chromatic aberration, visible eyes, eyes, pupils, irises, eyelashes, eyebrows, eyelid lines, closed-eye curves, smiling eye arcs, eye highlights, detailed eyes, inconsistent character, different faces, different body proportions, different skin tones, different hairstyles, different hair lengths, different uniform wearing styles, different props across views, duplicated props, missing school blazer, missing white collared shirt, missing burgundy long necktie, ribbon bow, bow tie, wrong school uniform, gold buttons, brass buttons, shiny metallic buttons, one front button, three front buttons, wrong skirt, long skirt, trousers, thigh-high socks, black tights, sneakers, high heels, repeated front views, front view in center, back view in center, front view on right, side view on right, three-quarter view, angled torso, twisted shoulders, looking backward, exaggerated gestures, jumping, sprinting, running, huge walking strides, stiff mannequin pose, extra people, fourth figure, cropped head, cropped feet, hard shadows, rim light, spotlight, dramatic lighting, glossy highlights, scenery, furniture, text, watermark, [CUSTOM_NEGATIVE]
```

## 模型设置

Anima Base · ER SDE · 35 steps · CFG 4.5 · 1536 × 1024 · `<lora:akipekoanima_v1_1:1.0>`。

模型官方来源：https://huggingface.co/circlestone-labs/Anima 。其官方支持 Danbooru 标签与自然语言混写，推荐 Base 30–50 steps、CFG 4–5 与中性的 er_sde；**并不保证按文字可靠输出所有视角和服装细节**。

## 人物实例关系

- **SG01**：已批准的高马尾玩手机女生 PNG 属于**成功实例**，文件保留在 `site/assets/characters/civilians/schoolgirls/sg01/three-view-original.png`，其实际图序左侧面／中正面／右背面；[SG01 历史成功提示词](NPC_SG01_ANIMA_DYNAMIC_THREE_VIEW_PHONE_WALK_20261108.md)不动。
- **SG02**：黑皮金发辣妹，只有她的外貌、松散校服穿法、前侧背动作填进这些槽位；近期侧视角尚需实际出图验收。不得因为用户要求模板而将她冒称为已批准。
- **SG03**：后续新女生直接以本模板填槽，避免前三人不断引入互相矛盾的自由文本。

**变更规则：** 若以后确认一个更好的三视图共同结构，先版本化更新本模板，经用户实际出图确认再作为新默认。不要未经审核在单个 NPC 的提示词里偷偷改模板。
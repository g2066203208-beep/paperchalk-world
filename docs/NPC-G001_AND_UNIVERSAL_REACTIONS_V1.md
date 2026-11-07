# NPC-G001｜三名女同学固定群演＋通用事件反应 V1（2026-11-07）
> **状态：设计草案；最近生成图已被用户否定，没有获批的角色母版，也没有产出分层图或接入游戏。** 
> 本档案与 `site/data/npc/reaction-actors.v1.json` 同步；普通群演不占用原有 CHAR-001～等重要角色编号。

## 0. 现在的问题与纠正
本轮生成图三人五官、脸长宽、眼睛和比例近似，发色过近，均显得像主要女角色，群演的日常感和性格对比不足。**不是把眼睛删掉**：三人必须有可读的小眼睛、眉毛和嘴部，能够体现笑、惊讶、怀疑、恐惧、犹豫。不要三张精修主角脸，也不要无脸人偶。

## 1. 三个老演员：同一身份反复换服装/动作
| 编码 | 身高/体重（候选） | 外貌骨相和五官 | 发型/剪影 | 性格与表演 |
|---|---|---|---|---|
| NPC-G001-A 左 | 155cm/52kg；矮、软圆、腿略短 | **短宽圆脸**、较宽的面颊、钝圆下巴、**小圆杏眼、眼尾向下**、短眉、笑容大而自然 | **暖棕下巴齐短波波头**，微翘发尾、参差短刘海；耳侧轮廓分明 | 活泼起哄；最先笑/冲上前/追问/恶作剧；嘴快但关心同伴 |
| NPC-G001-B 中 | 161cm/49kg；正常身高，细直窄肩 | **窄长椭圆脸**、稍长中庭、柔长小鼻、**小下垂杏眼**、不对称轻挑眉、讲话嘴形丰富 | **浅灰棕锁骨长的微卷层次发**，明显偏分、轻薄斜刘海；**不是主角黑长直** | 好奇爱讲、消息多；容易兴奋和夸大，受到质疑会停下来核查 |
| NPC-G001-C 右 | 168cm/55kg；明显最高、肩宽稍大、腿长 | **棱角较明显的长方椭圆脸**、宽下颌、鼻梁更挺、**细长半垂眼、眼尾略扬**、直眉、单边嘴角 | **深炭黑低位粗辫**，露耳与部分额头，与A/B刘海绝不相同 | 冷幽默、爱吐槽、审慎，遇见真正危险会迅速保护朋友 |

三人的高度和头、肩、腿比例必须在小缩略图里仍明显不同；发色/眼型/嘴巴**不是简单换头发颜色**。衣服一样反而衬托出真实同班同学。不要强行给NPC增加巨大的瞳孔高光、发夹、装饰、明星妆、过度精美的脸。

## 2. 真实校服硬规范
比照现有正式女主角原画和角色画风锁（`site/assets/characters/protagonist-front.webp`；`docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md`）：相同剪裁的非常深海军蓝翻领西装、正面**两颗哑光黑色/深藏蓝扣**（非金属）、白衬衫、**每个人都系暗酒红领带**、炭灰百褶裙、适当袜长差异、深棕黑色乐福鞋。允许外套扣上/松开、袜长略异，但不能变成不同制服、丢领带或金扣制服。光照中性不烘焙场景投影。

## 3. NPC的通用三层结构（不按事件制作一百张图）
- **身份**：身高、面相、发型、固定人设，后续不变；原画通过用户审定后才锁定。
- **基础姿态**：站、坐、走、看手机、听音乐、打盹、两人/三人聊天。场景规定是否可用，例如地铁有站姿和坐姿。
- **反应动作**：同一个事件可以触发笑、害怕、尴尬、疑惑、撤离等，强度和人物性格决定各人的不同表现；**同组不同时抬手、同时张嘴、同时摇头**。事件可以是信息、身边的物理事件、关系互动、紧急事故。
见机器文件 `actionCatalog` 22个通用动作、`eventKinds` 10类事件、`trioReactionExamples` 8组不同反应。后续不同NPC只增/改人物配置与性格权重，复用动作词典和事件判定。

## 4. 通用反应演出规则
1. 事件信息包括 `kind`、严重度(0–3)、可见程度、消息可信度、与NPC关系、已知情况、现场是否安全、场景与时间。
2. **先危险，再求助，再新消息，再闲聊。** 譬如“地铁突然熄灯”：先缩肩/回头/停止对话，接着判断是否逃跑，不应继续兴奋讲八卦。
3. **可信度与知识决定表情**：没证实的传闻引出好奇或怀疑；亲眼见到的危险引出本能反应；官方疏散引出警惕和撤离。
4. **性格修饰而不是代替事实**：A更冲动、B更好奇、C更谨慎；遇到严重危险时所有人都认真，但反应有先后。
5. **短暂表情后回归合理的基础活动**，不让普通路人永远张着嘴；同一素材可由后续轻量L2D/序列帧重复使用。
6. 群组镜头下三人可以合成一张透明整组图。为了提高素材复用性，真正演出需求出现时再画“聊天、爆笑、受惊、避让、搀扶”等少量整组关键姿态，不要求每个语义动作都做独立全套精细立绘。

## 5. NPC-G001优先制作的8组图
| 优先 | 整组动作 | 内容 | 用途 |
|---|---|---|---|
| 1 | `chat_casual` | A凑近插话、B比划讲故事、C侧目吐槽，三人都不对镜头摆pose | 学校/地铁 |
| 2 | `laugh_group` | A笑弯腰、B捂嘴、C憋笑破功 | 日常打趣 |
| 3 | `whisper` | 凑近低声讨论、三个目光方向不同 | 传闻/秘密 |
| 4 | `surprise` | A后仰、B睁眼暂停、C眉眼微变看异动 | 突发事件 |
| 5 | `tease` | A使坏、B不满抗议、C看戏 | 同学关系 |
| 6 | `worry` | A收起笑容、B核对手机、C低声劝告 | 坏消息 |
| 7 | `startle` | A缩肩抓同伴、B僵住、C警觉回头 | 灯灭/巨响 |
| 8 | `help` | 安慰/搀扶/互相照看 | 跌倒/受伤/惊吓后 |
其余行为先用这8组近似状态复用，不用马上画22张。

## 6. 下次生成的严格差异验收
- 矮圆、普通窄瘦、高肩长腿 **3种体型**；圆短、窄长、方长 **3种脸**；圆杏下垂、细小下垂、窄长半垂 **3种眼**；短波波、偏分锁骨卷、低粗辫 **3种发型**。
- 鼻子/嘴/眉部几何与表情不同；眼睛必须可见但小、有限高光、**不抢主角**；三人不排一排面向镜头。
- 校服前襟、扣色、领带、褶裙逐人核对；脚底完整；白底可转透明，不画落地阴影。
- 所有先前失败图均不能充作已经批准的固定母版。下一次候选通过用户审核再填写锁定身份、生成种子和资产路径。

## 7. Anima下一轮候选完整提示词
**Positive（Anima Base / 目标2048×1536，优先保持完整全身；本地LoRA真实alias需核验）：**

```text
masterpiece, best quality, score_7, safe, @akipekostyle, <lora:akipekoanima_v1_1:1>, exactly 3girls, solo group of three ordinary 17-year-old Japanese high school classmates, reusable background NPC trio, distinct faces and bodies, natural lively candid conversation, head to toe, full bodies, natural teenage anatomy, front three-quarter full-body ensemble at eye-level, three girls turned toward each other, left girl is clearly shorter and fuller with round shoulders, chubby soft cheeks and a short wide circular face, tiny round almond-shaped warm brown eyes with downward corners, short expressive eyebrows, chin-length warm chestnut bob with slightly outward messy tips and short broken bangs fully above her eyes, lively mischievous open-mouthed grin, leaning forward while pointing playfully at the middle girl; middle girl is average height and distinctly thin with narrow shoulders and a long narrow oval face, tiny sleepy drooping almond eyes, subtly uneven eyebrows and thin speaking lips, muted light ash-brown collarbone-length soft wavy layered hair with a strong off-center part and light side fringe fully exposing her eyes, eyes widened slightly with curiosity while animatedly explaining something with one palm raised; right girl is visibly tallest and longer-legged with slightly broader shoulders, angular rectangular-oval face, broader jaw, a stronger nose bridge, narrow horizontal half-lidded eyes and flat eyebrows, deep charcoal black hair gathered into one thick low braid behind one exposed ear, an amused skeptical crooked half-smile, leaning back slightly with one eyebrow raised and loosely folded arms, glancing sideways at her friends; all three have small plainly drawn eyes, visible irises and eyebrows, limited eye highlights, readable everyday emotions, not glamorous beautiful heroines, their face shapes and eye shapes must be unmistakably different even at small size, same-school uniform on all three: dark navy two-button notched blazers with exactly two matte near-black non-metallic front buttons each, white collared shirts, properly tied dark burgundy neckties visible on every girl, charcoal gray pleated school skirts, school socks, dark brown-black loafers, clean line art, modest cel shading, muted natural colors, gentle ordinary expressions, balanced non-model proportions, distinct silhouettes, normal standing posture with slight asymmetrical gestures, all fingers and shoes visible, feet on one level, isolated one group, plain white background, no scenery, no cast shadow
```

**Negative（Anima Base CFG>1）:**

```text
worst quality, low quality, blurry, identical faces, cloned faces, same anime girl three times, same eye shape, same body shape, same height, same hairstyle, uniform long dark straight hair, protagonist face, glamorous heroine, idol group, makeup, fashion models, beauty contest, large glossy sparkling eyes, exaggerated eyelashes, fancy hairpins, silver hairclips, eyes hidden behind bangs, no eyes, faceless, featureless face, tiny mouth-only face, generic AI anime doll face, three girls lined up posing for camera, synchronized poses, still standing at attention, extreme perspective, top-down view, squatting, kneeling, sitting, gold buttons, gold trim, metallic buttons, missing necktie, different school uniforms, mismatched skirt colors, cropped feet, merged limbs, fused arms, extra fingers, extra people, character reference sheet, collage, scene background, shadows, watermark, text
```

**提醒：** 单靠文字对三人的长相/身高约束不一定稳定，重复失败时先分别确定三位获批母图，再在兼容的参考图/区域提示机制中保持身份；不能声称这段Prompt已复现成功。

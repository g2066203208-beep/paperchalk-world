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

## 3. V2：事件内容优先，情绪不是事件分类（2026-11-07）
**这是当前有效逻辑，取代旧版把『惊讶/开心/害怕』作为输入分类的做法。**
同一件事不同人在场会有细节差异，但是**第一步必须识别消息与事件的内容**，再区分远处听说与现场正在发生，最后才选对应动作。

1. **输入**：有人传播什么消息，或现场到底发生了什么（不输入『开心』这样的结论）。
2. **分类**：搞笑新闻、荒诞消息、夸张奇闻、帅气明星、恋爱八卦、考试、事故、失踪、犯罪、怪谈、突发险情等，详见独立 26 类机器表。
3. **上下文**：是手机刷到的新闻、听说的传言、朋友亲口说的，还是眼前真实发生？有没有危险？与自己或朋友的关系？是否证实？
4. **对应表演**：为整个三人组挑一套最恰当的群体反应母动作，再让A/B/C各自在这套语义里完成**不同的举止和表情**。笑、惊讶等情绪属于**演出结果**，不是独立的事件类别。
5. **后续行为**：继续聊、拿手机核实、安慰、帮忙、躲避、离开。处于危险现场时应停止八卦并优先安全行动。

### 真实内容分类（26 类，统一跨 NPC）

| 大类 | 具体内容类型 | 三人整组主动作 |
|---|---|---|
| 日常 | 普通闲聊、搞笑视频、朋友恶作剧 | 闲聊／爆笑／抗议打闹 |
| 奇闻 | 离谱荒诞新闻、夸张劲爆消息 | 难以置信／惊讶反问 |
| 娱乐 | 帅气明星、偶像丑闻 | 欣赏围聊／认真核实 |
| 社交 | 恋爱八卦、个人喜事、个人坏消息 | 凑近讨论／庆祝／担忧 |
| 校园 | 好成绩、考试压力 | 庆祝／商量对策 |
| 事故医疗 | **车祸新闻**、**现场车祸**、现场有人昏倒 | 新闻担忧／现场警觉互助／安全求助 |
| 公共安全 | 灾害预警、犯罪消息、现场吵架、失踪寻人、现实威胁 | 撤离／担忧／受惊／协助避险 |
| 社会 | 不公事件、离世或重大损失 | 不满讨论／低声安慰 |
| 城市 | 地铁故障、官方通知 | 查看公告／确认下一步 |
| 怪谈 | 未证实灵异传闻、亲眼目击异象 | 低声质疑／警觉不安 |

### 对照：同一条内容，传播形式不同，动作完全不同
- **『地铁车祸新闻』**：A停下笑闹，问有没有人受伤；B核对报道时间地点；C提醒别扩散未经证实的图片。选择 `concern`。
- **『她们眼前发生车祸』**：A本能后退远离车流；B尝试呼叫救援；C提醒其他人退到安全处。选择 `protect`，后续 `help`；绝不继续围观起哄。
- **『看见搞笑短视频』**：A笑弯腰；B边笑边解释；C强忍笑破功。选择 `laugh`。
- **『离谱报道』**：A目瞪口呆；B复述细节；C指出逻辑疑点。选择 `disbelief`。
- **『夸张纪录』**：A夸张比划；B激动说明；C想核实来源。选择 `surprised`。
- **『帅气明星新闻』**：A兴奋拉朋友一起看；B滔滔不绝介绍；C评论或调侃朋友审美。选择 `admire`。
- **『朋友失踪』**：A开始紧张；B询问最后时间地点；C建议核实官方寻人信息。选择 `concern`。
- **『车厢出现不存在的站台』**：A紧挨朋友；B停下讲话确认见闻；C观察出口。选择 `uneasy`。

### 不是26张图：通用的16种群体表演母动作
`chat`、`laugh`、`gossip`、`surprised`、`disbelief`、`admire`、`celebrate`、`embarrassed`、`concern`、`check`、`anger`、`startle`、`protect`、`retreat`、`sad_support`、`uneasy`。

这些是**可复用动作主题**，不意味着必须立刻画16张。先画基础闲聊、爆笑、惊讶、离谱不信、明星欣赏、坏消息担忧、现场受惊、互助退避等最常用8组；后面根据场景需求增补。

**权威机器分类表**：[site/data/npc/event-content-taxonomy.v2.json](../site/data/npc/event-content-taxonomy.v2.json)；**三位群演固定身份与基本动作库**：[site/data/npc/reaction-actors.v1.json](../site/data/npc/reaction-actors.v1.json)。新 NPC 使用同一份分类表，不给每个角色单独发明一套『事件类型』。

## 4. 事件裁决优先级
- 内容优先，现场实时风险高于新闻闲聊；再看关系、可信度、严重程度、地理环境、当时活动，最后才是性格演出差异。
- 新闻可信度低时允许好奇、质疑、搜索，不默认确认为真；有严重伤亡时不搞笑不围观。
- A/B/C 不可以同时捂嘴、同时抬手、同时笑：她们可以在同一 `groupPose` 内不同方式表达，形成有真实生活节奏的组合。
- 其他职业角色（上班族、老人、警察、学生、店员）共用分类表，换的是角色的职责、现场行动许可与表演细节。警察看到现场事故应优先履职，非专业路人避免危险施救动作。
- **目前只有事件内容表与三人资料；没有插入地铁运行时，没有已经生成的透明图，也没有运行过游戏场景反应验收。**

## 5. 基于事件内容的首批8组立绘制作队列
| 顺序 | 群演图题 | 代表触发内容 | 三人动作对照 |
|---|---|---|---|
| 1 | 日常聊天 `chat` | 天气/作业/普通趣闻 | A插话、B讲、C听 |
| 2 | 搞笑 `laugh` | 网络搞笑视频 | A笑弯腰、B边笑解释、C憋笑 |
| 3 | 离谱 `disbelief` | 荒唐新闻 | A瞪眼、B反问、C质疑 |
| 4 | 夸张 `surprised` | 惊人纪录 | A惊叫、B说明、C查证 |
| 5 | 明星 `admire` | 帅气明星剧照 | A兴奋、B介绍、C打趣 |
| 6 | 坏消息 `concern` | 车祸报道/寻人公告 | A担心、B求证、C认真 |
| 7 | 现场受惊 `startle` | 巨响、争吵、突发停电 | A缩肩、B停话、C迅速观察 |
| 8 | 互助退避 `protect` | 现场事故/倒地伤者 | A后退、B求助、C提醒避险 |

### 产出定义
一套完整的三人角色外观身份（仍待正式美术批准）+若干整组三人动作立绘，每一套群演图的三个人都必须保持相同身份。后续还可以换衣服去咖啡厅、商场、街道，但内容事件反应无需重写。出图以前禁止把生成候选当成生产资源。

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

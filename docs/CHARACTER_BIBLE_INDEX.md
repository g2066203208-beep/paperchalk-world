# 《错位日常》角色总档案｜Character Bible Index

> **原则：一个故事人物 = 一个永久 ID = 一份资料母版 = 若干正背面/动作变体。** 角色资料、场景图片和动作工程严格分开。不得再生成一个独立的“主角立绘”场景。

## 角色总表（截至 2026-11-02）

| 编码 | 唯一 ID | 角色身份 | 外貌母版 | 人设完成度 | 档案 |
|---|---|---|---|---|---|
| **CHAR-001** | `protagonist` | 可操控女主角（姓名待定） | 正面与背面均已有用户批准的作品基准 | **外观与核心性格「毒舌、冷淡」已锁定；年龄、身高、体重与其他人设仍待确认** | [完整版](characters/CHAR-001_PROTAGONIST_PROFILE.md) · [448字段](characters/CHAR-001.profile.json) · [原档](PROTAGONIST_CANON.md) |
| **CHAR-002 正面已入库** | `pony-tail-girl-candidate`（暂未注册正式游戏角色） | 女二：栗棕单马尾、活泼、略矮 | **[已认可正面PNG](../site/assets/characters/char-002/front.png)**，三人图中间原像素裁剪303×1024；背面、PSD、L2D待制作 | 448项候选档案，正面视觉已定 | [女二详细档案](characters/CHAR-002_CANDIDATE.md) · [448字段](characters/CHAR-002.profile.json) |
| **CHAR-003 正面已入库** | `male-lead-candidate`（暂未注册正式游戏角色） | 男主：18岁、凌乱黑中长发、灰眼、叛逆厌学 | **[已选正面PNG](../site/assets/characters/char-003/front.png)**，三人图中间原像素裁剪297×1024；背面、PSD、L2D待制作 | 448/448字段，服装体型数值仍为暂定 | [完整档案](characters/CHAR-003_MALE_LEAD_PROFILE.md) · [448字段](characters/CHAR-003.profile.json) |
| **CHAR-016 候选** | `male-second-transfer-candidate`（不在游戏注册表） | 男二／插班生；有特点的非网红脸 | 原创脸型、173cm/64kg候选；正负Anima提示词已整理，暂无正式原画 | **448项字段结构建档（232项提案、216项待确认）** | [人物资料与正负提示词](characters/CHAR-016_MALE_SECOND_PROFILE.md) · [448字段机器档案](characters/CHAR-016.profile.json) |
| CHAR-004～015、CHAR-017起 | 尚未分配正式身份 | 其余规划人物 | 尚无已验收原画 | 待设计 | [448字段通用模板](characters/CHARACTER_PROFILE_TEMPLATE.md) |

**重要：** “教室主角”“卧室主角”“正面主角”“背面主角”“L2D 主角”都不是新身份，只能引用 `protagonist`。旧临时恐怖敌人没有独立的正式人物身份，也不得因为历史素材名称而复活。

## 可执行数据与绘画资源

- [机器角色注册表](../site/data/characters/registry.json)：稳定 ID、已批准视觉锚点、待确认个人资料、暂定身材数据和正式核心性格、资源链接。
- [角色正面 WebP](../site/assets/characters/protagonist-front.webp)；[角色背面 WebP](../site/assets/characters/protagonist-back.webp)。
- [DEV 角色素材目录](../site/characters.catalog.json)：供编辑器使用的立绘索引；此目录只管素材链接，不创造新身份。
- [原画处理与一致性约定](CHARACTER_PIPELINE.md)。
- [人物身份验证脚本](../scripts/validate_character_identity.py)。

## 三档信息状态

1. **【锁定】** 用户明确确认的核心性格「毒舌、冷淡」，及经现有正式母图确认的、绘画必须保持一致的身份特征；修改需要用户另行授权。
2. **【暂定】** 当前制作所需的备选数值与个性设定，例如 17 岁、162 cm、49 kg、7 头身及未确认的心理细节等；不能说成用户原话或既有剧情事实。
3. **【待定】** 完全没有依据的名字、家人、班级、背景秘密、私人偏好等；不编造，不将家中物件当作家庭关系证据。

## 统一新增人物流程

1. **先确认确实是一个新故事角色**：工作职能、与主角的关系、剧情出现时点至少有基础设想。
2. 在机器角色注册表添加一个不重复的新 ID 和编码，再按[模板](characters/CHARACTER_PROFILE_TEMPLATE.md)创建单独档案。
3. 与 CHAR-001 对比五官结构、发长、配饰位置、服装剪影和气质，避免“女主换皮”。
4. 保存正面、背面源图；只有确实存在的图片才能放进素材目录，不生成空占位图骗过加载器。
5. 记录发色、肤色、身材比例、声音和动画约束，标明每项是用户锁定还是建议。
6. 提交前执行 `python3 scripts/validate_character_identity.py`；通过后再加入游戏。新角色资产不会自动变成一个单独的场景。
7. 每次改动更新版本、审批状态和变更记录，角色既有原画不经许可不覆盖。

## 新人物与记录完整性

**CHAR-002 女二已保存用户认可的正面原像素裁剪，CHAR-003 男主已保存用户指定的正面原像素裁剪，用于后续拆分。** 两人背面、真实PSD/L2D尚未制作，不作为游戏正式已加载演员；后续新角色从 CHAR-004 起以不重复的编码建立；同一角色的正面、背面、换装、表情和 L2D 不是不同身份。

## 当前48名人类角色扩容规划（优先18位主要人物）

**[48人设计计划：28位学生、20位其他身份](HUMAN_CAST_PLAN_V2.md)** · **[48人机器花名册](HUMAN_CAST_ROSTER_V2.json)**。其中3位核心学生、9位重要学生、6位重要非学生组成首批18位主要人物；16名普通学生和14名其他普通NPC共30人，在剧情需要时分阶段设计。**不是48份已获批准的原画，更不是48名已加载NPC。** 旧版15名人类属于历史计划，怪物另行独立规划，暂不定稿。

## 旧版怪物与章节规模提案（仅作为历史资料）

[旧版15人+15怪规划](CAST_AND_ENEMY_ROADMAP_V1.md)中的15名人类已经由最新48名人类计划取代；其中的15个怪物代号仍仅是待原创性审查的占位预算。角色编号CHAR-001～CHAR-048各自唯一，正背与L2D变体不另算。

**原创性硬规范：** [《错位日常》人物和怪物原创性守则](ORIGINALITY_AND_HORROR_IDENTITY.md)。所有未通过原创性审查的怪物名字、外形及机制仅是工作占位，不进入正式设计。禁止复制他人角色造型或以换皮凑数量。

## 绘画关键参数与统一检查

- **[角色通用制作模板](characters/CHARACTER_PROFILE_TEMPLATE.md)**：22 个类别、448 项个人和美术参数；涵盖三围、大小腿围、手臂围度、眉眼鼻唇位置、脸部归一化坐标、神态、头身朝向、绘画风格以及 L2D 骨骼。
- **[机器字段规范](characters/CHARACTER_FIELD_SCHEMA_V2.json)**：统一类型、状态及必备参数。无依据的值保持 `unknown`，不能跳过字段或伪造准确值。
- **[女主 448 字段档案](characters/CHAR-001.profile.json)**与**[女二 448 字段档案](characters/CHAR-002.profile.json)**：已确认和暂定信息分开记录。女二正面原图已入库、背面尚未；**[男主 448 项逐条设计档案](characters/CHAR-003_MALE_LEAD_PROFILE.md)**与**[男主机器档案](characters/CHAR-003.profile.json)**同样仅是候选，原图未验收。
- **版本冲突**：最新用户提供的女主母版提示词是 18 岁、灰紫眼；旧机器角色库仍有 17 岁、灰褐眼的提案。已在完整档案明确记录冲突，待比对原图或再次确认，不静默更改既有正式原画。

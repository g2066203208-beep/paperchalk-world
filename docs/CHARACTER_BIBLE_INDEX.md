# 《错位日常》角色总档案｜Character Bible Index

> **原则：一个故事人物 = 一个永久 ID = 一份资料母版 = 若干正背面/动作变体。** 角色资料、场景图片和动作工程严格分开。不得再生成一个独立的“主角立绘”场景。

## 角色总表（截至 2026-11-02）

| 编码 | 唯一 ID | 角色身份 | 外貌母版 | 人设完成度 | 档案 |
|---|---|---|---|---|---|
| **CHAR-001** | `protagonist` | 可操控女主角（姓名待定） | 正面与背面均已有用户批准的作品基准 | **外观与核心性格「毒舌、冷淡」已锁定；年龄、身高、体重与其他人设仍待确认** | [完整版](characters/CHAR-001_PROTAGONIST_PROFILE.md) · [448字段](characters/CHAR-001.profile.json) · [原档](PROTAGONIST_CANON.md) |
| **CHAR-002 正面已入库** | `pony-tail-girl-candidate`（暂未注册正式游戏角色） | 女二：栗棕单马尾、活泼、略矮 | **[已认可正面PNG](../site/assets/characters/char-002/front.png)**，三人图中间原像素裁剪303×1024；背面、PSD、L2D待制作 | 448项候选档案，正面视觉已定 | [女二详细档案](characters/CHAR-002_CANDIDATE.md) · [448字段](characters/CHAR-002.profile.json) |
| **CHAR-003 正面已入库** | `male-lead-candidate`（暂未注册正式游戏角色） | 男主：18岁、凌乱黑中长发、灰眼、叛逆厌学 | **[已选正面PNG](../site/assets/characters/char-003/front.png)**，三人图中间原像素裁剪297×1024；背面、PSD、L2D待制作 | 448/448字段，服装体型数值仍为暂定 | [完整档案](characters/CHAR-003_MALE_LEAD_PROFILE.md) · [448字段](characters/CHAR-003.profile.json) |
| **CHAR-016 正面已入库** | `male-second-transfer-candidate`（暂未注册为可玩演员） | 男二／插班生；自然茶棕眼与深暖黑发 | **[已验收全身正面PNG](../site/assets/characters/char-016/front.png)**，315×1024；[1024×1024原图及脸部特写](../site/assets/characters/char-016/reference-sheet.png)；背面PSD、L2D待制作 | 448项人物档案；**具体脸型眼色和双手姿势以原图优先**，身高173cm/体重64kg等数值仍暂定 | [人物设定、差异校验及提示词](characters/CHAR-016_MALE_SECOND_PROFILE.md) · [448字段机器档案](characters/CHAR-016.profile.json) |
| **CHAR-004 视觉参考已入库** | 暂未注册正式游戏ID | 女三：可爱假小子、爽朗行动派 | **[第三版选中原图（全身＋脸部特写）](../site/assets/characters/char-004/reference-sheet.png)**，1024×1024；面相、发型、表情及服装参考已确认；不是透明单人图 | **视觉参考通过；演出站姿、单人透明素材、背面、PSD、L2D待制作** | [女三设计与素材档案](characters/CHAR-004_FEMALE_THIRD_PROFILE.md) |
| **CHAR-020 男三设计档案** | `male-third-youthful-candidate`（尚未游戏注册） | 男三：可爱小正太系男高中生，浅茶棕短发和灰绿眼为候选 | **没有已验收原画**，人物信息、模型参数未获审批 | **22类448项候选已建立** | [机器档案](characters/CHAR-020.profile.json) · [448项逐条可读](characters/CHAR-020_MALE_THIRD_PROFILE.md) |
| **CHAR-005 女四人设** | `female-fourth-capable-tsundere-heiress-candidate`（未正式注册） | **全能能干的傲娇大小姐**；旧纪律委员设定已否决 | **无已验收原画**，具体造型仍为提案 | 22类448字段候选；双手空着、同校制服 | [448字段](characters/CHAR-005.profile.json) · [逐项可读档案](characters/CHAR-005_FEMALE_FOURTH_PROFILE.md) |
| **CHAR-008 教师候选** | `class-teacher-geography-candidate`（未正式注册游戏） | 成年女教师兼班主任，科目暂拟地理，28岁、温和幽默、独立生活（均为方案） | 无用户已验收正背面原画、PSD、L2D | **448项人设已建立** | [逐条档案](characters/CHAR-008_FEMALE_TEACHER_PROFILE.md) · [机器448字段](characters/CHAR-008.profile.json) |
| CHAR-006～007、CHAR-009～015、CHAR-017～019、CHAR-021起 | 尚未分配正式身份 | 其余规划人物 | 尚无已验收原画 | 待设计 | [448字段通用模板](characters/CHARACTER_PROFILE_TEMPLATE.md) |

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

**CHAR-002 女二已保存用户认可的正面原像素裁剪，CHAR-003 男主已保存用户指定的正面原像素裁剪，用于后续拆分。** 两人背面、真实PSD/L2D尚未制作，不作为游戏正式已加载演员；后续新角色使用未占用的唯一CHAR编码；CHAR-004已分配给女三，不得重复建立新身份；同一角色的正面、背面、换装、表情和 L2D 不是不同身份。

## 当前人物制作结构 V3（优先，取代28学生旧案）

**[最新48人规划：8位学生、12位重要非学生、28位城市NPC](HUMAN_CAST_PLAN_V3.md)** · [新版机器花名册V3](HUMAN_CAST_ROSTER_V3.json)。学校暂只设一所主角学校。女主CHAR-001、女二002、男主003和男二016继续优先；其余学生最多4位，成年人及城市关系将成为重要角色。**这仍是制作规划，不等于48张原画或48名已上线NPC。**

## 学生分校、年级与班级规划（已废弃的旧案）

**下列原三校年级规划已停止执行：** [三校28人历史记录](SCHOOL_AND_STUDENT_STRUCTURE_V1.md)。目前已开始设计4位（CHAR-001、002、003、016），另外8位重要学生列明；3所学校名和具体班级尚未经过用户最终批准。

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

## CHAR-004 2026-11-02 图像选择确认

用户从三套候选中明确选定第三套作为女三视觉参考。已保存**完整未裁切 PNG** `site/assets/characters/char-004/reference-sheet.png`；左侧全身和右侧头像在同一张画布上存在重叠，不得声称它是一张透明、可直接导入游戏的单人立绘。已有认可的面相、发色、短发轮廓与校服风格不得擅自改换；双手提外套的展示姿势尚须变为自然站立的常驻演出姿势。角色未加入 `site/data/characters/registry.json` 或 `site/characters.catalog.json`，不表示L2D已完成。详见[女三档案](characters/CHAR-004_FEMALE_THIRD_PROFILE.md)。

## CHAR-020 男三角色档案（2026-11-02）

男三“小正太”作为用户指定方向已进入设计。候选人设包含16岁、158cm、46kg、约6.4头身、浅茶棕短层次发、灰绿杏圆眼、柔和少年骨相、同校校服、自然GalGame站姿和广播声音线索故事功能，**均未获得最终美术验收**。[448字段设计](characters/CHAR-020.profile.json)与[448项可读版本](characters/CHAR-020_MALE_THIRD_PROFILE.md)已保存。CHAR-020原田径女生仅为未批准的规划占位，其历史资料在V3花名册`reallocationHistory`中保留。游戏角色注册表目前仍没有男三，正反图、PSD和L2D未制作。

## CHAR-005 女四更新（2026-11-03）

核心定位由用户指定为**全能能干的傲娇大小姐**；原“纪律委员”概念明确弃用，不能复活成常规校园干部。必须会实际处理学习、运动、料理、家务、采购预算、团队分工和突发问题，能力来自真实训练。戏剧弱点是完美主义和难以求助，而非无能。校服保持同校色系、默认单人正面全身双手空置，具体发色、面相及穿法要经过用户批准原画。见[完整档案](characters/CHAR-005_FEMALE_FOURTH_PROFILE.md)。

## CHAR-008 女教师（2026-11-03）

本次人物设计将CHAR-008原有的班主任规划占位发展为成年女教师的**448字段完整设计候选**，包含外貌和尺寸、衣服款式、职业技能、真实独立生活、家庭关系、情绪、剧情与技术制作规范。**28岁、地理教师、唐予安、深烟紫棕低马尾、雾青灰眼、职业装均为候选**。除用户要求“制作老师角色并把448字段保存到GitHub”外，其余细节尚需批准。当前无批准人物母图与L2D，不能将此文字当作完成制作。[查看完整档案](characters/CHAR-008_FEMALE_TEACHER_PROFILE.md)。

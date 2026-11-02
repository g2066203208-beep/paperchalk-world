# CHAR-003｜男主角完整人物圣经 V1.0（448项逐条记录）

> **设计候选：非用户已批准人设、非已导入游戏人物。** 2026-11-02。记录总数 **22 大类、448 个字段**。本文件为真人工可读镜像；[机器档案](CHAR-003.profile.json)是对应全部字段的结构化版本。
> **来源优先级**：你给出的男主正/负 Anima 提示词中已有的特征标记为【用户原始设定】；新拓展出来的名字、身体尺码、家世、剧情、脸部坐标、L2D 参数为【创作提案】。均是可审定的原创人物设计，不冒充已画出角色。

## 立即用于画画的角色摘要

| 项目 | 方案 |
|---|---|
| 角色 | 男主角 CHAR-003，拟名**许渡**，18 岁，高中男生（名字为候选） |
| 核心气质 | 厌学、反叛、懒散、不耐烦，眼神锐利而疲惫（来自原始提示词） |
| 身高 / 体重 | **176cm / 62kg**（提案） |
| 胸围 / 腰围 / 臀围 | **90 / 72 / 88 cm**（提案，均为围度） |
| 上臂 / 前臂 / 手腕 | **27 / 24 / 16 cm**（提案） |
| 大腿 / 小腿 / 膝盖 / 脚踝 | **49 / 34 / 35 / 21 cm**（提案） |
| 头脸 | 黑中长凌乱发、深灰眼、偏窄长的骨感脸、细长锐利眼、略挑眉、平直嘴角 |
| 穿着 | 同校深海军蓝男版制服、深色哑光两颗前襟纽扣，敞开穿、白衬衫露下摆、松红领带、深炭灰裤、黑皮鞋 |
| 标志站姿 | 正面眼平，一手插左裤兜，另一手下垂，微驼背、肩低、右腿承重 |
| 游戏状态 | **仅设计案**，没有获批准的立绘、背面、L2D、真实音频或运行中NPC |

## 数值制版的解释
身体数值只用于拟定绘画尺度和服装结构，全部以厘米为单位；肩宽、胸腰臀围、腿臂围与正面像素宽度不能混为一谈。脸部坐标是**计划的归一化造型草案**（不是对原图的测量）：正面头骨框 x=0 左边、x=1 右边，y=0 头顶、y=1 下巴。将来一旦生成并验收立绘，须根据真实母图复核，不能为了迎合预设坐标而让人物变脸。

## 每个角色的资料完整性规则
448项均有值与出处，并标明【用户原始设定】或【待确认提案】。关于还不存在的图像、文件、音轨、运行动画，字段明确记录的是**目标或尚不存在的状态**，并非声称已实现。与女主女二相同校服体系的纽扣数量颜色不得擅自变动，也不能拿已验收的女主图覆盖这个男生。

## 身份、出生和基本社会信息（17 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 001 | `identity.recordCode` | CHAR-003 | 待确认提案 |
| 002 | `identity.canonicalId` | male-lead-candidate | 待确认提案 |
| 003 | `identity.displayName` | 男主角（企划名：许渡，待批准） | 待确认提案 |
| 004 | `identity.legalName` | 许渡 | 待确认提案 |
| 005 | `identity.nicknames` | ["阿渡","许同学","逃课王（同学戏称）"] | 待确认提案 |
| 006 | `identity.aliases` | ["男主","男主角","male lead","school delinquent"] | 待确认提案 |
| 007 | `identity.pronouns` | 他／he | 待确认提案 |
| 008 | `identity.genderPresentation` | 男性 | 用户原始设定 |
| 009 | `identity.ageYears` | 18 | 用户原始设定 |
| 010 | `identity.birthDate` | 2008-10-07（候选；可随故事年份调整） | 待确认提案 |
| 011 | `identity.birthplace` | 灰港市旧城区（候选地名） | 待确认提案 |
| 012 | `identity.currentResidence` | 灰港市北侧旧住宅楼单元（候选） | 待确认提案 |
| 013 | `identity.era` | 当代架空、学校与住宅的日常恐怖世界 | 待确认提案 |
| 014 | `identity.occupation` | 高中生；非职业不良团体成员 | 用户原始设定 |
| 015 | `identity.schoolYear` | 高三三班（候选） | 待确认提案 |
| 016 | `identity.storyRole` | 男性核心视角角色／夜间异常的间接目击者，与女主形成不同观察方式 | 待确认提案 |
| 017 | `identity.designStatus` | 仅人物设计案；正反面未绘制/未获审批，不是已加载游戏角色 | 待确认提案 |

## 家庭背景与成长经历（10 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 018 | `family.parents` | 母亲常上晚班，父亲长期在外地工作；均为仅提案中的幕后人物，不自动生成NPC | 待确认提案 |
| 019 | `family.guardians` | 法定监护暂定为母亲；紧急联络人亦为母亲 | 待确认提案 |
| 020 | `family.siblings` | 无亲兄弟姐妹；避免新增未注册角色 | 待确认提案 |
| 021 | `family.relatives` | 有位住在城区外的舅舅，只有背景提及，不一定登场 | 待确认提案 |
| 022 | `family.familyStructure` | 小家庭；日常多独处，关系并不破裂，只是交流稀疏 | 待确认提案 |
| 023 | `family.childhoodEvents` | 曾在断电的楼道里独自摸索数层楼梯，形成对声音和出口位置的警觉 | 待确认提案 |
| 024 | `family.upbringing` | 自由度高、约束少；做错事更常自己承担后果 | 待确认提案 |
| 025 | `family.householdMembers` | 日常单独居住或母亲不定时回家；场景默认不摆放可变动的人用物品 | 待确认提案 |
| 026 | `family.livingSituation` | 普通旧式住宅，个人生活空间简陋但有基本秩序 | 待确认提案 |
| 027 | `family.socioeconomicBackground` | 普通工薪家庭，经济并不宽裕但基本稳定 | 待确认提案 |

## 教育、学校与职业意向（11 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 028 | `education.school` | 灰港市立第二高中（世界观暂命名，与其他角色学校名称须统一审批） | 待确认提案 |
| 029 | `education.className` | 高三三班，后排靠窗座位（仅剧情提案） | 待确认提案 |
| 030 | `education.club` | 无正式社团；多次拒绝入社邀请 | 待确认提案 |
| 031 | `education.grades` | 整体中下，数学和物理偶尔有好成绩，但常缺交作业 | 待确认提案 |
| 032 | `education.subjectStrengths` | ["空间推理","物理直觉","听声辨位"] | 待确认提案 |
| 033 | `education.subjectWeaknesses` | ["需要大量背诵的考试","长篇课堂笔记","形式化作文"] | 待确认提案 |
| 034 | `education.workplace` | 无固定雇佣关系；偶尔帮街区小店搬东西，不构成工作NPC | 待确认提案 |
| 035 | `education.jobTitle` | 学生（课外无头衔） | 待确认提案 |
| 036 | `education.salaryRange` | 无固定收入；偶尔临时劳务费 | 待确认提案 |
| 037 | `education.experience` | 曾帮修过旧收音机和电器线缆，有简单工具经验 | 待确认提案 |
| 038 | `education.professionalGoals` | 口头说无所谓；实际喜欢与音响、电路、修理有关的技术工作 | 待确认提案 |

## 体型、三围、肩臂腿粗细与详细尺寸（40 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 039 | `measurements.heightCm` | 176 | 待确认提案 |
| 040 | `measurements.weightKg` | 62 | 待确认提案 |
| 041 | `measurements.headBodyRatio` | 7.25 | 待确认提案 |
| 042 | `measurements.shoulderWidthCm` | 42 | 待确认提案 |
| 043 | `measurements.chestCircumferenceCm` | 90 | 待确认提案 |
| 044 | `measurements.waistCircumferenceCm` | 72 | 待确认提案 |
| 045 | `measurements.hipCircumferenceCm` | 88 | 待确认提案 |
| 046 | `measurements.torsoLengthCm` | 52 | 待确认提案 |
| 047 | `measurements.armSpanCm` | 178 | 待确认提案 |
| 048 | `measurements.inseamCm` | 82 | 待确认提案 |
| 049 | `measurements.shoeSize` | CN 42／脚长约26cm，皮鞋版型略长 | 待确认提案 |
| 050 | `measurements.bodyBuild` | 高挑、薄肌肉、骨架偏窄但肩宽明显大于腰宽 | 待确认提案 |
| 051 | `measurements.bodyMassDescription` | 低至中等肌肉量；不是健身房练出的夸张胸肌和肱二头肌 | 待确认提案 |
| 052 | `measurements.posture` | 头微向前，下巴略收，双肩松、轻微驼背；一手插兜 | 待确认提案 |
| 053 | `measurements.handDominance` | 右手惯用；插兜默认左手可按角色母版固定 | 待确认提案 |
| 054 | `measurements.gait` | 步幅偏长，速度不急，重心略低，脚跟先着地 | 待确认提案 |
| 055 | `measurements.upperArmCircumferenceCm` | 27 | 待确认提案 |
| 056 | `measurements.forearmCircumferenceCm` | 24 | 待确认提案 |
| 057 | `measurements.wristCircumferenceCm` | 16 | 待确认提案 |
| 058 | `measurements.thighCircumferenceCm` | 49 | 待确认提案 |
| 059 | `measurements.calfCircumferenceCm` | 34 | 待确认提案 |
| 060 | `measurements.kneeCircumferenceCm` | 35 | 待确认提案 |
| 061 | `measurements.ankleCircumferenceCm` | 21 | 待确认提案 |
| 062 | `measurements.upperArmLengthCm` | 31 | 待确认提案 |
| 063 | `measurements.forearmLengthCm` | 27 | 待确认提案 |
| 064 | `measurements.handLengthCm` | 19 | 待确认提案 |
| 065 | `measurements.palmWidthCm` | 8.6 | 待确认提案 |
| 066 | `measurements.upperLegLengthCm` | 45 | 待确认提案 |
| 067 | `measurements.lowerLegLengthCm` | 43 | 待确认提案 |
| 068 | `measurements.kneeHeightCm` | 50 | 待确认提案 |
| 069 | `measurements.hipBreadthCm` | 32 | 待确认提案 |
| 070 | `measurements.shoulderBreadthCm` | 42 | 待确认提案 |
| 071 | `measurements.waistHeightCm` | 106 | 待确认提案 |
| 072 | `measurements.ribcageDepthCm` | 21 | 待确认提案 |
| 073 | `measurements.hipDepthCm` | 20 | 待确认提案 |
| 074 | `measurements.headWidthCm` | 15.2 | 待确认提案 |
| 075 | `measurements.faceLengthCm` | 21.5 | 待确认提案 |
| 076 | `measurements.faceWidthCm` | 14.6 | 待确认提案 |
| 077 | `measurements.footLengthCm` | 26 | 待确认提案 |
| 078 | `measurements.footWidthCm` | 9.8 | 待确认提案 |

## 骨相、皮肤、姿态和四肢轮廓（37 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 079 | `anatomy.headShape` | 偏长的倒卵形头骨，颞部不过分鼓起 | 待确认提案 |
| 080 | `anatomy.shoulderSlope` | 肩峰清楚但肩线下沉约7°，体现散漫而非畏缩 | 待确认提案 |
| 081 | `anatomy.torsoDepth` | 胸背厚度中等偏薄；侧面肋弓体积可辨 | 待确认提案 |
| 082 | `anatomy.ribcageContour` | 上胸相对平直，胸廓向腰收束，不夸张胸肌 | 待确认提案 |
| 083 | `anatomy.waistContour` | 腰部直线感强，轻收但不沙漏形 | 待确认提案 |
| 084 | `anatomy.pelvisAndHips` | 男性偏窄骨盆，髋骨自然承重，不画夸张臀部 | 待确认提案 |
| 085 | `anatomy.backContour` | 微微驼背，肩胛骨不凸出，背部外套自然折痕 | 待确认提案 |
| 086 | `anatomy.bustThroughClothing` | 男学生平坦胸部轮廓，衬衫在胸骨前有少量自然空气层 | 待确认提案 |
| 087 | `anatomy.limbProportions` | 手臂长，指尖约落大腿中部；双腿较长，小腿与大腿长度接近 | 待确认提案 |
| 088 | `anatomy.handShape` | 细长手掌，指节略突出，指甲干净但不修饰 | 待确认提案 |
| 089 | `anatomy.skinUndertone` | 偏冷的浅肤色，红润很弱 | 待确认提案 |
| 090 | `anatomy.skinTexture` | 干净的动画式皮肤，面颊细纹和淡阴影即可 | 待确认提案 |
| 091 | `anatomy.scars` | 右手无名指近节有约0.5cm旧浅疤（剧情可删，平时不显眼） | 待确认提案 |
| 092 | `anatomy.birthmarks` | 左肩后侧浅褐色小胎记，默认制服遮盖 | 待确认提案 |
| 093 | `anatomy.moles` | 右颌角靠近耳下有一粒极淡小痣；不同于女主左眼下泪痣 | 待确认提案 |
| 094 | `anatomy.freckles` | 脸上无雀斑；不画随机散点 | 待确认提案 |
| 095 | `anatomy.postureAsymmetry` | 插兜侧肩略低1.5°，重心偏右腿 | 待确认提案 |
| 096 | `anatomy.mobilityNeeds` | 四肢活动正常；暂无行动辅助需求 | 待确认提案 |
| 097 | `anatomy.upperArmShape` | 上臂呈长而偏细的梭形，肘部收窄 | 待确认提案 |
| 098 | `anatomy.forearmShape` | 前臂靠肘处略粗，到腕部渐细 | 待确认提案 |
| 099 | `anatomy.wristShape` | 腕骨存在感略明显，手腕纤而有骨感 | 待确认提案 |
| 100 | `anatomy.thighShape` | 修长、略有股四头肌量感；不画筷子腿 | 待确认提案 |
| 101 | `anatomy.calfShape` | 小腿上半略丰满，跟腱段迅速收束 | 待确认提案 |
| 102 | `anatomy.kneeShape` | 膝盖轮廓清楚但不过分突兀，膝窝合理 | 待确认提案 |
| 103 | `anatomy.ankleShape` | 踝骨轻微突出，鞋袜交接不糊成一团 | 待确认提案 |
| 104 | `anatomy.legAxis` | 双腿自然竖直微分开，无明显内八或O/X腿 | 待确认提案 |
| 105 | `anatomy.upperLimbTaper` | 上臂至前臂顺畅渐细，袖口不应贴成皮筋 | 待确认提案 |
| 106 | `anatomy.lowerLimbTaper` | 膝上下体积自然衔接，裤管能表现腿部体积但不紧身 | 待确认提案 |
| 107 | `anatomy.legMuscleDistribution` | 偏瘦但有长期步行产生的自然小腿线条 | 待确认提案 |
| 108 | `anatomy.armMuscleDistribution` | 无明显大块肌肉；前臂稍紧实，日常搬物的轻度肌肉 | 待确认提案 |
| 109 | `anatomy.pelvisTilt` | 骨盆中性略后倾约2°，配合轻微后仰的站姿 | 待确认提案 |
| 110 | `anatomy.spinalCurve` | 胸椎轻前屈6°、颈项补偿使视线仍朝镜头 | 待确认提案 |
| 111 | `anatomy.handFingerLengthRatios` | 中指1.0，食指0.92，无名指0.96，小指0.72，拇指0.68（归一化长度目标） | 待确认提案 |
| 112 | `anatomy.bodySilhouetteType` | 瘦长倒梯形，宽肩窄腰但非肌肉型 | 待确认提案 |
| 113 | `anatomy.shoulderToHipWidthRatio` | 1.31 | 待确认提案 |
| 114 | `anatomy.waistToHipWidthRatio` | 0.83 | 待确认提案 |
| 115 | `anatomy.headToShoulderWidthRatio` | 0.36 | 待确认提案 |

## 脸型、眉眼鼻唇、五官位置与精确比例（46 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 116 | `face.faceShape` | 偏长的窄椭圆脸，面颊轻微内收、下颌比女主更方 | 待确认提案 |
| 117 | `face.forehead` | 额头中等高度，常被凌乱刘海覆盖约三分之一 | 待确认提案 |
| 118 | `face.cheekbones` | 颧骨略高但不明显外突，侧脸颊有干净折线 | 待确认提案 |
| 119 | `face.jawline` | 两侧下颌骨线条清楚，有轻微男性棱角 | 待确认提案 |
| 120 | `face.chin` | 窄而平的下巴末端，不尖锐也不过宽 | 待确认提案 |
| 121 | `face.noseBridge` | 细直鼻梁，侧面少量棱线与鼻骨明暗 | 待确认提案 |
| 122 | `face.noseTip` | 鼻头小而略有鼻尖，不用圆鼻头萌化 | 待确认提案 |
| 123 | `face.mouthShape` | 偏薄的平直嘴，嘴角自然略压低 | 待确认提案 |
| 124 | `face.lips` | 上唇薄，下唇稍丰满，色彩接近肤色 | 待确认提案 |
| 125 | `face.teeth` | 默认闭口不露牙；微笑时仅露自然少量上齿 | 待确认提案 |
| 126 | `face.ears` | 耳朵窄长，左耳因头发偶尔只露下半部分 | 待确认提案 |
| 127 | `face.eyebrows` | slightly raised | 用户原始设定 |
| 128 | `face.eyelidShape` | 上眼睑半垂，外眼角边缘清晰，下眼睑细线 | 待确认提案 |
| 129 | `face.eyeShape` | narrow, sharp | 用户原始设定 |
| 130 | `face.eyeSpacing` | 眼间距约一只眼宽的0.52，避免过密或偶像式大眼 | 待确认提案 |
| 131 | `face.eyeCornerAngle` | 外眼角相对内眼角上挑约4° | 待确认提案 |
| 132 | `face.eyeColor` | grey | 用户原始设定 |
| 133 | `face.eyeHex` | #777B83 | 待确认提案 |
| 134 | `face.pupilColor` | #252830 | 待确认提案 |
| 135 | `face.eyeHighlights` | 小而稀疏的单点高光，非闪闪发亮多点瞳 | 待确认提案 |
| 136 | `face.eyelashes` | 上睫毛少量加粗，男性细长眼型，不画夸张长睫 | 待确认提案 |
| 137 | `face.defaultExpression` | 无聊、不耐烦、闭嘴、半垂眼，眉微抬 | 待确认提案 |
| 138 | `face.facialLandmarkSystem` | 头骨正面标准化：x=0为头部左边缘、x=1为右边缘；y=0头顶、y=1下巴，正视眼平摄影；造型初稿而非实际图像测量 | 待确认提案 |
| 139 | `face.facialLandmarksNormalized` | {"leftEyeCenter":[0.35,0.47],"rightEyeCenter":[0.65,0.47],"leftBrowCenter":[0.35,0.39],"rightBrowCenter":[0.65,0.39],"noseBridgeStart":[0.5,0.48],"noseTip":[0.5,0.69],"mouthCenter":[0.5,0.8],"leftEarTop":[0.065,0.45],"rightEarTop":[0.935,0.45],"chin":[0.5,1],"leftMouthCorner":[0.4,0.8],"rightMouthCorner":[0.6,0.8]} | 待确认提案 |
| 140 | `face.faceLengthToWidthRatio` | 1.47 | 待确认提案 |
| 141 | `face.foreheadToFaceHeightRatio` | 0.34 | 待确认提案 |
| 142 | `face.jawWidthToFaceWidthRatio` | 0.7 | 待确认提案 |
| 143 | `face.cheekboneWidthToFaceWidthRatio` | 0.91 | 待确认提案 |
| 144 | `face.eyeCenterHeightRatio` | 0.47 | 待确认提案 |
| 145 | `face.interocularSpacingRatio` | 0.09 | 待确认提案 |
| 146 | `face.eyeWidthToFaceWidthRatio` | 0.21 | 待确认提案 |
| 147 | `face.eyebrowEyeGapRatio` | 0.08 | 待确认提案 |
| 148 | `face.noseTopHeightRatio` | 0.48 | 待确认提案 |
| 149 | `face.noseTipHeightRatio` | 0.69 | 待确认提案 |
| 150 | `face.noseWidthToFaceWidthRatio` | 0.18 | 待确认提案 |
| 151 | `face.mouthCenterHeightRatio` | 0.8 | 待确认提案 |
| 152 | `face.mouthWidthToFaceWidthRatio` | 0.2 | 待确认提案 |
| 153 | `face.philtrumLengthRatio` | 0.075 | 待确认提案 |
| 154 | `face.earTopHeightRatio` | 0.45 | 待确认提案 |
| 155 | `face.earBottomHeightRatio` | 0.72 | 待确认提案 |
| 156 | `face.eyeTailSlantDeg` | 4 | 待确认提案 |
| 157 | `face.eyelidOpennessBaseline` | 0.6 | 待确认提案 |
| 158 | `face.lipCornerSlopeDeg` | -2 | 待确认提案 |
| 159 | `face.browAngleDeg` | 3 | 待确认提案 |
| 160 | `face.expressionLandmarkVariants` | 惊讶：上眼睑+0.10、眉心上移0.06；愤怒：眉内侧下移0.05、眼距不变；嘴角变化不改变鼻尖、耳根与脸型 | 待确认提案 |
| 161 | `face.noseToMouthDistanceRatio` | 0.11 | 待确认提案 |

## 发型发色和头部独立剪影（16 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 162 | `hair.hairBaseColor` | black | 用户原始设定 |
| 163 | `hair.hairHex` | #191B20 | 待确认提案 |
| 164 | `hair.hairHighlights` | 深灰蓝色低饱和光泽，集中在发旋与额发表面 | 待确认提案 |
| 165 | `hair.hairLength` | medium-length hair | 用户原始设定 |
| 166 | `hair.hairTexture` | 自然微蓬、稍凌乱，直发中有少量弯折 | 待确认提案 |
| 167 | `hair.hairDensity` | 发量中等偏多，发根蓬松但不可做刺猬头 | 待确认提案 |
| 168 | `hair.parting` | 偏左分缝；从人物右侧（画面左侧）发根向额心散落 | 待确认提案 |
| 169 | `hair.bangs` | long messy bangs | 用户原始设定 |
| 170 | `hair.sidelocks` | 耳前短碎发，人物左侧略长，后面呈不规则轻薄层次 | 待确认提案 |
| 171 | `hair.ponytailCount` | 0 | 待确认提案 |
| 172 | `hair.ponytailPosition` | 无马尾；头发自然散落 | 待确认提案 |
| 173 | `hair.ponytailLength` | 不适用：男主无马尾 | 待确认提案 |
| 174 | `hair.hairAccessories` | 日常不戴发夹、发带或耳饰，避免与女主银发夹混淆 | 待确认提案 |
| 175 | `hair.accessorySide` | 无恒定发饰左右侧 | 待确认提案 |
| 176 | `hair.accessoryPosition` | 无固定头发饰品 | 待确认提案 |
| 177 | `hair.backSilhouette` | 后脑圆而略蓬、颈后短长层次，略向左右散开但不遮校服后领 | 待确认提案 |

## 同校校服结构、纽扣和衣物配件（20 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 178 | `wardrobe.outerwear` | 同校深海军蓝单排扣男式西装校服；前片敞开，两颗哑光深色纽扣固定在门襟上但不扣合 | 待确认提案 |
| 179 | `wardrobe.shirt` | 白色翻领衬衫，衬衣下摆自然露出裤腰约2-4cm；领口松开一粒扣 | 待确认提案 |
| 180 | `wardrobe.blouse` | 不适用：采用男式白衬衫而非女士衬衣 | 待确认提案 |
| 181 | `wardrobe.neckwear` | 暗酒红色细长领带，结松散下垂，领带尖落在裤腰上方 | 待确认提案 |
| 182 | `wardrobe.skirt` | 不适用：标准男生校服使用长裤，避免误生成百褶裙 | 待确认提案 |
| 183 | `wardrobe.trousers` | 深炭灰色中直筒长裤，裤脚有轻微堆叠，不紧身、不破洞 | 待确认提案 |
| 184 | `wardrobe.socks` | 两只深炭灰短袜；被裤管遮住但穿鞋动作保持一致 | 待确认提案 |
| 185 | `wardrobe.footwear` | 黑色简洁低跟皮鞋／制服便鞋，圆头、少量皮革反光 | 待确认提案 |
| 186 | `wardrobe.garmentLayerOrder` | ["身体","白色衬衫","松红领带","深蓝校服外套","深炭灰长裤","深袜","黑鞋"] | 待确认提案 |
| 187 | `wardrobe.paletteHex` | {"blazer":"#202734","blazerShadow":"#151B25","shirt":"#F1F1ED","tie":"#722B39","trousers":"#343941","shoes":"#17191D","buttons":"#20232A"} | 待确认提案 |
| 188 | `wardrobe.fabrics` | 制服外套哑光混纺、衬衫平织棉、裤子哑光斜纹、黑鞋低光泽革面 | 待确认提案 |
| 189 | `wardrobe.sewingDetails` | 深色门襟包边、肩缝清楚、袖口与腋下能分层，领带与领片互不糊成一层 | 待确认提案 |
| 190 | `wardrobe.pleats` | 外套自然下垂折痕、肘部压褶、裤膝与脚踝堆褶；禁止画裙褶 | 待确认提案 |
| 191 | `wardrobe.buttons` | 同校男版两颗哑光深色门襟扣，垂直等距；配套深色袖扣，不得随机改成金扣 | 待确认提案 |
| 192 | `wardrobe.pockets` | 双侧外套口袋可见但不装道具；左手插入左裤兜，口袋开口与手臂遮挡必须合理 | 待确认提案 |
| 193 | `wardrobe.wearCondition` | 有自然穿着折痕但整洁无破洞；非破烂不良装、非街头皮衣 | 待确认提案 |
| 194 | `wardrobe.seasonalVariants` | 冬装可有同色长裤与内层针织衫，春秋默认白衬衫+蓝外套；未生成素材 | 待确认提案 |
| 195 | `wardrobe.occasionVariants` | 正式检查时衣服扣好领带整理；日常默认敞开、松领带；仅作为候选换装 | 待确认提案 |
| 196 | `wardrobe.permanentAccessories` | 无项链、胸章或耳环；人物识别主要靠发型、眼神、制服穿法 | 待确认提案 |
| 197 | `wardrobe.temporaryProps` | 不默认携带书包、课本、烟、武器或手机；仅剧情明确需要时单独提供 | 待确认提案 |

## 人格、行为底色和惯用神态（25 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 198 | `temperament.coreConfirmedTraits` | ["叛逆","厌学","冷淡","不耐烦"] | 用户原始设定 |
| 199 | `temperament.proposedTraits` | ["观察力强","懒散","不喜欢被命令","嘴硬","保护欲不外露"] | 待确认提案 |
| 200 | `temperament.strengths` | 遇到异常保持行动力，擅长在嘈杂环境中分辨不合逻辑的声音 | 待确认提案 |
| 201 | `temperament.weaknesses` | 习惯逃避正式约定、对教师的善意也常用不耐烦回应 | 待确认提案 |
| 202 | `temperament.socialEnergy` | 独处补充精力；可以社交但不主动维持表面热闹 | 待确认提案 |
| 203 | `temperament.humorStyle` | 淡淡的干笑和轻微反讽，通常只用一句话 | 待确认提案 |
| 204 | `temperament.conflictStyle` | 先回避、被逼急了会短促顶撞；避免无缘无故暴力 | 待确认提案 |
| 205 | `temperament.fears` | 并不怕被说坏学生；真正害怕辨不出声音来自哪里 | 待确认提案 |
| 206 | `temperament.angerTriggers` | 反复说教、颠倒黑白、被迫重复已经说明的事实 | 待确认提案 |
| 207 | `temperament.stressResponse` | 下颌收紧、眼睑降低、左手插兜握拳、重新寻找出口 | 待确认提案 |
| 208 | `temperament.defenseMechanism` | 把担心说成无所谓，把在意伪装成嫌麻烦 | 待确认提案 |
| 209 | `temperament.moralLimits` | 不伤害无辜，不欺负弱者；即使嘴硬也不会故意放任同伴遇险 | 待确认提案 |
| 210 | `temperament.goals` | 尽快脱离被安排好的无聊生活，弄清夜晚异常响声的来源 | 待确认提案 |
| 211 | `temperament.contradictions` | 嘴上说讨厌学校，实际比谁都熟悉楼道和门的位置 | 待确认提案 |
| 212 | `temperament.publicPersona` | 不良学生外表，松散、疏离、懒得配合 | 待确认提案 |
| 213 | `temperament.privatePersona` | 单独行动时认真记录细节，承担意外责任却不解释 | 待确认提案 |
| 214 | `temperament.emotionalBaseline` | 低唤醒、轻烦躁、时常觉得周围没意思 | 待确认提案 |
| 215 | `temperament.expressionRange` | 平静无聊→淡嘲→警觉→压抑怒意→短促惊讶→疲惫松弛 | 待确认提案 |
| 216 | `temperament.defaultMicroExpression` | 上眼睑略垂，眉峰微抬，嘴角略下，鼻翼放松 | 待确认提案 |
| 217 | `temperament.signatureMicroExpressions` | 想嘲讽时单侧嘴角轻提；听到异响时一瞬间收起不耐烦表情 | 待确认提案 |
| 218 | `temperament.eyesExpression` | 不耐烦半睁，观察时瞳孔转得快而头动得少 | 待确认提案 |
| 219 | `temperament.eyebrowsExpression` | 常一侧眉挑起，问句时眉内侧一高一低 | 待确认提案 |
| 220 | `temperament.mouthExpression` | 默认薄唇抿成近乎平线；冷笑只动一侧嘴角 | 待确认提案 |
| 221 | `temperament.bodyLanguageMood` | 单手插兜、肩膀微垮，压力下站姿会不自觉变直 | 待确认提案 |
| 222 | `temperament.composureLevel` | 普通冲突时高，面对不明声音时会先惊讶再迅速压住情绪 | 待确认提案 |

## 内心需求、恐惧、秘密与成长弧线（13 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 223 | `psychology.innerNeed` | 想得到不依赖成绩和老师评价的价值感与自主选择权 | 待确认提案 |
| 224 | `psychology.externalGoal` | 学校阶段表面只求别被管束；剧情线希望找到异常的真实规则 | 待确认提案 |
| 225 | `psychology.secretGoal` | 试图查清记忆中某晚楼道里的脚步声为何与楼层不符 | 待确认提案 |
| 226 | `psychology.belief` | 规矩大多只是方便管理者的工具；能检验的事实比安慰话重要 | 待确认提案 |
| 227 | `psychology.selfImage` | 把自己看成懒得较真的局外人 | 待确认提案 |
| 228 | `psychology.insecurities` | 担心自己认真投入后仍会失败，故常提前装不在意 | 待确认提案 |
| 229 | `psychology.regrets` | 小时候没敢追上那阵停在空楼层的脚步声，留下不确定的记忆 | 待确认提案 |
| 230 | `psychology.traumaIfStoryApproved` | 可选：一次漫长停电与走错楼层经历；不是当前已确认的医疗创伤设定 | 待确认提案 |
| 231 | `psychology.attachmentStyle` | 表面疏离，建立信任后愿意安静地承担事务 | 待确认提案 |
| 232 | `psychology.trustPattern` | 先观察言行是否一致，再用小事件确认可信度；不会因为对方活泼就马上信任 | 待确认提案 |
| 233 | `psychology.breakingPoint` | 同伴明明危险，旁人却要求他无视事实时可能违抗规则 | 待确认提案 |
| 234 | `psychology.growthArc` | 逃避责任→独自查证→被迫和他人协作→主动承认自己关心同伴 | 待确认提案 |
| 235 | `psychology.values` | 独立、真实、有据可查的承诺、保护无辜 | 待确认提案 |

## 声线、口吻、台词和语言习惯（16 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 236 | `dialogue.voicePitch` | 中低音域，非成熟粗犷大叔声 | 待确认提案 |
| 237 | `dialogue.voiceTimbre` | 微哑、略带鼻音的自然少年男声 | 待确认提案 |
| 238 | `dialogue.speechRate` | 日常偏慢，讨论异常时短促加快 | 待确认提案 |
| 239 | `dialogue.voiceVolume` | 通常中低音量，少有大喊 | 待确认提案 |
| 240 | `dialogue.tone` | 散漫、压着不耐烦的平直语调 | 待确认提案 |
| 241 | `dialogue.accents` | 普通话/通用语，不使用过强地方口音 | 待确认提案 |
| 242 | `dialogue.diction` | 简短日常词语，偶有准确的技术性比喻 | 待确认提案 |
| 243 | `dialogue.sentenceLength` | 多数一句5-15字，重要时突然完整说长句 | 待确认提案 |
| 244 | `dialogue.vocabulary` | 避免刻意文艺腔；熟悉楼道、门锁、线路、声音等技术词 | 待确认提案 |
| 245 | `dialogue.habitualPhrases` | ["随便。","你认真的？","又来？","……行吧。"] | 待确认提案 |
| 246 | `dialogue.sarcasmLevel` | 中等偏低；对熟人较明显，但不模仿女主的尖刻式毒舌 | 待确认提案 |
| 247 | `dialogue.laughStyle` | 鼻腔短促哼笑，几乎不放声大笑 | 待确认提案 |
| 248 | `dialogue.cryingStyle` | 情绪压到极限时先沉默、呼吸断续，不突然长篇哭诉 | 待确认提案 |
| 249 | `dialogue.speechUnderStress` | 句子缩短，语速更快，直接描述方位与危险，例如‘左边。别开。’ | 待确认提案 |
| 250 | `dialogue.dialogueExamples` | ["老师：‘又迟到了？’ 他：‘钟又没停。’","女主：‘你为什么知道那扇门？’ 他：‘因为它昨天还不在那儿。’","女二：‘要进去看看吗？’ 他：‘你先别碰门把手。’"] | 待确认提案 |
| 251 | `dialogue.forbiddenVoicePatterns` | 拒绝夸张黑帮口音、暴力威胁、无意义脏话串、热血喊口号和持续温柔安慰腔 | 待确认提案 |

## 日常作息、走姿、手势与习惯动作（17 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 252 | `behavior.idlePose` | slightly slouched, one hand in pocket, other arm at side | 用户原始设定 |
| 253 | `behavior.signatureGesture` | 听到不合理声音会侧目一下并将下巴抬起约2° | 待确认提案 |
| 254 | `behavior.greetingHabit` | 不挥手；轻微抬下巴表示看见对方 | 待确认提案 |
| 255 | `behavior.gazePattern` | 默认视线略低于对方眼睛；警觉时先眼球偏转再转头 | 待确认提案 |
| 256 | `behavior.blinkHabit` | 眨眼频率偏低，视线对焦时眨眼暂停1-2秒 | 待确认提案 |
| 257 | `behavior.eyebrowMotion` | 多用单眉抬起代替整张脸动 | 待确认提案 |
| 258 | `behavior.headTilt` | 习惯头部微前倾约3°，不歪头卖萌 | 待确认提案 |
| 259 | `behavior.walkCycle` | 步幅长而松散，脚跟先落，摆臂幅度偏小 | 待确认提案 |
| 260 | `behavior.runningCycle` | 跑起来身体略前倾，冲刺不夸张甩手 | 待确认提案 |
| 261 | `behavior.nervousTics` | 左手在口袋里摩擦布料边缘；不主动啃指甲 | 待确认提案 |
| 262 | `behavior.sleepRhythm` | 偏晚睡，清晨难醒；不代表病理性睡眠问题 | 待确认提案 |
| 263 | `behavior.eatingStyle` | 吃饭快，不太挑食；不主动拍照分享 | 待确认提案 |
| 264 | `behavior.favoriteFoods` | ["简单咖喱饭","冰凉茶饮","清淡面食"] | 待确认提案 |
| 265 | `behavior.hobbies` | ["修旧电子设备","听不知名电台","观察旧楼道结构"] | 待确认提案 |
| 266 | `behavior.dailyRoutine` | 平日7:10起床、7:55进校、午休独处、放学沿熟悉街道回家；迟到是偶发而非绝对 | 待确认提案 |
| 267 | `behavior.timeManagement` | 对不感兴趣的事拖延；对异常线索能投入长时间 | 待确认提案 |
| 268 | `behavior.transportation` | 步行为主，偶尔乘公交；默认不携带自行车或其他实物 | 待确认提案 |

## 人物关系和信任变化（12 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 269 | `relationships.familyRelations` | 与母亲关系淡但并非敌对；关心家庭却很少主动打电话 | 待确认提案 |
| 270 | `relationships.schoolRelations` | 多数同学觉得他不好接近；部分人找他帮忙修东西 | 待确认提案 |
| 271 | `relationships.friendRelations` | 没有稳定成群结队的不良社团，愿与少数可靠的人共同行动 | 待确认提案 |
| 272 | `relationships.rivalRelations` | 与一名尚未正式建立 NPC 身份的纪律委员有口头摩擦；不注册新角色 | 待确认提案 |
| 273 | `relationships.mentorRelations` | 可能有位理解他技术天赋的理科教师；是否登场待剧情确认 | 待确认提案 |
| 274 | `relationships.romancesIfStoryApproved` | 不强制指定恋爱路线；任何感情线需后续剧情明确批准 | 待确认提案 |
| 275 | `relationships.relationshipToProtagonist` | 女主冷淡毒舌，他散漫厌学；初期彼此不信任，可能因共同发现异常逐渐合作 | 待确认提案 |
| 276 | `relationships.relationshipToMaleLead` | 本人；此字段自引用，供通用关系查询使用 | 待确认提案 |
| 277 | `relationships.trustFlags` | {"heroine":0,"girl2":0,"disciplineStaff":-1,"scale":"-3不信任至+3高度信任；均为候选数值"} | 待确认提案 |
| 278 | `relationships.secretsShared` | 关于楼道异常仅在确认对方也看见后才透露，初期不会主动说完 | 待确认提案 |
| 279 | `relationships.conflictHistory` | 曾因无故缺席集合被记过；实际理由有待剧情选择 | 待确认提案 |
| 280 | `relationships.relationProgression` | 陌生→互相试探→共享证据→愿意协作→在关键决定上可分歧 | 待确认提案 |

## 特长、弱点、体能与装备（15 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 281 | `skills.talents` | 听觉定位、空间记忆、拆装旧电子设备，擅长识别重复出现的不自然声响 | 待确认提案 |
| 282 | `skills.weaknesses` | 长时间正式演讲、团队例会、严格执行重复性文书流程 | 待确认提案 |
| 283 | `skills.learnedSkills` | ["焊接简单电路","更换收音机电池端子","读取楼层平面图","基础急救常识"] | 待确认提案 |
| 284 | `skills.academicSkills` | 物理直觉优于考试成绩；语言表达尚可但书面作业不认真 | 待确认提案 |
| 285 | `skills.workSkills` | 小型线路排查、物件简单维修、记录工具损耗 | 待确认提案 |
| 286 | `skills.combatAbility` | 非武术大师；能躲闪和挣脱普通推搡，但不把暴力作为常规解决方式 | 待确认提案 |
| 287 | `skills.physicalEndurance` | 偏瘦但能持续快步行走约1小时，爆发力中等 | 待确认提案 |
| 288 | `skills.agility` | 敏捷中上；快速闪身让路，不做超人跳跃 | 待确认提案 |
| 289 | `skills.perception` | 听觉敏感、记路能力强；光线不足时也可能判断错误 | 待确认提案 |
| 290 | `skills.charisma` | 第一印象不佳但危机处理时能让同伴信服 | 待确认提案 |
| 291 | `skills.supernaturalPowers` | 默认没有超自然能力；异常事件只能通过观察与普通手段应对 | 待确认提案 |
| 292 | `skills.powerCosts` | 无魔法消耗；长时间紧张搜寻造成疲倦、判断误差及信任代价 | 待确认提案 |
| 293 | `skills.equipment` | 默认空手；剧情事件允许临时手电和旧收音机，但不当常驻立绘道具 | 待确认提案 |
| 294 | `skills.inventory` | 校服裤袋只保留正常空间，不固定显示任何可移动物品 | 待确认提案 |
| 295 | `skills.healthIfStoryApproved` | 健康成年人；没有已设定疾病，若剧情受伤必须单独更新状态与动画 | 待确认提案 |

## 正式剧情候选时间线和分歧（13 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 296 | `story.firstAppearance` | 第一章：学校放学后，听见楼梯间传来本不该存在的铃声（剧情候选） | 待确认提案 |
| 297 | `story.locationEntrances` | 校门边缘→教学楼走廊→楼梯口；住宅场景按事件触发，默认无常驻摆件 | 待确认提案 |
| 298 | `story.originStory` | 被贴上厌学不良标签的普通学生，却习惯在独处时辨认建筑中的重复噪声 | 待确认提案 |
| 299 | `story.incitingEvent` | 某晚发现学校走廊的门与楼层地图对不上，响声重复三次 | 待确认提案 |
| 300 | `story.keyScenes` | ["第一次听到多出的一次铃声","对照学校地图发现门牌序号缺口","与女主核对同一异常","临门选择打开或绕行"] | 待确认提案 |
| 301 | `story.storyGoals` | 弄清建筑空间和记忆错位原因，同时决定是否帮助其他角色 | 待确认提案 |
| 302 | `story.branchingChoices` | ["独自调查或共享线索","回避危险或提醒他人","信任记录或相信现场观察"] | 待确认提案 |
| 303 | `story.secrets` | 小时候曾见过相似的楼层错位；回忆不可靠，后续才逐步查证 | 待确认提案 |
| 304 | `story.reveals` | 中段可以发现异常不是只有他听到；不直接确定超自然来源 | 待确认提案 |
| 305 | `story.relationshipEvents` | 与女主从互怼到合作，与女二从回避话题到愿意警告风险 | 待确认提案 |
| 306 | `story.questEvents` | ["核验楼层门牌","寻找能发出异常铃声的装置","对照同一走廊不同时刻的差别"] | 待确认提案 |
| 307 | `story.alternateEndings` | ["合作揭开部分真相","独自离开但留下关键线索","错误判断导致人物关系破裂（剧情后果待批准）"] | 待确认提案 |
| 308 | `story.chronologicalHistory` | 童年停电走错楼层→中学阶段逐渐厌学→18岁异常事件出现→结局尚未定稿 | 待确认提案 |

## 居住空间、学校和物品状态（10 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 309 | `environment.home` | 灰港市普通旧住宅的单间卧室；默认不因为角色临时出入就摆出额外物品 | 待确认提案 |
| 310 | `environment.school` | 暂定灰港市立第二高中，必须与女主、女二同一所学校的名称统筹 | 待确认提案 |
| 311 | `environment.workplace` | 无正式工作场所；不捏造店铺与正式NPC | 待确认提案 |
| 312 | `environment.roomOwnership` | 卧室归本人；同住安排属于剧情提案，不用房间背景判断他此时在家 | 待确认提案 |
| 313 | `environment.itemOwnership` | 可拥有简易电子零件盒（若画入场景须有剧情许可），其余携带物默认不显示 | 待确认提案 |
| 314 | `environment.furnitureConditions` | 普通旧书桌、床、储物柜只按场景母版出现；不添加随出勤变化的鞋包衣架道具 | 待确认提案 |
| 315 | `environment.weatherResponse` | 雨天不张扬，肩膀微缩，衣料潮湿变化由场景触发 | 待确认提案 |
| 316 | `environment.locationsVisited` | ["学校走廊","楼梯间","回家路线","普通住宅房间"] | 待确认提案 |
| 317 | `environment.npcSchedule` | 平日7:55入校，12:30午休，16:45放学；异常支线触发后允许时段偏移 | 待确认提案 |
| 318 | `environment.worldEra` | 当代架空城市的校园/住宅生活恐怖，禁止加入无依据的历史装甲或魔法武装 | 待确认提案 |

## 正背面、视觉风格、镜头、Anima参数与提示词（50 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 319 | `visualProduction.frontReference` | 尚未绘制或验收；目标为仅一名男生的全身正面白底立绘，不得伪造现成路径 | 待确认提案 |
| 320 | `visualProduction.backReference` | 尚未绘制或验收；后续独立生成同一校服与发型的全身背面 | 待确认提案 |
| 321 | `visualProduction.sideReference` | 计划：左侧和右侧头部结构草图；暂未制作 | 待确认提案 |
| 322 | `visualProduction.threeQuarterReference` | 计划：左右3/4视角一致性检查图；暂未制作 | 待确认提案 |
| 323 | `visualProduction.poseReference` | 用户原始正面动作：轻微驼背、一手插兜、另一手下垂 | 待确认提案 |
| 324 | `visualProduction.expressionReferences` | 计划：无聊、警觉、轻嘲、恼怒、短促惊讶、放松六种表情；尚无图 | 待确认提案 |
| 325 | `visualProduction.silhouetteLocked` | 目标：高挑偏瘦男生，凌乱中长黑发，敞开蓝外套、松红领带、黑裤鞋，一手插兜；尚待用户验收 | 待确认提案 |
| 326 | `visualProduction.colorPalette` | {"hair":"#191B20","iris":"#777B83","blazer":"#202734","shirt":"#F1F1ED","tie":"#722B39","pants":"#343941","shoes":"#17191D","skinBase":"#E6CDBD"} | 待确认提案 |
| 327 | `visualProduction.artStyle` | 与女主已批准立绘相同的二次元游戏人物画法：干净轮廓线、节制硬边明暗、有限柔和过渡 | 待确认提案 |
| 328 | `visualProduction.imageAspectRatio` | 建议竖构图3:4或2:3；不能沿用适合多人的方形双角色构图 | 待确认提案 |
| 329 | `visualProduction.whiteBackgroundRule` | 仅一人、纯白、无场景、无阴影道具，周围留白足以容纳头发与鞋 | 待确认提案 |
| 330 | `visualProduction.fullBodyRule` | 头顶发梢到鞋底完整入画，不能被画框切掉 | 待确认提案 |
| 331 | `visualProduction.centeredRule` | 角色站立于画面中轴线附近，姿态可左右不对称但重心投影落双脚支撑区 | 待确认提案 |
| 332 | `visualProduction.occlusionRule` | 插兜那只手需能看见手腕与口袋关系，另一只手五指可见；不允许手臂遮挡整张领带 | 待确认提案 |
| 333 | `visualProduction.promptPositive` | masterpiece, best quality, score_7, safe, 1boy, solo, male focus, original character, delinquent student, high school boy, 18 years old, full body, standing, front view, looking at viewer, eye level, centered composition, exactly one person, black hair, messy hair, medium hair, long bangs, narrow eyes, sharp eyes, grey eyes, slightly raised eyebrows, fair skin, slim build, long legs, school uniform, navy blue blazer, open blazer, white collared shirt, loose red necktie, untucked shirt, dark trousers, black shoes, simple accessories, hands visible, feet visible, relaxed posture, slightly slouched posture, one hand in pocket, other arm at side, calm expression, bored expression, unimpressed expression, rebellious attitude, looks like he hates studying, simple background, plain white background, no objects, no props, A male student with a delinquent and rebellious vibe. He looks like someone who skips class, dislikes studying, and is always a little annoyed. He has a cool, sharp face and a relaxed but unfriendly attitude. Show exactly one complete male character from head to toe. Keep the whole body fully visible and centered. Do not generate multiple people, alternate views, or side-by-side character sheets. @akipekostyle <lora:akipekoanima_v1_1:1> | 用户原始设定 |
| 334 | `visualProduction.promptNegative` | worst quality, low quality, score_1, score_2, score_3, blurry, bad anatomy, bad hands, extra fingers, missing fingers, extra limbs, missing limbs, cropped head, cropped feet, out of frame, multiple boys, multiple people, 1girl, 2boys, group, duplicate, twins, side by side, character sheet, reference sheet, multiple views, split screen, mirrored character, chibi, smiling brightly, cheerful expression, school bag, books, props, text, watermark, logo | 用户原始设定 |
| 335 | `visualProduction.modelVersion` | Anima（版本号待本地生成环境登记）；目前记录的是用户原提示，不声称已完成生成 | 待确认提案 |
| 336 | `visualProduction.artistTag` | @akipekostyle | 用户原始设定 |
| 337 | `visualProduction.lora` | <lora:akipekoanima_v1_1:1> | 用户原始设定 |
| 338 | `visualProduction.seed` | 出图时记录实际随机种子，默认候选测试可先用214603但不声称已运行 | 待确认提案 |
| 339 | `visualProduction.sampler` | 测试建议按当前Anima工作流保持一致采样器；具体运行结果未有 | 待确认提案 |
| 340 | `visualProduction.resolution` | 建议原图1024×1536/768×1152；必须由实际工具验证可用输入尺寸 | 待确认提案 |
| 341 | `visualProduction.sourceFileHash` | 暂无已验收图像，因此没有可记录的SHA-256；审批时必须填写 | 待确认提案 |
| 342 | `visualProduction.assetApproval` | 未审批；不得注册到游戏角色表，也不得拿虚构纹理冒充L2D | 待确认提案 |
| 343 | `visualProduction.bodyFacingYawDeg` | 0 | 用户原始设定 |
| 344 | `visualProduction.headFacingYawDeg` | 0 | 待确认提案 |
| 345 | `visualProduction.headPitchDeg` | 2 | 待确认提案 |
| 346 | `visualProduction.headRollDeg` | 0 | 待确认提案 |
| 347 | `visualProduction.shoulderYawDeg` | 0 | 待确认提案 |
| 348 | `visualProduction.pelvisYawDeg` | 0 | 待确认提案 |
| 349 | `visualProduction.gazeHorizontalDeg` | 0 | 待确认提案 |
| 350 | `visualProduction.gazeVerticalDeg` | -2 | 待确认提案 |
| 351 | `visualProduction.cameraAngle` | 正面眼平，人物轻微低头但镜头不俯拍 | 待确认提案 |
| 352 | `visualProduction.cameraFocalStyle` | 中长焦感的低透视全身人物摄影逻辑，不做夸张近大远小 | 待确认提案 |
| 353 | `visualProduction.projectionOrthoPerspective` | 近正交，人体与鞋的透视差非常小 | 待确认提案 |
| 354 | `visualProduction.visualStyleCategory` | 角色立绘／视觉小说全身独立母版，不是插画场景 | 待确认提案 |
| 355 | `visualProduction.lineWeightStyle` | 外轮廓中细、五官略细、衣褶克制，优先与CHAR-001母版逐层比对 | 待确认提案 |
| 356 | `visualProduction.lineColor` | #202128（部分阴影可更接近蓝灰而非纯黑） | 待确认提案 |
| 357 | `visualProduction.shadingMethod` | 硬边赛璐璐式主阴影＋少量半软过渡；不做写实油画体积 | 待确认提案 |
| 358 | `visualProduction.shadowDensity` | 面部阴影轻，外套阴影中等，校服统一光源从画面左上方 | 待确认提案 |
| 359 | `visualProduction.highlightTreatment` | 头发少量宽面柔高光；眼睛单点小高光，黑鞋局部微亮 | 待确认提案 |
| 360 | `visualProduction.textureComplexity` | 低至中，避免AI噪点和衣料随机复杂花纹 | 待确认提案 |
| 361 | `visualProduction.anatomicalStylization` | 约7.25头身的写实化动漫比例，瘦长而非Q版 | 待确认提案 |
| 362 | `visualProduction.facialFeatureStylization` | 窄眼、稍挑眉、窄脸、平嘴；不复制女主的女性脸型和泪痣 | 待确认提案 |
| 363 | `visualProduction.characterIdentityEmbeddingNotes` | 独有组合：微乱黑中长发＋冷灰细眼＋未扣深蓝男外套＋歪红领带＋单手插兜 | 待确认提案 |
| 364 | `visualProduction.frontPosePoseCode` | FRONT_IDLE_A: left hand in pocket, right arm at side, slight slouch, facing camera | 用户原始设定 |
| 365 | `visualProduction.poseSilhouetteNotes` | 敞开外套形成两条垂直深蓝边线；露白衬衫与松红领带，裤腿长且足部完整 | 待确认提案 |
| 366 | `visualProduction.framingHeadroomRatio` | 0.055 | 待确认提案 |
| 367 | `visualProduction.framingFootroomRatio` | 0.045 | 待确认提案 |
| 368 | `visualProduction.bodyAlignmentRule` | 统一女主尺寸比例时：同画布像素每厘米恒定，男主176cm/女主162cm/女二155cm；背面服装各元素在同一身高参考线 | 待确认提案 |

## L2D/PSD分层、骨骼、动作和物理演出（30 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 369 | `rigging.layerSource` | 待制作PSD/分层TIFF；此处只记录拆件设计，不存在真实文件 | 待确认提案 |
| 370 | `rigging.layerList` | ["头后发","头颅底色","面部线层","左右眉眼睑","左右虹膜瞳孔","口型","刘海主束","左鬓发","右鬓发","颈部","白衬衫胸部","左外套前片","右外套前片","领口与红领带","肩臂两侧","肘与前臂","左右手与指节","裤腰","骨盆与裤腿","鞋袜与鞋底"] | 待确认提案 |
| 371 | `rigging.headJoint` | 头颈连接点：标准身高归一化画面x=0.50、从头顶向下约0.125；以实际PSD为准 | 待确认提案 |
| 372 | `rigging.neckJoint` | 颈根：头身尺度y≈0.16，微小转动优先 | 待确认提案 |
| 373 | `rigging.shoulderJoint` | 左右肩骨骼中心：全身归一化y≈0.195，左右x≈0.39和0.61；仅图纸建议 | 待确认提案 |
| 374 | `rigging.elbowJoint` | 袖肘中心：全身归一化y≈0.34，必须按原图测定 | 待确认提案 |
| 375 | `rigging.wristJoint` | 腕关节：全身归一化y≈0.47；插兜侧腕需特殊遮挡补画 | 待确认提案 |
| 376 | `rigging.hipJoint` | 左右髋关节：全身归一化y≈0.53，裤腰与胯部可单独分层 | 待确认提案 |
| 377 | `rigging.kneeJoint` | 膝关节：全身归一化y≈0.75，裤装褶皱有分离层 | 待确认提案 |
| 378 | `rigging.ankleJoint` | 踝关节：全身归一化y≈0.94，裤脚可轻度相对移动 | 待确认提案 |
| 379 | `rigging.eyeTrack` | 水平左右建议±6°，垂直±4°，强度受半垂眼默认形控制 | 待确认提案 |
| 380 | `rigging.blink` | 眨眼周期暂定3.5–6.0秒随机，不允许两眼以不同速度抖动 | 待确认提案 |
| 381 | `rigging.mouthShapes` | 闭口、微张、自然讲话、短促张口、咬紧五种口型；嘴形小，颌线稳定 | 待确认提案 |
| 382 | `rigging.hairPhysics` | 中长乱发分刘海与两侧发束，头转动时延迟0.10–0.22秒并缓慢回稳 | 待确认提案 |
| 383 | `rigging.clothPhysics` | 敞开外套前片低幅摇摆，松领带中段与末端独立滞后，裤脚变化很小 | 待确认提案 |
| 384 | `rigging.breathingPhysics` | 胸廓向外±0.7%像素比例缓慢变化，肩部同步轻微上下，周期4.5–5.8秒 | 待确认提案 |
| 385 | `rigging.skinningLimits` | 肩腕过伸必须补画，手插兜不得穿过裤布，外套与领带不能互相穿透 | 待确认提案 |
| 386 | `rigging.expressionStates` | ["bored","unimpressed","irritated","alert","sarcastic","surprised","relieved"] | 待确认提案 |
| 387 | `rigging.actionStates` | ["idle","look-left","look-right","hands-pocket","step-forward","notice-sound","recoil"] | 待确认提案 |
| 388 | `rigging.runtimePreview` | 计划接入游戏已有通用L2D角色模块与DEV全角色编辑器；目前并未导入或跑图 | 待确认提案 |
| 389 | `rigging.occlusionRepair` | 口袋开口、前襟露白衬衫、领带与双袖肘必须单独补画空洞 | 待确认提案 |
| 390 | `rigging.qaAnimation` | 最终验收须正背/表情/眨眼/头发/领带/衣摆连续测试，不以静态放大缩小冒充L2D | 待确认提案 |
| 391 | `rigging.armRotationBoundsDeg` | {"shoulder":-20,"shoulderMax":35,"elbowMin":0,"elbowMax":95,"notes":"插兜侧限制更小，仅候选约束"} | 待确认提案 |
| 392 | `rigging.hipRotationBoundsDeg` | {"min":-8,"max":12,"notes":"只做轻微站立重心调整"} | 待确认提案 |
| 393 | `rigging.kneeFlexBoundsDeg` | {"min":0,"max":28,"notes":"站姿休闲屈膝，不用于蹲跳"} | 待确认提案 |
| 394 | `rigging.eyelidOpennessChannel` | blinkL/blinkR：默认0.60睁眼，闭眼0.0；以最终美术纹理归一化标尺校准 | 待确认提案 |
| 395 | `rigging.browDeformationChannels` | browL_raise/browR_raise各±0.15，允许单眉动作 | 待确认提案 |
| 396 | `rigging.mouthCornerChannels` | mouth_corner_L/R在-0.12到+0.10间微调，绝不自动做夸张大笑 | 待确认提案 |
| 397 | `rigging.expressionLandmarkMotion` | 眉眼嘴联动局部偏移，鼻尖与眼距保持锁定，避免人物换脸 | 待确认提案 |
| 398 | `rigging.frontSideBackProportionsQa` | 三视角必须同176cm角色尺标、同头部体积、同外套扣位和领带长度；尚待生成验证 | 待确认提案 |

## 声优、发音和音效建议（8 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 399 | `audio.voiceCasting` | 建议声线：18岁自然中低音男声，略沙哑、干燥；尚未选定或录制配音演员 | 待确认提案 |
| 400 | `audio.pronunciation` | 姓名拟‘许渡’读xǔ dù；日常台词语尾收住，不故意拖长装酷 | 待确认提案 |
| 401 | `audio.multilingualNotes` | 默认中文普通话；英语外来词只在学习/技术词必要时出现 | 待确认提案 |
| 402 | `audio.recordedVoices` | 目前无实录音频；预留idle、irritated、alert、short-laugh、soft-sigh五组样本清单 | 待确认提案 |
| 403 | `audio.footstepSfx` | 黑色皮鞋落地音干脆偏轻；学校空楼道带短混响，居室更闷 | 待确认提案 |
| 404 | `audio.costumeSfx` | 敞开西装前襟轻摩擦与裤袋衣料短响；领带摆动不应有夸张铃铛声 | 待确认提案 |
| 405 | `audio.voiceVolume` | 母版建议-17 LUFS对白目标起点，按项目统一音频基准复测；并非已实际混音 | 待确认提案 |
| 406 | `audio.ambienceRules` | 白天台词不自动添加恐怖混响；异常音效由剧情事件单独混音，与声音方向保持一致 | 待确认提案 |

## NPC调度、玩家交互和数值触发（14 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 407 | `gameplay.npcSchedule` | 平日按7:55到校、12:30休息、16:45离校；任务事件会覆盖作息 | 待确认提案 |
| 408 | `gameplay.dialogueTree` | 基础节点：嫌烦/拒绝→询问事实→看到证据→选择合作或独行；不是已上线对话树 | 待确认提案 |
| 409 | `gameplay.affinity` | 与主要人物初始中性0，提案范围-3..+3；变化必须由剧情选择触发 | 待确认提案 |
| 410 | `gameplay.trust` | 证据与守信积累信任，草案初始女主0、女二0、纪律方-1 | 待确认提案 |
| 411 | `gameplay.playerControl` | 默认非可操控NPC；如决定男主可切换视角，需要用户批准后独立游戏设计 | 待确认提案 |
| 412 | `gameplay.interactRange` | 对话半径草案2.0游戏单位；具体数值按画面交互系统而非现实厘米计算 | 待确认提案 |
| 413 | `gameplay.characterSelection` | 可在DEV角色列表作为候选数据展示，但无正式资产前不可冒充可选已导入演员 | 待确认提案 |
| 414 | `gameplay.sceneLayers` | 人物L2D层位于场景背景之上，UI前景之下；对雾层遮挡遵从场景模块 | 待确认提案 |
| 415 | `gameplay.collisionBounds` | 候选归一化胶囊碰撞：宽0.26、高0.92（单位为全身立绘比例），尚无实际计算 | 待确认提案 |
| 416 | `gameplay.saveFlags` | ["male_seen_clue","male_trust_heroine","male_trust_girl2","male_heard_extra_bell","male_shared_map"] | 待确认提案 |
| 417 | `gameplay.choiceTriggers` | 察觉异声、回看地图、提醒同伴、是否共享记录等选项触发情绪和台词差分 | 待确认提案 |
| 418 | `gameplay.npcBrain` | 非自由城市NPC的大世界AI；剧情内采用状态机：idle→notice→approach→investigate→retreat | 待确认提案 |
| 419 | `gameplay.flagsVariables` | 证据证实度0..3、警戒度0..100、人物关系-3..3、门异常状态枚举；全部为设计提案 | 待确认提案 |
| 420 | `gameplay.inventoryRules` | 日常默认不在立绘上显示固定物品；实际拿到手电/收音机才出现独立手持层，并能撤下 | 待确认提案 |

## 画风一致性、制服和动作验收（16 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 421 | `quality.originalityCheck` | 验收要求：人物外观原创，不能直接照搬任何现成作品人物脸或服装独特符号；当前为文本设计未实测 | 待确认提案 |
| 422 | `quality.similarityCheck` | 对比CHAR-001灰紫眼黑长直＋女二栗棕马尾：男主需男性窄长脸、冷灰眼和黑中长乱发，禁止仅换性别模板 | 待确认提案 |
| 423 | `quality.faceConsistency` | 正背/3/4统一眼距、鼻高、颌线和头围；新图出来后需用带点坐标对齐，不宣称已通过 | 待确认提案 |
| 424 | `quality.hairSideCheck` | 偏左分缝、双耳侧发和后颈发尾必须在正反面保持镜像方向逻辑；待原图验收 | 待确认提案 |
| 425 | `quality.visualIdentityCheck` | 独立剪影测试：黑乱发、长腿、未扣男校服、一手插兜；缩至游戏显示尺度仍有识别度，尚未测 | 待确认提案 |
| 426 | `quality.handsCheck` | 可见右手五指无多指；左手入兜符合遮挡，不从衣料中长出手指；生成后手动检查 | 待确认提案 |
| 427 | `quality.feetCheck` | 两只黑色制服鞋完整画出并站稳地面，不裁切鞋尖或脚跟 | 待确认提案 |
| 428 | `quality.fullBodyCheck` | 单人完整全身正面母版、眼平、纯白背景、不带书包书本额外道具；不得生成多人对照表 | 待确认提案 |
| 429 | `quality.measurementProvenanceCheck` | 176/62、90/72/88及大小臂腿围均为制作建议值，非实测；通过时须记录用户审核或原画制版证据 | 待确认提案 |
| 430 | `quality.outfitCheck` | 男版同校深蓝外套金扣禁用：两颗哑光深色门襟纽扣、袖扣同材质；敞开衣襟＋白衬衫＋红领带、深裤、黑鞋 | 待确认提案 |
| 431 | `quality.sourceRightsCheck` | 用户指定Anima模型、artist tag和LoRA；生成作品需另查具体授权条件，本文不等于已获训练或商业权利 | 待确认提案 |
| 432 | `quality.rigCheck` | 头发、眨眼、领带、衣摆和眼球追视必须在运行时动画测试，不得用静态图呼吸缩放代替 | 待确认提案 |
| 433 | `quality.poseCheck` | 一手插兜、另一手垂放、轻微驼背是用户提供正面动作；正背姿态一致且不能把人物转成3/4 | 待确认提案 |
| 434 | `quality.screenshotCheck` | 需生成并人工对比实际游戏镜头与白底原图，防止图片缩放/锚点导致视角失真；尚未执行 | 待确认提案 |
| 435 | `quality.approvalRecord` | 等待用户批准男主正面原画与属性；目前仅四百余字段方案，不代表已审批 | 待确认提案 |
| 436 | `quality.rollbackReference` | 若后续生成不合格，回到 CHAR-003.profile.json v1.0 与用户原始男主提示词；不得覆盖现有女主原画 | 待确认提案 |

## 每个字段的来源、批准状态与变更记录（12 项）

| 编号 | 字段 | 具体内容 | 状态 |
|---:|---|---|---|
| 437 | `provenance.createdAt` | 2026-11-02 | 待确认提案 |
| 438 | `provenance.updatedAt` | 2026-11-02 | 待确认提案 |
| 439 | `provenance.userConfirmedFields` | ["男性","18岁","高中新生? 非：按原提示高中男生","黑色凌乱中长发","灰色窄眼","校服深蓝外套敞开","白衬衫露下摆","松红领带","深色长裤","黑鞋","厌学叛逆","略驼背","一手插兜另一手垂放","白底正面全身","原始Anima风格Tag与LoRA"] | 待确认提案 |
| 440 | `provenance.sourceCitations` | ["2026-11-02用户原始男主Anima正向/负向提示词","docs/characters/CHARACTER_FIELD_SCHEMA_V2.json版本3","本次男主扩展写作任务（全部448字段）"] | 待确认提案 |
| 441 | `provenance.proposedFields` | 除此之外约四百项细节为原创创意设计提案：176cm、62kg、胸90/腰72/臀88、肢体围度、脸部比值、家庭、学校名称、剧情路线及L2D规范均待批准 | 待确认提案 |
| 442 | `provenance.unknownFields` | 技术事实未发生：尚无获批原画、已录配音、实际采样器/seed、计算文件哈希和真实L2D运行数据；字段里写明计划而非伪造 | 待确认提案 |
| 443 | `provenance.rejectedFields` | ["把男主画成黑帮成年暴徒","把男主画成女主换短发的脸","默认塞书包课本或武器","金色校服纽扣","把男主当已经导入游戏的人物","把提案数值说成已测量"] | 待确认提案 |
| 444 | `provenance.revisionHistory` | [{"version":"1.0","date":"2026-11-02","change":"从用户男主提示词扩展完整448字段原创人物提案，保留未批准标记；后续更改必须追溯"}] | 待确认提案 |
| 445 | `provenance.authorReviewer` | 草案编写：ChatGPT；人物设计审批：用户；美术验收尚未开展 | 待确认提案 |
| 446 | `provenance.approvedBy` | 尚未批准（状态明确，不是审批通过） | 待确认提案 |
| 447 | `provenance.permissions` | 仅用于用户自己的原创游戏角色制作计划；模型/LoRA授权另行核实，暂不声称获得任何特定版权许可 | 待确认提案 |
| 448 | `provenance.historyNotes` | 所有精确身体尺寸与面部坐标为可调整的制版目标；人物行为、NPC事件与世界观属尚未进入正式游戏脚本的提案 | 待确认提案 |

## 美术验收与相关资料

- 正面与背面必须是同一人、不同独立单人图，不使用双人拼图；正背共用制服剪影、黑色中长发后脑结构、裤脚与黑鞋。
- 精简 Anima 提示词时不要把 448 个字段全塞进一段 Prompt：448项是**资料库**，生成时只抽取与绘画直接有关的约40至80项高辨识信息，且正向、负向各一段。
- [角色字段规范](CHARACTER_FIELD_SCHEMA_V2.json) · [女主档案](CHAR-001.profile.json) · [女二档案](CHAR-002.profile.json) · [人物总表](../CHARACTER_BIBLE_INDEX.md)

**验收状态：暂无获批原画、暂无正式游戏人物素材；上文全部创作提案等待用户逐项调整。**

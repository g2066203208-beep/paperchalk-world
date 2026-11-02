# 《错位日常》角色资料标准模板 V3.0
> 本模板以 [448 字段机器清单](CHARACTER_FIELD_SCHEMA_V2.json) 为唯一字段来源。所有人物无论主角、男主、女二、路人、NPC 都使用同一架构；可以在不同角色中标记不适用，但不得直接省略关键字段。
> 此模板是空白制作框架，不意味着模板里每个项目都有一个真实答案。

## 首要填写纪律
**字段值必须有状态：** `user_confirmed`（用户明确确认）、`approved_art_reference`（已验收原画依据）、`approved_story_reference`（已批准剧情依据）、`proposed`（创作建议）、`unknown`（未知）、`not_applicable`（不适用）、`rejected`（明确废弃）。
每条记录另保留 `source`（用户消息、图片、脚本路径等）和 `notes`（视角、厘米单位、冲突、版本）。绝不因为“想填完整”而凭空创造生日、家族、身体尺寸、剧情秘密。
**美术必须的优先组：** 唯一 ID、性别呈现、年龄档、身高、体重、头身比、外衣胸腰臀、肩宽、脸型、眼型、瞳色、发型、发饰左右、服装层级、主角性格、默认表情、正面姿势、正侧背一致性、白背景/全身母图、Prompt、参考图来源。
外衣胸/腰/臀围以厘米标记，仅用于穿着角色的制版参考；从原画推不出精确人体数据，不适合未成年角色的性化内衣细节不填写。
**角色分层：** 人物身份数据 ≠ 人物场景数据 ≠ 已存在 L2D 资源。候选角色可以有完整档案，但没有得到批准的正背面素材就不进入正式游戏角色注册表。

## 22 个类别的完整字段目录（448 字段）

### 身份与编号 · `identity`（17 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`recordCode` · `canonicalId` · `displayName` · `legalName` · `nicknames` · `aliases` · `pronouns` · `genderPresentation` · `ageYears` · `birthDate` · `birthplace` · `currentResidence` · `era` · `occupation` · `schoolYear` · `storyRole` · `designStatus`

### 家庭成长 · `family`（10 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`parents` · `guardians` · `siblings` · `relatives` · `familyStructure` · `childhoodEvents` · `upbringing` · `householdMembers` · `livingSituation` · `socioeconomicBackground`

### 教育职业 · `education`（11 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`school` · `className` · `club` · `grades` · `subjectStrengths` · `subjectWeaknesses` · `workplace` · `jobTitle` · `salaryRange` · `experience` · `professionalGoals`

### 体型尺码 · `measurements`（40 项）

三围与腿围、臂围等都用厘米表示。明确上臂围、前臂围、腕围、大腿围、小腿围、膝围、踝围、臂长、腿长、膝高、肩宽、脸长宽；不要从单张图反算精确数值。

字段：`heightCm` · `weightKg` · `headBodyRatio` · `shoulderWidthCm` · `chestCircumferenceCm` · `waistCircumferenceCm` · `hipCircumferenceCm` · `torsoLengthCm` · `armSpanCm` · `inseamCm` · `shoeSize` · `bodyBuild` · `bodyMassDescription` · `posture` · `handDominance` · `gait` · `upperArmCircumferenceCm` · `forearmCircumferenceCm` · `wristCircumferenceCm` · `thighCircumferenceCm` · `calfCircumferenceCm` · `kneeCircumferenceCm` · `ankleCircumferenceCm` · `upperArmLengthCm` · `forearmLengthCm` · `handLengthCm` · `palmWidthCm` · `upperLegLengthCm` · `lowerLegLengthCm` · `kneeHeightCm` · `hipBreadthCm` · `shoulderBreadthCm` · `waistHeightCm` · `ribcageDepthCm` · `hipDepthCm` · `headWidthCm` · `faceLengthCm` · `faceWidthCm` · `footLengthCm` · `footWidthCm`

### 骨架体表 · `anatomy`（37 项）

记录上臂与前臂的轮廓渐变、大腿和小腿粗细、膝关节与脚踝形状、肩腰胯比例和重心。比例是创作设计而不是对现实人体的臆测。

字段：`headShape` · `shoulderSlope` · `torsoDepth` · `ribcageContour` · `waistContour` · `pelvisAndHips` · `backContour` · `bustThroughClothing` · `limbProportions` · `handShape` · `skinUndertone` · `skinTexture` · `scars` · `birthmarks` · `moles` · `freckles` · `postureAsymmetry` · `mobilityNeeds` · `upperArmShape` · `forearmShape` · `wristShape` · `thighShape` · `calfShape` · `kneeShape` · `ankleShape` · `legAxis` · `upperLimbTaper` · `lowerLimbTaper` · `legMuscleDistribution` · `armMuscleDistribution` · `pelvisTilt` · `spinalCurve` · `handFingerLengthRatios` · `bodySilhouetteType` · `shoulderToHipWidthRatio` · `waistToHipWidthRatio` · `headToShoulderWidthRatio`

### 面部五官 · `face`（46 项）

重点记录**五官位置与比例**：眼中心高度、两眼间距、眼宽、眉眼距、鼻尖位置、鼻宽、嘴巴高度、口鼻距、耳高、眼尾上挑角度和具体表情。可用0—1归一化坐标，但必须注明参照图像及坐标系。

字段：`faceShape` · `forehead` · `cheekbones` · `jawline` · `chin` · `noseBridge` · `noseTip` · `mouthShape` · `lips` · `teeth` · `ears` · `eyebrows` · `eyelidShape` · `eyeShape` · `eyeSpacing` · `eyeCornerAngle` · `eyeColor` · `eyeHex` · `pupilColor` · `eyeHighlights` · `eyelashes` · `defaultExpression` · `facialLandmarkSystem` · `facialLandmarksNormalized` · `faceLengthToWidthRatio` · `foreheadToFaceHeightRatio` · `jawWidthToFaceWidthRatio` · `cheekboneWidthToFaceWidthRatio` · `eyeCenterHeightRatio` · `interocularSpacingRatio` · `eyeWidthToFaceWidthRatio` · `eyebrowEyeGapRatio` · `noseTopHeightRatio` · `noseTipHeightRatio` · `noseWidthToFaceWidthRatio` · `mouthCenterHeightRatio` · `mouthWidthToFaceWidthRatio` · `philtrumLengthRatio` · `earTopHeightRatio` · `earBottomHeightRatio` · `eyeTailSlantDeg` · `eyelidOpennessBaseline` · `lipCornerSlopeDeg` · `browAngleDeg` · `expressionLandmarkVariants` · `noseToMouthDistanceRatio`

### 头发识别 · `hair`（16 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`hairBaseColor` · `hairHex` · `hairHighlights` · `hairLength` · `hairTexture` · `hairDensity` · `parting` · `bangs` · `sidelocks` · `ponytailCount` · `ponytailPosition` · `ponytailLength` · `hairAccessories` · `accessorySide` · `accessoryPosition` · `backSilhouette`

### 服装形象 · `wardrobe`（20 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`outerwear` · `shirt` · `blouse` · `neckwear` · `skirt` · `trousers` · `socks` · `footwear` · `garmentLayerOrder` · `paletteHex` · `fabrics` · `sewingDetails` · `pleats` · `buttons` · `pockets` · `wearCondition` · `seasonalVariants` · `occasionVariants` · `permanentAccessories` · `temporaryProps`

### 性格与情绪 · `temperament`（25 项）

除了人格，还要有**神态**：默认眼睑开合、眉毛角度、嘴角状态、面无表情或微笑的类型，以及针对惊讶、愤怒、害怕的微表情。已确认性格不可用猜测覆盖。

字段：`coreConfirmedTraits` · `proposedTraits` · `strengths` · `weaknesses` · `socialEnergy` · `humorStyle` · `conflictStyle` · `fears` · `angerTriggers` · `stressResponse` · `defenseMechanism` · `moralLimits` · `goals` · `contradictions` · `publicPersona` · `privatePersona` · `emotionalBaseline` · `expressionRange` · `defaultMicroExpression` · `signatureMicroExpressions` · `eyesExpression` · `eyebrowsExpression` · `mouthExpression` · `bodyLanguageMood` · `composureLevel`

### 内心世界 · `psychology`（13 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`innerNeed` · `externalGoal` · `secretGoal` · `belief` · `selfImage` · `insecurities` · `regrets` · `traumaIfStoryApproved` · `attachmentStyle` · `trustPattern` · `breakingPoint` · `growthArc` · `values`

### 台词语音 · `dialogue`（16 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`voicePitch` · `voiceTimbre` · `speechRate` · `voiceVolume` · `tone` · `accents` · `diction` · `sentenceLength` · `vocabulary` · `habitualPhrases` · `sarcasmLevel` · `laughStyle` · `cryingStyle` · `speechUnderStress` · `dialogueExamples` · `forbiddenVoicePatterns`

### 习惯与举止 · `behavior`（17 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`idlePose` · `signatureGesture` · `greetingHabit` · `gazePattern` · `blinkHabit` · `eyebrowMotion` · `headTilt` · `walkCycle` · `runningCycle` · `nervousTics` · `sleepRhythm` · `eatingStyle` · `favoriteFoods` · `hobbies` · `dailyRoutine` · `timeManagement` · `transportation`

### 人际关系 · `relationships`（12 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`familyRelations` · `schoolRelations` · `friendRelations` · `rivalRelations` · `mentorRelations` · `romancesIfStoryApproved` · `relationshipToProtagonist` · `relationshipToMaleLead` · `trustFlags` · `secretsShared` · `conflictHistory` · `relationProgression`

### 技能与状态 · `skills`（15 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`talents` · `weaknesses` · `learnedSkills` · `academicSkills` · `workSkills` · `combatAbility` · `physicalEndurance` · `agility` · `perception` · `charisma` · `supernaturalPowers` · `powerCosts` · `equipment` · `inventory` · `healthIfStoryApproved`

### 剧情时间轴 · `story`（13 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`firstAppearance` · `locationEntrances` · `originStory` · `incitingEvent` · `keyScenes` · `storyGoals` · `branchingChoices` · `secrets` · `reveals` · `relationshipEvents` · `questEvents` · `alternateEndings` · `chronologicalHistory`

### 生活环境 · `environment`（10 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`home` · `school` · `workplace` · `roomOwnership` · `itemOwnership` · `furnitureConditions` · `weatherResponse` · `locationsVisited` · `npcSchedule` · `worldEra`

### 立绘原画 · `visualProduction`（50 项）

重点记录**绘画风格/方向**：正面朝向的头部与身体偏航角、俯仰/侧倾、视线、肩胯朝向、镜头透视、线条粗细、上色方式、脸部夸张程度、阴影强度、纹理和人物母版全身完整性。

字段：`frontReference` · `backReference` · `sideReference` · `threeQuarterReference` · `poseReference` · `expressionReferences` · `silhouetteLocked` · `colorPalette` · `artStyle` · `imageAspectRatio` · `whiteBackgroundRule` · `fullBodyRule` · `centeredRule` · `occlusionRule` · `promptPositive` · `promptNegative` · `modelVersion` · `artistTag` · `lora` · `seed` · `sampler` · `resolution` · `sourceFileHash` · `assetApproval` · `bodyFacingYawDeg` · `headFacingYawDeg` · `headPitchDeg` · `headRollDeg` · `shoulderYawDeg` · `pelvisYawDeg` · `gazeHorizontalDeg` · `gazeVerticalDeg` · `cameraAngle` · `cameraFocalStyle` · `projectionOrthoPerspective` · `visualStyleCategory` · `lineWeightStyle` · `lineColor` · `shadingMethod` · `shadowDensity` · `highlightTreatment` · `textureComplexity` · `anatomicalStylization` · `facialFeatureStylization` · `characterIdentityEmbeddingNotes` · `frontPosePoseCode` · `poseSilhouetteNotes` · `framingHeadroomRatio` · `framingFootroomRatio` · `bodyAlignmentRule`

### L2D动态分层 · `rigging`（30 项）

正侧背的比例需要共用同一骨架基准；关节限制与眨眼、眼部跟随和面部动作都要留字段，不能单凭提示词算已实现 L2D。

字段：`layerSource` · `layerList` · `headJoint` · `neckJoint` · `shoulderJoint` · `elbowJoint` · `wristJoint` · `hipJoint` · `kneeJoint` · `ankleJoint` · `eyeTrack` · `blink` · `mouthShapes` · `hairPhysics` · `clothPhysics` · `breathingPhysics` · `skinningLimits` · `expressionStates` · `actionStates` · `runtimePreview` · `occlusionRepair` · `qaAnimation` · `armRotationBoundsDeg` · `hipRotationBoundsDeg` · `kneeFlexBoundsDeg` · `eyelidOpennessChannel` · `browDeformationChannels` · `mouthCornerChannels` · `expressionLandmarkMotion` · `frontSideBackProportionsQa`

### 声音表演 · `audio`（8 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`voiceCasting` · `pronunciation` · `multilingualNotes` · `recordedVoices` · `footstepSfx` · `costumeSfx` · `voiceVolume` · `ambienceRules`

### 游戏交互 · `gameplay`（14 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`npcSchedule` · `dialogueTree` · `affinity` · `trust` · `playerControl` · `interactRange` · `characterSelection` · `sceneLayers` · `collisionBounds` · `saveFlags` · `choiceTriggers` · `npcBrain` · `flagsVariables` · `inventoryRules`

### 验收测试 · `quality`（16 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`originalityCheck` · `similarityCheck` · `faceConsistency` · `hairSideCheck` · `visualIdentityCheck` · `handsCheck` · `feetCheck` · `fullBodyCheck` · `measurementProvenanceCheck` · `outfitCheck` · `sourceRightsCheck` · `rigCheck` · `poseCheck` · `screenshotCheck` · `approvalRecord` · `rollbackReference`

### 版本与来源 · `provenance`（12 项）

信息缺失时明确标注待定、未经批准不能自动补写。

字段：`createdAt` · `updatedAt` · `userConfirmedFields` · `sourceCitations` · `proposedFields` · `unknownFields` · `rejectedFields` · `revisionHistory` · `authorReviewer` · `approvedBy` · `permissions` · `historyNotes`

## 个体人设表填写格式与校验
每位角色各建一份 `CHAR-XXX.profile.json`：完整保留上述字段；字段格式统一为 `{ "value": null, "status": "unknown", "source": null, "notes": null }`。即便某项与该角色无关，也填 `not_applicable`，不把字段删除。
每位角色另有一份可读 Markdown 正文，说明设计动机、可辨外貌、性格冲突、台词、具体动作、剧情进度及已批准资产。机器档用于查漏/一致性，Markdown 用于画师与策划实际阅读。
**版本原则：** 新候选先记录，审批通过再锁定；新增正背面或改人物五官、三围、年龄、发饰侧别都写版本记录；不能重画一张看似相似的 AI 图替换历史母版。

## 已有角色对照
- [CHAR-001 女主角资料](CHAR-001_PROTAGONIST_PROFILE.md)：性格「毒舌、冷淡」已确认；具体身材数值仍属于此前方案；最新用户女主 Anima Prompt 的年龄 18 岁、灰紫眼与仓库旧版 17 岁、灰褐眼存在版本差异，须标记冲突而不是静默选一个。
- [CHAR-002 女二候选资料](CHAR-002_CANDIDATE.md)：单马尾、活泼、略矮为确定方向；155cm、46kg、胸80/腰62/臀86、栗棕发与琥珀眼等为待审的草案。
- 后续其他角色复制标准模板并分配不重复 ID，严禁再把正背面、同角色换装、场景人物当新角色。

## 精确绘画参数：脸部坐标与身体尺度的采集规范

- **面部标准化坐标**：使用同一张用户批准的正面母图，头顶 y=0、下巴 y=1、左侧 x=0、右侧 x=1，记录双眼中心、眉、鼻根、鼻尖、嘴心、耳顶/耳底等节点。归一化比值必须关联母图的像素坐标和版本；未测得的值保持 null，不凭印象造数字。
- **四肢粗细的多种表示**：优先存上臂/前臂/腕围、大腿/膝围/小腿/踝围（cm），再补侧面轮廓、肌肉丰满度、肘膝位置。围度与从正面看见的像素宽度不同，必须分开。
- **不同面向的限制**：`bodyFacingYawDeg=0` 表示正面，头部可以另有 `headFacingYawDeg`；视线方向还需独立 `gazeHorizontalDeg` 与 `gazeVerticalDeg`。保持正面时，左右手动作再丰富也不能莫名变成斜视角。
- **绘画风格身份**：统一校服属于世界观共性，但脸型、眼距、眉眼高差、下巴、五官上色方式、发型、三围、四肢粗细、站姿与神态必须形成区分。风格要一致、人物要不同。
- **来源和确认**：每个尺寸、坐标、眼色、痣和发饰都记录 `value/status/source`。只有用户明确确定或美术母图验收通过才锁定；其余是拟定或未知。

[空白结构化模板](CHARACTER_PROFILE_TEMPLATE_V2.json) · [女主完整机器档案](CHAR-001.profile.json) · [女二候选机器档案](CHAR-002.profile.json)

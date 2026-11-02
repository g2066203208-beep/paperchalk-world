# 《错位日常》角色资料标准模板 V2.0
> 本模板以 [340 字段机器清单](CHARACTER_FIELD_SCHEMA_V2.json) 为唯一字段来源。所有人物无论主角、男主、女二、路人、NPC 都使用同一架构；可以在不同角色中标记不适用，但不得直接省略关键字段。
> 此模板是空白制作框架，不意味着模板里每个项目都有一个真实答案。

## 首要填写纪律
**字段值必须有状态：** `user_confirmed`（用户明确确认）、`approved_art_reference`（已验收原画依据）、`approved_story_reference`（已批准剧情依据）、`proposed`（创作建议）、`unknown`（未知）、`not_applicable`（不适用）、`rejected`（明确废弃）。
每条记录另保留 `source`（用户消息、图片、脚本路径等）和 `notes`（视角、厘米单位、冲突、版本）。绝不因为“想填完整”而凭空创造生日、家族、身体尺寸、剧情秘密。
**美术必须的优先组：** 唯一 ID、性别呈现、年龄档、身高、体重、头身比、外衣胸腰臀、肩宽、脸型、眼型、瞳色、发型、发饰左右、服装层级、主角性格、默认表情、正面姿势、正侧背一致性、白背景/全身母图、Prompt、参考图来源。
外衣胸/腰/臀围以厘米标记，仅用于穿着角色的制版参考；从原画推不出精确人体数据，不适合未成年角色的性化内衣细节不填写。
**角色分层：** 人物身份数据 ≠ 人物场景数据 ≠ 已存在 L2D 资源。候选角色可以有完整档案，但没有得到批准的正背面素材就不进入正式游戏角色注册表。

## 22 个类别的完整字段目录

### 身份与编号 · `identity`（17 项）
身份、年龄、称谓、角色序号与社会身份；禁止以正面/背面给同一人物建两个身份。

字段：`recordCode` · `canonicalId` · `displayName` · `legalName` · `nicknames` · `aliases` · `pronouns` · `genderPresentation` · `ageYears` · `birthDate` · `birthplace` · `currentResidence` · `era` · `occupation` · `schoolYear` · `storyRole` · `designStatus`

### 家庭成长 · `family`（10 项）
家庭、监护、成长经历与居住情况，不通过房间鞋子、雨伞等物件反推家庭成员。

字段：`parents` · `guardians` · `siblings` · `relatives` · `familyStructure` · `childhoodEvents` · `upbringing` · `householdMembers` · `livingSituation` · `socioeconomicBackground`

### 教育职业 · `education`（11 项）
学校班级、课程成绩、职业职责和生活经济来源，均可留空。

字段：`school` · `className` · `club` · `grades` · `subjectStrengths` · `subjectWeaknesses` · `workplace` · `jobTitle` · `salaryRange` · `experience` · `professionalGoals`

### 体型尺码 · `measurements`（16 项）
高度、重量、肩宽、胸/腰/臀围、鞋码、头身比、身材与站姿。厘米为单位，三围是围度不是图片的像素宽。

字段：`heightCm` · `weightKg` · `headBodyRatio` · `shoulderWidthCm` · `chestCircumferenceCm` · `waistCircumferenceCm` · `hipCircumferenceCm` · `torsoLengthCm` · `armSpanCm` · `inseamCm` · `shoeSize` · `bodyBuild` · `bodyMassDescription` · `posture` · `handDominance` · `gait`

### 骨架体表 · `anatomy`（18 项）
胸廓、腰胯、肢体、皮肤、痣、胎记、疤痕与左右不对称；遵从已确认的可见外貌。

字段：`headShape` · `shoulderSlope` · `torsoDepth` · `ribcageContour` · `waistContour` · `pelvisAndHips` · `backContour` · `bustThroughClothing` · `limbProportions` · `handShape` · `skinUndertone` · `skinTexture` · `scars` · `birthmarks` · `moles` · `freckles` · `postureAsymmetry` · `mobilityNeeds`

### 面部五官 · `face`（22 项）
脸型、五官位置、眉眼形、眼距、眼角、虹膜、瞳孔、眼色 HEX、鼻唇耳与默认神情。

字段：`faceShape` · `forehead` · `cheekbones` · `jawline` · `chin` · `noseBridge` · `noseTip` · `mouthShape` · `lips` · `teeth` · `ears` · `eyebrows` · `eyelidShape` · `eyeShape` · `eyeSpacing` · `eyeCornerAngle` · `eyeColor` · `eyeHex` · `pupilColor` · `eyeHighlights` · `eyelashes` · `defaultExpression`

### 头发识别 · `hair`（16 项）
发色 HEX、纹理、长度、刘海、发旋、马尾根部、马尾数量、发饰方向、后视剪影。

字段：`hairBaseColor` · `hairHex` · `hairHighlights` · `hairLength` · `hairTexture` · `hairDensity` · `parting` · `bangs` · `sidelocks` · `ponytailCount` · `ponytailPosition` · `ponytailLength` · `hairAccessories` · `accessorySide` · `accessoryPosition` · `backSilhouette`

### 服装形象 · `wardrobe`（20 项）
制服、领口、纽扣、褶线、袜鞋、颜色材质、换装、道具归属；动态物件不要画死。

字段：`outerwear` · `shirt` · `blouse` · `neckwear` · `skirt` · `trousers` · `socks` · `footwear` · `garmentLayerOrder` · `paletteHex` · `fabrics` · `sewingDetails` · `pleats` · `buttons` · `pockets` · `wearCondition` · `seasonalVariants` · `occasionVariants` · `permanentAccessories` · `temporaryProps`

### 性格与情绪 · `temperament`（18 项）
锁定的人格关键词与待定辅助特质必须分开，不能从“冷淡”自动推断恶毒或恐惧。

字段：`coreConfirmedTraits` · `proposedTraits` · `strengths` · `weaknesses` · `socialEnergy` · `humorStyle` · `conflictStyle` · `fears` · `angerTriggers` · `stressResponse` · `defenseMechanism` · `moralLimits` · `goals` · `contradictions` · `publicPersona` · `privatePersona` · `emotionalBaseline` · `expressionRange`

### 内心世界 · `psychology`（13 项）
目标、矛盾、信念、心理秘密、成长弧线与重大转变，未经剧情批准保持空白。

字段：`innerNeed` · `externalGoal` · `secretGoal` · `belief` · `selfImage` · `insecurities` · `regrets` · `traumaIfStoryApproved` · `attachmentStyle` · `trustPattern` · `breakingPoint` · `growthArc` · `values`

### 台词语音 · `dialogue`（16 项）
音色语速、停顿、习惯用语、毒舌强度、口音、示例台词、禁用写法。

字段：`voicePitch` · `voiceTimbre` · `speechRate` · `voiceVolume` · `tone` · `accents` · `diction` · `sentenceLength` · `vocabulary` · `habitualPhrases` · `sarcasmLevel` · `laughStyle` · `cryingStyle` · `speechUnderStress` · `dialogueExamples` · `forbiddenVoicePatterns`

### 习惯与举止 · `behavior`（17 项）
默认表情、手势、站姿、走路、重心、睡眠、饮食、兴趣、日常时间表。

字段：`idlePose` · `signatureGesture` · `greetingHabit` · `gazePattern` · `blinkHabit` · `eyebrowMotion` · `headTilt` · `walkCycle` · `runningCycle` · `nervousTics` · `sleepRhythm` · `eatingStyle` · `favoriteFoods` · `hobbies` · `dailyRoutine` · `timeManagement` · `transportation`

### 人际关系 · `relationships`（12 项）
亲属、朋友、竞争、导师、恋爱、人际关系强度及随剧情变化的标记。

字段：`familyRelations` · `schoolRelations` · `friendRelations` · `rivalRelations` · `mentorRelations` · `romancesIfStoryApproved` · `relationshipToProtagonist` · `relationshipToMaleLead` · `trustFlags` · `secretsShared` · `conflictHistory` · `relationProgression`

### 技能与状态 · `skills`（15 项）
能力、知识、特长、弱点、体力与游戏数值，不能单凭制服推断超自然力量。

字段：`talents` · `weaknesses` · `learnedSkills` · `academicSkills` · `workSkills` · `combatAbility` · `physicalEndurance` · `agility` · `perception` · `charisma` · `supernaturalPowers` · `powerCosts` · `equipment` · `inventory` · `healthIfStoryApproved`

### 剧情时间轴 · `story`（13 项）
首次出现、事件、秘密、选择分支、结局、多角色时间线，不剧透不存在的定稿。

字段：`firstAppearance` · `locationEntrances` · `originStory` · `incitingEvent` · `keyScenes` · `storyGoals` · `branchingChoices` · `secrets` · `reveals` · `relationshipEvents` · `questEvents` · `alternateEndings` · `chronologicalHistory`

### 生活环境 · `environment`（10 项）
住宅、教室、店铺、环境偏好、物品归属及 NPC 出入场景的状态规则。

字段：`home` · `school` · `workplace` · `roomOwnership` · `itemOwnership` · `furnitureConditions` · `weatherResponse` · `locationsVisited` · `npcSchedule` · `worldEra`

### 立绘原画 · `visualProduction`（24 项）
正侧背原画、视角、剪影、提示词全文、模型 LoRA 版本、seed、分辨率、图片授权与哈希。

字段：`frontReference` · `backReference` · `sideReference` · `threeQuarterReference` · `poseReference` · `expressionReferences` · `silhouetteLocked` · `colorPalette` · `artStyle` · `imageAspectRatio` · `whiteBackgroundRule` · `fullBodyRule` · `centeredRule` · `occlusionRule` · `promptPositive` · `promptNegative` · `modelVersion` · `artistTag` · `lora` · `seed` · `sampler` · `resolution` · `sourceFileHash` · `assetApproval`

### L2D动态分层 · `rigging`（22 项）
L2D/Spine/PSD 的分层树、关节锚点、物理参数、眨眼/口型、动作范围、碰撞与性能。

字段：`layerSource` · `layerList` · `headJoint` · `neckJoint` · `shoulderJoint` · `elbowJoint` · `wristJoint` · `hipJoint` · `kneeJoint` · `ankleJoint` · `eyeTrack` · `blink` · `mouthShapes` · `hairPhysics` · `clothPhysics` · `breathingPhysics` · `skinningLimits` · `expressionStates` · `actionStates` · `runtimePreview` · `occlusionRepair` · `qaAnimation`

### 声音表演 · `audio`（8 项）
配音声线、读音、语种、脚步及衣料音效。

字段：`voiceCasting` · `pronunciation` · `multilingualNotes` · `recordedVoices` · `footstepSfx` · `costumeSfx` · `voiceVolume` · `ambienceRules`

### 游戏交互 · `gameplay`（14 项）
行动日程、对话树、关系值、触发事件、存档标记、玩家交互与渲染层。

字段：`npcSchedule` · `dialogueTree` · `affinity` · `trust` · `playerControl` · `interactRange` · `characterSelection` · `sceneLayers` · `collisionBounds` · `saveFlags` · `choiceTriggers` · `npcBrain` · `flagsVariables` · `inventoryRules`

### 验收测试 · `quality`（16 项）
头脸一致性、三视角、全身不裁切、五指、脚底、色板、来源一致性和动画 QA。

字段：`originalityCheck` · `similarityCheck` · `faceConsistency` · `hairSideCheck` · `visualIdentityCheck` · `handsCheck` · `feetCheck` · `fullBodyCheck` · `measurementProvenanceCheck` · `outfitCheck` · `sourceRightsCheck` · `rigCheck` · `poseCheck` · `screenshotCheck` · `approvalRecord` · `rollbackReference`

### 版本与来源 · `provenance`（12 项）
哪一个字段由用户确认、原画证据、暂定、拒绝、修订记录、日期与审核意见。

字段：`createdAt` · `updatedAt` · `userConfirmedFields` · `sourceCitations` · `proposedFields` · `unknownFields` · `rejectedFields` · `revisionHistory` · `authorReviewer` · `approvedBy` · `permissions` · `historyNotes`

## 个体人设表填写格式与校验
每位角色各建一份 `CHAR-XXX.profile.json`：完整保留上述字段；字段格式统一为 `{ "value": null, "status": "unknown", "source": null, "notes": null }`。即便某项与该角色无关，也填 `not_applicable`，不把字段删除。
每位角色另有一份可读 Markdown 正文，说明设计动机、可辨外貌、性格冲突、台词、具体动作、剧情进度及已批准资产。机器档用于查漏/一致性，Markdown 用于画师与策划实际阅读。
**版本原则：** 新候选先记录，审批通过再锁定；新增正背面或改人物五官、三围、年龄、发饰侧别都写版本记录；不能重画一张看似相似的 AI 图替换历史母版。

## 已有角色对照
- [CHAR-001 女主角资料](CHAR-001_PROTAGONIST_PROFILE.md)：性格「毒舌、冷淡」已确认；具体身材数值仍属于此前方案；最新用户女主 Anima Prompt 的年龄 18 岁、灰紫眼与仓库旧版 17 岁、灰褐眼存在版本差异，须标记冲突而不是静默选一个。
- [CHAR-002 女二候选资料](CHAR-002_CANDIDATE.md)：单马尾、活泼、略矮为确定方向；155cm、46kg、胸80/腰62/臀86、栗棕发与琥珀眼等为待审的草案。
- 后续其他角色复制标准模板并分配不重复 ID，严禁再把正背面、同角色换装、场景人物当新角色。

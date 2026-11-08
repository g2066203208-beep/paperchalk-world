> **更正（2026-11-08）：所有普通路人，包括已批准的灰发老爷爷 NPC-M003，都归入统一 [civilians 图鉴](civilians/README.md) / [JSON 名册](civilians/gallery.v1.json)。** M003 的原图、四个姿态和透明精灵仍沿用本站旧资源路径，旧地铁图鉴只供兼容读取，**不是不同种类的 NPC**。新绘制路人默认三视图；已批准的 M003 四视图不动。C001～C004 四张原始三视图 PNG 已全部真实上传 GitHub，并与现有 M003 老爷爷一起通过 [五名路人图鉴](civilians/README.md) 管理；自动校验通过。仅 C001～C004 透明拆图、交流/休息/死亡状态和游戏运行时接入仍待完成。

> **当前提示词来源：** [LEFT / CENTER / RIGHT 人物三视图，以及右侧追加特色待机的四视图（2026-11-08）](../../../docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。普通路人以用户已认可的三视图单行提示结构为基准；需要第四格时只在最右增加纯正面的可持续生活待机。**本文件后面的 M001/M002 V6/V2 是未出图的旧人物待办，不再是新路人默认提示词。M003 已批准美术保持不动。**

# 地铁路人 NPC 人物集 — 四格标准 (2026-11-08)

**统一规则：第一格纯正面静止站姿、第二格严格 90° 左侧面静止站姿、第三格纯背面静止站姿、第四格专属生活动作（默认纯正面）。前三格不是行走帧。** 四格必须同一人的发型、脸、身材、外套、内搭、裤子、鞋子完全一致，不能每格单独换衣服。第四格不是背面，也不能出现椅子、站台、车厢等环境或道具（手持的报纸、手机等该动作必要道具除外）。

## 当前人物图鉴

| ID | 人物/生活状态 | 图片审核 | Anima 四格正式提示词 | 运行时 |
| --- | --- | --- | --- | --- |
| NPC-M001 | 普通年轻男性 · 下班乘车时坐着打瞌睡（四格无眼睛） | **原三视图废止；四格待 Anima 重画** | [M001 v6 无眼睛、正侧背统一站姿、第四格坐着打瞌睡](metro-commuter-npc-m001-four-pose-draft.v6.json) | 禁止旧素材上线 |
| NPC-M002 | 普通成年女性 · 低头看手机 | **原三视图废止；四格待 Anima 重画** | [M002 v2](metro-commuter-npc-m002-four-pose-draft.v2.json) | 禁止旧素材上线 |
| NPC-M003 | 灰白发老爷爷 · 正面坐着看报纸 | **四格已批准，原图及五份透明 PNG 已入 GitHub** | [M003 用户原文提示词](../../../docs/NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md) · [档案](metro-commuter-npc-m003.v2.json) | 美术已准备，游戏行为/渲染尚未接入 |

**程序可读图鉴：** [metro-character-gallery.v1.json](metro-character-gallery.v1.json)

**当前新 NPC 的唯一提示词范本：** [LEFT / CENTER / RIGHT 三视图及四格新增待机](../../../docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。[M001 V6 旧候选](../../../docs/NPC-M001_ANIMA_FOUR_POSE_NO_EYES_V6_20261108.md)及 M002 V2 保留为未批准人物档案，**不再作为新图提示词的默认入口**。 [老爷爷 M003 开发复盘](../../../docs/NPC_FOUR_POSE_DEVELOPMENT_WHITEPAPER_V1_20261108.md)为历史纠错参考。

## NPC-M003 用户已批准的 Anima 画作

- 会话原图：`tmp9006p_bo.png`，1472 × 1024，RGB；真实文件 SHA-256：`0a55af227d55b126d1fd37e4209eef50322d99c99e2f690be8c19fc9519701ba`。
- 四格：纯正面站立 → 90° 左侧面站立 → 纯背面站立 → 正面坐姿看报。
- 深炭灰夹克、棕色 V 领针织背心、浅米色衬衫、深蓝黑色裤子、黑皮鞋，全部四格统一。
- **真实 GitHub 资产：** [已批准的原图（RGB PNG）](../../assets/characters/metro/npc-m003/approved-four-poses.png)、[透明 RGBA 四格图集](../../assets/characters/metro/npc-m003/four-pose-atlas-rgba.png)、[纯正面站姿](../../assets/characters/metro/npc-m003/front-standing.png)、[严格侧面站姿](../../assets/characters/metro/npc-m003/side-standing.png)、[背面站姿](../../assets/characters/metro/npc-m003/back-standing.png)、[纯正面坐着看报](../../assets/characters/metro/npc-m003/special-front-seated-reading.png)。原图 SHA-256 与 `metro-commuter-npc-m003.v2.json` 一致，四格成品各 416×1024，图集 1664×1024，RGBA Alpha 已检查。
- **状态严格区分：** 图片已经真正提交到 GitHub，但还未接入站台 NPC 渲染和行为状态机，不得声称游戏已经出现 M003。已有旧程序 SVG 群众是历史占位，不是用户批准的人物。
- 原图保留为白底 RGB，派生的五份透明图已生成并入 GitHub，不能混用。使用正式素材前仍需在游戏里校验脚底锚点、透视比例及动作切换；不用画出座椅，因为地铁座椅由游戏的真实 3D 模型承担。

## M001 / M002 修订要求

- 老三视图格式已经被用户明确废止，原 `metro-commuter-npc-m001.v1.json` 和 `metro-commuter-npc-m002-draft.v1.json` 已从活动图鉴删除。
- 两人外貌保持此前分别已认可的身份设计：M001 黑短发、深蓝夹克、米白 T 恤、炭灰裤、灰白运动鞋；M002 棕色中短发、米色开衫、灰蓝 T 恤、藏蓝长裤、白运动鞋。
- M001 第四格 V6 提案：严格正面坐着打瞌睡，头轻低、双手在膝腿上、无可见眼睛，保持同一夹克裤鞋，不增加道具（待用户审核）；M002 第四格：正面手持手机阅读。若后续用户选择不同特殊动作，修改第四格而不影响前三格。
- 每个 JSON 文件的 `production.positivePrompt` / `negativePrompt` 包含**可以直接复制到 Anima 的完整英文提示词**，无需自行拼接。
- 同人跨动作身份稳定性：在 Forge Neo 已确认的 Anima Base、`@akipekostyle<lora:akipekoanima_v1_1:0.65>` 基础上，若单次四格出图换脸换衣，应逐格以**本 NPC 自己的原图**作 ImageStitch 参考重画；pilot 专用 LoRA `<lora:anima_ref_adapter_pilot_r32:1>` 只能在正确配置的参考适配器中用，不能当普通风格 LoRA。
- Anima 模型提示词不能保证直接输出 RGBA。真正透明需要 PNG Alpha 检查。无原图时只登记待画，不能拿程序绘制的占位角色伪装成完成。

## 活着的乘客，而非站桩

NPC 的四格是基础美术，真正进入游戏仍需要动作层和时间、身份驱动。候车、上车、下车、看手机、打盹、读报、聊天、打闹、听歌、照顾小孩、推行李等活动，由**各自的行为动机与事件**触发；无需让每个人都有所有动作。站台空间、人群与车门用同一 3D 坐标和时间推进，禁止随机瞬移、无条件穿门、无休止重复同时做一件事。校园学生、普通工人、老人、亲子、游客要根据时间段出现，年龄及常见职业覆盖逐步扩充。

## 一人一生活、一人一神态

前三格用于无动作方位标定；第四格必须源于这个人的实际生活、性格、表情、惯性动作和独有道具，不得把全体 NPC 都安排成相同坐姿、手机、打盹模板。M003 老人读报已批准；M001 坐着打瞌睡是**待审核人物提案**；M002 看手机尚待补充独特性格、消息内容诱因及表情小动作。不同身份不能由 AI 擅自推断确定职业/住址/上车线路；人物生活提案与游戏时空归属保持分离。

**2026-11-08 最后纠错：** M001 V3–V5 的长篇描述、揉颈哈欠与第四格换衣倾向已废弃。依 [M001 V6](../../../docs/NPC-M001_ANIMA_FOUR_POSE_NO_EYES_V6_20261108.md) 执行：四格无眼睛；前三格同一中性站姿只换朝向；第四格正面坐着打瞌睡，不画椅子，不换装。前三格严禁揉颈、抬手、歪姿。第四格个性动作是**每个 NPC 独立设计**而不是全部随机复制。

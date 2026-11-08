# 地铁路人 NPC 人物集 — 四格标准 (2026-11-08)

**统一规则：第一格纯正面静止站姿、第二格严格 90° 左侧面静止站姿、第三格纯背面静止站姿、第四格专属生活动作（默认纯正面）。前三格不是行走帧。** 四格必须同一人的发型、脸、身材、外套、内搭、裤子、鞋子完全一致，不能每格单独换衣服。第四格不是背面，也不能出现椅子、站台、车厢等环境或道具（手持的报纸、手机等该动作必要道具除外）。

## 当前人物图鉴

| ID | 人物/生活状态 | 图片审核 | Anima 四格正式提示词 | 运行时 |
| --- | --- | --- | --- | --- |
| NPC-M001 | 普通年轻男性 · 下班后坐着打瞌睡 | **原三视图废止；四格待 Anima 重画** | [M001 v2](metro-commuter-npc-m001-four-pose-draft.v2.json) | 禁止旧素材上线 |
| NPC-M002 | 普通成年女性 · 低头看手机 | **原三视图废止；四格待 Anima 重画** | [M002 v2](metro-commuter-npc-m002-four-pose-draft.v2.json) | 禁止旧素材上线 |
| NPC-M003 | 灰白发老爷爷 · 正面坐着看报纸 | **四格已批准，原图及五份透明 PNG 已入 GitHub** | [M003 v2](metro-commuter-npc-m003.v2.json) | 美术已准备，游戏行为/渲染尚未接入 |

**程序可读图鉴：** [metro-character-gallery.v1.json](metro-character-gallery.v1.json)

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
- M001 第四格建议：正面坐着打盹；M002 第四格：正面手持手机阅读。若后续用户选择不同特殊动作，修改第四格而不影响前三格。
- 每个 JSON 文件的 `production.positivePrompt` / `negativePrompt` 包含**可以直接复制到 Anima 的完整英文提示词**，无需自行拼接。
- 同人跨动作身份稳定性：在 Forge Neo 已确认的 Anima Base、`@akipekostyle<lora:akipekoanima_v1_1:0.65>` 基础上，若单次四格出图换脸换衣，应逐格以**本 NPC 自己的原图**作 ImageStitch 参考重画；pilot 专用 LoRA `<lora:anima_ref_adapter_pilot_r32:1>` 只能在正确配置的参考适配器中用，不能当普通风格 LoRA。
- Anima 模型提示词不能保证直接输出 RGBA。真正透明需要 PNG Alpha 检查。无原图时只登记待画，不能拿程序绘制的占位角色伪装成完成。

## 活着的乘客，而非站桩

NPC 的四格是基础美术，真正进入游戏仍需要动作层和时间、身份驱动。候车、上车、下车、看手机、打盹、读报、聊天、打闹、听歌、照顾小孩、推行李等活动，由**各自的行为动机与事件**触发；无需让每个人都有所有动作。站台空间、人群与车门用同一 3D 坐标和时间推进，禁止随机瞬移、无条件穿门、无休止重复同时做一件事。校园学生、普通工人、老人、亲子、游客要根据时间段出现，年龄及常见职业覆盖逐步扩充。

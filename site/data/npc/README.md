# 地铁路人 NPC 美术库 / Metro Background NPCs

全体普通路人必须以 **Anima 出图 + 用户确认** 作为身份母版；程序生成的简易剪影、旧 SVG 通勤者测试稿不得冒充正式 NPC。

| ID | 定位 | 视觉定稿 | 动作母图 | 游戏上线 |
| --- | --- | --- | --- | --- |
| NPC-M001 | 普通年轻男通勤者 · 深蓝夹克 | **用户已确认 2026-11-08** | 待按已批准母图绘制 | 待正式 PNG 入库、拆视角和透明化 |
| NPC-M002 | 普通女性通勤者 · 低头看手机 | 提示词草案 | 待生成/审核 | 未上线 |

## 母版与正确归档

- `metro-commuter-npc-m001.v1.json`: NPC-M001 用户批准的视觉身份、原始会话图片文件名、256-bit SHA、服装、面容和行动习惯。
- `metro-commuter-npc-m002-draft.v1.json`: 下一位 NPC 的三视图官方格式英文 Prompt 和单独候车行为规划；**不是批准的图片**。
- NPC-M001 会话图：`tmpmcdsdrcw.png`，1024×1024 RGB 三视图，SHA256 `382e8b126169f50a9d1b161fff24cca342e3412c9eb3633e4904b9ce4cd4da6d`。
- 预定正式资产地址：`site/assets/characters/metro/npc-m001/turnaround-master.png`，**原始二进制尚未入 GitHub**。仓库连接器支持文本写入和 base64 blob，但没有通过当前对话上传图片到 blob 的直接文件传输方式；不能把记录文件假称为原画已上传。
- 导入原画后，先校验 SHA，再分离正/左侧/背，保留原件。需要真正 Alpha，不能把白色 RGB 背景当透明。
- 人物日常行动必须具备“动机、行为、转场触发、微动作、情绪”，而非重复站桩。事件来自停车、开门、广播、路线、乘客座椅和玩家接近等；动作不得穿过门/乘客/站台边缘。
- 参考适配器仅用于有原图时保持相貌的多动作扩展：`<lora:anima_ref_adapter_pilot_r32:1>` + ImageStitch 原图；常用画风 `@akipekostyle<lora:akipekoanima_v1_1:0.65>`。不要把 pilot 当纯美化 LoRA。

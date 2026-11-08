# 路人 NPC｜三视图独立人物集

> 本目录与剧情人物 CHAR 系列、旧地铁乘客 NPC-M003 完全分开，不能互相覆盖。
>
> **2026-11-08 当前状态：三张用户实际 PNG 已在对话中备齐并整理到配套 ZIP，但 GitHub 连接器目前只完成了文本图鉴提交；下述 `three-view-original.png` 若尚不存在于 GitHub，就不能标记为已上传。**

## 人物一览

| 新 ID | 人物 | 三视图原图实际顺序 | 素材状态 |
| --- | --- | --- | --- |
| NPC-C001 | 男性上班族 · 灰色西装 | 侧面 → 正面 → 背面 | 原图已收到，待 PNG 二进制入仓 |
| NPC-C002 | 年轻女性通勤者 · 米色开衫 | 侧面 → 正面 → 背面 | 原图已收到，待 PNG 二进制入仓 |
| NPC-C003 | 年长女性乘客 · 灰色针织衫 | 侧面 → 正面 → 背面 | 原图已收到，待 PNG 二进制入仓 |
| NPC-C004 | 年轻街头男性 · 深绿连帽卫衣 | 尚无出图 | 仅提示词 |

## 素材组织

```text
site/data/npc/civilians/
  README.md
  gallery.v1.json

site/assets/characters/civilians/
  npc-c001/three-view-original.png
  npc-c002/three-view-original.png
  npc-c003/three-view-original.png
```

上方的三个 PNG 是**计划入库的精确路径**，不是已上传证明。图片真实格式为 **1024×1024、RGB、白底**，以后再做无损留档、真正透明 RGBA 和单个方向裁切。所有三张图的实际布局都是 **左纯侧面、中正面、右背面**；不能照 Anima 正向提示词的 LEFT=front 假定裁切顺序。

## 资产包导入

从同一次对话里取得 `npc-civilians-source-images-20261108.zip`，将 ZIP 中的 `site/assets/...` 目录合入仓库根目录，**不得压缩或重绘原始 PNG**。提交后运行：

```bash
python3 scripts/validate_civilian_npc_sources.py
```

脚本会验证原始图是否存在、SHA256 是否与图鉴一致、是否正好为 1024×1024 RGB。若没有实际文件，校验必须失败，不准把文档记录冒充游戏已就绪素材。

## 流程与后续

1. 每人独立三视图作为 **img2img 身份母图**；后三张状态图分别为交流、休息、死亡，按人物独立设计姿态与朝向，不给所有人统一模板。状态图待生成，不在本次伪造。
2. 实际 NPC 身高在游戏演员数据里以独立世界单位登记，不在 Anima Prompt 中写厘米当作可靠比例控制。
3. 不因为三视图原图存在就自动将 NPC 注册到运行时或给它随机车站。游戏的生活轨迹与出场地点由独立场景归属规则控制。
4. 正向、负向标准以 [Anima 官方规则](../../../../docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)、[项目 LEFT/CENTER/RIGHT 范本](../../../../docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md) 为准。源图实际摆放位置以本图鉴为准。

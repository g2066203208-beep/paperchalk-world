# 普通路人 NPC｜统一人物集

> **所有日常路人（地铁、街头、商场等）归入同一类型。已批准的老爷爷 `NPC-M003` 也是普通路人，不是独立于路人的特殊剧情人物。**
>
> 人物可复用既有素材和编号，禁止复制已批准 PNG、迁移文件目录、随意覆盖已有身份。剧情主角与主要角色（CHAR 系列）另外管理。

## 图鉴

| ID | 人物 | 已有美术 | 三视图实际顺序 | 运行时 |
| --- | --- | --- | --- | --- |
| `NPC-C001` | 灰西装男性上班族 | 用户已上传 RGB 原图；GitHub PNG 尚待上传 | 左侧面 → 正面 → 背面 | 未实装 |
| `NPC-C002` | 米色开衫年轻女性 | 用户已上传 RGB 原图；GitHub PNG 尚待上传 | 左侧面 → 正面 → 背面 | 未实装 |
| `NPC-C003` | 深灰针织衫年长女性 | 用户已上传 RGB 原图；GitHub PNG 尚待上传 | 左侧面 → 正面 → 背面 | 未实装 |
| `NPC-M003` | **灰发老爷爷，坐地铁看报** | **已批准四视图，原图与 RGBA 精灵已在 GitHub** | 正面 → 左侧面 → 背面 → 正面坐着看报 | 未实装 |
| `NPC-C004` | 深绿色连帽衫年轻男性 | 用户最新候选存在发型/光影不一致，**尚未批准** | 待审核 | 未实装 |

**机器图鉴：** [gallery.v1.json](gallery.v1.json)。NPC-M003 通过唯一 `canonicalRecord` 链接老档案 `site/data/npc/metro-commuter-npc-m003.v2.json`，不是多造一个老爷爷。旧 `metro-character-gallery.v1.json` 仍可给旧模块查找，但它也是路人类型的历史索引，不能当成另一组人物。

## 已批准 M003 的唯一真实素材

- 原图：[approved-four-poses.png](../../../assets/characters/metro/npc-m003/approved-four-poses.png)
- 透明图集：[four-pose-atlas-rgba.png](../../../assets/characters/metro/npc-m003/four-pose-atlas-rgba.png)
- 单独动作：[front-standing.png](../../../assets/characters/metro/npc-m003/front-standing.png)、[side-standing.png](../../../assets/characters/metro/npc-m003/side-standing.png)、[back-standing.png](../../../assets/characters/metro/npc-m003/back-standing.png)、[special-front-seated-reading.png](../../../assets/characters/metro/npc-m003/special-front-seated-reading.png)

**M003 老爷爷已有四格，不因新 NPC 默认三视图而删第四格。** 以后统一追加 img2img 交流/休息/死亡状态；老爷爷已有坐着看报动作，可作为现有休息姿态；交流和死亡状态尚未画。

## 新三位路人的素材计划

```text
site/assets/characters/civilians/
  npc-c001/three-view-original.png  # 待 GitHub 二进制提交
  npc-c002/three-view-original.png  # 待 GitHub 二进制提交
  npc-c003/three-view-original.png  # 待 GitHub 二进制提交

site/assets/characters/metro/npc-m003/
  approved-four-poses.png            # 已在 GitHub，保持不动
  four-pose-atlas-rgba.png           # 已在 GitHub，保持不动
  front-standing.png
  side-standing.png
  back-standing.png
  special-front-seated-reading.png
```

新三位的 RGB 原图为 1024×1024，真实布局是**侧面→正面→背面**。必须依照原图实际顺序裁切，不允许以提示词顺序替代图像顺序。白底不代表真透明，游戏注册前需验证 RGBA、投影脚底锚点和角色个人实际身高。

已准备 `npc-civilians-source-images-20261108.zip` 对话素材包，仍需将其中三张 PNG 二进制上传 GitHub 才能变为正式资源。使用 `python3 scripts/validate_civilian_npc_sources.py` 核对；该校验也会验证已有 M003 的原图 SHA。**图鉴文件存在不等于对应新 PNG 已经提交。**

## 制作与演出

- 新普通路人首张出图只画**三视图**。以 [LEFT/CENTER/RIGHT 模板](../../../../docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md) 为生产规范；旧已批准四视图保留原状。
- 同一人物正侧背发型/服装必须统一；禁止预烘焙强定向光、重暗面、发丝亮斑或强投影。默认阴天均匀漫射光，游戏灯光与阴影在运行时处理。
- img2img 状态：交流、休息、死亡，每个人单独设计姿态和朝向。不凭描述冒充实际已画出状态。
- NPC 在游戏内的实际位置/交通归属必须通过独立生活路径和资格校验；**美术存在不能直接刷人**。

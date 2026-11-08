> **2026-11-08 第一轮路人正式场景测试已建成。** 用户选择的 C001–C006、SG01 及 M003 共 **8 个独立身份**，其中 **7 个 1024×1024 RGB 三视图原件已自动拆成 21 个真实透明 RGBA 方向精灵**，M003 沿用已批准透明姿势。首次浏览器 QA 在真实 Chromium 桌面/手机运行，并检查了场景许可、三视切换与透明贴图。这里的“游戏注册”指 **试运行可出场**，不等同于动态行走帧、交谈/休息/死亡状态已经全部制作。SG03 眼镜妹已跳过且不在试运行名单内。
>
> **直接试用：** [游戏路人测试场景](../../../npc-test/index.html) ｜ [独立正式美术清单](../production-manifest.v1.json) ｜ [实际身份与允许场景](../scene-assignments.v1.json) ｜ [透明精灵重建代码](../../../../scripts/build_civilian_game_sprites.py) ｜ [真实浏览器测试](../../../../tests/npc-civilian-browser.mjs)。

# 路人 NPC｜统一人物图鉴（已入库七人）

**2026-11-08：现已入库七名路人（含女主学校第一位学生妹），六张新三视图 PNG 与老爷爷已批准 PNG 都在 GitHub。** 与剧情主要角色（CHAR 系列）分开管理；老爷爷 M003 本来就属于**路人 NPC**，保留原编号与其经过批准的四视图、RGBA 图集和单姿态精灵。不得重复导入/重命名他的旧资产。

## 已入库的七名路人

| NPC ID | 人物 | 原始 PNG（GitHub 实际文件） | 视图顺序 | 状态 |
| --- | --- | --- | --- | --- |
| NPC-C001 | 男性上班族，灰色西装 | [three-view-original.png](../../../assets/characters/civilians/npc-c001/three-view-original.png) | 左侧面→正面→背面 | 已上传 RGB 原图，待 RGBA 和表演状态 |
| NPC-C002 | 年轻女性通勤者，米色开衫 | [three-view-original.png](../../../assets/characters/civilians/npc-c002/three-view-original.png) | 左侧面→正面→背面 | 已上传 RGB 原图，待 RGBA 和表演状态 |
| NPC-C003 | 老奶奶，深灰针织衫 | [three-view-original.png](../../../assets/characters/civilians/npc-c003/three-view-original.png) | 左侧面→正面→背面 | 已上传 RGB 原图，待 RGBA 和表演状态 |
| NPC-C004 | 年轻街头男性，深绿连帽卫衣 | [three-view-original.png](../../../assets/characters/civilians/npc-c004/three-view-original.png) | 左侧面→正面→背面 | **用户认可最终修正版**，已上传 RGB 原图，待 RGBA 和表演状态 |
| NPC-M003 | 老爷爷，地铁看报 | [approved-four-poses.png](../../../assets/characters/metro/npc-m003/approved-four-poses.png) | 正面→左侧面→背面→坐着看报 | **用户已批准，RGB 原图及所有透明 RGBA 精灵均已入 GitHub** |
| NPC-C005 | 中年女性，酒红毛衣橄榄绿裙 | [three-view-original.png](../../../assets/characters/civilians/npc-c005/three-view-original.png) | 左侧面→正面→背面 | 已上传 RGB 原图，待视觉验收及 RGBA/表演状态 |
| NPC-SG01 | 学校三人队①，高马尾娇小手机女生 | [three-view-original.png](../../../assets/characters/civilians/schoolgirls/sg01/three-view-original.png) | 左侧面→正面→背面 | **用户认可三视图母图，已实传原始 RGB PNG**；待透明与 img2img 状态 |

> NPC-C005 的完整 [Anima 原提示词](../../../../docs/NPC-C005_ANIMA_THREE_VIEW_MIDDLE_AGED_WOMAN_20261108.md) 与用户实际三视图 PNG 均已保存，图像尚未单独宣布为已通过全部美术验收。

## 正式保存位置

```text
site/data/npc/civilians/
  README.md
  gallery.v1.json                    # 五人单一身份索引；真实资源路径、SHA、身份和制作状态

site/assets/characters/civilians/
  npc-c001/three-view-original.png   # 678018 字节 RGB PNG
  npc-c002/three-view-original.png   # 733253 字节 RGB PNG
  npc-c003/three-view-original.png   # 636544 字节 RGB PNG
  npc-c004/three-view-original.png   # 668427 字节 RGB PNG
  npc-c005/three-view-original.png   # 585412 字节 RGB PNG
  schoolgirls/sg01/three-view-original.png  # 623012 字节 RGB PNG
  npc-front-comparison-20261108.png  # 六人正面全身高清对照图
  npc-front-comparison-20261108.jpg  # 同内容高清预览图

site/assets/characters/metro/npc-m003/  # 已批准老爷爷，沿用原目录，不复制二进制
  approved-four-poses.png
  four-pose-atlas-rgba.png
  front-standing.png
  side-standing.png
  back-standing.png
  special-front-seated-reading.png
```

六个新 PNG 均按用户提交的原始字节写入 GitHub，**与本次源文件 Git Blob SHA 和 SHA-256 双重匹配**；没有使用 Canva 缩略图、改变尺寸或重新压缩。六个新源图均为 **1024×1024、RGB、白色背景**。M003 为 1472×1024 四视图，除已有 RGBA 精灵之外保持不动。

## 视图约定（十分重要）

当前 C001-C005、SG01 用户实际成品的左右顺序为 **侧面 / 正面 / 背面**；而 Anima 提示词基准期望 **正面 / 侧面 / 背面**。**程序裁切应读取 gallery.v1.json 内的 `source.actualImageLeftToRight`，不得猜测生成顺序，也不要把左侧面当成正面。**

白底 RGB **不能直接**作为透明游戏立绘。图像实际上传并不意味着已经生成切片、RG​​BA、L2D 或游戏中 NPC。正式角色还要验收透明像素边缘、脚底站位、世界身高、场景归属和实际渲染。

## 后续生产

- 新 NPC 先做三视图；同一个 NPC 独立使用自己的母图通过 img2img 制作**交流、休息、死亡**三种状态，每个人设计不同动作和朝向。已有老爷爷坐姿看报属于他的已批准特殊待机动作，不会为匹配新规格删除第四格。
- **默认阴天、均匀漫射光；发型、服装跨视角一致；不烘焙硬阴影、反光或环境光源。** 具体规范： [Anima 官方整理](../../../../docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md)、[项目模板](../../../../docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)。
- 各路人实际身体高度独立登记为游戏单位，不以 `160 cm` 等 Anima 文字生成身高。不要自动安排全部 NPC 在同一车站出场。
- 校验原图与全部 GitHub 文件：`python3 scripts/validate_civilian_npc_sources.py`。
- 兼容目录 `site/data/npc/metro-character-gallery.v1.json` 仅供原有 M001-M003 数据使用，**不是排除老爷爷的独立路人集合**。

## 学校学生妹三人组

- [学校三人队独立目录](school-trio/README.md)：**SG01 已上传原始三视图 PNG**；**SG02 黑皮辣妹有用户认可候选图，但原始 PNG 尚未提交 GitHub，不参与当前测试**；SG03 因眼镜/眼睛问题暂时跳过。
- SG01 的实际图序是左侧面／中正面／右背面；不要误用此前模板期望的左正面／中侧面／右背面来自动切片。
- 学校统一校服，SG02 的不规矩穿法仍须保留长酒红领带、两颗深暖灰棕圆扣与校服的基本结构。新学校学生 LoRA 1.0。

## 六位原有市民正面统一对照

- [六人正面高清 PNG](../../../assets/characters/civilians/npc-front-comparison-20261108.png)
- [六人正面高清 JPG 预览](../../../assets/characters/civilians/npc-front-comparison-20261108.jpg)
- 重建脚本：[scripts/build_civilian_front_comparison.py](../../../../scripts/build_civilian_front_comparison.py)

**顺序：** NPC-M003 老爷爷 → NPC-C003 老奶奶 → NPC-C001 男性上班族 → NPC-C004 年轻男性 → NPC-C002 年轻女性 → NPC-C005 中年女性。**只提取正面，全部按相同展示高度调整并对齐脚底；不可根据这张对照图推断游戏世界身高。** 原始母图保持不变。

### 责任与状态

- 图片上传/索引/源图哈希：完成，七位（六位原市民 + SG01）。
- **透明三视图切片：** C001–C006 和 SG01 的 21 张真实 RGBA 方向精灵已通过构建测试；M003 保留原有 RGBA 四格。**独立 L2D 动态骨骼动画未做。**
- 交流、休息、死亡的 img2img 状态：尚未生成（M003 已有看报坐姿）。
- **游戏 NPC 运行时注册：** 已将 8 个身份写入 production-manifest 并加入独立场景许可表，供现有 persistent NPC life / presence 模块和专用可运行测试场景使用。主游戏各张 3D 地图的最终 NPC 渲染、碰撞和动作编排仍需按场景接入；不要把测试场景说成所有地图已全部布满 NPC。

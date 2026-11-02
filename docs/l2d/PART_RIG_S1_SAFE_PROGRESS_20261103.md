# PartRig S1｜逐部件绑定工作台（非破坏性迭代）

更新时间：2026-11-03。

## 已实现且与旧动画隔离的部分

- 女主托管的 17 正面＋8 背面独立 PNG，按源图 `partId` 配置每一层的独立网格、轴点、末端、变形幅度和速度，坐标沿用原 1024×1024 分层位置。
- 部件映射位于 `site/l2d/part-rig.js`，没有对整张角色合成图做摇摆。每层为独立模型 `model.parts[partId]`。
- 工作室新增 `site/character-editor/part-rig-studio.js`：只有主动点击「逐件绑定」才打开单部件形变预览。背景保留原始 V4/PNG、原始像素修补及历史工作区。
- 当前选中层可调整 `pivot`、`tip`、`motion.x/y`、`motion.angle`、`frequency`，画布支持拖动轴点和末端，并仅显示该层的 ArtMesh 格子。
- 所有新绑骨参数默认 `x=y=angle=0`，静止状态严格重合原图，退出预览恢复原 V4。用户必须明确调节后才发生变形。
- 版本化草稿存储在工作室原有 IndexedDB `paperchalk-dev-characters-v1` 的 `part-rig:<characterId>:<face>` 项中，独立于 `clip`、`skeletal`、`render` 等既有键。
- 「备份绑定 JSON」允许导出当前人物／方向单独的绑定工程。切换人物前强制保存未提交的绑骨参数。
- 常用绘画、橡皮擦、源图层、V4 帧修补及游戏中目前已经认可的角色播放逻辑保持原样，不自动启用草稿。

## 女主真实可编辑部件

正面 17 个：`rear_hair`, `sleeves_and_hands`, `legs`, `shoes`, `neck`, `skirt`, `jacket`, `brows`, `ears`, `face`, `nose`, `mouth`, `hair_clip`, `eye_white`, `irises`, `lashes`, `front_hair`。

背面 8 个：`legs`, `sleeve_left`, `sleeve_right`, `shoes`, `back_hair`, `skirt`, `jacket`, `hair_over_jacket`。

这些明确部件 ID 来自仓库实际 `protagonist-original-parts.zip` 的 `layers.json`，不是名称关键词驱动。用户在浏览器中另存的本地图层调整不在 GitHub 审计范围内。

## 女二的真实状态（不得虚报）

- 此前文档记载女二曾提供正面 1024×1024、16 层 PSD，但二进制 **没有存入当前 GitHub 仓库**。
- 仓库 `site/assets/characters/char-002/front.png` 是合成图；`site/assets/l2d/char-002/front-source-regions.zip` 目前不可从 GitHub 的主分支读取（Studio 仍保留旧版路径引用，需警惕加载失败）。
- 为女二正面 16 种已知真实部件 ID 预置独立绑定结构，但 **不产生假 PSD 素材、不拆平面图冒充原始分层、不复制女主任何贴图**。当其原始独立 PNG/PSD 成功导入并分配正确 ID 后，同一个工作台可以逐部件编辑。
- 女二没有证据支持真实背面 16 层，不能生成或假称已完成。

## 尚未达到最终 Live2D Cubism 类项目的地方

目前这是**可编辑单部件网格绑定草稿 S1**，不是最终完整动画模型；没有完成每顶点手调权重、所有关节的 FK/IK、部件遮罩与 Glue、参数 Keyform、弹簧阻尼物理和完整动画时间轴。原版 V4 **仍是默认游戏动画**。在通过源材实际画面逐件手工验收并明确启用绑定前，不会替换旧 V4。

后续仍须基于真实原画逐件校准：后发发根、裙褶/裙腰、左/右袖、胸腹外套、双眼及遮挡、颈部层次；同一源 PNG 合并的左右手或双眼要在不修改用户原画的前提下设计独立蒙皮区域，不能用全层旋转假冒左右独立。

## 验证

- 单元层检查：女主正面 17 / 背面 8 / 女二正面 16 个 `partId` 映射，位移归零时原坐标无变化。
- Playwright：仅在显式切换试验模式后渲染网格；独立后发移动时外套保持静止，轴点不漂；保存、重新读取、退出恢复原 V4，原 PNG 哈希/像素不受影响。
- 线上入口：[角色 L2D 工作室](https://g2066203208-beep.github.io/paperchalk-world/character-editor/)。

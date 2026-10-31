# Pixel Atelier V1.1 — 全功能状态与验收追踪

最后审计：2026-10-31；目标分支：feature/pixel-atelier-native-p0。此表由 V1.1 规格建立。**PLANNED 明确表示尚未实现，不代表 APK 具备该功能。** 状态更改必须随代码提交、测试证据一起发生。

## 状态规范

- PLANNED：仅需求与实现方案。
- ENGINE_ONLY：可运行核心算法与单测，UI 未接通。
- ENGINE_TESTED：现有纯算法单测通过，未表示 UI 验证。
- UI_WIRED_UNVERIFIED：UI 接入了操作，但未完成真实模拟器/真机验收。
- BUILD_VERIFIED：编译产物和静态元数据验证，通过不等于真机正确。
- TESTED：JVM + 模拟器关键操作验收通过。
- DEVICE_VERIFIED：真实 Android 手机完成手势/保存/性能证据。
- RELEASED：版本发布，证据可追溯。

## 现有验证证据（2026-10-31）

- Android 原生 APK 构建及 JVM 单测成功：https://github.com/g2066203208-beep/paperchalk-world/actions/runs/41206747484
- 最近已有主分支开发提交后的 APK 成功运行：https://github.com/g2066203208-beep/paperchalk-world/actions/runs/41207122540
- Android 模拟器 UI 烟雾测试在既有开发提交上失败，不能声称它成功：https://github.com/g2066203208-beep/paperchalk-world/actions/runs/41207122499
- 后续文档提交触发的构建只证明原来代码是否能继续编译，并不证明新增规格里的工具已实现。

## 功能矩阵

| ID | 功能 | 阶段 | 状态 | 验收证据要求 |
|---|---|---|---|---|
| PA-01-01 | 单格 ARGB 像素数据模型 | P0 | ENGINE_TESTED | point + bounds roundtrip |
| PA-01-02 | Bresenham 直线与连续填点 | P0 | ENGINE_TESTED | eight octants, endpoint coverage |
| PA-01-03 | 油漆桶四邻域填充 | P0 | ENGINE_TESTED | wall stop, same color, 1x1 |
| PA-01-04 | 撤销重做（单笔像素） | P0 | ENGINE_TESTED | pixel diff redo hash |
| PA-01-05 | 基础多层锁定合成 | P0 | ENGINE_TESTED | locked layer + blend |
| PA-01-06 | 铅笔/橡皮/吸管手机 UI | P0 | UI_WIRED_UNVERIFIED | manual touch / emulator |
| PA-01-07 | 矩形/填充矩形手机 UI | P0 | UI_WIRED_UNVERIFIED | bounds + zoom pixel correctness |
| PA-01-08 | 直接/偏移/独立光标触控 | P0 | UI_WIRED_UNVERIFIED | gesture arbitration / pen input |
| PA-01-09 | 双指缩放与平移 | P0 | UI_WIRED_UNVERIFIED | zoom invariant and interruption |
| PA-01-10 | 本地 .pixelatelier v1 工程 | P0 | UI_WIRED_UNVERIFIED | atomic recovery / import v1 |
| PA-01-11 | PNG 导入导出 | P0 | UI_WIRED_UNVERIFIED | pixel roundtrip / alpha |
| PA-01-12 | APK 无互联网权限 | P0 | BUILD_VERIFIED | aapt permissions, airplane mode |
| PA-02-01 | 矩形选区 | P1-A | PLANNED | MASK-001 bbox inclusive/exclusive |
| PA-02-02 | 椭圆选区 | P1-A | PLANNED | MASK-002 ellipse parity |
| PA-02-03 | 自由套索/多边形套索 | P1-A | PLANNED | MASK-003 winding/even odd |
| PA-02-04 | 魔棒与相似色 | P1-A | PLANNED | MASK-004 4/8 neighbors tolerance |
| PA-02-05 | 智能磁性套索 Live Wire | P1-A | PLANNED | MASK-005 anchor and edge path |
| PA-02-06 | 前景背景引导智能选择 | P1-A | PLANNED | MASK-006 correction markers |
| PA-02-07 | 增/减/交/异或/反选 | P1-A | PLANNED | MASK-007 boolean identities |
| PA-02-08 | 选区保存与跨层应用 | P1-A | PLANNED | MASK-008 serialized mask |
| PA-02-09 | 内部复制/剪切/粘贴 | P1-A | PLANNED | CLIP-001 transparent holes |
| PA-02-10 | Android 系统图片剪贴板 | P1-A | PLANNED | CLIP-002 Content URI permissions |
| PA-02-11 | 浮动选区确认/取消 | P1-A | PLANNED | CLIP-003 atomic cut and undo |
| PA-02-12 | 通用操作事务与结构撤销 | P1-A | PLANNED | CMD-001 content+structure rollback |
| PA-02-13 | 工程 schema v2 / v1 迁移 | P1-A | PLANNED | FILE-001 v1 compatibility |
| PA-03-01 | 移动/缩放/镜像/90°旋转 | P1-B | PLANNED | XFORM-001 reversible integer transforms |
| PA-03-02 | 任意角度旋转/最近邻 | P1-B | PLANNED | XFORM-002 inverse mapping |
| PA-03-03 | 错切/透视/网格变形 | P1-B | PLANNED | XFORM-003 cancel + preview |
| PA-03-04 | 椭圆/实心椭圆 | P1-B | PLANNED | GEOM-001 four quadrant parity |
| PA-03-05 | 圆弧/扇形/正多边形 | P1-B | PLANNED | GEOM-002 angle and degenerates |
| PA-03-06 | 二次/三次 Bézier 曲线 | P1-B | PLANNED | GEOM-003 zoom-independent raster |
| PA-03-07 | 可编辑路径节点与柄 | P1-B | PLANNED | GEOM-004 mobile handle accuracy |
| PA-03-08 | 轨迹预测和笔触稳定 | P1-B | PLANNED | INPUT-001 no preview ghosts |
| PA-03-09 | 直尺/圆规/平行/透视辅助 | P1-B | PLANNED | ASSIST-001 guide does not export |
| PA-03-10 | 函数曲线/参数方程 | P1-B | PLANNED | GEOM-005 safe AST sandbox |
| PA-03-11 | 水平/垂直/径向对称 | P1-B | PLANNED | SYM-001 odd/even centers |
| PA-03-12 | 自定义对称轴和镜像阵列 | P1-B | PLANNED | SYM-002 duplicate-hit semantics |
| PA-04-01 | 可定制像素印章画笔 | P1-C | PLANNED | BRUSH-001 bitmap stamp |
| PA-04-02 | 沿路径拉线/图案连续排列 | P1-C | PLANNED | BRUSH-002 arc length spacing |
| PA-04-03 | 笔刷大小/间距/密度 | P1-C | PLANNED | BRUSH-003 deterministic dab order |
| PA-04-04 | 随机配色/加权颜色 | P1-C | PLANNED | BRUSH-004 seeded weighted colors |
| PA-04-05 | 草地/石材/木纹/布纹质感 | P1-C | PLANNED | BRUSH-005 texture texture tests |
| PA-04-06 | 固定 seed 可复现随机画笔 | P1-C | PLANNED | BRUSH-006 byte-for-byte replay |
| PA-04-07 | 有序抖动/误差扩散 | P1-C | PLANNED | DITHER-001 fixed palette output |
| PA-04-08 | 边缘保护智能抖动 | P1-C | PLANNED | DITHER-002 mask diff compare |
| PA-04-09 | 阶梯/径向/线性渐变 | P1-C | PLANNED | FX-001 indexed color bounds |
| PA-04-10 | Gaussian/盒式模糊 | P1-C | PLANNED | FX-002 alpha boundary + preview |
| PA-04-11 | 选择性像素平滑与去噪 | P1-C | PLANNED | FX-003 explicit confirm |
| PA-04-12 | 上下左右周期笔刷 | P1-C | PLANNED | WRAP-001 x/y/xy floorMod |
| PA-04-13 | 3×3 无缝预览与偏移检查 | P1-C | PLANNED | WRAP-002 seams+same core size |
| PA-04-14 | 材质收藏预设与图案库 | P1-C | PLANNED | BRUSH-007 import/export consistency |
| PA-05-01 | Frame/Cel/Layer 动画模型 | P1-D | PLANNED | ANIM-001 cel grid schema |
| PA-05-02 | 时间轴增删复制移动帧 | P1-D | PLANNED | ANIM-002 frame reordering |
| PA-05-03 | 每帧时长/整体 FPS | P1-D | PLANNED | ANIM-003 duration roundtrip |
| PA-05-04 | 洋葱皮前后多帧 | P1-D | PLANNED | ANIM-004 never exported |
| PA-05-05 | 动作标签和片段循环 | P1-D | PLANNED | ANIM-005 tags + pingpong |
| PA-05-06 | 帧时长缓入/缓出曲线 | P1-D | PLANNED | ANIM-006 duration mapping |
| PA-05-07 | 2D 时间重映射曲线 | P1-D | PLANNED | ANIM-007 monotonic time map |
| PA-05-08 | GIF/APNG 动画导出 | P1-D | PLANNED | ANIM-008 decode roundtrip |
| PA-05-09 | Sprite Sheet + JSON 输出 | P1-D | PLANNED | ANIM-009 frame metadata |
| PA-06-01 | 方块/长方体建模视口 | P2 | PLANNED | MODEL-001 stable transforms |
| PA-06-02 | 对象树/组/坐标轴/多视图 | P2 | PLANNED | MODEL-002 tree parenting |
| PA-06-03 | Cube UV 展开与像素绘制 | P2 | PLANNED | UV-001 surface to texel |
| PA-06-04 | 2D/3D 实时贴图同步 | P2 | PLANNED | UV-002 single source of truth |
| PA-06-05 | 材质与最近邻纹理过滤 | P2 | PLANNED | UV-003 no texel blurring |
| PA-06-06 | 骨骼树/变换层级 | P2 | PLANNED | RIG-001 hierarchy matrix |
| PA-06-07 | 3D 关键帧位置旋转缩放 | P2 | PLANNED | RIG-002 spline channels |
| PA-06-08 | Graph Editor 贝塞尔速度曲线 | P2 | PLANNED | RIG-003 value+derivative |
| PA-06-09 | 模型静态导出与纹理 | P2 | PLANNED | MODEL-003 OBJ+MTL+PNG |
| PA-06-10 | glTF 2.0 动画导入导出 | P2 | PLANNED | MODEL-004 conformance |
| PA-06-11 | TileSet/Tilemap/分块图层 | P2 | PLANNED | TILE-001 chunk+atlas |
| PA-06-12 | 可选离线智能识别/辅助 | P2 | PLANNED | ML-001 offline correctness |

## 关键依赖关系

1. SelectionMask → Clipboard → FloatingSelection → TransformSession → 联合撤销 → schema v2。绕开此链条只加图标会导致切图/粘贴/撤销不一致。
2. GeometryRasterizer → Ellipse/Bezier → Assistants → Symmetry；预览必须与最终像素输出同算法。
3. BrushDescriptor + 固定 PRNG → 颜色随机/Stamp/Texture → Dither/Gradient → WrappedCanvas。
4. Frame/Cel → Onion Skin → Timeline → 帧时长曲线 → 动画输出。
5. Cuboid + SceneGraph → UV → 纹素命中 → 贴图绘制 → Bones → 3D Keyframe Graph。

## 每张开发卡片必须填写

- 原始问题；正式中文功能名；用户 3 步操作流程；输入输出和可取消行为。
- 使用的源代码模块、单测 ID、UI 测试 ID、APK Run URL、截图/录屏路径。
- 边界条件、权限和内存成本、是否默认关闭、是否非破坏。
- 测试失败记录和修复提交；完成状态和下一任务。

最终验收不是表里打勾，而是每条链条的真实操作行为。

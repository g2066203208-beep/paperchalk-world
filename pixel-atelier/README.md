# Pixel Atelier / 像素工坊 (Android Native)

独立于 Paperworld 的 Android Kotlin + Jetpack Compose 原生离线像素画工程。当前版本 **0.1.0 P0**，不使用 WebView，不需要互联网权限。

## 实现范围
- 真正的 32-bit ARGB 整数像素网格，不进行平滑插值
- 铅笔、橡皮、吸管、四邻接填色、直线、轮廓/填充矩形
- 双指缩放和平移、直接绘图/偏移准星/独立光标模式
- 多图层可见性、锁定、添加、删除、切换
- 单笔事务撤销重做；双指手势中途撤销本笔，避免误绘
- 原子项目持久化、.pixelatelier ZIP 工程结构、PNG 导入导出
- 中文现代深色界面、竖屏和横屏可用、无账户广告

## 构建
Java 17；Android SDK 35；Gradle 8.10.2:

```sh
gradle --no-daemon -p pixel-atelier :app:testDebugUnitTest :app:assembleDebug
```

输出：`pixel-atelier/app/build/outputs/apk/debug/app-debug.apk`

## 验证状态
JVM 像素测试、APK 编译通过与否以 GitHub Actions 的真实结果为准；模拟器/手机触控和性能测试未运行时不得宣称完成。GIF/APNG/Tilemap/像素转换为 P1/P2，不在 P0 冒充已完成。

## 隐私
Manifest 不声明 INTERNET 权限；文件本地保存，仅使用 Android 系统文件选择器导入导出。

## 专业功能 V1.1 工作室（2026-10-31）

P0 并非完整专业绘画软件。已建立 [V1.1 专业总提示词与产品规格](docs/MASTER_PROMPT_V1_1_PROFESSIONAL.md)、[图形内核技术蓝图](docs/ENGINE_DESIGN_V1_1.md)、[72 项功能矩阵](docs/FEATURE_MATRIX_V1_1.md)、[开源研究和许可证记录](docs/OPEN_SOURCE_RESEARCH_V1_1.md)。

**跟踪 Issue：[#130：V1.1 72 项专业工具](https://github.com/g2066203208-beep/paperchalk-world/issues/130)**。

V1.1 初步算法已开始：SelectionTools.kt 提供矩形/椭圆掩码、精确连通颜色选区、mask 布尔操作、内部像素复制及粘贴、90°旋转与水平/垂直镜像、周期画笔落点和硬像素椭圆栅格。测试代码在 SelectionToolsTest.kt。**现阶段为 ENGINE_ONLY，不代表手机 UI 已提供这些工具**。剪切、浮动选区、任意旋转、洋葱皮、3D 建模、渐变模糊和关键帧曲线仍待开发。

源码是公开可读的 GitHub 仓库；当前没有因 V1.1 自动增加统一许可证。任何第三方 GPL 或 EULA 源码重用都必须先完成授权审查。

**验证区分：** P0 原生 APK/JVM 测试曾通过，原有 Android 模拟器 UI 工作流失败；当前新引擎版本以 GitHub Actions 的最新日志为准。不能把编译通过当作已完成真实手机使用验收。

### V1.1 第一轮原生 UI 增量

当前新增 UI：矩形框选、复制当前图层选中像素、内部粘贴到画布中心、椭圆和填充椭圆；入口为下方工具条与选择后的快捷操作。底层新增 SelectionMask、精确颜色魔棒、镜像/90°旋转、周期落点等算法，但这些底层工具尚未全部接入 UI，复制粘贴尚缺真正浮动选区、剪切和系统剪贴板。

新增 UI 版本的 **APK + JVM test** 成功构建：https://github.com/g2066203208-beep/paperchalk-world/actions/runs/41210315353 。此结果不等于模拟器交互/真机全部功能验证。严格按功能矩阵逐项验收。


## V1.2 — 手机安全区和全工具实时预览（强制修复规格，2026-10-31）

**[阅读完整 V1.2 MASTER PROMPT（约 3.47 万字符、966 行）](docs/MASTER_PROMPT_V1_2_MOBILE_PREVIEW_INTERACTION.md)**

V1.2 已核对现有 MainActivity/PixelViewport 设计不足：针对 Android 15 edge-to-edge，顶部安全区缺乏明确完整的 WindowInsets 处理；直线、矩形、椭圆等几何工具主要在 PointerUp 后提交，没有共同的真实像素实时 PreviewSession。此问题属于 UI 核心阻塞缺陷，不是用户操作偏好。

V1.2 强制修复目标：SafeTopBar/SafeToolDock、WindowInsets/DisplayCutout/IME/Foldable、矩形安全区域断言、全工具独立 draft buffer 和预览图层、实时直线/椭圆/选区/变形预览、端点与控制柄二次编辑、确认/取消和一致性测试、Android 真正的模拟器截图与触摸回放。

**当前状态：设计/开发提示词已提交 GitHub，不得把这份文档宣称为 APK 功能已经修好。** 继续以 V1.1 原生工程增量实现，以 GitHub Actions 和真实模拟器截图验收为准；源码、行为、APK、UI 验证分开标记。


## V1.3｜基础绘画工具、清空、图层混合与遮罩优先升级

**[超详细 V1.3 专业主提示词](docs/MASTER_PROMPT_V1_3_PAINT_LAYER_MASK_EFFECTS.md)**（约 1.5 万字符；25 个编号章节）。当前专业功能基础优先级：油漆桶容差、实时填色预览、清除选区/当前层/全部层、图层混合 Normal/Multiply/Screen/Overlay、独立 Alpha Lock、非破坏 Transparency/Clipping/Filter Mask、效果/图层结构撤销、保存迁移。

**本轮已开始的实际代码**：PixelEngine.replaceArea 提供清除/填满当前层或全部未锁定层，支持 SelectionMask，且多图层操作只产生一次 PixelAction；BasicEditTest 有 7 个针对性回归测试；MainActivity 的工程操作菜单加入清空选区/当前层/全部可编辑层/填满颜色，并在预览中展示实际图层合成，确认或取消。此阶段代码测试/模拟器结果以对应最新 Actions 为准。**图层混合模式、编辑遮罩、完整油漆桶容差、动画和 3D 尚未实现，不能宣称已完成。**

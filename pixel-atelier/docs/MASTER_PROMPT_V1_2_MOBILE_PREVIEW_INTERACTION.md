# PIXEL ATELIER — MASTER PROMPT V1.2
## 原生 Android 手机像素绘画 · 安全区适配 · 全工具实时预览 · 精确触控 · 专业级交互重构

**文档类型**：在 V1.0 / V1.1 之上的强制补充总提示词、技术规格、验收标准与开发任务书。  
**记录日期**：2026-10-31。  
**状态**：设计及研发规范，不代表现有 Android APK 已实现本文功能。  
**目标工程**：GitHub paperchalk-world 仓库独立 pixel-atelier/ Android 原生目录；必须以 Kotlin + Jetpack Compose / Android 原生像素引擎继续开发，严禁更换成 WebView 套壳。  
**首要准则**：用户在绘制任何形状时都必须能看见操作中的真实预览；所有交互按钮必须避开状态栏、异形屏、手势导航栏及不可触碰的系统区域。

> 原则：一名手机像素艺术家必须拥有清楚、直接、可预测的操作体验。用手指拖动直线时，如果线条不跟随手指出现，操作就不是合格的绘图工具；用手指按顶部撤销键时，如果键被摄像头挖孔或状态栏遮挡，那就是交互失败，不能靠“换手机试试”解决。

---

# 00. 执行身份与不可妥协原则

你是 Android Framework 专家、Jetpack Compose 架构师、专业像素美术师、计算几何工程师、GPU / Canvas 渲染工程师、触控和主动笔输入专家、HCI 研究员、无障碍工程师、动画系统开发工程师、自动化 QA 负责人、性能工程师与开源研究工程师组成的联合研发团队。

你必须：
1. 先审计已有 MainActivity.kt、PixelEngine.kt、SelectionTools.kt、ProjectStore.kt、AndroidManifest.xml、Gradle 配置、GitHub Actions 和 Android 模拟器日志，记录行为证据和问题源头。不要假设“已经写过”就表示可以用。
2. 永远坚持“真实逻辑像素”的整数数据，不允许因新 UI 引擎而退回抗锯齿假像素位图。
3. 建立统一预览系统，不得给直线单独写个临时画线 hack，而其余椭圆、选区、变形、渐变依旧没有预览。
4. 所有新工具采用一致的状态机：待机→输入→预览→精修→确认/取消→提交→撤销/重做→保存。
5. 存储和绘画主数据必须隔离于视口；Android 密度、Insets、旋转、屏幕尺寸都不能改变同一逻辑坐标的像素落点。
6. 所有重要动作有低视力/左手/单手/大字体/触控笔替代方案；不得用仅靠颜色或仅靠手势的隐藏功能。
7. 对用户提供诚实工程报告；源代码存在、UI 按钮存在、测试通过、真机体验通过四者是不同状态。
8. 严格维护离线，不申请 INTERNET 权限、账号、广告 SDK、在线许可证、外部模型服务。
9. 不因用户追求“完美”而在没有实际设备测试时宣称性能完美、绝对无 bug 或所有功能全完成。
10. 不擅自复制 Aseprite、Blockbench、Krita、LibreSprite 的源码、界面素材或商标。只借鉴合法的公开技术原理、产品行为与受许可允许的代码。

**V1.2 的第一交付物必须是能真实运行且有形状预览的原生 APK，不是设计截图。其后才扩增专业工具。**

# 01. P0 / V1.1 源码严肃复盘

### 已经识别到的高优先级问题

P0 的 Activity 使用 setContent 直接创建 MaterialTheme/AtelierApp，主体 Row/Column 自行控制固定高度；没有完整的 per-pane 系统 Insets 策略。尤其在 targetSdk=35、Android 15 边到边显示环境里，系统状态栏与导航条可能覆盖操作区域。

现有 PixelViewport 主要负责：
- 指针 down 后记录 first；
- 在移动过程中保存 last；
- 手指全部抬起后调用直线、矩形、实心矩形或椭圆的 PixelDocument / SelectionTools 方法；
- 绘制后触发 onCommit；
- Canvas 只渲染已提交 document.composite() 及少量选择框边界、准星。

这导致：
- 直线/矩形/椭圆在拖动中看不到真正落点与像素预览；
- 只有按下和最后抬起两次边界值，无法二次精确调整端点；
- 当前单指移动和多指手势状态逻辑过于集中，易出现第二指加入时突然改变操作语义；
- 选择区绘制只展示简单 bbox，无法忠实展示不规则掩码；
- 连续绘画“即时更改文档”与复杂形状“抬手才提交”使用不同路径，容易让撤销/保存行为不一致；
- 图像合成缓存以 version 更新为主，对预览态不具备独立资源；
- 缺少独立工具级参数 schema、统一控制柄模型、可预测性与动画预览；
- 画布相对屏幕的定位与顶部 UI 安全区尚未有可回归的布局契约。

### 必须输出审计成果

在 docs/ 下保存：
- UI_BUG_AUDIT_V1_2.md：复现设备/版本、截图、步骤、期望结果、实际结果、根因、影响模块、修复提交。
- INPUT_PREVIEW_STATE_MACHINE.md：手势优先级、状态迁移表、Cancel/Commit 定义。
- INSETS_LAYOUT_CONTRACT.md：Insets 策略和测试矩阵。
- TOOL_PREVIEW_CONTRACTS.md：每个工具的预览输入/输出/可取消规则。
- UI_SCREENSHOT_TEST_MATRIX.md：多设备截图金样测试。
- PERFORMANCE_V1_2.md：CPU/GPU/帧率/内存真实性能测量。

每个文件的“未验证”必须明确写出，禁止用推断替代测试。

# 02. Android 顶部状态栏与异形屏彻底适配

## 2.1 必须理解的系统区域
- statusBars：状态栏图标、时间、电池、通知。
- navigationBars：底部导航条或三键导航。
- displayCutout：挖孔屏、刘海、摄像头区域。
- safeDrawing：绘制/交互建议的安全区域。
- safeGestures / mandatorySystemGestures：系统手势保留边缘和不可可靠触摸区域。
- waterfall：曲面瀑布屏边缘。
- captionBar：窗口化/桌面模式的标题区域。
- ime：软键盘可能覆盖的区域。
- foldingFeature/hinge：折叠屏铰链与遮挡区域，需要 WindowManager 提供额外信息。

**不要使用“状态栏永远是 24dp”“底部永远是 24dp”“挖孔屏固定 36dp”这样的硬编码猜测**。系统区域必须从 WindowInsets 与 WindowMetrics 读取，在 Compose 的正确布局阶段生效。

## 2.2 默认 Edge-to-edge 策略
- Activity.onCreate 先调用 AndroidX Activity 的 enableEdgeToEdge()，使 Android 旧版本的系统栏行为统一；
- 根层允许背景颜色、无交互纹理与画布装饰在系统栏后绘制，但顶部图标、撤销、返回、文件名操作、底部画笔和确认键必须在 safe interaction bounds 以内；
- 如果使用 Scaffold，明确它自身的 contentWindowInsets 和 innerPadding 消费关系；不能同时在根 Box 和子栏重复叠加同一 systemBarsPadding 导致大量空白；
- 简化安全方案可用 Modifier.safeDrawingPadding()；精细方案把 statusBars inset 交给顶部 AppBar，把 navigationBars/ime inset 交给底部工具 Dock，把画布背景延伸到边缘；
- 不把 statusBar 高度直接塞进绘画的视口坐标；绘画 view bounds 从真实测量结果得到；
- WindowInsets.displayCutout 与 safeDrawing 关系须按实际 API 计算，不要叠加两次；
- 如需在操作画布时临时沉浸式隐藏系统栏，必须提供清晰退出机制，保留 Android 必须的导航手势与无障碍访问。

## 2.3 顶部工具栏规格
- 顶栏背景可以延展到设备最顶端，真正的按钮位于状态栏和挖孔可交互安全区域之下；
- 标准内容高可按 52–64dp 设计，但实际总占用必须另外计入顶端 inset；
- 左侧：返回/作品库；中心：可截断的作品名和原生像素尺寸；右侧：撤销/重做/保存状态/更多；
- 320dp 窄屏时不要硬塞全部按钮：隐藏次要文字、合并溢出菜单、保留最核心操作至少 48×48dp hit target；
- 顶栏按钮不可与顶部系统时间/电池重叠，长按提示不能超出安全窗；
- 滚动时可收缩标题，但撤销/重做不能被挖孔遮挡；
- 系统状态栏文字/图标颜色必须与背景对比可靠；
- 屏幕旋转、切换横屏、分屏、多窗口时重新测量 safe bounds，避免按钮短暂跳到系统栏下面。

## 2.4 底部工具栏规格
- 导航手势条上方是操作控件的安全触控区，底部可画背景但按钮不可被手势区域遮盖；
- 画笔、颜色、图层、工具 Dock 和右侧操作按钮使用 measured insets + minimum hit targets；
- IME 显示时，“重命名/输入角度/HEX/函数参数”等输入框应自动保证可见，不能被键盘顶成零高画布或直接覆盖确认按钮；
- 系统三键导航、手势导航、手势灵敏度不同的设备均需验证；
- 垂直边缘拖动不应触发系统后退：靠边缘的精确控制柄自动向画布内部偏移，并支持更大 hit target；
- 操作被系统中断时归入 Cancel 或安全保留预览，不能默默提交半根线。

## 2.5 横屏、平板和折叠屏
- 以实际窗口的 width/height size classes 及折叠姿态为依据，不以设备品牌、物理尺寸或 isTablet 布尔值判断；
- 紧凑横屏（高度不足）使用侧栏工具 Dock，缩短顶栏并可折叠参数面板；
- 中等/扩展宽度可固定图层与调色板面板，但画布仍是核心视觉主体；
- 折叠屏铰链/遮挡带不可放按钮、滑杆或工具关键控制点；两侧独立可用区布局；
- 窗口 resize 不得丢失正在编辑的文件、选区和调色板；
- 软键盘、浮动输入法、系统手势导航与分屏情况下界面仍可操作。

# 03. 真正可预测的画布坐标模型

用户看到屏幕坐标 S=(sx,sy)，内部有：
1. DevicePhysicalPixel，屏幕实际像素；
2. DP 和窗口布局坐标，随 density 而改变；
3. LocalCanvasViewport，专用 Compose Canvas 相对左上角；
4. LogicalImagePixel，真实作品坐标整数 (ix,iy)；
5. DocumentTransform，逻辑图像与可选浮动选区的局部变换。

正确管线：
WindowEvent → hit-test 具体可交互区域 → Canvas local pointer → inverse ViewportTransform → integer image coordinate → Tool Preview → Pixel Command。

必须用矩阵或显式变换参数定义 screen = translate * scale * optionalRotation * pixelCenter。视口缩放、屏幕旋转、面板扩张、Insets 改变都只能更新视口参数，不得直接变更文档逻辑坐标。

- 在 1×、2×、4×、10×、32× zoom 下输入同一逻辑坐标，落点必须一致；
- 标尺/手柄/浮动预览可使用亚像素 screen coords 绘制 UI，但最终落在整数 image pixel；
- 使用最近邻显示图层 bitmap，线性插值只允许用在 UI 阴影/动画，不得改变真实像素图；
- 被裁到视口外的预览仍存在状态，用户平移回来可以看到；
- 选择点位的中心或边界约定要一致；默认逻辑像素中心 (x + 0.5, y + 0.5)，选区用半开矩形；
- zoom-to-fit 应适配减去 system bars 与工具面板之后的真实可用矩形，避免“自动适应”实际却被 Dock 挡住。

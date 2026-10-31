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


# 04. 全软件统一的实时绘制预览框架：最高优先级

这部分不是视觉装饰，而是 V1.2 最核心基础设施。**所有预览必须与最终提交使用同一套算法、同一套参数、同一份逻辑坐标。** 预览的区别仅在于绘制目标是独立暂存缓冲区，而不是最终文档。

## 4.1 预览分层架构

设计 RenderLayerStack，按以下顺序渲染：
1. BackgroundSurface：应用背景与棋盘透明底纹，不参与存储导出。
2. CommittedDocumentLayer：已经提交的文档数据和图层复合（稳定缓存）。
3. UnderlayReferenceLayer：选定的参考图、前后动画帧；不导出。
4. TransientPreviewLayer：当前直线、椭圆、填充、画笔、渐变、变形等实时预览。
5. SelectionOverlayLayer：不规则选区蚂蚁线、掩码透明染色、可编辑路径及边界。
6. AssistGuideLayer：尺规、透视线、吸附点、对称轴、控制柄轨道。
7. CursorOverlayLayer：十字准星、当前像素坐标、放大镜、笔尖轮廓和吸管取色提示。
8. HUDLayer：长度角度、对齐提示、操作阶段、确认/取消、错误反馈。

图层排序是语义契约。PreviewLayer 中真实的临时像素覆盖 CommittedDocument；为清楚辨识可加透明预览或轮廓，但不能把这类 UI 覆盖效果写入工程。高倍画布中透视辅助线不得盖住正在检查的真实像素。

## 4.2 状态与数据

定义 PreviewSession：
- operationId：单次绘制操作稳定 ID。
- toolId：铅笔/直线/矩形/椭圆/Bézier/选区/变形/渐变等。
- stage：Idle / Anchored / Dragging / Editing / CommitReady / Committing / Cancelled / Committed。
- startPixel：初始整数坐标。
- currentPixel：当前整数坐标。
- controlPoints：控制点列表。
- toolOptionsSnapshot：按下时工具参数快照。
- colorAndPaletteSnapshot：调色板和颜色源。
- selectionSnapshot：当前选区/遮罩。
- sourceDocumentRevision：开始操作时文档版本号。
- draftPixels / draftMask / geometryDescription：预览数据，不会直接写入真正图层。
- dirtyBounds：预览需要重算和重绘的逻辑区域。
- touchedPointers：输入指针及设备类型。
- viewportSnapshot / coordinateTransform：用于精确转换。
- randomSeed：若含随机笔刷则固定种子，保证预览和提交一致。
- cancellationToken：长操作可取消令牌。
- errorState：边界、锁层、无效参数等状态。
- commitPolicy：松手自动完成/松手进入编辑/点击确认才完成。

强制 API 设计：
begin(sessionInput) → PreviewSession
update(session, input) → PreviewDelta
render(session, readOnlyDocument) → PreviewFrame
refine(session, controlPointOrNumericalChange) → PreviewDelta
commit(session, documentRevision) → TransactionResult
cancel(session) → no document changes
undo(command) / redo(command) → reversible result。

PreviewDelta 只指明当前需要更新的暂存区域和 UI overlay；不能把它塞到 document.pixels 当作“预览”。如果预览已有缓存，删除旧 bbox 与绘制新 bbox 必须统一处理，避免画过的位置留下幽灵线。

## 4.3 极其严格的预览—提交一致性

命名为 **WYSIWYG Pixel Contract**：

对确定性工具，用户在确认前看到的真实像素预览集 P 与提交后的最终像素集 C 应完全相等（排除准星、蚂蚁线、把手与刻意叠加的 UI 提示）。

- 直线预览就是最终 Bresenham 等价 rasterizer 的结果，不能先用 Android Canvas 抗锯齿路径显示直线，松手再换成另一条像素线。
- 椭圆、曲线、矩形、变形、填色和随机颜色画笔同理。
- 对使用重计算的效果，预览分辨率可以渐进提高，但在标记“可确认”前必须完成最终质量预览；无法同步时显示处理中并拒绝悄悄提交不同结果。
- 如用户移动控制柄到非法位置，显示边界告警和最后合法预览，不可崩溃或清空作品。
- 不同缩放倍率下，提交像素不得不同；缩放只改变预览展示，不改变 ToolRasterizer 输入。
- preview 期间 autosave 不得把临时草稿当作最终提交工程；如应用被杀，至少恢复最后一次已确认工程，复杂的可恢复草稿可做独立 journaling。

## 4.4 实时预览的性能架构

- 预览不是每次 pointer move 都建立全新 Bitmap；使用可复用 IntArray buffer、Bitmap.setPixels 的脏矩形更新或 tile cache。
- 不在每个像素建立一个 Compose 子节点；主画布使用 Canvas/必要时 Surface，并复用 Paint。
- 预览刷新频率跟随屏幕 vsync；高频输入做最新态 coalescing，但真实笔触采样不得丢失。
- 实际主画布层在无文档变更期间不应重复进行全层昂贵 composite；只更新暂存预览与独立 HUD。
- 对几何预览只重算由 start/end/parameters 决定的局部像素；可使用相对于 preview bbox 的离屏纹理。
- 大区域填充/渐变/模糊预览放在后台 worker，返回时比对 sessionId + documentRevision；过期结果丢弃。
- 可用 60/90/120Hz 显示刷新，但允许电池保护模式降低非必要 UI 动画，绝不可降低存储的像素精度。
- 预览帧率与屏幕刷新同步，不得设置无限循环 busy render 或在 UI 线程 while(true) 进行耗时计算。

目标：常见 64×64、128×128、256×256 画布画直线时，拖动预览连续流畅，交互响应目标 p95 小于 50ms；这是验收目标，必须使用真实 Android 设备测量而非声称已达标。

# 05. 通用手势与工具状态机

必须设计正式事件模型：
PointerDown(pointerId, type, position, pressure, tilt, timestamp)
PointerMove(pointerId, historicalPositions...)
PointerUp(pointerId, position, timestamp)
PointerCancel(pointerId, reason)
SecondPointerDown / MultiPointerTransform
StylusHover / SideButton / Eraser
KeyDown / KeyUp
ViewportResize / InsetsChanged / IMEShown / WindowFocusLost
ToolChanged / ColorChanged / LayerChanged
CommitPressed / CancelPressed / UndoPressed / RedoPressed。

## 5.1 状态转移必须明确

Idle → PrimaryPointerDown → Anchored
Anchored → PointerMove → Dragging / live Preview
Dragging → PointerUp → CommitReady 或 Committed，取决于工具策略。
CommitReady → UserAdjustHandle → Editing
Editing → CommitPressed → Committing → Committed
CommitReady 或 Editing → CancelPressed → Cancelled → Idle
Dragging → PointerCancel → Cancelled，无永久像素
任一非 Idle → 新工具选择：必须先提示确认/取消或采用安全定义，不得直接把原工具的半成品提交。
Editing → WindowResize：保留逻辑控制点并重新布局，不丢失预览。

### 多指手势冲突决策
1. 一指正在预览几何形状时第二指加入：默认**保留当前几何锚点和预览**，进入 ViewportNavigation 子状态。第二指可缩放平移，结束后继续调整预览；如果用户设置“多指取消笔画”则用明确配置，不许随机解释。
2. 一指连续铅笔已经有尚未提交 stroke：第二指加入，应结束/保留或取消该 stroke，采用用户可配置但确定的策略，且不产生一个中途断开的不受控笔画。
3. 手指落在浮动手柄上时，手柄捕获该 pointerId，不把拖动转给底层绘画。
4. 在底部面板、滑杆、颜色盘上拖动，不能误触下方透明的画布指针。
5. 两指缩放以两指重心为 anchor，缩放后重心附近的逻辑点保持不跳动；单指加入和离开不能累积 pan 偏移。
6. 从系统返回手势边缘开始的触摸，若系统已消费，必须正确 cancel preview 或不改变文档；不得抢系统手势。
7. Android ACTION_CANCEL、FLAG_CANCELED 和棕榈误触事件必须回滚本次未确认输入。
8. 支持鼠标右键取消、Esc 取消、Enter 确认、触控笔按钮吸管或橡皮（根据能力），但不能作为手机用户的唯一操作途径。

## 5.2 三种精确操作模式，完整覆盖所有工具

**A 直接触摸模式**：手指即绘图点。显示当前逻辑格高亮；几何工具实时更新预览；触摸点被指腹遮挡时提供可以开启的附近放大镜。

**B 偏移光标模式**：画布点位与指腹之间有可调整的物理 dp 偏移，比如向上 48–96dp。预览起点、终点都使用偏移后的逻辑坐标，偏移值随屏幕方向、单手左右手模式保持一致语义。接近顶部边缘时自动翻转/收缩局部放大镜，不能将准星放到状态栏内。

**C 独立精确准星模式**：拖动只移动光标，独立“落笔/设起点/设终点/确认”按钮完成绘画。例如直线先定位起点按一次，再移动光标显示直线预览，再按一次进入确认/精修；禁止按钮每次只画单个点导致直线工具失效。

可增加 **D 数值精确模式**：输入 x/y、长度、角度、半径，手指进行粗定位，精确位置由数字输入确定。

各模式都必须支持框选、椭圆、曲线、填色、渐变、变形，且输出逻辑像素相同。

# 06. 直线工具：必须彻底返工

现状最严重：手指落下后直到抬起才看见直线，相当于闭眼操作。必须达到以下完整交互：

## 6.1 一次手势基本行为

第一帧 PointerDown：记录起点像素，显示起点准星与坐标，准备 live preview。
PointerMove：每个真实输入更新终点，立即计算与正式提交完全相同的像素集合；在图层上方显示临时像素线。旁边可显示长度、角度、水平差、垂直差。
PointerUp：默认进入可精修的 CommitReady，在线两端显示可触摸控制柄及微型确认/取消条。用户可选择“松手立即落笔”作为快捷绘制模式，但默认设置应适合精确手机绘画。
拖动控制柄：起终点实时更新；当前 preview 中旧像素必须被清干净，新像素即时重绘，不允许残留。
点击“完成”：仅一次原子操作把预览像素写入活动图层，撤销一次完整回滚。
点击“取消”：画布与操作前 hash 完全一致，无历史项、无保存副作用。

## 6.2 数值与约束
- 实时显示起点 (x0,y0)、终点 (x1,y1)。
- 实时显示 dx、dy、像素路径长度（定义清楚是 Bresenham 像素数还是欧氏长度）。
- 吸附 0°、45°、90°、135°，吸附阈值可调。
- 支持固定长度、固定角度、水平/垂直辅助线、对称、绘制到选区边界、限制调色板。
- 支持单像素线、多像素方形/圆形硬边线、虚线、定距点线、沿路径样式笔刷。
- 起点和终点相同时形成 1 像素，而不是空线。
- 可以在正式提交前选择前景色/背景色、换工具参数并得到明确提示；默认使用按下时的参数快照以避免中途突变。
- 当线穿过画布外，允许预览剪裁、最终只写入合法像素；不得整数越界死循环。

## 6.3 与传统像素精度冲突的处理
- Bresenham / supercover 是不同线条政策，必须标注，并允许用户切换。默认使用连续且端点包含的离散线。
- Pixel-perfect 转角精简只在明确开启时运行，不能删掉用户设计的故意阶梯。
- “自动平滑曲线”不得让直线结果出现抗锯齿软边；它只能用于处理输入轨迹，最终仍须整数栅格。
- 完整预览与导出逐像素一致；测试至少覆盖 8 个八分区、负斜率、起终点交换、单点、跨边界、不同 zoom、移动设备方向。

# 07. 每一种工具必须具有专属的实时预览语义

以下规范是 UI/引擎强制合同，不得将同一套预览 UI 草率套在所有工具上。

### 07.01 铅笔
按下即显示当前笔刷轮廓/覆盖像素，移动时连续在暂存笔触层展示真实笔画。采用输入历史重采样/栅格连接补点。撤销时一次 stroke 整体回滚；压力、Alpha、颜色随笔触变化可以按策略缓存，且预览结果与提交一致。支持“一笔中不重复堆透明度”的覆盖策略。

### 07.02 橡皮
动态显示将被擦除的逻辑像素范围。预览必须通过棋盘背景透出原图被擦掉的效果，而不是仅用一条白线示意。允许取消该笔还原原始 Alpha；部分擦除作为可选混合功能。

### 07.03 吸管
Hover/长按/拖动时在不遮挡画布的放大镜里显示取样位置、目标颜色的 HEX/ARGB、当前图层/合成采样方式；松手后才确认取样，或者可配置立即取色。切换颜色不应发生像素修改。

### 07.04 油漆桶
Hover 或轻触时显示将被填充区域的半透明 mask、预计影响像素数量、颜色容差、当前图层/合成采样来源。大型图在后台计算预览；如预计填充整张图，必须显示明确范围。确认后才执行填色。不能按下瞬间不受控覆盖整张图。

### 07.05 矩形与填充矩形
拖动实时出现真正的整数像素矩形，预览四角、长宽、中心位置。选择按边界/中心扩张、正方形锁定、线宽、描边/填充、圆角（以独立像素几何算法）；编辑柄可调整边界。填充矩形拖动中显示完整填充区域，不只是虚线边框。

### 07.06 椭圆与圆
实时显示整数栅格椭圆轮廓，中心/半径/长短轴/外接矩形控制柄可见；填充椭圆真正显示填充像素。奇偶尺寸保持轴对称，允许横竖退化为直线或一点。预览与最终栅格算法完全一致。

### 07.07 折线、多边形、正多边形
点击节点即可显示到当前光标的下一条临时边；节点可拖动；双击/按完成闭合或确认；显示顶点数、角度、边长和是否自交。正多边形提供中心、半径、边数、角度。填充规则说明 even-odd 或 winding。

### 07.08 贝塞尔曲线、样条曲线
点击/拖动设置起点终点与切线；控制柄操作中实时更新曲线像素，辅以淡色切线辅助线。预览像素需由最终曲线采样器计算，不得用普通抗锯齿 Path 假装最终像素。控制点进入数值编辑与吸附。可选择“3 步快速画弯线”，或专业节点编辑。

### 07.09 矩形、椭圆与自由套索选区
拖动时实时以半透明区域高亮 + 蚂蚁线标注真实 selection mask；必须展示不规则形状边缘，不能只画 bbox。松手进入可组合编辑；遮罩、图层锁定和 mask 叠加效果立即可见。

### 07.10 智能魔棒和磁性套索
移动时可预览候选选区和边缘路径；改变容差时实时刷新；允许添加/去除采样点和吸附锚点，显示算法正在处理的状态。严禁未经明确模型或边缘证据就宣称 AI 识别人脸。

### 07.11 移动、复制与浮动粘贴
复制后先把内容显示在 FloatingSelection 上，带轮廓、坐标与可拖动控制柄；未经用户确认不覆盖原图。剪切必须与粘贴完成作为同一个撤销事务。支持复制当前层/合成层、新建图层/原位粘贴。

### 07.12 缩放、旋转、扭曲
每次触摸控制柄时显示变换后的真实整数像素预览。可查看原图半透明 ghost，显示轴心/角度/缩放比例及越界部分。90° 与镜像必须支持无损路径；非整数缩放、任意旋转明确重采样策略与可能的信息损失。

### 07.13 对称绘画
预览里实时同时显示所有镜像/径向复制的画笔足迹，而非提交后才看到对称结果。对称轴和中心可拖动、不导出，奇数/偶数画布中心准确，支持独立色彩模式。

### 07.14 随机与质感画笔
当前光标周围显示笔刷 footprint、密度、色彩范围和当前 seed；拖动中真实预览颗粒、木纹、草地、石头等分布。固定种子保证同一输入生成同一结果；不是每帧重新随机生成而闪烁。

### 07.15 抖动
修改矩阵大小/Palette/阈值时实时显示有序抖动结果；效果预览以真实最终像素阵列展示。边缘保护与随机扰动可选并可对照原图；限色模式不可越过指定色数。

### 07.16 渐变
拖动起点终点实时显示所有被影响像素，显示控制向量、渐变方向、端点颜色、色阶数。连续渐变、限定调色板阶梯渐变与抖动渐变必须作为独立选项；预览完全对应当前模式。

### 07.17 模糊与滤镜
显示可调整强度/半径/边界策略的 before/after 比较滑杆或局部透镜。后台预览与正式确认使用同算法；大图必须显示渐进质量状态，不能一个模糊按钮不提示就把原图全部改掉。

### 07.18 自动平铺与无缝纹理
画布主区显示真实编辑原纹理，开启后周围可选显示 3×3 重复 preview；画笔越过左右/上下边界时，镜像边缘处实时出现像素，不必松手才能看见。项目始终只保存一个原始宽高纹理，支持 wrap X、wrap Y、wrap XY。

### 07.19 TileSet / Tilemap
放置 Tile 前实时显示半透明瓦片候选、网格吸附边界、碰撞/透明提示；拖动矩形填充前显示全部目标图块集合；导出只使用真实引用，不能把预览框烘进地图。

### 07.20 动画与洋葱皮
时间轴预览当前帧、前后帧 ghost，具有单帧/多帧叠加衰减；播放头移动即刷新，无预览残影。拖动帧持续时间立即更新总时长和 FPS 估计；结束后保存新的 durationMs，未确认时可撤销。

### 07.21 3D 立方体、UV 与模型动画
模型编辑器拖动几何控制柄时显示实时模型轮廓/轴向、面选取和 UV 像素命中；鼠标/手指移动应能看到候选选中的面。贴图工具在 UV 图及 3D 面两个视图同时预览目标 texel；关键帧曲线拖动时实时计算模型姿势，不得仅画曲线不影响骨骼。

### 07.22 所有工具共有的底线
没有明确预览意义的操作（保存、导出、重命名、切换工作区）应有状态提示而非伪造像素预览。预览操作绝不静默丢弃、误提交、篡改无关图层或无提示覆盖已有内容。

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


# 08. 手机编辑器整体视觉与信息架构彻底重做

不要复刻桌面 Photoshop，也不要把 30 个工具排成一条能无限横向滚动的文字条。用户要的是专业软件，但首页必须简洁、易懂、可单手使用。

## 8.1 编辑器的四个操作层级

**一级：画布。** 中心主体，大部分时间必须拥有绝对最多的可视面积；背景可深色，但必须允许使用透明棋盘、单色背景、纯白/黑参考背景切换。避免复杂阴影/装饰干扰作品颜色判断。

**二级：常用操作。** 顶栏的返回/撤销/重做，底部的工具模式切换、当前颜色、画笔、图层、精确落笔按钮；优先直接操作，不必打开对话框。

**三级：上下文选项。** 仅在选择工具后显示它自己的参数与快速操作，比如直线的宽度/角度约束，矩形的边框/填充，选区的布尔模式，模糊的半径。可收为一行 mini options。

**四级：专业面板。** 图层树、调色板、多帧时间轴、笔刷实验室、辅助线、3D 模型树、UV 编辑、工程导出等复杂模块，采用底部抽屉/侧边停靠，不长期占用紧凑手机画布。

### 模式切换建议
底部第一层为：绘制、选择、形状、颜色/材质、动画/模型（按工程类型动态变化）。每组常用工具可以自定义收藏固定在主 Dock。面板要保持工具最近使用状态，但不应将动画/3D 功能无条件摆到 2D 图片画布上。

### 一屏布局骨架
顶端系统栏安全区 → 顶栏（文件、撤销、重做、操作菜单） → 中央灵活画布 → 工具上下文栏（仅需要时显示） → 主 Dock / 小型快捷操作键 → 导航栏安全区。

在用户打开键盘、图层抽屉或颜色选择器时，Canvas 可响应 resize，但不能偷偷重新归零 zoom/pan，必须尽量保持用户当前观看的逻辑像素位置。

## 8.2 多套推荐布局，不强迫单一方案

**手机紧凑竖屏 / 单手默认布局**
- 顶栏高度根据实际显示密度、字体和 insets 适配。
- 画布中央居中，画布外显示轻微边界，不裁掉作品内容。
- 底部固定 5 个左右一级入口，工具子项在一行可左右滑动；重要工具无需超过两次触摸到达。
- 当前颜色为带 Alpha 棋盘的醒目色块，点按弹出调色盘。
- 在右侧或左侧放置可拖动精确光标按钮，不默认挡住作品眼部、脸部等细节。
- 复制/粘贴、选区控制柄和撤销可以就近出现，但不能同时满屏悬浮按钮。

**手机紧凑横屏**
- 主要工具移到左右侧，底部仅保留轻量状态栏/时间轴（如果是动画项目）。
- 顶部操作紧凑呈现，菜单不会覆盖挖孔/刘海。
- 小于 480dp 可用高度时自动减少面板同时展开数量，保障画布至少能操作。

**平板/大折叠屏**
- 画布中央或偏左，右侧图层/调色盘可并列，底部动画时间轴可停靠。
- 面板具有最小/最大尺寸与拖动停靠，不造成画布尺寸负数。
- 若存在遮挡式铰链，两侧 pane 不跨铰链放置工具，独立响应不同区域的点击。
- 小窗模式和自由窗口 resize 不能导致工具条跑出屏幕。

## 8.3 工具图标设计规范
- 原创矢量符号，统一 24dp 视觉形、48dp+ hit target；像素艺术画布是像素风，UI 图标不需要故意低像素。
- 用语简洁：铅笔、橡皮、吸管、填充、选择、移动、直线、矩形、椭圆、曲线、渐变、对称、变形、动画。
- 选中的工具有高对比背景、文字/轮廓等明确状态，不只依靠颜色区分。
- 选区加/减/交的符号必须直观，长按有中文说明，不允许图标意义模糊。
- 工具可长按拖动排序，收藏、隐藏不常用项，恢复布局不会影响作品。
- 鼠标悬停、触控笔 hover 与长按触摸可弹中文 tooltip；屏幕朗读有独立 contentDescription。

## 8.4 顶栏禁止遮挡的详细验收
- 在挖孔正中、左上角刘海、双挖孔、横屏右侧刘海场景，返回/保存/撤销/重做/更多必须全部可触摸。
- 应用标题不与状态栏时间叠加，错误提示 Snackbar 不顶到状态栏。
- 顶部内边距依实际 Insets 更新。横屏状态栏可能转为侧边 inset，不能假设 top-only。
- 系统字体调到 1.3x / 1.5x 及 Android Display Size 调大时，重要按钮不被裁剪。
- 手机切换到分屏后，顶部必须自动重排或折叠内容，而不是让返回键消失。
- 状态栏明暗图标跟随实际背景，不能黑底黑图标。
- Android 导航三键模式下，底部调色和落笔按钮不能被系统“返回/主页”遮住。

# 09. 控制柄、放大镜、标尺和视觉反馈的专业交互

手机上触摸精度有限，不应要求用户直接抓住 1 像素宽的线条端点。

## 9.1 控制柄（Handle）系统
- 每个控制柄有：handleId、type（move/scale/rotate/pivot/tangent/vertex/radius）、logicalPosition、screenHitArea、zOrder、snapPolicy、capturePointerId。
- 画面可见的控制柄半径可为 5–9dp，但实际触摸 hit area 至少 44–48dp（依附近控件避让），可缩放，用户可调。
- 与邻近柄重叠时弹放大选择或按距离/优先级拾取，不要拖错点。
- 控制柄颜色/线型区分可移动锚点、受约束锚点、旋转柄、不可编辑点。禁用柄需显示原因。
- 控制柄拖动完全使用逻辑像素坐标转换，不得因为 finger offset 模式移动到错误格。
- 支持精确微调：方向按钮每次移动 1 像素，长按连续移动的步进需要可配置，不能做惯性滚动。

## 9.2 放大镜
- 默认隐藏，适用于细节工作或粗手指模式。
- 镜面显示当前指尖/准星附近若干逻辑像素，使用 NEAREST 和足够大的独立格。
- 镜面中心一格高亮并给坐标，用户可调大小与透明度。
- 显示在手指相对侧，自动避开系统栏、按钮、屏幕边缘；若无法完整显示则缩小/挪动，而不是溢出屏外。
- 放大镜必须包含最新预览图层，不应只显示之前提交的图，否则用户仍然是在“盲画”。
- 不可将放大镜的棋盘、准星和网格输出至 PNG。
- 长时间不动时可自动淡化，但用户可选择固定显示。

## 9.3 标尺、坐标与吸附
- 画布左上/顶部可显示横纵标尺，按放大倍数自适应标签间隔，不得每格都挤数字。
- 拖动直线显示 Δx、Δy、角度；矩形显示 W×H；椭圆显示中心/半径；选区显示范围与面积；变形显示倍率和角度。
- 吸附目标分层：像素网格、参考线、选区边界、对称轴、作品中心、其他图层参考点。
- 吸附强度与“磁性”响应应有可见反馈，支持暂时关闭（触控按钮或快捷键）。
- 已吸附的实际逻辑坐标直接作为预览入参，不能只画蓝色辅助线而提交位置仍未吸附。

## 9.4 操作提示
- 用户开始画线，HUD 应明确“正在画线”；抬手后写“拖动端点调整，确认完成”。
- 拖动框选时，显示真实选中像素数；如果空选区，显示“没有选中像素”而不弹令人困惑的空白面板。
- 锁定图层时，无法画画应在第一次尝试显示中文原因和“解锁图层”入口，而不是悄悄不响应。
- 图层不可见、颜色透明、画笔过小、画布超出视口等导致看不到结果的问题应有明确诊断。
- 动画预览暂停/播放状态、3D 坐标轴、变形锁定比例均应有状态提示。
- 操作成功轻触反馈可选，禁用震动不影响任何功能。

# 10. 更多专业工具：避免“有名字没能力”

## 10.1 完整选区工作流
- 矩形/椭圆/套索/多边形/魔棒/相似色/磁性路径；
- 选区内外、加入/相减/相交/异或、反选、扩展、收缩、移动选区、保存与恢复；
- 选择颜色容差、当前层/合成层采样、4/8 连通、透明像素规则；
- 智能选区实时 mask preview，可分步确认，允许修补漏选，严禁自动“决定”用户要保留的人物部分；
- 蚂蚁线动画仅为 UI，不存储在画布，也不能与真实颜色混淆。

## 10.2 真正的复制/剪切/粘贴
- 内部 Clipboard（当前层/合成层/选区）；支持复制透明洞、剪切、粘贴、原位粘贴、新图层粘贴、跨工程粘贴；
- 粘贴后必须先显示浮动选区 preview，允许拖动和变形，再确认/取消，不能直接默默贴画布中心；
- 复制后不修改原图；剪切未确认不得清除源图；确认后作为单条可撤销事务；
- Android 系统剪贴板通过 FileProvider/URI 提供 PNG 交换，受限格式和大数据有错误提示；
- 粘贴多层资源时明确选择“合并图层/新图层/保留图层树”行为。

## 10.3 画笔与材质
- 单像素铅笔、方/圆硬边刷、连续路径刷、像素完美轮廓刷、平铺质感刷、纹理印章、随机颜色、模式刷；
- 画笔库每个预设要有真实动态样笔和颜色概率图；
- 自定义尺寸、间距、方向、透明度、密度、随机 seed、颜色权重、邻域保护；
- 随机颜色不等于毫无规律噪点，必须支持调色板约束、明度范围、色彩和谐、色块连贯程度、孤立点过滤；
- 像素材质可以是草、石、木、砖、金属、布料、水、土等，但软件不强制把这些类别当作固定美术风格；
- 笔刷 Stroke 的 preview 和 commit 使用相同 seed / dab 顺序，避免松手后画面随机变化。

## 10.4 专业形状与数值几何
- 直线/折线、矩形/填充矩形、圆/椭圆/填充椭圆、弧线/扇形、正多边形、自由多边形、Bézier 与样条、圆角矩形；
- 每一种必须有真实预览 + 编辑柄 + 坐标数值输入；
- 数学函数图形从安全白名单表达式 AST 计算，不执行任意脚本；
- 曲线平滑可以适应手势路径，但整数栅格化之后不应自动加半透明柔边；
- 精确整数变换、非整数最近邻缩放、透视和扭曲分别规范，不能用屏幕的视觉旋转替代真实图像变换。

## 10.5 颜色与调色板
- 一屏选择常用色与透明色，支持 HSV/RGB/HEX/Alpha，颜色输入不会让软键盘盖住确认；
- 支持索引色、常用 Palette、颜色替换、当前/最近颜色、色阶与渐变、限制颜色数；
- 颜色盘显示对比色及取样；前景/背景色一键交换；
- 撤销颜色变化与撤销绘画变化属于不同语义，不能无提示影响文档历史；
- 色彩量化、抖动和噪点处理显示作用范围和最终使用颜色数量。

## 10.6 渐变/模糊/平滑
- 必须把“输入路径平滑”“路径曲线拟合”“像素图模糊”作为不同功能；
- 渐变有离散色阶/抖动/连续色模式，并在预览说明真实输出色数；
- 模糊半径以逻辑像素为单位，支持透明 alpha 正确处理和取消；
- 所有效果默认只作用选择范围，允许显示 before/after 对照；禁用或失败不得破坏源画作。

## 10.7 四方向无缝
- 左右 wrap、上下 wrap、XY wrap 独立开关；
- 3×3/5×5 视图仅为重复预览，原始纹理宽高不变；
- 预览的周期边缘像素与最终文件在数学上完全一致；
- 在周期模式下，画笔/随机 seed/模糊边界/渐变/图层合成遵循明确的 floorMod 规则；
- “自动修缝”属于额外处理工具，必须显示 preview、差异和撤销，不能擅自改变边缘设计。

# 11. 动画时间轴、洋葱皮与 3D 编辑中的实时预览

## 11.1 原生 2D 动画
- Frame / Cel / Layer 结构，按帧毫秒数控制时长；支持独立每帧 durationMs，不以固定 FPS 覆盖；
- 洋葱皮前后 N 帧，颜色与透明度可调，真正置于参考层，渲染、导出和工程缓存相互隔离；
- 时间轴显示缩略帧、帧标签、已选择帧、循环标记、播放头与真正总时长；
- 画布预览当前帧而不是只变更下方缩略图；
- 帧拖动顺序、复制 Cel、删除帧都支持撤销；
- 速度曲线明确区分离散帧持续时间与运动补间，不允许用无意义 UI 线条伪装插值。

## 11.2 Blockbench 式 3D 模型工作区
- 立方体/长方体和可选网格的 SceneGraph 层级，UV 编辑与模型面命中，贴图原始 texel 可见；
- 拖动缩放/旋转轴向控制柄时模型实时更新 preview，未确认前可恢复；
- 3D 相机旋转与模型旋转必须明确分离，双指手势优先相机导航而非误变形；
- Cube UV 映射可同步在 2D 编辑区高亮相应纹素，材质采用 NEAREST；
- 骨骼父子关系、关键帧与 Graph Editor 支持真实数值曲线，Step/Linear/Cubic 改变模型采样姿态；
- 3D 工作区不能挤占普通 2D 绘画首页，不应因为模型功能而增加普通绘画的误操作。

# 12. 整体应用的现代视觉体验与中文文案规范

视觉方向：精致、现代、克制，强调清晰绘画而不是复古软件模仿。
- 深色主题：层级分明、背景低噪、工具选中高对比，避免极黑与过强霓虹影响颜色判断；
- 浅色主题：画布边界清楚，工具区与作品区有足够对比，状态栏图标适配；
- 图标系统：原创，统一粗细、圆角与视觉尺寸；配中文工具名或长按标签；
- 画布无装饰性阴影堆积、不可出现模糊纹理影响像素检查；
- 动态过渡控制在短而可感知的范围，尊重 Android 降低动画设置；
- Material 3 作为交互基础，不机械套用大卡片占满有限手机屏幕；
- Snackbar 不遮挡当前最后一个控制柄或确认键，严重错误另设清晰对话框；
- 画布尺规、参考线与浮动按钮按可见性规则折叠，不形成 UI 噪声；
- 所有控件有中文名和中文操作说明：“起点”“终点”“精确角度”“点击确认”“取消预览”“本地已保存”“图层已锁定”等；
- 禁止模糊提示如“发生错误”“失败，请重试”而不说明原因或恢复方法；
- 初次用户在最短路径完成新建、铅笔、画线、撤销、图层、保存，不强迫看完冗长教程；
- 专业教程可由离线帮助中心访问，包含输入模式、预览、不同快捷键、帧模型和 3D 说明。

# 13. 数据安全、撤销与保存应当与 UI 预览严格协调

- 当前 PreviewSession 默认不写入正式 Document。
- 正式 commit 生成一次完整 Command；不能将同一几何工具的多次拖动过程拆成几十次撤销步骤。
- 取消预览必须恢复原文档 hash，不仅恢复显示画面。
- 成功提交后的自动保存通过稳定文档版本号触发，不能误保存临时控制柄或动画 onion 参考层。
- 保存期间继续绘图，要使用一致性快照和序列化队列；旧保存结果不能覆盖新版本。
- Android 进程被系统杀死后，最后一次已保存版本可恢复；可选草稿恢复必须采用独立 journal，不得假装临时预览已确认。
- 工程 schema v1 → v2 → 后续版本需要真实迁移脚本和回滚备份；旧工程打开不丢图层像素与 alpha。
- 目标文件不存在、磁盘满、URI 拒绝、文档压缩包损坏时提供中文错误和恢复选择。
- PNG 导出使用原始逻辑尺寸和 NEAREST，绝不把准星、网格、参考线、预览把手、弹窗、状态栏等导出进去。
- 图层多选、剪切、粘贴、矩形变形、路径编辑、随机刷等每个操作必须可以撤销、重做和重新打开。


# 14. 分层原生 Android 工程结构与专门技术接口

禁止继续让 700 多行 MainActivity 同时拥有工程列表、全部工具状态、手势处理、数据变更、画布绘制、对话框以及 ZIP 文件保存逻辑。用户看不到直线预览的根本工程原因之一就是输入、预览与最终文档不隔离。

建议模块树（实际增量迁移，不要求一次全拆导致旧功能停摆）：

app/
- MainActivity：导航/Edge-to-edge/SystemBars/适配入口。
- PixelAtelierApp：主题、全局作品导航、系统窗口管理。
core-ui/
- DesignTokens.kt：颜色、spacing、圆角、typography、touch target。
- AdaptiveScreen.kt：窗口尺寸类、WindowInsets/hinge、IME。
- SafeHeader.kt：顶部内容安全区、操作溢出策略。
- ToolDock.kt：底部主工具栏、左右手重排、收藏工具。
- ToolContextPanel.kt：工具参数抽屉。
- FloatingActionRail.kt：落笔/确认/取消/微调按钮。
core-input/
- InputRouter.kt：PointerEvent 分配与消费规则。
- GestureArbiter.kt：一指/双指/系统返回/控制柄优先级。
- StylusAdapter.kt：MotionEvent 历史点、压力、hover、palm rejection。
- TouchModeManager.kt：直接/偏移/独立准星模式。
- ViewportTransform.kt：屏幕到逻辑像素双向坐标。
core-preview/
- PreviewSession.kt：所有工具的暂存态与状态机。
- PreviewCoordinator.kt：输入→参数→渲染→提交。
- DraftRasterBuffer.kt：可重用预览像素缓冲与脏矩形。
- PreviewOverlayRenderer.kt：虚线、手柄、HUD、准星、预览蒙版。
- HandleManager.kt：控制柄拾取/高亮/偏移/吸附。
- PreviewCommitValidator.kt：预览和提交逐像素一致性门禁。
core-pixel/
- PixelDocument.kt：像素与图层的唯一真值。
- PixelRasterizers.kt：直线/矩形/椭圆/多边形/曲线。
- ColorMath.kt：Alpha、调色板索引、混合/量化。
- PixelBrushEngine.kt：画笔 stamp/seed/spacing/压力。
- SelectionMask.kt：选区布尔、剪贴与坐标。
core-command/
- Command.kt：所有画布操作的可逆命令接口。
- TransactionJournal.kt：提交、撤销、重做、checkpoint。
core-project/
- ProjectStore.kt：版本化无损存储、原子保存、恢复。
- ImportExport.kt：PNG/动画帧/3D 等真实格式。
feature-editor/
- EditorScreen.kt：组合屏幕各个 UI 面板。
- EditorViewModel.kt：文档、工具、选区与预览持有。
- CanvasSurface.kt：Committed/Preview/Overlay 分层渲染。
- ToolRegistry.kt：工具 ID、参数、能力和帮助。
- EditorActions.kt：用户意图至 command 的映射。
feature-animation/
- TimelineScreen.kt、OnionSkinRenderer.kt、FrameController.kt。
feature-model3d/
- ModelViewport.kt、SceneGraph.kt、UVEditor.kt、GraphEditor.kt。
tests/
- preview-geometry-golden/
- insets-screenshot-golden/
- gesture-replay/
- pixel-roundtrip/
- save-recovery/
- performance-benchmarks/

## 14.1 推荐的工具接口语义（伪接口，不代表已实现）

接口 ToolController 不允许直接访问 Activity、ContentResolver 或 mutable Composable UI 树。

声明：
- onBegin(context: ToolContext, start: PixelPoint): PreviewSession
- onUpdate(session: PreviewSession, current: PixelPoint): PreviewDelta
- onRefine(session, handleId, point): PreviewDelta
- getPreviewGeometry(session): GeometryDescription
- rasterizePreview(session, readOnlySnapshot): RasterPreview
- validate(session, document): Validation
- buildCommand(session, document): PixelCommand
- onCancel(session): NoMutation

ToolContext 是 read-only：选中图层、颜色、画笔参数、选区 mask、documentRevision、辅助线、对称、平铺参数。正式 Commit 的事务必须由 CommandDispatcher 统一处理，工具不得自行保存文件。

## 14.2 预览资源生命周期

begin：分配 / 清空 draft buffer；
update：dirty old region + new region；在 UI 中无阻塞提交预览版本；
recalculate：同步轻量算法或带 cancellation token 的后台重算；
commit：检查文档版本与图层锁定状态→验证 preview hash→单次 command→释放 draft；
cancel：清理 overlay，主文档未变；
activityStopped：保留已确认文档，按用户设置持久化可恢复草稿参数，但不能偷偷变成像素结果。

## 14.3 防止 UI 坐标与预览落点不一致

所有 pointer 必须在具体 Canvas 布局的 local coordinate 中解释，不能拿整屏坐标简单减去一个假定的标题栏高度。ToolController 只接受 PixelPoint，不接受 dp 或 window coordinate。
当 Insets 改变：
- ViewportTransform 重新计算 local-to-document；
- 当前 PreviewSession 的几何逻辑点保持不变；
- Overlay 的可见控制柄位置重新投影；
- 如果屏幕短暂变窄，自动合理平移视口以保持活动像素可见，但不移动内容；
- 不可直接重置为默认 fit 导致正在精修眼睛时跳到全图；
- 测试日志记录 safeTop/safeBottom/viewportRect、fingerLocal、pixelCoordinate，便于重现偏移。

# 15. 每项 UI 功能的正式验收体系

以下均为必须纳入自动化或人工真机回归的用例；不得用只检查应用能启动替代。将每项写入 TEST_MATRIX_V1_2.md，并标记 NOT_RUN / FAIL / PASS_ANDROID_EMULATOR / PASS_PHYSICAL_DEVICE。对于 screenshot golden test，可维护不同 OS 版本和 density 的经过人工审核基线；不能未经理由就批量更新快照让测试虚假通过。

## A 组｜系统栏、挖孔与窗口布局

A01 在 Android 15 / targetSdk 35 上启用边到边，顶部“返回/撤销/重做”点击坐标落在 safeDrawing 可交互范围。
A02 Android 13/14 使用手势导航，顶部无需增加双重 padding。
A03 Android 15 三键导航，底部 48dp 按钮完整露出，不被系统导航键盖住。
A04 正中挖孔屏，标题和按钮与 cutout rect 无相交。
A05 左侧挖孔屏，返回键布局向内避让；仍可点击。
A06 横屏右侧刘海，侧栏与 cutout 不重叠。
A07 曲面屏左右 waterfall 区域有安全的点击边界或明确禁止放控制柄。
A08 窗口 captionBar/桌面模式，顶栏不与窗口标题重叠。
A09 用户将系统字体设置到 1.5 倍，顶栏可用、没有文字覆盖撤销键。
A10 用户将显示大小调大，主要操作 hit target 不被裁剪。
A11 输入 HEX 时弹出 IME，确认按钮仍可触摸。
A12 大折叠屏从闭合变展开，画布逻辑焦点保持，组件不会跨越遮挡铰链。
A13 分屏窗口连续改变高度，工具栏自动重新排列，不出现负高度或崩溃。
A14 系统返回手势滑动，不能顺带产生意外笔触。
A15 安卓状态栏亮色/暗色图标均有合规对比度。
A16 用户进入专注绘画模式后恢复系统栏，所有控件重新出现在可交互区域。

## B 组｜直线与几何实时预览

B01 32×32 画布，开始直线后即显示起点高亮；第一次移动时显示真实像素线。
B02 拖动从 (2,2) 到 (19,7)，屏幕连续至少数次预览变化，而不是只有 PointerUp 后变化。
B03 同一个手势两次移动到不同终点，不保留上一次预览的残影。
B04 未确认前关闭预览，文档 hash 与操作前完全相等。
B05 手指抬起后进入可拖动控制柄的精修状态；拖动终点实时改变像素集。
B06 点击确认后仅有一次 undo，回滚完整直线而非一格一格撤销。
B07 直线首尾同一点画一格；负斜率和八方向无断点。
B08 直线完全超出画布边界时安全裁剪，无无限循环/OutOfMemory。
B09 同样的逻辑起终点在 2×、4×、8×、16× zoom 下得到相同像素数组。
B10 横屏+挖孔+安全区改变后，端点落点依旧正确。
B11 45° 约束确实改变最终路径，而不是只显示吸附辅助虚线。
B12 矩形/椭圆拖动时真实预览完整轮廓，并包含当前透明度和图层合成。
B13 实心矩形/实心椭圆在拖动中显示填充体，而非只显示轮廓。
B14 椭圆奇偶宽高、退化线、退化点与实际图像输出一致。
B15 Bézier 控制点编辑时旧曲线预览完全清除；控制柄不导出。
B16 预览时改变颜色/线宽，要么采用参数快照要么明确重算；不能一半颜色旧一半新。
B17 锁定图层尝试画线显示明确中文警告，不静默失效。
B18 预览时接收到第二指缩放，支持安全保留预览且不留下误涂点。
B19 多工具切换发生在 CommitReady 时出现确认/取消处理，不丢编辑结果。
B20 对同一次输入，临时真实像素图与正式提交图在排除 UI overlay 后逐像素哈希一致。

## C 组｜绘图笔刷与准星

C01 手指快速斜向移动，完整补足每个逻辑像素路径，不因帧率低而断线。
C02 单像素铅笔在不同 density 与偏移光标模式精确落同一逻辑格。
C03 独立准星模式先起点后终点，画线实时预览并确认，真正可用。
C04 偏移光标接近顶栏安全区时自动调整放大镜并正确点选。
C05 “落笔”按钮在双指缩放或图层面板操作中不会触发误绘。
C06 橡皮 preview 能看到透明棋盘透出，取消后 alpha 完全恢复。
C07 吸管显示 HEX/RGBA 和采样来源，采样本身不修改图像。
C08 随机画笔固定 seed、同输入重复得同 hash；预览稳定不闪烁。
C09 触控笔 pressure 历史点有校准；不支持 pressure 的手指稳定使用默认值。
C10 棕榈触摸误识别触发取消逻辑后不会残留永久像素。
C11 在高刷新率设备重复测试，对 pointer move 的 coalescing 不丢真实笔画点。
C12 用户手指遮住目标像素时放大镜准确展示当前 preview，不是旧图像。
C13 卷积/抖动/渐变等重量操作在主线程之外预览，不阻塞所有触摸。

## D 组｜选区、剪贴、变形和效果

D01 矩形选区拖动中显示真实 mask，之后复制透明区域，再粘贴到新位置。
D02 椭圆选区和任意多边形选区显示真实形状蚂蚁线，不可只显示 bbox。
D03 浮动粘贴拖动时原图不变；点击取消不留像素；点击确认后一次撤销恢复。
D04 框选/剪切/粘贴/缩放/旋转前后 alpha 及锁定图层规则正确。
D05 选区组合布尔运算的像素数量正确；空选区输入不崩溃。
D06 魔棒容差拖动实时更新预览，不因大区域全图卡住 UI。
D07 对称模式实时预览所有对称点位，奇数/偶数画布镜像不偏一格。
D08 渐变预览颜色种数与实际导出颜色种数吻合。
D09 Gaussian 模糊预览与最终像素同算法，无透明黑边或不可撤销副作用。
D10 平铺 XY 模式跨边界笔画在实时预览中同时出现，导出保持原图尺寸。
D11 图层隐藏/锁定时，预览与正式写入权限一致。
D12 多图层合成预览不得把参考图或选区 UI 参与图片输出。

## E 组｜动画、3D 和专业资源

E01 帧前后洋葱皮显示颜色/透明度正确，导出 PNG 不包含 ghost。
E02 不同 durationMs 帧播放节奏和总时长正确。
E03 时间轴播放/暂停/跳帧只在 preview 中体现，不破坏工程。
E04 Cube 面拾取与 UV texel 映射一致，2D 贴图和 3D 视图同步更新。
E05 3D 关键帧曲线修改后真的改变模型姿势，不只是动一条 UI 曲线。
E06 3D 贴图插值为 NEAREST，模型可绕转且 UV 映射不随窗口 Insets 发生错误。
E07 3D 编辑器进入全屏/分屏不丢模型数据和选中的面。
E08 2D 项目不会因未加载 3D 后端而明显延迟启动。

## F 组｜存储、异常恢复与离线

F01 飞行模式下新建、画线预览、确认、图层、保存、导出完整可用。
F02 模拟进程中断于 preview 阶段，重启不会把未提交预览写入作品。
F03 模拟中断于 commit 后 autosave 前，有明确保留或恢复策略。
F04 ZIP 旧工程 v1 导入并升级，不丢像素透明度或图层。
F05 保存失败给出具体中文原因，原有效工程可以重新打开。
F06 PNG 逐像素 roundtrip、尺寸、alpha、渐变结果一致。
F07 界面语言完全中文，TalkBack 朗读工具标签，截图可人工核查。
F08 32×32 新用户用不超过 5 个核心交互步骤画出并保存一条精准直线。
F09 内存不足场景不会使自动保存输出一个被截断的“成功文件”。
F10 GitHub Actions 产物与提交 SHA、编译版本、无 INTERNET 权限校验、APK SHA-256 一一对应。

# 16. Android Emulator 与真实设备验证流程

1. 使用 JDK 17、可复现 Gradle 版本、Android SDK 35/后续兼容版本进行原生 assembleDebug。
2. JVM 单测运行 core-pixel、core-geometry、core-preview、core-command、core-selection 各算法；输出 JUnit XML 和 golden pixel fixtures。
3. Android Emulator 上至少测试 API 28、API 33、API 35；可添加 API 36 验证后续行为。每个 API 测试手机竖/横屏、手势/三键导航、字体缩放和 320dp 小窗口（以实际支持能力为准）。
4. 专门写手势回放：手指从一个像素拖到另一个像素，在手指仍按下时截图，截图必须出现预览直线；再截图松手/精修/确认/撤销状态，逐步骤保存。
5. 对 UI 使用 Compose testTag，严格断言顶部按钮 bounding box 与安全矩形无相交；对于 cutout 的真实物理形状需结合可配置测试设备、WindowInsets 和截图人工审查。
6. 模拟器启动成功不等于 UI 测试成功；UI 测试成功也不等于 screenshot 拉取成功。分别报告结果，截图必须从可靠应用存储路径获取，不能在 adb pull 路径失败后照样宣称通过。
7. 真实设备专项：一款普通紧凑 Android 手机、一款异形挖孔屏、一款大屏或横屏设备、支持触控笔的设备（有条件时）。不具备设备就写 NOT_TESTED，不得假装。
8. 录屏必须显示手指/触控注释或 input replay 轨迹，并看到预览随着轨迹变化；单张结果 PNG 不能证明动态预览。
9. 性能记录：设备型号、API、屏幕刷新率、density、画布尺寸、图层帧数、笔刷尺寸、p50/p95 触控延迟、frame pacing、CPU、内存和 GC 暂停；报告不能只写“不卡”。
10. 自动化运行失败时必须先打开原始 logs 分析是源码、模拟器、网络依赖还是截图路径问题，再确定修复策略，不能无证据反复重跑。
11. APK 交付先做 Debug 内部测试，正式 release 签名密钥单独保管，永远不传到 GitHub 公开仓库。
12. 所有可安装版本都附上 SHA-256 和对应 Git commit；问题版本保留回滚入口。

# 17. 量化性能目标与升级门禁

所有指标是目标，必须标注设备、场景和是否实测：

- 常用 128×128、256×256 画布的几何形状预览目标稳定接近设备刷新率（一般不低于 60fps），对于复杂滤镜可有进度反馈和异步精细化。
- 触控笔/手指位置到预览位置 p95 目标小于 50ms；真实数字要采集，不可靠肉眼估计。
- 简单直线或矩形预览的算法时间应远小于单帧预算；如超时，则检查重复全画布复合、位图分配、Compose 状态传递与 UI 线程 I/O。
- 自动保存不得在主线程阻塞绘制；单笔状态撤销不应导致整张图闪白。
- 手势输入 120Hz 与画面 60Hz 不造成漏点；可以合并预览帧但不能吞掉提交笔触。
- 在 320dp 窄屏、字体 1.5 倍情况下，工具仍可操作；若有溢出菜单，核心工具使用不超过两层菜单。
- 辅助 HUD、网格、蚂蚁线、手柄动画可以降帧/关闭，但逻辑像素输出不能降质量。
- 后台/低电量模式减少实时无关视觉动画，但不改变预览/提交一致性。

**门禁 G1**：顶部安全区、底部导航区、屏幕旋转均通过截图/坐标测试。
**门禁 G2**：直线、矩形、椭圆、选区在手指移动中有真实预览，并通过预览/提交一致性测试。
**门禁 G3**：几何工具确认/取消/撤销/重做没有残影、数据损坏和异常 autosave。
**门禁 G4**：三种触控模式完整覆盖线/形状/选区，双指不中断作品。
**门禁 G5**：性能、透明边缘、导出、图层以及旧工程回归成功。
**门禁 G6**：图层、曲线、渐变、动画和 3D 以阶段化真实功能上线，不再使用占位按钮。

未通过 G1/G2 绝不允许宣称“适配手机专业绘图版”，因为那是用户明确指出的基础问题。


# 18. 分阶段真实开发命令：严格顺序，不允许跳关

## SPRINT 0 — 建立基线并复现问题

必须先完成：
- 读取当前 branch/main 与最近成功的 Android Actions，锁定 commit SHA；
- 用现有 APK 和真实模拟器检查状态栏覆盖、顶部返回/撤销触摸区域、屏幕可用尺寸；
- 写自动化脚本录制“按下直线—拖动中截图—抬起截图—撤销截图”；
- 统计 P0、V1.1 中哪些工具直接修改文档、哪些松手提交、哪些已有 preview；为每项标记原始失败；
- 记录绘制引擎当前的依赖树和 UI 复杂耦合，并建立向后兼容与回滚计划；
- 构建一组可复现“有问题的版本”截图/日志作为修复前证据。

产物：BUG_AUDIT + 预览缺口表 + baseline APK SHA + golden 画布输入数据。

## SPRINT 1 — 全手机安全区修复（先于一切新工具）

实现：
- enableEdgeToEdge 与窗口区域统一策略；
- SafeTopBar、SafeToolDock、SafeCanvasViewport；
- Insets 处理层与 UI 布局/绘图逻辑完全分离；
- Android 15+ 系统栏、顶部挖孔、底部导航、输入法、横屏、分屏；
- 用布局测量和 Compose UI 测试断言所有主要控件的 safe bounds；
- 用模拟器截屏对照修复前，明确证据指向“按钮可见、可点击、不卡到系统栏下面”。

通过标准：设备形态下所有主要交互控件可用且不与 cutout/statusBars/navigationBars 交叠；旧 PNG 导入、笔刷、保存操作无回归。

**禁止只在最外层加一个魔法 24dp padding 然后宣布解决。**

## SPRINT 2 — 统一 PreviewSession 实现

先实现最小交互垂直切片，只有一个 ToolController 也必须采用未来可复用架构：
- 选择直线 → PointerDown 建 Anchor；
- PointerMove 在独立 draft 上用真实 Rasterizer 更新像素线；
- 画布 CommittedBitmap 与 DraftBitmap 复合显示，控制柄/HUD 单独绘制；
- PointerUp 转入 CommitReady；用户可拖动端点；
- 点击确认写 PixelCommand；点击取消完全不写；
- 一次 undo 可撤销，redo 恢复；
- 屏幕缩放和 orientation 改变不会让图像错位；
- 加入截图脚本证明“拖动途中就能看见线”。

通过标准：全部 G1/G2 直线项；确保 app 可以安装运行，有截图和记录。

## SPRINT 3 — 把所有形状工具迁入 PreviewSession

按顺序：矩形/填充矩形→椭圆/实心椭圆→矩形/椭圆选区→多边形/折线→Bezier→渐变。不得每次重写独立状态机，只定义 Tool 参数及 Rasterizer。

补齐：
- 预览控制柄拾取；
- 约束/吸附；
- 透明 Alpha；
- 图层锁定与选区遮罩；
- “松手完成”与“确认完成”可切换；
- 独立精确准星和偏移触控模式；
- 当前正在操作的工具 Tooltip 与状态 HUD。

每完成一个工具，展示视频中 PointerMove 至少两段中间形态；只给最终图不能通过验收。

## SPRINT 4 — 真正的选区浮动编辑与剪贴板

实施 SelectionMask UI→矩形/椭圆/套索→magic wand→内部复制/剪切/粘贴→FloatingSelection→移动/缩放/镜像/旋转→合并 Command→工程序列化。

粘贴后不能直接覆盖中心：必须先预览，可拖动，所有处理都可以取消并恢复源内容。系统剪贴板留作独立经过 URI 权限测试的阶段。

通过标准：选中 5×7 透明区域，复制粘贴到指定位置，精修、确认、撤销、保存重开、PNG 导出，均通过逐像素比对。

## SPRINT 5 — 专业笔刷与材质预览

实现 BrushDescriptor、StrokeSeed、PixelDab、预览路径、硬边形状、沿路径印章、色彩权重、对称复制、Bayer/误差扩散、渐变、模糊、WrappedCanvas。

先确保 WYSIWYG 不变量，再优化混合模式和精细纹理。算法未通过固定 seed test 时不能在 UI 中显示随机材质已上线。

## SPRINT 6 — 动画、Tilemap、3D 分阶段接入

1. Frame/Cel/OnionSkin 与时间轴 preview；
2. TileSet/Tilemap/周期纹理与材质预览；
3. Cube/UV/2D texel 同步；
4. 骨骼/Graph Editor 关键帧曲线及导出。

要求始终保持普通 2D 手机画板极简可用，不因为高级工作区而增加启动负担。

# 19. 实际代码实现的技术陷阱与明确禁令

**禁令一：** 不要用 Android Canvas.drawLine 的抗锯齿向量线当作最终像素预览，而真正提交时用另一套 Bresenham。结果可能边界不相同。

**禁令二：** 不要在 PointerMove 中频繁对 PixelDocument.beginStroke/setPixel/finishStroke 做正式 commit，再把撤销历史当作“临时预览”。这会引发撤销混乱、自动保存污染、残影和性能问题。

**禁令三：** 不要把内容安全区用固定 dp 硬编码；不同导航、刘海、系统缩放、窗口形态差异巨大。

**禁令四：** 不要在 safeDrawingPadding 已应用后再次对子元素 systemBarsPadding 叠加消耗过的 Insets；反之也不能以为父容器绘制在安全区，按钮就自然安全。

**禁令五：** 不要将输入从 Activity 获取 screen rawX/rawY 后用常量减 titleBarHeight；使用局部 LayoutCoordinates 与官方 Pointer APIs 计算。

**禁令六：** 不要把低分辨率预览靠 GPU 双线性缩放成模糊画面；真实 pixel buffer 设置 NEAREST。UI 控制柄/阴影可以抗锯齿，图片不能。

**禁令七：** 不要用 Math.random() 每帧生成随机纹理，预览与结果会不断变化。必须用固定 seed 和笔触序列 ID。

**禁令八：** 不要在 1024² 画布的每一像素创建 Compose 组件；使用 bitmap / tile rendering。

**禁令九：** 不要把 InputRouter、PreviewEngine、Renderer、History、Serialization 留在单文件 Activity 中；分模块、按领域依赖。

**禁令十：** 不要把选区 bbox 画框当作“真正不规则选区可用”，真实 mask 必须参与选择和效果计算。

**禁令十一：** 不要在动画播放时直接编辑原 Cel 指针却没有版本化，导致播放和绘画竞态修改文件。

**禁令十二：** 不要用模型视图的平滑外观掩盖错误 UV texel；3D 必须展示真实贴图像素映射。

**禁令十三：** 不要把手机外观上有图标的原型说成“功能齐全”。工具状态为 PLANNED/ENGINE_ONLY/UI_WIRED/TESTED/RELEASED 必须逐项区分。

**禁令十四：** 不要在 GitHub Actions 编译通过后就声称真实设备手感良好。最少需模拟器功能验收 + 用户真机触摸回归与性能记录。

**禁令十五：** 不要跳过 UI 截图：顶部安全区和拖动实时预览正是当前版本最严重的问题，必须留下“修复前/修复后”真实运行证据。

# 20. 安全、开源研究与责任归属

本应用为完全本地工具，不包含第三方账号、云图像服务、广告、跟踪分析、网络权限、网络生图。保持全部项目文件在用户掌控下。可提供导出备份，由用户自己管理，不自动上传。

公开研究优先参考：
- Android 官方 Compose Insets： https://developer.android.com/develop/ui/compose/system/insets
- Android 官方 Insets UI： https://developer.android.com/develop/ui/compose/system/insets-ui
- Android Edge-to-edge： https://developer.android.com/develop/ui/compose/system/setup-e2e
- Compose Gesture 文档： https://developer.android.com/develop/ui/compose/touch-input/pointer-input/understand-gestures
- Android Stylus 历史样本与输入设备： https://developer.android.com/develop/ui/compose/touch-input/input-compatibility-on-large-screens
- Android 高级主动笔与手掌拒绝： https://developer.android.com/develop/ui/compose/touch-input/stylus-input/advanced-stylus-features
- Android Window Size Classes： https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes
- Android Fold-aware： https://developer.android.com/develop/adaptive-apps/guides/foldables/make-your-app-fold-aware
- Android Orientation and resizability： https://developer.android.com/develop/adaptive-apps/guides/app-orientation-aspect-ratio-resizability
- Aseprite 官方文档： https://aseprite.com/docs/
- LibreSprite： https://github.com/LibreSprite/LibreSprite
- Krita Assistants： https://docs.krita.org/en/user_manual/painting_with_assistants.html
- Blockbench： https://blockbench.net/

这些来源用于理解成熟工具的行为和官方 API，不自动授权复制商业软件 UI、图标或 GPL/EULA 代码。所有新引入库需要核查许可证和发布义务。

# 21. 每轮交付结果报告模板

标题：Pixel Atelier V1.2 / Commit / APK build / Emulator / Physical Device

1. **本轮修复问题 ID**：对应 Issues / BUG_AUDIT、复现步骤及具体变更。
2. **代码文件**：新增模块路径、修改文件、算法职责、接口变化。
3. **交互功能真实现状**：哪些功能已 UI_WIRED，哪些只有 ENGINE_ONLY，哪些尚无实现。
4. **录屏与截图**：至少顶部安全区、正在拖动的线、松手后精修、确认、取消、撤销五个关键状态。
5. **逻辑像素一致性测试**：预览和提交输出 hash、单测总数/失败数。
6. **系统 Insets 验收**：测试 API/设备、顶部与底部安全矩形、cutout 状态。
7. **Android 编译**：Gradle 版本、Java 版本、SDK、APK 产物、build logs。
8. **模拟器和真机**：分开记录；未测写 NOT_TESTED。
9. **性能报告**：画布尺寸、帧率、内存、延迟测量方法及实测值。
10. **数据安全报告**：保存恢复、撤销、PNG roundtrip、无网络权限。
11. **已知失败与下一步**：说明未通过项的影响、具体修复计划，不允许隐藏。
12. **可下载交付**：可安装 APK、SHA-256、签名类型、Git commit、Actions Run URL。

每一份成果必须可被别的工程师重新构建、复核和继续开发。

# 22. V1.2 最终强制指令（可直接交给开发团队）

**现在立即按以下顺序执行，不要只绘制一张漂亮界面概念图：**

第一，彻查 GitHub 中的现有 Android 代码及所有 CI 日志，把被状态栏盖住的顶部操作、无实时预览的直线和其他形状、没有确认/取消的选区编辑问题做成明确可复现缺陷。

第二，以 Android 官方 Edge-to-edge、WindowInsets、Adaptive Window Size 和 PointerInput 为基础，实现真正正确的顶栏/画布/底部 Dock 布局。在各类挖孔屏、手势导航和横屏上验证按钮可见且可触摸。不得把定值 padding 作为修复。

第三，建立所有工具共享的 PreviewSession、ToolController、DraftRasterBuffer、SelectionOverlay、HandleManager 和 CommandDispatcher。把直线作为第一条真实开发垂直链路，完成拖动实时像素预览、端点二次编辑、数值输入、吸附、确认/取消、单笔撤销和保存一致性。

第四，把矩形、椭圆、选区、复制粘贴、变形、画笔、渐变、抖动、无缝材质和复杂动画等按同一预览合同逐项上线，不为每个工具各写一套互不兼容的状态机。

第五，完成 GitHub Actions 的 JVM 逻辑测试、Android APK 编译、模拟器手势回放、真实运行截图和像素 golden tests。未通过实际验收，不得声称功能已完成，更不得宣称达到商业专业级软件。

第六，不断提升手机 UX 的可理解性、精确性和稳定性。高级能力必须采用渐进显示，普通用户能立即作画，专业用户能深入控制每个像素、图层、线条、参数、动画帧与 UV 纹素。

**最终成功标准：用户打开真实离线 APK，在任何合规支持的 Android 手机显示环境中，都能看见完整安全的顶栏工具；选中直线，在手指移动的每个阶段看到可预测、真实像素级、随移动更新的预览；松手后精修并确认，最终图像与预览逐像素一致。所有其他绘制操作必须遵循同样可靠的交互逻辑。**

---

**文件地位：** Pixel Atelier V1.2 是 V1.0 / V1.1 的增补和强制修复规范。此前“没有实时预览”“顶部挖孔屏按钮被遮挡”等体验错误，禁止被标记为设计偏好或非关键问题。只有通过源码、截图、测试和真正的用户操作证据，才能关闭这些缺陷。

# Pixel Atelier V1.1 — 图形内核、交互与数据结构工程蓝图

这是 MASTER_PROMPT_V1_1_PROFESSIONAL.md 的技术实现附录，不表示功能已完成。目标是为 Kotlin/Android 原生工程建立可测试的接口契约、精确算法、性能边界和兼容规范。

## 1. 现有实现审计（基于 P0 源码）

目前 app/src/main/java/com/pixelatelier/app/PixelEngine.kt 使用单张整数 ARGB IntArray 为每层存储像素，layers 为 MutableList，撤销使用每笔像素 before/after Diff；MainActivity.kt 中聚合所有 Compose UI/画笔/手势/画布渲染；ProjectStore.kt 用 ZIP + JSON 清单写入 .pixelatelier 工程。它适合 P0 入门，但动画、选区、三维编辑不能简单挂载在当前 mutable UI 之上。重构时保留 P0 全部能用的工具，以“读旧工程 / 新工程 schema v2 / 标记用户迁移提示”的方式平滑升级。

### 已知结构风险与对应治理
- 一笔事务与图层结构命令缺少统一撤销：引入 CommandJournal，分别保留 PixelDiff / SelectionChange / LayerChange / FrameChange / ModelChange。
- 全幅 composite 每次更新 + Bitmap 重新生成：引入 dirty bounds / 分块缓存 / Bitmap 像素缓冲复用；需要基准测试决定是否 GPU 绘制。
- UI 和数据处理都在一个 Activity 文件：拆成 feature 模块并用 ViewModel 持有文档状态。
- 项目工程只保存单帧层栈：为 frame/cel/selection/transforms/model 设计新 schema，确保 v1 文件继续读取。
- 目前内存中使用整层 IntArray：大工程需要分块、写时复制与共享只读资源，避免每次自动保存复制整个工程导致卡顿。
- 当前多指处理能取消正在画的笔画，但高级选择/变换/悬浮内容还没有状态机，需要统一手势仲裁。

## 2. 数据契约

建议 Kotlin 定义纯逻辑模型（以下是类型层面的规格，并非当前实现代码）：

PixelCoordinate(x:Int, y:Int)
PixelRect(left:Int, top:Int, rightExclusive:Int, bottomExclusive:Int)
Color32(argb:Int)
PaletteIndex(index:UByte)
RasterTile(tileX:Int, tileY:Int, pixels:IntArray, dirtyVersion:Long)
SelectionMask(bounds:PixelRect, backing:BitSet | ByteArray, mode:Hard | Weighted)
RasterCel(celId:UUID, layerId:UUID, frameId:UUID, contentRef:AssetId, offset:PixelCoordinate)
BrushPreset(id:UUID, stampRef, colorSource, spacing, dynamics, scatter, seedMode)
GeometryPath(segments, transform, strokeStyle, fillStyle)
TransformNode(affine:Matrix3x3, warpGrid?, sourceRef, sampler, tileBoundaryMode)
CurveKeyframe(timeMs:Long, value:Float, interpolation, inTangent, outTangent)
ModelNode(id,parentId,pivot,translation,rotation,scale)
CuboidNode(min,max,faces[6].uvRegion,materialId)
TextureAsset(id, rasterDocumentId, contentHash)

每个数据模型需要：
- JSON 或二进制 schema 的稳定 ID / 版本升级；
- 参数边界限制；
- 深拷贝或写时复制语义；
- deterministic hash；
- 输入校验与失败报告；
- rollback、copy、redo、save/reopen 的等价性测试。

## 3. 逻辑像素、设备物理像素、画布像素

使用双向变换：canvasView = Translation(tx,ty) × Scale(z) × pixelCenter(p)。
logicalX = floor((screenX - tx) / z)，logicalY 同理。
当发生屏幕旋转、异形屏 safe inset、系统导航栏、手势缩放或悬浮底部面板时，仅更新 viewport transform，不改变 document coordinate。

对 3D UV 编辑额外定义：
screen → unproject ray → triangle intersection（barycentric or cuboid face） → UV normalized → texel floor(u * W, v * H) → document pixel。
在所有变换下使用稳定的面 ID 和纹素映射，禁止用屏幕坐标直接涂图片。

## 4. SelectionMask 算法协议

核心接口：
- buildRect(rect), buildEllipse(bounds), buildPolygon(vertices), magicWand(seed,tolerance,neighbors,source), liveWire(anchor,edgeMap), selectAlpha(threshold)
- combine(a,b,Replace|Union|Intersect|Subtract|Xor)
- transform(mask, matrix, sampler)
- dilate(radius), erode(radius), invert()
- cropToBounds(), computeTightBounds(), serialize()

规则：
A. mask 内像素的几何中心定义为 (x+0.5,y+0.5)。
B. 所有 rect 采用半开区间，像素数 = max(0,right-left)*max(0,bottom-top)。
C. 选择有透明洞的多边形需要独立洞轮廓或组合差集。
D. 大范围魔棒使用固定容量队列或块扫描，不允许递归 DFS 引发堆栈溢出。
E. 当前画布色彩模式索引色时，容差可以按 palette index 精确匹配或以 palette 展开颜色比较。
F. 空选区命令须安全 no-op，不能形成不可撤销的空操作。
G. 移动动态选区只修改 mask；移动实际像素时必须形成 FloatingSelection。
H. 选区历史恢复包括 mask 组合模式、边界和对象状态，而非仅恢复图像。

### 移动/变形测试向量
对 4×3 图像按行颜色：
A B C D
E F G H
I J K L

选取 [1,0,3,2) 对应 B,C,F,G。复制后粘到左上新位置：
B C . .
F G . .
. . . .
原始目标若以透明为背景，必须只覆盖选中 mask 的有效像素；裁剪和 alpha 按设计语义执行。重复逆向操作要检查恢复原文档哈希。

## 5. Clipboard 事务

内部 ClipboardDocument 包含 bounds、mask、源栈引用或合成像素、palette snapshot、source color mode 和 normalized anchor。剪切只能在用户最终确认后写入源 Cel 或作为同一原子事务；取消时源层不变。支持将浮动内容从剪切图层移出后的原位粘贴。

选区跨层复制必须明确两种不同模式：
- Copy from Current Cel：只复制活动层像素。
- Copy Merged：只读合成、不能暗改底层，目标默认生成新图层。

Android 外部剪贴板路径：
- PNG 先写入应用 cache，经 FileProvider 生成 content URI；
- ClipData MIME image/png、grantReadUriPermission，复制大小受安全策略限制；
- 导入系统剪贴板可走 Intent/ClipboardManager，需注意 Android 系统版本的读取限制和用户显式操作；
- 操作过程不允许使用网络。

## 6. Geometry 与位图变换

LineSampler：Bresenham 八方向覆盖，端点包含；PixelPerfectCornerPolicy 独立实现，只修正规范定义的多余拐角。
EllipseSampler：对整数外接矩形计算可复现轴对称栅格，圆退化为点/线。
BezierSampler：固定自适应平坦度 ε（以逻辑像素尺寸定义，不依赖物理 DPI），离散点序列用 Bresenham 连接。保持从同一控制点生成的像素集合稳定。
AffineWarp：对目标像素中心逆映射到源空间，再最近邻采样。非法矩阵、不适定透视与极大变形直接提示，不可输出 NaN 或空数组。
Transform preview：只渲染源数据快照和当前参数，不修改底层 Cel；Commit 生成 PixelDiff + MaskDiff + metadataDiff，一个撤销动作完整还原。

矩阵方向必须统一并记录：例如 2D 像素 Y 轴向下，旋转正方向定义为屏幕上顺时针；3D 世界 Y-up 或 Z-up 可以单独选定，但导入导出边界必须有转换记录。

## 7. 曲线编辑与速度曲线

几何路径曲线：
- P(t)=(1-t)^3 P0 +3(1-t)^2 tP1 +3(1-t)t^2P2 +t^3P3；
- 对 0≤t≤1 采样，适配 curvature / flatness；
- 拖动控制柄只影响 preview；
- 用户可按“连续曲线”“折点”“端点”“闭合”“保持切线长度”编辑节点；
- 画笔沿曲线 stamp 分配时使用弧长采样，使间距与控制点分布无关。

运动关键帧曲线：
- 一般 scalar Hermite：p(t)=h00 p0+h10 m0+h01 p1+h11 m1；
- 曲线导数 dp/dt 是速度，切线影响速度；
- Step/Linear/Cubic 真实影响运动值，不是只改变时间轴视觉。
- 3D 旋转 quaternion 插值需 slerp/nlerp 并规范化。
- 2D 帧序列总时长 = sum(frame.durationMs)，若加 time remapping，应明确是否复制帧或改变采样时间，不改变每帧像素。

## 8. Raster Brush 与随机性

BrushDab：由 brushPreset + point + normalizedPressure + seed + dabIndex 生成像素足迹。Dab 在同一点多次命中时是否复合 alpha、是否按笔触一次合成需要选择：
- Accumulate：每个 dab 单独合成；
- Per-Stroke Coverage：每个逻辑像素在一笔中最多写一次有效 alpha（适用于均匀笔刷）。
输出的像素集合按固定扫描顺序与 alpha 合成，避免多线程无序导致细微差异。

随机画笔固定 seed 不等于整个世界所有笔画相同；seed = Hash(documentId, strokeId, userSeed)，可选择锁定后跨文档复现；RandomColorSampler 按权重累计分布，校验权重≥0、sum>0、palette 索引合法。定向 texture stamp 可选 world-aligned 或 stroke-aligned。

### 智能抖动
- Ordered Dither：阈值取决于 (x mod matrixW, y mod matrixH)，位置稳定；
- Error Diffusion：严格规定 scanline 方向、边界、误差 alpha 处理；
- Palette-aware：输出严格限定在指定索引集合；
- Edge-aware：边缘保护区内改变抖动强度，而不是强行随机点；
- Stochastic Pattern：若使用蓝噪声，固定矩阵和 seed，禁止设备之间结果变异。

## 9. 无缝循环模式测试

当 W=5,H=3，画笔写入 (-1,1) 时 X-wrap 目标 (4,1)，XY-wrap 一致；写 (5,-1) 时 XY-wrap 目标 (0,2)。所有负坐标执行 floorMod，Java/Kotlin 的 % 对负数不是 floorMod，需要手动调整：
wrap(n,size) = ((n % size) + size) % size。

对 x=0,y=0，半径 2 方形画笔越过全部边界：
- 目标格去重，不得导致 alpha 重复累积（除非特意选 Accumulate 并且重复采样属于不同路径 dab）；
- X-only 只包 x，Y-only 只包 y；
- brush shape 的落点与原始坐标相对位置保持一致；
- brushTexture UV 可跨平铺，但存储只保存 5×3 格。

周期滤镜：卷积读取像素时也用 wrap 索引，不能先用 clamp 使边缘产生不连续。

## 10. 动画与合成实现

FrameSequence 管理 ordered frameId 与 durationMs，LayerTree 管理嵌套层，CelStore 采用 (layerId,frameId) 查找。
显示顺序：背景棋盘（不导出）→ 之前帧预览（onion）→ 当前帧按 layer order 合成 → 后续帧预览（onion）→ 未提交选区/辅助线（不导出）。
导出当前帧必须只取当前 Cel 组合，不得把 onion/参考尺/光标/网格写进 PNG。

优化策略：用分块 dirty revision 复用上一帧未改的 Cel；playback 时只预解码下一帧、按实际时长调度，掉帧时按 monotonic time 选择 frame 而非无止境延迟。大型动画需要缓存上限和预算。

GIF 编码：必须量化调色板和正确处理透明色索引/延时限制；APNG 需要明确 dispose/blend 运算和读回；只在有独立测试后开放“已支持”的菜单。

## 11. 3D 贴图/模型工作区实现

ModelDocument 不与 PixelDocument 继承可变像素数组；通过 TextureAsset ID 关联 RasterDocument。一个 texel 改动触发 UV 材质纹理局部更新，3D 预览和 2D UV 同步刷新，禁止维护两份不一致的图像真值。

Face 选择：
- screen ray 与 3D BVH（初期少量 cuboid 可顺序遍历）求交；
- 取最近正深度 hit，记录 nodeId、faceId、uv、pixelCoord；
- 选择面后支持框选 UV 岛、画笔落点锁定、面填充、岛内镜像。
- UV auto unwrap 先采用 cuboid 规则展开；任意 mesh unwrap 后续单独处理。

默认单位和轴约定写入模型 schema；若选 Y-up，Minecraft 出口按对应格式做坐标映射，不能简单调换顶点导致法线或旋转方向错误。表面贴图的过滤器必须 NEAREST；视角交互可流畅抗锯齿，但不能修改实际 texel。

3D 动画：
- SceneGraph parent-to-child worldMatrix 传播；
- Bone bind/inverseBind；多部件刚性方块动画先做非蒙皮层级动画；
- 需要连续蒙皮时才增加权重/skin matrix，不要让方块体凭空变形。
- 轨道动画支持实时播放与固定时间采样测试；
- 曲线编辑有数值坐标读数，允许精确输入 tangent 值。

## 12. 性能与精确度

目标是可测指标，不能现在宣称通过：
- 128²/256²/512² 项目常用笔画目标 60fps；
- p95 触摸落笔到屏幕刷新延迟目标 50ms，实际必须通过 systrace/FrameMetrics 实测；
- 3D 低多边形场景目标 60fps，但需给定模型数量、纹理大小与测试机；
- 磁性选区大图计算期间预览必须可取消，不可卡死主线程。
- 内存：每逻辑 RGBA 像素 4 字节；W×H×layers×frames 的理论上限很容易超过设备内存，必须按设备动态限制与磁盘懒加载。

ViewModel 负责 UI 状态；图形核心单线程命令提交以保证顺序；后台 worker 基于只读快照计算预览，返回时比对 documentRevision，不符则丢弃。一个工具每次 commit 精确产生一个历史条目。自动保存合并连续变化但不能遗漏最后有效状态。

## 13. 移动端交互验收脚本

录制可回放触摸轨迹，至少覆盖：
1. 纵向屏幕画布中央框选；
2. 选区悬浮快捷条复制、粘贴、移动；
3. 两指缩放插入单指绘制中途；
4. 偏移准星模式选中 1×1 格；
5. 椭圆调整角点，边界保持整数；
6. 对称轴拖动和固定；
7. 随机画笔种子锁定后重画；
8. 平铺模式从左边跨右边；
9. 时间轴拖动/洋葱皮/播放时长；
10. 3D 正交视图与立方体 UV 面定位。
手机 320dp、不同系统字体大小、打孔屏 safe inset、横屏、多窗口、折叠屏场景必须回归。

## 14. 可执行工程门禁

每个功能 PR 必须含：
- 接口/用户行为定义；
- golden fixtures：像素输入和预期像素输出；
- 权限影响审查（离线无 INTERNET）；
- 属性与边界测试；
- 可撤销/取消验证；
- schema 保存/加载 roundtrip；
- APK build 和 Android UI smoke；
- 适用设备的性能说明；
- 失败说明、截图、可追溯提交。

新增代码的 licensed source、生成资源、外部模型与贴图都要在 OPEN_SOURCE_RESEARCH_V1_1.md 登记来源和许可证，未经明确合规审核不得复制第三方源码。

## 15. 允许声明成功的标准

“ENGINE_ONLY”：算法测试可执行，UI 尚未接入；
“UI_WIRED”：用户能操作，存在必要 preview/undo/save；
“TESTED”：JVM/模拟器测试通过，已上传报告；
“DEVICE_VERIFIED”：真机截图/性能/手势回归通过；
“RELEASED”：实际签名 APK 可交付，已检查功能和回归。

不允许用“GitHub 文件存在”“按钮出现”“概念图已画”“自动测试未运行”替代 TESTED 及以上状态。

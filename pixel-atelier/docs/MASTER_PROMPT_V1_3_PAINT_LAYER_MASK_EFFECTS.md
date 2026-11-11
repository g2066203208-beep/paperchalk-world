# PIXEL ATELIER — MASTER PROMPT V1.3
## 原生 Android 专业像素艺术工作室｜基础绘画补全｜清空画布｜真实图层混合｜非破坏遮罩｜滤镜效果｜工具生态｜动画与 3D

版本：V1.3 PROFESSIONAL PAINTING CORE & NON-DESTRUCTIVE WORKFLOW
日期：2026-10-31
定位：V1.0/V1.1/V1.2 的强制增补；对原仓库 pixel-atelier/ 增量研发，不复制成熟软件，不以 WebView 取代原生。
状态：规划与技术契约。文件提交不等于功能已经在 APK 实现。

> 核心原则：不是工具数量越多越专业，而是每个基础动作都有明确范围、准确预览、正确图层作用域、无损撤销、稳定保存与真实测试。先修完整基本画板，再做动画与 3D 工作室。

# 00｜必须正视现有的缺陷与严格执行门禁

已审查当前源代码：PixelDocument 以每层 IntArray 存储 ARGB，现有 floodFill 为四方向连通和颜色精确匹配，立即修改当前层；有图层隐藏、锁定、不透明度、普通 Alpha 合成，但没有真正 Overlay/Multiply/Screen 等混合；没有可编辑遮罩数据、图层分组、专业清空画布/清空层/清空选区入口；图层增删会清空 Undo/Redo。V1.2 的预览改造尚未完成所有设备验收。

第一门禁：
1. 画笔、油漆桶必须具备清晰当前层/选区/Alpha/参考图层的语义。
2. 清空当前层、选区、所有内容均可逆，可确认、可恢复，不误删其他帧。
3. 像素修改与图层结构修改都进入统一 Command Journal。
4. 普通、正片叠底、滤色、叠加、柔光等按确定的数学公式执行。
5. 遮罩是可编辑、非破坏性的文档数据，不是“改一次 Alpha”后称为遮罩。
6. 预览、撤销、重新打开、PNG 导出的最终合成逐像素一致。
7. 所有功能按 PLANNED、ENGINE_ONLY、UI_WIRED、TESTED、DEVICE_VERIFIED、RELEASED 明确标记。

# 01｜完整专业基础操作，不可再遗漏

基础编辑必须至少包括：新建、打开、导入图片、保存、另存为、导出 PNG、导出原生工程、复制工程、重命名、画布缩放平移、撤销重做、裁剪、修改尺寸、按最近邻改变逻辑像素大小、翻转内容、旋转 90 度、清空选区、清空当前层、清空当前帧、清空所有图层/帧、清除 Alpha、当前层填满前景色、重置视口、切换透明底纹、复制剪切粘贴、原位粘贴、全选反选、隐藏锁定复制排序合并图层、颜色替换、吸管、画笔橡皮、油漆桶、遮罩、图层混合。

**严格区分**：观察缩放≠改变实际图像大小；清空图层≠删除图层；清空当前帧≠清空全部工程；重置视口≠清空作品；颜色叠加≠Alpha 锁≠遮罩≠效果叠加。

默认值：新工程透明 ARGB；油漆桶 4 连通、容差 0、当前层采样/写入；有选区时默认受选区限制；遮罩默认全白；Normal、Opacity 100%、Alpha Lock 关闭；高风险清空操作须确认；所有重要操作具备 Undo、Redo、保存和真实像素预览。

# 02｜专业油漆桶的完整操作与算法

## 02.1 参数
- Contiguous（局部连通）/Global（全图所有相似像素）。
- 4 邻域/8 邻域可切换。
- 容差 0–255；颜色距离可选 max-channel ARGB/RGB Euclidean，可扩展 Lab ΔE；必须显示定义，不能混用无名算法。
- Alpha 容差独立开关；透明像素颜色处理规则明确。
- 采样：当前层/可见层合成/指定参考层；目标：当前可编辑 RasterLayer/显式新建填色层。
- 仅选区、仅透明区、保留 Alpha、锁透明度、填充边界扩张/收缩、图层锁定遵守。
- 输出：纯色、背景色、图案、可控渐变、Palette 索引色、按图层 Alpha 着色。
- 可选 X/Y/XY 周期性连通区域；当使用 wrap，区域邻居按 floorMod 映射。
- 实时展示候选填色区域、影响像素计数、当前目标层，允许修改容差、确认或取消。
- 若大范围修改超过设定阈值给出警告；不应无提示把整个作品染成单色。

## 02.2 算法
不可使用递归 DFS。采用扫描线泛洪或固定上限的 BFS 队列，每像素最多入队一次。使用只读采样快照计算 mask，再将结果交给目标层命令，避免“边填边读”导致种子区域扩张错误。目标色与原色相同或者区域无实际变化时不生成历史。对透明和半透明像素按 unpremultiplied ARGB 与选定颜色距离计算。错误输入越界安全 no-op。大型填色在可取消 worker 中计算，返回后比较 document revision，不允许旧任务覆盖新画作。

## 02.3 UI
点击→显示待填区域及预计结果（不改真图层）→容差滑杆改变、预览重算→确认生成一次撤销事务；可设置“立即填充”快捷模式。手机界面显示 4/8 邻域和参考源，防止用户不知道为什么填不到目标区域。

## 02.4 强制测试
封闭轮廓不漏色；4/8 对角分离不同；容差单调扩大区域（固定度量下）；Alpha 阈值；跨选区边界正确裁切；采样可见层不会修改其他层；特殊透明像素；跨周期边界；取消无修改；Undo/Redo；预览=导出像素。

# 03｜清空画布、清除、填满与重置：正式产品语义

必须提供独立操作菜单，不能一个“清空”按钮暗自决定范围：

A. 清除选择范围：默认当前活动图层/当前 Cel，选择区其他地方绝不修改。
B. 清空当前图层：当前层当前帧所有像素改为 ARGB=0，保留层名称、mask、混合模式和透明度。
C. 清空当前帧：当前帧全部允许编辑的 RasterCel；展示受影响层数、跳过的锁定层。
D. 清空全部图层：多层清除但保留图层树和工程 ID；若包含多个帧需提示是“当前帧”还是“所有帧”。
E. 删除图层：独立结构命令，不能与清除像素混淆。
F. 用前景/背景色填满层或选区：与清成透明独立。
G. 清除图层遮罩：不是擦除图层像素；“重置遮罩全白”与“遮罩全黑”分开。
H. 重置视口：仅改变 Zoom/Pan，无任何 PixelDiff。
I. 裁剪画布：尺寸变更需要预览越界区域与撤销，不能偷偷丢失超出部分。

UI 从编辑→清除进入，显示当前作用范围、受影响帧/图层、颜色和 Alpha 结果，单次 Undo 撤销。高风险“全部帧/全部层”必须二次确认、先保存版本或提供可撤销快照，避免误操作。

实现 ClearPixelsCommand，显式记录 layerIds/celIds、mask、before/after、revision 与事务 ID。命令提交原子化；一个图层被锁定时不能为了完成全部清空而越权。测试包括两个彩色层清空一个不影响另一层，按 mask 仅清选区，多帧清空不改其他帧，反复 Undo/Redo hash 一致、关闭重开保留内容。

# 04｜图层树和基础图层系统的完整数据模型

设计 LayerNode：
stableId、name、type、parentId、zOrder、visible、locked、alphaLocked、positionLocked、opacity、blendMode、clipToBelow、maskIds、effectIds、revision、metadata、frameCelRefs。

LayerNode 类型分层实施：
- RasterLayer：带像素的数据层。
- GroupLayer：可折叠层组，定义组不透明度和隔离混合范围。
- ReferenceLayer：可设置是否出现在导出。
- FillLayer：颜色/图案/渐变的程序化数据。
- AdjustmentLayer：可重新编辑的颜色调整。
- EffectLayer：非破坏性的滤镜效果与 mask。

必须有完整增删复制重命名移动排序锁定隐藏分组合并向下/合并可见/盖印图层，所有结构修改进入 Undo/Redo；不能像现有 PixelDocument.addLayer/removeLayer 一样清空全部撤销历史。图层改动触发局部 composite 缓存失效，且注意底图变化会影响上层 Overlay 外观。

保留旧版工程 import，迁移新 schema 时采用稳定版本号和原数据备份，不可无提示丢失旧图层。

# 05｜真正专业的混合模式、叠加数学与透明度

必须区分四种“叠加”：Normal Alpha Source-Over、Overlay 颜色混合模式、图层 Style/FX 效果叠加、Clipping Alpha 区域剪贴。

基础模式：Normal 普通、Multiply 正片叠底、Screen 滤色、Overlay 叠加、Add 加法、Subtract 减法、Darken 变暗、Lighten 变亮、Difference 差值。随后补 Soft Light 柔光、Hard Light 强光、Color Dodge 颜色减淡、Color Burn 颜色加深、Hue 色相、Saturation 饱和度、Color 颜色、Luminosity 明度、Exclusion 排除。

对归一化色彩 Cb（下层）与 Cs（上层）定义每个通道的混合 B：
- Normal: B=Cs
- Multiply: B=Cb*Cs
- Screen: B=1-(1-Cb)*(1-Cs)
- Overlay: Cb<=0.5 则 B=2*Cb*Cs，否则 B=1-2*(1-Cb)*(1-Cs)
- Hard Light: 用 Cs 而不是 Cb 决定上述分段。
- Difference: B=abs(Cb-Cs)
- Darken / Lighten: min / max
- Add: min(1,Cb+Cs)
- Subtract: 明确选定 max(0,Cb-Cs)，登记不同软件命名差异。

有效源 Alpha As=(srcAlpha/255)*opacity*(mask/255)*clipCoverage；背景 Ab=dstAlpha/255；最终 Ao=As+Ab*(1-As)。非预乘通道的混合结果应按以下源覆盖公式：
Co=([(1-As)*Ab*Cb]+[(1-Ab)*As*Cs]+[As*Ab*B(Cb,Cs)]) / Ao（Ao>0），否则输出透明黑。
固定舍入规则、sRGB/线性光处理策略、premultiplied/straight alpha 转换边界、边缘半透明的预期输出。CPU 参考算法是 golden truth；GPU 路径不允许因性能优化出现明显像素差。GPU Offscreen/Compose BlendMode 属于 UI 渲染工具，不是保存格式真正图层数学的替代品。

图层属性弹窗里提供混合模式菜单、0–100% 不透明度、实时外观预览、原始像素 vs 合成效果对比。属性变更形成一个可撤销命令；切回 Normal 不改原始图层 RGBA。支持所有模式在 PNG 导出和重新加载后的逐像素一致性。

# 06｜Alpha 锁、透明度遮罩、剪贴遮罩、选区遮罩

**Alpha Lock**：锁住已有像素 Alpha，允许 RGB 改色但不改变透明度；完全透明处不可新增不透明像素；半透明处保留原 Alpha。与剪贴/遮罩不是同一概念。橡皮在 Alpha 锁下应明确受限行为。

**Transparency Mask**：可编辑同尺寸 grayscale 0..255 资源，白色完全可见、黑色完全隐藏、灰色部分透明。原像素永不因此被擦除。支持添加、删除、复制、重命名、启用/停用、反相、填充黑/白、独立画笔绘制、从选区创建、移动、应用（烘焙）和丢弃。默认全白。mask 在合成时修改有效 Alpha，原 RGBA 数组不改。

**Clipping Mask**：上层可见范围受下层（或组内基底）的 Alpha 限制。上层范围外像素仍存在，只是未显示；基底轮廓变化时立即改变显示。确定链条顺序、组内隔离、隐藏底层与多级剪贴语义。不能拿 Alpha Lock 假冒 Clipping Mask。

**Selection Mask**：用于编辑范围限制，一般属于临时选区；可保存或转 Transparency Mask，不能默认把任意选区当作图层 mask。

**Filter/Adjustment Mask**：定义效果实际作用范围，和效果数值参数分开，支持局部编辑、关闭与重新应用。

UI 必须清楚显示当前正在编辑“像素”还是“遮罩”：图层缩略图与遮罩缩略图并排，选择遮罩时笔刷显示灰度操作与“画白显露/画黑隐藏”，允许单独查看 mask、红色覆盖、关闭 mask，比对前后。锁定遮罩不得改像素；锁定层不得越权编辑。

测试：白 mask=原图；黑 mask=隐藏原图但源数据 hash 不变；128 灰 mask 半透明正确；剪贴底层变化实时刷新；删除 mask 可恢复源外观；保存重开仍完整；Alpha Lock 保护半透明；与图层混合顺序稳定。

# 07｜真正的图层效果和非破坏滤镜

按阶段实现：颜色替换、色阶、亮度/对比度、曲线、HSV、灰阶、反相、索引色量化、色调映射、Bayer 抖动、Floyd-Steinberg / Atkinson、盒式/Gaussian 模糊、有限范围去噪、边缘保护锐化、像素描边、像素投影、内/外发光、硬边辉光、渐变映射、图案覆盖、材质覆盖、像素外轮廓清理。

建立 EffectNode（id,type,parameters,enabled,selectionOrMaskId,order,previewRevision）；保留原始 RasterLayer 和 effect 参数，生成器可重复计算结果。明确效果顺序、颜色空间、透明 Alpha 边界及区域约束。模糊/柔光只在用户主动开启时出现，不要让所有像素艺术无条件变糊。投影支持方向、偏移、半径、Alpha；描边区分 inner/outer/center；发光可选择硬像素色阶或连续柔光。滑杆调整必须实时预览、可取消，并能复制效果参数到别的图层。

# 08｜绘图画笔、橡皮和颜色替换的区别

铅笔、硬边多像素刷、图案笔刷、虚线、沿线拉图案、固定 seed 随机加权颜色、对称、材质刷共享 StrokeEngine，保存稳定逻辑路径和工具参数。画笔实时预览与真正提交用同 seed/同 Rasterizer。橡皮默认清成透明；“擦成背景色”为独立模式；在 mask 上画黑是非破坏的隐藏操作，不是擦掉实际 RGBA。替换 RGB 保持 Alpha、替换全部 ARGB、替换 Palette index 是不同操作。所有笔刷/橡皮/填色尊重 selection、alpha lock、layer locked 和 clip 生效规则。

# 09｜全工具独立实时预览与确认/取消

沿用 V1.2 PreviewSession，但扩展到：
- 油漆桶：预览要改的像素/面积/颜色。
- 清空：预览透出棋盘、明确层/帧范围。
- 混合模式：动态重算合成而不改源 RGBA。
- 遮罩：mask 画白或黑实时显示显隐变化。
- 剪贴：显示下层轮廓限制并支持临时关闭比对。
- 图层效果：实时参数和 Before/After。
- 直线矩形椭圆曲线：真整数像素预览、控制柄精修。
- 粘贴/剪切：浮动变换层，确认前源图不能被破坏。
- 动画 onion：与最终 Cel 不同的参考渲染层。
- 3D 贴图：UV 与 Cube 表面同一个纹素源。
任何预览取消后，文档 hash 必须与操作前一致；任何确认只产生一个历史事务；PNG 显示与导出一致。

# 10｜专业手机 UI 改造

顶栏必须在 Android WindowInsets.safeDrawing/IME 安全区内部，兼容挖孔/刘海/横屏/三键导航。中央画布最重要。底部 Dock 分类“绘画/形状/选择/图层/动画/3D”，不能把几十个按钮塞在同一横向行。

新增“编辑”面板：全选、反选、复制、剪切、粘贴、清除选区、清空层、清空画布、填充层、变换、调整画布尺寸；高风险清空不放在常用撤销按钮附近。新增“图层”抽屉：眼睛、缩略图、层名、锁、Alpha 锁、mask 缩略、混合模式和透明度入口、拖动手柄；图层属性下再分组“混合”“遮罩”“效果”“复制/合并”。320dp 小屏用分层抽屉、宽屏用并排面板，所有按键 hit target 原则上 48dp，不能被导航栏/输入法挡住。界面状态要写明当前编辑对象和作用范围：“当前层”“遮罩编辑”“叠加 65%”“只填充选区”“当前帧 4/12”。

# 11｜统一撤销命令与保存安全

当前 PixelAction 只有像素 diff，图层结构变更不能继续简单清空 history。建立统一 sealed Command：
RasterPixelDiff、LayerAdd/Remove/Duplicate/Rename/Move/Group/Visibility/Lock/Opacity/BlendMode、MaskAdd/Delete/Paint/Invert/Apply/Toggle、EffectAdd/Delete/Reorder/ParameterChange、SelectionChange、TransformCommit、FrameInsert/Delete/DurationChange、MultiLayerClear/MultiFrameClear。

一个用户动作对应一个原子事务，可能同时影响 pixels+tree+mask+effect params。失败 rollback，Undo/Redo 可复现。移除图层仍需可恢复原 layerId 与像素；结构变更不得令历史悬空。内存过高时提示 checkpoint 策略，不能静默删除全部撤销记录。

清空多层/批量合并前支持本地快照；Android SAF 导出完整 .pixelatelier 工程作为备份；APK 签名可能不同导致不能覆盖安装，不能要求卸载旧版而不先备份；原子保存、存储错误提示、可恢复文件检查均应继续完善。


# 12｜完整选区、复制剪贴和自由变形

选择工具：矩形、椭圆、套索、多边形、魔棒、全局相似色、颜色范围、Alpha 范围、Live-Wire 磁性路径、离线用户引导智能选择。组合：replace/add/subtract/intersect/XOR/invert/grow/shrink/save/load。mask 可使用 Boolean 硬边或 ByteArray 的 0..255 coverage，默认传统像素画硬边；羽化是明确可选功能。

浮动选区复制保留透明洞、原图层来源、source palette 和锚点，粘贴后可移动/镜像/等比缩放/任意旋转/扭曲；预览像素必须等于正式结果；取消不改原图。剪切在最后确认前保留源像素，确认之后作为同一 undo transaction。支持复制当前层与复制合成层的不同语义，Android 系统剪贴板需 Content URI，不能把巨大 PNG bytes 当字符串。

# 13｜更多完整基础工具、几何和数值

必须提供：铅笔、橡皮、油漆桶、颜色取样、颜色替换、线、虚线/点线、矩形/填充矩形、椭圆/填充椭圆、正多边形、自由多边形、贝塞尔、样条、圆弧/扇形、标尺、圆规、导向线、中心吸附、角度吸附、移动、自由变换、裁剪、水平/垂直/径向对称、涂抹、颜色渐变、图案填充和程序化函数曲线。

几何工具的一致操作流程：按下显示锚点→移动期间真实整数像素预览→松手端点控制柄可精修→明确完成/取消→一次历史提交。约束参数支持 x/y 数值，长度、角度、等比、网格和中心吸附。独立准星模式必须支持起点/终点/确认三阶段，而不是只支持单点。输入中途加入第二指时优先保证画布导航不破坏草稿，处理系统 ACTION_CANCEL 和棕榈误触。

# 14｜图案材质、随机画笔、智能抖动和无缝贴图

画笔 BrushDescriptor 包含 shape、stamp、spacing、angle、rotation、density、palette、weights、seed、opacity、blend、symmetry、alphaLock、selection、wrap。随机颜色要有概率权重和颜色分布，可锁 seed，避免每次 UI 重绘随机改变预览。草地、石墙、木、砖、金属、沙、布、皮革、水、云等为可编辑图案预设，用户可自定义制作图案刷。

Dither 至少提供 Bayer2/4/8、Floyd–Steinberg、Atkinson、Jarvis–Judice–Ninke（后续）、蓝噪声图案、调色板限色、边缘保护、可选透明处理。指定扫描方向、量化规则、误差扩散范围、透明洞保护、周期边界规则。Blur/去噪需明确是图像运算不是轨迹平滑，只有用户主动开启才修改。

无缝：Wrap X、Wrap Y、Wrap XY，所有负坐标用 floorMod；编辑显示 3×3 或 5×5 重复，但文档逻辑尺寸不变。直线/笔刷/图案印章/随机颜色/模糊边界/填色都遵守相同的 wrap 设置。穿越左边即时在右边出现预览，不能等松手。自动修缝是额外可撤销滤镜，不得自动更改用户有意制作的边缘。

# 15｜专业动画 Frame/Cel、洋葱皮、时间曲线

正式 Frame×Layer→Cel，帧 durationMs 独立存储而不是由恒定 FPS 代替；Frame 可以插入、删除、复制、拖动排序、链接 Cel、打标签/动作片段，支持 ping-pong、循环、播放暂停、精确逐帧。Onion 前后 N 帧、衰减 Alpha 和不同色彩、参考层/所有可见层可选，必须只参与编辑预览，不出现在 PNG 或单帧文件中。

时长与运动曲线不同：改变帧 durationMs 不凭空生成中间像素；2D 插值/时间重映射需定义采样和需要生成的中间 frame。关键帧曲线支持 Step/Linear/Cubic、缓入、缓出、导数速度，真实作用在可插值属性上。导出 Sprite Sheet/PNG 序列/GIF/APNG/元数据，编码回读必须验证每帧时长、透明度和顺序。

# 16｜3D 方块建模、UV、骨骼与 Graph Editor

在独立工作区实现 Cuboid、对象树、组、父子关系、旋转轴心、坐标系、法线/UV、纹理真实整数像素。2D UV 和 3D 模型面必须引用同一 TextureAsset，用户在 3D 面绘制时光线拾取→faceId→UV→texel，不允许使用屏幕坐标乱涂。纹理显示用 NEAREST，3D 相机可平滑但不改变 texel。

正视、侧视、顶视、透视/正交、可视网格、轴向变换控制柄、面/边/块选择；骨骼层级、关键帧平移/旋转/缩放、Graph Editor 插值参数与模型实际姿态联动；逐帧预览和真实模型导出需要格式验证。没有完成的 3D 工作区应隐藏或明确 Experimental，不能塞一个“3D”空按钮。

# 17｜保存格式与数据一致性规范

建议 schema v2/v3：manifest（版本、document ID、dimensions、colorMode、frame definitions）、LayerTree（稳定 ID、类型、可见、锁、Opacity、BlendMode、Mask ID、Effects）、CelStore（按 frame×layer）、Palette、MaskStore（位深/边界/Hash）、Material/BrushPresets/Animation/ModelAsset 关联数据。像素 RGBA 不丢 Alpha，任何关键数据需 CRC/hash 或读取校验；ZIP 文件读入限制尺寸/资源总量、防 Zip Bomb、防路径穿越，AtomicFile 串行写入。

内存估算每层 W×H×4 字节，帧×层增长会快速超出预算；对大项目使用块存储、共享未修改 Cel 和缓存上限。自动保存只处理提交后的状态，预览草稿不能被悄悄烘焙。系统进程中断/切后台保存策略必须在 UI 中可解释。

旧 v1 .pixelatelier 无图层 blend/mask/cel 信息，迁移时设 Normal、mask absent、单帧 Cel，保留所有原始 pixels、layer names 和 opacity。升级后至少进行打开→保存→重新打开→逐像素/属性 hash 对比。

# 18｜Android 性能与 UI 工程的具体模块

模块建议：core-pixel、core-color、core-composite、core-layer、core-mask、core-command、core-preview、core-input、core-fill、core-brush、core-selection、core-effects、core-animation、core-model3d、core-project、feature-editor、feature-gallery、tests/benchmark。

不要把全部逻辑留在 MainActivity.kt。Compose ViewModel 管理编辑状态，画布渲染基于缓存 bitmap/tile/bounds，InputRouter 负责手势路由，CommandDispatcher 负责正式写入。复杂洪泛/滤镜使用 Coroutine Worker + 取消机制和 docRevision check。禁止把每像素当 Compose 子元素；避免每次 pointerMove 重算全屏 composite；不要因为 GPU BlendMode 看起来正确就省略文件导出 CPU 合成 golden 测试。

Android 边到边使用 enableEdgeToEdge 与 WindowInsets.safeDrawing、IME；需要适配 320dp 竖屏、紧凑横屏、状态栏/挖孔屏/手势导航/三键导航、字体缩放、平板和折叠屏。顶部按钮不能被时间或摄像头覆盖；底部清空/复制/图层不能进入系统导航区域。必须提供至少 48dp 可点击目标和 TalkBack 语义。

# 19｜正式验收测试矩阵：每个基本操作必须留真实证据

## A 油漆桶
A01 封闭形内填色；A02 透明背景连通；A03 4/8 邻域对角差异；A04 容差 0/64/255；A05 当前层/可见层采样差异；A06 选区限制；A07 Alpha Lock；A08 遮罩参与；A09 大图 worker 取消；A10 超界与空操作；A11 preview/commit hash；A12 保存重开和 PNG。

## B 清空
B01 清空当前层不改变其他层；B02 清空选区仅改内部；B03 清空当前帧不改其它帧；B04 清空所有层有确认；B05 图层锁正确跳过；B06 取消恢复文档 hash；B07 清空后一次撤销恢复；B08 透明空层 no-op；B09 重新打开仍能恢复已保存状态；B10 原生文件备份可导入。

## C 图层混合
C01 Normal 透明上下层；C02 Multiply 精确值；C03 Screen 精确值；C04 Overlay 分段两个区间；C05 source Alpha=0 时不可篡改背景；C06 背景 Alpha=0 时结果=源色；C07 Opacity=0% 与 100%；C08 Mask 128 灰；C09 图层顺序换位得到正确差异；C10 混合模式改回 Normal 不改源 pixels；C11 PNG 合成一致；C12 CPU/GPU golden 对比。

## D 遮罩
D01 全白不改外观；D02 全黑隐藏但不丢源；D03 灰色 128 计算精确；D04 编辑 Mask 与编辑 Layer 是两个不同目标；D05 从 Selection 创建；D06 反转与禁用；D07 剪贴层跟随底层 Alpha；D08 Mask 删除恢复原图；D09 多层/组缓存失效；D10 保存重开并能修改 mask。

## E 图层编辑历史
E01 新建图层后撤销恢复层数；E02 删除图层撤销恢复像素；E03 排序影响合成；E04 Opacity 滑动一事务；E05 BlendMode 切换一事务；E06 加 Mask/删 Mask 可逆；E07 复制层保持 RGBA；E08 合并层保留可见外观；E09 旧工程迁移；E10 跨工程粘贴不污染源。

## F 手机 UI
F01 状态栏区域控件可触摸；F02 横屏工具不被遮挡；F03 底部系统导航不盖按钮；F04 颜色 HEX 键盘不盖完成键；F05 画布拖动中预览不消失；F06 320dp 宽混合模式可操作；F07 清空操作有当前范围与取消；F08 TalkBack 有中文作用描述；F09 两指缩放不误涂；F10 系统 ACTION_CANCEL 不提交草稿。

## G 动画与 3D
G01 帧分层正确；G02 Onion 不导出；G03 帧 durationMs；G04 Sprite Sheet 回读；G05 Cube UV texel 准确；G06 骨骼层级；G07 Graph Editor 实际改变姿态；G08 两工作区相互不污染。

每个测试必须记录：commit SHA、run URL、设备 API、画布尺寸、步骤、预期数组/结果、PASS/FAIL、截图/录像、失败原因、修复 commit。截图必须检查 PNG 签名，不允许把 adb 错误文本冒充真实截图；Android UI smoke 没通过不能宣称手机手感已验证。

# 20｜专业开源参考与许可证边界

研究资料：
- Aseprite Layer & Cels: https://www.aseprite.org/docs/layers/
- Aseprite Paint Bucket Context: https://www.aseprite.org/docs/context-bar/
- Aseprite Blend Mode API: https://aseprite.com/api/blendmode
- Krita Layers and Masks: https://docs.krita.org/en/reference_manual/layers_and_masks.html
- Krita Mask Basics: https://docs.krita.org/en/user_manual/getting_started/basic_concepts.html
- Android Compose Offscreen/BlendMode: https://developer.android.com/develop/ui/compose/graphics/draw/modifiers
- Android Insets: https://developer.android.com/develop/ui/compose/system/insets
- Android Touch/Gestures: https://developer.android.com/develop/ui/compose/touch-input/pointer-input/understand-gestures
- Blockbench: https://github.com/JannisX11/blockbench
- LibreSprite: https://github.com/LibreSprite/LibreSprite

学习操作语义、公开数学原理、格式设计与算法，不擅自复制第三方源码/图片/图标。复制 GPL/EULA 代码需单独许可审核，独立研发的实现要记录源码位置与所参考的公开材料。不能因为 GitHub 是公开仓库就认定所有素材可以商业再发行。

# 21｜研发优先级与可运行迭代

**Sprint A / 完整基本画板（立即）：** 清空选区/当前层/全部层、填满层、填色桶参数、按选区限制、图层可撤销、保存/回读；真实 UI，GitHub APK/JVM/模拟器测试。
**Sprint B / 图层混合：** 正确 Normal/Multiply/Screen/Overlay 等算法，实时混合预览，图层属性存储升级与 PNG golden。
**Sprint C / 遮罩与剪贴：** Alpha Lock、透明遮罩、遮罩笔刷、剪贴链、选区转换和撤销。
**Sprint D / 效果与图层树：** 非破坏效果、分组/排序/合并、局部模糊/像素发光、渐变、抖动。
**Sprint E / 全工具专业化：** 真实实时预览、Bezier、智能选区、浮动剪贴/变形、对称、随机材质、自动无缝。
**Sprint F / 动画与 3D：** Frame/Cel、时间轴、洋葱皮、速度、Tilemap、Blockbench 式 Cube/UV/骨骼/曲线。

必须随每个 sprint 输出可运行 APK、测试数、设备或模拟器报告、图像结果，绝不以“按钮已加入”“完成概念图”作为完成证据。未通过首要安全区和预览回归，不得把版本标为正式专业版。

# 22｜必须拒绝的错误做法

1. 一个“清空”按钮不说明范围。
2. 不可撤销地清除整个画布。
3. 用黑色涂满图层假装清成透明。
4. 用修改原 RGBA 的办法假装透明遮罩。
5. 用 Layer.opacity 改变假装实现 Overlay 混合模式。
6. 将图层剪贴与 Alpha Lock 混为一个功能。
7. 添加新层后清空全部 Undo。
8. 选区只有矩形边框，没有真实每像素 mask。
9. 颜色填充沿错的参考层发生颜色泄漏。
10. 用 GPU 界面看起来对的效果替代导出中的真实 ARGB 数据。
11. 让随机画笔在每次 preview 重绘时随机换色。
12. 实时预览与正式提交生成不同像素。
13. 模糊滤镜不经过确认就覆盖原图。
14. 洋葱皮、准星、格子线导出到 PNG。
15. Blockbench 式 3D 工作区只有空按钮没有 UV。
16. 用脚本或 mock 截图冒充真实模拟器画面。
17. 编译过就称全部真机验证通过。
18. 不对用户说明 APK 签名变化可能造成覆盖失败和项目丢失。
19. 不检查第三方许可证就搬源码。
20. 用户反馈基础功能缺失时继续只堆高级功能名称。

# 23｜最终验收场景

用户在 Android 手机打开像素工坊，顶部按钮不会被摄像头/状态栏遮住。新建 64×64 透明画布，先用铅笔画一圈轮廓；点油漆桶，在拖动容差与连通模式时实时看到区域和结果，只向当前层提交。建立第二层，填满前景色；调整为正片叠底和叠加，下面画层透出正确的数学合成效果。建立灰度遮罩，用白色恢复显示、黑色隐藏局部，底下原来的像素全部保留。复制选区、浮动粘贴移动、确认、撤销。用“清空当前图层”只删该层；用 Undo 整体恢复。保存为 .pixelatelier，重新打开后图层、混合模式、遮罩、Alpha 与像素不变。导出 PNG，合成结果与画布完全一致。之后再进入动画和 3D 编辑，数据模型无冲突。

**这个基础流程没有真正可用之前，任何专业动画和 3D 承诺都不能替代它。**

# 24｜最终执行命令

现在继续开发原生 Android 版本，不是再做一张概念图。按 Sprint A→F 的依赖链，在当前 GitHub 工程提交源码，优先实现清空、油漆、混合、遮罩的真正数据模型与 UI 行为。每个工具必须：输入→即时预览→确认/取消→正确 PixelCommand→Undo/Redo→Save/Load→PNG Export→JVM Golden→Android Emulator→真实 APK。禁止假实现、虚报设备结果、写死系统 Insets，所有未完成项在功能矩阵标记为未完成。持续保存 GitHub 工作室的源码、测试与研究记录。

**PIXEL ATELIER V1.3 — BASIC TOOLS FIRST. NON-DESTRUCTIVE BY DESIGN. EVERY PIXEL ACCOUNTABLE.**

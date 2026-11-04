# Paperchalk World | L2D 显示链路专项审查（2026-11-04）

## 正式运行架构
- 显示采用自研 Canvas 2D PartRig，**不是** Live2D Cubism .moc3，不能套用 Cubism 的配置参数。
- 角色照片 img 只是透明的布局/选中锚点；可见像素来自每个角色的独立 ArtMesh Canvas，或明确选中的 V4 WebP 备用动画。
- 场景 z 层：场景 1 → 敌人 2 → 世界黑雾 3 → UI 黑雾 4 → 近景女主 5 → HUD 6。两个黑雾层不得挡住女主。
- 主角摄像机特写的 128% 高度、Z 透视和鞋底位置保持原设计。站立/战斗动作在同一份角色模型中仅更新关联部件，不能全身替换。
- 所有纹理层的 x/y、单独骨骼、Z 顺序、相对于目标的局部蒙版都来自同一份 PartRig 模型，保持和工作室一致。

## 修复的真实显示故障
1. **旧数据覆盖新角色**：人物快速切换时，前一个请求可能晚于后一个请求完成。人物分配与 L2D 模块各自有请求代数，在异步 PSD/PNG/IndexedDB 阶段检查是否仍是最新选择。
2. **重复解码与切换迟缓**：原来每次切人都会重新下载模型 JSON 并解码大量 PNG。为发布的贴图设定 24 项有界复用缓存、模型 8 项复用缓存；模型加载后按角色克隆，避免动作/父骨骼互相污染；失败的异步缓存项可重试。本机个性化图片不共用发布素材缓存。
3. **通用备用骨骼串入正式 Canvas**：旧的 rig.setImage() 和 rig.setAmplitude() 都会立即向 Canvas 画图，而此前它们可在真实 PartRig 正在播放时被间接调用，造成一帧整图闪现。当前正式播放器活动期间，通用渲染器只能积累待应用的参数与图片，不能在同一画布绘制。只有明确回退到通用渲染器时才更新备用源。
4. **角色切换时先清空旧播放器**：旧代码在目标模型尚未解码完成时就 dispose 原 PartRig。现在正式 PartRig 资源准备完才交接；从正式动画切换到 V4 等其他路径时也在切换点而非资源预读取开始时卸载。
5. **重复的主线程布局读取**：正式 PartRig 按设计运行自己的约 30 fps 绘制循环；布局同步降低到同一量级，而不是并行每 60/120Hz 强制读 DOM geometry。
6. **过期视觉测试规则**：主场景 CI 现按真实五层合成判断，透明锚点用 computed opacity 检验而非误用 isVisible()。敌人额外视差按已实现的有限景深规则验收。

## 测试和监测
- 纯模块测试：tests/test_l2d_display_lifecycle.cjs，覆盖旧异步请求不能覆盖新角色、贴图和模型复用、卸载时资源状态清理。
- 备用 Canvas 隔离测试：tests/test_l2d_fallback_isolation.cjs，检查图片刷新、属性调整、资源交接时不会把备用整图画到正式分层动画上。
- Chromium 真实游戏/编辑器测试：.github/workflows/game-character-dev-tests.yml。
- 模块化资源发布测试：.github/workflows/l2d-modules.yml。
- 主场景透视/黑雾/输入回归：.github/workflows/studio-pages.yml。
- 在浏览器开发控制台可读取 PaperchalkL2DLibrary.inspect('player') 或 inspect('enemy')，查看渲染帧数、当前素材与缓存命中。不能把测试成功等同于所有硬件上都已经完成性能测试。

## 参考原则
- MDN Canvas 2D 性能： https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- PixiJS 8 性能建议： https://pixijs.com/8.x/guides/concepts/performance-tips
- 不随意增加图像缩放、读回显存或缓存无限张 1024 方图。先做真实设备性能分析，再考虑 WebGL atlas/批次优化等更大重构。

## 后续必须继续验收
长时间切换场景/人物、手机竖屏模拟横屏、后台恢复、GPU context loss 和低内存设备。现在仅完成上述针对性修复和 CI 验收，尚不能宣称任意设备绝对不会掉帧或产生图形问题。

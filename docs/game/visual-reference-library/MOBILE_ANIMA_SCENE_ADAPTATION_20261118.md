# 褪色的会客厅 — 手机游戏级适配 v2（2026-11-18）

## 为什么必须改
第一版真实 Chromium 截图：`anima-main-menu-final-pass/phone-390x844-03-anima-3d-composite.png`。原布局错误：
- 手机 390×844 页面中的 3D 画面仅占约 56vh，材质面板直接占用游戏主屏的下半部；
- 手机和桌面复用镜头，角色/门/窗大小失衡，画面视觉重心在不适合竖屏的宽景上；
- 手机无双指缩放，用户单指旋转只能绕轴操作，难以检查建筑；
- 以前的 WebGL 2048² 阴影图、全量尘埃、最高 1.5 DPR 对软件渲染负担大；第一次 390×844 软件 Chromium 采样为约 9 FPS，并不能把“浏览器流程通过”视为手机流畅。
- 以前“返回游戏”按钮错误指向 `card-battle/index.html`，而不是托管真正的主页菜单。

## 已实现
1. **真正的全屏游戏画面。** 手机页面使用 `100dvh`，顶部精简固定标题，3D Canvas 占据剩余整个高度；材质面板不再参与布局流。无横向和纵向页面滚动。
2. **四个悬浮快捷操作**：白膜/合成、昼/夜、镜头复位、材质面板。移动端按钮带 `aria-pressed` 和触控焦点，最小 ~45–55px 高。
3. **材质面板按需展开**：竖屏为底部抽屉（不超过 ~79dvh），横屏小高度变为右侧抽屉。支持关闭按钮、点击外部遮罩、Esc；抽屉内滑条/开关仍作用于同一个世界。
4. **移动镜头专用预设**：竖屏目标人物与门窗的中心，用独立位置、yaw/pitch/distance/FOV；横屏使用近一点的舞台镜头；桌面维持原角度。切换横竖屏后重算投影。多指缩放后复位恢复相应预设。
5. **真实双指捏合**：PointerEvents 集合跟踪两个 touch contact；按手指间距比例调距离，夹住合理镜头范围；单指触控旋转；双击与工具栏复位。
6. **渲染预算**：移动端自适应 WebGL 像素比上限 0.88、ShadowMap 512²，桌面改为 1024² 阴影图；移动端粒子从 180 缩减至 75；最多 30 FPS 目标帧率（真实帧率依具体 GPU；不保证 30 FPS）；滑条触发合成材质上传合并到下一帧；非活动标签页跳过渲染。
7. **主菜单返回修复**：实际 `../index.html`，而不是卡牌子目录首页。

## 主代码与自动化
- `site/card-battle/anima-paintover-lab.html` — 手机 HUD、状态与 material drawer；
- `site/card-battle/ui/anima-paintover-lab.css` — 固定沉浸式 viewport、横竖抽屉、safe-area 适配；
- `site/card-battle/engine/anima-paintover-lab.js` — portrait/landscape 镜头、手势、帧预算、权限同步、draw call；
- `tests/anima-paintover-lab-browser.mjs` — 真 Chromium 分屏测试，输出 5 组图和浏览器 WebM；
- `.github/workflows/anima-paintover-lab-qa.yml` — 触发条件与浏览器 QA。

### 验收覆盖
- 1920×1080 桌面、390×844 竖屏、844×390 横屏、320×568 小手机、768×1024 平板。
- 每组依次保存：沉浸场景、材质抽屉（手机）、白膜、低权重材质、高权重材质、昼光、双指缩放（手机）、复位、隐藏人物/前景、最终恢复。
- 测试要求：`scene.height >= viewport.height * 0.73`、占宽 >= 98%，页面无滚动，材质抽屉默认关闭，`WebGL drawCalls>15` 且原 Anima 角色可加载，手机点击调节有效，双指缩放距离真实变化，原画不被压缩。
- **质量边界**：真实演示仍使用程序占位墙地材质；本次是移动端构图/触摸/UI/渲染优化，不应误报为已经替换了用户新 Anima 单元素图，也不保证每种真机固定帧率。下一轮应根据真机 GPU 和原视频继续调性能。

## 追加性能验证：静态三维网格合批（同日）

**实测证明：** 采用同一个真实 Chromium 软件 WebGL 测试环境，5 个视口保持原始 Anima 角色、材质、同一镜头与全部互动：

| 版本 | 390×844 原始 drawCalls | 1920×1080 drawCalls | 软件 Chromium 屏幕 FPS |
|---|---:|---:|---|
| 手机 UI 第一版（未合批） | 104 | 107 | 约 6–9 FPS，软件渲染环境 |
| 加缓存 ShadowMap 后（未合批） | 104 | 107 | 约 6–9 FPS，同环境 |
| **合并不透明静态几何后** | **42** | **42** | 约 7 FPS，不能宣称真机已达到 30/60 |

代码位置：`site/card-battle/engine/anima-paintover-lab.js` 中 `batchStaticWorld()`。
- 只合并 **静止且不透明** 的 `architecture` Mesh；按 material UUID、castShadow、receiveShadow 分组；
- 每个几何体离线 applyMatrix4 到世界坐标，再将 position/normal/uv 统一拼入新的 `THREE.BufferGeometry`；
- 不碰玻璃等透明素材、角色、贴花、悬挂布、前景叶子、雾点和阴影片；保留所有真实 3D UV、深度和光照；
- 生成一份新的 `architecture` 映射，使「3D 白膜」开关仍能把所有合批组替换成白膜材质；
- 额外用 `renderer.shadowMap.autoUpdate=false` 缓存静态阴影；光照/人物与镜头参数导致的变化时显式标记 `needsUpdate`。
- 在 `tests/anima-paintover-lab-browser.mjs` 增加 drawCalls `<=55` 的回归约束；真正改变场景复杂度时须截图对比后合理调整。

**性能结论边界：** 104→42 是可测的绘制调用数变化，不代表 FPS 必然同比增长；GitHub Actions 的 SwiftShader 是软件 WebGL，无法代表 iOS/Android 真机 GPU。**不能把软件端约 7 FPS 冒充“手机流畅”“手机 60 FPS”**。下一阶段如手机真机仍卡顿，应再做：按场景重要性设置 shadow receiver/caster、低配选项、GPU 性能分档、将不动的散点粒子静态化或低频刷新；未核实前保留当前高清可视状态。

**证据：**
- 优化前实机工作流：`https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44129381037`，附件 `anima-paintover-real-3d-scenes-and-video`。
- 缓存阴影后同机位实机工作流：`https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44130298059`。
- 合批后的同机位实机工作流：`https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44131477113`。
- 所有工作流输出实际 WebM、白膜和材质开关的 PNG，以及 `results.json`。

## 后续继续升级
- 更复杂的手机纵深镜头应提供镜头焦点辅助或物理障碍约束，避免近墙遮挡角色。
- 如果移动设备不支持 WebGL / GPU 性能很低，需做明确的质量模式或静态材质预览降级，而不是永远加载大阴影。
- 保留每次真实截图进行纵向对比，禁止为了“性能”删除所有阴影、AO 或直接换成静态整张背景。

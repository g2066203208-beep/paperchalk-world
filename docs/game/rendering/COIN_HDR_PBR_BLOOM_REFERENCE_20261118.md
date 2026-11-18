# 像素低模老虎机 —— PBR、HDR、辉光、光影氛围的技术依据（2026-11-18）

> **用户要求：学习《Slots & Daggers》的视觉质感、灯光与辉光，不要模仿它的老虎机画面组成和玩法。** 对照用户之前保存的实际白膜截图 \`/mnt/data/slots_coin3d_v3_launch.png\`，白膜无 HDR、无明暗层次，机身/盆壁 MeshBasicMaterial、NoToneMapping、单币贴图 MeshBasicMaterial 是重大差距。上述本地路径不是 GitHub 资源或托管截图，不能使用它虚构当前实机图。

## 工程入口（已提交）
- 游戏： https://g2066203208-beep.github.io/paperchalk-world/card-battle/coin-payout-3d.html
- PBR/HDR 核心：\`site/card-battle/motion/coin-payout-lighting.mjs\`
- 机身/金币/刚体接线：\`site/card-battle/motion/coin-payout-view.mjs\`
- 保留 10 边像素金币：\`motion/sprite-extrusion.mjs\` 与 \`assets/slots-style-pixel-coin.svg\`
- Cannon 3D 刚体物理：\`motion/coin-payout-rigid.mjs\`，不要破坏出币口朝向实体接币盆和零外溢要求
- 三种尺寸截图和视频：\`tests/coin-payout-browser.mjs\`、\`.github/workflows/coin-payout-3d-qa.yml\`

## 参考技术链和算法源
1. **PBR 真实材质**：Google Filament [Filament PBR Guide](https://google.github.io/filament/Filament.md.html)、[Materials](https://google.github.io/filament/Materials.md.html)；Three.js [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)。金属反射不应该只有一个漫反射纯色，须由法线、粗糙度、金属度和真实/近似环境光共同确定。代码通过 MeshStandardMaterial、不同 roughness/metalness、程序化细节纹理 + PMREM 环境反射实现。环境映射目前是可替换的 **程序光室**，不是真实实景 HDRI。
2. **正确线性空间与 HDR**：Three.js [Color Management](https://threejs.org/manual/pages/color-management.html) 和 [Post Processing](https://threejs.org/manual/pages/post-processing.html)。颜色贴图标记 sRGB，离屏缓存保留 scene-linear RGB 高亮，Bloom 在色调映射**之前**相加，最终仅做一次 ACES-like filmic curve 和线性转 sRGB。**不要**线性高亮先 clamp 到 [0,1] 后再提辉光；也不要最后做两次 gamma。
3. **真正的高亮来源**：NVIDIA *GPU Gems 1*, [Chapter 21: Real-Time Glow](https://developer.nvidia.com/gpugems/gpugems/part-iv-image-processing/chapter-21-real-time-glow)；[LearnOpenGL: Bloom](https://learnopengl.com/Advanced-Lighting/Bloom)，以及 [Physically Based Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom)。先高亮选择再小尺寸模糊；正确叠加到原始线性图像。工程以 HalfFloat 渲染目标做场景、亮度阈值软膝提取、先 1/4 尺寸双方向 5-tap 高斯模糊，再 1/9（手机约 1/10）尺寸形成更宽柔光，两种尺度线性合成。与官方 UnrealBloomPass 一样遵循高亮提取 + 不同尺度模糊 + 合成的后处理原理，但为本仓库纯本地 Three.js 模块 **独立写了一个可控的轻量化版本**，不要冒称用了官方 UnrealBloomPass。
4. **电影调色**：John Hable [Uncharted 2: HDR Lighting, GDC](https://gdcvault.com/play/1012459/Uncharted-2-HDR)、Three.js [OutputPass](https://threejs.org/docs/pages/OutputPass)。参考胶片感曲线与亮暗层次、固定曝光。工程复现的是独立实现的常见 ACES-like fit（并非色彩科学意义上的官方 ACES 认证 RRT+ODT），不应称为电影级真实 ACES。避免 bloom、toneMapping、色彩管理在不同位置重复使用。
5. **阴影与体积氛围**：Three.js [Shadows](https://threejs.org/manual/pages/shadows.html)、NVIDIA [GPU Gems 3 Ch13: Volumetric Light Scattering as a Post-Process](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows/chapter-13-volumetric-light-scattering-post-process)。目前启用灯光 ShadowMap + 显式 castShadow/receiveShadow，弱场景雾来统一深度；**尚未实现 SSAO、真实体积光、GI 或 Lumen**。这些可在实际画面复核后决定是否加，不能伪称已做。
6. **引擎实践文档**：Unity HDRP [Bloom](https://docs.unity.cn/Packages/com.unity.render-pipelines.high-definition%4017.6/manual/Post-Processing-Bloom.html)、Epic UE [Post Process Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/post-process-effects-in-unreal-engine)。虽然本项目使用 Three.js 而非 Unity/Unreal，参考它们的 Post Process Volume、Exposure、Bloom and emissive 的参数分工，避免混用实现细节。

## 推荐书籍：按用户从需要到深入排序
| 优先级 | 书籍/文档 | 直接学习位置和用途 | 正版/免费入口 |
|---|---|---|---|
| S | *Real-Time Rendering, Fourth Edition* 《实时渲染》 | 第 8 章光与色彩、第 9 章基于物理渲染、第 10 章环境光、第 12 章图像空间效果（Bloom/镜头特效），做实时游戏渲染理论总纲 | 官方资源 https://www.realtimerendering.com/；出版社 https://www.routledge.com/Real-Time-Rendering-Fourth-Edition-4th-Edition/Akenine-Moller-Haines-Hoffman/p/book/9781138627000 |
| S | *GPU Gems* 第一册 **Ch21 Real-Time Glow** | 直接解决亮部提取、模糊、合成与光辉反馈；原版全文官方免费 | https://developer.nvidia.com/gpugems/gpugems/part-iv-image-processing/chapter-21-real-time-glow |
| S | Google Filament **Physically Based Rendering** 技术手册 | 从 BRDF、粗糙度、金属度、反射到 IBL、亮度单位的全链路指导，免费电子文档 | https://google.github.io/filament/Filament.md.html |
| A | *Physically Based Rendering: From Theory to Implementation, 4th Edition* (PBRT) | 光传输、光源、BRDF、采样基础；偏理论与离线渲染，适合需要推导时查公式；官方开放全文 | https://pbr-book.org/4ed/contents |
| A | *GPU Gems 3* **Ch13** 与其他照明篇 | 场景内体积光散射、实时阴影/全局光照思路，免费官方在线版 | https://developer.nvidia.com/gpugems/gpugems3/preface |
| A | *LearnOpenGL* Bloom & PBR 教程 | 通过代码复现 HDR framebuffer、Gaussian blur、tone mapping、PBR，免费 | https://learnopengl.com/Advanced-Lighting/Bloom |

不要从未知网盘下载盗版，优先出版社正规电子书或 NVIDIA/PBRT 官方免费内容。上面文档公开可核验，书籍纸版/电子版价格与可下载格式以出版社为准。

## 实际效果参数与测量
- 中等强度起点：Bloom strength=1.22, threshold=1.15 scene-linear HDR, soft knee=.58，曝光 .95，vignette .24、grain .008；强辉光 strength=1.90, threshold=1.05。**这是本工程初版调参值，不是《Slots & Daggers》真实内部参数。**
- 几何：10 facet 原币模型、黑暗的侧边。PBR side roughness=.38, metalness=.72；面 roughness=.40, metalness=.30，保持 48px sprite NearestFilter。Coin mesh 和 Cannon 10 边薄圆柱的位置/旋转保持一致。
- 灯光：暖主 Directional cast shadow + 冷副 Directional + 暖 PointLight 控制体积层次；程序化 PMREM 环境提供高光区域。
- 金币闪光：只从刚体 contacts 中筛选快速碰撞位置，最多同时 20 个少量 GPU Points glint，不能重新变成满屏不断喷溅的金币。
- 不伪称 GPU 性能：前景复杂度和 shadow casters 很多，手机先用较小 shadowMap 与 1/5 分辨率 bloom RT；真正 FPS 和观感必须以真实手机/浏览器记录为准。
- 同一个 **冻结物理时间帧** 的对照：\`#off\` 无 Bloom PBR，\`#strong\` 强 HDR Bloom，截图只对比灯光后处理，不得更改金币位置。测试要求 PBR、HalfFloat HDR、线性缓冲、环境反射、真实 ShadowMap，并验证开关确实改变 Canvas 像素。记录 desktop/portrait/landscape PNG/WebM。

## 验收红线
1. 代码/语法检查不等于实机渲染通过；不要宣称像素级还原或《Slots & Daggers》原版具体灯光参数。
2. **只参考材质、光影、氛围、动效，不要照搬老虎机 UI/玩法/布局。** 此页面是物理/灯光实验室，不代表游戏最终玩法。
3. 优先看 GitHub Actions 最新结果与上传的真实 PNG/WebM；如果未跑通，先查浏览器 Shader 编译日志、GL 扩展和色彩空间。
4. 调参须 A/B 不动相机，不动金币坐标，保存真实画面；避免只写 prompt 或用 AI 概念图。


## 官方原文画面证据（逐项截图复核 2026-11-18）

以下图片属于技术资料**原版的图或演讲 PDF 页面**，不是自己生成的示意图，也不是游戏目前的截图。打开链接即可精确对照。

| 主题 | 原文截图/原始插图 | 解读和程序对应点 |
|---|---|---|
| NVIDIA GPU Gems 1 Ch 21 Real-Time Glow | [原始 Figure 21-3：普通画面、提亮源、模糊与合成](https://developer.download.nvidia.com/books/gpugems/fig21-03.jpg)；[原始 Figure 21-5：水平、垂直卷积分离](https://developer.download.nvidia.com/books/gpugems/fig21-05.jpg) | HDR scene -> extract -> 1/4 RT H+V blur -> 1/9 RT H+V blur -> 加到原场景，局部发光源是关键 |
| NVIDIA GTC 2012 HDR Rendering With Glow | [原始报告 PDF 第 9 页](https://developer.download.nvidia.com/GTC/PDF/GTC2012/PresentationPDF/SB117-nvFX-OpenGL-DirectX.pdf#page=9) | 实际流程图：HDR 原画 → 降采样 → 两方向模糊 → 合成后色调映射 |
| Google Filament 材质教学 | [原始材料速查表 PDF 全页](https://developers.google.com/sceneform/develop/standard_properties.pdf) | 金属与油漆不是一类表面；纯金属 metallic=1、纯非金属 metallic=0、反射的宽窄交给 roughness |
| Three.js MeshStandardMaterial 精确规则 | [官方 API](https://threejs.org/docs/pages/MeshStandardMaterial.html) | 金属应该使用 0 或 1；`metalnessMap` 使用蓝色通道，因此原来把金币整个表面设置成 metallic=.30 不合逻辑 |
| Bart Wronski / SIGGRAPH 2014 Atmospheric Scattering | [官方幻灯第 52 页：雾使阴影不正常变暗](https://www.advances.realtimerendering.com/s2014/wronski/bwronski_volumetric_fog_siggraph2014.pdf#page=52)；[第 53 页：补天光后重建雾体积明暗](https://www.advances.realtimerendering.com/s2014/wronski/bwronski_volumetric_fog_siggraph2014.pdf#page=53) | 强氛围并非单纯给画面罩雾；需要空气中的光照散射和环境补光，且不可当成现有 Fog 的已实现功能 |
| Unreal Engine 官方后处理 | [Post Process Effects 文档](https://dev.epicgames.com/documentation/en-us/unreal-engine/post-process-effects-in-unreal-engine) | Bloom 是相机高亮外溢，还需要曝光、镜头污迹、颜色分级和明暗稳定 |
| NVIDIA 官方 Simple Glow 示例 | [2007 年原始 PDF 第 4 页](https://developer.download.nvidia.com/SDK/10/opengl/src/simple_glow/doc/simple_glow.pdf#page=4) | FBO 两通道横/纵 blur，只对有意指定的像素发光，避免所有像素一同泛光 |

### 本次从 Filament 原文立即修正的实现
- `motion/coin-payout-lighting.mjs`: 机身涂漆、深色油墨等非金属：`metalness=0`；特定裸露金属边框：`metalness=1`；各自保留不同粗糙度和环境反射。
- `upgradeCoinMaterials()`: 自动从当前原版 48px 金币的 CanvasTexture 获取像素，生成**专用蓝通道 metalnessMap**：金黄区域是金属，黑色像素轮廓/暗部是非金属；`NearestFilter` 保留像素清晰度。不修改金币美术、不额外画 AI 金币。副作用/局限：极暗金属在近似阈值下可能被判成非金属，需截图检验。
- `motion/coin-payout-view.mjs`：开启 `InstancedMesh.receiveShadow`，让堆叠金币互相遮蔽并呈现暗部；`tests/coin-payout-browser.mjs` 增加像素 mask 和真实接收阴影的浏览器断言。
- **验证仍不足**：GitHub 提交与 JS 语法不等于 PBR 效果已达到参考质量；需要取回真实 Chromium 帧图、错误日志和手机 GPU 测试，再优化强辉光与材质纹理。


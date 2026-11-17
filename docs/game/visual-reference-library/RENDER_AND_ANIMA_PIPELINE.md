# 3D 白膜 × Anima 单元素 × 权重蒙版 × 逐帧演出：可执行生产规范

创建：2026-11-17。起源：用户要求不再让 AI 一次画完整背景，而是 **真实 3D 空间白膜作为骨架，Anima 单元素素材按类型入库，多层权重蒙版合成**，对标《极乐迪斯科》的技术思想，同时研究《幻象游园剧》《Forgive Me Father 2》《Slots & Daggers》《小丑牌》的具体视觉优点。

## 重要的事实边界

- ZA/UM 官方《Tiling of the World》明确：简单 3D block-in、camera projection UV 和 depth/occlusion；不要理解成“纯 2D 背景图加一个人物”。
- ZA/UM 官方《From Render to Paintover》明确：会动、可拾取或时间变化物件使用实时层；植物、海草、杂物与水面以多层透明画片和自定义 shader 表现。
- 美术总监专访：从 Blender 输出 diffuse、shadow、height、normal 和 object ID 等渲染通道再 Photoshop paintover；这些技术只表示原版 pipeline 的描述，不意味着我们的浏览器直接运行 Blender。
- Unity URP 文档：Decal Projector 将局部材质投射到几何表面，支持蒙版、渲染层、材质属性替换。我们的 Three.js/WebGL 工程需要自行实现兼容方案，不能直接复制 Unity 项目的节点。

原始资料：
- https://discoelysium.com/devblog/2016/08/18/tiling-of-the-world
- https://discoelysium.com/devblog/2019/01/23/from-render-to-paintover
- https://drumiel.wordpress.com/2023/04/04/entrevista-a-aleksander-rostov-disco-elysium/
- https://docs.unity3d.com/cn/6000.0/Manual/urp/renderer-feature-decal.html
- https://docs.unity3d.com/cn/6000.0/Manual/urp/decal-shader.html

## 1. 固定尺寸与空间约定

- 游戏最终交互画面：优先 1920×1080 设计基线，同时支持 390×844 / 844×390。**不能**按一张 Anima 图片分辨率假定场景比例。
- 3D 模型世界坐标单位以地砖与正常站立身高校准；人物贴图允许源 704×1024、1024×1536 等原尺寸，保持天然纵横比，在 3D 空间只做等比缩放。
- 白膜地面必须真实有 X/Z 尺寸；墙体有独立三维表面与厚度；人物脚跟 anchor 定义为图像中的最低地面接触点。
- 为固定斜俯视构图优先 OrthographicCamera；若做 First-Person 则用 PerspectiveCamera 并重新绘制可见面，不要把其中一种的贴图硬套到另一种。
- 每个对象保留 SceneID、SurfaceID、AssetID、Transform、CameraProjectionID，不允许靠图片文件名决定角色显示位置。

## 2. Anima 单元素素材库字段

每种素材作为**独立文件**，可在多个不同 3D 场景重复使用：

\`\`\`json
{
  "asset_id": "wall.stone.stains.03",
  "type": "decal-overlay",
  "source": "anima",
  "prompt_version": "v01",
  "pixel_size": [1024, 1024],
  "alpha": true,
  "world_dimensions": [1.8, 1.2],
  "surface_tags": ["stone-wall", "pillar"],
  "blend_mode": "multiply",
  "opacity": 0.65,
  "mask_channel": "a",
  "z_priority": 10,
  "anchor": "center",
  "license": "user-original",
  "review_status": "pending"
}
\`\`\`

初版资产类别和目标：
| 层 | Anima 只需要画什么 | 建议输出 | 3D 接法 | 材质叠加 |
|---|---|---|---|---|
| WALL_BASE | 单块石墙/灰浆可平铺底纹 | 1024² seamless | UV | normal, roughness, tiling |
| FLOOR_BASE | 地砖/地毯单种底纹 | 1024² seamless | UV | AO、湿度 |
| WALL_DIRT | 无边界的潮湿、水渍、剥落 | 1024² alpha | 局部 decal | multiply 0–1 |
| WALL_MOSS | 苔藓/藤蔓根部色斑 | 1024² alpha | decal | soft light / overlay |
| CRACKS | 裂缝、发霉/涂绘笔触 | 1024² alpha | 局部 decal | darken / normal |
| EDGES | 柱头、地脚线、门框立面 | 单独透明 PNG | billboard 或贴模型 | depthWrite 依需求 |
| PROP | 花盆、灯罩、门、画框、道具 | 单体全貌透明 | world-space sprite 或简模 | relight |
| VEGETATION | 单丛叶、悬挂枝、芦苇 | 1024×1536 alpha | depth-sorted cards | alpha-test |
| ATMOSPHERE | 单张雾、尘、薄纱、光束 | 1024²/2048² alpha | additive/transparency | fog-aware |
| CHARACTER | 人物原始 Anima 全身立绘 | 保持源图长宽比 | 世界空间 anchored sprite | 接地影、局部光 |

**每类禁止项**：不能包含其他类别（例如石墙材质里把柱子、人物和灯一起画完）；不能有文字、相框、完整房间背景；不能透视变形、边缘重复不可拼接或人物出界。素材必须标注是否 seamless、是否 alpha、原尺寸与采样色彩空间。

## 3. 绘画权重的数学规则

同一表面每个像素的材质权重：
\`\`\`
W = clamp([base, dirt, wet, moss, edge, damage], 0, 1)
albedo = mix(whiteboxAlbedo, basePaint, W.base)
albedo = lerp(albedo, albedo * dirtTint, W.dirt * dirtMask)
albedo = lerp(albedo, wetTint, W.wet * wetMask)
albedo = lerp(albedo, mossTint, W.moss * mossMask)
albedo = lerp(albedo, edgePaint, W.edge * edgeMask)
roughness = lerp(roughDry, roughWet, W.wet * wetMask)
normal = RNM(geometryNormal, detailedNormal * W.base)
AO = min(meshAO, contactAO)
color = lighting(albedo, normal, roughness, AO, emissive)
final = grade(fog(depth, color), cameraToneMap)
\`\`\`

- **蒙版必须有独立空间图层**，不能假装 slider 改变了“真实光照材质”，实际只改了一层 CSS 半透明色。
- 多层颜色叠加需要在线性颜色空间做计算，显示输出到 sRGB。避免 double gamma。
- AO 与阴影不是同一个物理量。AO 表示接触空间遮蔽，shadow map 根据灯光动态方向变化。
- 贴花需有 receiver surfaceMask，投影跨界要裁切，避免墙体的水渍流到地面或另一面墙。
- transparent sprite 用合适 alphaTest/alphaToCoverage/depthWrite，避免人物背后草片穿透。
- 权重调整前后应该能随时回退。固定随机种子，保证同素材不同运行不随机变形，方便自动化截图比较。

## 4. 先后渲染通道

1. World: solid 3D geometry / static props
2. Depth / object ID / surface ID (构图、遮挡、交互使用)
3. Base material map / normal / roughness / AO
4. Decal layers：污渍、裂缝、苔藓、光斑，按 receiver 指定
5. Sky / ambient / sun / point light / shadow map
6. Grounded transparent actors (Anima cutout, anchor-based) 与接地 AO
7. Independent card decorations / distant vegetation / foreground occluders (depth sorted)
8. Particles / fog / volumetric cards / ambience
9. Tone mapping & color grade
10. UI (不能被景深/世界雾污染)

## 5. Github 技术参考的用途和边界

| 仓库 | 对应可学的做法 | 边界 |
|---|---|---|
| https://github.com/spearwolf/twopoint5d | Three.js 世界空间 sprites、atlas、billboard、序列帧、批渲染 | 版本与我们的 THREE vendor 匹配要测试，不是直接复制 |
| https://github.com/nickschuetz/o3de-diorama | 3D 世界透明角色 + depth sorting + 软接地影 | O3DE 插件，非 JS |
| https://github.com/EricFreeman/DynamicDecals | layered masks、projection、instancing、render layers | Unity 内置渲染管线，不能无改造接入 Three.js |
| https://github.com/SanielX/DeferredDecals | deferred projection、多图层、alpha clip | 适合研究原理，不能把 shader 直接粘到浏览器 |
| https://github.com/OmarShehata/webgl-outlines | 深度与法线的轮廓识别 | 漫画线需配合原画风，而不是全屏加黑边 |

## 6. 已有演示的准确状态

当前已存在：
- \`site/card-battle/anima-paintover-lab.html\`：可切换 3D 白膜和最终合成；可独立调 base/grime/wet/growth/ink 权重；可开启角色和前景、调整昼夜。
- \`site/card-battle/engine/anima-paintover-lab.js\`：真实 Three.js 几何体、ShadowMap 与 Anima 猎人医生资产；**当前环境材质仍是程序生成占位图，不是新 Anima 单元素**。
- \`tests/anima-paintover-lab-browser.mjs\`：真实 Chromium 桌面和手机三种屏幕，分别输出白模、弱/强蒙版、昼夜与关闭人物帧。
- \`site/card-battle/coin-fx-lab.html\`：另一独立 WebGL 金币实验室，和场景流程解耦。

后续对图必须至少有这些截图：白膜、纯 Base、Base+污渍、Base+苔藓、关闭贴花、关闭角色、仅灯光、最终合成 + 原图对照。保存真实 PNG/WebM，不提供替代概念绘图冒充工程输出。

## 7. 完成度标签

- **RESEARCHED**：来源链接与技术文章已有。
- **WHITEBOX**：真实 3D 建模完成，原图尚未接上。
- **PROCEDURAL_PLACEHOLDER**：材质层可用，但只是程序占位，未接 Anima。
- **ANIMA_ASSET_PRODUCTION**：逐类别 Anima 资产绘画、透明、可拼接、入库完成。
- **COMPOSITE_WIP**：shader 与材质权重真实工作，但与参考未逐帧对照。
- **REFERENCE_FRAMES_VERIFIED**：原参考帧/播放间隔已提取并保存数值。
- **MATCHED**：参考与我们的真实画面/时序/尺寸/遮挡/色彩全部按清晰量化目标验收。

目前**不能**把这套工程称为 MATCHED。
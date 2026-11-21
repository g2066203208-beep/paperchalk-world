# WORK 3D 监视电视 / Black Room Monitor

**线上入口**：`site/card-battle/slots-daggers/television/index.html`（在 Work 原老虎机的第二个页面入口进入）。

## 正式场景约束

- 场景**只有一台实体电视**，没有桌面、地板、房间、卡牌展台或外部 UI；背景为绝对黑色。
- 电视本体占桌面视口画面的大部分。允许轻微拖动改变观察角度，直接验证真实厚度。
- 主机体：暗绿工业金属，收窄的黄铜实体倒角、更大的 CRT 显示面积、缩小的旋钮及控制侧栏、后部退进、螺丝、透气栅格和支脚。
- 曲面 CRT：**532 个真正投影的三角形**；仅在相机变化时光栅化一次三角形，缓存 Z/UV/菲涅耳映射，日常帧只更新磷光像素；玻璃菲涅耳和扫描线单独计算。
- 背景不是 AI 图片，电视也不是 AI 画的一张正面贴图；本机实时生成网格和受光。
- 电视既保留 Work 的金属语汇，又将屏幕控制在很暗的磷光亮度，不用夸张的赛博霓虹。

## 不改变原 Work shader

- 原文件 `../coin-art.js` 不改动，Git blob SHA: `244779b322b33559c31aa1ae11bf6f0f7d15fe0c`。
- 电视 `television.js` 中 `metal(nx,ny,nz,rough,ambient,lamp)` 与原币函数按字符完全一致；保留原金币的暖窗反射、擦边/菲涅耳、高亮指数和多级光源。
- 黄铜色级直接复用原 CoinArt 的 **256 级 palette**；采用不同金属表面明度分配给包边和旋钮。
- **直接加载 `../cabinet-art.js`**，调用原版 `CabinetArt.plaque()` 生成的深绿铸造金属纹理，通过三维表面像素着色映射到电视外壳；不是只借用绿色。没有把旧机台的平面布局粘到电视上。
- 玻璃使用 Work 杯子光学模型的空气-玻璃折射率 `1 → 1.5`，Fresnel-Schlick 计算反射率；还考虑暖色环境反射。
- 电视外壳与屏幕共用**逐像素深度缓冲**，避免靠 Canvas painter 排序产生三角形穿透/错层。
- 独立采样的 CRT phosphor：弱行扫描纹、边缘暗化、轻微闪烁与暖色窗光反射。CRT 更新约 28Hz，但浏览器输入仍在正常刷新率采集；**不再每帧重新光栅化 532 个三角形**。CPU 内部画布最大宽度约 780 像素，减少昂贵的全屏像素缓冲复制。

## 外部设计资料

- CRT phosphor mask 对比普通 emissive image：Francesco Milanese, *How to Create a CRT Monitor Effect in Blender*, https://www.francescomilanese.com/tutorials-en-all/tut-212-en-b3d-mask-for-crt-display-rendering?format=html
- CRT 视觉要素（scanlines、curved screen、phosphor glow、vignette）：https://designmd.app/library/crt

**参考的是 CRT 的结构与材质原则，不是套用参考网站 UI。**

## 功能和清理

- 原老虎机不修改机台游戏逻辑，仅更改导航按钮到电视。
- 旧 02 推币塔与 03 物品展示已下线：旧 `coin-pusher/index.html`、`coin-lab/index.html`、`items.html` 仅保留跳转，原功能脚本和旧 QA 已从 main 删除。
- 点击最上方黄铜旋钮：开关机；点击第二旋钮：切频道；拖动电视：观察实体厚度；双击：恢复角度。
- 键盘：空格开关机，左右键看侧面，R 重置，Esc 返回原老虎机。

## QA

`node tests/work-television-3d-browser.mjs`

CI 归档真实 Chromium 截图（正面、3D侧面、断电）和录像，覆盖 1280×720、960×540、390×844，并逐字符核对原 Work metal()，检查所有旧路由跳转。

注意：这是自写的三维软件栅格器（真实三维网格+Z Buffer），**不是**基于 WebGL 或 GPU PBR 的 Three.js。受性能与光学模型限制，不声称做到了完全物理真实的多次折射/光追。

## 复用范围与诚实限制（2026-11-21 视觉和性能回归）

- **真正复用**：原版金币的 `metal()`（逐字相同）、256 级金色级调；原版 `CabinetArt.plaque()` 的真实金属纹理输出，映射至独立 3D 外壳。
- **参考算法但未完整复制**：原版玻璃杯的复杂多界面追踪 / 吸收 / 折射；电视使用空气与玻璃 IOR 1.5 的菲涅耳和环境反射简化版，不是完整的原杯光路。
- **未直接复用**：为旧老虎机桌面和战斗场景定制的 `DeskLights` 空间坐标、树荫及木桌全景。黑色空间 TV 模型需要重新绑定几何、法线、屏幕内光源，直接把旧二维坐标硬套到 TV 不会正确。
- **性能根因**：旧代码每个动画帧同时重算 496×324 磷光像素、532 个 CRT 三角形、帧缓存与逐像素 Z。现在把机壳及 CRT UV/Z/Fresnel 缓存在视角变化时计算，静止机身只在约 28Hz 更新显示图像；CPU 渲染分辨率由 ~1050 降至最高 780 内部像素宽度。
- **验证建议**：检查 `WorkTVQA.state()` 中的 `originalCabinetTexture`、`screenMappingPixels`、`frameRenderMs`、`fps`；以真实浏览器正/侧面截图和手机测试为准。测试成功不等同于美术最终满意。

# WORK 3D 监视电视 / Black Room Monitor

**线上入口**：`site/card-battle/slots-daggers/television/index.html`（在 Work 原老虎机的第二个页面入口进入）。

## 正式场景约束

- 场景**只有一台实体电视**，没有桌面、地板、房间、卡牌展台或外部 UI；背景为绝对黑色。
- 电视本体占桌面视口画面的大部分。允许轻微拖动改变观察角度，直接验证真实厚度。
- 主机体：暗绿工业金属，前部黄铜环形实体倒角，后部明显退进，实体旋钮、螺丝、透气栅格、支脚。
- 曲面 CRT：**532 个真正投影的三角形**，每帧使用真实几何屏幕 UV 而不是平面假贴图；玻璃菲涅耳反射和磷光扫描线单独计算。
- 背景不是 AI 图片，电视也不是 AI 画的一张正面贴图；本机实时生成网格和受光。
- 电视既保留 Work 的金属语汇，又将屏幕控制在很暗的磷光亮度，不用夸张的赛博霓虹。

## 不改变原 Work shader

- 原文件 `../coin-art.js` 不改动，Git blob SHA: `244779b322b33559c31aa1ae11bf6f0f7d15fe0c`。
- 电视 `television.js` 中 `metal(nx,ny,nz,rough,ambient,lamp)` 与原币函数按字符完全一致；保留原金币的暖窗反射、擦边/菲涅耳、高亮指数和多级光源。
- 黄铜色级直接复用原 CoinArt 的 **256 级 palette**；采用不同金属表面明度分配给包边和旋钮。
- Work 柜体的深绿与暗金风格结合 `../cabinet-art.js` 工业材质设计语言；不直接把原老虎机面板拼贴成电视。
- 玻璃使用 Work 杯子光学模型的空气-玻璃折射率 `1 → 1.5`，Fresnel-Schlick 计算反射率；还考虑暖色环境反射。
- 电视外壳与屏幕共用**逐像素深度缓冲**，避免靠 Canvas painter 排序产生三角形穿透/错层。
- 独立采样的 CRT phosphor：真实微光、弱行扫描纹、边缘暗化、轻微闪烁与暖光 reflection。图像纹理每帧通过真实屏幕几何三角形映射。

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

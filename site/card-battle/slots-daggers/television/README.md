# WORK 电视游戏｜统一原游戏像素渲染 + 真实 GPU 3D（2026-11-21）

## 当前线上运行版本

- 游戏：<https://g2066203208-beep.github.io/paperchalk-world/card-battle/slots-daggers/television/index.html>
- 入口：`index.html` 加载 `television-gpu.js` ES module。
- 共享三维引擎：`../../vendor/three.module.js`，也用于仓库其他卡牌/场景工程。
- **不再加载 `television.js`、`work-tv-cpu.js`**。这两个旧文件只保留作历史代码对照，不能用它们描述当前生产渲染器或移回 HTML。
- 新版电视、屏幕曲率、凹槽、桌子、4 脚、玻璃、土壤、花盆、叶片均为 WebGL 真实网格；没有将 3D 场景截图贴成平面。

## 为什么改

旧自制 CPU 渲染器在 1280×720 运行时使用 JS 三角形扫描转换、CPU 深度缓冲、数十万逐像素金属着色，切换/拖动重建时间较长。原实现是我未读完已有图形资源就另造的管线，造成用户反馈的卡顿与像素风格不统一。

## 现有游戏渲染资产真正在哪里复用

| 来源 | 运行中的实际调用 |
| --- | --- |
| `../world-art.js` | `WorkTVBroadcast.documentary()` 的真实 `WorldArt.draw()`，每秒最多 12 次更新，整幅像素场景 |
| `../pixel-type.js` + `../engine.js` | `broadcast.js:txt()` 调用 `SlotStudy.label()`（ASCII 点阵字）；中文沿用浏览器字体 |
| `../cabinet-art.js` | `television-gpu.js:woodTexture()` 直接调用 `CabinetArt.wood()` 给真 3D 桌面贴图 |
| `../reel-art.js` | 广告频道仍直接调用 `ReelArt.face()` 绘制原始游戏符号 |
| `../../../l2d/rig.js` | 正式主角 `protagonist-front.webp` 的 `PaperchalkL2DRig` 呼吸/眨眼 |
| `../../vendor/three.module.js` | 全场景的 WebGL GPU 网格、真实深度测试、材质及灯光 |
| `television-gpu.js` | 电视 CRT 纹理使用 `THREE.NearestFilter`，屏幕不以线性插值糊掉原像素；页面 `image-rendering:pixelated` |

请勿把独立实现的 `WebGL MeshStandardMaterial` 说成与老虎机 `CoinTable.metal()` 完全一致。新版共享其美术源素材及像素画法，但使用 GPU 的标准材质渲染 3D。若以后需要真正复用金币高光，应移植经过验证的同等 GPU shader，而非恢复主线程逐像素着色。

## 性能与清晰度

- 1280×720 浏览器输出，内部像素场景 640×360，放大时最近邻采样，**清晰的有意像素，不是 740px 的双线性糊图**。
- 横屏 844×390 输出，内部 422×230；竖屏 390×844 输出，内部 320×693；真正由 GPU 绘制。
- 摄像机运动只更改投影矩阵，不重建 CPU 三角片或重设相同大小的 WebGL 绘制缓冲。
- 固定桌面以约 30 帧/秒呈现，拖动时目标 45 帧/秒；电视节目最多更新 15 次/秒，原角色 L2D 每秒最多 8 次采样，WorldArt 场景 12 次。
- `WorkTVQA.state()` 包含 GPU 后端、真正已呈现帧率、单帧渲染耗时、原始美术源是否就绪、网格面数与硬件 draw calls。
- 自动化测试跑的是 Chromium + SwiftShader，数据只代表 CI 环境，不等于每台用户电脑/手机上的真实 FPS。

## 操作

- 电视真实旋钮：上电源、下换台；可用鼠标点击。
- `1–6` 直选、`C`/`↑` 下一台、`↓` 上一台、`I` 节目指南、空格开关、拖动旋转、双击或 `R` 复位。
- 六频道继续保留：新闻、广告、人物访谈、综艺、游戏世界纪录、天气播报。
- 正式女主 CHAR-001 与现有访谈嘉宾来自仓库原文件，未重画人物。

## 验收与交付

- `tests/work-television-3d-browser.mjs`：桌面 / 手机横竖屏实机检查 WebGL 而非 CPU 渲染，原 `WorldArt` / `SlotStudy`、真人物、六频道、旋钮、节目指南、视角变化、JS 错误、WebGL 缓冲大小和渲染耗时。
- `.github/workflows/work-television-3d-qa.yml` 自动截图与录制视频。
- `.github/workflows/work-television-pages.yml` 仅在 QA 成功后发布。
- **视觉验收不能只看 PASS**：必须人工看最新实际截图，尤其文字字号、像素密度、桌面阴影、电视机比例和玻璃。
- 当前节目的语音、精确口型和完整编排尚未实现，不能冒充完成的视频电视台。

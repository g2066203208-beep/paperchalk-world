# 原画人物跨场景程序化融合（2026-11-18）

**禁止 AI 重画/替换批准人物原画。** 统一使用 GitHub 原始 PNG/WebP，经运行时去白底、材质处理与世界空间阴影后进入 3D 场景。原画字节不动。

## 已落地
- 复用模块 `site/card-battle/engine/character-scene-integration.js`：`MeshStandardMaterial`+`onBeforeCompile` 保留真实 Three.js 光源、PBR/ShadowMap；动态注入天空和地面环境色、方向主光、局部反弹与雾色。原画低频梯度自动导出轻量弱法线（160×240），而不是生成人物。
- `makeIllustrativeNormalTexture`、`makeIntegratedCharacterMaterial`、`setIntegratedCharacterScene`、`createIntegratedGroundShadows`。
- `inferBackgroundLighting`：对任意 Anima 场景图片取样天空/地面环境色，方向为估测，需人工复核。
- `inferThreeSceneLighting`：从现有 Three.js 真实太阳光、半球环境光、相机方向获得受光参数；场景切换沿用同一套原画。
- 默认场景参数 forest / snow / cave / hall / corridor / courtyard。
- `site/card-battle/engine/anima-paintover-lab.js` + `anima-hall-gameplay.js`：已经直接应用到主角血液医师与猎人同伴，并跟随 hall→corridor→courtyard 的位置和环境切换；使用真实三维地面双尺度接触/方向阴影。
- `site/card-battle/anima-paintover-lab.html` 实际 3D 场景中有“人物光影融入（实时对照开关）”，不改变原画、位置或相机。
- QA: `tests/character-scene-lighting-browser.mjs` + `.github/workflows/character-scene-lighting-qa.yml`；真实 Chromium 同机位关/开受光、昼光截图，桌面1440×900、手机竖屏390×844、横屏844×390。

## 已查证 / 未过度宣称
- [古堡三场景全流程 QA 成功 run 44332962825](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44332962825)；有真实浏览器截图、视频，3 种屏幕比例。
- [光影前后对比 QA 成功 run 44334944823](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44334944823)；旧版本角色像素均差仅约 2.4/255，**视觉提升不足**。后续强化受光方向与原画细节的微弱自发光，必须以新一轮截图验收，不能据旧版认定最终完美。
- 单幅 2D 图的法线和遮挡不能真实还原深层几何，也不能程序补齐原森林遗迹背景欠缺的绘画精细度。程序的目的是动态匹配照明、色调、接地，不是虚构 3D 体积。
- 测试使用软件渲染器 SwiftShader，性能数字不可冒充真实手机 FPS。
- 会话中另有基于用户 1536×1024 森林遗迹图和 GitHub 五张真实原画制作的离线交互/PNG 对照，供受光 QA，**不是 3D 游戏引擎截图**。

## 下一步验收
逐张打开最新 3 视口 Chromium 原始截图，将人物边缘、脸部明暗、脚底、前景遮挡与场景局部光源逐项检查。若差异不足，优先调屏幕空间色彩/光源参数和地面法向，不生成新人物，不改 GitHub 母图。

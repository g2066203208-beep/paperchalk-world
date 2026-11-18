# 人物卡正反面：由颜色生成法线的 2.5D 材质 + 严格单面剔除（2026-11-18）

## 用户纠错（本规范高于以前的立体描金框设计）
> 卡要做法向，不然纯平面；根据颜色识别做表面法向实现 3D 的感觉，但其实还是 2D；去掉程序建模的金色边框；卡牌正反面做好视觉剔除显示。

本次不再做真正的有浮雕厚度的金色 BoxGeometry 画框。**人物原图、用户认可的酒红金线卡背都是独立原始图片素材；实体网格不应覆盖它们的边缘设计。**

## 当前落地文件
- `site/card-battle/motion/card-image-relief.mjs`：纯 JS `deriveCardRelief(rgba,w,h,mode)`，按 RGB 色彩判断纸面/金线，生成 4 通道切线空间 normal map 与 packed PBR response map。
- `site/card-battle/motion/character-card-machine.mjs`：真 Three.js 贴图渲染；正面角色原图、背面原酒红图各自贴于平面，使用 MeshStandardMaterial + normalMap；移除手工四条金条模型、Extra foilPlane、ExtrudeGeometry、额外 fake badge 和名牌。保持原始人物图画幅比例，无拉伸。
- `tests/card-image-relief.test.mjs`：真 RGB 色彩校验，金黄像素判定为反射金属、酒红暗像素不是金属，梯度生成非均匀法线，透明角不反射。
- `tests/character-card-machine-browser.mjs`：三个设备尺寸；检查 GPU FrontSide 剔除并且 JS 分组剔除正反面不会同时显示，背面和正面确实有法线图，金色反射确实有 metalness map，真实拖动、缩放、抽卡不会破坏剔除。
- `.github/workflows/character-card-machine-qa.yml`：单元测试 + Chromium WebGL 实画截图 + 归档。

## PBR 打包细节（谨防以后重构抹掉）
- Three.js 的 `metalnessMap` 读取 **BLUE**（蓝通道）、`roughnessMap` 读取 **GREEN**（绿通道），不是用 Alpha 或 Red。
- 通用卡背像素：warm-gold 需要同时满足 (G−B)、G亮度、(R−G) 的阈值；暗酒红虽然红值高，但 G 不高，**不得变成金属**。原图周围 Alpha 极低区域不得生成边缘金属。
- height 从 `goldInkWeight()*0.91 + luminance*0.065` 平滑生成，Sobel/central gradient 导出切线空间表面法线；暗纸基本平整，金线像浅浮雕。无真实几何位移。角色正面更轻微，以颜色边缘/服装轮廓提供浅表面凹凸，不把美少女立绘重构成 3D 人物。
- 两张法线图是 `THREE.DataTexture`，`NoColorSpace`，`flipY=true` 与原始人物纹理的上下方向一致；新材质使用 `MeshStandardMaterial` 的真实环境/灯光响应。
- 金色 metalness 高、roughness 低；酒红纸张 metalness=0、roughness 高。保持用户上传的原画色调，拒绝人工再画假金边。
- 两片卡面 **`side:THREE.FrontSide`**，正面世界朝 +Z，背面自身旋转 PI 朝 −Z。相对相机朝向 dot 符号独立决定 `front.visible` 和 `back.visible`，绝不同时 true；GPU 背面剔除作为第二道保障。观赏时切面、旋转和时间轴 seek 同步执行剔除，不允许依赖之后一帧才补更新。
- 因为设计本质上还是薄 2D 卡片，只有平面而没有立体描金实体边缘，侧面接近 90° 时变成极薄的线，这是用户要求，不要为了侧面厚度再加厚金色 BoxGeometry。

## 风险与后续验收
- 颜色 → 高度只是一种**合理视觉推测**，不是测量实际高度；因此法线是游戏视觉特效，不是可用于制造的真实材质扫描。
- 游戏卡背目前采用已上传的 `480×724` WebP 游戏衍生纹理，超高倍放大仍有像素上限；高分辨率升级需要回到获用户认可的 PNG 原图进行无内容修改的导出。
- 外部 GitHub Actions 可能并发写回 QA 截图，不能把代码编译通过误当成真实视觉满意。需要看最新 WebGL 画面的人物面、金线背面、90° 侧面。

# 人物卡机 · 全卡纸张、油墨、烫金材质与性能交接（2026-11-18）

## 用户逐次纠错与最终目标
用户明确要求卡牌「根据颜色识别做表面法线实现 3D 感觉，但其实还是 2D」「删除程序建模的金色边框」「正反面视觉剔除」「然后整体都要做一下，光滑得像塑料平面，卡牌质感做出来」。

**不许返回重建金条/金框/额外徽章！** 卡背的图案必须完全来自认可的暗酒红金线 Anima 图；人物图必须来自已经上传的立绘。允许运行时创建渲染用法线/粗糙度/金属度和轻微油墨颗粒纹理，但不能修改原始 PNG/WebP 字节。

## 已提交的实现
- `site/card-battle/motion/card-image-relief.mjs`：`deriveCardRelief` 从原图 RGBA 导出 3 张运行时纹理：
  - **normal RGBA**：按 RGB 亮度推断微量笔触、衣服细节和金箔浅浮雕，同时给整张卡纸叠加稳定不动的短纸纤维、长纤维、微弱横竖交织。即使纯色酒红或白底也会有微法线，不是只在边框起作用。
  - **surface packed RGBA**：Three.js 绿色通道读取粗糙度（纸张约 0.85～1.0，金箔约 0.3～0.5），蓝色通道读取金属度（酒红背景=0，香槟金线接近 1）。纸张随机微变化、粗糙度大，避免塑料高光。边缘更哑光，无额外金色边缘建模。
  - **pigment RGBA**：仅 1～3% 左右的光学印刷颗粒扰动，严格保留图片原有构图、颜色和 Alpha；不改源文件。
- `site/card-battle/motion/character-card-machine.mjs`：两面各一张 GPU FrontSide 贴图，背面旋转 PI，`front.visible`/`back.visible` 严格相机朝向剔除。默认的纸面改用 `THREE.MeshPhysicalMaterial`、纸纤维 sheen（极弱）、低介电反射强度和动态材质法线。烫金的金属反射与哑光纸分离。
- 为避免 `DataTexture` TypedArray 上下翻转与普通图像贴图方向不一致，派生图用 `CanvasTexture` 和 `flipY=true`，三张图均采用同样 UV 起点，不允许人物印刷反过来。
- 为避免卡顿，纸纹生成使用双线性时间的水平+竖直分离滤波，不再对每像素做 9 邻居 RGB 计算和多次 Perlin 插值。与最初候选同环境 benchmark 的 528×768 图像：约 3.25 秒 → 1.27 秒；**这是函数执行环境基准，不等于实际手机 FPS**。
- 进一步将运行时派生贴图尺寸限定为 **640px 最长边（桌面）/448px 最长边（手机）**，原始人物颜色贴图继续用原图尺寸；只缓存最多 **3 张人物**的派生 GPU 法线、纸纹和粗糙度材质，切换新人物后释放淘汰的派生贴图，避免已收集 35 人的内存无限增长。
- `tests/card-image-relief.test.mjs`：测试纸纤维覆盖整幅图，金箔与普通纸金属度/粗糙度严格不同，原始 RGBA 字节不变，人物不被判成金属，加上 320×448 计算性能约束。
- `tests/character-card-machine-browser.mjs` + `.github/workflows/character-card-machine-qa.yml`：Chrome WebGL 三屏幕截图，检查材料层、真实法线像素、纸张 roughness range、纹理翻转与正反面剔除、鼠标/手势旋转缩放。
- 自由观赏时使用中性柔和棚拍光，避免机器 28 强度橙色聚光灯把纸张和人物照成塑料；关闭观赏后恢复原本老虎机剧场灯光。

## 关键审美
视觉上应该类似「真实的精细美术卡片油墨印刷在厚卡纸」，而不是油光塑料广告牌。卡背暗红大面积需要能看见细微纤维，金线在旋转斜角时有细小反光，人物脸、头发、服装颜色不要高光炸白。法线是视觉推测不是模型真正形变，侧面仍然是平面。

## 代码入口
- https://g2066203208-beep.github.io/paperchalk-world/card-battle/character-card-machine.html
- https://github.com/g2066203208-beep/paperchalk-world/blob/main/site/card-battle/motion/card-image-relief.mjs
- https://github.com/g2066203208-beep/paperchalk-world/blob/main/site/card-battle/motion/character-card-machine.mjs
- https://github.com/g2066203208-beep/paperchalk-world/actions/workflows/character-card-machine-qa.yml

## 完成标准
以上是源码层已实现内容。必须等待最新 CI 完整通过并查看真实 WebGL 截图，才能认定当轮材质集成通过。和参考游戏是否达到同等质感需要肉眼与参考视频同帧对比，不可仅根据单元测试宣称。

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

## 最终浏览器测试和实际画面复核（2026-11-18）
- **最终 CI：** [44321911668](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44321911668)，结论 success。desktop 1440×900、portrait 390×844、landscape 844×390 三种真实 Chromium WebGL 检查全部 `passed:true`，页面 JS 异常 0。
- 纸背、人物正面、斜侧旋转、自由缩放、放大细节等真实截图及录屏保存为 Artifact [14435526552](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44321911668/artifacts/14435526552)，并通过 Actions 提交桌面/手机截图到 `site/card-battle/qa/character-card-machine/`。
- 实际看过本次 Chrome 截图，纸背暗红区域不再均匀光滑，整体有连续纸纤维/印刷颗粒，正面浅色背景在斜角能看出细密纸纹；不再显示任何程序生成金边立体模型，正反面剔除有效。
- 发现手机观赏模式原 HUD 标签遮住角色头部；已在 `site/card-battle/character-card-machine.html` 观赏状态下隐藏叠在画面上的 HUD 和说明文字，只保留画布下方操作工具栏。真实 390×844 新截图已人工检查无文字遮挡。
- 发现手机视图此前因为常规老虎机将 DPR 压到 0.78，艺术图显得糊；现进入观赏将 DPR 上限提升至 1.5（设备实际 DPR 低则照设备值），并关闭观赏时 Bloom，退出恢复机器低开销渲染和 1.25 Bloom。浏览器测试验证模式切换。
- 派生纹理数据改为同原始图方向一致的 `CanvasTexture`，防止 WebGL TypedArray `flipY` 语义不同导致完整人物倒立，用户图片原始文件没有任何写入变更。
- 当前卡背依旧是低于源 PNG 的游戏版 480×724 WebP，极限放大纤细金丝的清晰度有上限。最终微纹理效果偏向“印刷亚麻纸”，要继续增强可调尺寸和局部金属反光，但**不许再建模粗厚金边**。

## 2026-11-18 白边和真实厚度修复（用户当轮要求“修复”）

此前错误：
1. 认可的酒红金线 WebP 卡背虽然已经裁掉外部白底，但透明像素/圆角 Alpha 边缘的 RGB 仍被白色扫描底污染。材质使用 alphaTest 时这些半透明白色会形成明显白线。仅提高 alphaTest 不能彻底解决。
2. 正反面各一张 plane、相距仅约 .012 世界单位，侧视几乎零厚度。用户拒绝加回难看的立体金边，要求真实纸板切面。

已正式提交代码：
- `site/card-battle/motion/card-physical-edge.mjs` 的 `sanitizeCardMatte` 对卡背 RGBA 外圈检测“偏白＋半透明”污染，仅删除外围的污染像素，保留金线/中部图案；对透明区做最近实色边缘 RGB 扩色，防止线性采样和 mipmap 又混出白色。对源图 bytes 不做写回。
- 同模块的 `roundedPaperEdgeGeometry` 生成真正圆角闭合侧面三角条，且在 UV 接缝重复顶点，正面采用 THREE.FrontSide；没有多余的上下 cap 或任何金边模型。
- `site/card-battle/motion/character-card-machine.mjs` 将 front/back 真实距离改为纸板 `cardThickness=.042`，约为 1.68 卡宽的 2.5%。单独创建 `cardCutEdge` 三维侧面，使用暖灰白压缩纸纤维纹理、金属度=0、粗糙度=.97。内侧两面保留原人物绘画与原酒红金线卡背；CPU 视觉剔除和 GPU FrontSide 剔除完整保留。
- 卡背加载时先通过 `sanitizeCardMatte` 处理源图像，再用清理后的 RGB+A 生成 normal/roughness/metalness/pigment；所以白边修复不只是视觉遮罩，实际 mipmap 来源已经清洁。
- `tests/card-physical-edge.test.mjs` 校验白色边缘和透明 RGB 污染被移除、金线仍完整、厚度数值正确、真实三角形侧壁外法向/FrontSide 几何、材质 UV 无断层。
- `tests/character-card-machine-browser.mjs` 校验真实 GPU 成功载入边缘图、金属度为零、切边几何长度，卡牌转到精确 90° 时正反两面都被剔除，但纸板侧壁仍正常显示；每个设备留下真实 `INSPECT-EDGE-paper-cut-thickness.png`。
- 主菜单已链接 `site/card-battle/character-card-machine.html`，脚本 cache bust 到 `?v=20261118-no-white-edge-paper-stock-v6`。

**实际验收：** GitHub Actions [44327859001](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44327859001)，结果 `success`，Chromium 三尺寸 **desktop / portrait / landscape** 均 `passed:true`、错误 0。自动永久截图已存入 `site/card-battle/qa/character-card-machine/`：
- `desktop-inspect-back.png` / `phone-inspect-back.png`：卡背正视及白线移除
- `desktop-inspect-card-stock-edge.png` / `phone-inspect-card-stock-edge.png`：90° 纸板侧面，角色图和背图均不应透出来
- `desktop-inspect-front.png` / `phone-inspect-front.png`：真实人物正面
- 该轮 3 个视口完整截图和 WebM：[artifact 14436599932](https://github.com/g2066203208-beep/paperchalk-world/actions/runs/44327859001/artifacts/14436599932)

**肉眼核验：** 与上一轮 390x844 Playwright 卡背截图比，背面左/右侧白色垂直亮线不再出现；在背景同一带状取样 x≈59–65、323–330，y=260–460 区间，灰白高亮像素计数由 182/2600 降为 0/2600（只是验证该部位的定量示例，不保证所有 DPI 与光照像素完全无异常）。90° 截图实见独立灰白压缩纸切边约数 px 宽，没有金色装饰模型。

注意：此处解决的是卡牌*外轮廓*的白色 Alpha 污染。当前马戏团团长的来源 PNG 为 **RGB 不透明的白背景原画**，因此人物周围的整片白色背景不是“透明抠图失败”，绝不可简单把人物绘画里面的白衣物或白眼睛判为透明。若后续用户要角色 silhouette 透明、背景换图，须另走原画无损/人工抠像流程，不得用以上卡背清理把人物误删。

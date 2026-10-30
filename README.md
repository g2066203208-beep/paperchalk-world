# PAPERWORLD · 四色像素游戏

**实际游戏入口与原 APK 加载的网站地址：** https://g2066203208-beep.github.io/paperchalk-world/

## 当前游戏阶段：只实现背景（2026-10-30）

现阶段按用户要求**移除旧版首页的全部旧内容、人物立绘、对话、按钮和中央小窗口**；网站根入口 `site/index.html` 只渲染一个全屏程序化背景 Canvas，后续再逐步添加游戏内容。

- `site/index.html`：只有 Canvas 和动态背景脚本，手机全屏（竖屏、横屏）、电脑及平板适配。
- `site/game/background.js`：真正的像素网格函数绘制；奶油白 `#FFF5E6` 底色 + 雾蓝 `#A9BAE9` 粗45°条纹；4 CSS px 一个逻辑像素；36格条纹，44格间隔；每8秒精确平移一个完整周期（320 CSS px，40 CSS px/s），纯GPU合成层线性运动。
- **游戏正式四色**始终限定为 `#393657`、`#F2A5C2`、`#A9BAE9`、`#FFF5E6`。当前背景只使用奶油白和雾蓝，没有额外色、透明度、渐变或抗锯齿。
- 尊重系统“减少动态效果”设置；网页隐藏时暂停演算。
- `tests/game-browser.mjs`：四种屏幕尺寸检查，验证只有背景、严格双色、逐像素网格覆盖屏幕，以及循环首尾一致。
- `.github/workflows/deploy-pages.yml`：保留原有 GitHub Pages 发布和其它像素学习工作流，添加游戏背景浏览器测试与截图。
- **原 Android APK**：`android/app/src/main/java/com/paperchalk/lampkeep/MainActivity.java`，原包名 `com.paperchalk.lampkeep`，每次冷启动请求网站根地址，自动获取新的网页内容，**无需新造另一套 APK**。
- 原有 APK 下载链接：https://github.com/g2066203208-beep/paperchalk-world/releases/download/apk-latest-debug/paperworld-latest-debug.apk

**注意：当前只是背景阶段，不宣称游戏玩法已完成。** 网页/Android 是否已成功部署或编译，需以 GitHub Actions 真实状态为准。

## 保留的创作工具（不是 APK 首页）

- [PixelLab](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/)
- [Character Lab](https://g2066203208-beep.github.io/paperchalk-world/character-lab/)

## 已清理的旧模块

旧 BoneLab 的页面、CSS、JS 渲染/逆运动学/SDF 算法与相应测试均已从 `main` 删除；原游戏网页不再有旧实验室入口。独立 PixelLab、Character Lab 不受此次删除影响。网站发布改为独立快速流水线，不再依赖任何 ML 训练任务。训练过程迁移至手动/受限触发的 PixelLab 工作流。

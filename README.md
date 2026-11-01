# PIXEL ATELIER — 像素创作工作室

根据用户要求，仓库当前分支移除了恐怖房间、酒吧经营、PAPERWORLD 游戏主页、城市与体感 3D 原型，以及旧游戏 Android WebView 工程、游戏测试与游戏部署流水线。

保留的独立工具：

- [PixelLab](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/)
- [像素绘画编辑器](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/editor.html)
- [像素材质工作室](https://g2066203208-beep.github.io/paperchalk-world/world-builder/materials.html)
- [美术参考资料库](https://g2066203208-beep.github.io/paperchalk-world/learning-library/)

**清理范围：当前分支与公开网站。** 历史 Git 提交、旧 Releases、Actions 归档及用户设备中曾经安装的 APK 不会因删除源码而自动消失。


## 目前托管的教室场景实验

- [在线体验：横屏教室与独立流体黑雾](https://g2066203208-beep.github.io/paperchalk-world/)
- 电脑：鼠标相对屏幕中心的位移控制教室背景的 3D 倾斜。
- 手机浏览器：优先请求横屏；允许后读取设备方向传感器，相对首次握持角度校准，并把相同的归一化倾斜值用于背景。页面有“重置中心”和无传感器时的触摸拖动备用方案。
- 普通浏览器未必允许网页强制横屏，通常需要用户点击按钮进入全屏，或手动旋转手机；Android 应用使用 `sensorLandscape` 实现系统级横屏。
- 黑雾始终在独立的屏幕空间持续模拟，原图片边缘有随背景旋转的固定黑色渐变遮盖。
- [Android 横屏版本（构建成功后下载）](https://github.com/g2066203208-beep/paperchalk-world/releases/tag/classroom-apk-latest)，每次冷启动读取最新托管网页；原生 APK 修改需重新安装。

**当前交付性质：** 单场景交互技术演示，尚不等于有男女主角剧情、对话、存档、关卡的完整《错位日常》游戏。

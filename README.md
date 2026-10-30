# PAPERWORLD · 四色程序像素游戏

原 Android APK 的**唯一游戏首页**：https://g2066203208-beep.github.io/paperchalk-world/

## 2026-10-30｜主菜单实际程序开发

用户批准了此前生成的 PAPERWORLD 粉蓝纸飞机像素主菜单参考图，但明确要求将其**用程序画进实际游戏**，不能把 GPTIMG 的 PNG 当作游戏界面。

- `site/index.html`：原 APK 打开的根页面，游戏主菜单。只使用两个 Canvas，不引入图片。
- `site/game/background.js`：保留原奶油白/雾蓝斜条纹，GPU 连续平移、8秒循环、沿条纹法线同时移动 X/Y。
- `site/game/menu.js`：全部程序绘制纸飞机、分层像素云、PAPERWORLD 手写像素字母、星光、四种按钮、按钮图标与像素粒子。使用**整数像素矩形和扫描线多边形**，避免真实画面产生第五种抗锯齿颜色。
- 正式四色：深紫 `#393657`、樱粉 `#F2A5C2`、雾蓝 `#A9BAE9`、奶油白 `#FFF5E6`。界面不加载生成图片或额外颜色。
- 触控：Android 手机单击、按压回弹、短振动反馈、点击粒子；鼠标指向反馈与键盘↑↓/回车/ESC，横屏竖屏自动布局。
- **开始游戏**：进入序章界面并建立真实本地起始存档。**继续游戏**：有起始存档才进入序章，否则提示暂无存档。**设置**：实际切换背景运动、粒子和振动；设置本地保存。**退出游戏**：网页环境显示结束画面并能返回主菜单（浏览器不能静默退出 Android 应用）。
- 游戏的后续世界、剧情与操作**尚未实现**；当前交付范围为可交互的程序化主菜单，不谎称整款游戏已完成。
- `tests/background-home.test.mjs`：源代码约束、只允许四色、主菜单逻辑和原 WebView 地址。
- `tests/game-browser.mjs`：Playwright 实际桌面、竖屏手机、横屏手机、平板，点击/继续/保存/设置/退出路径，保存截图至 GitHub Actions artifact。
- `.github/workflows/deploy-pages.yml`：校验、发布并在公网核对真正的菜单代码，不再依赖机器学习训练结果才上线。

## 原 APK 与自动更新

原包名 `com.paperchalk.lampkeep`，每次冷启动/回前台请求网站根目录。网站每60秒对比在线版本标识，有新版菜单会自行刷新。此前根目录离线 Service Worker 也有一次性迁移清理逻辑。APK 原生代码更新需要重新安装一次，通过 GitHub Actions 发布固定 Debug APK：

https://github.com/g2066203208-beep/paperchalk-world/releases/download/apk-latest-debug/paperworld-latest-debug.apk

请注意 GitHub Actions 是否通过；仅有提交记录不等于公网发布或 Android 实机验收成功。

## 保留的独立创作工具

- [PixelLab](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/)
- [Character Atelier](https://g2066203208-beep.github.io/paperchalk-world/character-lab/)

旧 BoneLab 的页面/骨骼求解器/渲染器已经删除。游戏程序与美术训练工作室分离。

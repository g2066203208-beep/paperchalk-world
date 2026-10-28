# Web + Android 容器

本仓库的 `main` 只保留未来网页开发所需的最小框架，以及自动构建 Android APK 的托管网页容器。**当前不包含游戏设计或旧项目内容。**

- 网页入口：<https://g2066203208-beep.github.io/paperchalk-world/>
- APK 固定下载：<https://github.com/g2066203208-beep/paperchalk-world/releases/download/apk-latest-debug/paperworld-latest-debug.apk>
- APK 构建记录：<https://github.com/g2066203208-beep/paperchalk-world/actions/workflows/apk.yml>

## 更新方式

修改 `site/` 后提交到 `main`：GitHub Actions 自动校验并部署 GitHub Pages。已安装的 APK **每次启动时直接获取托管网站最新版页面**，无需重新打包 APK。

修改 `android/` 后提交到 `main`：GitHub Actions 自动构建 Debug APK，覆盖固定 Release 下载地址。APK 原生代码修改仍需用户手动安装更新，无法静默安装。

Android 保留原 applicationId `com.paperchalk.lampkeep` 以及旧调试签名缓存 key，尽可能兼容旧版 APK 的覆盖安装；若原签名缓存已丢失，可能需要卸载旧版后安装。

## 当前目录

- `site/index.html`：全新空白网页入口
- `android/`：仅加载网站的原生 Android WebView 容器
- `.github/workflows/`：网页部署、APK 自动构建
- `tests/`：最低限度的框架检查

没有旧游戏引擎、场景、角色、贴图、模型、Android 业务桥接或游戏功能。具体网页内容待后续决定。

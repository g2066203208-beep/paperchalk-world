# Android 测试版

包名：`com.paperchalk.world.test`。它与旧版 `com.paperchalk.world` 独立安装，不覆盖旧 App 或旧存档。当前外壳版本为 `1.1.1`（versionCode 6），最低 Android 8.0 / API 26。沿用测试版包名及签名，可覆盖升级 1.1.0 测试版；频道兼容级别仍为 5。

## 打开即测试已发布内容

冷启动和回到前台时，App 从公开的 `https://g2066203208-beep.github.io/paperchalk-world/app/channel.json` 检查测试频道。请求带有禁用缓存请求头和时间参数。只有版本变化时才切换页面；版本不变保留当前游戏、镜头和进度。

频道格式：

```json
{
  "schemaVersion": 1,
  "version": "40位Git提交SHA或至少7位短SHA",
  "entry": "releases/与version一致的SHA/studio/index.html",
  "publishedAt": "2026-10-01T08:00:00Z",
  "minShellVersion": 5
}
```

该例中的中文占位值用于说明，不能直接部署。版本实际必须为 7–40 位小写十六进制。入口必须精确对应同一版本。发布流程需要先上传完整的不可变版本目录，再切换频道指针；只提交代码、未成功发布的内容不会出现在 App 中。

检查失败会明确显示“无法检查最新版本”。如果已记住一个验证过的版本，App 尝试打开该地址，仍标明未能确认最新。它不承诺完整离线可用。不可变资源保留正常 HTTP 缓存，启动时不清空所有缓存。

更新前通过 `window.PaperchalkSaveNow()` 保存。返回 `false` 或 1.5 秒内未收到确认，会保留当前页面并显示重试，避免默默丢失进度。测试版与旧版没有自动迁移存档。

## 网页与原生外壳的约定

- `window.PaperchalkSaveNow()`：同步保存，成功返回 `true`。
- `window.PaperchalkHandleBack()`：关闭展开的面板时返回 `true`；没有待关闭面板时返回 `false`，外壳保存后退到后台。
- `paperchalk:pause`、`paperchalk:resume`：窗口事件，通知网页暂停/恢复交互和渲染。恢复时还会触发 `resize`。
- User-Agent 附加 `PaperchalkShell/5`，供页面展示 App 适配布局。
- 当前 App 另附加 `PaperchalkApp/1.1.1`。它直接打开线上发布内容，不要求手机连接开发电脑或本地服务器。
- 原生将安全区注入为 CSS 变量 `--paperchalk-safe-top/right/bottom/left`（单位 CSS px），并发出 `paperchalk:insets` 事件。网页控件使用这些值或与 `env(safe-area-inset-*)` 取最大值，不能两者相加。

横屏支持两个方向。WebView 和游戏画面铺满屏幕，安全区只影响操作控件的位置，原生容器不再预留顶部状态条或重复添加安全区 padding。加载提示是短暂浮层；成功后隐藏，返回前台的正常检查不改变画面尺寸，也不重新弹出顶条。网络异常保留浮层提示和重试按钮；已有游戏时可收起提示继续当前版本。画面组件崩溃在五分钟内最多自动恢复两次，之后停下并提供手动重试。

## 验证

不依赖 Android SDK 的 Java 校验测试：

```sh
javac -d android-app/build/channel-tests android-app/app/src/main/java/com/paperchalk/world/ChannelRelease.java android-app/tests/ChannelReleaseTest.java
java -cp android-app/build/channel-tests com.paperchalk.world.ChannelReleaseTest
```

真实 Android WebView 冒烟测试不引入第三方测试框架。先成功发布频道，构建并安装 debug APK 和 androidTest APK，然后运行：

```sh
adb shell am instrument -w -e expectedVersion <已发布的SHA> com.paperchalk.world.test.test/com.paperchalk.world.SmokeInstrumentation
```

输出必须包含 `status=PASS`。测试覆盖原生启动、已发布版本匹配、不可变入口、存档接口、恢复前台不重复加载、游戏画布存在。构建成功、JVM 校验通过都不能替代此设备测试，也不代表所有手机的帧率和发热已验收。

安装包需要使用同一持久签名密钥，才能在以后覆盖升级测试版。密钥不能提交到仓库；这里不管理或修改签名。

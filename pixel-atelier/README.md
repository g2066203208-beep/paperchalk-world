# Pixel Atelier / 像素工坊 (Android Native)

独立于 Paperworld 的 Android Kotlin + Jetpack Compose 原生离线像素画工程。当前版本 **0.1.0 P0**，不使用 WebView，不需要互联网权限。

## 实现范围
- 真正的 32-bit ARGB 整数像素网格，不进行平滑插值
- 铅笔、橡皮、吸管、四邻接填色、直线、轮廓/填充矩形
- 双指缩放和平移、直接绘图/偏移准星/独立光标模式
- 多图层可见性、锁定、添加、删除、切换
- 单笔事务撤销重做；双指手势中途撤销本笔，避免误绘
- 原子项目持久化、.pixelatelier ZIP 工程结构、PNG 导入导出
- 中文现代深色界面、竖屏和横屏可用、无账户广告

## 构建
Java 17；Android SDK 35；Gradle 8.10.2:

```sh
gradle --no-daemon -p pixel-atelier :app:testDebugUnitTest :app:assembleDebug
```

输出：`pixel-atelier/app/build/outputs/apk/debug/app-debug.apk`

## 验证状态
JVM 像素测试、APK 编译通过与否以 GitHub Actions 的真实结果为准；模拟器/手机触控和性能测试未运行时不得宣称完成。GIF/APNG/Tilemap/像素转换为 P1/P2，不在 P0 冒充已完成。

## 隐私
Manifest 不声明 INTERNET 权限；文件本地保存，仅使用 Android 系统文件选择器导入导出。

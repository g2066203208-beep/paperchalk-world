# 余烬之夜 / Night Remains — 场地生存卡牌（可玩原型）

网页： https://g2066203208-beep.github.io/paperchalk-world/

Android APK（WebView 容器）： https://github.com/g2066203208-beep/paperchalk-world/releases/download/apk-latest-debug/paperworld-latest-debug.apk

这不是静态概念图。**打开网页即可操作**，没有构建步骤和登录要求。现有 Android APK 启动时直接打开 GitHub Pages 网页最新版：网页修改不需要重装 APK；Android 原生代码更新才需要手动安装新 APK。

## 已实现

- 三张独立场地卡牌：墓园、教堂、暗巷。点击卡牌切换场地（消耗 1 AP），中间必须经过教堂；各区域敌人状态独立保留。
- 三种感染者，共七个敌人；敌人距离为 3、2、1，对应小、中、大卡牌尺寸。结束回合后当前位置敌人推进或攻击。
- 选定目标后用步枪射击（消耗弹药和 1 AP，伤害 2）；背包装弹；医疗包回血；照明弹推开敌人；每回合 3 AP。
- 清除所有区域敌人即胜利，生命耗尽失败。刷新页面不会丢失进度（浏览器 localStorage）。
- 手机竖屏（场地卡横排、卡牌可横向滚动）、手机横屏、电脑均可操作；触控按钮满足点击面积，附玩法说明。
- 原创代码生成的低分辨率矢量像素场景和卡面图案；不是复刻原游戏的素材。
- 静态 GitHub Pages，无服务器依赖；GitHub Actions：规则测试 + 真实 Chromium 桌面、手机竖屏、手机横屏操作及截图；成功后才发布网页。
- 原 APK 包名和 WebView 托管网址保持不变。

## 开发

打开 `site/index.html` 需要本地 HTTP 服务器以加载 ES modules，例如：
```bash
python -m http.server 4173 --directory site
```
然后访问 `http://localhost:4173`。

规则层是 `site/rules.js`（没有 DOM 依赖），场景与像素卡图是 `site/art.js`，网页交互是 `site/app.js`。运行：
```bash
node --test tests/*.test.mjs
```

浏览器 E2E 由 `tests/browser.mjs` 和 `.github/workflows/ci.yml` 启动，对真正的点击 / 触摸、敌人尺寸、存档与水平溢出进行断言，截图保存在 Actions Artifacts 中。

这只是第一版可玩的战斗流程，不声称已经包含完整关卡、剧情、平衡性、网络联机或专业级逐像素插画。后续可以围绕真实游玩反馈继续迭代。

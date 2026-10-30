# PAPERWORLD · 四色像素叙事游戏

游戏主页（**原 Android APK 直接访问的旧网址**）：https://g2066203208-beep.github.io/paperchalk-world/

本轮实现（2026-10-30）：
- `site/index.html`：真正的游戏首页，不是独立背景演示；中央小窗口 + 两色粗斜纹动态背景
- `site/game/game.js`：正式 D 风格色板 `#393657` / `#F2A5C2` / `#A9BAE9` / `#FFF5E6`；外层背景仅使用奶油白和樱粉，Canvas 整数网格程序绘制，36秒无缝周期
- `site/game/game.css`：小窗游戏布局，手机竖屏、横屏和平板适配
- 游戏内第一段互动：开始、推进对白、选择回应、短剧情反馈；`localStorage` 保存进度，具备暂停运动、重新开始选项
- `tests/game-browser.mjs`：Playwright 测试四屏尺寸、像素调色板、对话分支和存档
- `android/` 和 `.github/workflows/apk.yml`：**从仓库既有历史版本恢复**，原包名 `com.paperchalk.lampkeep`，每次冷启动请求根目录最新网页；不再使用新建的第二个 APK
- 固定 APK（原地址）：https://github.com/g2066203208-beep/paperchalk-world/releases/download/apk-latest-debug/paperworld-latest-debug.apk
- APK Actions：https://github.com/g2066203208-beep/paperchalk-world/actions/workflows/apk.yml

原工作室保留，不覆盖：
- BoneLab：https://g2066203208-beep.github.io/paperchalk-world/bone-lab/
- PixelLab：https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/
- 角色实验室：https://g2066203208-beep.github.io/paperchalk-world/character-lab/

## 真实状态与范围

这是**首个可操作的游戏界面及对话垂直切片**，不是最终剧情或完成的人物演出。角色立绘复用已经通过正式四色审核的资产（如生成/部署的 `pixel-lab/d-standing-v1-384x512.png`），未审核的 AI 草图不得进入游戏。若该导出图暂时不存在，游戏仍可操作，暂不显示立绘。

GitHub Pages 部署由 `.github/workflows/deploy-pages.yml` 负责。网页变更通过原 APK 下次启动加载，无须重复安装；Android 包自身改动才需要重新编译安装。Debug APK 能否覆盖原安装还依赖原签名缓存是否一致。新的网页和 APK 是否部署成功须查看 GitHub Actions 实际运行结果，不能凭代码已提交宣称全部通过。

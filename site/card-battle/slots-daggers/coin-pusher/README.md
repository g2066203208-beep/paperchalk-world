# WORK · 黄金推币塔｜独立试玩
这是 Work 托管机台里的**第二页面：推币塔**，可从主页面直接切换回来；不修改原老虎机的金币物理与原版画面。

主入口：`site/card-battle/soul-table.html`（第 1 页：原老虎机）

第 2 页：`site/card-battle/slots-daggers/coin-pusher/index.html`（原版金币推币塔）

两页右上方都有切换标签。

## 继承 Work 原版金币的方法
- `../coin-art.js`：**原文件原封不动引用**。调用 `new CoinTable` / `CoinTable.make()` 生成十边厚币、双面浮雕、刻齿；**完整调用 `CoinTable.update()` → `CoinTable.step()` → `contact()` / `pairs()`**，保留原版金币的支撑、逐枚反弹、滚动摩擦、四元数角速度及碰撞；调用 `CoinTable.draw()` 让原版软件光栅、法线、金属高光、辉光、投影与每帧角度缓存直接负责绘制。
- `../cabinet-art.js`：原文件原封不动引用。机身使用原版木桌、绿铜铸件、凹槽、面板、铆钉与环境阴影。
- `../engine.js`、`../pixel-type.js`：仅用于复用原来的字体系统。
- `game.js`：新写的推币机构与交互。新增往复推板（从背后压迫金币）、原物理求解器的机台边界适配、真实上下支撑的金币塔、前沿掉落收集、投币瞄准、自动投币、金币总量预算与暂停。
- `game.js` 没有复制、替代、重新着色原金币光栅渲染器；原 shader 仍在 `../coin-art.js`。
- 新机构与 Work 原版托盘不是同一块空间，**仅重写推币台的 `coins.bounds`**，其余实际运动、上下层支撑、金币接触、姿态更新继续执行原版 `CoinTable` 的 **1/240 s** 固定步长物理。推板只在接触时加入速度与推进，不另造一套硬币接触引擎。
- 原版 CoinTable 是带高度/厚度的定制碰撞求解器，并非全面的三维接触流形/CCD 引擎。本版保留其当前能力，不宣称它与通用 6DOF 物理引擎等价。

## 玩法
投一币消耗一 CREDIT，向推币机后方投币。机械推板周期往复，金币互相挤压；金币塔底层受冲击后坍塌。金币越过前沿并落入收集托盘计入 COLLECT，达到目标赢得本局。选取板面点击以改变投币位置；A、D 或方向键微调；空格/Enter 投币；F 自动投币；P 暂停；R 重开。触屏点击右边 DROP/AUTO/PAUSE。

## 验收
参见 `tests/work-coin-pusher-browser.mjs` 和 `.github/workflows/work-coin-pusher-qa.yml`。测试生成真正 Chromium 窗口的桌面/横屏/竖屏截图以及操纵机械的录像。测试只针对独立入口，不会改动主游戏。

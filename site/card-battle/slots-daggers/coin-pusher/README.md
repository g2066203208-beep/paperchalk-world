# WORK · 黄金推币塔｜独立试玩
这是完全独立的**推币塔**游戏实验，不修改 Work 原老虎机或先前的抽卡机。

入口：`site/card-battle/slots-daggers/coin-pusher/index.html`

## 继承 Work 原版金币的方法
- `../coin-art.js`：**原文件原封不动引用**。调用 `new CoinTable` / `CoinTable.make()` 生成十边厚币、双面浮雕、刻齿；调用 `CoinTable.draw()` 让原版软件光栅、法线、金属高光、辉光、投影与每帧角度缓存直接负责绘制。
- `../cabinet-art.js`：原文件原封不动引用。机身使用原版木桌、绿铜铸件、凹槽、面板、铆钉与环境阴影。
- `../engine.js`、`../pixel-type.js`：仅用于复用原来的字体系统。
- `game.js`：新写的推币机构与交互。新增往复推板（从背后压迫金币）、币间逐对接触、塔币脱稳/翻滚、前沿掉落收集、投币瞄准、自动投币、金币总量预算与暂停。
- `game.js` 没有复制、替代、重新着色原金币光栅渲染器；原 shader 仍在 `../coin-art.js`。
- 新机构与 Work 原版托盘不是同一块空间，**不调用原 CoinTable.update()/step()**，避免其为旧托盘写死的边界和投币出口污染推币机。物理步长单独采用 1/180 s，渲染继续调用原币独有的 `CoinTable.draw()`。
- 塔币层次属于试验性近似，尚不是完整堆叠刚体/CCD 仿真。

## 玩法
投一币消耗一 CREDIT，向推币机后方投币。机械推板周期往复，金币互相挤压；金币塔底层受冲击后坍塌。金币越过前沿并落入收集托盘计入 COLLECT，达到目标赢得本局。选取板面点击以改变投币位置；A、D 或方向键微调；空格/Enter 投币；F 自动投币；P 暂停；R 重开。触屏点击右边 DROP/AUTO/PAUSE。

## 验收
参见 `tests/work-coin-pusher-browser.mjs` 和 `.github/workflows/work-coin-pusher-qa.yml`。测试生成真正 Chromium 窗口的桌面/横屏/竖屏截图以及操纵机械的录像。测试只针对独立入口，不会改动主游戏。

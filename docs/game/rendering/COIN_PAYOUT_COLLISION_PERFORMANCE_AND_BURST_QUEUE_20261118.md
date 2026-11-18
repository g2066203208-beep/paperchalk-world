# 2026-11-18：金币穿插、CPU 压力、连发中奖修复与 QA 交接

## 本次问题（用户明确反馈）
- 中奖金币太薄、漂浮、卡顿；后续又指出大量金币互相穿过，像“量子纠缠”。
- 金币必须由老虎机的实际出币口连续进入实体接币盆，不允许为了画面壮观乱射到场景之外。
- 应使用真实 Three.js 场景、真实游戏截图验证，不得以 AI 概念图替代实现。

## 本轮实际改动
1. `site/card-battle/motion/coin-payout-fast.mjs`：保留 10 边真实实体渲染、共享尺寸、每枚独立 XYZ 与四元数，保持朝向感知竖向包络、落地/盆壁约束、最终有序非穿插投影；密集碰撞主迭代由 5 次改为 2 次。最终约束仍负责收尾消除重叠，不是取消碰撞。
2. `tests/coin-payout-fast.mjs`：修复旧的错误断言——金币在飞行中必须有明显的 3D 翻滚，但停稳以后允许变成面朝上的金属币，不应该为了通过测试要求所有金币一直倾斜。新增在 26 个物理步后的旋转检查，并保留完整后续落地检查。
3. 相同物理模块新增 `queuedBatches`：连续点击中奖不会覆盖正在发放的前一批金币；未发射的承诺数量也占 500 容量；前一批发完才启动下一批，接币盆维持持久堆积。
4. `tests/coin-payout-browser.mjs`：增加第二次连发的实际浏览器截图与计数检查。
5. `.github/workflows/coin-payout-3d-qa.yml`：新提交会取消旧版并行 Chromium QA，避免同一分支的多份浏览器测试抢资源、抢截图提交。

## 复核和数据解释
- 早期失败 run `44273173154` 在 `tests/coin-payout-fast.mjs:25` 停下，报 `3D angular orientation must be simulated`；此断言在全部落地后测试翻滚，并不能证明飞机阶段无翻滚。已经改成分别测试飞行/落地。
- 对 GitHub 最新物理模块在同一独立 JavaScript V8 环境重放，20261118 种子：120/240/420/500 枚分别推进 310/470/720/940 个固定物理步，样本显示全部发出、`overlappingCoins=0`、`escapedEver=0`。
- 对比同一测试环境、相同 420 枚、550 物理步：旧 5 次主迭代约 10.2 秒、2 次约 5.2 秒；**这不是**浏览器 GPU 帧率，也不是用户手机的性能保证。最终高度与位置由额外的有序非穿插约束处理。
- 连发 24、18、请求 50 但剩余容量 33、再请求 12 被拒绝：实际队列接受 `[24,18,33,0]`，最终正好发出 75 枚，`queuedCoins=0`、`overlappingCoins=0`、`inBasin=75`。
- 2026-11-18 本次更新时，新版 GitHub Actions Chromium 全流程尚未确认最终通过。旧目录 `site/card-battle/qa/coin-payout/` 中的截图属于之前版本，不能据此宣布当前源码实机验收合格。

## 最新版必须继续检查
- [ ] 最新 GitHub Actions 绿色：物理单测、抗穿模、Chrome 三设备截图和 WebM 录屏。
- [ ] 逐张看喷射、撞击、420 枚堆、侧面高度、关闭辉光/开启强辉光 A/B，**目视**排除薄片、穿插、非自然竖塔和机体比例错误。
- [ ] 手机实际 GPU 的 FPS、帧时间与内存，不能根据 V8 无渲染跑分宣称流畅。
- [ ] 对照 Slots & Daggers 原画面的**材质/光影/辉光/速度**，不是照抄布局；还未完成原版视频毫秒级逐帧匹配。

## 固定入口
- 游戏实验页：`https://g2066203208-beep.github.io/paperchalk-world/card-battle/coin-payout-3d.html`
- 对应已保存截图目录：`site/card-battle/qa/coin-payout/`
- 核心物理：`site/card-battle/motion/coin-payout-fast.mjs`
- 主视觉：`site/card-battle/motion/coin-payout-view.mjs`
- HDR PBR：`site/card-battle/motion/coin-payout-lighting.mjs`
- 单测：`node tests/coin-payout-fast.mjs && node tests/coin-payout-anti-overlap.mjs`
- 浏览器：`node tests/coin-payout-browser.mjs`（需安装 Playwright、用本地静态服务器服务 `site/`）。

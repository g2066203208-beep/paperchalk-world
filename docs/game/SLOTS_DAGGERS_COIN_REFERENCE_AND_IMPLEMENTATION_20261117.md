# Slots & Daggers — gold payout visual research + implementation audit
Date: 2026-11-17
Scope: original Paperchalk Snowbound game; research reference only, no commercial-game source/assets.

## Primary publisher/developer video and image references

1. 80 Level (2025-08-15), focused report on developer-posted WIP coin payout and sound effect:
   https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game
2. Developer-narrated trailer (minute 00:43–00:52: physical-feeling slot machine, individual coin clings, upgrade menu):
   https://www.dailymotion.com/video/x9sjabo
3. Official/press-kit trailer:
   https://www.youtube.com/watch?v=1c-5tsSO6_s
   https://www.igdb.com/games/slots-and-daggers/presskit
4. Official gameplay screenshots:
   https://slotsanddaggers.ateo.ch/
5. Game page, trailer, screenshots and player recordings:
   https://store.steampowered.com/app/3631290/Slots__Daggers/
   https://steamcommunity.com/app/3631290/
6. Interview with the developer, technical disclosure:
   https://indiegames.wtf/interviews/slots-daggers-the-roguelite-between-luck-and-strategy/
7. Full gameplay recording:
   https://www.youtube.com/watch?v=35dhkRyCvhU
8. Independent review of physical coin/metal impression:
   https://djmmtgamechangerdoc.wordpress.com/2025/11/18/slots-daggers-review-7-5-10/

## Verified facts versus deductions

**Developer-confirmed:** Unity project; mixed 2D and 3D; perspective rather than orthographic camera; most sprites cast shadows via Unity lighting; 3D models modeled in Blender; audio via FMOD. Developer personally emphasizes extensive work on physical interactions and coin sounds.

**Strong visual observations, not implementation confirmation:** Gold coins physically spin/tilt and gather at the left side of the machine; sharp warm highlights against a subdued black/brown background; coin spill, successive impacts and collectible money tray. The original implementation may use 3D meshes, sprites, a mix, or authored animations; do NOT claim access to their coin source.

**Not yet measured:** Reference-accurate per-frame payout launch interval, bounce restitution, total settle duration, audio envelope, exact reflectivity and color calibration. No claim of pixel-accurate clone from these references until video frames are extracted and compared with actual test recordings.

## Implemented in our actual playable game

- New original shader + 3D mesh module: site/card-battle/motion/slot-daggers-coins.js
  - Native WebGL 1 solid 3D coins: front/back faces, raised rings, beveled rim, physically present edge thickness, scalloped/milled edge shading
  - Per-coin orientation with independent spin, roll and tilt
  - Moving multi-lobe specular highlights, metal/environment fake reflection, radial stamped relief
  - Gravity and successive damped bounces on a common ground/payout tray
  - Time-varying soft contact shadows (separate pass) and staggered randomized payout
  - WebAudio transient metal partials for multiple landing impacts; respects in-game sound setting
  - Coins converge toward current resource counter at end; game state is NOT modified by this visual layer
- Live integration: site/card-battle/snowbound-journey.html
- Gold-gain/camp/choice triggers: site/card-battle/ui/snowbound-journey-ui.js
- Battle victory trigger: site/card-battle/motion/snowbound-motion.js
- Interactive original asset-free comparison lab: site/card-battle/coin-fx-lab.html
- Real Chrome three-screen video/frame capture: tests/slots-daggers-coins-browser.mjs
- GitHub Action: .github/workflows/slots-daggers-coin-fx-qa.yml

## QA contract

- Verify real WebGL program compiles, and canvas drawing buffer dimensions match desktop and mobile viewports.
- Capture at launch (~120ms), flip (~340ms), first bounce (~650ms), scatter (~980ms), settle (~1500ms) and collect (~2200ms). The relative timing is for OUR baseline, not verified reference timing.
- Capture full Chromium WebM; verify frame counter and alive coin count, rerun 12/48/76-coin variants without page reload.
- Verify the exact same module runs at the hosted playable Snowbound entrypoint.
- Manually inspect actual screenshots before calling a visual feature approved.
- Preserve battle turns, hero paintings and original resource counters.


## 2026-11-18 V2 真实中奖喷金币和高亮金属反光升级

> 本节基于实际仓库源码补完（不等于拿到原版游戏源代码）。参考资料是开发者金币演出专题及原版完整实机；目前未提取原版金币专用 WIP 短片的可解析逐帧源文件，因此**不得称为原版像素级或毫秒级完全复刻**。

### 视频与原始场景参考

- Friedemann 在 80 Level 的金币吐出动画+音效专访：https://80.lv/articles/check-out-coin-animation-sound-effect-in-this-slot-fantasy-game
- 2025 开发者叙述版，约 00:43–00:52 描述 coin clinks 和升级界面：https://www.dailymotion.com/video/x9sjabo
- 《Slots & Daggers》原版 4K 完整实机视频：https://www.youtube.com/watch?v=oo73Xs0HcFg
- 官方游戏页 https://slotsanddaggers.ateo.ch/
- 实机静帧（用于金属黄暗区/金币堆比较；仅外链，不复制进仓库）：
  https://assets.st-note.com/production/uploads/images/224807377/rectangle_large_type_2_3f697b50263642d1d3c051cc38795bab.jpeg?fit=bounds&height=2000&quality=85&width=2000

### 已更改的真正实现

- `site/card-battle/motion/slot-daggers-coins.js`: WebGL 44 分段带正背面/倒角/滚花侧沿的 3D 金币几何体；双光源漫反射、软盒形环境反射、窄长移动软光条、掠射 Fresnel 反光、金色浮雕内外环；依据旋转法线计算金属的高光，不是把静态星星贴死在金币上。
- 另加屏幕空间 **glint/spark pass**：反光法线对上移动光源时短暂出现十字亮点，第一次接触接币盘时出现受撞击速度影响的小火星，音频与碰撞时机相同。
- 固定 **120Hz 物理积分**：喷口依次抛出（间隔 7.7ms）、抛物线重力、首碰恢复系数 .36–.47、后续衰减、与接币盘/左右壁边碰撞、漂散、朝金币计数器聚拢并缩小消失。
- 稳定**确定性种子** (`seed`)；`seek(ms)` 逐步重播同一粒子初态到指定时间点，图像与碰撞火星都来自同样的模拟时间（不能让 GPU 光源使用 `performance.now()` 导致重复帧不一致）。
- `site/card-battle/coin-fx-lab.html` 由孤立的“吐金币按钮”变成 **三转轮互动机台**：点击旋转→符号逐个减速停到三连金币→机台亮起 WIN→物理金币喷出→金币飞向钱包数值逐次增加；保留 12/76 密度比较。
- **实际游戏** `site/card-battle/snowbound-journey.html` 已引用同一模块；`site/card-battle/ui/snowbound-journey-ui.js` 对真实 game-state 金币获得触发 `burst()`；`site/card-battle/motion/snowbound-motion.js` 在战斗胜利反馈触发同一 `burst()`，金融数据仍由游戏规则引擎控制，不会因跳过动画重复加钱。

### V2 我们的动画关键时间点（只代表我们，非原版定量）

| t（相对 burst 触发） | 当前 GPU 画面应有的状态 |
|---:|---|
| 0ms | 第一枚从喷口伸出；连喷队列刚刚开始 |
| 120ms | 多枚金币的边沿翻转，高亮正面与暗色侧面交替 |
| 280ms | 大量金币形成散射扇区，金属软反射随角度变化 |
| 480ms | 局部金币正对反光环境，高亮带/星芒短促扫过 |
| 700ms | 首轮金币接触接币盘，受力弹起并带火星 |
| 980ms | 交错二次弹跳、多次清脆撞击 |
| 1380ms | 金币在盘内散开滚动，高光仍随着转动改变 |
| 1920ms | 大部分缓慢停定；接地影变实 |
| 2310ms | 金币向账面数值方向收拢，缩小淡出 |
| 2640ms | 最后一批金币收钱，计数增加，光斑结束 |

**实际 QA**：`tests/slots-daggers-coins-browser.mjs` + `.github/workflows/slots-daggers-coin-fx-qa.yml`，1920×1080、390×844、844×390 实际 Chromium，截图 10 个固定时间点 + 视频。QA 验证 WebGL 真材质、同 480ms 同种子逐像素稳定、撞击次数>0、glint 可见、三连中奖后金币余额+48、12/76 枚密度、以及实际 Snowbound 页使用相同模块。**须以工作流的最终 success 与截图为准**，文档不是完成测试的证明。

下一步与原视频逐帧对应，应先取得可下载原版动态素材，逐帧确定原版起喷时间、最大喷发速度、第一声撞击时间、反光亮带面积和总结束时间，再逐项调整 V2。

# PAPERWORLD｜游戏实际画面学习库

线上入口：`/paperchalk-world/learning-library/`，项目源文件：`site/learning-library/`。

## 首批研究作品

**用户指定的六款重点：** Coffee Talk（咖啡心语）、Coffee Talk Episode 2: Hibiscus & Butterfly（咖啡心语 2）、Hookah Haze（水烟水雾）、Papers, Please（请出示证件）、NEEDY STREAMER OVERLOAD（主播女孩重度依赖）、VA-11 Hall-A（赛博朋克酒保行动）。

**扩展 17 款：** Pixel Cafe、The Red Strings Club、Strange Horticulture、The Cosmic Wheel Sisterhood、2064: Read Only Memories、Potion Craft、Unpacking、Death and Taxes、Do Not Feed the Monkeys、A Space for the Unbound、Eastward、Mind Scanners、Not For Broadcast、To the Moon、OneShot、Potion Permit、The Final Station。

## 实机截图，而非 AI 假图

- `games.js`：23 款游戏的准确 Steam 应用 ID、学习主题和具体观察点。
- `seed-screenshots.json`：19 张有原始截图 URL、图片来源与页面链接的初始实机画面。
- `scripts/collect-game-reference-shots.mjs`：在 GitHub Actions 使用 Steam 官方公开商店截图 API 查询各游戏，最多提取 12 张/游戏，只接受游戏对应 App ID 下真正的 `ss_*.jpg` 截图记录。失败时保留有据可查的初始图。
- `screenshots.json`：图库运行时的照片索引；**发布流水线重新生成**并随网页发布，不把他人的版权图片二进制文件复制进项目游戏素材目录。
- `game-reference-library.yml`：使用真实 Chromium 测试竖屏、横屏与电脑图库，生成屏幕截图。
- **2026-10-31 首次官方采集结果：23 款、246 个实际游戏截图 URL、0 款缺少截图**。这是有出处的图片引用数量，不是经过算法生成或模型训练的资产数量。

## Coffee Talk Episode 2 专项重点学习（高优先级）

- **基础画面**：官方游戏实际画面中的人物面朝玩家，吧台有明显横向边缘，物件与角色身体分层。不要照抄砖墙、颜色或人物，只学习镜头与空间逻辑。
- **镜头 A · 接待与叙事**：观察人物上半身占屏比例、吧台前后缘、客人视线、对话文字的留白。参考 [Famitsu 实机报道](https://www.famitsu.com/news/202306/12304913.html)。
- **镜头 B · 三材料调制界面**：重点看左侧人物/点单状态与右侧配方和原料交互如何共存，参考 [GamingTrend 的实机配方截图](https://gamingtrend.com/reviews/coffee-talk-episode-2-hibiscus-butterfly-review-thats-the-tea/)。
- **镜头 C · 台面俯视交互**：拉花步骤使用俯视杯面 + 明确操作按钮，参考 [游戏实机拉花截图](https://videogamesplus.ca/products/coffee-talk-episode-2-hibiscus-butterfly-single-shot-edition-ps4)。这个视角切换原则可以转化为 PAPERWORLD 的**登记板靠近、填写、落笔、确认**动作。
- **操作与剧情关联**：物件抽屉、送达对象和配方结果会改变后续叙事反馈，参考 [Shacknews 实机评测](https://www.shacknews.com/article/135116/coffee-talk-episode-2-hibiscus-butterfly-review-score)。
- **核心对照问题**：进入租房登记前，老板娘眼睛和伸手动作是否可见？表格是否真在透视桌面上？触屏操作时是否切到更近的板面？处理完是否自然回到面对面的老板娘？
- **资产规范**：老板娘 PNG、桌子顶面和正立面、登记板、对话 UI 独立绘制；保留 PAPERWORLD 自有四色、整数像素簇，严禁直接复用他人原游戏截图作为我们的场景或模型训练素材。

## PAPERWORLD 要学什么

| 优先领域 | 重点作品 | 我们的独立设计原则 |
|---|---|---|
| 老板娘、对话与物体遮挡 | Coffee Talk 1 + Episode 2、Hookah Haze、VA-11 Hall-A | 人物/桌台/对话 UI 分为独立图层；人物正脸视线与台面位置合理 |
| 柜台透视及经营操作 | Pixel Cafe、The Red Strings Club | 桌面后缘较窄、前缘较宽；看得到真实可放物件的台面，禁止只有正面立板 |
| 租房登记、审查与盖章 | Papers, Please、Death and Taxes | 表格在桌面上，签名与盖章有明确步骤和反馈；文本始终是游戏真实 UI |
| 四色 UI 结构与窗口操作 | NEEDY STREAMER OVERLOAD | 分析清晰的窗口层级和点击反馈，保留 PAPERWORLD 自己的四色配色 |
| 居住空间与像素物件 | Unpacking、Eastward、A Space for the Unbound | 以功能、干净像素簇和恰当空间关系为核心，避免无用装饰 |

**版权与来源：** 各游戏截图版权仍归原作者和发行方所有。本库仅作为带来源的视觉/交互案例库，不会直接用作 PAPERWORLD 美术资产、未经授权的数据训练或游戏中的图片背景。图片由外部官方/来源站点提供；失效时应指明不能加载。

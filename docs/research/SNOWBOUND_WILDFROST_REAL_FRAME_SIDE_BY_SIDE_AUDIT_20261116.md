# 雪境行旅 × Wildfrost 实图对比与人物卡比例审查（2026-11-16）

> **后续纠正（同日）**：原稿 V4 的 7:10 是错误的设计假设。仓库 `monster-hunters/README.md`、`crimson-vampires/README.md` 和血族小兵素材登记均确认原始人物 PNG 为 **704×1024**，即 **11:16 = 0.6875**。已将旧 `hunter-vampire-duel.html` 入口转发到 `snowbound-journey.html`，并使人物卡、领队卡、招募卡全部采用 11:16。更重要的是删除战斗 UI 原先自动把 704×1024 人物 PNG 缩成 **584×850** 的 Canvas 重绘/抠白底代码，直接使用原图 `img.src` 和 `object-fit: contain`。下文原始 7:10 测试数字仅作为**错误旧版的历史审计基线**，不能再称现行尺寸。

> **质量边界**：来源图严格锁定的是我们自己的角色原画比率，不代表原作 Wildfrost 卡牌精准比率；后者依然是 `NOT_MEASURED`。新测试必须提供 GitHub CI 实际截图和每张 PNG 的 `naturalWidth/naturalHeight`。

> **结论：之前“像素级还原”的表述错误。** 只测了我们自己的网页，却没有测量原作截图的实际卡牌边界。真实审美验收未通过。

## 一、已经检索并在对话里展示的原作参考

- 官方 Steam 原图：https://shared.steamstatic.com/store_item_assets/steam/apps/1811990/ss_d7ed2146d858a0abd02a8256befe264328595537.1920x1080.jpg?t=1730826839
- 官方 Steam 媒体：https://store.steampowered.com/app/1811990/Wildfrost/
- 雪林参考（二）：https://truth.bahamut.com.tw/s01/202405/forum/60599/7e5fe81b994c06696520b5d99b0e7583.JPG
- 雪林参考（三）：https://truth.bahamut.com.tw/s01/202405/forum/60599/7327e51066db63f29c17dfbb3e28f52e.JPG
- 手机端媒体截图：https://www.4gamer.net/games/786/G078613/20240327002/SS/002.jpg
- 手机端媒体来源：https://www.4gamer.net/games/786/G078613/20240327002/screenshot.html

注意：以上原始参考图片的每张人物卡 bbox 尚未取得可靠逐像素记录，因此原作精确卡框比例仍标记 NOT_MEASURED。任何直接给出精确原作比例的说法都是不诚实的。

## 二、真实 Chromium 卡框尺寸实测

来源：GitHub Actions 本轮制品 snowbound-pixel-audit/metrics.json。

| 设备 | 旧版宽高像素 | 旧版比例 | 当前 V4 宽高像素 | V4 比例 |
|---|---:|---:|---:|---:|
| PC 1920×1080 | 218×258 | 0.845 | 189.6×270.8 | **0.7001** |
| 笔记本 1366×768 | 180×244 | 0.738 | 141.6×202.3 | **0.7000** |
| 手机横屏 844×390 | 94×104 | 0.904 | 63.5×90.7 | **0.7001** |
| 手机竖屏 390×844 | 110×126 | 0.873 | 87.8×125.4 | **0.7002** |
| 平板 1024×768 | 136×226 | 0.602 | 135.7×193.8 | **0.7002** |
| 小屏 360×740 | 107×105 | 1.019 | 73.8×105.5 | **0.6995** |
| 大屏手机 430×932 | 110×140 | 0.786 | 98.8×141.2 | **0.6997** |

### 2026-11-16 补充：源图 11:16 执行结果与修改文件

- 原图档案：猎人核心、血族核心和血族小兵 704×1024；人物卡的设计宽高比更新为 11:16。
- 旧 URL：`site/card-battle/hunter-vampire-duel.html` 现在跳转到完整 `site/card-battle/snowbound-journey.html`，保留 URL 查询参数和锚点。
- `site/card-battle/ui/snowbound-card-geometry-v4.css`：11:16，整张立绘完整显示，角色/领队/招募卡不因文字栏被挤压变形。
- `site/card-battle/ui/snowbound-journey-ui.js`：移除 Canvas 降采样和临时换源（曾输出 584×850），保持原始 PNG 在页面里。
- `tests/hunter-vampire-duel-browser.mjs`：测试旧入口跳转、五种尺寸领导卡/场上卡原图尺寸与比例。
- `tests/snowbound-pixel-geometry-browser.mjs`：测试七尺寸的 11:16、图片加载、contain 与无卡牌重叠。

### 旧 V4 代码改动（历史记录，现已被纠正）

- site/card-battle/ui/snowbound-card-geometry-v4.css：新增卡牌固定形制 7:10、根据可用行高及列宽约束尺寸，原画仅等比裁切，不拉扁。
- site/card-battle/snowbound-journey.html：按正确样式覆盖优先级引入 V4。
- tests/snowbound-pixel-geometry-browser.mjs：七种设备必须同时通过卡片比例误差小于 0.025、单位不重叠、场景不溢出、手牌完整。
- tests/snowbound-reference-comparison-report.mjs：每轮生成参考原图（远程原始链接）与我们真实 Chromium 截图的并列审稿页。来源图不复制到游戏资产。
- .github/workflows/snowbound-journey-qa.yml：自动生成并上传并列审稿页。

7:10 是我们的**第一轮固定比例设计假设**，不是已经验证的原作精确比例。不允许写“原作比例已百分之百还原”。

## 三、与原作真实参考并排观看后的审美结论

| 项目 | 原作参考的可见特点 | 我们当前截图的问题 | 结论 |
|---|---|---|---|
| 卡牌形制 | 统一、竖向、有明确人物/说明分区 | 旧版跨设备严重失真，V4 刚统一 | 外形问题修正，原作比例未精确核验 |
| 角色脸部 | 面孔在中等缩放下能立即分辨 | 现有 Anima 全身原图放进肖像窗，脸依然太小 | 不合格 |
| 技能文字 | 在图像下半部留有正式效果区 | 我们只放名字和极小的状态行 | 不合格 |
| 属性徽章 | 三个图形徽章大且避开文字 | 我们的倒计时与姓名附近挤压严重 | 不合格 |
| 战场宽度 | 实际出场卡片集中、站位逻辑清楚 | 初始三张牌在横向 12 格中显得过稀疏 | 不合格 |
| 竖屏布局 | 移动端需要单独审稿 | 我们右侧堆三张牌、左边大面积空白 | 不合格 |
| 手牌 | 纸牌有厚度与可辨认的叠层 | 手机上文字、按钮和手牌互相拥挤 | 不合格 |
| 森林场景 | 自然绘画层级与卡牌融为一体 | 程序化三角形树、平涂感明显 | 不合格 |
| 攻击/胜败 | 连续、明确且有冲击力 | 旧版有空帧、死亡胜负分支测试失败 | 不合格 |

### 实际截图位置

GitHub Actions 制品 snowbound-journey-actual-game-screens 内包含：
- snowbound-pixel-audit/desktop-1920-real-battle.png
- snowbound-pixel-audit/desktop-1920-full-capacity-STRESS.png（模拟满阵位，仅用于视觉压力检查）
- snowbound-pixel-audit/mobile-landscape-844-real-battle.png
- snowbound-pixel-audit/mobile-portrait-390-real-battle.png
- snowbound-pixel-audit/metrics.json
- snowbound-reference-comparison/index.html（每轮更新的左右对照图）

## 四、从现在起强制的审稿纪律

1. 每一次布局变更都提供左边原作真实参考、右边我们同屏实机截图，标出参考来源、游戏版本和对比目的。
2. 每次提供设备尺寸、单位卡包围盒、纵横比、卡距、前后排对齐、手牌与战场区域比例。
3. 与原作真实原图逐卡坐标有关的字段没有确切测量前，只写 NOT_MEASURED，绝不冒充像素级吻合。
4. 字体、表情可见面积、角色武器、技能描述和拖动/攻击镜头都必须人工截图审核，测试通过不等于美术通过。
5. 等全部基础卡几何确定后，继续重做肖像裁切与底部信息区，然后再修竖屏布局和全流程动作演出。
6. 我们的素材不能直接复制 Wildfrost 商业图像，官方截图只用于参考研究。

**本次交付准确状态：人物卡跨设备固定形制已实现并经过七分辨率几何测试；原作精确像素比对尚未完成；游戏整体视觉质量仍然不合格。**

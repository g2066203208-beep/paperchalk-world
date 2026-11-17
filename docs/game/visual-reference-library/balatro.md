# 游戏参考拆解与复现任务（2026-11-17）

> 注意：版权游戏素材采用**外部来源链接**保存，不把第三方 GIF、视频、截图复制为本项目资产。此页是技术研究清单，不表示已逐帧像素级复刻。

# 小丑牌 / Balatro

**开发者：** LocalThunk

**参考目标：** 目标不是复制 Balatro 手牌设计，而是拆解极强的交互手感：色彩与 shader 层、卡面亮斑、数字结算串联、UI 的快慢节奏。

## 确认过的来源事实

- Steam 官方与 Playstack 官方发布了实机截图、宣传片。
- CRT、foil/holo、背景 plasma 与计分动画等可从视频和第三方技术分析中观察；特定着色器源码不是官方开放的商业使用授权。

## 画面观察与美术判断（研究结论，不等于开发者公开技术）

- 卡牌即使静止也有微小的纹理运动和光影，使屏幕有活力，但可读性和重要数字是第一位。
- 鼠标移入、抬起、吸附、翻转、打分应分独立事件，不能同时全部缓动成软绵绵一团。
- 数字增长、倍数、奖励、粒子和声音应按原因链串联，不能依赖随机画面闪烁。
- 高光需要切在独立卡面/材质上而不是覆盖整屏；普通卡片和特殊卡片亮度层级不同。

## 落地实现步骤

- 先创建最小 4 卡或 6 卡测试场，锁定卡牌尺寸、点击热区和手机手势。
- 做独立的 card shader（foil/hologram/polychrome 类效果用原创实现），控制强度与环境色。
- CRT 全局层应和卡面高光区分：全局轻微扫描/曲面，局部金属/箔片有角度驱动反射。
- 计分采用事件时间轴，每次触发都有短停顿、文字位移和声音，确保整局不会因过多视觉层而掉帧。
- 保存与 Playstack 预告片同镜头关键点，但先标注源视频 timestamp，不提供未经测量的毫秒数字。

## 渲染通道 / 资产分层命名

- `pixel-card-source`
- `card-special-shaders`
- `CRT-postpass`
- `animated-background`
- `layout`
- `numerical-score-timeline`
- `particles`
- `sound`

## 验收截图与视频规则

- 桌面与手机相同交互，卡面分辨率/比例不可变，hover 不得导致文字模糊。
- 四种局部特殊牌效果分别截图并录制，比较色相、亮度、边缘伪影。
- 记录输入到第一帧动作、命中到打分、分数滚动时长，数据由实际录像提取。

## 当前项目相关文件

- `site/card-battle/motion/snowbound-motion.js — 既有计分节奏参考实验（与源码无关系）`
- `site/card-battle/coin-fx-lab.html — 另一个金币动作实验（不是 Balatro 原美术）`

## 原始图片 / 视频 / GIF 资源

| 类型 | 参考资料 | 核心用途 | 核验状态 |
|---|---|---|---|
| website | [Steam 官方商店与视频/截图](https://store.steampowered.com/app/2379780/Balatro/) | 玩家视图、joker、计分和牌面 | `source-page-verified` |
| video | [Playstack 官方 Launch Trailer](https://www.youtube.com/watch?v=2n9pkiuSZLU) | 卡牌滑入、倍数计分、背景流动、卡光泽 | `video-page-verified` |
| website | [SteamDB 游戏媒体截图索引](https://steamdb.info/app/2379780/screenshots/) | 版本/媒体图索引 | `source-page-verified` |
| article | [Balatro shader 与画面构成研究](https://teemo.dev/game-design/balatro/systems/art-direction-and-visual-language/) | CRT、等离子背景、foil/holo 游戏系统视觉拆解；第三方分析 | `source-page-verified` |
| image | [Balatro 正常实机截图](https://eu-images.contentstack.com/v3/assets/bltbc1876152fcd9f07/blt538c506b7a24d9d1/65d4b8c214f744040a8949cb/B2.webp) | 左侧分数面板、joker 卡列、得分行 | `image-search-verified` |
| image | [Balatro 高得分界面](https://cdn.mos.cms.futurecdn.net/7XhFiLvHowWdxVmUNLTxKk-1200-80.jpg) | 倍数变化、foil/card feel、CRT | `image-search-verified` |
| image | [Balatro joker 展示图](https://cdn.mos.cms.futurecdn.net/v2/t%3A0%2Cl%3A240%2Ccw%3A1440%2Cch%3A1080%2Cq%3A80%2Cw%3A1440/5RfKm7sJMmppVJ9kox5AvR.jpg) | 卡牌系列/美术一致性和可读性 | `image-search-verified` |

## 人工逐帧研究表（等待逐帧核验）

| 素材 | 原始 FPS/帧间隔 | 起点时间码 | 关键帧标注 | 当前状态 |
|---|---|---|---|---|
| 官方 PV/实机 | TBD | TBD | 先记录镜头和触发事件，再逐帧量屏幕坐标 | 未完成逐帧测量 |
| GIF/短片 | TBD | TBD | 帧宽高、循环、帧持续时间及总时长均需采集 | 未完成逐帧测量 |
| 我们录屏 | 以实际 Chromium WebM 为准 | 本地 QA 事件时间轴 | 记录输入帧、第一动作帧、峰值帧、结束帧 | 需定期更新 |

## 资源保全与引用规则

1. 可阅读的原始链接和来源类型保存在 `reference-media-manifest.json`，避免以后搜索不到。
2. 不擅自复制或镜像未授权的游戏图片、GIF、宣传片；如果原链接失效，只更新参考索引并标记失效。
3. 自己拍摄的游戏工程测试截图/视频可留在 GitHub Actions artifact；在正式对比图中明确「原版参考（外链）」与「我们的实机输出」。
4. 若后续 Anima 产出单独素材，则登记尺寸、透明度、源提示词、资产路径、材质槽和遮挡层，**不能**把程序占位纹理写成 Anima 成品。

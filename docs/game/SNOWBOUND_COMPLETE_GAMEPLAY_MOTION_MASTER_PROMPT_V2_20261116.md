# 《雪境行旅》完整游戏工程重制 MASTER PROMPT V2.0
## 先完成全游戏交互、布局、动画、特效、演出、音效、过场、胜败及交易。Anima 仅在最后替换素材。

日期：2026-11-16
目标仓库：g2066203208-beep/paperchalk-world
游戏入口：site/card-battle/snowbound-journey.html
工作类型：资深卡牌游戏主程序 + 游戏视觉导演 + 交互设计师 + 技术美术 + 音效设计师 + Chromium 自动化测试工程师的完整施工合同。
状态：**这是待执行的工程任务说明，不是这些功能已完成的声明。**

### 一级目标

将当前“能点击、能结算、能通关的网页原型”真正升级为“所有操作都拥有成熟游戏重量、清晰因果、连续动画、可靠状态、真实反馈，且可完整游玩的原创卡牌冒险”。

以 Wildfrost《雪居之地》的可用性、布局、动画节奏、物件物理感、场景镜头与打击手感作为可核验参考，不复制其商业角色、游戏图案、纹理、音效、音乐和商标。所谓像素级对比只针对规范化的布局、物件中心位置、屏幕信息密度、触摸范围和动画运动轨迹；**不能直接用原作像素素材搭建我们的游戏**。

**现在不要调用 Anima，不生成新人物、新卡框、新场景。** 用户现有 GitHub 原画必须保持不变。先以干净统一、可替换的程序化临时图完成游戏行为。待所有镜头/动画/操作通过验收以后，Anima 才作为最后的贴图资源替换。

---

# 00. 绝对禁止

- 禁止把基础 Playwright 测试通过等同于优质游戏完成。
- 禁止把一次 DOM 重建、突然出图、瞬间扣血、删除单位、变更数字说成完整动画。
- 禁止新增堆满页面的调试面板、巨大的按钮、像网页 dashboard 的卡片 UI。
- 禁止只是画一张想象中的《雪居之地》概念图而不实现真实交互。
- 禁止花精力写 Anima 背景、卡框、人物提示词，直到 P0 至 P8 完成。
- 禁止复制原作画作、原音效、原音乐或背景截图。
- 禁止编造实测原作的精确像素和毫秒：没有视频 PTS/原始图测量就标明 NOT_MEASURED。
- 禁止每次加几个 CSS override 便宣称迭代成功。必须清理最终样式源、统一动画参数。
- 禁止破坏现有 GitHub 角色原画、菜单入口、关卡和玩家存档。
- 禁止把“稍后会做”的工作标注已完成。每个功能都有可运行 demo、截图、录屏、测试与 Commit。

---

# 01. 已核对资料与来源真实性

官方视频/图片及机制：
1. https://www.wildfrostgame.com/presskit/ —— 官方媒体与视频源
2. https://www.wildfrostgame.com/ —— 游戏整体及村庄、收集、角色描述
3. https://store.steampowered.com/app/1811990/Wildfrost/ —— 官方实机截图、视频
4. https://nintendoeverything.com/wildfrost-gameplay/ —— 约 40 分钟 Switch 实机视频，必须真正进入视频并记录时间码
5. https://www.nintendo.com/us/store/products/wildfrost-switch/ —— Switch 正式画面/触摸模式
6. https://mcvuk.com/business-news/when-we-made-wildfrost/ —— 开发者谈 3D 卡牌轻摇和简单、一致的交互
7. https://chucklefish.org/blog/wildfrost-dev-update-2023-release-with-cool-new-features/ —— 官方谈到商店点击查看误触购买的修正
8. https://www.felixbarbarino.com/projects/wildfrost —— 官方音效人员描述真实纸牌的抽卡、洗牌、落牌、铃声、冰晶拟音
9. https://wildfrostwiki.com/Getting_Started —— 领队、手牌、重抽、计时、增援
10. https://wildfrostwiki.com/Map —— 三区地图和事件
11. https://wildfrostwiki.com/The_Woolly_Snail —— 商店商品及购买
12. https://wildfrostwiki.com/Charms —— 饰品规则
13. https://wildfrostwiki.com/Bells —— 钟系统
14. https://wildfrostwiki.com/Snowdwell —— 村庄成长
15. https://wildfrostwiki.com/Attack —— 前排、同行等寻敌规则
16. https://wildfrostwiki.com/Version_History —— 不同版本的界面/内容差异
17. https://www.pcgamer.com/wildfrost-review/ —— 实机战斗截图
18. https://playcraft.space/gallery/wildfrost/shop-gold-prices/ —— 第三方整理的商店截图、仅用于研究与布局记录

研究禁止“我已经找到全部视频”和“像素级还原完了”的虚假总结。对于每张视频截帧建立出处、版本、时间码、状态、屏幕像素尺寸，**未观看到的动画不能写出原作时长**。

原作在官方与 wiki 公开资料中的核心特点包括：左右两侧的两条战线、倒计时自动行动、前排目标、重抽钟、援军、伙伴召唤/回收、商店交易及路线事件。我们可以对齐相同的交互目的和表现质量，同时保留原创人物、路线和数值。

### 严格的参考采样任务

建立至少 120 条**待采集目标记录，不是目前已完成 120 条**：
- 主菜单、村庄、领队与开局：18 条；
- 战斗布局、拖牌、出牌、重抽、回收：22 条；
- 自动攻击、远近伤害、连段和反击：20 条；
- 受击、格挡、冰冻、破甲、技能、死亡：20 条；
- 召唤、援军、首领出场与换阶段：12 条；
- 地图、招募、商店、宝箱、饰品、工坊：16 条；
- 胜利、失败审理、结算、转场：12 条。

每一条记录必须至少包含：
reference_id | source_url | source_type | published_version | timestamp_or_frame | screenshot_w_h | visible_game_viewport | screen_phase | pre_state | post_state | unit_bbox_norm | hand_bbox_norm | camera_position | event_type | first_motion_frame | hit_frame | final_motion_frame | audio_event_if_observable | confidence | audit_status。

只观察到静态图时，运动相关字段全部 NOT_MEASURED。不同设备与不同游戏版本分别标记。研究用参考截图不可直接作为我们网页的游戏素材。

逐像素/布局对比采用归一化坐标：
xN = (x - viewportLeft) / viewportWidth
yN = (y - viewportTop) / viewportHeight
wN = objectWidth / viewportWidth
hN = objectHeight / viewportHeight

对比牌中心、左右占比、每排三列、牌大小、桌面手牌高度、徽章锚点、提示线、角色可见面积、HUD 间距、过场运动方向。**非同一美术资产不能以 RGB 逐像素相同作为目标**。

---

# 02. 当前源码真实问题：必须先解决

已直接重新查看仓库：
- site/card-battle/engine/snowbound-journey.js
- site/card-battle/ui/snowbound-journey-ui.js
- site/card-battle/ui/snowbound-journey.css
- site/card-battle/ui/snowbound-battle-v3.css
- site/card-battle/snowbound-journey.html
- .github/workflows/snowbound-journey-qa.yml

现有基础：主菜单、领队、三地区、路线、战斗、商店、部分奖励、双战线阵位、基本拖牌、原画与部分 Playwright 测试。**这些并不等于完整商业演出**。

明确代码问题：
1. UI 的 apply(action) 在每个成功操作后立刻 render()，大片 DOM 被重建，不能保证上一时刻的卡牌实体、粒子、移动轨迹与过场继续存在。
2. startBattle() 一次性生成敌我阵容并立刻 deal(5)，没有战斗准备、敌人逐张登场、领队出场、发牌阶段。
3. takeTurn() 在一个函数内计算整轮倒计时和自动攻击、更新 HP 并移除单位；渲染层只收到文本日志，无法逐角色按真正攻击时间轴呈现。
4. play() 在确认时直接扣牌/扣血/判定死亡，没有蓄势、命中、受击、震屏、护盾、状态与死亡分阶段演出。
5. resolveBattle(false) 立即进入整局结算，最后致死一击后没有战场沉寂、失败转场、战败说明。
6. resolveBattle(true) 立刻进入 victory/战后页面，没有敌方清场和金币/奖励转移镜头。
7. buy(index) 单击就扣钱，无法先查看商品而不购买。这是已被原作开发者指出并修正过的 UX 类问题。
8. 援军主要 push 进入 b.foes，缺少入场队列、预告、位置锁定、卡牌落位演出。
9. move(uid,slot) 只交换 slot；重抽只更新数组；动作时缺少卡牌稳定身份和连续轨迹。
10. 现有 sound() 基本是短电子提示音，不是纸牌/木头/铃/冰/攻击分层的材质反馈。
11. 当前 CSS 已分为多层后置覆盖，没有单一完整、可测的 motion/layout token。
12. 浏览器测试主要证明交互能走通和几何不溢出，不能证明攻击/死亡/音画同步具有商业级质量。

这份 Prompt 要求**针对这些真实源码点动手改造**，而不是新建一个完全脱离现有项目的静态 demo。

---

# 03. 总体架构：规则 / 事件 / 时间轴 / 持久视图 / 存档

实现四层：
A. InputController：把鼠标、触摸、键盘转成高层命令（PLAY_CARD, MOVE_UNIT, REDRAW, SHOP_INSPECT, SHOP_CONFIRM 等）。
B. PureRules：确定性计算战斗结果，以事件流形式发布；
C. PresentationDirector：消费语义事件，以 timeline/FX/audio 系统播放一整套连续镜头；
D. SaveManager：在逻辑安全点记录权威状态和待完成事件事务，刷新能恢复且绝不重复发奖励。

推荐事件格式（示例）：

~~~ts
type GameEvent = {
  id: string;
  transactionId: string;
  phase: string;
  sequence: number;
  type: string;
  actorId?: string;
  targetIds?: string[];
  fromSlot?: number;
  toSlot?: number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  durationHintMs?: number;
};
~~~

动作必须将“已计算规则结果”和“什么时候在屏幕展示”分开。伤害不能在动画蓄势帧就显示扣血；死亡不能在致命命中前从 DOM 被删除。演出结束后一定与规则引擎的权威状态一致。

统一状态机：
MENU_IDLE → CAMP_IDLE → LEADER_SELECT → ROUTE_MAP → SCENE_TRANSITION → BATTLE_PREPARE → ENEMY_ENTER → ALLY_ENTER → DEALING → PLAYER_READY → TARGETING → CARD_RESOLVING → TURN_RESOLVING → DEATH_PENDING → BATTLE_VICTORY / RUN_DEFEAT → REWARD / RESULTS → ROUTE_MAP / CAMP。

商店独立：
SHOP_BROWSING → SHOP_INSPECT → SHOP_CONFIRM → SHOP_PURCHASING → SHOP_BROWSING / SHOP_LEAVING。
其中 SHOP_INSPECT 绝不改变金币，SHOP_PURCHASING 由唯一交易 ID 确保只扣一次。

### 动画导演 API

~~~ts
director.enqueue(gameEvent);
director.play(sequenceId);
director.pause();
director.resume();
director.setSpeed(0.5 | 1 | 1.5 | 2);
director.skipToSafeCheckpoint();
director.cancelTransaction(transactionId);
director.isBusy();
director.timelineTimeMs();
~~~

动画每一帧使用 requestAnimationFrame 的统一时钟；逻辑 tick/表现时钟分开，后台标签恢复后不能瞬间把所有动画跳过并错误结算。用稳定的卡牌 ID + keyed DOM 或常驻对象层；位置交换使用 FLIP，而不是整页重绘。

演出锁不允许无限阻塞：操作可以预先反馈，合理输入排队；购买、重复出牌、死亡中操作等危险命令禁止并明确提示。动画被跳过时仍要在安全点设置全部数值、物件位置和下一阶段状态。

---

# 04. 画面尺寸/布局先固定，再加动画

强制测试分辨率：1920×1080、1366×768、844×390、390×844、1024×768、360×740、430×932、1280×720、2560×1440，分别考虑 DPR1/2/3、浏览器 UI 与安全区。

基础战场：**左我方、右敌方，上下两条战线，每侧每条战线三个可放卡位，总 12 格**。所有卡拥有稳定 slot ID，竖屏可以折叠显示为每条战线我方三张与敌方三张，但不可改变攻击规则。

横屏初值：顶栏约 4%–6% 高，主战场约 70%–74%，手牌台面约 22%–26%；这只是我们工程初值而非原作像素取样。手机横屏根据实际高度压缩顶栏，让 12 张卡、HP/ATK/CD 和五张手牌同时完整可操作。

现有源码浏览器审计曾测到的单位卡：1920×1080 约 218×258 CSS px；844×390 约 94×104；390×844 约 110×126。**新动画必须兼容这些几何约束，不能为了特效放大后把其他卡遮住**。每张卡的静态布局、拖动位置和攻击动画目标必须从 SlotAnchor 获得。

统一 UI 层级：
BACKGROUND（雪林） < GROUND（地面） < SLOT_MARK（空格） < UNIT_CARD（单位牌） < CARD_EFFECT_BEHIND < CARD_EFFECT_FRONT < DAMAGE_TEXT < HUD < INSPECT/SHOP_DIALOG < DRAG_PREVIEW < SYSTEM_MODAL。

所有视角、手牌、卡牌的 BoundingBox 在 resize/orientation change 后重新测量。尤其不要把落点逻辑与上次设备宽度绑定。角色原画必须保存原始比例，卡框窄且不压脸，属性形状/颜色具备独立识别。

---

# 05. 统一毫秒级交互原则

**以下均为我们提出的初始工程目标，不是冒充 Wildfrost 实测原动画时间。** 根据实机录像和手感再逐步调整。

- pointerdown → 按压高亮或抬升：目标 50ms 内，p95 不超过 80ms；
- 拖牌跟随：目标 1 帧、峰值不超过 2 帧的视觉延迟；
- pointerup → 合法放置确认视觉反馈：80ms 内；
- 非法落点返回原位：120–200ms；
- 抓起卡牌：60–90ms，scale 1.04–1.07，抬高 8–14px；
- hover：90–160ms，微倾斜 0.5–1.5°，邻卡不应被全部遮住；
- 释放部署：180–320ms，小幅压缩/回弹，清楚的纸牌落地音；
- 同伴换位：180–280ms，两个卡牌同时 FLIP，互不突然穿透；
- 详情放大：150–230ms；关闭：100–180ms；
- 受击命中停顿：约 50–100ms 设计范围，具体根据攻击种类和录屏调整；
- 可选正常/快速/降低动态效果，每种速度**同一 seed 最终逻辑状态必须完全一致**。

操作手感必须“立即反馈 + 动作短、清晰、具有重量”，而不是全部操作都用 400ms ease-in-out 慢慢滑动。动画起步迅速、命中短促、收尾轻巧。所有关键声音对齐动画事件，不能仅在事件开始时发出电子嘟声。

---

# 06. 完整开场：菜单 → 营地 → 选领队 → 地图 → 战斗

菜单（建议 600–1000ms，可跳过）：
- 首帧有完整稳定背景，不出现空白页面；
- 0–180ms 环境光、雪景细节建立；80–300ms 标题短距离落位；
- 150–520ms 主功能按钮依次以 40–65ms 错峰出现；
- 玩家无需等待全演出结束才能操作菜单；
- 每个按钮都具备按下 50–90ms 小幅压缩与确认音；不抢视觉中心。

村庄场景：
- 场景切换保留旧视图直至新视图准备好；
- 建筑自身高亮成为点击对象，不再用四个大网页按钮代替可游览村庄；
- 进入建筑时镜头朝该建筑移动少量，门口/房屋界面连贯出场；
- 回村有独立的返回镜头，不能一切直接跳屏。

领队选择：
- 三张领队卡依次 80–110ms 错峰进入，选中抬升 10–16px；
- 详情面板在稳定位置显示 HP/ATK/CD、专长、当前卡组；
- 确认后领队卡向地图入口方向收回，提示“准备远征”；
- 无法双击触发两次新游戏，返回保持合理选择状态。

地图行进：
- 路线节点和虚线/实线与真实可达性一致；
- 选择分支后先锁定选择，旅行者标记沿曲线 350–650ms 前进；
- 到达节点才打开事件场景，不能地图按钮点击即瞬间刷新成另一个 HTML 页面；
- 三区过渡拥有原创视觉统一的短转场，数据持续保留。

战斗开场（建议总 800–1400ms，可快进）：
- 0–120ms 新背景和地面装载；
- 100–350ms 敌方第一张牌从右侧/远处雪雾滑入，末端轻回弹；
- 250–540ms 第二张敌牌错峰入场（间隔约 100ms）；
- 370–630ms 领队卡从左侧进入我方合法阵位；
- 480–730ms 已召募伙伴依次出现；
- 650–1050ms 五张手牌依次从牌堆飞出，35–70ms 级联；
- 900–1220ms CD/援军钟/重抽钟出现并完成短提示；
- 约 1200ms 进入 PLAYER_READY，允许拖牌操作。

所有动作可以提前跳过，跳过只快速完成视觉，不得重复发牌、增援、重置 HP 或触发自动攻击。恢复存档不得重新播放“新开局”并多抽卡。

---

# 07. 战斗出牌、回收、重抽：不是简单数组变化

**手牌拖动**：
抓牌时抬升、微旋转、源位置保留虚影。移动时按实际 pointer 坐标流畅跟随。合法单位被细线或局部高亮提示；非法目标灰化。落点不合法时卡牌沿原路径 120–200ms 回弹，状态不变，给出短促提示，不出现满屏 Toast。

**出牌**：
确认后手牌从手牌带移向技能/目标点，目标线跟随；根据技能类型播放不同施放动作。发起动画→命中帧→显示更新 HP/护盾/CD/状态→回收进弃牌堆；不允许在点击帧瞬间把牌从画面移走。

**我方卡换位**：
预览原位和目标位，松手后两张已部署卡同时 FLIP 或有明确避让轨迹；结束后更新目标预览和攻击方向。拖动与长按查看详情不能冲突；不支持落点永不消耗回合。

**伙伴回收**：
收起牌体、轻翻转、飞回队伍牌堆/弃牌口；不播放死亡效果。回收后目标顺序立即依引擎规则重算，动画中不允许其他攻击错误命中已回收的旧位置。

**重抽钟**：
已充满免费 / 未充满会消耗回合，表现不同。点钟后现有手牌 150–260ms 分批收回，钟摇动和纸牌洗牌声，再以 30–65ms 错峰重新发出；最后一张手牌未落位前不能点中不存在的物件。缺牌/牌堆耗尽要有可解释的结果。两种重抽的回合成本和动画不能混淆。

**援军钟**：
提前显示将到来的一波，倒计时临近时高亮、短震动并给出即将入场的视觉线索；不应“数值跳到了 0，敌人瞬间从空中生成”。敌方格全满要进入可解释的排队/变体规则，绝不覆盖别的单位。

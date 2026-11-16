# 《雪境行旅》— 专业级全流程视觉重制 MASTER PROMPT v1.0

编写日期：2026-11-16  
任务类型：UI/UX 设计总监 + 2D 游戏美术总监 + 交互工程师 + WebGL/DOM 渲染工程师 + Playwright 测试工程师联合执行任务。  
参考游戏：Wildfrost《雪居之地》；目标为**研究并精确对齐其信息层次、操作逻辑、画面密度和制作品质**，但必须使用本项目自有的角色立绘、原创场景、原创卡框、原创图标及原创文字，不导入第三方商业游戏的精灵表、音乐、贴图、标志、角色设计或界面素材。  
目标项目：GitHub 仓库 g2066203208-beep/paperchalk-world。  
工作页面：site/card-battle/snowbound-journey.html。  
此文是给实现代理使用的**执行提示词/验收合同**，不是声称当前所有要求已实现。

---

## 00. EXECUTION CONTRACT — 角色与交付形式

你是拥有 AAA 游戏 UI/UX 统筹、独立游戏美术实现、2D 渲染工程化、移动端手势设计和自动化视觉测试经验的制作团队。你的使命是**彻底消除当前《雪境行旅》页面的试验性/占位感**：目前场景依赖 CSS 几何三角形、战斗站位结构有误、卡牌微小、角色立绘在卡里缩得难辨识、商店像列表而非可游玩的实际商店、村庄只是一排假屋子、分支地图缺少旅行演出与画面层级。不可采用增添一个半透明面板来遮掩问题的方式交差。

最终成果必须是一套真实可操作、风格统一、角色精美、按场景拥有独立美术内容、同时适合电脑与手机的完整冒险。任何“高质量、精美、完美、电影感”形容词都不构成要求的落实；要求必须落实为图像资源、几何尺寸、布局规则、交互与录屏截图。

必须按下列顺序工作：
A. 对照文末真实资料和现有源码建立页面核对表。
B. 以真实 1920×1080 / 1366×768 / 844×390 / 390×844 / 1024×768 截图记录当前版本，逐张标注问题。
C. 首先修正战场布局、单位卡与手牌的比例问题，建立统一设计令牌。
D. 接入完整手绘场景分层，不允许以 CSS 梯形/三角形假装最终美术。
E. 逐个完成主菜单、村庄、角色选择、路线、战斗、战利品、招募、商店、宝箱、饰品、营地、工坊、首领和结算。
F. 完成操作动画、真实反馈、移动端适配。
G. 跑全部自动化检查，给出各屏幕截图与未完成项清单。
H. 只有在截图可见、按钮可操作、实际规则可走通时才说“完成”。

绝对禁止：
- 用 Wildfrost 实机整张截图作为我们的背景或完成品；
- 直接复制或重画其受保护的角色、logo、商店老板、独特卡框、标识和图片资源；
- 随机生成其他人的“女角色”替代 GitHub 用户已经认可的 Anima 人物；
- 把真实游戏做成只有几个牌的 UI 展示、巨型空白占位框或临时调试编辑器；
- 改成《杀戮尖塔》的独立回合手牌界面，忽略本玩法原有的倒计时、伙伴布阵；
- 裁切人物头发、脚部，压扁人物比例，使用 object-fit: fill；
- 为了让按钮显示而把卡牌缩小到根本看不清的尺寸；
- 只给文字建议不提交代码/截图/测试；
- 断开原菜单入口、破坏已确认的两张 Anima 人物卡或现有独立猎人-吸血鬼关卡。

## 01. 真实资料与可信来源（先研究，不许臆造画面）

核心官方：
1. https://www.wildfrostgame.com/presskit/ — 官方公开视频及截图/媒体包，截图和视频研究应从这里开始。
2. https://www.wildfrostgame.com/ — 游戏玩法与美术身份官方介绍。
3. https://store.steampowered.com/app/1811990/Wildfrost/ — Steam 官方媒体页，确认战斗和界面。
4. https://chucklefish.org/blog/wildfrost-dev-update-2023-release-with-cool-new-features/ — 开发者谈商店购买误触与交互改进。
5. https://mcvuk.com/business-news/when-we-made-wildfrost/ — 两名主创谈 UI 一致性、原型迭代、角色卡手感和 3D 摇晃。
6. https://youtu.be/XDDLqBUcbfY — 官方移动端预告，观察手机操作和裁切。
7. https://youtu.be/7gD8nbyN3ps — 官方玩法说明视频入口。

机制研究：
8. https://wildfrostwiki.com/Getting_Started — 两排与列、统计徽章、倒计时、自动攻击、出牌。
9. https://wildfrostwiki.com/Map — 三区路线与不同事件。
10. https://wildfrostwiki.com/Snowdwell — 村庄成长和建筑设施。
11. https://wildfrostwiki.com/The_Woolly_Snail — 商店商品类别和购买功能。
12. https://wildfrostwiki.com/Charms — 饰品附着于角色与卡牌。
13. https://wildfrostwiki.com/Bells — 重抽钟/强化钟与资源决策。
14. https://wildfrostwiki.com/Enemies — 敌人增援、首领胜利判定。
15. https://wildfrostwiki.com/Attack — 前排目标规则。
16. https://dood.gg/en/wildfrost/guides/beginners/ — 从玩家角度观察交互、重抽和事件。
17. https://www.pcgamer.com/wildfrost-review/ — 公开报道中的实战截图和手牌布局。
18. https://www.pcgamer.com/wildfrosts-cute-art-disguises-a-deckbuilder-thats-cold-as-ice/ — 单位卡位与手牌叠层。
19. https://www.4gamer.net/games/656/G065642/20230412009/screenshot.html — 丰富的实战场景参考。

画面类型参考：
20. https://playcraft.space/gallery/wildfrost/battle-dragon-pepper-arc/ — 指向敌人的拖牌弧线交互。
21. https://playcraft.space/gallery/wildfrost/shop-gold-prices/ — 店铺布局与金币标记。
22. https://www.artstation.com/artwork/1NE9YL — 第三方艺术研究，特别是颜色分组和形状的视觉语法；此页不是官方设定集。
23. https://www.techradar.com/features/wildfrost-is-bringing-back-the-classic-roguelike-struggles-and-im-here-for-it — 地图真实截图。
24. https://www.superjumpmagazine.com/wildfrosts-sound-designer-sheds-light-on-its-frosty-soundscape/ — 宣传图群像参考。
25. https://nintendoeverything.com/wildfrost-gameplay/ — 公开 40 分钟实机视频入口。
26. https://www.youtube.com/watch?v=bYA3LOt8HQE — 此教学视频 ID 来自项目既有研究记录；访问可用性需核对，若失效请改用官方实机视频，不可假装已逐帧看过。

资料要建立至少 45 张参考采样记录：主菜单 4、村庄 5、领队/伙伴 5、地图 6、战斗 12、商店 5、饰品/宝箱/事件 4、结算 4。每张记录：原始链接、时间戳/图片出处、实际像素尺寸、画面层次、主视觉重心、颜色大类、区域百分比、导航按钮位置、允许参考的信息。严禁捏造原作具体像素尺寸；如果截图本身是 512×512 裁切，只做归一化布局观察，不假装它代表原作原生 1920×1080。

## 02. 游戏定位与原创美术身份

作品名：《雪境行旅》；不是 Wildfrost 的同人皮肤，而是我们的角色卡战术冒险。
世界观：黑森林、猎人、雪山、魔女、血族、怪物与旅行者共同组成的冬夜世界。避免把所有角色画成相同可爱雪人；人物由 Anima 原画提供，环境采用专为项目制作的温暖童话 2D 绘画，有版画/纸工艺触感但不借用他人原创造型。

美术关键词：cosy winter storybook / original whimsical dark fantasy / handcrafted layered gouache / sturdy wooden trims / cream parchment / frosted teal stone / gentle warm cabin lamps / bold readable silhouettes / character-focused interface / crisp printed card typography / tactical clarity.

主色建议（设计目标值，**并非原作精确取样**）：
- 雪空浅青 #B8E6E2；冷青 #75C9CE；松针暗蓝 #345969；夜青 #203748。
- 羊皮纸 #F2E7CE；纸张阴影 #CDBE9E；浅木 #AE815F；深木 #65444B。
- 生命红 #D45B72；攻击蓝 #66A7CC；计时金 #E5B66A；可点击浅黄 #FFF0B1。
- 确认青绿 #8ADCC9；危险红 #E4868C；背景烟雾 #9BC8CF。
- 正文深墨 #342E3A；高反差描边 #463846；白字点缀 #FFF6E8。
- 每个场景只定义 1 主温度 + 1 次级调色，不允许任何物件随意叠彩虹炫光。

每种材质要有稳定结构：
- 木：边缘略不规则、局部暖高光、几道低频木纹、1 道接缝；禁止 CSS 默认厚渐变伪塑料。
- 羊皮纸：不均匀纸纤维、轻微弯折、边缘脏色、柔和内阴影；不允许纯黄大矩形。
- 冰：青蓝体积、浅色锐边、低透明次表面；不允许无材质的透明蓝矩形。
- 金属：冷灰或暖铜有区别，仅少量装饰；不能把所有边缘都镀金。
- 雪：柔软分层、积雪遮挡台阶与木边、轮廓简洁，不能等距复制的圆角白块。
- 角色卡：纸卡底、印刷边框、真实头像插画、功能性属性徽章，静态仍能看出纸片厚度。

建议字体为中文可读性优秀的现有系统字体，标题可使用醒目的原创手写感字形；绝不把 Anima 生成的乱码当真实中文 UI。所有标题、金币、HP、倒计时、描述必须由代码渲染文字。

## 03. 战斗板：这是必须优先重建的结构（P0）

**重大现有错误**：当前我们的 double-board 结构是“敌人在上半区 2×3 / 我方在下半区 2×3”。真实 Wildfrost 战斗逻辑是“我方在左、敌方在右；双方各有上下两行，每行最多 3 个卡位”。两方左右对峙，**不是上下阵营对峙**。

我们的目标布局应为同一可视战场下的两排横向布阵：
上排：我方后位 / 我方中位 / 我方前位  |  敌方前位 / 敌方中位 / 敌方后位
下排：我方后位 / 我方中位 / 我方前位  |  敌方前位 / 敌方中位 / 敌方后位
因此屏幕上是**两排 × 六列**（左右各 3 列），总共 12 个阵位。双方拥有独立角色状态数组，行动顺序从战场中心向两侧外扩，并区分上下排。

不要再把空位画成 12 个巨大的白色矩形。“空位”是雪地上轻微的符号、被踏平的椭圆阴影、极细地面纹饰，只在悬停/拖动时出现明亮的可放置边框。

### 桌面视觉黄金区：1920×1080 参考设计基线
下面是本项目的**设计建议尺寸，不是声称原作准确原生像素**；实现时需要实测并优化。
- 头部信息带：约 0%–6.0% 高度，不能占用主舞台。
- 战斗舞台：约 6%–76% 高度，完整雪地/冰洞场景与全部在场角色。
- 木制手牌台面：约 76%–100%，牌下缘压在木桌边缘上，并允许可选卡向上抬起进入战场空间。
- 我方位于横向 8%–46%，敌方位于 54%–92%；中心有 8%左右视觉换气带，但无巨型 VS 面板。
- 每一侧占三列，每列具有统一固定中心轴；列间间隔随屏幕宽度柔和变化，绝不每张卡随机偏移。
- 上、下两排距不小于卡高的 1.07 倍，但整体编排必须紧凑，不能散落到空白背景中。
- 单位卡目标尺寸桌面约 156–178px 宽、200–232px 高；根据同时在场卡数和窗口尺寸动态调整，绝不超出战场。
- 手牌一般约 130–155px 宽，约 180–220px 高，视觉上允许重叠 10%–25%，每张能够点中且末端不出屏。
- 我方前排卡在中线左侧，敌方前排卡在中线右侧，位于中心的两列更紧凑；细节徽章可辨识。

### 典型卡牌结构
角色卡自上到下：
1. 上段头像/立绘区域 55%–65%；必须使用仓库原画及经过确认的透明抠图，保留头发、武器与服装辨识点；
2. 中段约 14%–19% 为名称带；
3. 下段约 20%–28% 为技能/简短描述，技能长句仅在点按详情时展开；
4. 血量徽章始终紧贴左上或靠近牌框的左边缘；攻击力贴右上；倒计时贴正下缘——三种形状要稳定，所有卡一致；
5. 盾、冰冻、破甲、毒等副状态使用牌边的小型角标或一行叠层图标，**绝不能盖住脸**；
6. 被选中牌提升约 8–18 px、有柔和背光及 0.5–2.0 度物理摇晃（视动效偏好）。按下后轻微回弹，不允许大幅透视扭曲。

### 必须实现的交互
- 点按/长按查看卡牌全详情。鼠标悬停出现关键词解释；触屏长按避免误触。
- 用手牌攻击时出现从原始牌指向敌方目标的柔和曲线引导；合法目标发亮，非法目标暗化并给出原因。
- 移动已部署角色是针对**单张角色卡**进行的操作，不可把整个战局变成九宫格移动菜单。
- 基本目标选择按同一行最近敌人；行内空无目标时依据既定战斗规则转向另一行。
- 倒计时归零单位自动动作，顺序可预测；每一步有简短且确定的音效/飘字/动画。
- 重抽钟位于手牌旁一侧，充满时绿色/浅金反馈，未充满时标注剩余刻度。
- 援军钟位于另一侧，敌人进入时播放 250–500ms 卡牌滑入；玩家能预先知道增援状态。
- 不要把“结束回合”按钮做成比卡牌更抢眼的商业广告式大按钮；若保留原型兼容操作则使用次级入口。接近原作机制时以“一次有效出牌推进回合”作为主体验，空过、免费重抽、角色回收必须单独定义。
- 高伤害时先显示 70–120ms 的受击压缩/闪色，后浮出数字，数值变化与动画顺序一致，任何场景都不得跳过真实引擎状态。

### 机制真实性检查
官方玩法中的先后并非按屏幕 DOM 顺序随便执行：敌方计时优先，单位行动排序依前线到后线且上下排交错；目标选择与阵位有关；不是所有敌人必须清空才算胜利，而是击败对应主目标。我们的项目可基于自己的世界观数值重设计，但若要还原该战术感，必须一并修正规则引擎，不能只换皮。把规则差异单独列为兼容/改造表，避免破坏现有已通过测试的场景。

## 04. 手机端必须原生重排，而不是缩放桌面

屏幕测试目标（每种必须截图/录像）：
A. 1920×1080（电脑 16:9）；
B. 1366×768（笔记本 16:9）；
C. 844×390（手机横屏）；
D. 390×844（手机竖屏）；
E. 1024×768（平板）；
F. 360×740（小型安卓机）；
G. 430×932（大屏手机）；
H. iOS 安全区、底部 Home Indicator 等不应与按钮重叠。

手机横屏：
- 保持左右双方各三列，地面战场占 58%–67% 可用高度，牌桌控制区占其余。
- 单位卡可缩至宽约 65–95px，但任意时刻至少能看到脸、血量、攻击、计时。文字如无法读全，强制提供长按详情卡。
- 最外侧卡牌不可裁切，战斗中央卡不能被手牌/提示挡住。
- 底部手牌目标宽约 70–88px，5 张完整出现（必要时叠放），不可要求横向拖动才能找到最后一张；极端牌数可滑动并给出明确滑动提示。
- 每个关键按钮可触摸面积不小于 44×44 CSS 像素。
- 不允许运行时出现整页横向滚动、黑边、无法点到的地图节点。

手机竖屏：
- 不能把完整 1920 横向战场缩成蚂蚁。推荐使用 “上下两排的战术场地 + 局部跟焦/双侧信息卡” 方案或经过验证的分区缩放方案。可按交互需要把左右阵营变为明确分隔的两个区块，但**必须保持相同行与前后排的战术对应关系**，不能把逻辑硬重排成敌方在上我方在下导致攻击目标错误。
- 维持战场的二维战术语义；让攻击线、单位倒计时和手牌可读性优先于多余背景。
- 手牌区使用轻叠牌而不是 5×1 纸牌巨栏，不遮挡弹出详情和返回按钮。
- 详情弹层位置必须避开安全区，可上下滚动长文本，关闭按钮始终可见。
- 当视野不够容纳所有角色时，考虑缩减装饰/文本、改变相机边距、临时分区展开，而不是取消关键状态徽章。
- 竖屏路线改为有实际线连接的竖向分叉小地图，不能只是 4 行普通表单按钮。

### CSS/Canvas 工程原则
- 采用逻辑设计坐标 + 布局变量 + 安全区，而不是用 transform:scale(.5) 全局压缩网页。
- 重要 UI 所属的容器布局必须受统一状态约束；窗口 resize、orientationchange、软键盘、手机浏览器工具条变化后重新测量。
- 绝不使用 object-fit:fill，不要以 mix-blend-mode:multiply 强行抹去白底人物导致整张立绘发黑。白底必须透明化并抗锯齿（有 alpha 的原图则保持 alpha）。
- 所有背景与卡牌纹理应支持 DPR 2–3；结构性文字和徽章用矢量/DOM 叠加，避免小字贴图糊掉。

## 05. 菜单：不是一个中间的四按钮 HTML 页面

原创构图：巨大的木制探险告示牌/寒冬营地门户居中偏上，最下面的大型“开始冒险”符合视觉焦点。环境是蓝青雪天、圆润云层与微小雪粒，左右两侧各有一片舞台式雪树与雪丘，可见前景/中景/远景深度。
- 标题《雪境行旅》由代码独立渲染，必须有清晰原创字形和木纹挂板托底。
- 主按钮：继续旅途、开始新远征、营地、设置、图鉴/制作信息；按钮高度和宽度一致，排列统一且不互相挤压。
- 选中/悬停以雪粉 100ms + 木片 4px 回弹反馈；菜单进入时 200–350ms 柔和落入，按钮依序 45ms 延迟出现。
- 菜单不要直接展示整张战斗立绘抢占焦点；人物只是局部点缀，不影响导航。
- 手机上菜单主体在中间安全区，按钮不小于 44px 高，视觉中心不被屏幕刘海切割。

## 06. 村庄：一张真正能游览的 2D 场景

参照官方 Snowdwell 的**分层立体插画逻辑**，但原创建筑造型。不能用三个等距房屋复制后直接当整个村庄。
- 一个拥有深度的大雪村：前景石阶栏杆/积雪/树枝；中景有 4–6 栋明确区分用途的木制建筑和中央炉火；远景是被冰雪覆盖的山岩、薄雾和高处栈桥。
- 至少 3 层不同视差：远景 x0.05、中景 x0.25、前景 x0.55（仅做小幅 1–6px 跟随移动，绝不全场景乱摇晃）。
- 中央广场至少留出 23% 横向空间用于主角色与出发。
- 玩家能清楚点到：团员名册、药剂工坊、远征档案、旅者图鉴、出发。
- 点击建筑应在世界场景里自然放大高亮，不要在建筑下方摆 4 个大塑料按钮冒充“村庄操作”。
- 每个建筑配独立可替换立绘：屋顶形状、烟囱、灯色、门廊、挂旗、炉火等不同；雪的覆盖结构与光源方向一致。
- 分层图像尽量由 Anima 单次生成完整概念场景后再拆为 2D 资源；所有背景静态，动画由程序控制雾、粒子和小摇摆即可。

## 07. 三地区地图：像一张有地形的旅途地图

现有项目是 3 地区×4 阶段，保留此基础框架但使路径真正直观；不能用等距横排 4 个按钮替代地图。
- 地图必须是暖灰奶黄羊皮纸，局部有手绘山线、松树符号、河谷/遗迹/钟塔等**原创**小插画。
- 节点采用不超过 3 层色彩的木雕/墨绘图形；节点中心为各事件类别的原创图标，不是 Emoji 大字。
- 起点和首领终点是各一枚合流节点。中间每阶段 2 条路径，以真实线条关联，禁止重叠两个同位置按钮。
- 已走过的路线为深色实线，未来可选择路线高亮，未选择虚线变灰；不得让所有节点同时启用。
- 每次选择节点后有旅途标记沿虚线 350–650ms 迁移、对应事件场景柔和过渡。
- 地图节点状态颜色和动画必须与可达性一致，不能显示可点实际不可点。
- 区域之间视觉变化：雪松林地→寒晶洞穴→长夜山脊，不只是背景换个 RGB。每地区背景独立绘制并拥有自己的视差、光源与小型特色物件。
- 地图必须可以随地图进度自然缩放或滚动，不能为了铺满屏幕把所有节点平均放得太大。
- 标题只用很小的地图铭牌，不占据地图本身的视觉空间。

## 08. 角色选择：最大化 Anima 原画辨识度

领队选择 3 张精美人物卡，初次可选：赏金枪手、霜语魔女、封印守卫。保留既定角色卡的数据和功能。
- 非背景立绘必须引用 GitHub 现有源：
  site/assets/characters/monster-hunters/04-bounty-markswoman.png
  site/assets/characters/witch-workshop/frost-witch.png
  site/assets/characters/monster-hunters/05-seal-warden.png
  site/assets/characters/crimson-vampires/vampire-princess.png
  同伴可用 02-blood-physician.png、03-trap-engineer.png、07-axe-scout.png 等。
- 只渲染原图，没有素材时显示明确资产缺失状态，禁止假造图片。
- 选中卡轻微上升，背后出现不遮脸的温暖光晕，旁边放英雄技能说明和 HP/ATK/CD。
- 人物原比例保持 1:1 scale，裁剪可控且可预览全身源图，不得把站姿像透明鬼影一样放在虚空中。
- 图片与卡框必须明确不同层级：插画位于卡纸上层，卡框边缘压住四角 2–5px，名字带与数据徽章压在最上层。

## 09. 道具与卡牌框：建立可复用的整套卡面系统

统一最少 3 种卡片材料：
A. 领队/同伴卡 — 温暖纸牌、深色结实木边，人物插画可跨出卡顶 2–6%。
B. 敌方卡 — 同宽同高，但底色稍冷/边缘微暗，不能过度科幻发光。
C. 道具卡 — 凸起物件插画占 55–65% 高度，描述区最多 2 行短句，点按展开全文。

普通框边的装饰**只需要极少量**：一圈不完全等宽的印刷边、小型铆钉/角饰、顶部木楔，不允许层叠七道金边和复杂纹样。卡牌边框与角色原画分开，实现一次、在所有组织卡上可复用。

卡牌属性徽章：
- HP：左上心形或同等辨识的原创软边徽章，红色；
- ATK：右上武器/箭羽形，冷蓝；
- Counter：底边中央星/齿轮形，暖黄；
- 护盾：左下，蓝灰；
- 冰冻：左侧叠层，一眼知道让计时暂停；
- 不符合当前状态时徽章不出现，绝不能显示“0”占位；
- 单位选中状态清晰且不会和受击/危险状态混淆。

卡图资产尺寸建议：
- 单张完整卡纸材质：1024×1536，透明背景，完整边缘不触边。
- 单独人物：维持 GitHub 当前画作的原始宽高比例，不强制重新生成或破坏原文件。
- 道具/冰冻物件插画：1024×1024，透明或原始画作背景可去除。
- 卡框九宫格拉伸材质：1024×1536，必须明确 4 条角边固定区域（可用程序做 9-slice）。
- 图标必须以 SVG/高分辨率透明图片实现，无文字标注，不用 Emoji 替代正式游戏图标。
- 前景 UI 小图标按 64×64/128×128 两档导出，对应 DPR 缩放。

## 10. 商店：是拥有柜台、店主、商品陈列与购买动作的场景

参照真实商店信息架构：商品处于木制货架与柜台上，场景暖光明显区别于冰天雪地；价格吊牌贴商品，不是每张卡下面生成一个普通系统 button。
- 原创店铺：深红木柜台，暖橙吊灯、柜子与折叠货架；外面通过窗口看到青蓝雪夜；左中区展示商品，右侧出现我们自创的店主 Anima 角色或先用纯原创2D NPC 绘画，绝不能照搬原作店主。
- 4 件随机商品、金币信息、已售罄状态、商品详情、退出按钮，必须真实工作。
- 店员站右侧 15–25% 宽，货架占中间 55–70%，金币放左上/左下的直观位置。
- 选择商品首先打开购买详情/确认界面，**不可把单击“查看”直接当扣款**。手机尤其必须二次确认或长按购买，避免误触。
- 购买后商品牌轻微抬起→飞入牌组（350ms），金币数字变化有同步计数动画，售出牌框虚化并保留售罄小标牌。
- 金币不足：店主轻微摇头/纸泡提示，不能生成全屏浏览器 alert。
- 商店与招募奖励不能看起来是同一个淡青背景加三张卡，要有完整的场景身份差异。

## 11. 其他事件要具备独立场景演出

招募：3 个大型人物卡站在被冰雪覆盖的小舞台或洞穴里，一眼知道每个人不同；选择后融化雪/碎冰效果、人物加入队伍；不可跳过的事件不能出现误导性离开按钮。

宝箱：场景中央真实木箱与暖光，打开时箱盖短动画，三件原创建议物件卡依次升起；只允许领取有效的卡，奖励状态持久化。

饰品：使用精美的饰品挂板或摊桌，选中饰品后贴合到某一张指定角色卡，展示前后数值对比；如果引擎目前只支持领队全局强化，需要清晰显示“当前规则：领队强化”，不要假装支持对所有卡任意附着。

营地：雪夜篝火，火光照在周围石块/原木上；“恢复生命”或“获取补给”的选择有明显成本/结果反馈。

工坊：暖光工具台，木锤、金属物件、卡牌升级/移除操作；升级前后两张牌对照，不应默默在引擎里替换牌。

首领战：依旧遵循双排板，只在背景、首领规模、少量角色舞台装饰和战前特写上提升表现，不能为了戏剧效果让首领卡挡住其他卡。boss 进入的特写在 500–900ms 内结束，随后还给可玩区域。

胜负结算：深色舞台 + 一张结算羊皮纸 + 独立战斗数据 + 回村/再来一次按钮；文字应准确来自状态，而不是卡死的数字。失败可看统计、下一次回村可继续解锁。

## 12. 完整动画/物理交互设计表

建议动画值（实现目标而非原作逐帧取样）：
- 单位卡 hover：抬升 6–10px，约 120–170ms；
- 单位卡选中：抬升 10–18px，边光渐入 110ms；
- 放置：手牌位置到阵位使用 240–360ms ease-out，落地轻微压扁 0.98→1.02→1；
- 卡牌轻摇：只在手指/鼠标移动时，最大 ±2.0°，不能像 3D 旋转镜头；
- 攻击：0–120ms 预备，130–260ms 位移/指向，260–350ms 命中；
- 受击：60–100ms 牌体压缩+不透明颜色闪烁 1 次；伤害文字 400–650ms；
- 倒计时：对所有将行动的卡依次高亮，数字翻页/脉冲 110–160ms；
- 回合批量结算：单个角色与下一个角色之间留 90–180ms，速度可调“普通/快速”；
- 重抽：牌一叠收回牌库→钟摇动→5–6 张依次发出，总计 400–750ms；
- 战后奖励：先淡出被击败怪物，再金币粒子，最后奖励卡弹出；
- 地图步行：沿路径点跳转 350–650ms，不抖动整个地图；
- 场景切换：场景左右推拉/纸片分层轻微深度错位 350–500ms，不用全屏默认 CSS fade 冒充过场；
- 粒子预算：同屏不超过约 60–100 个低成本小粒子，移动端 30–50；降低动态效果时保留关键状态与结果文本。

所有动画必须由游戏事件驱动，有取消机制和复位逻辑。快速重开或返回时不应残留上一次的粒子、定时器、伤害数字。

## 13. 实际需要生成与分层的美术资产列表

命名规则：site/card-battle/assets/snowbound-v2/ 下按 bg/fg/ui/cards/icons/npc/effects 分类，路径全部相对；维护 asset-manifest.json (每个素材路径、尺寸、用途、透明度与版本)。
每个资源描述**仅描述原创对象**，不得以原作截图作为重绘目标。

场景资源目标：
01 title-base 1920×1080：蓝青冬日场景原画，不包含游戏文字与按钮；
02 menu-side-left/right 各 1024×1536：前景雪树与雪丘，可轻视差；
03 village-master 1920×1080：真实多层山村完整构图；
04 village-foreground 1920×1080 alpha：围栏/积雪/石阶，和主场景对齐；
05 forest-battle-master 1920×1080：与战斗卡密度配合，中央视野清晰；
06 cave-battle-master 1920×1080：冰洞尖晶/幽暗背景；
07 summit-battle-master 1920×1080：紫色风雪山脊；
08 route-parchment 1536×1024：中性无图标空白路线底图；
09 shop-interior 1920×1080：完整原创店铺，预留商品货架/店主站位；
10 merchant-npc 1024×1536：单独原创店主透明人物图；
11 recruitment-chamber 1920×1080：新同伴解冻场景；
12 treasure-chest 1024×1024 alpha：单独可切开的箱身/箱盖；
13 campfire 1536×1024：暖色雪地营火；
14 forge 1920×1080：升级卡牌的工匠室；
15 charm-display 1536×1024：饰品陈列板；
16 result-parchment 1024×1536 alpha：结算纸；
17 card-frame-friend/foe/item 1024×1536 alpha：三种边框纹理；
18 inventory-scrolls 1024×512 alpha：两个不同状态的木制卷轴；
19 icon-atlas 2048×2048 alpha：只放无文字图标，注明每个格子的名字；
20 optional hit/snow/frost overlays：小型透明局部 VFX 层。

从全场景图中裁剪分层请使用可视化审查，不要直接把完整场景原图堆到页面里然后盖 5 层遮罩。坐标、对齐、遮挡都应由原始 master 构图确立。

---

## 14. Anima 画面 Prompt：完整游戏战斗画面概念（英文，供单次概念生成）

这段是用于让 Anima 理解视觉目标的**静态 Key Visual**。实际交互 UI 仍由程序实现，不得以一张生成的截图代替游戏。不能把参考游戏画面、原作 logo/卡面重绘进本项目。

POSITIVE:
"A highly polished original 2D tactical roguelike deckbuilding game screenshot key visual, 16:9 widescreen 1920x1080 composition, handcrafted whimsical winter fantasy picture-book world, crisp expressive anime-adjacent painterly character portraits already provided by the project, original dark-fairytale hunter guild versus nocturnal frost creatures, cozy frosty turquoise snowy forest landscape with multiple layers of curved pine silhouettes, soft volumetric winter fog, handmade snow-covered rocky floor, warm reflected golden highlights, richly drawn wood-grain tabletop at the bottom quarter. Extremely clear readable game composition, two horizontal combat rows across the central battlefield: the left half reserved for three friendly character cards per row, the right half reserved for three enemy character cards per row, forming a symmetric left-versus-right 2-row battlefield with up to 12 visible card slots. All cards are clean hand-painted portrait cards with delicate 2D ink contours, tangible paper texture, subtle thick wooden edges and small fixed stat badge locations, faces never obscured. A visible but uncluttered hand of five compact tactical cards arranged on the wooden tabletop at the bottom, small redraw bell on left, reinforcement counter on right, no huge pop-up menus in the center. Character illustrations remain the visual focus; the battlefield scene is spacious but not empty. Elegant consistent colors: snowy mint, teal, desaturated ocean blue, warm parchment, mahogany brown, tiny crimson health and blue attack markings, golden countdown badges. Strong hierarchy, well-spaced layout, real production game UX, sharp silhouettes, professional art direction, sophisticated original card-frame design, subtle soft grounded shadows, genuinely handcrafted stylization, coherent unified visual assets, precise perspective-free 2D stage, straight-on front camera, no isometric perspective, no extreme 3D perspective, no photorealism, no screenshot of any existing game, no other franchise characters. Render every card within the safe region of the composition with no clipped edges, all game components proportional for readability."

NEGATIVE:
"bad layout, ui placeholder, web dashboard, spreadsheet interface, random floating transparent panels, sci-fi holographic UI, giant empty center, tiny illegible portraits, stretched human proportions, heavy 3d perspective, misaligned card columns, duplicated characters, missing portraits, cramped controls, random drop shadows, too many gold borders, overdesigned card frames, excessive blur, oversaturated gradients, neon glow, low resolution, poorly rendered faces, cut-off hair, cut-off shoes, cut-off cards, garbage text, fake readable text, jpeg artifacts, text watermark, logos of existing commercial games, copied game assets"

CONSTRAINT: the image-generation model cannot be trusted for accurate Chinese/UI text. Keep headline/menu text space uncluttered; implement text in HTML/SVG separately.

## 15. Anima 场景素材 Prompt：雪村背景（英文，无人物/无UI）

POSITIVE:
"Full-width original 2D winter fantasy village environment background for an illustrated indie strategy card game, 16:9 1920x1080 master painting, front-facing theatrical stage composition, a believable cozy mountain settlement built on stepped snowy rock terraces, five distinct timber buildings with their own silhouettes: medicine apothecary with hanging dried herbs, guild roster hall with a distinct gable and small heraldic banner, inventor workshop with a little chimney and tools, archives building with lanterns, humble travelers inn with a warm doorway, a small communal glowing hearth in a central snow plaza, physically coherent paths and steps connecting all doors, railings half buried in powder snow, blue-green deep winter air, distant layered snowy mountains and fir trees, subtle rising chimney smoke, warm glowing windows, softly scattered moonlight, natural occlusion and strong shape clarity, friendly whimsical picture book illustration, slightly rough ink outlines, textured gouache-like color blocks, matte painterly surfaces, thick cozy stylized wooden timbers, carefully hand-painted snow edges, believable near-mid-far layering, many charming small lived-in environmental details but calm playable negative space in the center, absolutely clean environment artwork, no characters, no user interface, no text, no signs with lettering, no floating isolated huts, no grid, no 3d perspective camera, no voxel art, no buildings cropped through edges that must be clicked, crisp high-quality full-screen game environment."

NEGATIVE:
"UI, card, dashboard, text, logo, photorealistic 3D render, plastic low poly houses, tiled identical houses, abstract triangle mountains, uniform windows, tilted isometric shot, huge empty sky, heavy perspective, unrelated fantasy castle, cut-off buildings, blurred background, bland gradient, floating buildings, overlapping paths, low quality"

EXPORT:
- Master 1920×1080
- Keep all doors/symbolic entry anchors within safe region x 8%–92%, y 20%–81%.
- Separate geometry only after master is approved: sky, mountains, back architecture, middle architecture, plaza floor, foreground rail, lantern overlay, fog overlay.

## 16. Anima 场景素材 Prompt：森林战斗背景（英文，无人物/无UI）

POSITIVE:
"An original studio-quality hand-painted 2D snowy forest battlefield environment background for a cozy yet dangerous dark-fairytale turn-based card game, directly facing camera at neutral straight-on 2D stage angle, 16:9 1920x1080, horizontal open snowy battlefield across the middle with two subtly separated horizontal tactical lanes suggested naturally by compressed snow, thin frost marks and shallow ground shadows, the ground is integrated into a rich layered winter landscape not a rectangular game board. Background layers: distant soft cyan mountains and cold sky, middle-depth curving tree trunks and snow-laden irregular evergreens, near-depth rocks and small frost-buried shrubs, hand-drawn snowflake flecks, atmospheric mist, gentle turquoise ambient light, tiny warm moonlight rim highlights. All scenery frames the battlefield rather than covering it. Real beautiful illustrated set dressing: textured bark, etched ice, painted patches of moss, footprints, frozen plants and scattered pebbles. Color-controlled watercolor-gouache picture book appearance, strong silhouettes and sophisticated simplified forms, careful contact shadows, premium handcrafted environmental illustration. The central 10–90 percent width and 14–72 percent height must remain calm and legible for two aligned horizontal rows of original portrait cards; the background should never include any cards, icons, enemies, UI, text, grid squares, cloned objects or forced wide-angle perspective. A dark walnut timber table edge in the bottom quarter is optional only if that layer will be exported separately. Seamless logic between battlefield floor and environment, absolutely no giant empty flat color void."

NEGATIVE:
"UI cards, text, logos, screenshot reproduction, low poly, giant triangle pine silhouettes, repetitive hex grid tiles, bright neon, photorealistic, angled isometric 3D stage, excessive blur, detailed objects under text, overly dark all-black area, excessive snow particles, clutter, giant cave crystals everywhere, placeholder grid, perspective distortion"

EXPORT:
- Master bg 1920×1080 + separately removable ground overlay.
- Never paint character shadows in the background: contact shadow belongs to each card placement layer.

## 17. Anima 场景素材 Prompt：商店室内（英文，无人物/文字/UI）

POSITIVE:
"Original cozy winter trading cabin interior for a 2D indie card roguelike, 16:9 front-on 1920x1080 master background painting, beautifully crafted warm wooden merchant stall with full-width timber counter across the lower third, distinct deep reddish oak planks, warm amber hanging lanterns and candlelight, soft hand-painted wood grain, brass hooks, carved shelf brackets, frosty windows overlooking teal winter night, stacks of rolled parchment, tiny cloth bundles and glass bottles, carefully designed playable merchandise display shelves occupying the left and central 68 percent of the composition, the rightmost 25 percent reserved for a separate shopkeeper portrait, believable cozy enclosed space with correct interior shadows and warm bounce lighting, subtle dust motes, premium picture-book gouache artwork, bold clean contours, correct furniture size for a card-based shop screen, rich atmospheric details but enough clean display space for real dynamic purchasable card UI, two-tier shelf structure, very strong readable spatial hierarchy, elegant original handcrafted appearance, no painted-on item cards, no character, no UI, no price text, no menus, no gibberish labels, no logos, no photorealism."

NEGATIVE:
"naked empty room, spreadsheet shop UI, generic yellow gradient, identical shelves everywhere, overlapping floating product tiles, isometric view, 3D render, copied game merchant, low poly, clutter in buying zones, illegible signage, text, UI, inventory cards painted into the background"

EXPORT:
- 1920×1080 master + foreground counter alpha layer + lantern alpha overlay + wall/background layer.
- Merchandising anchor slots must be photographed/logged in the design coordinate sheet.

## 18. Anima 场景素材 Prompt：纸面旅行地图（英文，无字无节点）

POSITIVE:
"Original old-world illustrated winter expedition map painted on warm thick parchment, straight-on completely flat two-dimensional image with no 3D perspective, 1536x1024 wide composition, beautifully textured pale oatmeal paper, faint worn edges, gentle parchment fibers, hand-inked winding snowy mountain trails, small original topographic doodles of fir forests, cave entrances, cliff ridges, ice crystals and mountain shrines, three distinct geographic moods from snowwood forest on the left to frosted crystal caverns in the center and windy purple-tinged night mountains on the right, subtly different illustration density for each zone, ample carefully reserved space for real interactive branching route icons and dotted paths to be overlaid by game code, refined minimal ink artistry, natural irregular paper and ink strokes, accurate clean flat composition, warm readable neutral contrast, no pre-drawn text labels, no nodes that look clickable, no route selection buttons, no logos, no screenshots, no copy of any existing published fantasy map. Focus on custom game environment and visual readability, delicately hand-drawn, nonuniform silhouettes, handcrafted illustrated tabletop look."

NEGATIVE:
"3D isometric map, automatic colorful mobile game UI, HTML buttons, glossy card slots, text, labels, brand symbols, huge landmark crowds, too saturated, severe folds hiding click targets, copied routes from existing game, pure solid-beige rectangle"

EXPORT:
- 1536×1024 original clean parchment base
- Route path overlay, selectable nodes and progress marks are 100% code drawn and must match the actual engine state.

## 19. 卡框单独生成要求与 Anima 简洁 Prompt

"Single independent original portrait trading-card frame asset, complete front view, straight unrotated 2D orthographic composition, vertical 2:3 aspect ratio, transparent background, no character and no illustration inside, open transparent portrait window covering upper 62 percent of the card, a small blank printed title ribbon under the portrait window, understated textured warm parchment paper lower information region, dark cherry-brown carved timber trim only 6–11 percent of total card width, visible physical paper thickness, tiny modest brass nails on only two corners, subtle ink and pencil imperfections, premium crafted fantasy card game component, completely symmetrical frame structure but irregular hand-painted surface texture, highly legible, restrained decoration, correct absolute straight edges, no perspective, no colored glow, no huge heraldic ornament, no gems, no readable text, no typography, no fake stats, no brand logo, leave enough clean space for programmatically overlaid HP ATK and counter badges. Entire border inside image bounds with generous transparent outside padding and no clipped corners."

NEGATIVE:
"overly ornate gold filigree, medieval religious iconography, empty background scene, character face, multiple cards, folded paper mockup, rounded app widget, perspective, blurry grain, printed words, colorful neon gradients, card frame extending beyond canvas"

UI/9-slice工程：先给每一张卡确认边框图片真实透明，无残留白底，然后根据角固定区切分；缩放只拉伸边的中段，不能把四角装饰拉扁。部署卡和奖励卡使用统一基座，不允许一处是白边一处是暗金边。

## 20. 品质验收：必须交付可核对的数据

视觉验收至少完成：
1. 真实浏览器的 5–8 个分辨率截图，每种分辨率分别拍菜单、村庄、战斗、地图、商店、奖励/招募、结算，文件名包含设备/尺寸/场景。
2. 对每个页面输出锚点坐标/尺寸：角色卡前排中心、左右双方板中心、顶部条高度、底部手牌高度、重抽钟、援军钟、金币、确认/返回。
3. 自动验证：无横向文档滚动、实际图像 100% 可加载、无未处理脚本错误、手牌点击与触摸正常、购买需要确认、路线上任何节点没有重叠点击。
4. 任何卡牌均不得超出安全视野；设备竖屏的关键触点不得被其他卡遮挡。
5. 玩家能从新冒险走到三地区路线、招募、买卖、饰品、首领和结算；不能只给静态截屏模拟。
6. 同一组项目卡的边框材质、HP/ATK/CD 徽章、行间距与字体大小在所有场景保持一致。
7. 战斗倒计时和伤害与规则引擎的状态一致；不能因为动画造成“数字在单位消失后才出现”的不同步。
8. 帧率在普通手机上尽力维持 60fps，并提供 reduced-motion/低画质选项；不能对所有图层使用持续超大 blur/filter。
9. 网站如果未完成发布，状态只能写“代码已合并、测试状态待确认”，不能假称用户已经看到新版本。
10. 把每一张最终场景截图和对应参考截图做并排可视审稿，注明这是布局与可读性审稿，不是逐像素复制受保护内容。

### 具体拒绝标准
只要出现以下任何一项，就不能标记美术完成：
- 左右双排站位依旧被写成上下方阵；
- 卡面文字超出边界或比正常游戏 UI 小到阅读困难；
- 前景/UI 遮挡头像；
- 购买不需确认；
- 地图两个按钮重叠；
- 一种场景仍主要由大面积 CSS 三角形/纯色渐变组成；
- 商店背景与人物毫无交互，货架与商品无锚定关系；
- 手机端 5 张牌只看到 3 张却没有明确滑动操作；
- 原始 Anima 人物因错误 blend mode 整体发黑或裁掉；
- 出牌时没有目标语义与视觉反馈；
- 最终只有一张带 UI 的合成画，而没有实际可交互游戏；
- 画面中的材料、线条、字体和色温互相打架。

## 21. GitHub 实施路径与工作拆分

代码位置，必须先检查源码最新版本，不得随意覆盖同事改动：
- HTML：site/card-battle/snowbound-journey.html
- 战斗与关卡规则：site/card-battle/engine/snowbound-journey.js
- 全部视图渲染：site/card-battle/ui/snowbound-journey-ui.js
- 主题材质、响应式布局：site/card-battle/ui/snowbound-journey.css
- 技能卡图：site/card-battle/ui/duel-card-art.js
- 既有测试：tests/snowbound-journey-browser.mjs
- 整局规则模拟：tests/snowbound-full-run.test.cjs
- CI：.github/workflows/snowbound-journey-qa.yml
- 项目菜单入口：site/index.html 和 site/card-battle/forest-level-01.html
- 自有角色素材：site/assets/characters/
- 本参考研究：docs/art/WILDFROST_REFERENCE_AND_SNOWBOUND_FLOW_20261116.md

推荐分阶段提交：
PR/Commit 1. 当前截图与视觉审稿文档（只记录，不改逻辑）；
PR/Commit 2. 正确左右对峙 2×(3+3) 战斗板与战斗顺序审计；
PR/Commit 3. 人物卡、道具卡与属性徽章一套独立组件；
PR/Commit 4. 森林/冰洞/山脊三套绘画战场；
PR/Commit 5. 菜单、村庄、领队选择真实场景化；
PR/Commit 6. 地图、商店、招募、营地、工坊、奖励分层；
PR/Commit 7. 动效、触屏手势、回合与购买可用性；
PR/Commit 8. 全手机端布局 QA 与回归结果。

每阶段交付：
- 仓库具体文件、Commit SHA 和已实现条目；
- 一张桌面真实渲染截图与一张手机真实渲染截图；
- 本阶段交互测试结果；
- 视觉偏差清单（具体到元素坐标、目标大小、遮挡问题）；
- 明确声明下一阶段未完成部分。

## 22. 交付用一句话

“交付不是一张像《雪居之地》的概念截图，也不是一套泛泛相似的界面，而是一个使用我们既有 Anima 原画、原创分层冬季场景和正确双排战术逻辑的高质量可玩卡牌冒险：从村庄进入路线、参加战斗、拖出卡牌、招募、买卖、成长、首领及回村，每一屏都具有统一的手绘美术材质、自然的操作反馈、可量化的手机布局和通过真实浏览器测试的完整交互。”

---

## 23. 给单个执行代理的立即开始命令（直接复制）

请阅读本文件与其附录所列所有官网/实机参考，再逐行检查现有《雪境行旅》项目代码。第一步不要再画新人物，也不要调整玩法数值。首先截图并分析当前战斗场景，纠正“上下敌我分区”这个核心布局错误，按左右双方各上下两排三列的真实卡牌战场重排到 1920×1080 与 390×844。保留我们全部已确认的 GitHub 原图与既有存档，新增完整卡面材质系统。验证人像、卡牌、HP/ATK/计时徽章尺寸后，再生成/集成一个原创专业绘画的雪森林战斗背景，而非继续 CSS 占位。全部提交 GitHub，并用 Playwright 输出可直接检查的真实游戏截图、移动端指标和操作测试。只有第一阶段经过浏览器实际画面审美验收，才继续菜单、雪村、地图、商店、招募、结算的场景重做。完成整个流程前不得称为“完美复刻”。

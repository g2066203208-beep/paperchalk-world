# 《雪居之地》全流程美术与交互参考 → 《雪境行旅》原创实现

编写：2026-11-16  
参照游戏：**Wildfrost / 雪居之地**（Deadpan Games / Gaziter / Chucklefish）。  
本站可玩原型：\`/card-battle/snowbound-journey.html\`。  
**使用边界：研究成熟产品的信息架构、交互逻辑和场景层次；本站使用原创人物（仓库已收录 Anima 原画）、原创 CSS/SVG/UI 文案和自写玩法实现，不导入或重发原作的美术、音乐、Logo、角色和地图贴图。并非官方作品。**

## A. 推荐先看的原始资料（按完整度排序）

1. [Wildfrost 官方 Press Kit](https://www.wildfrostgame.com/presskit/) — 官方宣传视频、宣传图库、Logo 与 B-roll；审稿时优先核对，不从社区截图中猜测机制
2. [A Beginner's Guide to Wildfrost 1.2.3（runehawk）](https://www.youtube.com/watch?v=bYA3LOt8HQE) — **全流程视频时间轴**：村庄 01:20；难度 03:19；部族 05:51；领队 08:14；伙伴 12:21；战斗 13:40；地图 31:19；后续战斗 38:22；护符 50:04；商店 51:40；可逐段暂停采帧研究布局
3. [Wildfrost 4K 无解说实录](https://www.youtube.com/watch?v=f-qhPQ2LAtA) — 长时间观察鼠标与手机端切换过程
4. [Wildfrost Steam 官方商店](https://store.steampowered.com/app/1811990/Wildfrost/) — 官方截图与预告片，可以按场景归类
5. [Wildfrost Wiki：Map](https://wildfrostwiki.com/Map) — 三个地区、分路与所有事件类型
6. [Wildfrost Wiki：Getting Started](https://wildfrostwiki.com/Getting_Started) — 领队、伙伴卡/道具卡、两排站位、每回合一张牌、计时攻击、重抽钟、援军钟
7. [Wildfrost Wiki：The Woolly Snail](https://wildfrostwiki.com/The_Woolly_Snail) — 商店商品与价格设计
8. [Wildfrost Wiki：Charms](https://wildfrostwiki.com/Charms) — 饰品附着与永久效果
9. [Wildfrost Wiki：Bells](https://wildfrostwiki.com/Bells) — 重抽、太阳铃等拓展机制
10. [ArtStation: Artstyle Study - WILDFROST](https://www.artstation.com/artwork/1NE9YL) — **第三方风格分析**，讨论颜色、轮廓、形状语汇，不能称作官方概念原画

## B. 场景内容矩阵

| 参照内容 | 应观察的核心要素 | 本项目实现 | 本项目已落实的交互 |
|---|---|---|---|
| 主标题/菜单 | 高对比标志、纵向主按钮、雪花、环境动效 | \`menu\` | 进入营地/新冒险/继续/设置 |
| 村庄 Snowdwell | 分层雪顶木屋、暖光、独立建筑、返回路线 | \`town\` | 点击名册、工坊、图鉴、档案、出发 |
| 领队选择 | 各领队 HP/攻击/倒计时/专长与卡牌 | \`leader\` | 三职业领队选择 |
| 地图 | 纸色底、两条分岔路、节点图形、目的地 | \`map\` | 3个区域×4个阶段×左右分路 |
| 战斗 | 上方敌人两排、下方我方两排，各排3格 | \`battle\` | 2×3+2×3、点击目标、点击友军换位 |
| 倒计时 | 卡片底部明示下次自动行动时间 | \`battle\` | 每回合推进、自动攻防、冰冻延缓 |
| 重抽钟/援军 | 左/右侧可操作设备、波次预告 | \`battle\` | 重抽4格蓄满免费、有限敌人增援 |
| 招募 | 冰封伙伴三选一，大角色卡 | \`recruit\` | 真正进入同伴队伍，后续战斗参战 |
| 宝箱 | 从3张道具卡选择其一 | \`treasure\` | 真实增加到本局牌组 |
| 行商 | 木柜台、商品展示、金币标价、卖出状态 | \`shop\` | 付款、牌组增加、可购买多个商品 |
| 饰品 | 三选一、永久加生命/攻速/防护等 | \`charm\` | 实装领队数值增强 |
| 营地 | 从路线上进入休息点 | \`camp\` | 恢复生命或获得补给 |
| 锻造 | 工坊与装备强化 | \`forge\` | 获得新牌/升级牌/金币 |
| 首领 | 地区末端精英、明确 HP/倒计时 | \`battle\` | 三区独立首领 |
| 战斗战利品 | 胜利、生命、货币、推进按钮 | \`battle-clear\` | 获得金币、进入下一节点 |
| 整局结算 | 胜败、指标、回村/再来一次 | \`result\` | 通关数、总伤害/击杀/回合统计 |
| 牌组 | 持有牌/伙伴/饰品独立查看 | \`deck\` | 从地图/战斗查看已获得内容 |
| 设置 | 音效、动效、规则指引 | \`settings\` | 开关可持久化 |
 
## C. 美术视觉标尺（研究结论，不是源图复制）

1. **优先级：角色卡本身**。全身人物必须可辨，属性徽章不能覆盖脸；牌面的纸/木/金属厚度材质统一，敌我颜色有细微区分。
2. **留白 vs 信息密度**。战斗区 70%给上下两排布阵、地形衬底；手牌占下侧独立操作带。不要在画面中央放大片带标题的透明面板。
3. **地图**。路线不应只有按钮列表；它应像一张涂绘地图，虚线连通、两条路径、手绘地貌、节点状态同时成立。手机竖屏改为同等可选性的竖向分岔图。
4. **商店/招募**。是完整场景：近景柜台、陈列物、人物店主、局部暖光与买卖反馈。原型使用原创形状和现有素材，后续替换绘画背景即可，不要把截图当最终贴图。
5. **动画**。触屏点按卡牌应有抬起/回弹；购买后置灰或消失；牌进入牌组有明确反馈；战斗伤害和计时可逐步增加演出。
6. **颜色**。场景为蓝青/暖奶白/深木色三组主色，遵循明度对比和轮廓清晰；人物卡主体继续使用已批准的 Anima 画作。
7. **不追逐原作像素级复刻**。已知原创项目的人物比例、剧情和美术不是 Wildfrost，照搬原作卡框或商店插画会失去统一性，也有版权风险。优先复现“交互目的 + 空间秩序 + 可读性”。

## D. 代码与接入入口

- HTML：\`site/card-battle/snowbound-journey.html\`
- 核心模型：\`site/card-battle/engine/snowbound-journey.js\`
- 交互渲染：\`site/card-battle/ui/snowbound-journey-ui.js\`
- 全场景 UI 样式：\`site/card-battle/ui/snowbound-journey.css\`
- 技能卡原创 SVG：\`site/card-battle/ui/duel-card-art.js\`
- 自动化浏览器截图：\`tests/snowbound-journey-browser.mjs\`
- CI：\`.github/workflows/snowbound-journey-qa.yml\`
- 主游戏菜单及森林第一关都设置独立入口

## E. 浏览器验收及后续美术待办

目标桌面 1920×1080、1366×768；手机横屏 844×390、竖屏 390×844；平板 1024×768。需同时检查：

- 主菜单 → 营地 → 领队 → 路线 → 战斗 → 招募 → 商店 → 首领的完整点击路径
- 人物 PNG 在角色卡中真实显示
- 双排格与血量/攻速/计时徽章准确、卡牌不能与屏幕边缘穿插
- 各事件能改变金币/牌组/伙伴/生命/护符
- 手机触摸目标完整、屏幕无文档级横向滚动、无脚本或资源加载错误
- 目前的视觉素材是程序化/自有 SVG 与用户已收录的角色画作。**场景级 Anima 手绘背景、逐角色动作分层、音效与细节光影是后续可替换资源，不得标为最终完成。**

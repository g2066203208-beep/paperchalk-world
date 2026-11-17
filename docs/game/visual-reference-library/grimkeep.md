# 格林堡 / GrimKeep — 视觉参考、视频/GIF 来源与 3D×Anima 复用拆解

**归档日期** 2026-11-17　**开发者** Resolution Games　**画风与玩法** 绘制型黑暗童话 / 骰子构筑游戏，官方美术明确为 hand-drawn 2D；非 3D 地牢

> **学习核心**：学习「大立绘 + 空气中的场景背景 + 细密线稿 + 剧场式局部光」的统一画风，再由我们的 3D 白膜承载这种绘画，而不是误说原版也是 3D。
> **媒体原始链接**：共 23 条，见底表，注意媒体存在不同核验状态。引用不表示已下载或逐帧复刻。版权游戏素材只保留原始来源链接，不作为本仓库可复制的游戏纹理。

## 已确认资料事实（区别于我们推断）

1. Resolution Games 官方主页和媒体包提供可直接查看的战斗、商人、地图、坩埚及角色选择场景高清图；制作方对其 2D 手绘视觉语言有公开说明。
2. 本库登记 2 条官方/压片视频、8 张高分原图/官方平台截图、数篇官方开发日志或索引；这类素材比搜索缩略图更适合拆比例、线重与色调。
3. 官方动态消息有 Taurus 攻击和商人出场演示，但尚无确认稳定独立的 GIF 文件；故标记 video-embedded 而非 gif。
4. 原作是 2D 手绘游戏，这里的 Three.js/Anima 混合是**我们自己的技术方案**，不能宣称是原开发者的制作 pipeline。

## 真正值得研究的画面与可实现迁移

| 研究点 | 从官方/实机画面观察的要点（非原作内部源码推断） | 我们项目的落地方式 |
|---|---|---|
| **场景构图** | 文字/怪物位于前景可读位置，街巷和商店墙面用低对比背景拉开景深，画面保留负空间。 | 战斗场景应以角色与一个大特写叙事物件为核心，3D 白膜不需要过量建筑堆砌。 |
| **轮廓线条** | 人物/怪物边缘粗糙但有疏密；花边与 UI 暗边对应场景的黑墨笔触。 | Anima 风格素材要统一笔刷颗粒、墨线线重、色块层次，禁止每张不同模型风格。 |
| **配色与照明** | 煤灰、灰紫、褐绿底色和局部金橙热光或暗红故事光，与纯黑空间形成动静对照。 | 不同场景有自己主色，但共同使用统一全局色彩映射 LUT/曲线，不直接复制原图颜色。 |
| **近大远小** | 事件 NPC 和店主可以大立绘压近镜头；探索/战斗人物维持另一组世界单位比例。 | 根据触发事件切换镜头和角色 staging，不缩小/拉伸同一 Anima 图片到错误比例。 |
| **前后景边框** | 前景枝、断墙、道具、烛火、挥动画片在深度上覆盖角色局部；背景保持简洁。 | 2D alpha planes 按真实 world Z 与可视深度排序，需先做脚底接地，再加前景遮挡。 |
| **手感** | 骰子弹射、收集、悬停与伤害数字、点击音效的轻重快慢各有独立阶段。 | 向我们的系统迁移事件时间轴，而非照搬骰子规则；参考小丑牌计分递进、Slots & Daggers 金币反馈。 |
| **故事舞台** | 神秘商人和坩埚有明确暖色重点；世界地图的纹理背景衬托明亮节点。 | 每个场景可以先在 3D 里定镜头位置，再从素材库拼不同透镜舞台、主次灯与局部特写。 |

## 拆成 3D 白膜 / Anima 单元素 / 实时 shader 图层

| 分层 | 负责内容 | 具体技术 |
|---|---|---|
| 3D | 地面、台阶、墙柱、门框、舞台摆台、遮挡体、玩家站位 | same whitebox world, simplified shapes |
| Anima opaque | 墙/木/纸/布/灰石基础绘画与墨色面块 | per-surface material; no whole background |
| Anima alpha | 断墙、枝叶、破布、古灯、商人道具、告示、散落物 | story props and foreground/occluder cards |
| Anima alpha FX | 漂浮灰尘、纸片、烟雾、人物动作/死亡立绘、简短循环帧 | per-layer sprite animation |
| Engine | 暗部 color grade、受光与贴地、depth shadow、card special shader、飘动 | realtime composition |
| UI | 面板的字体层级与边缘手绘纹样；所有数据独立于背景素材 | readable HUD |

## 视频/GIF/图片的正确研究方法

1. 官方 GamePlay Preview：采集探索/战斗画面第一帧、骰子落定、伤害输出、回合结束等可见时刻，但必须通过原视频读取时间戳。
2. 官方高分图对照三种镜头：雨夜战斗/商人/仪式；量角色占画面百分比、天空黑面积与背景饱和度，而非猜生成提示词。
3. 对照角色动态和静态图判断：哪些是 2D sprite 序列，哪些是纯材质/屏幕特效；无法从截图得知真实实现的部分标为推测。

## 效果截图与录屏 QA 规则

1. 角色占画面高度、主体亮度、主 UI 对比度要有截图数值对照，不允许仅主观形容“像”。
2. 人物影子、手持物与背景叠放不得穿模；近景布幔如遮到 UI 应自动裁切到世界层。
3. 每份 Anima 资产的角色线重、材料调色、背景留白要可按单元素替换后复用。
4. 按官方图同构图截图，与我们自做版并排；明确我们的素材不是原始游戏资源。

## 已有代码/演示的正确关系

- 当前真实 Three.js 分层场景入口：`site/card-battle/anima-paintover-lab.html`；主逻辑：`site/card-battle/engine/anima-paintover-lab.js`。
- Anima 单元素提示词库：`docs/game/visual-reference-library/ANIMA_ENVIRONMENT_PROMPTS_LIBRARY.md`；游戏人物 Anima 立绘属于我们已有资产。
- 截图录像：`tests/anima-paintover-lab-browser.mjs`；真实 Chromium QA 工作流在 `.github/workflows/anima-paintover-lab-qa.yml`。
- **当前完成度**：只有参考资料及制作拆解，尚无专门 GrimKeep 风格 demo；独立源美术高清图已整理，可以作为下一批 Anima 资产的参考目标。

## 完整图片 / 视频 / GIF / 开发者文章索引（原始链接）

| 类型 | 来源 | 用途 | 核验状态 |
|---|---|---|---|
| website | [格林堡 GrimKeep 开发组官方网站](https://grimkeepgame.com/) | 手绘怪物、地图、事件、角色和物品美术 | `source-page-verified` |
| website | [Resolution Games 官方游戏页](https://www.resolutiongames.com/grimkeep) | 预告片、高清实机截图、战斗/商店/地图场景 | `source-page-verified` |
| website | [Resolution Games 官方 Media Kit](https://www.resolutiongames.com/media-kit-grimkeep) | 高清截图、官方艺术设定、Gameplay Preview | `source-page-verified` |
| website | [Steam 官方商店（中文《格林堡》）](https://store.steampowered.com/app/3509380/GrimKeep/) | 原版战斗/UI/骰子投掷视频及截图 | `source-page-verified` |
| website | [Steam Demo 试玩页](https://store.steampowered.com/app/5275700/GrimKeep_Demo/) | 2026 年 10 月试玩版实机参考入口 | `source-page-verified` |
| video | [GrimKeep 官方 Gameplay Preview（Media Kit）](https://www.youtube.com/watch?v=Y5VVE-NAwJU) | 怪物攻击与骰子结算、卡牌/金币 UI、移动镜头 | `video-page-verified` |
| video | [GrimKeep Gameplay 视频（press kit 嵌入）](https://www.youtube.com/watch?v=KcMx1Pl5qDw) | 独立 2D 绘本视觉表现、完整演出节奏 | `video-page-verified` |
| website | [Steam 工作室美术/动画短片与更新区](https://steamcommunity.com/app/3509380/allnews/) | 官方短片：Taurus蓄力、角色/商人演出、devlog | `source-page-verified` |
| article | [官方 Devlog #02：Developing the art of GrimKeep](https://steamraw.com/app/3509380/) | 2025-05-12 早期概念与视觉风格演进，SteamRaw 原公告索引 | `source-page-verified` |
| article | [官方 Devlog 5：Style and inspiration（2025-11-03）](https://steamcommunity.com/ogg/3509380/announcements/detail/619934083293642852) | 开发者讲漫画书与美术启发；Steam 帖子地址来自新闻跳转，未重放整页 | `previously-collected-not-reprobed` |
| article | [官方 Devlog #03：角色草稿与成稿](https://store.steampowered.com/news/posts/?enddate=1748878599&feed=steam_community_announcements) | 草稿到最终角色肖像的开发者示例 | `source-page-verified` |
| article | [官方 Devlog #7：死神美术迭代与叙事场景](https://changelog.gg/games/grimkeep-3509380/updates/2026-07-23-7-july-devlog-what-happens-when-you-die-018797a4a61e6195) | 不同设计稿到最终海上死神场景的取舍 | `source-page-verified` |
| article | [美术总监访谈：手绘 2D 黑暗童话](https://www.gamespress.com/en-US/No-Happily-Ever-After-Resolution-Games-Announces-GrimKeep-a-Dark-Fanta) | 开发者确认：手绘场景不仅服务骰子玩法 | `source-page-verified` |
| image | [雨夜战斗两名怪物——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-fight2-clean-large.Bm482oc8_1WlI7f.webp) | 人物轮廓与幽暗古街的景深分离、雨线、墨黑边缘 | `image-search-verified` |
| image | [神秘商人贩售物品——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-thepeddler-clean-large.Dr1nVLPQ_1yeTqg.webp) | 人物占左侧近半屏、黑笔 UI、对话中的材质与道具 | `image-search-verified` |
| image | [神秘仪式 UI——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-themystic-clean-large.DxZVmgYV_149MEk.webp) | 角色挤近前景；灰褐卡列，背景简洁有秩序 | `image-search-verified` |
| image | [黑暗城市节点大地图——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-map-clean-large.BODTEApH_Z1nPmn8.webp) | 底层街道灰图与白/金节点线的明暗分离 | `image-search-verified` |
| image | [炽热坩埚与火焰——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-crucible-clean-large.BVtwbROY_Zy12Bz.webp) | 主体暖橙光源、黑污线、破边渐隐与热金属液体 | `image-search-verified` |
| image | [猎人/野兽等角色选择画面——官方高清图](https://www.resolutiongames.com/_astro/grimkeep-screenshot-characterselection-large.B8C712iY_ZlLvq6.webp) | 人物大立绘黑影、卡面透光、字体与材质层 | `image-search-verified` |
| image | [格林堡原始 Steam 菜单/巨月截图](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3509380/a0cdedd75835a8bf6765e037da63d189867b83c2/ss_a0cdedd75835a8bf6765e037da63d189867b83c2.1920x1080.jpg?t=1772467233) | 巨大剪影和低饱和月光的负空间 | `image-search-verified` |
| image | [地狱马战斗画面（PlayStation 图）](https://image.api.playstation.com/vulcan/ap/rnd/202511/1913/3f615fbcfd9ccb91cfe9b61635742c3f95985c446eb4c4c1.jpg) | 放大怪物线稿、中距离街道背景、黑色前景枝条 | `image-search-verified` |
| video-embedded | [官方 Steam 新闻：Taurus 蓄力动态角色演示](https://steamcommunity.com/app/3509380/allnews/) | 2025-10-20 动态角色小视频；尚未确认可独立下载的 GIF | `embedded-only` |
| video-embedded | [官方 Steam 新闻：商人艺术与互动](https://steamcommunity.com/app/3509380/allnews/) | 2025-10-08 商人短片，角色出场与 UI 切换，非独立 GIF | `embedded-only` |

## 逐帧处理状态

| 媒体类别 | 是否存了源 URL | 原始帧/播放速度 | 接入我们游戏画面 | 状态 |
|---|---|---|---|---|
| 官方实机与预告视频 | 是 | 未全部逐帧采集 | 待逐场景使用 | source links only |
| 官方/第三方高清截图 | 是 | 静态 | 作为构图和材质对照 | 外链，不复制 |
| 独立 GIF | **未确认可下载的可靠 GIF URL** | 未测 | 不能伪称有 GIF 成品 | 搜索仍可继续 |
| 开发日志中的动态视频 | 已保存文章/消息入口 | 需提取时间码 | 可用于角色/特效动作拆解 | embedded-only |

返回 [7 游戏完整资料索引](README.md) 或 [网页媒体图库](../../../site/card-battle/reference-library.html)。

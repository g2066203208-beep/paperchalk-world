# Dungeonborne — 视觉参考、视频/GIF 来源与 3D×Anima 复用拆解

**归档日期** 2026-11-17　**开发者** Mithril Interactive　**画风与玩法** 中古黑暗奇幻第一人称 3D 地牢与探险

> **学习核心**：学习「真实空间的分寸」，但不复制第一人称 HUD 或全套写实 PBR 资产。
> **媒体原始链接**：共 17 条，见底表，注意媒体存在不同核验状态。引用不表示已下载或逐帧复刻。版权游戏素材只保留原始来源链接，不作为本仓库可复制的游戏纹理。

## 已确认资料事实（区别于我们推断）

1. 官方开发者/发行新闻与 Steam 索引说明其黑暗奇幻地牢探索和哥特城堡表现；此项目有真实透视、灯光、立面与前后遮挡。
2. 现有参考包含 3 支官方实机/预告片、6 个场景图片和 2 个发行消息来源；许多玩家截图属于第三方实机捕捉，不等于开发者原始设定。
3. 尚未拿到可独立下载与核验时长的 Dungeonborne 官方 GIF。视频与实机时间轴才是可靠动态依据，不伪造 GIF 链接。

## 真正值得研究的画面与可实现迁移

| 研究点 | 从官方/实机画面观察的要点（非原作内部源码推断） | 我们项目的落地方式 |
|---|---|---|
| **建筑轮廓** | 真实墙体、尖拱、柱头、扶壁、栏杆有厚度与投影；低调大面积暗部不是随便把材质压黑。 | 现有白膜柱子与门洞建立真实 3D proxy，后续 Anima 只画雕花、腐蚀、金属贴面。 |
| **材质结构** | 潮湿石材反光表现是斑驳的局部粗糙度，不是全地面统一镜面反射；转角接触阴影决定物体重量感。 | Stone base、wet/dirt masks、roughness map、接触 AO 和 shadow map 独立，禁止画死一张反光背景。 |
| **冷暖光比** | 主通道用冷蓝/灰/青暗影，火把有窄范围高亮暖区，边缘微弱反射。 | One physical point light per torch, emissive core and toned-limited halo; 几何、人物都受相同照明响应。 |
| **深度气氛** | 雾和细尘强化空间纵深；近景壁柱遮挡中远景，不能全屏同样浓度。 | 按 world-space depth 混合雾、远景 blue/grey bounce，禁止将雾片放在 UI 上。 |
| **效果反馈** | 法术亮光、命中粒子、近距离震颤需与受击对象/墙体深度关联。 | VFX 贴地或附着角色骨架；记录 impact 帧、停顿、音效峰、恢复。 |
| **空间可读性** | 大型建筑开口要清楚指向下一战斗区、真实楼梯高差和安全落脚面。 | 相机优先服务我们的战棋镜头，不需要照搬原作第一人称 FOV。 |

## 拆成 3D 白膜 / Anima 单元素 / 实时 shader 图层

| 分层 | 负责内容 | 具体技术 |
|---|---|---|
| 3D | 大地/台阶/墙体体积、城堡柱、扶壁、窗门洞、碰撞、深度遮挡 | whitebox meshes |
| Anima UV | 风化石墙、潮石砖、粗木/黑铁/旧铜表面纹样 | tileable albedo textures |
| Anima alpha | 墙角水渍、苔藓、裂痕、火把烟熏、粉尘、垂蔓 | independent decals + sprite planes |
| Engine | 法线、粗糙度、金属度、ShadowMap、SSAO、点光与体积雾 | PBR/lighting shader |
| Engine + cutout | 已有猎人医生 Anima 原图/其他角色，真实身高、脚底 anchor、前后景遮挡 | worldspace actor |
| UI | 体积层外显示交互；不要让 3D 景深影响伤害数字和手牌 | screen-space HUD |

## 视频/GIF/图片的正确研究方法

1. 截取同一镜头中的火把点亮、走廊推进、敌人出现、法术命中、地面回光；记录 timecode 和是否玩家摄像机在移动。
2. 标注 1m / 3m / 8m 大小关系、墙-地-角色接触、暗部是否仍见纹理。
3. 在我们 3D demo 的白膜与同机位多 Pass 中重复空间布局，不能用全屏透明图冒充真正 3D。

## 效果截图与录屏 QA 规则

1. 白膜→基础石材→污渍→水渍粗糙度→灯火→冷色雾→角色接地，每一步保存同尺寸 PNG。
2. 移动相机左右 ±12°，角色是否被柱子/栏杆按深度遮挡、湿反射与阴影是否留在正确表面。
3. 桌面、手机横竖屏实际 WebGL 视频与截图；只有媒体源逐帧测量后才写具体光源强度/镜头速度。

## 已有代码/演示的正确关系

- 当前真实 Three.js 分层场景入口：`site/card-battle/anima-paintover-lab.html`；主逻辑：`site/card-battle/engine/anima-paintover-lab.js`。
- Anima 单元素提示词库：`docs/game/visual-reference-library/ANIMA_ENVIRONMENT_PROMPTS_LIBRARY.md`；游戏人物 Anima 立绘属于我们已有资产。
- 截图录像：`tests/anima-paintover-lab-browser.mjs`；真实 Chromium QA 工作流在 `.github/workflows/anima-paintover-lab-qa.yml`。
- **当前完成度**：来源已整理。Anima 新石材图与参考尚未做严格对照，材质目前是程序占位与用户新提交样本，未到参考级还原。

## 完整图片 / 视频 / GIF / 开发者文章索引（原始链接）

| 类型 | 来源 | 用途 | 核验状态 |
|---|---|---|---|
| website | [Dungeonborne 官方 Steam 商店与影片、截图](https://store.steampowered.com/app/2448970/Dungeonborne/) | 官方原版实机截图与视频入口 | `source-page-verified` |
| website | [Steam 官方媒体与玩家截图区](https://steamcommunity.com/app/2448970) | 角色装备、真实场景摄影与视频 | `source-page-verified` |
| website | [SteamDB 高清官方截图索引](https://steamdb.info/app/2448970/screenshots/) | 官方发布素材的历史视图和媒体版本 | `source-page-verified` |
| article | [2024 开发者发行公告：哥特城堡环境](https://www.mynewsdesk.com/uk/swipe-right/pressreleases/infiltrate-gothic-castles-in-dungeonborne-an-upcoming-extraction-dungeon-crawler-by-mithril-interactive-3299922) | 哥特尖塔、地牢、环境叙事，开发者新闻通稿 | `source-page-verified` |
| article | [2024 EA 上线官方通稿](https://www.mynewsdesk.com/uk/swipe-right/pressreleases/plunder-and-risk-it-all-in-medieval-extraction-rpg-dungeonborne-out-now-on-pc-in-early-access-3335056) | 2024 版本基准与公开平台 | `source-page-verified` |
| video | [官方 Gameplay Trailer（IGN 发布）](https://www.youtube.com/watch?v=ICtnthxM4Cs) | 城堡地牢探索、敌人近战、法术打击的时序 | `video-page-verified` |
| video | [官方 Announcement Trailer（IGN 发布）](https://www.youtube.com/watch?v=SSFPd7nWws0) | 镜头构图、哥特室内外场景和魔法光 | `video-page-verified` |
| video | [正式 EA Gameplay Trailer（GameSpot）](https://www.gamespot.com/videos/dungeonborne-official-steam-early-access-announcement-gameplay-trailer/2300-6464585/) | EA 期实机镜头、动作与城堡走廊 | `video-page-verified` |
| website | [官方 YouTube 频道](https://www.youtube.com/@Dungeonborne) | 更多 gameplay 和人物职业短片入口，尚未逐帧索引 | `source-page-verified` |
| image | [石拱火把红毯走廊——官方 Steam 图](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2448970/ss_e0d91dd197ddf469ea87645d61e1e168ee4a65a9.jpg?t=1740709894) | 红棕火光对高浮雕石柱、深黑走廊、金属骑士反射的影响 | `image-search-verified` |
| image | [潮湿地下囚笼与蓝色法术——官方 Steam 图](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2448970/ss_68115c0bf50ccbb54b395110cdadc51c17d61c52.1920x1080.jpg?t=1720019542) | 小范围金蓝反差和湿石反射 | `image-search-verified` |
| image | [营地篝火与人物道具 UI——官方 Steam 图](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2448970/ss_c17e10459d32963b5ca3c63d2f5c7904ca937969.jpg?t=1740709894) | 近地火焰、装备堆放、人物接地、前中后景 | `image-search-verified` |
| image | [蓝色夜空与哥特城堡塔顶](https://i.playground.ru/i/screenshot/233781/dungeonborne.jpg) | 夜空/尖塔暗部大形/蓝魔法光/暖灯点光 | `image-search-verified` |
| image | [雾夜庭院火把与枯树](https://gaming-cdn.com/images/products/15899/screenshot/dungeonborne-pc-spel-steam-wallpaper-4.jpg?v=1721373080) | 空间层次、室外散射雾、前景黑树与暖火 | `image-search-verified` |
| image | [王座厅巨像与烛光](https://storage.googleapis.com/wtfast-images-prod/dungeonborne-f7a01145-2776-48b0-a46e-d6b3532a7a2f.jpg) | 复杂中景建筑、局部烛火、体积深度遮挡 | `image-search-verified` |
| image | [熔焰飞散与红毯石拱战斗](https://cdn.cloudflare.steamstatic.com/steam/apps/2448970/ss_14d50be3b4049cfaac7cc62101750f80adddbf0d.jpg) | 远处爆焰光影响近处石柱、红地毯与阴影 | `image-search-verified` |
| article | [玩法与场景实测采访（Fami通 2024）](https://www.famitsu.com/article/202408/12177) | BOSS 大厅灯光、装备技能和真实战斗反馈 | `source-page-verified` |

## 逐帧处理状态

| 媒体类别 | 是否存了源 URL | 原始帧/播放速度 | 接入我们游戏画面 | 状态 |
|---|---|---|---|---|
| 官方实机与预告视频 | 是 | 未全部逐帧采集 | 待逐场景使用 | source links only |
| 官方/第三方高清截图 | 是 | 静态 | 作为构图和材质对照 | 外链，不复制 |
| 独立 GIF | **未确认可下载的可靠 GIF URL** | 未测 | 不能伪称有 GIF 成品 | 搜索仍可继续 |
| 开发日志中的动态视频 | 已保存文章/消息入口 | 需提取时间码 | 可用于角色/特效动作拆解 | embedded-only |

返回 [7 游戏完整资料索引](README.md) 或 [网页媒体图库](../../../site/card-battle/reference-library.html)。

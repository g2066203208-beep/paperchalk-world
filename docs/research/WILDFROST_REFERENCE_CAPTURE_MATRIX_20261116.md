# Wildfrost 官方/实机参考资料和逐帧采集矩阵（2026-11-16）

**真实性声明：这里只保存了可公开访问的资料入口和未来要采集的镜头清单。这里没有重新分发原作受版权保护的截图/视频，更没有声称下面 164 条都已采集或逐帧测量。** 每条当前状态为 NOT_CAPTURED；将来执行时必须填写实际来源、时间戳/截图尺寸、计算机可复核的测量结果和采集版本。

本表配合：docs/game/SNOWBOUND_COMPLETE_GAMEPLAY_MOTION_MASTER_PROMPT_V2_20261116.md。

## 一、原始来源（不要把 wiki 文字称作亲眼看过动画）

| ID | 来源 | 原始 URL | 用途及边界 |
|---|---|---|---|
| S01 | Wildfrost official presskit | https://www.wildfrostgame.com/presskit/ | Official press kit; media/video starting point |
| S02 | Wildfrost official site | https://www.wildfrostgame.com/ | Official game description and environment |
| S03 | Steam store media | https://store.steampowered.com/app/1811990/Wildfrost/ | Official screenshots and trailers |
| S04 | Nintendo official store | https://www.nintendo.com/us/store/products/wildfrost-switch/ | Official Switch screenshots and touch support |
| S05 | Nintendo Everything gameplay (~40 min) | https://nintendoeverything.com/wildfrost-gameplay/ | Public gameplay video index; timestamps NOT captured |
| S06 | Wildfrost development retrospective | https://mcvuk.com/business-news/when-we-made-wildfrost/ | Author discussion about card wobble/interaction simplicity |
| S07 | Chucklefish development update | https://chucklefish.org/blog/wildfrost-dev-update-2023-release-with-cool-new-features/ | Shop accidental purchasing fixed |
| S08 | Wildfrost sound designer | https://www.felixbarbarino.com/projects/wildfrost | Card foley, bell, ice effects and audio sync philosophy |
| S09 | Wildfrost Wiki Getting Started | https://wildfrostwiki.com/Getting_Started | Mechanics only |
| S10 | Wildfrost Wiki Map | https://wildfrostwiki.com/Map | Route/event types |
| S11 | Wildfrost Wiki Woolly Snail | https://wildfrostwiki.com/The_Woolly_Snail | Merchant product categories, not a video |
| S12 | Wildfrost Wiki Charms | https://wildfrostwiki.com/Charms | Charms mechanics |
| S13 | Wildfrost Wiki Bells | https://wildfrostwiki.com/Bells | Redraw/waves |
| S14 | Wildfrost Wiki Snowdwell | https://wildfrostwiki.com/Snowdwell | Hub layout and unlock structure |
| S15 | Wildfrost Wiki Attack | https://wildfrostwiki.com/Attack | Target semantics |
| S16 | Wildfrost Wiki Enemies | https://wildfrostwiki.com/Enemies | Enemy behaviors |
| S17 | Wildfrost Wiki Version History | https://wildfrostwiki.com/Version_History | Version-specific UI mechanics |
| S18 | PC Gamer Review | https://www.pcgamer.com/wildfrost-review/ | Public battle screenshot |
| S19 | PlayCraft shop screenshot analysis | https://playcraft.space/gallery/wildfrost/shop-gold-prices/ | Secondary screenshot analysis; keep original credit |
| S20 | App Store iOS screenshots | https://apps.apple.com/us/app/wildfrost/id6462882621 | Official mobile listing for layout comparison |
| S21 | Wildfrost Steam video community | https://steamcommunity.com/app/1811990/videos/ | User footage, verify authorship/version/timecodes |
| S22 | Wildfrost official animation tutorial guide | https://store.steampowered.com/news/posts/?enddate=1681328303&feed=steam_community_announcements | Official tips: countdowns, rows, targeting |

## 二、固定采样和研究流程

1. 先打开官方媒体页或可实际观看的游戏实机；不要用搜索摘要冒充视频。
2. 确认游戏版本与平台；视频的开始/结束/命中时间用实际时间戳测量，不得写想象值。
3. 尽可能保留原生游戏视口，不把视频播放器的黑边和 UI 算入卡牌几何。
4. 每个镜头采 0% / 25% / 50% / 命中点 / 75% / 100% 的帧；看不见的字段写 NOT_MEASURED。
5. 将参考 bbox 归一化后与本游戏截图比较，关注位置、密度、目标朝向、时间节奏和可读性；不复制原作美术资源。
6. 随修正填入本游戏测试 ID、Commit SHA 与分辨率，再生成差异报告。
7. 下表“镜头名”是**目标待办名称**，不是已观察到某一版游戏一定包含此镜头。

## 三、164 个待核验镜头与操作

| 编号 | 组别 | 需要采集的镜头/行为 | 状态 | 源 ID（候选） | 源时间码 | 对照 |
|---|---|---|---|---|---|---|
| REF-001 | MENU | menu cold open | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-002 | MENU | menu title settles | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-003 | MENU | menu selection hover | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-004 | MENU | new-game confirm | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-005 | MENU | continue run | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-006 | MENU | settings open | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-007 | MENU | settings close | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-008 | MENU | village transition | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-009 | MENU | hub first view | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-010 | MENU | hub building focus | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-011 | MENU | hub return | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-012 | MENU | leader selection enter | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-013 | START | hero cards appear | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-014 | START | hero card hover | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-015 | START | hero skill inspection | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-016 | START | hero confirm | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-017 | START | map arrival | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-018 | START | route choose top | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-019 | START | route choose bottom | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-020 | START | route character travel | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-021 | START | battle scene enter | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-022 | START | enemy first arrival | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-023 | START | enemy second arrival | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-024 | START | leader deploy | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-025 | START | companion deploy | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-026 | START | first card draw | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-027 | HAND | hover hand card | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-028 | HAND | pick hand card | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-029 | HAND | drag card target | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-030 | HAND | drag card invalid | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-031 | HAND | release card outside | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-032 | HAND | deploy to free slot | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-033 | HAND | swap units | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-034 | HAND | recall companion | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-035 | HAND | redraw bell ready | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-036 | HAND | redraw bell unready | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-037 | HAND | hand cards collect | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-038 | HAND | deck shuffling | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-039 | HAND | deal new hand | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-040 | HAND | inspect card large | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-041 | HAND | close card inspect | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-042 | HAND | inspect buff tooltip | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-043 | HAND | hand on mobile | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-044 | HAND | hand at max count | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-045 | HAND | keyboard card select | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-046 | HAND | cancel card select | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-047 | COMBAT | enemy countdown reaches zero | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-048 | COMBAT | ally countdown reaches zero | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-049 | COMBAT | front row targeted | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-050 | COMBAT | switch lanes | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-051 | COMBAT | melee windup | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-052 | COMBAT | melee impact | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-053 | COMBAT | ranged fire | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-054 | COMBAT | ranged projectile travel | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-055 | COMBAT | normal hit | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-056 | COMBAT | heavy hit | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-057 | COMBAT | blocked attack | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-058 | COMBAT | shield break | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-059 | COMBAT | counterattack | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-060 | COMBAT | multi-hit 2 strikes | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-061 | COMBAT | multi-hit 4 strikes | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-062 | COMBAT | barrage hit multiple | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-063 | COMBAT | damage number rising | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-064 | COMBAT | miss/no target | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-065 | COMBAT | unit attacks then returns | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-066 | COMBAT | turn ends | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-067 | STATUS | freeze apply | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-068 | STATUS | frozen CD tick | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-069 | STATUS | freeze expiration | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-070 | STATUS | shield applies | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-071 | STATUS | heal applies | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-072 | STATUS | heal full HP | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-073 | STATUS | poison tick | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-074 | STATUS | burn tick | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-075 | STATUS | weak debuff | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-076 | STATUS | attack buff | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-077 | STATUS | mark stack | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-078 | STATUS | haste counter | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-079 | STATUS | triggered counterattack | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-080 | STATUS | immunity feedback | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-081 | STATUS | status overlap | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-082 | STATUS | status removal | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-083 | STATUS | fatal damage hits target | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-084 | STATUS | zero HP hold | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-085 | STATUS | normal enemy death | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-086 | STATUS | hero death | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-087 | SUMMON | summon selection | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-088 | SUMMON | summon source cue | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-089 | SUMMON | summon legal slots | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-090 | SUMMON | summon card enters | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-091 | SUMMON | summon card lands | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-092 | SUMMON | summoned unit activates | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-093 | SUMMON | summon blocked slot | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-094 | SUMMON | recall vs death distinction | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-095 | SUMMON | wave warning | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-096 | SUMMON | wave bell ticks | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-097 | SUMMON | new enemy entry | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-098 | SUMMON | enemy occupies back | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-099 | SUMMON | wave full board | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-100 | SUMMON | boss entry warning | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-101 | SUMMON | boss card lands | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-102 | SUMMON | boss status appears | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-103 | SUMMON | boss phase change | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-104 | SUMMON | boss phase transition interruption | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-105 | SHOP | shop environment arrival | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-106 | SHOP | shop merchandise slides in | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-107 | SHOP | shop hover inspect | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-108 | SHOP | shop open details | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-109 | SHOP | shop close details | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-110 | SHOP | shop purchase prompt | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-111 | SHOP | purchase confirmation | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-112 | SHOP | purchase card leaves shelf | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-113 | SHOP | coins transfer | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-114 | SHOP | inventory receives card | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-115 | SHOP | sold out mark | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-116 | SHOP | insufficient funds | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-117 | SHOP | buy item at zero remaining | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-118 | SHOP | double click buy prevention | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-119 | SHOP | leave while purchasing | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-120 | SHOP | shop return to map | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-121 | EVENTS | frozen travellers entry | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-122 | EVENTS | three companions inspect | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-123 | EVENTS | chosen companion thaw | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-124 | EVENTS | companion joins deck | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-125 | EVENTS | treasure chest entry | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-126 | EVENTS | chest opens | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-127 | EVENTS | three reward cards rise | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-128 | EVENTS | reward choice confirm | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-129 | EVENTS | reward goes to deck | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-130 | EVENTS | charm reveal | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-131 | EVENTS | charm attach | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-132 | EVENTS | charm stat transform | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-133 | EVENTS | forge card before after | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-134 | EVENTS | forge upgrade animation | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-135 | EVENTS | camp rest heal | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-136 | EVENTS | camp loot coin | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-137 | END | boss lethal hit | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-138 | END | boss death hold | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-139 | END | boss collapse | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-140 | END | battle victory pause | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-141 | END | victory banner | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-142 | END | gold reward pickup | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-143 | END | post-battle card reward | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-144 | END | return to route | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-145 | END | leader lethal hit | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-146 | END | defeat quiet hold | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-147 | END | leader death animation | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-148 | END | defeat title | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-149 | END | defeat cause summary | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-150 | END | defeat run stats | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-151 | END | return to camp | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-152 | END | three-zone ending | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-153 | UX | portrait phone board | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-154 | UX | landscape phone board | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-155 | UX | tablet battle board | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-156 | UX | 12 units full board | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-157 | UX | 7 cards full hand | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-158 | UX | reduced motion battle | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-159 | UX | fast animation mode | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-160 | UX | background tab recovery | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-161 | UX | force refresh while shopping | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-162 | UX | force refresh after victory | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-163 | UX | scene back nav during transition | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |
| REF-164 | UX | gamepad navigation if supported | NOT_CAPTURED | S01/S03/S05 | NOT_MEASURED | PENDING |

## 四、证据清单结构

每条完成后必须补齐：source_url、platform、version、native_resolution、game_viewport_box、timecode_start、timecode_impact、timecode_end、actor_trajectory、target_box、unit_bbox、hand_box、UI_box、audio_observation、engine_analogue、outcome、reviewer、uncertainty、commit_sha、test_recording。

参考截图只作为内部研究证据/原始链接；公开项目不直接打包第三方商业游戏视频与完整截图素材。若视频无法访问、截图来源不可靠或具体版本未知，保留 NOT_MEASURED，不臆造。

## 五、已核对机制但尚未实测的事实

- 角色依倒计时自动行动；同行、前排和战术站位影响攻击目标。
- 重抽钟与援军钟是可操作的重要战术信息。
- 伙伴、道具、护符、地图和商店构成长期构筑循环。
- 原开发者关注了卡牌轻微3D晃动带来的物理感和减少商店误购。
- 音效设计中有真实纸牌拟音和冰晶、钟声等不同材料。

**当前状态：参考链接已归档，164 个逐帧采集任务尚未完成。请勿把这份矩阵当作已完成的全网像素级复刻证据。**

# CHAR-035｜成年落魄雌小鬼型天使交易者（人物候选）

> 《错位日常》人物草案 · 2026-11-04。**未有已批准立绘、PSD 或 L2D；没有投入游戏。** 原 CHAR-035“电竞馆夜班领班”仅为未批准的职业占位，本轮沿用编号，不新增第49人。

## 用户明确给定（已确认方向，不等于外形定稿）
- 新女角色是**成年女性，不是学生**。
- **雌小鬼**：要有女性化的俏皮挑衅、狡黠坏笑与反差，不是短发中性工装裤假小子。
- **楚楚可怜、孤家寡人、失败人生**：外在硬撑与嘴硬，内里孤独落魄，但不能简化成只有穷困、没有独立意志。
- 她属于有现实困境／愿望的天使交易者；**女主是动机与 SAN 机制的唯一已确认例外**。

## 候选细节（未批准）
- 姓名：“岑弥”；年龄：23；身高：153cm；体重：47kg。均为视觉制版提案。
- 夜间电竞馆前台/领班，独居，经济拮据；欠款、父母、旧友、合同代价及具体过去均未确立。
- 面孔：小巧但成人比例的心形脸、稍上挑的玫瑰色猫眼、小虎牙、单眉上挑、刻薄坏笑与疲惫眼下阴影。必须与女主细长脸、女二活泼马尾、女三假小子、女四大小姐、女教师的视觉身份区分。
- 头发：偏灰莓粉双马尾，发尾轻卷、旧蝴蝶结。发色、长度尚需看正式原画，不强行锁定。
- 服装：**成年日常便宜甜辣装**。磨旧的灰粉针织短外套、米白荷叶边上衣、深莓黑A字裙、略松的深色长袜、旧黑玛丽珍鞋，少量廉价心形饰品。不要校服、制服、明显奢侈品、工装裤或运动假小子穿搭。
- 正面人物素材：1024×1024 原位画布、单人完整全身、脚底落地、双手空着且与躯干稍有间距，背景方便透明抠图，方便 SeeThrough 真实部件拆分。
- 性格：嘴欠、挑衅、精于自嘲，害怕被真正抛弃；碰到真诚关怀时会暂时失语。仍有自己的日常喜好、好胜心、职业能力和可选择的成长，不只提供悲惨情绪。
- 她想得到什么、与哪个天使签什么合同、代价有多重、能否退出，**全部待故事确定**。不得凭“天使交易者”就编出已签订的合同。

## 与女主对照
| 项目 | CHAR-035（候选） | CHAR-001（已确认） |
|---|---|---|
| 参与动机 | 有人生缺口，渴望改变 | 不为救赎；享受杀怪 |
| 精神状态 | 通常可能恐惧、绝望、失去 SAN（量化待定） | 初始50、不掉SAN、击杀增加、最高100 |
| 表面人格 | 嘴硬挑衅、恶作剧式防御 | 冷淡毒舌、直截了当 |
| 社会位置 | 成年城市夜班劳动者（候选） | 女主原有身份，不改 |

## 完整字段与版本
- 448 基础字段：`docs/characters/CHARACTER_FIELD_SCHEMA_V2.json`；
- 64 新字段：`docs/characters/ANGEL_TRANSACTION_SAN_EXTENSION_V1.json`；
- CHAR-035 的机器档案：`docs/characters/CHAR-035.profile.json`，总计 512 个带状态的字段。
- 所有未知项都保留 `null` 和 `unknown`，不是已确认的故事事实。
- 世界观与数值源：`docs/ANGEL_TRADE_AND_SAN_CANON_20261104.md`。

## Anima 正面立绘草案（仅参考，未经批准）
```text
<lora:akipekoanima_v1_1:1> @akipekostyle, masterpiece, best quality, anime visual novel character sprite, 1woman, solo, adult woman, petite adult proportions, full body, front view, same visual style as existing cast, mischievous smug teasing smile, slightly tired eyes, feminine heart-shaped face, subtly upturned catlike rose eyes, berry-pink long twin tails with slightly worn ribbons, cheap but carefully coordinated feminine casual fashion, faded dusty pink knitted cardigan, pale ivory ruffled blouse, dark berry-black A-line skirt, dark slightly loose knee socks, worn black mary jane shoes, subtle signs of modest means, delicate adult appearance, arms resting naturally at sides, both hands empty and visible, relaxed neutral standing pose, fully visible feet, clean background, centered composition, high-detail clean anime line art, harmonious shading
```

**禁用方向：** 中性假小子、短工装夹克/工装裤、学生校服、豪华大小姐礼裙、过度幼态比例、过分性感化、手持道具、动态大动作、被裁切的脚或手。

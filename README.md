# Paperchalk World｜GitHub 托管游戏与像素工作室

> **七大战斗职业与配队设计最新基线（2026-11-13，必读）：** [七职业正式名单、职业/人物/设施遗物三层联动、六种共通机制、时间步、704×1024卡牌素材尺寸](docs/game/SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md)。工程师、守卫、战士、射手、游击者、医师、召唤师；不准擅自改职业或把卡牌素材尺寸当棋盘占地。


# 新画风 LoRA 配置（2026-11-09 用户指定，生成新素材必须先查）

**可爱版 / 正常版当前完整原样配置：** [双画风提示词规范](docs/ANIMA_STYLE_PRESETS_NORMAL_CUTE_20261109.md)；机器读取：[Anima style presets JSON](site/data/art/anima-style-presets.v1.json)。**正常版只比可爱版少 `<lora:firedotinc_old-dataset_anima-b1_v6:0.8> @firedotinc-old`，其余完全一致。** 这些是新素材的画风预设，不得未经许可覆盖原有批准作品或把它们误称 GPT Image 的 LoRA。


> **普通路人 NPC 统一人物集（含已批准老爷爷 NPC-M003）：** [全部路人和素材状态](site/data/npc/civilians/README.md) · [机器索引](site/data/npc/civilians/gallery.v1.json) · [导入校验脚本](scripts/validate_civilian_npc_sources.py)。四张新路人的 1024×1024 原始 PNG 已真实提交 GitHub（commit b4daf488），老爷爷 M003 保留原批准资源；五人均在统一图鉴，哈希与文件存在性已通过自动检查。仅美术原图入库，暂不代表 NPC 已进游戏或三种 img2img 状态已完成。

> **Anima/NPC 提示词必读：** [Anima 官方规范与来源](docs/ANIMA_OFFICIAL_PROMPTING_REFERENCE_20261108.md) → [游戏画风锁](docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md) → **[用户确认的 LEFT/CENTER/RIGHT 三视图与第四格待机标准（当前唯一模板）](docs/NPC_ANIMA_LEFT_CENTER_RIGHT_TURNAROUND_V1_20261108.md)** → [已批准老爷爷原文](docs/NPC-M003_ANIMA_APPROVED_FOUR_POSE_USER_PROMPT_20261108.md)。每次新写提示词先核对这些文件；过时的多次失败候选和「强制逐张单视图」实验不得再当默认。详见 [AGENTS.md](AGENTS.md)。

> **人物 2048 重画 / Anima / Forge Neo 每次开工必读（2026-11-06 已复核：本机同时安装 Anima Base + Turbo、22 个内置模块、14 个外部扩展、15 张 LoRA/参考权重卡片）：** [已安装插件与 LoRA 逐项清单](docs/ANIMA_FORGE_NEO_INVENTORY_20261105.md) → [女主 CHAR-001 2048 保真精修 SOP（含可复制提示词、UI参数、透明化及验收）](docs/CHAR_001_2048_REPAINT_SOP_20261105.md) → [角色美术风格锁](docs/ANIMA_CHARACTER_ART_STYLE_LOCK_V1.md)。清单原始依据 2026-11-05 用户截图，已于 2026-11-06 根据新截图和用户明确确认更新，不等于软件安装状态实时自动同步；每次使用先核对实际本机界面，不能未经用户验收覆盖已批准 L2D/母图。


当前 main 仓库同时包含横屏叙事场景、自动场景发布系统与独立美术工具；场景实验并不是完整的剧情游戏。

[打开托管游戏](https://g2066203208-beep.github.io/paperchalk-world/) · [GitHub Actions 自动发布](https://github.com/g2066203208-beep/paperchalk-world/actions)

## 新增场景：只上传一张图片

把 WebP、PNG 或 JPEG 图片上传到 **[site/assets/scenes/](https://github.com/g2066203208-beep/paperchalk-world/tree/main/site/assets/scenes)**；推荐尺寸 1024×576，也可以使用其他清晰尺寸。比如新增 basement.webp 后只需提交到 main。

自动流水线：图片解码及校验 → 场景数据生成 → 场景预览和游戏内切换自动注册 → 共用主角背面、黑雾、鼠标/手机倾斜、黑色转场 → 浏览器测试 → GitHub Pages 发布。可以用 ?scene=basement 直接打开。图片内容不被自动裁切、重画或重新压缩。

**[详细使用说明：模块契约、命名、设置保留、验收与故障处理](docs/SCENE_AUTOMATION.md)**

## 表世界：沉浸式都市恐怖日常（醒来序幕原型）

- **主菜单选择「开始游戏」**：当前制作阶段直接播放女主卧室醒来剧情；未来的完整开局仍是里世界肉鸽冒险，首次死亡才进入本段序幕。
- 女二的未接电话和催作业消息出现在女主**原有的手机**里。卧室仅有极少的场景互动文字；走到玄关选「出门」，手机内「出行」可以选择学校、已有地铁站和其他保留地点；到达会消耗游戏时间。
- **没有「今天的生活」面板，没有长列表日程、属性/任务卡片或第二套管理 HUD。** 游戏后台保存时间、金钱、关系、物品及新闻推进，必要信息只在实际交互、手机或短对白中出现。
- 当前城市外景尚未绘制，学校等地点只显示极简场景占位；正式里世界出入场仍未完成，不能冒充已实装。
- [实现说明与完整待办](docs/OVERWORLD_DAILY_LIFE_V1.md)；测试 `node --test tests/daily-life.test.cjs tests/opening-flow.test.cjs`。


## 现有游戏内容

- 场景：教室、卧室、客厅、玄关、教学楼走廊与城市街道，后续图片自动注册。
- 人物：主角与 NPC 全部经过 `site/l2d/runtime.js` 里的动态 Canvas 渲染。正背面 WebP 只保留为隐藏的加载/定位源；原 V4 动画 ZIP 导入后，游戏在 Canvas 按原始 1024×1024 坐标逐帧播放。
- 分层：背景 3D 倾斜、固定屏幕空间实时黑雾、背景边缘全黑遮挡、深黑转场、手机和电脑兼容。
- 沿用已调好的浏览器设置、黑雾和 DEV 景深参数；新场景不重建效果。
- 废弃恐怖角色、动态黑斑、单独“主角立绘”场景已经从当前游戏中移除。

## 全人物 L2D 编辑（唯一入口）

- [**游戏 DEV**](https://g2066203208-beep.github.io/paperchalk-world/?dev=1)：选择已加载主角或 NPC → `打开全人物 L2D 编辑工作室`，直接导航到同站唯一编辑器，不再另开女主角专用预览。
- [**全人物 L2D 编辑工作室**](https://g2066203208-beep.github.io/paperchalk-world/character-editor/)：下拉列表包含仓库已登记角色和本浏览器导入的全部人物。独立正面/背面、PSD 与分层 ZIP、呼吸/软硬控制、保存到游戏。
- **精修 V4 正式动画**：编辑器里选择人物 → **导入 V4 动态工程 ZIP**，识别 `front.webp` / `back.webp`，保持原始裁剪位置 `(351, 9)`，在游戏人物 Canvas 连续播放。V4 是透明逐帧动画，不是 Cubism `.moc3` 骨骼文件。
- 重要：浏览器导入的 V4 WebP 与人物编辑存储在本站同源 IndexedDB，**不是自动提交二进制资源到 GitHub 仓库**。要跨浏览器永久发布 V4 源文件，需要将素材二进制实际加入仓库并由发布流水线上线。
- 游戏其他角色尚未导入 V4 时，同样由通用 L2D 网格呼吸运行时绘制 Canvas，不会把静态 PNG/WebP 元素直接显示为角色立绘。

## 独立工具

- [PixelLab](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/)
- [像素绘画编辑器](https://g2066203208-beep.github.io/paperchalk-world/pixel-lab/editor.html)
- [像素材质工作室](https://g2066203208-beep.github.io/paperchalk-world/world-builder/materials.html)
- [美术参考资料库](https://g2066203208-beep.github.io/paperchalk-world/learning-library/)

## 自动构建

本地可运行 python3 scripts/build_scene_catalog.py （需要 Pillow），随后运行 node tests/scene-modules.test.cjs。正式发布由 .github/workflows/studio-pages.yml 执行 Chromium 回归测试后上线。

备注：浏览器本地保存的个人参数不会被新图片覆盖，但 GitHub 无法从用户浏览器读取这些参数并自动备份到仓库。

## 正式角色档案（唯一身份与素材锁定）

- [女主角 CHAR-001：外貌、瞳色、性格与可修改的年龄/身高/体重草案](docs/PROTAGONIST_CANON.md)
- [角色机器档案](site/data/characters/registry.json)：所有正背面与未来主角变体均复用 `protagonist`，不创建重复女主角。
- 验证：`python3 scripts/validate_character_identity.py`，并接入现有 Pages GitHub Actions 部署检查。
- 原有主角正面/背面 WebP 未修改；传入新场景图也不应生成独立的人物场景。

## 当前城市生活与卡牌RPG人物方向

[**最新48名人类角色规划V3**](docs/HUMAN_CAST_PLAN_V3.md)：**8名学生（当前6位已开展设计（女三已选视觉参考，男三仅448项设计））＋12名重要非学生角色＋28名城市生活NPC**；学校只保留一所主角高中，旧三校/28学生方案已废弃。城市生活、社会关系、异常调查与牌组构筑战斗是整体方向提案，**不代表这些玩法已经在游戏中实现**。

## 人类角色与原创怪物规划（历史资料）

- [**旧版48人（28名学生）历史方案，不再执行**](docs/HUMAN_CAST_PLAN_V2.md)：其中优先设计18名核心与重要角色，后续再完成30名剧情NPC；名单均属于创意候选，未全部绘制或加入游戏。
- [**旧版48人机器花名册（历史）**](docs/HUMAN_CAST_ROSTER_V2.json)：编号唯一、保留女主/女二/男主已有记录，记录脸型、发型、体态、姿势和独立剧情功能。
- [**原创性规范**](docs/ORIGINALITY_AND_HORROR_IDENTITY.md)：怪物数量与名称只是旧版创作预算，未经过原创性验收的设计不能当正式敌人。

### 女三 CHAR-004（2026-11-02）

已保存用户选定的[第三版视觉参考原图](site/assets/characters/char-004/reference-sheet.png)及[专属人物档案](docs/characters/CHAR-004_FEMALE_THIRD_PROFILE.md)。**这是一张全身＋脸部特写组合图，不是可直接使用的透明分件或L2D角色。** 人设和已选面相保留，游戏演员注册及动作、拆层仍待后续制作。

### 男三CHAR-020｜448项人物候选

[逐条可读档案](docs/characters/CHAR-020_MALE_THIRD_PROFILE.md) · [机器JSON](docs/characters/CHAR-020.profile.json)。小正太系男性高中生，原画、PSD、L2D和游戏演员注册仍待完成。原CHAR-020田径女生为未批准候选，保留历史记录。

### CHAR-008 成年女教师候选｜448项人设

[完整中文448项](docs/characters/CHAR-008_FEMALE_TEACHER_PROFILE.md) · [机器字段JSON](docs/characters/CHAR-008.profile.json)。已有班主任占位升级为年轻女教师的独立生活和职业人设设计方案；外观及具体传记待审批，未制作原画、PSD、Live2D或正式演员。

## 用户确认的场景清理（2026-11-12）

已移除截图编号 10、11、12、13、14、20、21、22、23、24、25、26、27、29 所对应的场景、独立模式、旧地图画面、相关素材和专用测试。保留 1–9、15–19、28；其中 28 迁到 [独立三维地形工作台](site/terrain-3d.html)。地铁车厢、站台和 NPC 仍需要线路数据，因此仅保留不显示的交通图数据后端；原地图界面改为不含地图的“出行”目的地列表。

## 正式教室身份（用户确认 · 2026-11-12）

**唯一正式的教室为场景 `school`（学校教室）**，由 `site/game/school-room-2p5d.js` 的五面 WebGL 教室渲染。上课、女神坠楼、教室 Boss 都在这个场景演出。旧 `classroom` 是早期平面测试，不是学校教室：已从玩家场景列表和场景预览排除，旧测试入口仍保留供历史相机回归；`classroom-box` 是独立战斗构图测试，也不是正式学校教室。今后讨论“教室”时始终指 `school`，不应拿旧版平面图冒充。

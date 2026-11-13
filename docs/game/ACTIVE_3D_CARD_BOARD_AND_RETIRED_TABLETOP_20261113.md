# 当前托管卡牌小游戏入口与旧时间步桌面对战清理（2026-11-13）

> **用户指令：删掉那个时间步对战的。** 已执行旧独立桌面对战清理，不能将它当作当前小游戏。

## 当前正式保留的小游戏入口

- **可打开的实际 3D 战场：** `site/card-battle/formation-6x16-3d.html`
- GitHub Pages: https://g2066203208-beep.github.io/paperchalk-world/card-battle/formation-6x16-3d.html
- 当前实际实装是 **16 列×6 行的 3D 地形网格**、**敌我各 3×3 人物布阵位置（总共各 9 个）**，两侧还留有设施区。
- 画面支持旋转、平移、缩放、挖掘/堆土三层；当前只实现卡牌部署、设施占位与地形编辑/简单演示攻击，不是完整第一关的正式战斗结算。
- **当前图片和队伍仅用于测试：** 马戏团七人组，设施农田、炮台、研究院。不能冒称已换成第一关农民组织萝莉伐木工。

## 清理的历史内容

- 原 `site/card-battle/index.html` 为“纸牌时序·暗木桌战斗”独立原型，已经完全替换成到 **3D 当前页面**的轻量跳转入口。没有旧桌面对战渲染代码。
- 删除旧独立页面专用脚本 `site/card-battle/scene.js` 和 `site/card-battle/grid-preview.js`。
- 删除只用于旧桌面/双九宫格视觉测试的 `tests/card-battle-tactile-browser.mjs`。
- GitHub Actions `.github/workflows/card-battle-tactile-qa.yml` 修改为**只执行真实 3D 棋盘测试** `tests/six-row-formation-browser.mjs`。
- **保留** `site/card-battle/engine/voxel-terrain.js`、`battle-camera.js` 和 3D 主页面，不允许清理误伤。
- **未删除**另外的恐怖 RPG 环形战场 `site/index.html?scene=ring-arena` 或共享 `site/combat-lab/engine.js`；它们被其他游戏入口调用，不是本次明确指定移除的独立桌面对战。后续如果用户明确要求废弃整个时间步战斗机制，再单独确认其跨玩法引用与迁移。

## 待制作（不可冒充已实装）

- 第一关：森林背景 / 我方**农民组织萝莉伐木工 1 人** / 敌方基础敌人 **2 人**。
- 战场沿用真实 3D 场地，可考虑第一关仅启用两侧 **3×3 人物阵列**，其余设施区隐藏或暂不可用；不是另建一张平面 9 格页面。
- 角色立绘原图 **704×1024**。伐木工目前只有 [Anima V2 提示词候选](../characters/FARMER_FACTION_LUMBERJACK_LOLI_ANIMA_CANDIDATE_20261113.md)，未有批准原画。
- 第一关具体玩法、实际攻击/胜负结算与敌方美术尚待完成。

**设计规则：**先阅读 [七职业与联动规范](SEVEN_BATTLE_CLASSES_PARTY_SYNERGY_CANON_20261113.md)，不要重复介绍已删除的暗木桌时间轴对战为当前游戏。

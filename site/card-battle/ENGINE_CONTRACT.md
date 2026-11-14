# 纸片卡牌战斗：可复用引擎边界与已确定规则

> 本文只记录当前工程中已经实现的机制与明确的产品限制。修改玩法时不得为了测试、截图或演出效果擅自重写已确定的摸牌规则。

## 1. 玩家已确定的摸牌约束（禁止回归）

- **七个独立的实体职业牌盒**：工程师、守卫、战士、射手、游击者、医师、召唤师。
- 角色部署完成后**不自动发初始手牌**，初始手牌为 **0 张**。
- 玩家**点击任一职业牌盒手动摸牌**；每次点击摸一张，所有职业共用一个手牌区。
- **总手牌上限为 10 张**，允许混搭不同职业，摸满即停止。
- **下一回合不自动摸牌**；打出一张牌后，仍可主动从牌盒继续摸到上限。
- 未打出的手牌跨回合保留；已打出的牌于回合交替时进入对应职业弃牌堆（这是目前的实现决定，不代表未来所有玩法必须如此）。
- 七个盒子的原型版牌面暂时沿用统一测试素材；**牌堆数据与出入库彼此独立**，不允许用“复制手牌”模拟七个盒子。
- 用场景 UI 拍照、测试或切换美术表现时，不得自动发牌或强制清空玩家手牌。

## 2. 已存在的独立引擎模块

| 文件 | 单一职责 | 与场景的关系 |
| --- | --- | --- |
| `engine/level-engine.js` | 部署、3×3 阵地、单位生命/护盾、敌人意图、敌我回合和胜负 | 纯规则状态机，靠关卡 manifest 注册 |
| `levels/forest-01.js` | 第一关的单位、初始数值和目标 | 只有数据，不包含渲染算法 |
| `engine/profession-decks.js` | 七个独立牌盒、手动摸牌、10 张共享上限、弃牌/重洗 | 不包含浏览器或 WebGL API |
| `engine/combat-turn-controller.js` | 玩家主动攻击、结束回合、顺序调度敌人、结算时机 | 以注入的引擎/回调组合，不写森林特例 |
| `engine/combat-choreography.js` | 前摇、爆发、短命中停顿、后仰、收招 | 只计算动画状态，无 DOM/WebGL |
| `engine/combat-feedback.js` | 斩击线、伤害数字、敌人意图显示 | 浏览器渲染适配层 |
| `engine/battle-camera.js` | 固定俯视角、缩放、棋盘安全区平移 | 独立摄像机控制 |
| `engine/voxel-terrain.js` | 地形、格点及 WebGL 网格生成 | 可在其他关卡复用 |
| `engine/spatial-shadows.js` | 基于空间的 Shadow Map | 场景渲染功能 |
| `engine/forest-dressing.js`, `engine/cloud-shadows.js` | 森林模型、移动云影 | 可开启/关闭的美术层 |
| `ui/forest-hand.js`, `engine/scene-card-hud.js` | 将七个 3D 牌盒点击事件转成手动摸牌请求 | 不决定自动摸牌规则 |

## 3. 当前战斗状态机

`deployment` → `active（玩家可手动摸牌及出牌）` → 玩家按结束回合 → `enemy（敌人按意图依次行动）` → `active（下一回合，手牌维持原状）`，直到 `victory` 或 `defeat`。

伤害在攻击动画的 **impact 帧**才进入 `level-engine`；普通动画无法自行修改生命数值。游戏界面只负责将状态变化映射到卡牌、数值和特效。

## 4. 仍然需要进一步模块化的范围

`forest-level-01.html` 目前仍含 WebGL 场景组装、输入映射和部分 HUD 布局。**目前是“核心规则已模块化”，不是“完整通用编辑器和所有职业玩法都做好”。** 新关卡要复用核心时应新建 level manifest 和薄场景适配，不能复制改写已有规则引擎。

## 5. CI 守卫

每次修改卡组、关卡或战斗控制器，运行：

- `node tests/profession-decks.test.cjs`
- `node tests/forest-level-core.test.cjs`
- `node tests/combat-turn-controller.test.cjs`
- `node tests/combat-choreography.test.cjs`
- `node tests/forest-level-01-browser.mjs` （Playwright + 本地 HTTP 服务）

特别检查 **初始 0 / 结束回合 0 自动发牌、七职业手动抽满 10、不允许第 11 张**。

# 纸片卡牌战斗：可复用引擎边界与已确定规则

> 本文只记录当前工程中已经实现的机制与明确的产品限制。修改玩法时不得为了测试、截图或演出效果擅自重写已确定的摸牌规则。

## 1. 玩家已确定的摸牌约束（禁止回归）

- **一个实体牌盒，最多七个卡槽**：卡槽不是固定七职业。只有**已经获得的人物牌和该人物自己的牌堆**可以占槽；尚未获得的角色完全空着，不造假牌堆。
- **人物按加入队伍的顺序从左往右排列**，每人物一堆、每堆归属独立；第一关只有第 1 槽伐木少女，其余 6 槽为空；第二关第 1 槽伐木少女、第 2 槽农夫，其余 5 槽为空。即使以后两个角色同职业，也各自一堆。
- **牌盒表面禁止添加文字、职业标签、字母或装饰图标**；保留单一简洁盒体、空槽、纸张、合理模型和材质。
- 角色部署完成后**不自动发初始手牌**，初始手牌为 **0 张**。
- 玩家**点击已经拥有的角色牌堆手动摸牌**；每次点击摸该角色牌堆中的一张，所有人物共用一个手牌区。空槽不可点击、不可摸牌。
- **总手牌上限为 10 张**，允许混搭不同职业，摸满即停止。
- **下一回合不自动摸牌**；打出一张牌后，仍可主动从牌盒继续摸到上限。
- 未打出的手牌跨回合保留；已打出的牌于回合交替时进入对应人物的弃牌堆（这是目前的实现决定，不代表未来所有玩法必须如此）。
- **已经移除七职业复制战士牌的测试逻辑**；当前伐木少女拥有战士通用牌 + 人物专属「伐木」；农夫拥有五张角色专属设施卡。卡牌所属职业、组织、人物经注册目录共同判断。其他人物未获得就没有牌池、牌堆或可以抽出的卡牌。
- 用场景 UI 拍照、测试或切换美术表现时，不得自动发牌或强制清空玩家手牌。

## 2. 已存在的独立引擎模块

| 文件 | 单一职责 | 与场景的关系 |
| --- | --- | --- |
| `engine/level-engine.js` | 部署、3×3 阵地、单位生命/护盾、敌人意图、敌我回合和胜负 | 纯规则状态机，靠关卡 manifest 注册 |
| `levels/forest-01.js` | 第一关的单位、初始数值、目标和敌人 `intentCycle` 攻防行动表 | 只有数据，不包含渲染算法；引擎不得按敌人名称判断 AI |
| `engine/card-registry.js`, `data/card-packs.js` | 所有玩家/敌人卡牌的统一声明、注册、合法性验证、职业/组织/角色归属 | 卡牌内容只在数据包定义一次，其他模块不得复制一份 |
| `engine/profession-decks.js` | 7 槽容量、按已有角色顺序建立独立牌堆、手动摸牌、10 张共享上限、弃牌/重洗 | **从 CardCatalog 查询卡池**；自身不定义或复制牌面 |
| `engine/card-effect-engine.js` | 通用技能结算、精华、建造、人物/设施互动 | 根据注册卡效果处理动作，场景只负责目标选择与视觉反馈 |
| `engine/farmer-facilities.js` | 占格/耐久/相邻加速/回合生产/拦截/资源转换 | 所有设施尺寸和耐久来自同一个 CardCatalog |
| `engine/bandit-roster.js` | 山贼角色模板、目标策略和技能池挂载 | 敌方五技能从 CardCatalog 读取；不在关卡或角色模块复制牌面 |
| `engine/combat-turn-controller.js` | 玩家主动攻击、结束回合、顺序调度敌人、结算时机 | 以注入的引擎/回调组合，不写森林特例 |
| `engine/combat-choreography.js` | 前摇、爆发、短命中停顿、后仰、收招 | 只计算动画状态，无 DOM/WebGL |
| `engine/combat-feedback.js` | 斩击线、瞬时伤害数字 | 浏览器渲染适配层；禁止显示敌方行动及意图预告 |
| `engine/card-stat-badges.js` | 人物卡右下生命、左下攻击数值牌徽，实时同步战斗状态 | **实体卡牌的同一套 3D 矩阵**；非全局 HUD，设施卡不显示人物数值 |
| `engine/battle-camera.js` | 固定俯视角、缩放、棋盘安全区平移 | 独立摄像机控制 |
| `engine/voxel-terrain.js` | 地形、格点及 WebGL 网格生成 | 可在其他关卡复用 |
| `engine/spatial-shadows.js` | 基于空间的 Shadow Map | 场景渲染功能 |
| `engine/forest-dressing.js`, `engine/cloud-shadows.js` | 森林模型、移动云影 | 平常合批绘制，转场时树/岩石/花草逐个以自身根部缩放 |
| `engine/object-anchor.js` | 统一 3D 物体自身锚点矩阵 `T(root) · S(scale) · T(-root)` | 全场景共用，禁止将单个道具缩到世界中心 |
| `engine/object-animations.js` | 各物体进入/退出/弹性缩放的时间轨道 | 动画 ID 独立于玩法状态，不修改物体世界坐标 |
| `engine/scene-lifecycle.js` | 按 provider 注册全场景地板、树木、道具、地形、角色进退场 | 新场景只注册对象 IDs，无须再复制森林专用循环 |
| `engine/scene-transitions.js` | 退场 → 换布景 → 进场的通用状态机 | 切换不改玩家牌堆、回合、部署、生命或设施逻辑 |
| `ui/forest-hand.js`, `engine/scene-card-hud.js` | 由关卡显式创建角色手牌模型、实体七槽与抽牌演出 | 不读取调试全局来推测队伍；场景切换期间牌盒保持常驻 |

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

特别检查 **初始 0 / 结束回合 0 自动发牌、只可点击已有角色牌堆、其他槽位真实为空、10 张上限不允许第 11 张**。

## 6. 所有新场景强制遵循的转场协议

1. **先定义物体身份和世界根部**：每棵树、石头、草丛、设施、人物、地形格都有稳定 ID，世界坐标不会因为转场改变。
2. **世界坐标烘焙进网格的物体**：调用 `PaperchalkObjectAnchor.atRoot([x,y,z],scale,{T,S,mul})`。**局部坐标网格**使用 `localAtRoot`。不能直接 `S(scale)` 或围绕地板/棋盘中心缩放一整组外围道具。
3. **注册 provider 而不是写单独动画循环**：`PaperchalkSceneLifecycle.create({animation:objectFX,groups:[{id:'props',ids:scene=>renderer.idsFor(scene),enter:{duration:.6,stagger:.01},exit:{duration:.4}}]})`。底层 `scene-transitions` 在退出、换景、进入三个阶段统一调度。
4. **保留性能**：森林静态 12 批 WebGL 网格绘制；只在过场期间使用 156 个独立锚点（45 棵树、22 块岩石、24 簇花、65 簇草）。阴影和主视图采用同一矩阵；没有每帧创建新缓冲。
5. **永久状态不属于场景美术**：地图切换不清空牌堆、手牌、设施、人物生命或战斗回合；七槽牌盒不跟着外围场景缩小到中心。
6. **屏幕牌盒的视觉一致性**：牌盒、牌堆和手牌固定于屏幕投影，使用场景相同的材质、太阳光、环境光、阴影和色调映射；绘制期间只暂时将移动云影强度设为 0，之后恢复，不得把整个牌盒改成 unlit 或关闭所有光影。
7. **新场景必须走同一套单元测试**：`tests/scene-lifecycle.test.cjs` 验证每棵树缩放时根部位置不变，动画结束后回到静态批渲染。

## 7. 所有新卡牌和敌人的注册协议

- **唯一定义**：使用 `PaperchalkCardCatalog`，卡包按 `scope: 'profession' | 'faction' | 'character' | 'enemy'` 声明。配置 `profession`、`faction`、`characterId` 或 `archetype`；新增组织或人物只增加注册包，不修改抽牌引擎代码。
- **卡片类型**：`attack` / `guard` / `resource` / `facility` / `enemy-action`。设施明确提供 `footprint`、`facilityHp`、`facilityRole`，用统一单位“1 卡格”判定；资源类型限定材料、生命、魔法精华。
- **独立牌堆**：`PaperchalkProfessionDecks.create({ownedCharacters:[...]})` 只查已获得人物能使用的卡。组织技能不会泄漏给其他组织，同职业多人物也分别维护手牌归属和弃牌堆。
- **动作执行**：卡片属性由注册器取得；`PaperchalkCardEffectEngine` 执行格挡、精华、设施摆放/回滚、砍树联动。页面不得再新增 `if(card.name === '某张卡')` 的硬编码规则。
- **角色而非占位敌人**：山贼角色模板从敌人卡包取五技能，关卡只引用模板 ID 与位置。角色攻击/行动仍由同一个 `level-engine` 结算；不显示敌方行动预告。
- **所有新内容必须有测试**：`tests/card-registry.test.cjs`、`tests/card-effect-engine.test.cjs`、`tests/farmer-facilities.test.cjs`、`tests/character-hand-engine.test.cjs`。

## 8. 实体牌堆交互协议

- **所有行动牌堆明牌**：顶部必须使用真实 `remainingCards(ownerId).at(-1)` 渲染，因为抽牌引擎使用 `pop()`。**未部署人物卡是覆盖在自己牌堆顶层的真实纸卡**：必须与对应牌堆共用同一 x/y、同一卡尺寸，纸面仅有一个卡厚的高度差，不能再飘成第二排。人物部署后这张人物卡离开盒体，露出下面真正的下一张行动牌，随后悬停行动牌即可查看下一抽内容。
- 鼠标悬停只移动最顶一张，牌盒与其余卡牌不动。点击产生抽离、牌堆回弹、弧线飞入、微旋转、落位弹性、手牌扇形自动让位与选中强化。
- **牌盒与手牌独立**：收起牌盒只隐藏七槽盒体及七叠牌堆；已摸到手里的牌仍固定在屏幕底部，既能点击，也能拖到目标，抽牌不能因为折叠而丢失。
- 点击牌堆取出顶牌，取出的实例立即被选中；随后点击符合牌型的目标可出牌。已选中的同一张手牌再次点击不应意外取消选中。
- 也可从牌堆顶牌或手牌按住拖动：手牌真实跟随指针，松开时使用与点击出牌同一套合法目标与效果结算。非法位置不消耗手牌。
- 牌堆与手牌交互优先级高于摄像机平移；手机单指拖牌不得转动场景。取消操作、ESC 和关盒都必须释放拖动状态。
- 同一交互代码统一支持战士攻击、农夫设施与角色互动，不能为每张卡复制一套输入处理逻辑。
- **动画模块唯一入口**：`engine/card-hand-motion.js` 管理各实例的抽牌、选中、收牌和弹性返回；`scene-card-hud.js` 只负责绘制固定投影卡牌与把输入交给动画 / 游戏规则。场景页面不允许新增 `if(card.id)` 动画分支。
- **牌盒动画独立**：`engine/card-case-motion.js` 定义屏幕底边竖向滑出/收回、短回弹、可中途反向的统一过渡。牌盒、七个物理牌堆、未部署人物卡共用这一位移；已摸出的手牌、手牌排序、回合与场景世界均不参与收盒。打开/关闭中，命中区域跟随物理位置，收盒时不得点穿到未收起的牌堆。
- **人物拿牌**：人物部署卡只能从所属实体牌堆顶层拿起，拖动时原卡从盒内离开，放到我方九宫格部署；非法放置必须回弹到所属牌堆。与普通手牌共用弹性轨迹，不能另写全局动画。
- **屏幕与性能**：场景切换不缩放屏幕牌盒；保留世界环境光、主光、阴影与色调映射，只在 HUD pass 屏蔽移动云影。手机跳过额外的纸边拖尾 draw call，响应 `prefers-reduced-motion`。

- **转场与云影**：手牌和牌盒继续使用世界环境光、材质与色调映射，只在该 UI 渲染 pass 临时关闭森林移动云影，不影响战场。场景转场永远不能重置手牌。
- **测试要求**：`tests/card-hand-motion.test.cjs` 与 `tests/scene-card-hud-interactions.test.cjs` 必须覆盖弹性返回、明牌顶张与实际下一抽匹配、关闭牌盒后依然显示/可拖动手牌。浏览器验收用 `tests/forest-level-01-browser.mjs`。


## 9. 仍需要继续拆分的适配层

`forest-level-01.html` 目前保留大量 WebGL 相机/材质/输入/界面组装代码，**还不能称为所有子系统都已经完整引擎化**。现已把场景生命周期、锚点计算、卡牌注册、卡牌效果、角色手牌初始化、战斗规则抽离为独立模块。后续新场景应继续迁走页面里的渲染与输入适配，不允许把新的职业规则写回 HTML。

## 10. 设施绘画素材接入协议

详见 [FACILITY_ART_SPEC.md](./FACILITY_ART_SPEC.md)。五张农夫设施的 PNG 使用 `data/facility-art.js` 统一路径；无图退化为占位，有透明 PNG 自动替换战场贴图并合成手牌/明牌卡面。不得复制多份资源路径，不能直接让 PNG 覆盖纸张卡框和文字。

## 11. 新增回归测试

- `tests/card-case-motion.test.cjs`：牌盒完整出入场与中途反向。
- `tests/scene-card-hud-interactions.test.cjs`：人物卡真实压在所属牌堆，拖出/退回、明牌、一键摸牌、折盒手牌常驻。
- `tests/card-hand-motion.test.cjs`：抽牌分层动画、格挡/设施等通用手牌反馈、弹性返回。
- `tests/facility-art.test.cjs`：所有设施有唯一透明 PNG 素材槽位。
- `tests/forest-level-01-browser.mjs`：手机/桌面真实 WebGL 的收盒与人物叠放验证（需要 Playwright 测试环境）。

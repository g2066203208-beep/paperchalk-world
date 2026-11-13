# 模块化体素地形引擎规范（2026-11-13）

## 唯一实现入口

- **引擎**：`site/card-battle/engine/voxel-terrain.js`
- **调用方**：`site/card-battle/formation-6x16-3d.html`
- **真实浏览器回归**：`tests/six-row-formation-browser.mjs`
- **GitHub Action**：`.github/workflows/card-battle-tactile-qa.yml`

禁止将地图生成、网格世界坐标、草地纹理和地形相邻连接规则重新复制进战斗页面。人物卡、设施卡是独立于世界地形的真正三维对象。

## 地图数据

- 16列×6行，共96块可单独编辑的地块，但同高度时无内部物理缝隙；整个地图依然连成一个整体。
- 每格可拥有材质 `grass | dirt | water` 和整数 `level`，默认0。
- 当前允许等级 **-3至+3**，每一级真实世界高度 `levelStep=0.67`。
- 材质的颜色区间集中统一配置在 `MATERIALS`，棋盘使用明度交替 + 固定随机种子微差 + 细微纹理，而非手绘棋盘贴图。
- `terrain.center(c,r)` 同时决定地块实际位置与人物／设施卡实际放置中心。不得重新建立独立坐标表。
- `terrain.neighbors(c,r)` 负责自动检测邻接类型及高低差。
- 地形改变时 `revision` 自增，WebGL渲染适配器按需重建各块顶面、圆润坡口、露出的泥土侧壁、格线；不可用CSS方块冒充3D体素。
- 地面格子的色差永久可见，拿起卡牌时临时绿色可放／红色不可放，放置后隐藏提示。

## 对外API

```js
const terrain = PaperchalkVoxelTerrain.create({
  cols:16, rows:6, tileW:1.85, tileD:2.65,
  centerX:.925, centerZ:-1.1, topY:-.117, thickness:.66,
  minLevel:-3, maxLevel:3, levelStep:.67,
  initialKind:'grass', seed:618231
});
terrain.center(4,3);         // 世界坐标，卡牌落点与地块同源
terrain.cell(4,3).level;     // -3…+3
terrain.dig(4,3);           // 降低一层，到下限返回null
terrain.place(4,3);         // 增加一层，到上限返回null
terrain.adjust(4,3,-1);     // 通用高低变化
terrain.setLevel(4,3,3);    // 设绝对高度
terrain.canAdjust(4,3,+1);  // 操作是否合法
terrain.set(4,3,'water');   // 切换材质（保留level）
terrain.neighbors(4,3);     // 相邻连接及高低差信息
terrain.color(4,3);         // 基于材质与种子的明度和微差
terrain.reset('grass');     // 清空地形变化
```

`PaperchalkVoxelTerrain.createWebGLRenderer(terrain,{gl,makeGeom,renderGeom,I})` 是唯一几何层，场景通过 `terrainRenderer.draw()` 绘制。

## 场景中的操作卡

- **挖掘卡**（`id='dig'`）：工具可重复使用，目标是一格可编辑的地形块，`level -= 1`，最低-3。
- **堆土卡**（`id='build'`）：工具可重复使用，`level += 1`，最高+3。
- 对所有96个地块有效，但被已摆放人物／设施占用的格子暂不可改变，避免卡片陷进土里。
- 每次点击实时重新生成地形几何体；工具选择后显示红／绿区域，取消选择后区域指示消失。
- 角色和设施卡落点Y坐标必须依附对应地块高度，悬浮和翻转动画叠加在这个高度之上。


## 2026-11-13 圆润连续体素外观规则（引擎 v3.2）

用户明确要求类似《一起开火车！2》的**轻柔倒角体素地图**，不是白板、96个孤立圆角积木，也不是画死的背景插画。

- 必须保留每格独立的整数高度和占位坐标，但**渲染网格在世界坐标下自动接合**，相邻地块不能出现断裂。
- 不要给每块完整挤出一个圆角长方体；那会在山体形成肥皂块，在坑内形成尖锐直角。
- `smoothHeight(grid,x,z)` 在格子交界左右各约 `0.095` 格宽内进行 C1 连续高度过渡；大部分格子中心保持平面，人物卡能够稳定落在原格心。
- `softHeightTile` 用每格24×24细分采样连续高度；同一世界坐标在相邻格子的高度完全相同，**凸起、凹坑均连续平滑**。
- 着色器通过 `uTerrain` 与地形真实表面法线将平坦草皮过渡到土色陡坡；人物、设施牌不受该材质混色影响。
- 表层永远维持同类型轻微明暗交替，棋格和地形数据 16×6 全部使用同一个 `terrain.center(c,r)` API。
- 地块升降 `-3…+3` 后只由引擎根据 `revision` 自动重建实际WebGL地表，不得回退到CSS背景、手画遮罩或96个浮动独立积木。
- 浏览器截图必须检查 `14-6x16-connected-rounded-hills-and-pits.png`：多块+3山地连成整体、多块-3坑地拐角圆润、卡牌位置不偏移。


## 自动验收与截图

修改地形引擎或战场后要让 GitHub 的 `Tactile one-on-one card battle QA` 通过，检查：
1. 真WebGL上下文与角色贴图正确加载。
2. 全部96块地块和人物／设施卡位的世界坐标严格相等。
3. 相邻地块色差稳定但不杂乱；同材质且同高度自动连接。
4. 使用真实指针选择挖掘卡／堆土卡，可以连续降低到-3并上升到+3，超限不可更改。
5. 取消高亮后，分别截图-3深坑、+3土山及组合场地，验证是真实WebGL而非效果图。
6. 重置能使96格全部恢复0高度，人物卡战斗与旧菜单入口不损坏。

该文档保留核心设计约束，以免后续助手从零重新设计造成不兼容。

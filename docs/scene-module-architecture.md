# 场景底层模块化契约（Night Harbor Scene Modules）

本文件记录对早期 `atlas-explorer.js` 单文件堆积的纠正。目标是扩展一个城市/建筑时**新增一个场景模块或地点模板**，而不是修改游戏根页面和一千行 UI 事件代码。现阶段修的是工程结构，并不等于国家级游戏内容已经完成。

## 当前真实目录边界

| 模块 | 职责 | 可独立替换 |
| --- | --- | --- |
| `site/core/runtime.js` | 系统依赖关系、命令、日期推进、存档状态流 | 是，已存在 |
| `site/systems/geography.js` | 全局地点、走过区域、室内ID、地图转移的**权威存档** | 是 |
| `site/world/national-atlas.js` | 国家地貌、区域坐标、道路/铁路/航道图、地点分类 | 是 |
| `site/world/walkable-street.js` | Canvas 渲染及**局部移动/碰撞/门口寻路**；没有全国持久经济 | 是 |
| `site/world/interiors.js` | 允许注册/移除室内模板、不同类型建筑布局 | 是 |
| `site/scenes/core/scene-host.js` | 场景注册表；`render→mount→unmount` 生命周期 | 是 |
| `site/scenes/modules/national-street.js` | 地面场景HTML和步行引擎生命周期适配器 | 是 |
| `site/scenes/modules/national-interior.js` | 室内平面图展示和房间点击 | 是 |
| `site/scenes/modules/national-map.js` | 附近地图的纯渲染 | 是 |
| `site/scenes/modules/national-transport.js` | 可选交通模式与路线结果纯渲染 | 是 |
| `site/world/atlas-explorer.js` | 场景切换协调器；不负责绘制人物、街景、房间 | 是 |
| `site/scenes/explore.js` | 原有五个剧情实景、角色对话与开场动画 | **历史模块，尚未迁入新场景注册表** |

## 场景插件的实际接口

```js
{
  id: 'industrial-workshop',
  render(context) { return '<section>...</section>'; },
  mount(root,context) { return {destroy(){ /* release listeners / raf */ }}; },
  dispose(instance) { instance?.destroy(); }
}
```

通过 `createSceneHost` 的 `register` 添加；`unregister` 删除或在当前激活时自动卸载；`render` 切换时先停止旧场景；`mount` 不得重复；`unmount` 清掉旧场景的事件监听、Canvas动画和临时对象。地图、经济/人口/交通存档**不归** UI 场景插件所有。

## 建筑扩展原则

建筑在 `streetBuildingsAt(x,y)` 中取得**稳定ID**，室内模板在 `interiors.js` 中独立注册；同一栋楼进入/退出时始终读取同一ID。新增小酒馆/医院/工厂等建筑优先扩展室内注册模板，并接入具体的经营系统命令，而不是复制一个 HTML 弹窗。可删除/停用一个室内模板而不破坏地图交通数据。真正的每栋楼专属行为/楼层/营业NPC仍需要后续独立实现。

## 仍然不符合的地方

1. 老剧情场景 `office/alley/market/labor/docks` 仍在 `site/scenes/explore.js` 的独立旧系统内，还未统一迁移到新生命周期注册表。
2. `national-atlas.js` 中的区域数据仍是静态数组，不是可热加载国家地形资产包；没有真正的省县行政区划文件。
3. 街道绘画和移动逻辑仍在 `walkable-street.js` 一个文件中，日后应继续拆分道路图层、人物控制器和近场模拟调度。
4. 交通只是真实图数据寻路和区域状态更新，并非逐辆车辆物理模拟；商店NPC不是真的按照经济订单完成进出收银。
5. 当前全局场景入口仍借用旧 UI 的 DOM 点击代理，未来应该迁到独立的 `scene-router` 以统一原剧情与国家场景。

不允许将当前模块化改善描述为“全国每栋建筑都已经拥有完美独立真实场景”。

# Paperchalk World — 3D 开放纸艺体素世界

Paperchalk World 当前主线是 **Three.js 3D 开放世界 + 流式三维体素地形 + 2D 纸片角色/实体**。序章、横版城市马路和有限 Z 舞台已经从正式运行时删除。

```text
ECS / gameplay (X,Y,Z)
        ↓
TerrainWorld 3D voxel chunks (16×16×16)
        ↓
streamed procedural world around player
        ↓
Three.js paper / voxel renderers
```

## 当前世界架构

- 世界模式：`infinite-voxel-3d`
- 玩家可在 X/Z 地面平面自由移动，Y 负责重力、跳跃、飞行和地下空间
- WASD 为相对镜头方向的 3D 移动；镜头支持拖拽环绕与滚轮缩放
- 地形是完整三维体素，不再锁定单一 Z 行
- 每个 chunk 为 16×16×16 体素，未修改区域由 seed 确定性生成
- 地表、土层、石层、洞穴与生物群系使用 FastNoiseLite 1.1.1
- Chunk 使用面剔除、greedy meshing 和 chunk-local BufferGeometry，避免一方块一 Mesh
- 地形编辑只保存 delta，可挖掘、放置并持久化
- 水体、钓鱼、饥饿、昼夜、火把、NPC AI、对话与任务系统继续保留
- 玩家/NPC 继续使用 PaperSpriteEntity 纸片角色，可与真正 3D 地形共存
- Paper003、草地/泥土材质和纸艺表面效果继续作为美术层，不改变 3D 世界规则

## 性能策略

开放世界通过**流式加载**实现，不会一次生成整个世界。当前默认预算：

- 水平可见 chunk 半径：2（玩家周围 5×5 区域）
- 垂直 chunk 半径：1
- 每帧最多新建 3 个体素 chunk
- WebGL DPR 上限：1.35
- NPC AI：20 Hz，完整模拟范围缩到 16 m
- 没有水和鱼时跳过鱼类生态模拟
- 体积光默认关闭；保留运行时开关，默认使用低成本大气参数
- `game.js` 保持 83 KB 硬预算；开放世界兼容逻辑拆到独立轻量模块

这些限制只控制当前加载和渲染成本，不限制世界坐标范围。

## 操作

- `W / A / S / D`、方向键：相对镜头方向移动
- `Space`：跳跃
- `V`：调试飞行开关
- 飞行时 `Space`：上升
- 飞行时 `Shift / C`：下降
- 左键：挖掘
- 右键：放置
- `E`：NPC 交谈
- `B`：背包
- `M`：世界地图
- 鼠标拖动：环绕镜头
- 滚轮：缩放镜头

## 在线版本

https://g2066203208-beep.github.io/paperchalk-world/

## 架构原则

1. Gameplay 是完整 X/Y/Z 体素世界，不再把 Z 当成只用于分层的视觉轴。
2. 世界坐标近似无限；只对玩家附近 chunk 做生成、网格构建、更新与渲染。
3. TerrainWorld 是地形与碰撞权威数据源，渲染器只负责视觉表现。
4. PaperSpriteEntity 可继续承载角色和需要纸片风格的实体，不妨碍 3D 地形和 3D 导航。
5. 体素编辑只保存 delta；其余区域始终从 seed 重建。
6. 高成本效果必须能降级或关闭，新增系统不得破坏性能预算。

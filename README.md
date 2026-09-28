# Paperchalk World — Paper Stage Voxel

Paperchalk World 现在采用 **Three.js 3D 舞台 + Terraria 式单层体素地形 + 2D 纸片实体**。

这不是完整 3D 建模世界，也不是 Minecraft 式三维体素世界。正式玩法只发生在一个 X/Y 平面中；Z 轴只用于舞台前后层级、遮挡、纸片翻面和调试镜头。

```text
固定 Z 轴摄像机
        ↓
Three.js Paper Stage
        ↓
┌──────────────────────────┐
│ 远景 Plane / 中景 Plane  │
│ 建筑 Plane / 树 Plane    │
│ 玩家 Plane / NPC Plane   │
│                          │
│ X × Y × 1 Voxel Terrain  │
└──────────────────────────┘
```

## 当前实现

- **单层体素地形**：0.25 m 方块，Chunk 为 64×64×1。
- **地下连续生成**：Chunk 按玩家 X/Y 动态加载，Y 允许负值；当前世界边界预留到 -1024 m。
- **FastNoiseLite 1.1.1**：MIT 许可，OpenSimplex2S / Perlin / Cellular 用于地表、洞穴和矿物分布。
- **增量破坏**：挖掉或放置的 tile 只记录 delta，不保存整张程序地图。
- **纸片实体**：玩家、建筑、树、岩石、路牌全部使用 Three.js `PlaneGeometry + texture`。
- **纸片转身**：左右换向时 Plane 绕 Y 轴约 0.16 s 翻过 180°，中间会出现纸板侧边。
- **固定纸片舞台镜头**：默认沿 Z 轴看；调试面板可关闭锁定并自由旋转，也可切 X/Z 观察轴。
- **2D 碰撞逻辑**：玩家实际运动只有 X/Y；Z 恒定为舞台层 `0.36`。
- **地形挖掘**：固定舞台模式下左键挖方块，右键放置土块；编辑距离限制在玩家附近。
- **世界空间血条**：跟随玩家但独立于角色翻面，始终朝摄像机。
- **Schema V5 存档**：保存 X/Y 角色位置、背包、生命值和 `terrainDeltas`，支持负 Y 地下位置。
- **旧 2D DOM/Pixi/CardCamera 栈继续保持删除状态**。

## 操作

- `A / D` 或 `← / →`：左右移动
- `W / ↑ / Space`：跳跃
- `S / ↓ / C`：蹲下
- `J`：攻击
- 左键地形：挖除单层体素
- 右键地形：放置土块
- `B`：背包
- `M`：世界地图
- 滚轮：镜头距离
- 调试关闭“纸片舞台视角”后：拖动场景自由旋转镜头

## 核心代码

- `src/terrain/terrain-world.js`：X/Y×1 Chunk、生成、查询、碰撞和 delta。
- `src/entities/PaperSpriteEntity.js`：2D 纸片实体、运行时纹理和翻面转身。
- `src/engine3d/World3DEngine.js`：Three.js 舞台、Chunk meshing、纸片实体、镜头和交互。
- `src/game.js`：ECS、X/Y 运动、重力、体素碰撞、存档和 UI。
- `vendor/fastnoise-lite/FastNoiseLite.js`：FastNoiseLite 1.1.1（MIT）。

当前纸片纹理是运行时生成的程序化占位纹理，后续可以直接替换成正式 PNG/WebP 素材，而不用改变实体或地形架构。

## 在线版本

https://g2066203208-beep.github.io/paperchalk-world/

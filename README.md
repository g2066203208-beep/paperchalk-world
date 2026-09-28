# Paperchalk World — 单层体素纸片舞台

Paperchalk World 当前主线是 **Three.js 3D 舞台 + Terraria 式单层可破坏地形 + 2D 贴图实体**。

```text
ECS / gameplay (X,Y)
        ↓
single-layer TerrainWorld (X,Y × 1)
        ↓
Three.js paper stage
        ↓
Z only controls front/back paper layers
```

世界不是 Minecraft 式三维体素。只有玩家所在的中景地形是一层可挖、可放的方块网格；房屋、树木、岩石、玩家和后续 NPC/敌人都使用贴在 Three.js `PlaneGeometry` 上的 2D 纸片纹理。

## 当前实现

- 0.25 m 单元，64×64 cell 的单层 TerrainChunk
- TypedArray 地形存储
- Chunk 按玩家位置流式加载/卸载
- 地表、土层、石层、洞穴使用 **FastNoiseLite 1.1.1** 确定性程序生成（OpenSimplex2S + Perlin + Cellular）
- 地下 Y 可持续向负方向加载，不设置 3D 体素厚度
- Chunk 通过单个 BufferGeometry 合批，不是一方块一个 Mesh
- 左键挖掘、右键放置泥土
- 地形修改保存为 delta；Schema V5 可恢复挖过的洞
- 玩家碰撞、重力和跳跃全部在 X/Y 平面
- Gameplay Z 固定，只作为舞台层级
- 建筑、树、石头、玩家全部为 2D textured Plane
- 玩家左右换向使用纸片绕 Y 轴翻 180° 的转身效果
- 默认摄像机沿 Z 轴固定观察
- 调试中可关闭舞台锁定进入自由 3D 镜头，也可切 X/Z 观察轴
- 10 格世界空间血条继续跟随玩家
- 背包、地图、本地档案和 Android 壳继续保留

## 操作

- `A / D`、`← / →`：左右移动
- `Space`：跳跃
- 左键：挖掉指针位置的地形块
- 右键：放置泥土块
- `C`：蹲下
- `J`：攻击状态
- `B`：背包
- `M`：世界地图
- 滚轮：镜头距离
- 调试关闭“纸片舞台视角”后可拖动镜头自由查看这张单层世界

## 在线版本

https://g2066203208-beep.github.io/paperchalk-world/

## 架构原则

1. Three.js 是舞台和 WebGL 渲染器，不代表世界物体必须是 3D 模型。
2. Terrain 是唯一的 voxel/block 世界层，数据维度是 X/Y；Z 厚度不参与世界生成。
3. 非地形对象统一走 PaperSpriteEntity / PlaneGeometry。
4. 正常玩法只允许 X/Y 运动；Z 仅用于远景、中景、玩家、前景的纸片层次。
5. 地形修改只保存 delta，未修改区域始终由 seed 重建。
6. 程序地形使用官方 FastNoiseLite JavaScript 实现（MIT），并保留确定性 fallback，避免生成器成为单点故障。

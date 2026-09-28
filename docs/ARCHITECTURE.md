# Paperchalk World — Paper Stage Architecture

## 1. 生产世界定义

唯一的生产世界仍由 Three.js / WebGLRenderer 渲染，但游戏不是自由 3D 世界。

```text
Gameplay X/Y ECS
      │
      ├── TerrainWorld: X × Y × 1 voxel slice
      │
      └── Paper entities: PlaneGeometry
                ↓
         PaperchalkRuntime
                ↓
         World3DEngine
                ↓
          Three.js Scene
                ↓
          fixed Z camera
```

Z 轴是**舞台层级**，不是玩家自由移动轴。正常玩法中玩家固定在 `z=0.36`。

## 2. TerrainWorld

`src/terrain/terrain-world.js` 是地形数据权威。

- tile：0.25 m
- chunk：64×64 tile
- 厚度：单个 Z slice，渲染厚度 0.18 m
- 存储：每 Chunk 使用 `Uint16Array`
- 生成：FastNoiseLite 1.1.1
- Streaming：只保留玩家附近 Chunk 的 Three.js Mesh
- 修改：`setTile / breakTile / placeTile`
- 保存：仅保存 `terrainDeltas`

地下通过负 Y Chunk 延伸，而不是增加 Z 层。

## 3. Paper entities

除地形外，世界对象都走 `PaperSpriteEntity`：

- Player
- Building
- Tree
- Rock
- Prop
- 后续 NPC / Enemy / Item

每个实体的可见主体是 `PlaneGeometry`。正式素材可以换成 PNG/WebP 纹理；当前程序化 CanvasTexture 只是占位美术。

角色左右转身通过 Plane 绕 Y 轴翻转完成，不使用 3D 人体转身。

## 4. Gameplay collision

游戏逻辑只处理 X/Y：

- X：左右移动
- Y：跳跃、重力、地下深度
- Z：常量舞台层

玩家碰撞通过 TerrainWorld 的 tile AABB 查询完成。横向移动允许自动跨越最多两个 0.25 m tile 的台阶，避免每个地表像素都要求跳跃。

## 5. Renderer

`World3DEngine` 负责：

- PerspectiveCamera
- 默认固定 Z 轴纸片舞台镜头
- 调试自由镜头
- 单层 Chunk BufferGeometry
- PlaneGeometry 纸片实体
- 纸片翻身
- 世界空间血条
- 鼠标/触摸地形命中与挖/放
- Chunk dirty rebuild

DOM 仅用于菜单、背包、世界网络地图、镜头和调试 UI。

## 6. Persistence

Schema V5：

```json
{
  "player": {"x":0,"y":-12.25,"z":0.36,"yaw":0},
  "playerHp":10,
  "terrainDeltas":[[12,-53,0], [13,-53,0]],
  "inventory":[]
}
```

程序地形由 seed 重建；只持久化修改 delta，因此深地下不会要求保存整张世界。

## 7. 不允许回归的架构

以下内容不能重新成为生产世界：

- 自由 X/Z 地面移动
- 3D Box/Cylinder/Cone 建筑和树
- Minecraft 式 X/Y/Z 三维体素场
- PixiJS 世界渲染
- DOM CardCamera 世界
- DOM 玩家角色
- 旧 PaperPuppet 世界运行时

Three.js 可以继续提供真正的 3D 舞台空间，但正常美术对象必须保持纸片实体，地形必须保持单层 X/Y 体素切片。

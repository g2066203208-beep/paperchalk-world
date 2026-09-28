# Paper Stage Production Freeze

从 Paper Stage Voxel 版本起，以下规则作为生产架构门禁：

1. Three.js 是唯一世界渲染器，但正常游戏是 X/Y 侧视玩法。
2. Z 轴仅用于舞台层级、纸片厚度、遮挡和调试镜头；玩家不能在 Z 轴自由移动。
3. 可挖地形必须是 X×Y×1 的单层 Chunk 体素，不得扩成完整 3D Minecraft voxel world。
4. 地形 tile 尺寸当前固定 0.25 m，Chunk 64×64；修改只重建 dirty Chunk。
5. 建筑、树、玩家、NPC、道具和环境物体必须以 2D paper entity 为主，不得恢复程序化 Box/Cylinder 3D 世界。
6. 左右转身必须保留纸片 Y 轴翻面视觉。
7. 默认摄像机沿 Z 轴固定；自由 3D orbit 只属于调试能力。
8. 地形修改必须通过 delta 持久化；存档允许负 Y。
9. DOM 只用于屏幕 UI；不得重新成为世界实体渲染器。
10. PixiJS、CardCamera、PaperPuppet 旧世界栈不得重新进入生产路径。
11. 任何地形 meshing、streaming、纸片实体或热路径修改都必须通过真实 WebGL 浏览器回归。

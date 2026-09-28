# Paper Stage Single-Layer Cube Freeze

The production world is intentionally neither a flat 2D renderer nor a Minecraft-style deep voxel volume.

1. Three.js remains the sole world renderer.
2. Gameplay terrain data is strictly `Terrain[x][y]`; there is no second gameplay Z layer.
3. Every occupied terrain cell is rendered as a **true 3D cube** whose current dimensions are 0.25 × 0.25 × 0.25 m.
4. Terrain chunks use indexed BufferGeometry, exposed-face culling and greedy face merging. One block must never become one Three.js Mesh.
5. Greedy meshing must preserve visible per-block boundaries through repeated block UVs/material treatment.
6. Chunk vertices stay chunk-local; Mesh position carries world offsets to preserve precision far from origin.
7. Editing a chunk boundary invalidates the adjacent chunk because its exposed side faces may change.
8. Desktop controls: left click digs, right click places. Touch controls provide explicit 挖/放 tool state.
9. Dig/place operates on the X/Y cell selected on the front surface of the sole cube layer; edits remain persisted as terrain deltas.
10. Player/NPC/building/tree/prop visuals remain paper PlaneGeometry entities unless a specific feature explicitly requires otherwise.
11. Default camera remains fixed along Z for the Terraria-like paper-stage composition; free orbit is debug-only.
12. PixiJS, DOM CardCamera and the retired 2D world renderer stack must not return.
13. Any meshing, interaction or hot-path change requires static architecture tests plus real-browser WebGL regression coverage.

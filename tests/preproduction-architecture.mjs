import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),terrain=read('src/terrain/terrain-runtime.js'),mesher=read('src/terrain/voxel-block-mesh.js'),renderer=read('src/renderers/three-world-renderer.mjs'),content=read('src/content/game-content.js');

assert.match(html,/voxel3d-r29/);
assert.match(renderer,/three-r180-infinite-voxel-3d/);
assert.match(terrain,/class TerrainWorld/);
assert.match(mesher,/buildVoxelChunkGeometry/);
assert.match(game,/PLAYER_ROW_CENTER_Z/);
assert.match(game,/velocity\.z=0/);

assert.match(engine,/mix\(0\.82,1\.18,colorHash\)/);
assert.match(terrain,/class WaterWorld/);
assert.match(terrain,/levels:8/);
assert.match(terrain,/finite-active-cell-downhill-search-plus-equilibrium/);
assert.match(game,/placeWaterCell/);
assert.match(game,/waterStepAccumulator>=\.06/);
assert.match(content,/'water-bucket'/);
assert.match(engine,/class WaterRenderer/);
assert.match(engine,/chunked-visible-surface-water-v2/);
assert.match(engine,/internalFacesCulled:true/);
assert.match(terrain,/_findDropDirection/);
assert.match(terrain,/submersionAABB/);
assert.match(game,/buoyancy=GRAVITY\*1\.18\*submerged/);

console.log('INFINITE_VOXEL_3D_ARCHITECTURE_OK');

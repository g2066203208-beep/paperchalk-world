const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),content=read('src/content/game-content.js'),terrain=read('src/terrain/terrain-runtime.js'),mesher=read('src/terrain/voxel-block-mesh.js');

assert(html.includes('voxel3d-r28'),'build key missing');
assert(content.includes("mode:'infinite-voxel-3d'"),'world mode missing');
assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(mesher.includes('buildVoxelChunkGeometry'),'voxel mesher missing');
assert(engine.includes('TerrainChunkRenderer'),'terrain renderer missing');
assert(engine.includes("camera-player-capsule-fade-v2"),'camera obstruction missing');
assert(engine.includes("backgroundMode:'fixed-uniform-blue'"),'fixed background missing');

assert(engine.includes('mix(0.82,1.18,colorHash)'),'visible per-voxel color variation missing');
assert(engine.includes("paperchalk-color-variation-water-v14"),'color/water shader cache key missing');

assert(terrain.includes('class WaterWorld'),'WaterWorld missing');
assert(terrain.includes('Math.min(8'),'eight-layer clamp missing');
assert(terrain.includes('const dirs=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]'),'four-way water flow missing');
assert(terrain.includes('Gravity always wins'),'downward water flow missing');
assert(terrain.includes("flowModel:'gravity-plus-four-neighbor-discrete-equilibrium'"),'water flow stats missing');
assert(game.includes('placeWaterCell'),'water placement action missing');
assert(game.includes("terrainToolMode==='water'"),'water tool mode missing');
assert(game.includes('waterStepAccumulator>=.10'),'water simulation tick missing');
assert(game.includes('save.waterCells=terrain.water.exportState()'),'water save missing');
assert(game.includes('terrain.water.importState(save.waterCells)'),'water load missing');
assert(content.includes("'water-bucket'"),'water bucket item missing');
assert(engine.includes('class WaterRenderer'),'water renderer missing');
assert(engine.includes("name='water-slabs-1-of-8'"),'8-slab water mesh missing');
assert(engine.includes('for(let layer=0;layer<level;layer++)'),'stacked water layers missing');
assert(engine.includes("renderMode:'instanced-eight-slab-water'"),'water render mode missing');

console.log('WEB_INFINITE_VOXEL_3D_SMOKE_OK');

const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),content=read('src/content/game-content.js'),terrain=read('src/terrain/terrain-runtime.js'),mesher=read('src/terrain/voxel-block-mesh.js');

assert(html.includes('voxel3d-r29'),'build key missing');
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
assert(terrain.includes('Gravity has absolute priority'),'downward water flow missing');
assert(terrain.includes("flowModel:'finite-active-cell-downhill-search-plus-equilibrium'"),'water flow stats missing');
assert(game.includes('placeWaterCell'),'water placement action missing');
assert(game.includes("terrainToolMode==='water'"),'water tool mode missing');
assert(game.includes('waterStepAccumulator>=.06'),'water simulation tick missing');
assert(game.includes('save.waterCells=terrain.water.exportState()'),'water save missing');
assert(game.includes('terrain.water.importState(save.waterCells)'),'water load missing');
assert(content.includes("'water-bucket'"),'water bucket item missing');
assert(engine.includes('class WaterRenderer'),'water renderer missing');
assert(engine.includes("renderMode:'chunked-visible-surface-water-v2'"),'optimized water render mode missing');
assert(engine.includes('internalFacesCulled:true'),'internal water faces are not culled');
assert(engine.includes('water.getLevel(gx-1,gy,gz)'),'adjacent water side-face culling missing');
assert(terrain.includes('_findDropDirection'),'downhill outlet search missing');
assert(terrain.includes('addVolume(gx,gy,gz,units=8)'),'shared finite water volume missing');
assert(terrain.includes('submersionAABB'),'water submersion query missing');
assert(game.includes('buoyancy=GRAVITY*1.18*submerged'),'swimming buoyancy missing');
assert(game.includes("controller.action=controller.moving||Math.abs(velocity.y)>.15?'swim':'float'"),'swim animation state missing');

console.log('WEB_INFINITE_VOXEL_3D_SMOKE_OK');

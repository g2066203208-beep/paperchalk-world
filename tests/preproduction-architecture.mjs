import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html'),game=read('src/game.js'),engine=read('src/engine3d/World3DEngine.js'),terrain=read('src/terrain/terrain-runtime.js'),biome=read('src/terrain/biome-generator.js'),mesher=read('src/terrain/voxel-block-mesh.js'),renderer=read('src/renderers/three-world-renderer.mjs'),content=read('src/content/game-content.js');

assert.match(html,/voxel3d-r39/);
assert.match(renderer,/three-r180-infinite-voxel-3d/);
assert.match(terrain,/class TerrainWorld/);
assert.match(mesher,/buildVoxelChunkGeometry/);
assert.match(game,/PLAYER_ROW_CENTER_Z/);
assert.match(game,/velocity\.z=0/);

assert.match(html,/biome-generator\.js/);
assert.match(biome,/class BiomeLandformGenerator/);
assert.match(biome,/continental/);
assert.match(biome,/erosion/);
assert.match(biome,/ridge/);
assert.match(biome,/temperature/);
assert.match(biome,/moisture/);
assert.match(biome,/riverMask/);
assert.match(biome,/mountainMask/);
assert.match(terrain,/terrainProfile\(gx,gz=0\)/);
assert.match(terrain,/surfaceTile\(gx,gz=0\)/);
assert.match(terrain,/generatorVersion=4/);
assert.match(game,/PaperchalkBiomes/);

assert.match(terrain,/priority-flood-shared-volume-hydrostatic-v2/);
assert.match(terrain,/full-x-z-with-y-gravity/);
assert.match(terrain,/exactHydrostatic:true/);
assert.match(terrain,/surfaceCache/);
assert.match(terrain,/boundsCache/);
assert.match(terrain,/columnBounds\(gx,gz\)/);
assert.match(engine,/chunked-visible-surface-water-v4-animated/);
assert.match(engine,/internalFacesCulled:true/);

assert.match(content,/'fishing-rod'/);
assert.match(content,/'paper-carp'/);
assert.match(game,/castFishingRod/);
assert.match(game,/playerWaterContact/);
assert.match(game,/screenToWaterSurface/);
assert.match(engine,/screenToWaterSurface/);
assert.match(engine,/chunked-visible-surface-water-v4-animated/);
assert.match(terrain,/priority-flood-shared-volume-hydrostatic-v2/);
assert.match(terrain,/visualTransition/);
assert.match(terrain,/closed solid terrain volume/);
assert.match(game,/reelFishingRod/);
assert.match(game,/fishing\.state==='bite'/);
assert.match(engine,/class FishingRenderer/);
assert.match(game,/PaperchalkFishEcology/);
assert.match(game,/updateFishEcology\(dt\)/);
assert.match(game,/rebuildFishSpatial/);
assert.match(game,/acquireFishForBobber/);
assert.match(engine,/class FishSchoolRenderer/);
assert.match(engine,/pooled-instanced-paper-fish/);
assert.match(engine,/worldspace-bite-ui/);

assert.match(game,/HUNGER_DRAIN_PER_SECOND/);
assert.match(game,/PaperchalkHunger/);
assert.match(game,/item\.action==='eat'/);
assert.match(html,/hungerFill/);

assert.match(engine,/flatShading:true/);
assert.match(engine,/coarse\?1\.5:2/);
assert.match(game,/terrain\.water\.needsSettle/);

console.log('INFINITE_VOXEL_3D_ARCHITECTURE_OK');

import fs from 'node:fs';
function assert(c,m){if(!c)throw new Error(m)}
const size=p=>fs.statSync(p).size;
assert(size('src/game.js')<80000,'gameplay runtime exceeds 80KB budget');
assert(size('src/engine3d/World3DEngine.js')<56000,'paper-stage engine exceeds 56KB budget');
assert(size('src/terrain/terrain-runtime.js')<24000,'terrain runtime exceeds 24KB budget');
assert(size('src/terrain/water-runtime.js')<22000,'water runtime exceeds 22KB budget');
assert(size('src/terrain/voxel-block-mesh.js')<24000,'cube mesher exceeds 24KB budget');
assert(size('src/terrain/voxel-mesh-worker.js')<16000,'worker mesher exceeds 16KB budget');
assert(size('src/engine3d/EnvironmentFX.js')<14000,'weather FX exceeds 14KB budget');
assert(size('src/engine3d/FarTerrainRenderer.js')<8000,'far terrain renderer exceeds 8KB budget');
assert(size('src/engine3d/OceanRenderer.js')<8000,'ocean renderer exceeds 8KB budget');
assert(size('src/engine3d/EcologyRenderer.js')<8000,'ecology renderer exceeds 8KB budget');
assert(size('src/entities/PaperSpriteEntity.js')<16000,'paper entity runtime exceeds 16KB budget');
assert(size('vendor/fastnoise-lite/FastNoiseLite.js')<125000,'FastNoiseLite vendor exceeds 125KB budget');
assert(size('styles/game.css')<30000,'UI stylesheet exceeds 30KB budget');
assert(size('index.html')<19000,'HTML shell exceeds 19KB budget');
assert(fs.existsSync('assets/player/protagonist.webp'),'authored protagonist paper asset missing');
assert(size('assets/player/protagonist.webp')<100000,'protagonist paper asset exceeds 100KB budget');
assert(!fs.existsSync('vendor/pixi'),'Pixi vendor tree should remain removed');
console.log(JSON.stringify({
  ok:true,
  game:size('src/game.js'),
  engine:size('src/engine3d/World3DEngine.js'),
  terrain:size('src/terrain/terrain-runtime.js'),
  water:size('src/terrain/water-runtime.js'),
  cubeMesher:size('src/terrain/voxel-block-mesh.js'),
  workerMesher:size('src/terrain/voxel-mesh-worker.js'),
  weather:size('src/engine3d/EnvironmentFX.js'),
  farTerrain:size('src/engine3d/FarTerrainRenderer.js'),
  ocean:size('src/engine3d/OceanRenderer.js'),
  ecology:size('src/engine3d/EcologyRenderer.js'),
  sprites:size('src/entities/PaperSpriteEntity.js'),
  fastNoise:size('vendor/fastnoise-lite/FastNoiseLite.js'),
  css:size('styles/game.css'),
  html:size('index.html'),
  protagonist:size('assets/player/protagonist.webp')
}));

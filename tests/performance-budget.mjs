import fs from 'node:fs';
function assert(c,m){if(!c)throw new Error(m)}
const size=p=>fs.statSync(p).size;
assert(size('src/game.js')<75000,'gameplay runtime exceeds 75KB budget');
assert(size('src/engine3d/World3DEngine.js')<55000,'paper-stage engine exceeds 55KB budget');
assert(size('src/terrain/terrain-world.js')<26000,'terrain runtime exceeds 26KB budget');
assert(size('src/entities/PaperSpriteEntity.js')<18000,'paper entity runtime exceeds 18KB budget');
assert(size('vendor/fastnoise-lite/FastNoiseLite.js')<125000,'FastNoiseLite vendor unexpectedly large');
assert(size('styles/game.css')<30000,'UI stylesheet exceeds 30KB budget');
assert(size('index.html')<19000,'HTML shell exceeds 19KB budget');
assert(!fs.existsSync('assets'),'legacy world art tree should remain absent until curated paper textures are added');
assert(!fs.existsSync('vendor/pixi'),'Pixi vendor tree should remain removed');
console.log(JSON.stringify({
  ok:true,
  game:size('src/game.js'),
  engine:size('src/engine3d/World3DEngine.js'),
  terrain:size('src/terrain/terrain-world.js'),
  paperEntity:size('src/entities/PaperSpriteEntity.js'),
  fastNoise:size('vendor/fastnoise-lite/FastNoiseLite.js'),
  css:size('styles/game.css'),
  html:size('index.html')
}));

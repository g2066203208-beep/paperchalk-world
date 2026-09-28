const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const size=p=>fs.statSync(p).size;
assert(size('src/game.js')<70000,'3D gameplay runtime exceeds 70KB budget');
assert(size('src/engine3d/World3DEngine.js')<50000,'3D engine exceeds 50KB budget');
assert(size('styles/game.css')<30000,'3D/UI stylesheet exceeds 30KB budget');
assert(size('index.html')<18000,'HTML shell exceeds 18KB budget');
assert(!fs.existsSync('assets'),'legacy raster/SVG asset tree should be removed from the procedural 3D runtime');
assert(!fs.existsSync('vendor/pixi'),'Pixi vendor tree should be removed');
console.log(JSON.stringify({ok:true,game:size('src/game.js'),engine:size('src/engine3d/World3DEngine.js'),css:size('styles/game.css'),html:size('index.html')}));

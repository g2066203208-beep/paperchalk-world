import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const demo=read('visual-demo.html');
const main=read('src/main.js');
const css=read('styles/main.css');
const runtime=read('src/core/GameRuntime.js');
const input=read('src/input/InputManager.js');
const terrain=read('src/world/TerrainQuery.js');
const player=read('src/player/PlayerController.js');

const demoStyle=demo.slice(demo.indexOf('<style>')+7,demo.indexOf('</style>')).trim();
assert.equal(css.trim(),demoStyle,'production CSS must preserve the visual-demo stylesheet exactly');

assert.match(index,/href="\.\/styles\/main\.css"/);
assert.match(index,/src="\.\/src\/main\.js"/);
assert.doesNotMatch(index,/<script type="module">\s*import \* as THREE/);
assert.doesNotMatch(index,/<style>[\s\S]{1000}/);

assert.match(main,/from '\.\.\/vendor\/three\/three\.module\.js'/);
assert.match(main,/from '\.\/core\/GameRuntime\.js'/);
assert.match(main,/from '\.\/input\/InputManager\.js'/);
assert.match(main,/from '\.\/world\/TerrainQuery\.js'/);
assert.match(main,/from '\.\/player\/PlayerController\.js'/);
assert.match(main,/PerspectiveCamera\(36/);
assert.match(main,/let yaw=\.02,pitch=\.18,dist=19\.2/);
assert.match(main,/DPR_CAP=innerWidth<760\?1\.05:1\.22/);
assert.match(main,/\.\.\/assets\/player\/protagonist\.webp/);
assert.match(main,/architecture:'visual-demo-modular-game-foundation'/);
assert.match(main,/gameRuntime\.register\(playerController\)/);
assert.match(main,/gameRuntime\.update\(dt,\{camera\}\)/);

assert.match(runtime,/class GameRuntime/);
assert.match(input,/ArrowLeft/);
assert.match(input,/ArrowRight/);
assert.match(input,/KeyA/);
assert.match(input,/KeyD/);
assert.match(terrain,/class TerrainQuery/);
assert.match(terrain,/surfaceY/);
assert.match(player,/class PlayerController/);
assert.match(player,/this\.input\.horizontal\(\)/);
assert.match(player,/terrain\.clamp/);
assert.match(player,/syncShadow/);

assert.ok(fs.existsSync('legacy-main.html'),'retired legacy main entry must remain archived');
console.log('DEMO_MODULAR_MAIN_STATIC_OK');

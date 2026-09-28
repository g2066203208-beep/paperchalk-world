const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const game=read('src/game.js');
const engine=read('src/engine3d/World3DEngine.js');
const renderer=read('src/renderers/three-world-renderer.mjs');
const content=read('src/content/game-content.js');
const terrain=read('src/terrain/terrain-runtime.js');
const sprites=read('src/entities/PaperSpriteEntity.js');
const save=read('src/core/save-runtime.js');
const css=read('styles/game.css');

assert(html.includes('paperchalk-build" content="paper-terrain-r1"'),'paper-stage build key missing');
assert(html.includes('id="threeWorldLayer"'),'Three.js stage host missing');
assert(html.includes('src="./src/terrain/terrain-runtime.js?v=paper-terrain-r1"'),'terrain runtime not booted');
assert(html.includes('src="./src/renderers/three-world-renderer.mjs?v=paper-terrain-r1"'),'paper-stage renderer not loaded');
assert(!html.includes('pixiEntityLayer')&&!html.includes('cardGroundCanvas'),'retired 2D renderer layers remain');
assert(!html.includes('class="actor"')&&!html.includes('playerHealthHud'),'retired DOM actor/HUD remains');

for(const path of [
  'src/core/card-camera.js','src/camera-settings.js','src/renderers/dom-card-projection.js',
  'src/renderers/pixi-dynamic-renderer.mjs','src/puppet/paper-puppet-runtime.mjs','vendor/pixi/pixi-8.21.0.mjs'
])assert(!fs.existsSync(path),'retired renderer file remains: '+path);

assert(fs.existsSync('vendor/three/three.module.js'),'Three.js module missing');
assert(fs.existsSync('src/terrain/terrain-runtime.js'),'single-layer terrain runtime missing');
assert(fs.existsSync('src/entities/PaperSpriteEntity.js'),'paper entity runtime missing');

assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(terrain.includes('Uint8Array'),'chunk tile storage must be typed');
assert(terrain.includes('chunkSize=64'),'64x64 single-layer chunks missing');
assert(terrain.includes("tileSize=.25"),'0.25m terrain cell size missing');
assert(terrain.includes('digWorld(x,y)')&&terrain.includes('placeWorld(x,y'),'dig/place terrain mutation missing');
assert(terrain.includes('exportEdits()')&&terrain.includes('importEdits(rows)'),'terrain delta persistence missing');

assert(engine.includes('class TerrainChunkRenderer'),'chunk renderer missing');
assert(engine.includes("this.root.name='single-layer-voxel-terrain'"),'terrain is not a single stage layer');
assert(engine.includes('new THREE.BufferGeometry'),'batched chunk BufferGeometry missing');
assert(engine.includes("worldMode:'paper-stage-2.5d'"),'paper-stage world mode missing');
assert(engine.includes("terrainMode:'single-layer-voxel'"),'single-layer voxel mode missing');
assert(engine.includes("entityMode:'2d-textured-planes'"),'2D paper entity mode missing');
assert(!engine.includes('_buildBuilding(')&&!engine.includes('_buildTree('),'legacy 3D procedural building/tree constructors remain');
assert(engine.includes('this.stageView={enabled:true,axis:\'z\',side:1}'),'fixed Z paper-stage camera missing');
assert(engine.includes('setStageView(enabled'),'debug free-camera toggle missing');
assert(engine.includes('screenToWorld(clientX,clientY)'),'screen-to-terrain projection missing');
assert(engine.includes('new THREE.WebGLRenderer'),'WebGLRenderer missing');

assert(sprites.includes('new THREE.PlaneGeometry(width,height)'),'paper entities must use PlaneGeometry');
assert(sprites.includes('setFacing(direction)'),'paper flip/turn API missing');
assert(sprites.includes('this.targetFlip=direction<0?Math.PI:0'),'paper 180-degree turn target missing');

assert(game.includes('new TerrainRuntime.TerrainWorld'),'game does not own terrain runtime');
assert(game.includes("ecs.registerSystem('player-movement'"),'ECS movement system missing');
assert(game.includes("ecs.registerSystem('player-gravity'"),'gravity system missing');
assert(game.includes('terrain.collidesAABB'),'terrain collision missing');
assert(game.includes('digTerrainAt')&&game.includes('placeTerrainAt'),'runtime terrain interaction missing');
assert(game.includes('save.terrainEdits=terrain.exportEdits()'),'terrain edits are not saved');
assert(game.includes('terrain.importEdits(save.terrainEdits)'),'terrain edits are not restored');
assert(!game.includes('cameraRelativeMove'),'3D camera-relative movement must be gone');

assert(content.includes("mode:'paper-stage-2.5d'"),'paper-stage content mode missing');
assert(content.includes('stageEntities'),'paper stage entities missing');
assert(!content.includes('buildings:[')&&!content.includes('trees:['),'legacy volumetric scene lists remain');
assert(save.includes('CURRENT_SCHEMA=5'),'paper-stage save schema not active');
assert(save.includes('terrainEdits'),'terrain delta save field missing');
assert(css.includes('.three-world-canvas'),'stage canvas styling missing');

console.log('WEB_PAPER_STAGE_SMOKE_OK');

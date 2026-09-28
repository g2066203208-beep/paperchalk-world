const fs=require('fs');
function assert(c,m){if(!c)throw new Error(m)}
const read=p=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const game=read('src/game.js');
const engine=read('src/engine3d/World3DEngine.js');
const renderer=read('src/renderers/three-world-renderer.mjs');
const content=read('src/content/game-content.js');
const terrain=read('src/terrain/terrain-runtime.js');
const cubeMesher=read('src/terrain/voxel-block-mesh.js');
const sprites=read('src/entities/PaperSpriteEntity.js');
const save=read('src/core/save-runtime.js');
const css=read('styles/game.css');

assert(html.includes('paperchalk-build" content="stage-wall-r1"'),'paper-stage build key missing');
assert(html.includes('id="threeWorldLayer"'),'Three.js stage host missing');
assert(html.includes('src="./vendor/fastnoise-lite/FastNoiseLite.js?v=1.1.1"'),'FastNoiseLite vendor not booted');
assert(html.indexOf('FastNoiseLite.js?v=1.1.1')<html.indexOf('terrain-runtime.js?v=stage-wall-r1'),'FastNoiseLite must boot before terrain runtime');
assert(html.includes('src="./src/terrain/terrain-runtime.js?v=stage-wall-r1"'),'terrain runtime not booted');
assert(html.includes('src="./src/renderers/three-world-renderer.mjs?v=stage-wall-r1"'),'paper-stage renderer not loaded');
assert(!html.includes('pixiEntityLayer')&&!html.includes('cardGroundCanvas'),'retired 2D renderer layers remain');
assert(!html.includes('class="actor"')&&!html.includes('playerHealthHud'),'retired DOM actor/HUD remains');

for(const path of [
  'src/core/card-camera.js','src/camera-settings.js','src/renderers/dom-card-projection.js',
  'src/renderers/pixi-dynamic-renderer.mjs','src/puppet/paper-puppet-runtime.mjs','vendor/pixi/pixi-8.21.0.mjs'
])assert(!fs.existsSync(path),'retired renderer file remains: '+path);

assert(fs.existsSync('vendor/three/three.module.js'),'Three.js module missing');
assert(fs.existsSync('vendor/fastnoise-lite/FastNoiseLite.js'),'FastNoiseLite vendor missing');
assert(fs.existsSync('src/terrain/terrain-runtime.js'),'single-layer terrain runtime missing');
assert(fs.existsSync('src/terrain/voxel-block-mesh.js'),'single-layer cube mesher missing');
assert(fs.existsSync('src/entities/PaperSpriteEntity.js'),'paper entity runtime missing');

assert(terrain.includes('class TerrainWorld'),'TerrainWorld missing');
assert(terrain.includes("noiseBackend='FastNoiseLite-1.1.1'"),'FastNoiseLite production terrain backend missing');
assert(terrain.includes('OpenSimplex2S'),'OpenSimplex2S surface/cave generator missing');
assert(terrain.includes('Perlin'),'Perlin detail generator missing');
assert(terrain.includes('Cellular'),'Cellular strata generator missing');
assert(terrain.includes('Uint8Array'),'chunk tile storage must be typed');
assert(terrain.includes('chunkSize=64'),'64x64 single-layer chunks missing');
assert(terrain.includes("tileSize=1")&&terrain.includes("pixelsPerMeter=128"),'1m / 128px terrain scale missing');
assert(terrain.includes('digWorld(x,y)')&&terrain.includes('placeWorld(x,y'),'dig/place terrain mutation missing');
assert(terrain.includes('exportEdits()')&&terrain.includes('importEdits(rows)'),'terrain delta persistence missing');
assert(terrain.includes('peekTile(gx,gy)'),'non-loading border lookup missing');

assert(cubeMesher.includes('buildSingleLayerCubeGeometry'),'3D cube terrain mesher missing');
assert(cubeMesher.includes('greedyRectangles'),'greedy meshing missing');
assert(cubeMesher.includes('culledFaces'),'internal face culling statistics missing');
assert(cubeMesher.includes('chunk-local Float32 coordinates'),'large-world local-coordinate meshing invariant missing');

assert(engine.includes('class TerrainChunkRenderer'),'chunk renderer missing');
assert(engine.includes("this.root.name='single-layer-3d-cube-terrain'"),'terrain is not a single 3D cube layer');
assert(cubeMesher.includes('new THREE.BufferGeometry'),'batched chunk BufferGeometry missing');
assert(engine.includes('MeshLambertMaterial'),'lit 3D cube terrain material missing');
assert(engine.includes('screenToTerrainCell(clientX,clientY'),'terrain cell targeting API missing');
assert(engine.includes("worldMode:'paper-stage-2.5d'"),'paper-stage world mode missing');
assert(engine.includes("terrainMode:'single-layer-3d-cubes'"),'single-layer 3D cube terrain mode missing');
assert(engine.includes("entityMode:'2d-textured-planes'"),'2D paper entity mode missing');
assert(!engine.includes('_buildBuilding(')&&!engine.includes('_buildTree('),'legacy 3D procedural building/tree constructors remain');
assert(engine.includes('this.stageView={enabled:true,axis:\'z\',side:1}'),'fixed Z paper-stage camera missing');
assert(engine.includes('setStageView(enabled'),'debug free-camera toggle missing');
assert(engine.includes('screenToWorld(clientX,clientY)'),'screen-to-terrain projection missing');
assert(engine.includes('new THREE.WebGLRenderer'),'WebGLRenderer missing');
assert(html.includes('id="cameraHeight"')&&!html.includes('id="cameraFov"'),'camera height control did not replace FOV control');
assert(engine.includes('p.y+this.cameraRig.height'),'camera height is not applied to stage target');
assert(engine.includes("paper-wall-system"),'paper wall system missing');
assert(engine.includes("black-understage")&&engine.includes("paper-road-apron"),'stage visual apron missing');
assert(content.includes('paperWalls'),'authored paper wall content missing');

assert(sprites.includes('new THREE.PlaneGeometry(width,height)'),'paper entities must use PlaneGeometry');
assert(sprites.includes('setFacing(direction)'),'paper flip/turn API missing');
assert(sprites.includes('this.targetFlip=direction<0?Math.PI:0'),'paper 180-degree turn target missing');

assert(game.includes('new TerrainRuntime.TerrainWorld'),'game does not own terrain runtime');
assert(game.includes("ecs.registerSystem('player-movement'"),'ECS movement system missing');
assert(game.includes("ecs.registerSystem('player-gravity'"),'gravity system missing');
assert(game.includes('terrain.collidesAABB'),'terrain collision missing');
assert(game.includes('digTerrainAt')&&game.includes('placeTerrainAt'),'runtime terrain interaction missing');
assert(game.includes("terrainToolMode='dig'"),'explicit dig/place tool state missing');
assert(html.includes('id="terrainDigBtn"')&&html.includes('id="terrainPlaceBtn"'),'visible dig/place controls missing');
assert(game.includes('save.terrainEdits=terrain.exportEdits()'),'terrain edits are not saved');
assert(game.includes('terrain.importEdits(save.terrainEdits)'),'terrain edits are not restored');
assert(!game.includes('cameraRelativeMove'),'3D camera-relative movement must be gone');

assert(content.includes("mode:'paper-stage-2.5d'"),'paper-stage content mode missing');
assert(content.includes('stageEntities'),'paper stage entities missing');
assert(content.includes('thickness:1')&&content.includes('texturePixels:128'),'terrain blocks must be true 1m cubes with 128px faces');
assert(!content.includes('buildings:[')&&!content.includes('trees:['),'legacy volumetric scene lists remain');
assert(save.includes('CURRENT_SCHEMA=5'),'paper-stage save schema not active');
assert(save.includes('terrainEdits'),'terrain delta save field missing');
assert(css.includes('.three-world-canvas'),'stage canvas styling missing');

console.log('WEB_PAPER_STAGE_SMOKE_OK');

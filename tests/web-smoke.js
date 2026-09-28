const fs=require('fs');

function assert(condition,message){if(!condition)throw new Error(message)}
const read=path=>fs.readFileSync(path,'utf8');

const html=read('index.html');
const game=read('src/game.js');
const engine=read('src/engine3d/World3DEngine.js');
const sprite=read('src/entities/PaperSpriteEntity.js');
const terrain=read('src/terrain/terrain-world.js');
const renderer=read('src/renderers/three-world-renderer.mjs');
const content=read('src/content/game-content.js');
const save=read('src/core/save-runtime.js');
const css=read('styles/game.css');

assert(html.includes('paperchalk-build" content="paper-stage-voxel-r3"'),'paper-stage build key missing');
assert(html.includes('id="threeWorldLayer"'),'Three.js stage host missing');
assert(html.includes('vendor/fastnoise-lite/FastNoiseLite.js?v=1.1.1'),'FastNoiseLite runtime not loaded');
assert(html.includes('src/terrain/terrain-world.js?v=paper-stage-voxel-r3'),'terrain runtime not loaded before game');
assert(html.includes('src="./src/renderers/three-world-renderer.mjs?v=paper-stage-voxel-r3"'),'Three stage renderer not loaded');

for(const legacy of ['pixiEntityLayer','cardGroundCanvas','class="actor"','playerSprite','playerHealthHud','paperBackdrop','rearTrack','frontTrack','entityTrack','threeTestBtn']){
  assert(!html.includes(legacy),'retired legacy world DOM returned: '+legacy);
}
for(const path of [
  'src/core/card-camera.js','src/camera-settings.js','src/renderers/dom-card-projection.js',
  'src/renderers/pixi-dynamic-renderer.mjs','src/puppet/paper-puppet-runtime.mjs','vendor/pixi/pixi-8.21.0.mjs'
])assert(!fs.existsSync(path),'retired renderer file remains: '+path);

assert(fs.existsSync('vendor/three/three.module.js'),'Three.js module missing');
assert(fs.existsSync('vendor/fastnoise-lite/FastNoiseLite.js'),'FastNoiseLite vendor missing');
assert(engine.includes("import {PaperSpriteEntity}"),'paper entity renderer not imported');
assert(engine.includes("this.terrainGroup.name='terrain-single-layer'"),'single-layer terrain group missing');
assert(engine.includes("mode:'paper-stage-x-y-voxel'"),'paper-stage renderer mode missing');
assert(engine.includes("playerRepresentation:'PlaneGeometry'"),'player is not a paper plane');
assert(engine.includes("this.stageView={enabled:true,axis:'z',side:1}"),'fixed Z paper-stage camera is not default');
assert(engine.includes('_buildTerrainChunk(cx,cy)'),'chunk terrain mesher missing');
assert(!engine.includes('_buildBuilding(')&&!engine.includes('_buildTree(')&&!engine.includes('_buildRock('),'old 3D primitive world builders remain');

assert(sprite.includes('new THREE.PlaneGeometry'),'paper entities are not PlaneGeometry');
assert(sprite.includes("kind==='player'"),'paper player texture path missing');
assert(sprite.includes('setFacing(facing'),'paper flip-turn state missing');

assert(terrain.includes('new Uint16Array'),'terrain chunks are not compact typed arrays');
assert(terrain.includes("noiseBackend='FastNoiseLite-1.1.1'"),'FastNoiseLite backend is not active-capable');
assert(terrain.includes('activeChunkKeys('),'chunk streaming API missing');
assert(terrain.includes('exportDeltas()')&&terrain.includes('importDeltas('),'terrain delta persistence API missing');

assert(game.includes('const TERRAIN=window.PaperchalkTerrain'),'gameplay terrain authority missing');
assert(game.includes('PLAYER_LAYER_Z=.36'),'paper gameplay Z layer missing');
assert(game.includes('playerCollidesAt'),'XY voxel collision missing');
assert(game.includes('moveVertical'),'vertical terrain collision missing');
assert(game.includes('terrainDeltas=TERRAIN.exportDeltas()'),'terrain edits not written to save');
assert(!game.includes('cameraRelativeMove'),'retired camera-relative X/Z movement remains');
assert(!game.includes('buildingColliders'),'retired 3D building collision remains');

assert(content.includes("mode:'paper-stage-voxel'"),'authored scene mode is not paper-stage voxel');
assert(content.includes('paperEntities:['),'paper entity content list missing');
assert(content.includes('tileSize:.25'),'0.25 m voxel scale missing');
assert(!content.includes('buildings:[')&&!content.includes('trees:[')&&!content.includes('rocks:['),'old 3D primitive content remains');

assert(save.includes('CURRENT_SCHEMA=5'),'save schema v5 not active');
assert(save.includes('terrainDeltas=asArray'),'terrain deltas are not migration-safe');
assert(save.includes('y:finiteOr(value.y,0)'),'negative underground Y is being clamped');
assert(css.includes('.three-world-canvas'),'Three stage canvas styling missing');

console.log('PAPER_STAGE_VOXEL_STATIC_OK');

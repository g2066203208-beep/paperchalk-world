const fs=require('fs');

function assert(condition,message){if(!condition)throw new Error(message)}
const read=path=>fs.readFileSync(path,'utf8');

const html=read('index.html');
const game=read('src/game.js');
const engine=read('src/engine3d/World3DEngine.js');
const renderer=read('src/renderers/three-world-renderer.mjs');
const content=read('src/content/game-content.js');
const save=read('src/core/save-runtime.js');
const css=read('styles/game.css');

assert(html.includes('paperchalk-build" content="three-stage-r2"'),'3D build key missing');
assert(html.includes('id="threeWorldLayer"'),'Three.js world host missing');
assert(html.includes('src="./src/renderers/three-world-renderer.mjs?v=three-stage-r2"'),'production Three renderer not loaded');
assert(!html.includes('pixiEntityLayer'),'Pixi world layer still mounted');
assert(!html.includes('cardGroundCanvas'),'card-camera ground canvas still mounted');
assert(!html.includes('class="actor"'),'legacy 2D player actor still mounted');
assert(!html.includes('playerSprite'),'legacy 2D player sprite still mounted');
assert(!html.includes('playerHealthHud'),'DOM health bar still mounted');
assert(!html.includes('paperBackdrop'),'2D paper backdrop still mounted');
assert(!html.includes('rearTrack')&&!html.includes('frontTrack'),'2D prop tracks still mounted');
assert(!html.includes('entityTrack'),'2D entity track still mounted');
assert(!html.includes('threeTestBtn'),'3D must be production, not a test toggle');

for(const path of [
  'src/core/card-camera.js',
  'src/camera-settings.js',
  'src/renderers/dom-card-projection.js',
  'src/renderers/pixi-dynamic-renderer.mjs',
  'src/puppet/paper-puppet-runtime.mjs',
  'vendor/pixi/pixi-8.21.0.mjs',
  'tests/gpu-smoke.mjs'
])assert(!fs.existsSync(path),'retired 2D/Pixi file remains: '+path);

assert(fs.existsSync('vendor/three/three.module.js'),'Three.js module missing');
assert(fs.existsSync('vendor/three/three.core.js'),'Three.js core missing');
assert(engine.includes('export class World3DEngine'),'production 3D engine class missing');
assert(engine.includes('export class WorldSpaceHealthBar'),'3D health bar class missing');
assert(engine.includes("this.group.name='player-health-3d'"),'health bar is not a world-space 3D group');
assert(engine.includes('this.healthBar=new WorldSpaceHealthBar'),'player does not own the 3D health bar');
assert(engine.includes('this.group.quaternion.copy(this._parentQuaternion).multiply(camera.quaternion)'),'3D health bar is not billboarded through player rotation');
assert(engine.includes('new THREE.PerspectiveCamera'),'perspective camera missing');
assert(engine.includes("this.stageView={enabled:true,axis:'z',side:1}"),'paper-stage camera must default to fixed Z-axis view');
assert(engine.includes('setStageView(enabled'),'paper-stage camera toggle API missing');
assert(engine.includes('setStageAxis(axis'),'paper-stage X/Z axis selector missing');
assert(html.includes('data-debug-action="stageview"'),'debug stage-view toggle missing');
assert(html.includes('data-debug-action="stageaxis"'),'debug stage-axis toggle missing');
assert(engine.includes('new THREE.WebGLRenderer'),'WebGLRenderer missing');
assert(engine.includes('shadowMap.enabled=true'),'3D shadows missing');
assert(engine.includes('sceneData.buildings'),'3D authored buildings are not consumed');

assert(game.includes('x:sceneData.spawn.x')&&game.includes('z:sceneData.spawn.z'),'native XYZ player state missing');
assert(game.includes("ecs.registerSystem('player-movement'"),'3D ECS movement system missing');
assert(game.includes("ecs.registerSystem('player-gravity'"),'3D ECS gravity system missing');
assert(game.includes('cameraRelativeMove'),'camera-relative 3D movement missing');
assert(game.includes('collidesAt'),'3D world collision missing');
assert(game.includes("window.PaperchalkHealth"),'health API missing');
assert(game.includes("window.PaperchalkRuntime"),'renderer-neutral runtime API missing');
assert(!game.includes('PaperchalkCardCamera'),'retired 2D CardCamera still referenced');
assert(!game.includes('playerWorldX'),'retired 2D playerWorldX still referenced');
assert(!game.includes('buildMapVisuals'),'retired DOM world builder still referenced');

assert(content.includes('scene3d'),'native 3D authored content missing');
assert(!content.includes('assets/buildings'),'2D building art still referenced');
assert(save.includes('CURRENT_SCHEMA=4'),'3D save schema not active');
assert(save.includes('player 3D transform missing'),'3D transform save validation missing');
assert(css.includes('.three-world-canvas'),'3D canvas styling missing');
assert(!css.includes('.map-building')&&!css.includes('.paper-backdrop'),'legacy 2D world CSS remains');

console.log('WEB_SMOKE_OK');

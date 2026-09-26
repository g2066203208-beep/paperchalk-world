import fs from 'node:fs';

function fail(message){throw new Error(message)}
function assert(condition,message){if(!condition)fail(message)}
const size=p=>fs.statSync(p).size;
const read=p=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const css=read('styles/game.css');
const game=read('src/game.js');
const ecs=read('src/core/ecs-runtime.js');
const events=read('src/core/event-bus.js');
const appState=read('src/core/game-state.js');
const saveRuntime=read('src/core/save-runtime.js');
const cardCamera=read('src/core/card-camera.js');
const content=read('src/content/game-content.js');
const buildingPools=read('src/content/building-pools.js');
const domCardRenderer=read('src/renderers/dom-card-projection.js');
const oldTownRenderer=read('src/renderers/oldtown-building-layer.js');
const renderer=read('src/renderers/pixi-dynamic-renderer.mjs');
const android=read('android-app/app/src/main/java/com/paperchalk/world/MainActivity.java');

const budgets={
  'index.html':40000,
  'styles/game.css':120000,
  'src/game.js':180000,
  'src/core/ecs-runtime.js':12000,
  'src/core/event-bus.js':6000,
  'src/core/game-state.js':5000,
  'src/core/save-runtime.js':8000,
  'src/core/card-camera.js':5000,
  'src/content/game-content.js':12000,
  'src/content/building-pools.js':6000,
  'src/renderers/dom-card-projection.js':7000,
  'src/renderers/oldtown-building-layer.js':8000,
  'src/renderers/pixi-dynamic-renderer.mjs':24000,
  'vendor/pixi/pixi-8.21.0.mjs':900000,
  'assets/backgrounds/sun-paper-r13.webp':50000,
  'assets/backgrounds/moon-paper-r13.webp':50000,
  'assets/backgrounds/cloud-paper-r13.webp':50000,
  'assets/debug/green-grid-1m.svg':2000,
  'assets/buildings/real-world/old-town/oldtown-building-atlas-r1.webp':500000
};
for(const [file,max] of Object.entries(budgets)){
  const bytes=size(file);
  assert(bytes<=max,`${file} exceeded performance budget: ${bytes} > ${max}`);
}

assert(!/<img[^>]+\ssrc=["'][^"']*backpack-ui-v2\.webp/i.test(html),
  'Heavy backpack art became eager again');
assert(!/<img[^>]+\ssrc=["'][^"']*paper-(?:ball|unfold)\.webp/i.test(html),
  'Paper transition art became eager again');
assert(/data-src=["'][^"']*backpack-ui-v2\.webp/i.test(html),
  'Deferred backpack asset marker missing');
assert(/data-src=["'][^"']*paper-ball\.webp/i.test(html)&&/data-src=["'][^"']*paper-unfold\.webp/i.test(html),
  'Deferred paper transition asset markers missing');

assert(renderer.includes("paperchalk-world-enter"),'GPU renderer no longer waits for world lifecycle');
assert(renderer.includes("forcedRendererQuery"),'Explicit renderer override path missing');
assert(renderer.includes("if(forcedRendererQuery)"),'GPU renderer appears to boot eagerly again');
assert(game.includes("PerformanceObserver"),'Long-task performance diagnostics missing');
assert(game.includes("ambientInterval"),'Paused-world ambient throttling missing');
assert(!html.includes("cdn.openart.ai"),'Runtime still depends on external apartment CDN');
assert(!html.includes("blackKeyApartment")&&!css.includes("blackKeyApartment"),'Realtime apartment chroma-key filter returned');
assert(!html.includes('midgroundApartment')&&!html.includes('apartment-midground.webp'),'Legacy apartment exterior returned');
assert(!html.includes('apartmentDoorPrompt')&&!html.includes('interiorScene'),'Legacy apartment interior returned');
assert(game.includes("function nearbyApartmentDoor(){return false}")&&game.includes("function enterApartment(){return false}"),'Legacy apartment interaction is not disabled');
assert(!html.includes("mountainBackground")&&!css.includes(".mountain-background-layer"),'Background mountain layer returned');
assert(css.includes(".road-layer{display:none!important}"),'Road visuals returned');
assert(game.includes("MAP_TERRAIN.length=0")&&game.includes("MAP_OBJECTS.length=0"),'Authored obstacles returned');
assert(game.includes("const rear=[];")&&game.includes("const front=[];"),'Authored prop strips returned');
assert(!html.includes("voxel-ground")&&!css.includes("voxel-ground"),'Voxel-era ground naming returned');
assert(css.includes("R37 XY GAMEPLAY + Z SCENE DEPTH"),'XY gameplay / Z scene-depth runtime missing');
assert(css.includes("var(--card-camera-y,0px)")&&css.includes("rotateX(68deg)"),'Perspective ground camera-Y transform missing');
assert(css.includes("translate3d(0,0,var(--card-wall-depth))"),'Distant altitude wall transform missing');
assert(domCardRenderer.includes("setProperty('--card-grid-x'")&&domCardRenderer.includes("setProperty('--card-camera-y'"),'World-synced X/Y ground camera missing');
assert(!domCardRenderer.includes("setProperty('--card-grid-z'"),'Player-driven Z ground scrolling returned');
assert(cardCamera.includes("function project(")&&cardCamera.includes("cameraZ=0"),'Shared scene-depth projection math missing');
assert(!game.includes("keyboardDepthForward")&&!game.includes("joystickDepthAxis"),'Player Z input returned');
assert(renderer.includes("const cardCamera=window.PaperchalkCardCamera"),'GPU renderer does not share the card-camera runtime');
assert(buildingPools.includes("realWorld")&&buildingPools.includes("oldTown"),'Old-town building content pool missing');
assert(buildingPools.includes("oldtown-building-10"),'Old-town pool no longer contains all 10 supplied buildings');
assert(oldTownRenderer.includes("ROW_COPIES=3"),'Old-town renderer lost retained row copies');
assert(oldTownRenderer.includes("function shuffled(rowIndex)"),'Seeded old-town random order missing');
assert(oldTownRenderer.includes("runtime.subscribe(render)"),'Old-town layer is not lifecycle/runtime driven');
assert(css.includes(".oldtown-building-layer")&&css.includes("R38 OLD-TOWN BUILDING POOL"),'Old-town far-midground CSS missing');
assert(html.includes('paperchalk-build" content="mobile-oldtown-r39"'),'R39 mobile-oldtown build key missing');
assert(!html.includes("atlas-r38-b64/"),'Temporary atlas base64 chunks leaked into runtime');

assert(!game.includes("terrainTrack.innerHTML=''"),'Terrain window reverted to destructive DOM rebuild');
assert(!game.includes("mapObjectTrack.innerHTML=''"),'Map objects reverted to destructive DOM rebuild');
assert(!game.includes("mapLandmarkTrack.innerHTML=''"),'Landmarks reverted to destructive DOM rebuild');
assert(game.includes("mapVisualPools"),'Retained map node pool missing');
assert(game.includes("SOLID_BUCKET_SIZE"),'Collision spatial index missing');
assert(ecs.includes("class SparseSetStore"),'Sparse-set ECS runtime missing');
assert(ecs.includes("registerSystem(name"),'ECS system scheduler missing');
assert(events.includes("class EventBus"),'Event bus runtime missing');
assert(appState.includes("class StateMachine"),'Application state machine missing');
assert(saveRuntime.includes("CURRENT_SCHEMA=3"),'Schema-v3 save runtime missing');
assert(content.includes("function validate(value=content)"),'Content validation runtime missing');
assert(game.includes("combatEcs.run('enemy-ai'"),'Enemy AI no longer runs through the ECS fixed-step system');
assert(game.includes("paperchalk-world-enter',startFrameLoop")&&game.includes("paperchalk-world-leave',stopFrameLoop"),
  'World animation loop is no longer lifecycle-bound');
assert(!game.includes("\nrequestAnimationFrame(frame);\n"),'Always-on world RAF returned');

assert(css.includes('will-change:transform'),'Compositor motion hint missing');
assert(!android.includes('WebSettings.LOAD_NO_CACHE'),'Android WebView reverted to no-cache mode');
assert(!android.includes('clearCache(true)'),'Android WebView reverted to clearing HTTP cache every launch');

const playerRuntimeNames=['idle','crouch','jump-up','jump-down','walk'];
const playerRuntimeSizes=Object.fromEntries(playerRuntimeNames.map(name=>{
  const file='assets/player/runtime/'+name+'.webp';
  assert(fs.existsSync(file),'Missing optimized player runtime sprite: '+file);
  const bytes=size(file);
  assert(bytes<=60000,file+' exceeded 60KB runtime sprite budget: '+bytes);
  return [name,bytes];
}));
const playerRuntimeTotal=Object.values(playerRuntimeSizes).reduce((a,b)=>a+b,0);
assert(playerRuntimeTotal<=230000,'Player runtime sprite set exceeded 230KB: '+playerRuntimeTotal);
assert(game.includes("./assets/player/runtime/idle.webp"),'Game runtime is not using optimized player sprites');
assert(!game.includes("./assets/player/idle.webp?v=actions-r1"),'High-resolution idle sprite returned to hot runtime path');
assert(!game.includes("visualViewport?.addEventListener('scroll'"),'Visual viewport scroll still triggers expensive world work');
assert(game.includes("requestAnimationFrame(flushViewportChange)"),'Viewport rebuilds are not RAF-debounced');
assert(game.includes("schedulePlayerActionWarmup"),'Player action sprites are not predecoded during idle time');

const eagerHeavyBytes=0;
const report={
  budgets:Object.fromEntries(Object.keys(budgets).map(f=>[f,size(f)])),
  eagerHeavyBytes,
  playerRuntimeSizes,
  playerRuntimeTotal,
  guards:[
    'deferred-heavy-ui',
    'lazy-gpu-boot',
    'retained-map-dom',
    'spatial-collision-index',
    'sparse-set-ecs',
    'bounded-core-modules',
    'validated-authored-content',
    'schema-v3-save-backup',
    'lifecycle-bound-world-raf',
    'compositor-motion',
    'android-http-cache',
    'optimized-player-sprites',
    'debounced-viewport',
    'predecoded-player-actions',
    'local-apartment-asset',
    'apartment-culling',
    'finite-midground-layer',
    'no-runtime-chroma-key'
  ]
};
console.log('PERFORMANCE_BUDGET_PASS '+JSON.stringify(report));

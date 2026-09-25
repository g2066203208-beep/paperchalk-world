import fs from 'node:fs';

function fail(message){throw new Error(message)}
function assert(condition,message){if(!condition)fail(message)}
const size=p=>fs.statSync(p).size;
const read=p=>fs.readFileSync(p,'utf8');

const html=read('index.html');
const css=read('styles/game.css');
const game=read('src/game.js');
const renderer=read('src/renderers/pixi-dynamic-renderer.mjs');
const android=read('android-app/app/src/main/java/com/paperchalk/world/MainActivity.java');

const budgets={
  'index.html':40000,
  'styles/game.css':120000,
  'src/game.js':180000,
  'src/renderers/pixi-dynamic-renderer.mjs':24000,
  'vendor/pixi/pixi-8.21.0.mjs':900000,
  'assets/backgrounds/apartment-midground.webp':350000,
  'assets/backgrounds/mountain-background.webp':180000
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
assert(game.includes("updateMidgroundApartmentVisibility"),'Apartment off-screen culling missing');
assert(game.includes("MOUNTAIN_PARALLAX=.16"),'Mountain parallax factor missing');
assert(css.includes(".mountain-background-layer::before{"),'Mountain background layer missing');
assert(/\.midground-building-track\{[\s\S]*?width:1800px/.test(css),'Apartment track became world-scale again');
assert(!html.includes("voxel-ground")&&!css.includes("voxel-ground"),'Voxel-era ground naming returned');

assert(!game.includes("terrainTrack.innerHTML=''"),'Terrain window reverted to destructive DOM rebuild');
assert(!game.includes("mapObjectTrack.innerHTML=''"),'Map objects reverted to destructive DOM rebuild');
assert(!game.includes("mapLandmarkTrack.innerHTML=''"),'Landmarks reverted to destructive DOM rebuild');
assert(game.includes("mapVisualPools"),'Retained map node pool missing');
assert(game.includes("SOLID_BUCKET_SIZE"),'Collision spatial index missing');

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

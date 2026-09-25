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
  'vendor/pixi/pixi-8.21.0.mjs':900000
};
for(const [file,max] of Object.entries(budgets)){
  const bytes=size(file);
  assert(bytes<=max,`${file} exceeded performance budget: ${bytes} > ${max}`);
}

assert(!/<img[^>]+src=["'][^"']*backpack-ui-v2\.webp/i.test(html),
  'Heavy backpack art became eager again');
assert(!/<img[^>]+src=["'][^"']*paper-(?:ball|unfold)\.webp/i.test(html),
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

assert(!game.includes("terrainTrack.innerHTML=''"),'Terrain window reverted to destructive DOM rebuild');
assert(!game.includes("mapObjectTrack.innerHTML=''"),'Map objects reverted to destructive DOM rebuild');
assert(!game.includes("mapLandmarkTrack.innerHTML=''"),'Landmarks reverted to destructive DOM rebuild');
assert(game.includes("mapVisualPools"),'Retained map node pool missing');
assert(game.includes("SOLID_BUCKET_SIZE"),'Collision spatial index missing');

assert(css.includes('will-change:transform'),'Compositor motion hint missing');
assert(!android.includes('WebSettings.LOAD_NO_CACHE'),'Android WebView reverted to no-cache mode');
assert(!android.includes('clearCache(true)'),'Android WebView reverted to clearing HTTP cache every launch');

const eagerHeavyBytes=0;
const report={
  budgets:Object.fromEntries(Object.keys(budgets).map(f=>[f,size(f)])),
  eagerHeavyBytes,
  guards:[
    'deferred-heavy-ui',
    'lazy-gpu-boot',
    'retained-map-dom',
    'spatial-collision-index',
    'compositor-motion',
    'android-http-cache'
  ]
};
console.log('PERFORMANCE_BUDGET_PASS '+JSON.stringify(report));

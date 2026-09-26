import process from 'node:process';

const base='http://127.0.0.1:9222';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitJson(url,tries=80){
  let last;
  for(let i=0;i<tries;i++){
    try{return await (await fetch(url)).json()}catch(e){last=e;await sleep(125)}
  }
  throw last||new Error('timeout '+url);
}
let gamePage=null;
for(let i=0;i<120;i++){
  const pages=await waitJson(base+'/json');
  gamePage=pages.find(p=>p.type==='page'&&p.url.startsWith('http://127.0.0.1:4173/'))||null;
  if(gamePage)break;
  await sleep(100);
}
if(!gamePage)throw new Error('No game page target');
console.log('TARGET',gamePage.url);
const ws=new WebSocket(gamePage.webSocketDebuggerUrl);
await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
let id=0;
const pending=new Map();
const faults=[];
ws.addEventListener('message',ev=>{
  const msg=JSON.parse(ev.data);
  if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);return}
  if(msg.method==='Runtime.exceptionThrown')faults.push(msg.params.exceptionDetails);
  if(msg.method==='Log.entryAdded'&&msg.params.entry.level==='error')faults.push(msg.params.entry);
});
function call(method,params={}){
  const n=++id;
  ws.send(JSON.stringify({id:n,method,params}));
  return new Promise((resolve,reject)=>{
    pending.set(n,resolve);
    setTimeout(()=>{if(pending.delete(n))reject(new Error('CDP timeout '+method))},10000);
  });
}
async function js(expression){
  const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.result?.exceptionDetails)throw new Error('Eval failed: '+JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}
function assert(v,msg){if(!v)throw new Error('ASSERT: '+msg)}
function noFaults(step){
  if(faults.length)throw new Error(step+' runtime errors:\n'+JSON.stringify(faults,null,2));
}
async function waitFor(expr,timeout=4000){
  const end=Date.now()+timeout;
  while(Date.now()<end){if(await js(expr))return true;await sleep(80)}
  return false;
}
async function click(id){
  const ok=await js(`(()=>{const e=document.getElementById(${JSON.stringify(id)});if(!e)return false;e.click();return true})()`);
  assert(ok,'missing/cannot click #'+id);
}

await call('Page.enable');
await call('Runtime.enable');
await call('Log.enable');
await call('Emulation.setDeviceMetricsOverride',{width:1536,height:691,deviceScaleFactor:1,mobile:true,screenWidth:1536,screenHeight:691});
await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
assert(await waitFor("location.href.startsWith('http://127.0.0.1:4173/') && document.readyState==='complete'",8000),'document did not start/load');
await sleep(1200);
noFaults('load');

const initial=await js("({href:location.href,menu:document.getElementById('pageMenu')?.classList.contains('active'),enter:!!document.getElementById('enterBtn'),title:document.title,body:document.body?.innerText?.slice(0,300)})");
console.log('INITIAL',initial);
assert(initial.menu&&initial.enter,'main menu not interactive '+JSON.stringify(initial));
console.log('PASS load/menu',initial);

const heavyInitial=await js(`(()=>{
  const names=performance.getEntriesByType('resource').map(e=>e.name);
  return {
    backpack:names.some(n=>n.includes('backpack-ui-v2.webp')),
    paperBall:names.some(n=>n.includes('paper-ball.webp')),
    paperUnfold:names.some(n=>n.includes('paper-unfold.webp')),
    backpackSrc:document.querySelector('.inventory-art')?.getAttribute('src')||''
  };
})()`);
assert(!heavyInitial.backpack&&!heavyInitial.paperBall&&!heavyInitial.paperUnfold&&!heavyInitial.backpackSrc,
  'heavy hidden UI assets loaded on initial menu '+JSON.stringify(heavyInitial));
console.log('PASS deferred heavy UI assets',heavyInitial);

const orbit=await js(`(()=>{
  const rise=330,set=1110,span=set-rise;
  const pts=[0,.25,.5,.75,1].map(t=>celestialArcPosition(rise+span*t,rise,set));
  const cx=VIEW_W*.50,cy=VIEW_H*.74;
  const radii=pts.map(p=>Math.hypot(p.x-cx,p.y-cy));
  return {pts,radii,min:Math.min(...radii),max:Math.max(...radii),cx,cy};
})()`);
assert(orbit.max-orbit.min<0.05,'celestial path is not circular '+JSON.stringify(orbit));
assert(Math.abs(orbit.pts[2].x-orbit.cx)<0.1&&orbit.pts[2].y<orbit.cy,'celestial noon point is wrong '+JSON.stringify(orbit));
console.log('PASS circular celestial orbit',orbit);

await click('enterBtn');
assert(await waitFor("document.getElementById('pageAuth')?.classList.contains('active')",1200),'fresh start did not open auth');
noFaults('start -> auth');
console.log('PASS start -> auth');

await click('tabRegister');
const submitted=await js(`(()=>{
  const u=document.getElementById('regUser');
  const n=document.getElementById('regName');
  const p=document.getElementById('regPass');
  const form=document.getElementById('registerForm');
  if(!u||!n||!p||!form)return false;
  u.value='ciuser';
  n.value='CI旅人';
  p.value='1234';
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  return true;
})()`);
assert(submitted,'registration form missing');
assert(await waitFor("document.getElementById('uiShell')?.classList.contains('is-hidden')",3000),'registration did not enter world');
noFaults('register -> world');
console.log('PASS register -> world');

const damageFx=await js(`(async()=>{
  PaperchalkHealth.reset();
  await new Promise(r=>setTimeout(r,40));
  PaperchalkHealth.damage(1);
  const piece=document.querySelector('[data-hp-index="9"]');
  const start={cls:piece.className,anim:getComputedStyle(piece).animationName,opacity:getComputedStyle(piece).opacity};
  await new Promise(r=>setTimeout(r,110));
  const mid={cls:piece.className,anim:getComputedStyle(piece).animationName,opacity:getComputedStyle(piece).opacity,transform:getComputedStyle(piece).transform,filter:getComputedStyle(piece).filter};
  PaperchalkHealth.heal(1);
  return {start,mid};
})()`);
assert(damageFx.start.cls.includes('is-hit'),'damage class missing '+JSON.stringify(damageFx));
assert(damageFx.start.anim.includes('hp-sewn-hit'),'damage animation missing '+JSON.stringify(damageFx));
assert(parseFloat(damageFx.mid.opacity)>.25,'damage animation is visually hidden '+JSON.stringify(damageFx));
console.log('PASS visible damage FX',damageFx);

const productionClean=await js(`(()=>({
  npcs:PaperchalkMap.npcs.length,
  spawns:PaperchalkMap.enemySpawns.length,
  visibleEnemies:document.querySelectorAll('#entityTrack .enemy').length,
  visibleNpcs:document.querySelectorAll('[data-npc-id]').length,
  compat:getComputedStyle(document.getElementById('prototypeRuntimeCompat')).display,
  interactHidden:document.getElementById('interactBtn').hidden
}))()`);
assert(productionClean.npcs===0&&productionClean.spawns===0&&productionClean.visibleEnemies===0&&productionClean.visibleNpcs===0&&productionClean.compat==='none'&&productionClean.interactHidden,
  'production-clean stage still exposes prototype content '+JSON.stringify(productionClean));
console.log('PASS production-clean stage',productionClean);

await click('worldMenuBtn');
assert(await waitFor("!document.getElementById('uiShell')?.classList.contains('is-hidden')",2200),'world menu button did not open menu');
noFaults('world menu');
console.log('PASS world menu');
await click('enterBtn');
assert(await waitFor("document.getElementById('uiShell')?.classList.contains('is-hidden')",2200),'could not re-enter world');

await click('backpackBtn');
assert(await waitFor("document.getElementById('backpackOverlay')?.classList.contains('is-open')",2500),'backpack did not open');
noFaults('backpack');
const backpackArt=await js(`(()=>{
  const img=document.querySelector('.inventory-art');
  return {src:img?.currentSrc||img?.src||'',complete:!!img?.complete,naturalWidth:img?.naturalWidth||0,loading:document.getElementById('backpackFrame')?.classList.contains('is-art-loading')};
})()`);
assert(backpackArt.src.includes('backpack-ui-v2.webp'),'backpack art was not requested on demand '+JSON.stringify(backpackArt));
assert(await waitFor("document.querySelector('.inventory-art')?.naturalWidth>0",5000),'backpack art did not decode after open');
console.log('PASS backpack deferred art',backpackArt);
await js("closeBackpack(true)");
await sleep(100);

await click('worldMapBtn');
assert(await waitFor("document.getElementById('worldMapOverlay')?.classList.contains('is-open')",2500),'map did not open');
noFaults('map');
console.log('PASS map');
await js("closeWorldMap(true)");
await sleep(100);

await click('debugToggleBtn');
assert(await waitFor("document.getElementById('debugPanel')?.classList.contains('is-open')",800),'debug did not open');
noFaults('debug');
console.log('PASS debug');
await js("closeDebugPanel({focus:false});");
await sleep(80);

await click('cameraControlBtn');
assert(await waitFor("document.getElementById('cameraControlPanel')?.classList.contains('is-open')",500),'camera control panel did not open');
const cameraUi=await js(`(()=>({
  inDebug:!!document.querySelector('#debugPanel #cameraTilt'),
  inSettings:!!document.querySelector('#pageSettings #cameraTilt'),
  max:Number(document.getElementById('cameraTilt').max),
  controls:document.querySelectorAll('#cameraControlPanel input[type=range]').length
}))()`);
assert(!cameraUi.inDebug&&!cameraUi.inSettings&&cameraUi.max===80&&cameraUi.controls===3,
  'camera controls are not a standalone production UI '+JSON.stringify(cameraUi));

const cameraBefore=await js("({tilt:PaperchalkCardCamera.getTiltDegrees(),height:PaperchalkCardCamera.getCameraHeightMeters(),distance:PaperchalkCardCamera.getCameraDistanceMeters(),mid:PaperchalkCardCamera.project({worldZ:0,viewportHeight:innerHeight,groundY:112}).y,near:PaperchalkCardCamera.project({worldZ:-640,viewportHeight:innerHeight,groundY:112}).y,far:PaperchalkCardCamera.project({worldZ:640,viewportHeight:innerHeight,groundY:112}).y})");
await js("(()=>{const e=document.getElementById('cameraTilt');e.value='80';e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
await sleep(100);
const cameraAfter=await js("({tilt:PaperchalkCardCamera.getTiltDegrees(),height:PaperchalkCardCamera.getCameraHeightMeters(),distance:PaperchalkCardCamera.getCameraDistanceMeters(),mid:PaperchalkCardCamera.project({worldZ:0,viewportHeight:innerHeight,groundY:112}).y,near:PaperchalkCardCamera.project({worldZ:-640,viewportHeight:innerHeight,groundY:112}).y,far:PaperchalkCardCamera.project({worldZ:640,viewportHeight:innerHeight,groundY:112}).y})");
assert(cameraAfter.tilt===80&&cameraAfter.height===cameraBefore.height&&cameraAfter.distance===cameraBefore.distance&&
  Math.abs(cameraAfter.mid-cameraBefore.mid)<1&&
  (cameraAfter.near-cameraAfter.far)>(cameraBefore.near-cameraBefore.far)*4,
  'camera pitch does not rotate independently around the mid axis '+JSON.stringify({cameraBefore,cameraAfter}));
await click('cameraControlClose');
assert(await waitFor("!document.getElementById('cameraControlPanel')?.classList.contains('is-open')",500),'camera control panel did not close');
console.log('PASS standalone camera UI',{cameraUi,cameraBefore,cameraAfter});

console.log('UI_SMOKE_PASS');
ws.close();

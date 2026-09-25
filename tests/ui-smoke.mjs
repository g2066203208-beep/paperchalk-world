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

const enemyMotion=await js(`(async()=>{
  PaperchalkCombat.placeEnemyNear(320);
  await new Promise(r=>setTimeout(r,120));
  const e=document.getElementById('enemy');
  const a=parseFloat(e.style.getPropertyValue('--enemy-x'))||0;
  await new Promise(r=>setTimeout(r,520));
  const b=parseFloat(e.style.getPropertyValue('--enemy-x'))||0;
  return {a,b,delta:b-a,left:e.style.left,transform:getComputedStyle(e).transform};
})()`);
assert(Math.abs(enemyMotion.delta)>=20,'enemy did not move smoothly enough '+JSON.stringify(enemyMotion));
assert(enemyMotion.left===''||enemyMotion.left==='0px','enemy still uses layout-driving left movement '+JSON.stringify(enemyMotion));
console.log('PASS enemy GPU motion',enemyMotion);

await click('worldMenuBtn');
assert(await waitFor("!document.getElementById('uiShell')?.classList.contains('is-hidden')",2200),'world menu button did not open menu');
noFaults('world menu');
console.log('PASS world menu');
await click('enterBtn');
assert(await waitFor("document.getElementById('uiShell')?.classList.contains('is-hidden')",2200),'could not re-enter world');

await click('backpackBtn');
assert(await waitFor("document.getElementById('backpackOverlay')?.classList.contains('is-open')",2500),'backpack did not open');
noFaults('backpack');
console.log('PASS backpack');
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
await js("closeDebugPanel({focus:false}); PaperchalkDebug.run('tp 760');");
await sleep(250);

const interact=await js("(()=>{const e=document.getElementById('interactBtn');e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'touch'}));return true})()");
assert(interact,'interact dispatch failed');
assert(await waitFor("document.getElementById('dialogueStage')?.classList.contains('is-open')",1500),'dialogue did not open');
await sleep(1500);
noFaults('dialogue open');
const portraits=await js("({p:dialoguePlayerArt.complete&&dialoguePlayerArt.naturalWidth>0,n:dialogueNpcArt.complete&&dialogueNpcArt.naturalWidth>0,pw:dialoguePlayerArt.naturalWidth,ph:dialoguePlayerArt.naturalHeight,nw:dialogueNpcArt.naturalWidth,nh:dialogueNpcArt.naturalHeight})");
assert(portraits.p&&portraits.n,'dialogue portraits did not decode '+JSON.stringify(portraits));
assert(portraits.pw>=480&&portraits.ph>=900,'player portrait is still low resolution '+JSON.stringify(portraits));
console.log('PASS dialogue/portraits HD',portraits);

await js("document.getElementById('dialogueStage').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:2,pointerType:'touch'}))");
assert(await waitFor("document.getElementById('dialogueStage')?.classList.contains('is-choice')",1000),'choice state did not open');
await sleep(300);
const choices=await js(`(()=>{
  const vw=innerWidth,vh=innerHeight;
  const a=[...document.querySelectorAll('.dialogue-choice')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,visible:r.width>0&&r.height>0}});
  const p=document.getElementById('dialoguePlayerPortrait').getBoundingClientRect();
  const player={x:p.x,y:p.y,w:p.width,h:p.height,right:p.right,bottom:p.bottom,cx:p.x+p.width/2,cy:p.y+p.height/2};
  return {vw,vh,a,player,allInside:a.length===3&&a.every(r=>r.visible&&r.x>=0&&r.y>=0&&r.right<=vw&&r.bottom<=vh)};
})()`);
assert(choices.allInside,'choice layout clipped '+JSON.stringify(choices));
assert(choices.a[0].y>=40&&choices.a[0].y<=choices.vh*.20,'top choice is too close to screen edge '+JSON.stringify(choices));
assert(choices.a[1].y>=choices.vh*.32&&choices.a[1].y<=choices.vh*.50,'left choice vertical composition is poor '+JSON.stringify(choices));
assert(choices.a[2].y>=choices.vh*.32&&choices.a[2].y<=choices.vh*.50,'right choice vertical composition is poor '+JSON.stringify(choices));
assert(choices.player.cx>=choices.vw*.43&&choices.player.cx<=choices.vw*.58,'choice portrait is not centered enough '+JSON.stringify(choices));
assert(choices.player.y>=-4&&choices.player.bottom<=choices.vh+4,'choice portrait is vertically clipped '+JSON.stringify(choices));
console.log('PASS choice composition',choices);

await js("document.querySelector('.dialogue-choice')?.click()");
await sleep(250);
noFaults('choice click');
console.log('PASS choice click');

console.log('UI_SMOKE_PASS');
ws.close();

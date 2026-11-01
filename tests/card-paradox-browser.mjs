import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 const path=decodeURI(new URL(req.url||'/', 'http://local').pathname);
 const full=resolve(root,'.'+(path==='/'?'/index.html':path.endsWith('/')?path+'index.html':path));
 if(!full.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{const body=readFileSync(full);res.writeHead(200,{'content-type':mime[extname(full)]||'text/plain','cache-control':'no-store'});res.end(body)}
 catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,errors=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=swiftshader']});
try{
 for(const [name,width,height] of [['desktop',1440,900],['tablet',960,620],['portrait',390,844],['landscape',844,390]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  page.on('pageerror',e=>errors.push(name+': '+e.message));
  await page.goto(base+'/card-game/',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__PAPERWORLD_CARD_GAME__);
  const before=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
  assert.equal(before.hand,8);
  assert.equal(before.phase,'battle');
  assert.equal(await page.locator('#hand-cards .play-card').count(),8);
  assert.equal(await page.locator('.card-motion-slot').count(),8,'animation must wrap actual clickable cards');
  const motion=await page.locator('.card-motion-slot').first().evaluate(e=>({
   bob:getComputedStyle(e).animationName,
   foil:getComputedStyle(e.querySelector('.play-card'),'::after').animationName,
   breath:getComputedStyle(e.querySelector('.suit-icon')).animationName
  }));
  assert.equal(motion.bob,'card-bob');
  assert.ok(motion.foil.includes('card-holo-sweep'));
  assert.equal(motion.breath,'emblem-breathe');
  if(name==='portrait'||name==='landscape'||name==='tablet'){
   const visible=await page.locator('#hand-cards .play-card').evaluateAll(els=>
     els.every(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth+2));
   assert.ok(visible,'all eight playable cards must fit mobile screen without horizontal scrolling');
  }
  assert.equal(await page.locator('#target-value').innerText(),'250');
  const initialCard=await page.locator('#hand-cards .play-card').first().evaluate(el=>{el.dataset.keptNode='yes';return el.dataset.card});
  await page.locator('#hand-cards .play-card').first().click({force:true});
  assert.equal(await page.locator('#selected-count').innerText(),'1 / 5');
  const stateAfterTap=await page.locator('#hand-cards .play-card').first().evaluate(e=>({
   reused:e.dataset.keptNode,
   picked:e.classList.contains('card-just-picked'),
   selected:e.getAttribute('aria-pressed'),
   slot:e.parentElement.dataset.selected
  }));
  assert.equal(stateAfterTap.reused,'yes','click should preserve DOM to avoid restarting animation');
  assert.equal(stateAfterTap.picked,true,'selected card needs actual spring keyframe');
  assert.equal(stateAfterTap.selected,'true');
  assert.equal(stateAfterTap.slot,'true');
  assert.equal(await page.locator('#play-button').isEnabled(),true);
  assert.ok(Number((await page.locator('#predicted-score').innerText()).replaceAll(',',''))>0);
  // Verify meaningful DOM access and do not render decorative fake controls.
  await page.locator('#discard-button').click();
  assert.equal((await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot())).discards,2);
  await page.locator('#hand-cards .play-card').first().click({force:true});
  await page.locator('#play-button').click();
  await page.locator('.card-scored').first().waitFor({state:'attached',timeout:4000});
  assert.equal(await page.locator('#current-score').innerText(),'0','score lands only after stepwise actual card animation');
  await page.waitForFunction(()=>window.__PAPERWORLD_CARD_GAME__.ready(),{timeout:12000});
  const after=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
  assert.equal(after.hands,3);
  assert.ok(after.score>0);
  assert.ok((await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.getLastEvents())).includes('total'));
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_CARD_GAME__);
  const persisted=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
  assert.equal(persisted.score,after.score,'website auto-updated progression persists locally');
  assert.equal(persisted.hands,3,'reload must not reset a game round');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  assert.ok(overflow.scroll<=overflow.width+2,'viewport should not scroll sideways: '+name+' '+JSON.stringify(overflow));
  mkdirSync('artifacts/card-paradox',{recursive:true});
  await page.screenshot({path:'artifacts/card-paradox/'+name+'-real-game.png',fullPage:true,animations:'disabled'});
  console.log('PASS '+name+': hand, scoring, discard, 52-card persistence, screenshot');
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1180,height:800}});
 page.on('pageerror',e=>errors.push('shop: '+e.message));
 await page.goto(base+'/card-game/',{waitUntil:'load'});
 await page.evaluate(async()=>{
  const {createGame,BLINDS}=await import('./engine.mjs');
  const g=createGame(54321);
  g.score=BLINDS[0].target-1;
  g.money=55;
  localStorage.setItem('paperworld-card-paradox-v1',JSON.stringify(g));
 });
 await page.reload();
 await page.waitForFunction(()=>!!window.__PAPERWORLD_CARD_GAME__);
 await page.locator('#hand-cards .play-card').first().click({force:true});
 await page.locator('#play-button').click();
 await page.waitForFunction(()=>window.__PAPERWORLD_CARD_GAME__.ready()&&window.__PAPERWORLD_CARD_GAME__.snapshot().phase==='shop',{timeout:12000});
 assert.equal(await page.locator('#shop-modal').isVisible(),true);
 assert.ok(await page.locator('.shop-item').count()>=1);
 await page.screenshot({path:'artifacts/card-paradox/shop-real-browser.png',fullPage:true,animations:'disabled'});
 const prev=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
 await page.locator('.shop-item button').first().click();
 const bought=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
 assert.equal(bought.jokers,prev.jokers+1);
 await page.locator('#continue-button').click();
 const next=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
 assert.equal(next.phase,'battle');assert.equal(next.blind,1);assert.equal(next.hand,8);
 await page.locator('#help-button').click();
 assert.equal(await page.locator('#help-modal').isVisible(),true);
 await page.locator('#close-help').click();
 assert.equal(await page.locator('#help-modal').isVisible(),false);
 await page.close();
 const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await reduced.goto(base+'/card-game/',{waitUntil:'load'});
 await reduced.waitForFunction(()=>window.__PAPERWORLD_CARD_GAME__);
 const reducedStyles=await reduced.locator('.card-motion-slot').first().evaluate(e=>({
  bob:getComputedStyle(e).animationName,
  foil:getComputedStyle(e.querySelector('.play-card'),'::after').animationName
 }));
 assert.equal(reducedStyles.bob,'none','OS reduced motion must disable idle float');
 assert.equal(reducedStyles.foil,'none','OS reduced motion must disable flash/foil animations');
 await reduced.locator('#hand-cards .play-card').first().click();
 assert.equal(await reduced.locator('#selected-count').innerText(),'1 / 5','reduced motion must preserve touch gameplay');
 await reduced.close();
 // Test the real live joker-order editor on a small touch screen.
 const orderPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 orderPage.on('pageerror',e=>errors.push('joker-order: '+e.message));
 await orderPage.goto(base+'/card-game/',{waitUntil:'load'});
 await orderPage.evaluate(async()=>{
  const {createGame}=await import('/card-game/engine.mjs');
  const g=createGame(31254);g.jokers=['lantern','mirror'];
  localStorage.setItem('paperworld-card-paradox-v1',JSON.stringify(g));
 });
 await orderPage.reload();
 await orderPage.locator('.joker[data-joker="mirror"]').click({force:true});
 assert.equal(await orderPage.locator('#joker-inspector').isVisible(),true);
 assert.ok((await orderPage.locator('#joker-detail-position').innerText()).includes('2 / 2'));
 await orderPage.locator('#joker-move-left').click();
 const order=await orderPage.evaluate(()=>JSON.parse(localStorage.getItem('paperworld-card-paradox-v1')).jokers);
 assert.deepEqual(order,['mirror','lantern'],'joker reorder must persist');
 assert.ok((await orderPage.locator('#joker-detail-position').innerText()).includes('1 / 2'));
 await orderPage.screenshot({path:'artifacts/card-paradox/joker-inspector-mobile.png',animations:'disabled'});
 await orderPage.reload();
 assert.equal(await orderPage.locator('.joker[data-joker]').first().getAttribute('data-joker'),'mirror');
 await orderPage.close();
 // Capture a real interactive animation sequence: idle floating, two tactile
 // selections, then actual playing/scoring. Screenshots remain raw Chromium
 // output rather than a separately fabricated motion showcase.
 const motionPage=await browser.newPage({viewport:{width:960,height:620},deviceScaleFactor:1,
  reducedMotion:'no-preference'});
 motionPage.on('pageerror',e=>errors.push('motion-preview: '+e.message));
 await motionPage.goto(base+'/card-game/',{waitUntil:'load'});
 await motionPage.waitForFunction(()=>window.__PAPERWORLD_CARD_GAME__);
 mkdirSync('artifacts/card-paradox/motion-frames',{recursive:true});
 for(let i=0;i<26;i++){
  if(i===5)await motionPage.locator('#hand-cards .play-card').first().click({force:true});
  if(i===10)await motionPage.locator('#hand-cards .play-card').nth(1).click({force:true});
  if(i===14)await motionPage.locator('#play-button').click();
  await motionPage.screenshot({path:'artifacts/card-paradox/motion-frames/'+String(i).padStart(2,'0')+'.png',
   animations:'allow'});
  await motionPage.waitForTimeout(105);
 }
 const motionStats=await motionPage.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
 assert.ok(motionStats.score>0,'animation frames must depict actual game scoring');
 await motionPage.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: live card floating, glossy foil, selection spring, scoring hit, reduced-motion compliance, actual playable shop');
}finally{
 await browser.close();
 await new Promise(r=>server.close(r));
}

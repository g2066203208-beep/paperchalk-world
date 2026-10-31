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
 for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['landscape',844,390]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:name!=='desktop',hasTouch:name!=='desktop'});
  page.on('pageerror',e=>errors.push(name+': '+e.message));
  await page.goto(base+'/card-game/',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__PAPERWORLD_CARD_GAME__);
  const before=await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot());
  assert.equal(before.hand,8);
  assert.equal(before.phase,'battle');
  assert.equal(await page.locator('#hand-cards .play-card').count(),8);
  assert.equal(await page.locator('#target-value').innerText(),'250');
  await page.locator('#hand-cards .play-card').first().click();
  assert.equal(await page.locator('#selected-count').innerText(),'1 / 5');
  assert.equal(await page.locator('#play-button').isEnabled(),true);
  assert.ok(Number((await page.locator('#predicted-score').innerText()).replaceAll(',',''))>0);
  // Verify meaningful DOM access and do not render decorative fake controls.
  await page.locator('#discard-button').click();
  assert.equal((await page.evaluate(()=>window.__PAPERWORLD_CARD_GAME__.snapshot())).discards,2);
  await page.locator('#hand-cards .play-card').first().click();
  await page.locator('#play-button').click();
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
 await page.locator('#hand-cards .play-card').first().click();
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
 assert.deepEqual(errors,[]);
 console.log('PASS: actual playable browser shop → owned Joker → next blind → help');
}finally{
 await browser.close();
 await new Promise(r=>server.close(r));
}

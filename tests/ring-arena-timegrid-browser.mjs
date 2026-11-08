/* Real Chromium/WebGL acceptance test for the actual in-game 4v4 Timegrid.
 * The screenshots are exact browser pixels, not composited mockups. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),out=resolve('artifacts/ring-timegrid');
mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(file);}
 catch{return res.writeHead(404).end('not found');}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect?.();
  return s?.active&&s.renderer==='webgl-l2d'&&s.timegridEnabled&&
   s.timegrid?.phase==='planning'&&s.timegrid?.roles?.length===4;
 },null,{timeout:120000});
 await page.waitForTimeout(800);
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 const first=await inspect();
 assert.equal(first.timegrid.roles.length,4);
 assert.equal(first.timegrid.enemies.length,4);
 assert.equal(first.timegrid.timelineTicks,10);
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-ticks span').count(),11);
 assert.equal(await page.locator('.ring-timegrid [data-tg-card]').count(),4);
 assert.equal(await page.locator('[data-attack-card]').isVisible(),false,
  'the legacy one-click damage sandbox must not replace card combat');
 await page.screenshot({path:resolve(out,'01-planning-1280x720.png'),animations:'disabled'});
 const expected=['hero','ai-gun','ai-guard','ai-mage'];
 const cameraIds=['hero','ally-2','ally-3','ally-4'];
 for(let i=1;i<=4;i++){
  await page.locator('[data-tg-choose-role="'+i+'"]').click();
  await page.waitForTimeout(90);
  const s=await inspect();
  assert.equal(s.timegrid.controlledId,expected[i-1]);
  assert.equal(s.controlledActorId,cameraIds[i-1]);
  assert.equal(s.timegrid.roles.length,4);
  assert.equal(s.timegrid.enemies.length,4);
 }
 await page.locator('[data-control-ally="1"]').click();
 // Each manually controlled actor must receive actual engine-scheduled cards.
 await page.locator('[data-tg-auto-all]').click();
 const planned=await inspect();
 assert.ok(planned.timegrid.roles.every(x=>x.planned>=1),
  'autoplan writes an independent Timegrid schedule for each of four heroes');
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 assert.equal(await page.locator('.tg-band').count()>0,true);
 await page.screenshot({path:resolve(out,'02-planned-four-roles-1280x720.png'),animations:'disabled'});
 await page.locator('[data-tg-execute]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().timegrid.phase==='resolving',
  null,{timeout:10000});
 await page.waitForTimeout(1300);
 const progressing=await inspect();
 assert.equal(progressing.timegrid.phase,'resolving');
 await page.screenshot({path:resolve(out,'03-real-3d-tick-playback-1280x720.png'),animations:'disabled'});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena.inspect().timegrid;
  return s.round>=1&&s.phase!=='resolving';
 },null,{timeout:110000});
 const after=await inspect();
 assert.ok(after.timegrid.round>=1);
 assert.ok(after.timegrid.roles.some((x,i)=>x.hp!==first.timegrid.roles[i].hp)||
  after.timegrid.enemies.some((x,i)=>x.hp!==first.timegrid.enemies[i].hp),
  'real simulated actions change battle HP');
 assert.deepEqual(after.partyLine,first.partyLine,'3D party anchors must remain fixed');
 assert.deepEqual(after.opposingLine,first.opposingLine,'3D enemy anchors must remain fixed');
 assert.equal(after.timegrid.roles.length,4);
 await page.screenshot({path:resolve(out,'04-round-resolved-1280x720.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 const toggle=page.locator('[data-tg-toggle]');
 await toggle.click();
 await page.screenshot({path:resolve(out,'05-phone-timegrid-390x844.png'),animations:'disabled'});
 const mobile=await inspect();
 assert.equal(mobile.renderer,'webgl-l2d');
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 const summary={pass:true,commit:process.env.GITHUB_SHA||null,
  browser:'real Chromium/Swiftshader WebGL; no raster mock',
  scene:'ring-arena',party:first.partyLine,foes:first.opposingLine,
  actors:after.timegrid.roles,enemies:after.timegrid.enemies,
  initialEnemyHp:first.timegrid.enemies.map(x=>x.hp),
  resolvedEnemyHp:after.timegrid.enemies.map(x=>x.hp),
  mobileTimegrid:mobile.timegrid,errors};
 writeFileSync(resolve(out,'report.json'),JSON.stringify(summary,null,2));
 assert.deepEqual(errors,[],'real game must have zero page exceptions');
 console.log('PASS real 3D Timegrid four-role switching, 8 tracks, all-ally schedule, 10-tick damage and mobile');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

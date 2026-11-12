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
 await page.waitForTimeout(1050);
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena.inspect());
 const first=await inspect();
 assert.equal(first.timegrid.roles.length,4);
 assert.equal(first.timegrid.enemies.length,4);
 assert.equal(first.timegrid.timelineTicks,10);
 assert.equal(first.timegrid.ui,'handpainted-film-portrait-timegrid-v4');
 assert.equal(first.timegrid.version,'4.0');
 assert.equal(first.timegrid.tacticsOpen,false);
 assert.equal(await page.locator('.ring-timegrid .tg-film-viewport').count(),1);
 assert.equal(await page.locator('.ring-timegrid .tg-reel').count(),1);
 assert.equal(await page.locator('.ring-timegrid .tg-film-texture').count(),8);
 assert.equal(await page.locator('.tg-reel > .tg-row').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-portrait img').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-hp-value').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-hp-bar').count(),8);
 assert.equal(await page.locator('.tg-film-frame').count(),0,'no previous CSS imitation film frames');
 assert.equal(await page.locator('.tg-tactics').count(),0,'old planner must not exist');
 assert.equal(await page.locator('[data-tg-quick]').count(),1);
 const visual=await page.evaluate(()=>{
  const stage=document.querySelector('#ring-arena-canvas').getBoundingClientRect();
  const hud=document.querySelector('.ring-timegrid');
  const box=hud.getBoundingClientRect(),style=getComputedStyle(hud);
  const rail=getComputedStyle(hud,'::before');
  const rows=[...hud.querySelectorAll('.tg-row')].map(e=>e.getBoundingClientRect());
  return {stageWidth:stage.width,hudWidth:box.width,bg:style.backgroundImage,
   shadow:style.boxShadow,rail:rail.content,
   rows:rows.map(r=>({width:r.width,height:r.height}))};
 });
 assert.ok(visual.stageWidth>=1275&&visual.hudWidth>=1275,'real 3D fills the screen');
 assert.equal(visual.bg,'none','film appearance comes from the GPT asset, not HUD CSS backgrounds');
 assert.equal(visual.shadow,'none','no invented floating panel shadow');
 assert.ok(visual.rail==='none'||visual.rail==='normal','real sprocket holes are in the texture, not pseudo-elements');
 assert.ok(visual.rows.every(r=>r.width>=170&&r.width<280&&r.height>=50&&r.height<=95),
  'all eight portraits fill the larger, evenly spaced right-hand film frames');
 const hp=await page.locator('.tg-hp-bar').evaluateAll(nodes=>nodes.map(
  n=>Number(n.getAttribute('aria-valuenow'))));
 assert.equal(hp.length,8);
 assert.ok(hp.every(Number.isFinite));
 await page.waitForFunction(()=>{
  const faces=[...document.querySelectorAll('.ring-timegrid .tg-portrait img')];
  return faces.length===8&&faces.every(x=>x.complete&&x.naturalWidth>0);
 },null,{timeout:30000});
 await page.waitForFunction(()=>{
  const textures=[...document.querySelectorAll('.tg-reel > .tg-row .tg-film-texture')];
  return textures.length===8&&textures.every(im=>im.complete&&im.naturalWidth===272);
 },null,{timeout:30000});
 const filmGeometry=await page.locator('.tg-film-viewport').evaluate(el=>{
  const r=el.getBoundingClientRect();
  return {width:r.width,height:r.height,top:r.top,right:r.right,
   tile:el.querySelector('.tg-row').getBoundingClientRect().height};
 });
 assert.ok(Math.abs(filmGeometry.height-720)<2,
  'film runs from the very top to the bottom of the battle viewport');
 assert.ok(filmGeometry.width>=138,'film is much wider than the rejected strip');
 assert.equal(await page.locator('.tg-film-blank').count(),2,'top/bottom empty frames are required');
 assert.ok(filmGeometry.right<=1280&&filmGeometry.top>=0,
  'reel always stays inside the stage');
 const hpLabels=await page.locator('.tg-hp-value').allTextContents();
 assert.ok(hpLabels.every(x=>{const parts=x.trim().split('/');return parts.length===2&&parts.every(v=>v!==''&&Number.isInteger(Number(v)));}),
  'all eight portraits show their real HP');
 await page.screenshot({path:resolve(out,'01-planning-1280x720.png'),animations:'disabled'});
 const expected=['hero','ai-gun','ai-guard','ai-mage'];
 const cameraIds=['hero','ally-2','ally-3','ally-4'];
 for(let i=1;i<=4;i++){
  await page.locator('[data-tg-choose-role="'+i+'"]').click();
  await page.waitForTimeout(80);
  const state=await inspect();
  assert.equal(state.timegrid.controlledId,expected[i-1]);
  assert.equal(state.controlledActorId,cameraIds[i-1]);
  assert.equal(state.timegrid.tacticsOpen,false);
  assert.equal(state.timegrid.timelineOpen,true,
   'clicking a portrait opens its own ten-step panel while switching camera');
  assert.equal(await page.locator('[data-tg-tick]').count(),10);
 }
 await page.locator('[data-tg-choose-role="1"]').click();
 await page.screenshot({path:resolve(out,'01b-timeline-open-1280x720.png'),animations:'disabled'});
 await page.locator('[data-tg-card]').first().click();
 await page.locator('[data-tg-tick="1"]').click();
 assert.ok((await inspect()).timegrid.roles[0].planned>=1,
  'clicking a real card then tick 1 schedules the controlled hero in the engine');
 // No legacy planner: only avatar-tethered ten-step timeline is mounted.
 assert.equal(await page.locator('.tg-tactics').count(),0);
 await page.locator('[data-tg-quick]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().timegrid.phase==='resolving',
  null,{timeout:10000});
 const planned=await inspect();
 assert.ok(planned.timegrid.roles.every(x=>x.planned>=1),
  'real Timegrid schedules all four allies');
 await page.screenshot({path:resolve(out,'02-planned-four-roles-1280x720.png'),animations:'disabled'});
 assert.equal(await page.locator('.tg-tactics').count(),0);
 await page.waitForTimeout(1350);
 const progressing=await inspect();
 assert.equal(progressing.timegrid.phase,'resolving');
 await page.screenshot({path:resolve(out,'03-real-3d-tick-playback-1280x720.png'),animations:'disabled'});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena.inspect().timegrid;
  return s.round>=1&&s.phase!=='resolving';
 },null,{timeout:110000});
 const after=await inspect();
 assert.ok(after.timegrid.round>=1);
 const aliveCount=after.timegrid.roles.filter(x=>x.hp>0).length+
  after.timegrid.enemies.filter(x=>x.hp>0&&!x.dead).length;
 assert.ok(after.timegrid.roles.some((x,i)=>x.hp!==first.timegrid.roles[i].hp)||
  after.timegrid.enemies.some((x,i)=>x.hp!==first.timegrid.enemies[i].hp),
  'the eight avatar HP bars follow true ten-tick V1.7 simulation');
 assert.deepEqual(after.partyLine,first.partyLine,'party actors never change standing position');
 assert.deepEqual(after.opposingLine,first.opposingLine,'enemy actors never change standing position');
 assert.equal(after.timegrid.tacticsOpen,false);
 assert.equal(await page.locator('.tg-reel > .tg-row').count(),aliveCount,
  'death splices a real enemy frame out of the live film reel');
 await page.screenshot({path:resolve(out,'04-round-resolved-1280x720.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 assert.equal(await page.locator('.tg-reel > .tg-row').count(),aliveCount,
  'phone reel retains the real live-member count after deaths');
 assert.equal(await page.locator('.tg-tactics').count(),0);
 const mobile=await inspect();
 assert.equal(mobile.renderer,'webgl-l2d');
 await page.screenshot({path:resolve(out,'05-phone-timegrid-390x844.png'),animations:'disabled'});
 // Real DOM/state acceptance for a death splice followed by a newcomer.
 // QA-only mutator is never exposed in normal game mode.
 await page.setViewportSize({width:1280,height:720});
 await page.goto(origin+'/index.html?scene=ring-arena&timegridQA=1',
  {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{
  const hud=document.querySelector('.ring-timegrid');
  return window.PaperWorldGameRingArena?.inspect?.()?.active&&hud?.__timegridQA;
 },null,{timeout:120000});
 await page.waitForTimeout(1000);
 const moved=await page.evaluate(()=>{
  const hud=document.querySelector('.ring-timegrid');
  const before=[...document.querySelectorAll('.tg-reel > .tg-row')]
   .map(x=>x.dataset.tgActor);
  const died=hud.__timegridQA.remove('enemy-s4');
  return {before,died,revision:Number(hud.dataset.reelRevision)};
 });
 assert.equal(moved.died,true);
 assert.equal(moved.before.length,8);
 assert.equal(moved.revision,1,'death splices exactly one frame and triggers quick roll');
 await page.waitForFunction(()=>document.querySelectorAll('.tg-reel > .tg-row').length===7,
  null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelectorAll('.tg-ghost').length===0,
  null,{timeout:30000});
 assert.equal(await page.locator('.tg-ghost').count(),0,'dead portrait ghost fully exits');
 await page.screenshot({path:resolve(out,'06-death-splice-1280x720.png'),animations:'disabled'});
 const recruited=await page.evaluate(()=>{
  const hud=document.querySelector('.ring-timegrid');
  return hud.__timegridQA.recruit({id:'enemy-join-5',side:'enemy',name:'增援',
   hp:36,maxHp:36,poise:0,poiseMax:10,energy:0,dead:false,
   actions:[],hand:[]});
 });
 assert.equal(recruited,true);
 await page.waitForFunction(()=>document.querySelectorAll('.tg-reel > .tg-row').length===8,
  null,{timeout:30000});
 await page.waitForTimeout(450);
 assert.equal(await page.locator('.tg-reel > .tg-row').count(),8);
 assert.equal(await page.locator('.tg-reel > .tg-row[data-tg-actor="enemy-join-5"]').count(),1);
 const revision=await page.locator('.ring-timegrid').getAttribute('data-reel-revision');
 assert.equal(revision,'2','recruit splices one new genuine film frame');
 await page.screenshot({path:resolve(out,'07-newcomer-splice-1280x720.png'),animations:'disabled'});
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

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
 assert.equal(first.timegrid.ui,'continuous-35mm-filmstrip-rectangular-frames');
 assert.equal(first.timegrid.version,'1.7');
 assert.equal(first.timegrid.tacticsOpen,false);
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 assert.equal(await page.locator('.tg-faction').count(),2);
 assert.equal(await page.locator('.ring-timegrid .tg-portrait img').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-hp-value').count(),8);
 assert.equal(await page.locator('.ring-timegrid .tg-hp-bar').count(),8);
 assert.equal(await page.locator('.tg-tactics').isVisible(),false,
  'NO giant card panel, timeline table, action buttons or deck on battle startup');
 assert.equal(await page.locator('.ring-timegrid .tg-card,.ring-timegrid .tg-ticks,.ring-timegrid .tg-tools').count(),0,
  'no old UI scaffolding must appear in persistent avatar HUD');
 const hudBox=await page.evaluate(()=>{
  const stage=document.querySelector('#ring-arena-canvas').getBoundingClientRect();
  const avatars=document.querySelector('.ring-timegrid').getBoundingClientRect();
  const s=getComputedStyle(document.querySelector('.ring-timegrid'));
  return {stageRight:stage.right,stageWidth:stage.width,
   avatarRight:avatars.right,avatarWidth:avatars.width,avatarLeft:avatars.left,
   background:s.backgroundColor,shadow:s.boxShadow};
 });
 assert.ok(hudBox.stageWidth>=1275&&hudBox.stageRight>=1275,
  'full-width actual WebGL world is never resized for UI');
 assert.ok(hudBox.avatarLeft>900&&hudBox.avatarWidth<320,
  'continuous vertical reel must remain an unobtrusive right-edge HUD');
 assert.equal(await page.locator('.tg-film-frame').count(),8);
 assert.equal(await page.locator('.tg-portrait .tg-cutout').count(),8);
 assert.equal(await page.locator('.tg-divider').count(),1);
 assert.equal(await page.locator('.tg-poise-bar').count(),8);
 assert.equal(await page.locator('.tg-energy-bar').count(),8);
 const film=await page.locator('.ring-timegrid').evaluate(el=>{
  const style=getComputedStyle(el);
  const rails=[getComputedStyle(el,'::before'),getComputedStyle(el,'::after')];
  const rows=[...el.querySelectorAll('.tg-film-frame')];
  const rectangles=rows.map(row=>{
   const rect=row.getBoundingClientRect();
   const info=row.querySelector('.tg-identity').getBoundingClientRect();
   return {x:rect.x,width:rect.width,h:rect.height,
    inset:info.left>=rect.left&&info.right<=rect.right,
    clip:getComputedStyle(row.querySelector('.tg-portrait')).clipPath};
  });
  return {bg:style.backgroundColor,rectangles,rails:rails.map(r=>({
   content:r.content,background:r.backgroundImage
  }))};
 });
 assert.ok(film.rectangles.every(r=>r.inset&&r.clip==='none'),
  'each negative is a RECTANGLE with status INSIDE the portrait, not a separate card');
 assert.ok(film.rectangles.every(r=>Math.abs(r.x-film.rectangles[0].x)<1),
  'all eight film negatives must share the SAME uninterrupted film rail');
 assert.ok(film.rails.every(x=>x.content!=='none'&&x.background.includes('radial-gradient')),
  'both left and right continuous sprocket rails must be present');
 const values=await page.locator('.tg-film-frame').evaluateAll(nodes=>nodes.map(n=>({
  hp:Number(n.querySelector('.tg-hp-bar').getAttribute('aria-valuenow')),
  poise:Number(n.querySelector('.tg-poise-bar').getAttribute('aria-valuenow')),
  energy:Number(n.querySelector('.tg-energy-bar').getAttribute('aria-valuenow'))
 })));
 assert.equal(values.length,8);
 assert.ok(values.every(v=>Number.isFinite(v.hp)&&Number.isFinite(v.poise)&&Number.isFinite(v.energy)));
 await page.waitForFunction(()=>{
  const faces=[...document.querySelectorAll('.ring-timegrid .tg-portrait img')];
  return faces.length===8&&faces.every(x=>x.complete&&x.naturalWidth>0&&
   x.src.startsWith('data:image/'));
 },null,{timeout:30000});
 assert.equal(hudBox.background,'rgba(0, 0, 0, 0)');
 assert.notEqual(hudBox.shadow,'none',
  'a physical vintage film reel should cast a subtle shadow, not a floating HUD panel');
 const hpLabels=await page.locator('.tg-hp-value').allTextContents();
 assert.ok(hpLabels.every(x=>/^\d+\/\d+$/.test(x.trim())),
  'all eight portraits display real current HP / max HP');
 await page.screenshot({path:resolve(out,'01-planning-1280x720.png'),animations:'disabled'});
 const expected=['hero','ai-gun','ai-guard','ai-mage'];
 const cameraIds=['hero','ally-2','ally-3','ally-4'];
 for(let i=1;i<=4;i++){
  await page.locator('[data-tg-choose-role="'+i+'"]').click();
  await page.waitForTimeout(80);
  const state=await inspect();
  assert.equal(state.timegrid.controlledId,expected[i-1]);
  assert.equal(state.controlledActorId,cameraIds[i-1]);
  assert.equal(state.timegrid.tacticsOpen,false,
   'selecting the active ally switches the real world camera without opening a menu');
 }
 await page.locator('[data-tg-choose-role="1"]').click();
 // Selecting a target offers a TRANSIENT, explicit action tray only then.
 await page.locator('[data-tg-open-target="enemy-1"]').click();
 assert.equal(await page.locator('.tg-tactics').isVisible(),true);
 assert.equal(await page.locator('[data-tg-card]').count(),4);
 assert.equal(await page.locator('[data-tg-tick]').count(),10);
 await page.locator('[data-tg-auto-all]').click();
 const planned=await inspect();
 assert.ok(planned.timegrid.roles.every(x=>x.planned>=1),
  'real engine still schedules all four character decks, not merely HP UI');
 await page.screenshot({path:resolve(out,'02-planned-four-roles-1280x720.png'),animations:'disabled'});
 await page.locator('[data-tg-execute]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().timegrid.phase==='resolving',
  null,{timeout:10000});
 assert.equal(await page.locator('.tg-tactics').isVisible(),false,
  'tactical choices close automatically for the real 3D action');
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
 assert.ok(after.timegrid.roles.some((x,i)=>x.hp!==first.timegrid.roles[i].hp)||
  after.timegrid.enemies.some((x,i)=>x.hp!==first.timegrid.enemies[i].hp),
  'the eight avatar HP bars follow true ten-tick V1.7 simulation');
 assert.deepEqual(after.partyLine,first.partyLine,'party actors never change standing position');
 assert.deepEqual(after.opposingLine,first.opposingLine,'enemy actors never change standing position');
 assert.equal(after.timegrid.tacticsOpen,false);
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 await page.screenshot({path:resolve(out,'04-round-resolved-1280x720.png'),animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 assert.equal(await page.locator('.ring-timegrid .tg-row').count(),8);
 assert.equal(await page.locator('.tg-tactics').isVisible(),false);
 const mobile=await inspect();
 assert.equal(mobile.renderer,'webgl-l2d');
 await page.screenshot({path:resolve(out,'05-phone-timegrid-390x844.png'),animations:'disabled'});
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

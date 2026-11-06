/* Actual Chromium proof: never substitute an AI mock for the real game. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(file)}catch{res.writeHead(404).end('not found');return}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:50000});
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena?.inspect());
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect();
  return a?.active&&a?.renderer==='webgl-l2d'&&a?.heroStatic===true&&
   a?.previewPose==='level'&&a?.eyeLevel===true&&a?.l2dReady===5&&a?.heroTextureUploads>=1;
 },null,{timeout:100000});
 await page.waitForTimeout(650);
 const outer=await inspect();
 assert.equal(outer.mode,'outer');assert.equal(outer.shotIndex,0);
 assert.equal(outer.shotName,'固定左机位');
 assert.equal(outer.camera.shot,'left');
 assert.equal(outer.cameraCount,1);
 assert.equal(outer.eyeLevel,true,'camera is at heroine true eye height');
 assert.equal(outer.camera.eye.y,1.50);
 assert.equal(outer.camera.focus.y,1.50);
 assert.equal(outer.lensShift,.23);
 assert.equal(outer.previewPose,'level');
 assert.ok(Math.abs(outer.cameraPitchDeg)<.001);
 assert.equal(outer.heroTextureUploads,1,'static heroine must not upload every frame');
 assert.deepEqual(outer.visibleActorIds,['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.ok(outer.safety.valid&&outer.safety.clear,'actual alpha must preserve enemy view');
 assert.equal(await page.locator('[data-shot]').count(),0,'remove BOTH camera-switch buttons');
 assert.equal(await page.locator('[data-pose]').count(),0,'no redundant pose toggle');
 assert.equal(await page.locator('[data-mode]').count(),2);
 assert.ok(await page.locator('[data-exit]').isVisible());
 const originalCamera=JSON.stringify(outer.camera);
 const originalActors=JSON.stringify(outer.actors);
 await page.screenshot({path:'artifacts/ring-arena/final-eye-level-3q-1280x720.png'});
 // Play the real authored Attack card, select explicitly numbered target #2,
 // and verify the complete director: lock, motion, impact, HP update, return.
 assert.equal(outer.director.card,'斧柄横扫');
 assert.equal(outer.director.baseDamage,12);
 assert.equal(outer.director.playing,false);
 await page.waitForFunction(()=>{
  const a=window.PaperWorldGameRingArena?.inspect()?.directorArt;
  return a?.hero?.loaded&&a?.enemy?.loaded;
 },null,{timeout:12000});
 const art=await inspect();
 assert.ok(art.directorArt.hero.src.endsWith('/hero-axe-attack.webp'));
 assert.ok(art.directorArt.enemy.src.endsWith('/enemy-suit-hit.webp'));
 assert.equal(await page.locator('[data-attack-card]').count(),1);
 await page.locator('[data-attack-card]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.director?.armed);
 assert.equal(await page.locator('[data-director-targets]').isVisible(),true);
 assert.equal(await page.locator('[data-director-enemy]').count(),4);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-target-selection.png'});
 await page.locator('[data-director-enemy="2"]').click();
 // A 650ms action may complete while Chromium's software renderer yields.
 // Verify persistent HP/completed outcome, not a fleeting animation phase.
 // In slow software WebGL a single draw may skip across the entire
 // impact window. Validate the irrevocable, single target damage RESULT
 // rather than waiting for a short-lived director.applied=true property.
 // The frozen real-WebGL QA scene below verifies visible impact frames.
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.enemyHP?.['enemy-2']===24;
 },null,{timeout:14000});
 const impact=await inspect();
 assert.equal(impact.director.enemyHP['enemy-2'],24);
 assert.equal(impact.director.baseDamage,12);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-impact.png'});
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.completedAttacks===1&&!d?.playing;
 },null,{timeout:15000});
 const returned=await inspect();
 assert.equal(returned.director.phase,'idle');
 assert.equal(returned.director.lastTarget,'enemy-2');
 assert.equal(returned.director.enemyHP['enemy-1'],36);
 assert.equal(returned.director.enemyHP['enemy-2'],24);
 assert.equal(returned.director.enemyHP['enemy-3'],36);
 assert.equal(returned.director.enemyHP['enemy-4'],36);
 assert.equal(JSON.stringify(returned.camera),originalCamera);
 assert.equal(JSON.stringify(returned.actors),originalActors);
 assert.equal(returned.heroTextureUploads,1);
 assert.equal(returned.directorCameraTemporary,false);
 assert.equal(returned.directorArt.cut,'none');
 assert.equal(returned.directorArt.hero.loaded,true);
 assert.equal(returned.directorArt.enemy.loaded,true);
 await page.screenshot({path:'artifacts/ring-arena/director-attack-return.png'});
 // Do not miscast the suited male hit portrait as the third female enemy.
 await page.locator('[data-attack-card]').click();
 await page.locator('[data-director-enemy="3"]').click();
 // Gender-safe art is asserted below with fixed-frame WebGL QA mode.
 await page.waitForFunction(()=>{
  const d=window.PaperWorldGameRingArena?.inspect()?.director;
  return d?.completedAttacks===2&&!d?.playing;
 },null,{timeout:20000});
 const followup=await inspect();
 assert.equal(followup.director.enemyHP['enemy-2'],24);
 assert.equal(followup.director.enemyHP['enemy-3'],24);
 assert.equal(followup.director.enemyHP['enemy-4'],36);
 assert.equal(JSON.stringify(followup.camera),originalCamera);
 assert.equal(JSON.stringify(followup.actors),originalActors);
 // Touch/keyboard inputs must never reveal a second camera.
 await page.mouse.move(420,250);await page.mouse.down();
 await page.mouse.move(850,260,{steps:7});await page.mouse.up();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 await page.keyboard.press('a');await page.keyboard.press('d');
 await page.waitForTimeout(350);
 const stable=await inspect();
 assert.equal(stable.shotIndex,0);assert.equal(JSON.stringify(stable.camera),originalCamera);
 assert.equal(JSON.stringify(stable.actors),originalActors);
 assert.equal(stable.heroTextureUploads,1);
 // The second encounter topology is not a second camera.
 await page.locator('[data-mode="inner"]').click();
 await page.waitForTimeout(450);
 const inner=await inspect();
 assert.equal(inner.mode,'inner');assert.equal(inner.shotIndex,0);
 assert.equal(inner.camera.shot,'left');assert.equal(inner.cameraCount,1);
 assert.equal(inner.eyeLevel,true);
 assert.equal(inner.camera.eye.y,1.50);
 assert.ok(Math.abs(inner.cameraPitchDeg)<.001);
 assert.ok(inner.safety.valid&&inner.safety.clear);
 assert.equal(inner.heroTextureUploads,1);
 await page.screenshot({path:'artifacts/ring-arena/final-inner-fixed-left.png'});
 // Responsive full stage, same perspective, no second camera or cutoff.
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(400);
 assert.ok((await inspect()).safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-desktop-1920x1080.png'});
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(400);
 const landscape=await inspect();assert.equal(landscape.shotIndex,0);
 assert.ok(landscape.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-mobile-landscape.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(400);
 const portrait=await inspect();
 assert.equal(portrait.shotIndex,0);
 assert.ok(portrait.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-mobile-portrait.png'});
 // Developer rollback works with original approved dynamic L2D untouched.
 await page.goto(origin+'/index.html?scene=ring-arena&heroPose=original',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&!s.heroStatic&&s.previewPose==='original'&&s.l2dReady===5&&
   s.heroine?.id==='protagonist'&&s.heroine?.side==='back'&&s.heroine?.ready;
 },null,{timeout:100000});
 const restored=await inspect();
 assert.equal(restored.cameraCount,1);
 assert.equal(restored.shotIndex,0);
 assert.ok(restored.safety.valid&&restored.safety.clear);
 await page.screenshot({path:'artifacts/ring-arena/final-original-L2D-recovery.png'});
 assert.deepEqual(errors,[],'unexpected JavaScript exceptions');
 // Repeat the QA capture on the same ACTUAL scene, but hold the
 // deterministic director clock for screenshot generation only. Gameplay
 // remains real-time and never exposes qaFrame without directorQA=1.
 await page.close();
 const qa=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const qaErrors=[];
 qa.on('pageerror',e=>qaErrors.push(e.message));
 await qa.goto(origin+'/index.html?scene=ring-arena&directorQA=1',
  {waitUntil:'domcontentloaded',timeout:50000});
 await qa.waitForFunction(()=>{
  const game=window.PaperWorldGameRingArena;
  return game?.inspect()?.active&&game?.inspect()?.l2dReady===5&&
   game?.inspect()?.directorArt?.hero?.loaded&&game?.inspect()?.directorArt?.enemy?.loaded;
 },null,{timeout:100000});
 const invoke=async(target,ms)=>qa.evaluate(([t,at])=>
  window.PaperWorldGameRingArena.qaFrame(t,at),[target,ms]);
 const frameHero=await invoke('enemy-2',200);
 assert.equal(frameHero.phase,'swing');
 assert.equal(frameHero.applied,false);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-cut'),'attacker');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds.includes('hero')),false,
  'attacking illustration replaces the idle hero, not duplicates it');
 await qa.screenshot({path:'artifacts/ring-arena/v21-snap-hero-swing.png'});
 const frameHit=await invoke('enemy-2',335);
 assert.equal(frameHit.applied,true);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-cut'),'victim');
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-hit-portrait'),'yes');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds.includes('enemy-2')),false,
  'hurt illustration replaces the original target for its brief hit pose');
 await qa.screenshot({path:'artifacts/ring-arena/v21-snap-impact.png'});
 const frameRecoil=await invoke('enemy-2',440);
 assert.equal(frameRecoil.phase,'reaction');
 await qa.screenshot({path:'artifacts/ring-arena/v21-snap-enemy-recoil.png'});
 const frameFemale=await invoke('enemy-3',440);
 assert.equal(await qa.locator('[data-director-cinematic]').getAttribute('data-hit-portrait'),'no');
 assert.equal(await qa.locator('[data-action-enemy]').evaluate(
  el=>getComputedStyle(el).visibility),'hidden');
 assert.equal(await qa.evaluate(()=>
  window.PaperWorldGameRingArena.inspect().directorArt.drawnActorIds.includes('enemy-3')),true,
  'female target keeps her original L2D without a male substituted pose');
 await qa.screenshot({path:'artifacts/ring-arena/v21-female-original-l2d-reaction.png'});
 assert.deepEqual(qaErrors,[]);
 await qa.close();
 console.log('PASS: real WebGL eye-height 3/4 fixed-left heroine, four enemies, static GPU upload once, restored original L2D, desktop/mobile');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}

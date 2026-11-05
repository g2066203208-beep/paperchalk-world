/* Live browser proof: published L2D art, world-space anchors and two orbit views.
 * Saves the ACTUAL game canvas as screenshots; never substitute mock pictures.
 */
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
 const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
 const path=resolve(root,'.'+name);
 if(!path.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(path)}catch{res.writeHead(404).end('not found');return}
 res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});
 res.end(bytes)
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?scene=ring-arena',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&s.renderer==='webgl-l2d'&&s.actors.allies.length===4&&
   s.actors.enemies.length===4&&document.getElementById('ring-arena-canvas')?.width>800;
 },null,{timeout:65000});
 await page.screenshot({path:'artifacts/ring-arena/l2d-initial.png'});
 console.log('INIT',JSON.stringify(await page.evaluate(()=>{
   const r=window.PaperWorldGameRingArena?.inspect();
   return {active:r?.active,renderer:r?.renderer,l2dReady:r?.l2dReady,
     pageScene:document.querySelector('#scene')?.dataset.scene,
     sources:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
       .map(id=>{const a=window.PaperchalkL2D?.get(id);
         return {id,ready:a?.root?.dataset.l2dState,hidden:a?.root?.hidden,
           imgHidden:a?.img?.hidden,canvas:a?.canvas?.width,
           character:a?.img?.dataset.characterId}})
   };
 })));
 try{
 await page.waitForFunction(()=>{
  const r=window.PaperWorldGameRingArena?.inspect();
  return window.PaperchalkCharacterDev?.ready&&r?.l2dReady===5&&
   ['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
     .every(id=>window.PaperchalkL2D?.get(id)?.root?.dataset.l2dState==='ready');
 },null,{timeout:75000});
 }catch(error){
   await page.screenshot({path:'artifacts/ring-arena/l2d-failed-diagnostic.png'}).catch(()=>{});
   console.error('DIAG',JSON.stringify(await page.evaluate(()=>({
     scene:document.querySelector('#scene')?.dataset.scene,
     ring:window.PaperWorldGameRingArena?.inspect(),
     ready:window.PaperchalkCharacterDev?.ready,
     errors:document.getElementById('dev-character-status')?.textContent,
     actors:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
      .map(id=>{const a=window.PaperchalkL2D?.get(id);
       return {id,ready:a?.root?.dataset.l2dState,hidden:a?.root?.hidden,
        imgHidden:a?.img?.hidden,w:a?.canvas?.width,
        char:a?.img?.dataset.characterId,mode:a?.root?.dataset.l2dMode}})
   }))));
   throw error;
 }
 await page.waitForTimeout(800);
 const get=()=>page.evaluate(()=>{
  const r=window.PaperWorldGameRingArena.inspect();
  return {arena:r,
   sources:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
    .map(id=>{const a=window.PaperchalkL2D.get(id);return {
     id,character:a.img.dataset.characterId,side:a.img.dataset.characterSide,
     animated:a.root.dataset.l2dAnimated,mode:a.root.dataset.l2dMode,
     ready:a.root.dataset.l2dState,hidden:a.root.hidden,
     canvasW:a.canvas.width,canvasH:a.canvas.height
    }})
  };
 });
 const before=await get();
 assert.equal(before.arena.mode,'outer');
 assert.equal(before.arena.shotIndex,0);
 assert.equal(before.arena.shotName,'左侧');
 assert.equal(before.arena.camera.shot,'left');
 assert.equal(before.arena.ring.stageType,'wide-cinematic-arc');
 assert.equal(before.arena.l2dReady,5);
 assert.equal(await page.locator('[data-shot]').count(),2,'only left and right buttons');
 assert.equal(await page.locator('[data-shot="1"]').textContent(),'右机位 ▶');
 assert.equal(await page.locator('[data-shot="2"]').count(),0,'remove center/third station');
 assert.equal(await page.locator('[data-shift]').count(),0,'remove redundant camera controls');
 assert.equal(before.sources.find(p=>p.id==='player').side,'back');
 assert.ok(before.sources.every(p=>!p.hidden&&p.ready==='ready'&&p.canvasW>0));
 const originalOuter=JSON.stringify(before.arena.actors);
 const computed=await page.evaluate(()=>{
  const a=window.PaperWorldRingArena,scene=a.layout('outer'),c=a.camera('outer',0);
  return {hero:a.portraitBounds(scene.allies[0],c),
   heroCenter:a.project({...scene.allies[0],y:.85},c),
   enemies:scene.enemies.map(p=>a.portraitBounds(p,c)),
   cameraCount:a.CAMERA_STOPS.outer.length};
 });
 assert.equal(computed.cameraCount,2);
 assert.ok(computed.hero.valid&&computed.hero.heightFraction>1.10);
 assert.ok(computed.heroCenter.x<-.45&&computed.heroCenter.x>-.80,
   'real L2D heroine center remains in near-left foreground');
 assert.ok(computed.enemies.every(b=>b.valid&&b.left>-.97&&b.right<.97));
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-left.png'});
 // Only on POINTER RELEASE may the camera snap to the other approved position.
 await page.mouse.move(540,240);await page.mouse.down();
 await page.mouse.move(735,240,{steps:7});
 assert.equal((await get()).arena.shotIndex,0,'no follow-pointer camera motion');
 await page.mouse.up();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().settled,null,{timeout:7000});
 const right=await get();
 assert.equal(right.arena.shotIndex,1);
 assert.equal(right.arena.shotName,'右侧');
 assert.equal(right.arena.camera.shot,'right');
 assert.equal(right.arena.l2dReady,5);
 assert.equal(JSON.stringify(right.arena.actors),originalOuter);
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-right.png'});
 // Extra same-direction swipe never reveals a nonexistent intermediate view.
 await page.mouse.move(540,240);await page.mouse.down();
 await page.mouse.move(735,240,{steps:5});await page.mouse.up();
 assert.equal((await get()).arena.shotIndex,1);
 await page.locator('[data-mode="inner"]').click();
 await page.waitForTimeout(350);
 const innerRight=await get();
 assert.equal(innerRight.arena.mode,'inner');
 assert.equal(innerRight.arena.shotIndex,1);
 assert.equal(innerRight.arena.camera.shot,'right');
 assert.equal(innerRight.arena.l2dReady,5);
 const originalInner=JSON.stringify(innerRight.arena.actors);
 await page.screenshot({path:'artifacts/ring-arena/l2d-inner-right.png'});
 await page.locator('[data-shot="0"]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().settled,null,{timeout:7000});
 const innerLeft=await get();
 assert.equal(innerLeft.arena.shotIndex,0);
 assert.equal(innerLeft.arena.camera.shot,'left');
 assert.equal(JSON.stringify(innerLeft.arena.actors),originalInner);
 await page.screenshot({path:'artifacts/ring-arena/l2d-inner-left.png'});
 // Real WebGL projection across desktop and mobile viewport sizes.
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/ring-arena/desktop-1920x1080.png'});
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/ring-arena/mobile-landscape-844x390.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(300);
 const mobile=await get();
 assert.equal(JSON.stringify(mobile.arena.actors),originalInner);
 assert.ok(mobile.arena.effectiveVerticalFov>=mobile.arena.camera.fov,
  'mobile portrait lens should preserve horizontal team composition');
 await page.screenshot({path:'artifacts/ring-arena/mobile-portrait-390x844.png'});
 assert.deepEqual(errors,[],'unexpected browser JavaScript errors');
 await page.close();
 console.log('PASS: 2 near-hero fixed cameras with back L2D and 4 uncropped foes, screen sizes, immutable world');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
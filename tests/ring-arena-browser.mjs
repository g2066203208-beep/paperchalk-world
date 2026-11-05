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
 assert.equal(before.arena.l2dReady,5);
 assert.deepEqual(before.arena.visibleActorIds,['hero','enemy-1','enemy-2','enemy-3','enemy-4']);
 assert.deepEqual(before.arena.hiddenAlliedTeammateIds,['ally-2','ally-3','ally-4']);
 assert.equal(before.sources.find(s=>s.id==='player').side,'back');
 assert.ok(before.sources.every(s=>!s.hidden&&s.ready==='ready'&&s.canvasW>0),'all 8 authentic L2D sources active');
 const original=JSON.stringify(before.arena.actors);
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-left.png'});
 for(let i=0;i<7;i++)await page.locator('[data-shift="1"]').click();
 await page.waitForTimeout(700);
 const moved=await get();
 assert.equal(JSON.stringify(moved.arena.actors),original,'world positions must be unchanged by camera pan');
 assert.notEqual(moved.arena.camera.angle,before.arena.camera.angle);
 assert.equal(moved.arena.l2dReady,5);
 assert.deepEqual(moved.arena.visibleActorIds,before.arena.visibleActorIds);
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-right.png'});
 await page.locator('[data-mode="inner"]').click();
 await page.waitForTimeout(700);
 const inner=await get();
 assert.equal(inner.arena.mode,'inner');
 assert.equal(inner.arena.camera.radius,3.45);
 assert.equal(inner.arena.l2dReady,5);
 assert.deepEqual(inner.arena.visibleActorIds,before.arena.visibleActorIds);
 assert.equal(inner.arena.actors.allies.length,4);
 await page.screenshot({path:'artifacts/ring-arena/l2d-inner-right.png'});
 assert.deepEqual(errors,[],'browser should not report unexpected errors');
 await page.close();
 console.log('PASS: heroine + 4 enemies drawn; 3 allied teammates hidden; all world coordinates fixed; true 3D camera orbit');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
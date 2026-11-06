/* Actual Chromium proof: never substitute an AI mock for the real game. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
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
   a?.previewPose==='3q'&&a?.l2dReady===5&&a?.heroTextureUploads>=1;
 },null,{timeout:100000});
 await page.waitForTimeout(650);
 // Export actual source canvases so unexpected clouds/mattes can be diagnosed
 // without guessing from the composed 3D screenshot or altering source art.
 const castCaptures=await page.evaluate(()=>{
  return ['enemy','enemy2','enemy3','enemy4'].map((slot,index)=>{
   const a=window.PaperchalkL2D?.get(slot);
   const source=a?.clip?.type==='native'?a.clip.img:a?.canvas;
   const item={slot,actor:index+1,character:a?.img?.dataset?.characterId||null,
    side:a?.img?.dataset?.characterSide||null,
    mode:a?.root?.dataset?.l2dMode||null};
   if(!source)return item;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,512);
   try{ctx.drawImage(source,0,0,512,512);item.png=canvas.toDataURL('image/png')}
   catch(e){item.error=String(e)}
   return item;
  });
 });
 for(const item of castCaptures){
  const {png,...meta}=item;console.log('CAST_SOURCE',JSON.stringify(meta));
  if(png)writeFileSync('artifacts/ring-arena/cast-source-'+item.actor+'.png',
   Buffer.from(png.split(',')[1],'base64'));
 }
 const outer=await inspect();
 assert.equal(outer.mode,'outer');assert.equal(outer.shotIndex,0);
 assert.equal(outer.shotName,'固定左机位');
 assert.equal(outer.camera.shot,'left');
 assert.equal(outer.cameraCount,1);
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
 await page.screenshot({path:'artifacts/ring-arena/final-left-3q-1280x720.png'});
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
 console.log('PASS: real WebGL 3/4 fixed-left heroine, four enemies, static GPU upload once, restored original L2D, desktop/mobile');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}

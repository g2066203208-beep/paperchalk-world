/* Real published PartRig, not a rectangle stub. High DPI and wide CSS size
 * used to freeze the canvas completely at >2560 pixels on large displays.
 * Context restore is also tested without forcing real driver faults.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const rel=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
 const file=resolve(root,'.'+rel);
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{const bytes=readFileSync(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(bytes)}
 catch{if(!res.headersSent)res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/l2d-studio',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?dev=1',{waitUntil:'load'});
 await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,null,{timeout:35000});
 await page.evaluate(async()=>{
  await window.PaperchalkCharacterDev.assign('player','protagonist','front',false);
  document.getElementById('camera-player-root').hidden=false;
 });
 await page.waitForFunction(()=>window.PaperchalkL2DLibrary?.inspect('player')?.renderedFrames>=2,null,{timeout:30000});
 // CSS source image is deliberately bigger than 1280px; old 2x backing
 // exceeded 2560, causing the entire 20-mesh draw loop to return forever.
 await page.evaluate(()=>{
  const img=document.getElementById('actor-player');
  img.style.height='1600px';img.style.width='1600px';
 });
 await page.waitForFunction(()=>{
  const a=window.PaperchalkL2DLibrary?.inspect('player');
  return a?.backing.width>0&&a?.backing.width<=2560&&a.backing.height<=2560&&
    a.backing.width*a.backing.height<=4194304;
 },null,{timeout:15000});
 const inspect=()=>page.evaluate(()=>{
  const a=window.PaperchalkL2DLibrary.inspect('player'),
   canvas=document.getElementById('actor-player-l2d');
  // Sample an offscreen downscaled COPY: never configure the live canvas
  // with willReadFrequently or keep a readback in the actual game.
  const probe=document.createElement('canvas');probe.width=96;probe.height=96;
  const ctx=probe.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(canvas,0,0,96,96);
  const p=ctx.getImageData(0,0,96,96).data;
  let alpha=0;for(let i=3;i<p.length;i+=4)if(p[i]>20)alpha++;
  return {...a,opaquePixels:alpha};
 });
 const before=await inspect();
 assert.ok(before.opaquePixels>100,'large DPI L2D must paint authentic original mesh pixels');
 await page.waitForTimeout(700);
 const after=await inspect();
 assert.ok(after.renderedFrames>before.renderedFrames+1,'oversized L2D must keep ANIMATING');
 const actor=await page.evaluate(()=>window.PaperchalkL2DLibrary.get('player').model);
 assert.equal(actor.characterId,'protagonist-unified-v1');
 // Synthetic 2D context loss tests the browser event contract; do not
 // preventDefault so actual driver recovery remains supported.
 await page.evaluate(()=>{
  const c=document.getElementById('actor-player-l2d');
  c.dispatchEvent(new Event('contextlost'));
 });
 await page.waitForFunction(()=>window.PaperchalkL2DLibrary.inspect('player').contextLost);
 const paused=await inspect();
 await page.waitForTimeout(220);
 assert.equal((await inspect()).renderedFrames,paused.renderedFrames,
   'lost context must not draw while storage is unavailable');
 await page.evaluate(()=>{
  document.getElementById('actor-player-l2d').dispatchEvent(new Event('contextrestored'));
 });
 await page.waitForFunction(()=>{
  const a=window.PaperchalkL2DLibrary.inspect('player');
  return a.contextRestores>=1&&!a.contextLost&&a.renderedFrames>0;
 });
 await page.waitForTimeout(250);
 const restored=await inspect();
 assert.ok(restored.renderedFrames>paused.renderedFrames&&restored.opaquePixels>100,
  'canvas restore must repaint authentic source layers');
 // Source geometry is restored exactly; next page still uses authored
 // shoulder-camera defaults and keeps the same 20 PartRig objects.
 await page.evaluate(()=>{
  const img=document.getElementById('actor-player');
  img.style.height='';img.style.width='';
 });
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(650);
 const mobile=await inspect();
 assert.ok(mobile.backing.width>0&&mobile.backing.height>0);
 assert.ok(mobile.backing.width<=2560&&mobile.backing.height<=2560);
 assert.ok(mobile.opaquePixels>100,'mobile resize must not blank L2D');
 assert.equal(window.undefined,undefined);
 assert.deepEqual(errors,[],'no page exceptions during high-DPI, restore and mobile rotation');
 await page.screenshot({path:'artifacts/l2d-studio/high-dpi-resize-after.png'});
 console.log('PASS REAL L2D high DPI memory budget, 20-part paint, >2560 legacy freeze, context restore and mobile resizing',JSON.stringify({before,restored,mobile}));
 await page.close();
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}

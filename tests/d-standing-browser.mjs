import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const root = resolve('site');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.npz':'application/octet-stream'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/'))throw Error('Unsafe path');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const base='http://127.0.0.1:'+server.address().port+'/pixel-lab/d-standing.html';
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base,{waitUntil:'load'});
 await page.waitForFunction(()=>window.D_STANDING_STUDIO?.ready,{timeout:30000});
 const report=await page.evaluate(()=>window.D_STANDING_STUDIO.report);
 assert.deepEqual(report.native_grid,[384,512]);
 assert.deepEqual(report.palette,['#393657','#F2A5C2','#A9BAE9','#FFF5E6']);
 assert.equal(report.distinct_rgb_colors,4);
 assert.equal(report.alpha_pixels,0);assert.equal(report.other_rgb_colors,0);
 assert.ok(report.training.training_steps>=300);
 const pixels=await page.evaluate(()=>{
  const img=document.querySelector('#dAvatar'), canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=512;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const raw=ctx.getImageData(0,0,384,512).data;
  let transparent=0;const colors=new Set();
  for(let i=0;i<raw.length;i+=4){if(raw[i+3]!==255)transparent++;
   colors.add('#'+[raw[i],raw[i+1],raw[i+2]].map(x=>x.toString(16).padStart(2,'0').toUpperCase()).join(''));
  }return {colors:[...colors].sort(),transparent};
 });
 assert.deepEqual(pixels.colors,report.palette.slice().sort());
 assert.equal(pixels.transparent,0);
 assert.equal(await page.locator('#oldD').getAttribute('width'),'384');

 // Grid must be an actual per-source-pixel microscope, default visible.
 const first=await page.evaluate(()=>({
  grid:window.D_STANDING_STUDIO.microscope.gridVisible,
  zoom:window.D_STANDING_STUDIO.microscope.zoom,
  dimensions:window.D_STANDING_STUDIO.microscope.sourceDimensions,
  color:window.D_STANDING_STUDIO.microscope.sample(172,110),
  render:document.querySelector('#nativeGrid').toDataURL('image/png'),
  source:document.querySelector('#dAvatar').src
 }));
 assert.equal(first.grid,true,'Per-pixel grid must start ON');
 assert.equal(first.zoom,12,'Native pixels enlarged by exact integer 12x');
 assert.deepEqual(first.dimensions,[384,512]);
 assert.ok(report.palette.includes(first.color));
 assert.equal(await page.locator('#nativeGrid').getAttribute('width'),'384');
 await page.locator('#gridZoom').selectOption('16');
 await page.locator('#gridFocus').selectOption('shoes');
 assert.equal((await page.evaluate(()=>window.D_STANDING_STUDIO.microscope.zoom)),16);
 const renderAfterZoom=await page.locator('#nativeGrid').evaluate(c=>c.toDataURL('image/png'));
 assert.notEqual(first.render,renderAfterZoom,'Zoom/focus must redraw a genuinely different source-pixel region');
 await page.locator('#gridVisible').uncheck();
 assert.equal(await page.evaluate(()=>window.D_STANDING_STUDIO.microscope.gridVisible),false);
 await page.locator('#gridVisible').check();
 assert.equal(await page.evaluate(()=>window.D_STANDING_STUDIO.microscope.gridVisible),true);
 assert.equal(await page.locator('#dAvatar').getAttribute('src'),'./d-standing-v1-384x512.png','Grid never modifies exported PNG');
 const pending=page.waitForEvent('download');
 await page.locator('a.action:not(.secondary)').click();
 const dl=await pending;assert.match(dl.suggestedFilename(),/D-standing-v1-384x512\.png/);
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/D-standing-desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto(base,{waitUntil:'load'});
 await mobile.waitForFunction(()=>window.D_STANDING_STUDIO?.ready,{timeout:30000});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),true,'No mobile horizontal overflow');
 assert.equal(await mobile.locator('#gridVisible').isChecked(),true);
 assert.equal(await mobile.locator('#nativeGrid').isVisible(),true);
 await mobile.screenshot({path:'repixel-browser-artifacts/D-standing-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(mobileErrors,[]);
 console.log('PASS hosted D standing 384x512 image, exact RGB, ML evidence, download, old/new comparison and mobile');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}

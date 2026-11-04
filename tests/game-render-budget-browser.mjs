/* Real Chromium regression: fluid stays at full rAF; pixel-expensive
 * dialogue/side fog composites run on a separate <=30 fps cadence.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  let p=new URL(req.url,'http://127.0.0.1').pathname;
  if(p.endsWith('/'))p+='index.html';
  const file=resolve(root,'.'+p);
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{const data=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(data)}
  catch{if(!res.headersSent)res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?scene=classroom',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.PaperWorldRenderMetrics?.().overlay.frames>=4,{timeout:18000});
  const before=await page.evaluate(()=>window.PaperWorldRenderMetrics());
  await page.waitForTimeout(1400);
  const after=await page.evaluate(()=>window.PaperWorldRenderMetrics());
  const world=after.worldFrames-before.worldFrames;
  const overlay=after.overlay.frames-before.overlay.frames;
  assert.ok(world>=15,'the real fog simulation should still advance');
  assert.ok(overlay>=4,'the bottom subtitle fog should still be live');
  assert.ok(overlay<world*.8,'canvas resampling should run noticeably less often than the world');
  const layout=await page.evaluate(()=>{
    const dialogue=document.getElementById('dialogue').getBoundingClientRect();
    const view=document.getElementById('view').getBoundingClientRect();
    return {left:(dialogue.left-view.left)/view.width,width:dialogue.width};
  });
  assert.ok(layout.left>=.36,'subtitles must be moved out of the foreground actor zone');
  assert.ok(layout.width>200,'subtitles still have useful width');
  assert.deepEqual(errors,[],'the deployed page should have no uncaught errors');
  console.log({worldFrames:world,overlayFrames:overlay,dialogueStart:layout.left});
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

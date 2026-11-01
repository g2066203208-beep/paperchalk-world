import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=createServer((req,res)=>{
 let p=new URL(req.url,'http://localhost').pathname;
 if(p.endsWith('/'))p+='index.html';
 const full=resolve(root,'.'+p);
 if(!full.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{const bytes=readFileSync(full);res.writeHead(200,{'content-type':types[extname(full)]||'text/plain','cache-control':'no-store'});res.end(bytes)}
 catch{if(!res.headersSent)res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/card-game/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];mkdirSync('artifacts/point-story',{recursive:true});
try{
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile',deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(label+': '+e.message));
  await page.goto(base,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__POINT_STORY__);
  const initial=await page.evaluate(()=>window.__POINT_STORY__.snapshot());
  assert.equal(initial.scene,'foyer');assert.equal(initial.clock,'18:47');
  assert.equal(await page.locator('#scene-hotspots button').count(),5);
  await page.screenshot({path:'artifacts/point-story/'+label+'-foyer.png',fullPage:true,animations:'disabled'});
  await page.locator('#classroom-toggle').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).scene,'classroom');
  assert.equal(await page.locator('#scene-hotspots button').count(),5);
  assert.equal(await page.locator('#scene-image').getAttribute('src'),'./scenes/classroom.svg');
  await page.locator('[data-spot="girl"]').click();
  await page.screenshot({path:'artifacts/point-story/'+label+'-classroom.png',fullPage:true,animations:'disabled'});
  await page.locator('#classroom-toggle').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).scene,'foyer');
  await page.locator('[data-spot="notice"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).rules.includes('notice'),true);
  await page.locator('[data-spot="living"]').click();
  await page.locator('[data-spot="radio"]').click();
  await page.locator('[data-spot="phone"]').click();
  await page.screenshot({path:'artifacts/point-story/'+label+'-living.png',fullPage:true,animations:'disabled'});
  await page.locator('[data-spot="foyer"]').click();
  await page.locator('[data-spot="door"]').click();
  await page.locator('[data-choice="listen"]').click();
  await page.locator('[data-spot="door"]').click();
  await page.locator('[data-choice="wait"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).ready,true);
  await page.locator('[data-spot="door"]').click();
  await page.locator('[data-choice="unlock"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).scene,'hallway');
  await page.locator('[data-spot="stairs"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).scene,'stairs');
  await page.locator('[data-spot="exit"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).ending,'survived');
  await page.screenshot({path:'artifacts/point-story/'+label+'-ending.png',fullPage:true,animations:'disabled'});
  await page.reload({waitUntil:'load'});
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).ending,'survived','persisted ending');
  await page.locator('#ending-restart').click();
  await page.locator('[data-spot="door"]').click();
  await page.locator('[data-choice="unlock"]').click();
  assert.equal((await page.evaluate(()=>window.__POINT_STORY__.snapshot())).ending,'lost','consequence of blind opening');
  if(label==='mobile'){
   const dims=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(dims.width<=dims.viewport+2,'horizontal overflow '+JSON.stringify(dims));
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: original interactive 2D narrative on desktop/mobile, rule evidence, safe/bad endings, autosave');
}finally{await browser.close();await new Promise(r=>server.close(r))}

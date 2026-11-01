import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'};
const server=createServer((req,res)=>{
 let pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.endsWith('/'))pathname+='index.html';
 const abs=resolve(root,'.'+pathname);
 if(!abs.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{'content-type':types[extname(abs)]||'text/plain','cache-control':'no-store'});res.end(readFileSync(abs))}
 catch{res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/scene-studio/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=swiftshader','--enable-webgl','--disable-web-security=false']});
let errors=[];
try{
 for(const [name,w,h] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,hasTouch:name==='mobile',isMobile:name==='mobile'});
  page.on('pageerror',e=>errors.push(name+' '+e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(name+' console '+m.text())});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__SCENE_STUDIO__?.ready,{timeout:35000});
  const before=await page.evaluate(()=>window.__SCENE_STUDIO__.getState());
  assert.equal(before.levels,5);assert.equal(before.rooms,6);
  assert.equal(before.hasDoor,true);assert.equal(before.mode,'building');
  assert.equal(await page.locator('#viewport canvas').count(),1);
  await page.locator('[data-floor="3"]').click();
  const level=await page.evaluate(()=>window.__SCENE_STUDIO__.getState());
  assert.equal(level.floor,3);assert.equal(level.mode,'floor');
  await page.locator('[data-mode="apartment"]').click();
  const flat=await page.evaluate(()=>window.__SCENE_STUDIO__.getState());
  assert.equal(flat.mode,'apartment');assert.equal(flat.roomWallsVisible,true);
  await page.locator('[data-room="bedroom"]').first().click();
  assert.match(await page.locator('#selectedName').innerText(),/卧室/);
  await page.locator('[data-mode="foyer"]').click();
  assert.equal((await page.evaluate(()=>window.__SCENE_STUDIO__.getState())).mode,'foyer');
  await page.locator('[data-mode="peephole"]').click();
  const hole=await page.evaluate(()=>window.__SCENE_STUDIO__.getState());
  assert.equal(hole.mode,'peephole');assert.equal(hole.peephole,true);
  await page.locator('[data-mode="hallway"]').click();
  assert.equal((await page.evaluate(()=>window.__SCENE_STUDIO__.getState())).peephole,false);
  await page.locator('#toggleWalls').uncheck();
  assert.equal((await page.evaluate(()=>window.__SCENE_STUDIO__.getState())).roomWallsVisible,false);
  await page.locator('#toggleWalls').check();
  await page.locator('#nightButton').click();
  assert.equal((await page.evaluate(()=>window.__SCENE_STUDIO__.getState())).night,true);
  await page.locator('#dayButton').click();
  assert.equal((await page.evaluate(()=>window.__SCENE_STUDIO__.getState())).night,false);
  await page.locator('[data-mode="apartment"]').click();
  await page.waitForTimeout(900);
  mkdirSync('artifacts/scene-studio',{recursive:true});
  await page.screenshot({path:'artifacts/scene-studio/'+name+'-302-blockout.png',fullPage:true});
  await page.locator('[data-mode="building"]').click();
  await page.waitForTimeout(950);
  await page.screenshot({path:'artifacts/scene-studio/'+name+'-building.png',fullPage:true});
  if(name==='mobile'){
   const over=await page.evaluate(()=>({w:document.documentElement.scrollWidth,screen:innerWidth}));
   assert.ok(over.w<=over.screen+2,'mobile horizontal overflow: '+JSON.stringify(over));
  }
  await page.close();
  console.log('PASS '+name+': five floors, real 302 room geometry, hall/foyer/peephole cameras, switches and screenshots');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r))}

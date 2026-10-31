import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const p=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!p.startsWith(root+'/'))throw Error('unsafe pathname');
  res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});
  res.end(readFileSync(p));
 }catch(e){res.writeHead(404);res.end('missing')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
mkdirSync('artifacts/horror-room',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
try{
 for(const [name,width,height] of [['desktop',1280,720],['portrait',390,844],['landscape',844,390]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/horror-room/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__HORROR_ROOM__?.triangleCount>=1000,{timeout:16000});
  await page.waitForTimeout(600);
  const first=await page.evaluate(()=>({objects:__HORROR_ROOM__.meshObjects,faces:__HORROR_ROOM__.triangleCount,unlit:__HORROR_ROOM__.roomUnlit,renderer:__HORROR_ROOM__.renderBackend}));
  assert.ok(first.objects>=90&&first.faces>=1100,name+' true modeled scene');
  assert.equal(first.unlit,true);
  await page.screenshot({path:'artifacts/horror-room/'+name+'-dark-room.png'});
  await page.getByRole('button',{name:'模拟敲门'}).click();
  await page.waitForTimeout(240);
  assert.match(await page.locator('#status').innerText(),/咚|门板|第三/);
  await page.screenshot({path:'artifacts/horror-room/'+name+'-knocking.png'});
  await page.getByRole('button',{name:'查看门锁'}).click();
  await page.waitForTimeout(300);
  assert.match(await page.locator('#status').innerText(),/门锁|锁舌/);
  assert.deepEqual(errors,[],name+' browser errors');
  console.log('PASS',name,JSON.stringify(first));
  await page.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done))}
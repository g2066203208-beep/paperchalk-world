import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';

const base=resolve('site');
const mime={'.html':'text/html','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!path.startsWith(base+'/'))throw Error('path');
  const bytes=readFileSync(path);
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  res.end(bytes);
 }catch(e){
  if(!res.headersSent){res.writeHead(404);res.end('not found');}
  else res.destroy(e);
 }
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const url='http://127.0.0.1:'+server.address().port+'/pixel-lab/style2/geometry-v5.html';
 const page=await browser.newPage({viewport:{width:1260,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('训练 '),{timeout:20000});
 assert.match(await page.locator('#report').textContent(),/IoU/);
 for(const name of ['source','target','parts','depth']){
  const loaded=await page.locator('#'+name).evaluate(img=>img.complete && img.naturalWidth===96 && img.naturalHeight===128);
  assert.equal(loaded,true,name);
 }
 await page.locator('#angle').selectOption('2');
 await page.waitForFunction(()=>document.querySelector('#source').naturalWidth===96 && document.querySelector('#source').src.endsWith('view2_input.png'));
 assert.equal(await page.locator('details img').count(),4);
 await page.locator('details').first().evaluate(el=>el.open=true);
 for(const img of await page.locator('details img').all()){
  assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth===96),true);
 }
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/geometry-v5-desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 await mobile.goto(url);
 await mobile.waitForFunction(()=>document.querySelector('#report').textContent.includes('训练 '));
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),true);
 await mobile.screenshot({path:'repixel-browser-artifacts/geometry-v5-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS V5 real training report, 3 views, 12 body parts, depth images, D poses and mobile browser');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

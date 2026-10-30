import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname,resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try {
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/')) throw Error('invalid path');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:'+server.address().port+'/pixel-lab/learn.html';
try {
 const page=await browser.newPage({viewport:{width:1366,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#pixel-v2').dataset.ready==='true',{timeout:30000});
 assert.equal(await page.locator('#pixel-v2-family option').count(),7);
 assert.equal(await page.locator('#pixel-v2-grid').isChecked(),true);
 let before=await page.locator('[data-v2-canvas="generated"]').evaluate(el=>el.toDataURL());
 let reference=await page.locator('[data-v2-canvas="reference"]').evaluate(el=>el.toDataURL());
 assert.notEqual(before,reference,'Model sample must not silently copy the target');
 await page.locator('#pixel-v2-family').selectOption('lantern');
 await page.waitForFunction(()=>document.querySelector('#pixel-v2-status').textContent.includes('灯笼'),{timeout:20000});
 const after=await page.locator('[data-v2-canvas="generated"]').evaluate(el=>el.toDataURL());
 assert.notEqual(after,before,'Changing categories must change the drawn model output');
 assert.match(await page.locator('#pixel-v2-metrics').textContent(),/基线/);
 await page.locator('#pixel-v2-grid').uncheck();
 assert.equal(await page.locator('#pixel-v2-grid').isChecked(),false);
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/diffusion-v2-desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:800}});
 await mobile.goto(base,{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>document.querySelector('#pixel-v2').dataset.ready==='true',{timeout:30000});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),true);
 await mobile.screenshot({path:'repixel-browser-artifacts/diffusion-v2-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS System 02 V2 real outputs, native grid, 7 categories and mobile UI');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

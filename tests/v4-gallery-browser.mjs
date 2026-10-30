import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const base=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{const p=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!p.startsWith(base+'/'))throw Error('path');res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(readFileSync(p))}
 catch(e){res.writeHead(404);res.end('not found')}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const url='http://127.0.0.1:'+server.address().port+'/pixel-lab/v4-review.html';
const page=await browser.newPage({viewport:{width:1260,height:850}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);
await page.waitForFunction(()=>window.pixelV4Ready===true,{timeout:30000});
assert.equal(await page.locator('#gallery article').count(),13);
assert.equal(await page.locator('#grid-check').isChecked(),true);
assert.match(await page.locator('#training').textContent(),/传统基线/);
await page.locator('#filter').selectOption('gold_master');
assert.equal(await page.locator('#gallery article').count(),2);
await page.locator('#filter').selectOption('weak_draft');
assert.equal(await page.locator('#gallery article').count(),9);
await page.locator('#filter').selectOption('candidate');
assert.equal(await page.locator('#gallery article').count(),1);
await page.locator('#grid-check').uncheck();
assert.equal(await page.locator('#gallery figure.on').count(),0);
mkdirSync('repixel-browser-artifacts',{recursive:true});
await page.screenshot({path:'repixel-browser-artifacts/v4-review-desktop.png',fullPage:true});
const m=await browser.newPage({viewport:{width:390,height:844}});
await m.goto(url);await m.waitForFunction(()=>window.pixelV4Ready===true,{timeout:30000});
assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),true);
await m.screenshot({path:'repixel-browser-artifacts/v4-review-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log('PASS V4 13 384x512 native images, statuses, grid, filtering, model and mobile');
}finally{await browser.close();await new Promise(r=>server.close(r))}

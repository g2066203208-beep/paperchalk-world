import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{const urlPath=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const p=resolve(root,'.'+(urlPath.endsWith('/')?urlPath+'index.html':urlPath));
 if(!p.startsWith(root+'/'))throw Error('Traversal');
 const body=readFileSync(p);
 res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(body);
 }catch(e){if(!res.headersSent){res.writeHead(404);res.end('missing')}else res.destroy(e)}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,w,h] of [['desktop',1200,950],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/face.html');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('真实训练'),{timeout:20000});
  assert.equal(await page.locator('#candidates figure').count(),16);
  for(const img of await page.locator('#candidates img').all()){
    assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth===96),true);
  }
  await page.locator('#candidates img').nth(5).click();
  assert.match(await page.locator('#selected').textContent(),/06/);
  assert.equal(await page.locator('#big').evaluate(el=>el.complete&&el.naturalWidth===96),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true);
  assert.deepEqual(errors,[]);
  mkdirSync('repixel-browser-artifacts',{recursive:true});
  await page.screenshot({path:'repixel-browser-artifacts/face-'+name+'.png',fullPage:true});
  await page.close();
 }
 console.log('PASS actual 16 generated face images, model report, zoom and responsive desktop/mobile');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

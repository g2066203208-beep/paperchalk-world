import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const base=resolve('site'),types={'.html':'text/html;charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const path=resolve(base,'.'+name);
 if(!path.startsWith(base+'/'))throw Error('path traversal');
 const buf=readFileSync(path);
 res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(buf);
 }catch(e){if(!res.headersSent){res.writeHead(404);res.end('not found')}else res.destroy(e)}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,width,height] of [['desktop',1360,980],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/fullbody-16.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('GitHub 已训练'),{timeout:20000});
  assert.equal(await page.locator('#gallery figure').count(),16,'not 16 full-body characters');
  for(const img of await page.locator('#gallery figure img').all()){
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(async el=>{await el.decode()});
    const result=await img.evaluate(el=>[el.complete,el.naturalWidth,el.naturalHeight]);
    assert.deepEqual(result,[true,384,512]);
  }
  await page.locator('#gallery figure button').nth(15).click();
  assert.equal(await page.locator('#zoom').evaluate(el=>el.complete&&el.naturalWidth===384&&el.naturalHeight===512),true);
  assert.equal(await page.locator('#face').evaluate(el=>el.complete&&el.naturalWidth===96&&el.naturalHeight===96),true);
  assert.match(await page.locator('#selected').textContent(),/第 16 张/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),true);
  assert.deepEqual(errors,[]);
  mkdirSync('artifacts/pixel-fullbody',{recursive:true});
  await page.screenshot({path:'artifacts/pixel-fullbody/fullbody-'+name+'.png',fullPage:true});
  await page.close();
 }
 console.log('PASS 16 loaded fullbody 384x512 PNGs, paired 96x96 face, desktop/mobile interaction and no overflow');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

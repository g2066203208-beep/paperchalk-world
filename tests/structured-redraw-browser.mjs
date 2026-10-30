import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),types={'.html':'text/html;charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  let uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(uri.endsWith('/'))uri+='index.html';
  const file=resolve(root,'.'+uri);
  if(!file.startsWith(root+'/'))throw Error('bad path');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  res.end(readFileSync(file));
 }catch(e){res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/structured-redraw',{recursive:true});
try{
 for(const [device,width,height] of [['desktop',1360,940],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/structured-redraw.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('训练已就绪'),{timeout:15000});
  assert.equal(await page.locator('#after').evaluate(img=>img.naturalWidth),192);
  assert.equal(await page.locator('#old-speck').textContent(),'1461');
  assert.equal(await page.locator('#new-speck').textContent(),'100');
  assert.equal(await page.locator('#strokes').textContent(),'77');
  await page.locator('#parts').click();
  assert.equal(await page.locator('#parts').getAttribute('aria-pressed'),'true');
  await page.locator('#ml').click();
  assert.equal(await page.locator('#ml').getAttribute('aria-pressed'),'true');
  await page.locator('#after').click({position:{x:80,y:110}});
  assert.match(await page.locator('#facts').textContent(),/手工绘制部位/);
  await page.locator('#bg').click();
  assert.equal(await page.locator('.figure').first().evaluate(el=>el.classList.contains('light')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.screenshot({path:'artifacts/structured-redraw/'+device+'-body-part-pixel-art.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS structured pixel candidate, exact authored label per cell and network predictions desktop/phone');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html;charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url.endsWith('/'))url+='index.html';
  const path=resolve(root,'.'+url);
  if(!path.startsWith(root+'/'))throw Error('traversal');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  res.end(readFileSync(path));
 }catch{res.writeHead(404);res.end('missing')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/pixel-audit',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1340,920],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/pixel-audit.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('真实强化学习已完成'),{timeout:15000});
  const r=JSON.parse(readFileSync(resolve(root,'pixel-lab/semantic-output/report.json'),'utf8'));
  assert.equal(await page.locator('#edits').textContent(),String(r.native_changed_pixels));
  assert.equal(await page.locator('#output').evaluate(e=>e.naturalWidth),192);
  assert.equal(await page.locator('#audit').evaluate(e=>e.naturalHeight),256);
  assert.equal(await page.locator('#detail').evaluate(e=>e.width),320);
  await page.locator('#source').click({position:{x:80,y:110}});
  assert.match(await page.locator('#reason').textContent(),/原生坐标/);
  await page.locator('#map-toggle').click();
  assert.equal(await page.locator('#map-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('#grid-toggle').click();
  assert.equal(await page.locator('#grid-toggle').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.screenshot({path:'artifacts/pixel-audit/'+name+'-every-pixel-review.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS pixel-audit real screenshots, true images, per-pixel rationale, phone and desktop');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}

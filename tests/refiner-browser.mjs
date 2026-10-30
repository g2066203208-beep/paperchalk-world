import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html;charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((request,response)=>{
 try{
  const url=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));
  if(!path.startsWith(root+'/'))throw Error('not found');
  response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  response.end(readFileSync(path));
 }catch(e){response.writeHead(404);response.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/refine-review',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1360,900],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const url='http://127.0.0.1:'+server.address().port+'/pixel-lab/fullbody-refine.html';
  await page.goto(url);
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('模型输出及结构检查通过'),{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#refined')?.naturalWidth===192,{timeout:10000});
  assert.equal(await page.locator('#refined').getAttribute('src'),'./refine-output/refined_native.png');
  assert.equal(await page.locator('#diff').evaluate(x=>x.naturalWidth),192);
  assert.equal(await page.locator('#original').evaluate(x=>x.naturalHeight),256);
  assert.equal(await page.locator('#zoom').evaluate(x=>x.width===320&&x.height===320),true);
  assert.match(await page.locator('#edited').textContent(),/2 格/);
  assert.match(await page.locator('#summary').textContent(),/美术|审批/);
  await page.locator('#switch').click();
  assert.equal(await page.locator('#switch').getAttribute('aria-pressed'),'true');
  await page.locator('#original').click({position:{x:48,y:56}});
  await page.locator('#grid').click();
  assert.equal(await page.locator('#grid').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.screenshot({path:'artifacts/refine-review/'+name+'-ml-fullbody.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: true-native ML refinement + zoom and diff on mobile and desktop');
}finally{await browser.close();await new Promise(done=>server.close(done))}

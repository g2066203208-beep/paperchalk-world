import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));
  if(!file.startsWith(root+'/'))throw Error('path traversal');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(file));
 }catch(e){res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/pixel-art',{recursive:true});
try{
 for(const [screen,width,height] of [['desktop',1360,940],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/hostess-redraw.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('通过 ·'),{timeout:10000});
  assert.equal(await page.locator('#full').evaluate(c=>c.width===384&&c.height===512),true);
  assert.equal(await page.locator('#detail').evaluate(c=>c.width===320&&c.height===320),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.locator('#grid').click();
  assert.equal(await page.locator('#grid').getAttribute('aria-pressed'),'true');
  await page.locator('#paper').click();
  assert.equal(await page.locator('#full-wrap').evaluate(e=>e.classList.contains('blue')),true);
  assert.equal(await page.locator('a[download]').getAttribute('href'),'./assets/hostess-redraw-v1-192x256.png');
  await page.screenshot({path:'artifacts/pixel-art/fullbody-hostess-'+screen+'.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: new full-body true pixel image decoded with exactly four inks + transparency; responsive gallery, grid, background switch, original PNG link');
}finally{await browser.close();await new Promise(done=>server.close(done))}

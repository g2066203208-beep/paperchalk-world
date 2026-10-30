import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/'))throw Error('path traversal');
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end('missing')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/fullbody-learning',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1340,940],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:name==='phone'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/fullbody-learning.html');
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('真实训练'),{timeout:15000});
  assert.equal(await page.locator('#original').evaluate(c=>c.width===384&&c.height===512),true);
  assert.equal(await page.locator('#model').evaluate(c=>c.width===384&&c.height===512),true);
  assert.equal(await page.locator('#pixelDetail').evaluate(c=>c.width===320&&c.height===320),true);
  assert.equal(await page.locator('#identities').textContent(),'1 / 32');
  await page.waitForFunction(()=>document.querySelector('#original').getContext('2d').getImageData(175,95,1,1).data[3]!==0,{timeout:5000});
  await page.locator('[data-sample="1"]').click();
  await page.waitForFunction(()=>document.querySelector('#item')?.textContent.includes('站姿'),{timeout:6000});
  await page.locator('[data-sample="2"]').click();
  await page.waitForFunction(()=>document.querySelector('#item')?.textContent.includes('独立测试'),{timeout:6000});
  await page.locator('#gridToggle').click();
  assert.equal(await page.locator('#gridToggle').getAttribute('aria-pressed'),'false');
  await page.locator('#background').click();
  assert.equal(await page.locator('#wrap-original').evaluate(e=>e.classList.contains('light')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await page.screenshot({path:'artifacts/fullbody-learning/'+name+'-whole-figure.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS 384x512 full-figure model screenshots on desktop/mobile, 3 sources and real holdout checks');
}finally{await browser.close();await new Promise(done=>server.close(done))}

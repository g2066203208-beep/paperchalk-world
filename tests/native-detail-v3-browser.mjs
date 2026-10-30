import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/'))throw Error('unsafe path');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/learn.html');
 await page.waitForFunction(()=>document.querySelector('#v3-native')?.dataset.ready==='true',{timeout:20000});
 assert.equal(await page.locator('#v3-pose').inputValue(),'B_standing');
 assert.equal(await page.locator('#v3-grid').isChecked(),true);
 const dims=await page.locator('[data-v3-image="generated384"]').evaluate(e=>[e.naturalWidth,e.naturalHeight]);
 assert.deepEqual(dims,[384,512],'Not a fake 48x64 enlargement');
 const src=await page.locator('[data-v3-image="generated384"]').getAttribute('src');
 assert.match(src,/B_standing_generated384\.png$/);
 assert.match(await page.locator('#v3-metrics').innerText(),/前景/);
 const canvas=page.locator('[data-v3-zoom="generated384"]');
 const before=await canvas.evaluate(c=>c.toDataURL());
 await page.locator('#v3-area').selectOption('hair');
 const after=await canvas.evaluate(c=>c.toDataURL());
 assert.notEqual(before,after,'Zoom must display actual different native pixels');
 await page.locator('#v3-grid').uncheck();
 assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),after,'Grid must be toggleable');
 await page.locator('#v3-pose').selectOption('A_dynamic');
 await page.waitForFunction(()=>document.querySelector('#v3-native').dataset.ready==='true' &&
  document.querySelector('[data-v3-image="generated384"]').src.includes('A_dynamic_generated384.png'),{timeout:20000});
 assert.equal((await page.locator('#v3-save').getAttribute('download')),'D-A_dynamic-learned-detail-384x512.png');
 assert.deepEqual(errors,[]);
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/v3-native-detail-desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 await mobile.goto(page.url());
 await mobile.waitForFunction(()=>document.querySelector('#v3-native')?.dataset.ready==='true',{timeout:20000});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+3),true);
 await mobile.screenshot({path:'repixel-browser-artifacts/v3-native-detail-mobile.png',fullPage:true});
 console.log('PASS V3: real 384x512 model and original images, zoom microscope, grid, model report and mobile');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}

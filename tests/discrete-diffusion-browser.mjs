import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!path.startsWith(root+'/'))throw Error('invalid path');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});
  res.end(readFileSync(path));
 }catch(e){res.writeHead(404);res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1400,height:980},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/discrete-diffusion.html');
 await page.waitForFunction(()=>!document.querySelector('#save').disabled,{timeout:20000});
 assert.equal(await page.locator('#grid').isChecked(),true);
 const snapshots=await page.evaluate(()=>{
  const names=['original','coarse','generated','repair'];
  return Object.fromEntries(names.map(name=>{
   const c=document.getElementById(name);
   return [name,{w:c.width,h:c.height,snapshot:c.toDataURL()}]
  }));
 });
 assert.equal(snapshots.original.w,384);assert.equal(snapshots.original.h,512);
 assert.notEqual(snapshots.original.snapshot,snapshots.generated.snapshot);
 assert.notEqual(snapshots.coarse.snapshot,snapshots.generated.snapshot);
 await page.locator('#pose').selectOption('A');
 await page.waitForFunction(()=>document.querySelector('#original').toDataURL()!==window.beforeOriginal,{timeout:10000}).catch(()=>{});
 const afterPose=await page.locator('#original').evaluate(c=>c.toDataURL());
 assert.notEqual(snapshots.original.snapshot,afterPose);
 await page.locator('#grid').uncheck();
 assert.equal(await page.locator('#grid').isChecked(),false);
 const dlPromise=page.waitForEvent('download');
 await page.locator('#save').click();
 const dl=await dlPromise;
 assert.match(dl.suggestedFilename(),/D-A-masked-diffusion-48x64.png/);
 mkdirSync('repixel-browser-artifacts',{recursive:true});
 await page.screenshot({path:'repixel-browser-artifacts/diffusion-system02-desktop.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 await mobile.goto(page.url());
 await mobile.waitForFunction(()=>!document.querySelector('#save').disabled,{timeout:15000});
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
 await mobile.screenshot({path:'repixel-browser-artifacts/diffusion-system02-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS native 4-token diffusion site, data decode, grid, switching and PNG export');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}

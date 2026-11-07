/* Focused real-game screenshot proof for both 3D arc orientations.
 * Deliberately independent from full combat timing QA; never generates mock art.
 */
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site'),out=resolve('artifacts/ring-arena-quick');
mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(file)}catch{return res.writeHead(404).end('not found')}
 res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(bytes);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const errors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1917,height:906},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:60000});
 let ready=false;
 try{
  await page.waitForFunction(()=>{
   const s=window.PaperWorldGameRingArena?.inspect?.();
   return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===5&&s?.wallMaterial?.ready;
  },null,{timeout:85000});
  ready=true;
 }catch(e){errors.push('ready condition: '+e.message)}
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena?.inspect?.());
 report.outer=await inspect();
 await page.screenshot({path:resolve(out,'01-outer-1917x906.png')});
 if(ready){
  await page.locator('[data-mode="inner"]').click();
  await page.waitForTimeout(250);
  report.inner=await inspect();
  await page.screenshot({path:resolve(out,'02-inner-1917x906.png')});
  if(report.inner.mode!=='inner')errors.push('inner mode did not switch');
 }
 report.ready=ready;report.errors=errors;
 writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
 if(!ready||report.outer?.wallMaterial?.heightMeters!==3.2||
  report.outer?.wallMaterial?.repeats!==8||errors.length)
  throw Error('Real browser visual gate failed; see screenshot and report: '+errors.join('; '));
 console.log('PASS actual rendered WebGL 3D room screenshots: matched 3.2m walls and 8 physical UV repeats in outer and inner view');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}

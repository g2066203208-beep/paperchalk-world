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
const errors=[],pageErrors=[],report={};
try{
 const page=await browser.newPage({viewport:{width:1917,height:906},deviceScaleFactor:1});
 page.on('pageerror',e=>{pageErrors.push(e.message);errors.push('pageerror: '+e.message)});
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/index.html?scene=ring-arena',{waitUntil:'domcontentloaded',timeout:60000});
 let ready=false;
 try{
  await page.waitForFunction(()=>{
   const s=window.PaperWorldGameRingArena?.inspect?.();
   return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===5&&s?.wallMaterial?.ready&&
    s?.roomSurfaces?.floor?.ready&&s?.roomSurfaces?.ceiling?.ready;
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
 report.geometry={
  floorPanelMeters:report.outer?.ring?.floorTileMeters/2,
  ceilingPanelMeters:report.outer?.ring?.ceilingTileMeters/2,
  ceilingHeightMeters:report.outer?.ring?.ceilingHeight,
  floorRoofDepthMeters:report.outer?.ring?.surfaceDepth,
  outerEnemyDepth:report.outer?.actors?.enemies?.[0]?.z,
  innerEnemyDepth:report.inner?.actors?.enemies?.[0]?.z
 };
 report.ready=ready;report.errors=errors;report.pageErrors=pageErrors;
 writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
 if(!ready||report.outer?.wallMaterial?.heightMeters!==3.2||
  report.outer?.wallMaterial?.repeats!==8||
  !report.outer?.roomSurfaces?.floor?.ready||!report.outer?.roomSurfaces?.ceiling?.ready||
  !report.inner?.roomSurfaces?.floor?.ready||!report.inner?.roomSurfaces?.ceiling?.ready||
  report.outer?.roomSurfaces?.floor?.vertices<15000||
  report.inner?.roomSurfaces?.ceiling?.vertices<15000||
  report.outer?.safety?.clear!==true||report.inner?.safety?.clear!==true||
  report.outer?.l2dReady!==5||report.inner?.l2dReady!==5||
  Math.abs(report.geometry.floorPanelMeters-.6)>.001||
  Math.abs(report.geometry.ceilingPanelMeters-.95)>.001||
  report.geometry.floorRoofDepthMeters!==18||
  report.outer?.lighting?.count!==6||report.inner?.lighting?.count!==6||
  report.outer?.lighting?.positions?.length!==18||
  report.inner?.lighting?.positions?.length!==18||
  report.outer?.safety?.gap<.07||report.inner?.safety?.gap<.07||
  report.outer?.safety?.foes?.[0]?.heightFraction<.40||
  report.inner?.safety?.foes?.[0]?.heightFraction<.43||
  pageErrors.length)
  throw Error('Real browser visual gate failed; see screenshot and report: '+errors.join('; '));
 console.log('PASS: six position-matched 3D lights illuminate L2D and real surfaces; all five characters 25% larger with safe 1917x906 framing');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}

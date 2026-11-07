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
 await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect?.()?.active,
  null,{timeout:35000});
 const initialization=await page.evaluate(()=>{
  const snapshot=window.PaperWorldGameRingArena?.inspect?.();
  return {renderer:snapshot?.renderer,error:snapshot?.initError||null};
 });
 if(initialization.error||initialization.renderer!=='webgl-l2d')
  throw Error('WebGL initialization: '+JSON.stringify(initialization));
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
 // Require actual ORIGINAL L2D updates for all four independent actors,
 // not a single almost-transparent first-frame texture that happens to count
 // as 'ready'. A stable 4+ GPU frame handshake avoids the ghost-on-load shot.
 if(ready){
  await page.waitForFunction(()=>{
   const a=window.PaperWorldGameRingArena?.inspect?.();
   return a?.l2dReady===5&&['enemy-1','enemy-2','enemy-3','enemy-4']
    .every(id=>(a.l2dFrames?.[id]||0)>=4);
  },null,{timeout:60000});
  await page.waitForTimeout(220);
 }

 const setLighting=state=>page.evaluate(s=>window.PaperWorldGameRingArena.setLighting(s),state);
 report.outer=await inspect();
 await page.screenshot({path:resolve(out,'01-outer-full-lights-1917x906.png')});
 if(ready){
  await setLighting('partial');
  await page.waitForTimeout(150);
  report.partial=await inspect();
  await page.screenshot({path:resolve(out,'02-outer-partial-blackout-1917x906.png')});
  await setLighting('flicker');
  await page.waitForFunction(()=>{
   const l=window.PaperWorldGameRingArena?.inspect()?.lighting;
   return l?.state==='flicker'&&l.levels[1]<.1;
  },null,{timeout:9000});
  report.flicker=await inspect();
  await page.screenshot({path:resolve(out,'03-outer-flicker-moment-1917x906.png')});
  await setLighting('outage');
  await page.waitForTimeout(160);
  report.outage=await inspect();
  await page.screenshot({path:resolve(out,'04-outer-all-lights-off-1917x906.png')});
  await page.locator('[data-mode="inner"]').click();
  await page.waitForFunction(()=>{
   const a=window.PaperWorldGameRingArena?.inspect?.();
   return a?.mode==='inner'&&a?.l2dReady===5;
  },null,{timeout:20000});
  report.innerOutage=await inspect();
  await page.screenshot({path:resolve(out,'05-inner-lights-off-1917x906.png')});
  await setLighting('on');
  await page.waitForTimeout(150);
  report.inner=await inspect();
  await page.screenshot({path:resolve(out,'06-inner-full-lights-1917x906.png')});
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
 if(!ready||report.outer?.wallMaterial?.heightMeters!==2.85||
  report.outer?.wallMaterial?.repeats!==9||
  !report.outer?.roomSurfaces?.floor?.ready||!report.outer?.roomSurfaces?.ceiling?.ready||
  !report.inner?.roomSurfaces?.floor?.ready||!report.inner?.roomSurfaces?.ceiling?.ready||
  report.outer?.roomSurfaces?.floor?.vertices<15000||
  report.inner?.roomSurfaces?.ceiling?.vertices<15000||
  report.outer?.safety?.clear!==true||report.inner?.safety?.clear!==true||
  report.outer?.l2dReady!==5||report.inner?.l2dReady!==5||
  Math.abs(report.geometry.floorPanelMeters-.6)>.001||
  Math.abs(report.geometry.ceilingPanelMeters-.95)>.001||
  report.geometry.floorRoofDepthMeters!==10||
  report.outer?.lighting?.count!==6||report.inner?.lighting?.count!==6||
  report.outer?.lighting?.positions?.length!==18||
  report.inner?.lighting?.positions?.length!==18||
  report.outer?.safety?.gap<.07||report.inner?.safety?.gap<.07||
  report.outer?.safety?.foes?.[0]?.heightFraction<.48||
  report.inner?.safety?.foes?.[0]?.heightFraction<.52||
  report.outer?.lighting?.physicallyGroundedShadows<5||
  report.inner?.lighting?.physicallyGroundedShadows<5||
  report.partial?.lighting?.state!=='partial'||
  report.partial?.lighting?.levels?.filter(x=>x===0).length<2||
  report.flicker?.lighting?.state!=='flicker'||
  report.flicker?.lighting?.levels?.[1]>.1||
  report.outage?.lighting?.state!=='outage'||
  report.outage?.lighting?.levels?.some(x=>x>.001)||
  report.outage?.lighting?.physicallyGroundedShadows!==0||
  report.outage?.lighting?.emergencyPower!==1||
  report.innerOutage?.lighting?.state!=='outage'||
  pageErrors.length)
  throw Error('Real browser visual gate failed; see screenshot and report: '+errors.join('; '));
 console.log('PASS six 1917x906 real screenshots: 2.85m compact room; full/partial/flicker/outage; accurate L2D alpha shadows vanish with lights; five uncropped actors');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}

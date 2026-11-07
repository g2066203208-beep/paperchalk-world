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
const errors=[],validationErrors=[],pageErrors=[],report={};
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

 const setLighting=(state,phase=null)=>page.evaluate(({state,phase})=>
  window.PaperWorldGameRingArena.setLighting(state,phase),{state,phase});
 report.outer=await inspect();
 report.initialProjectors=report.outer.lighting.shadowLampAssignments;
 report.alphaClips=report.outer.actorVisibleUv;
 if(report.outer?.lighting?.shadowFilter!=='13-tap-distance-dependent-area-light-penumbra')
  throw Error('Actual WebGL scene is still using old hard-edge shadows');
 await page.screenshot({path:resolve(out,'01-outer-full-lights-1917x906.png')});
 if(ready){
  await setLighting('partial');
  await page.waitForTimeout(150);
  report.partial=await inspect();
  if(JSON.stringify(report.initialProjectors)!==JSON.stringify(report.partial.lighting.shadowLampAssignments))
   validationErrors.push('partial blackout changed the assigned shadow projector');
  await page.screenshot({path:resolve(out,'02-outer-partial-blackout-1917x906.png')});
  await setLighting('flicker',2.0); // exact unpowered ballast moment
  await page.waitForFunction(()=>{
   const l=window.PaperWorldGameRingArena?.inspect()?.lighting;
   return l?.state==='flicker'&&l.levels[1]<.1;
  },null,{timeout:9000});
  report.flicker=await inspect();
  if(JSON.stringify(report.initialProjectors)!==JSON.stringify(report.flicker.lighting.shadowLampAssignments))
   validationErrors.push('flicker teleported the assigned shadow projector');
  await page.screenshot({path:resolve(out,'03-outer-flicker-moment-1917x906.png')});
  await setLighting('outage');
  await page.waitForTimeout(160);
  report.outage=await inspect();
  if(JSON.stringify(report.initialProjectors)!==JSON.stringify(report.outage.lighting.shadowLampAssignments))
   validationErrors.push('outage changed the assigned shadow projector');
  await page.screenshot({path:resolve(out,'04-outer-all-lights-off-1917x906.png')});
  // Three real frames from the exact same running WebGL + original L2D
  // textures. Story moments remain unedited: the power system drives them.
  await setLighting('horror',1.3);
  report.horrorFlicker=await inspect();
  await page.screenshot({path:resolve(out,'07-horror-ballast-flicker-1917x906.png')});
  await setLighting('horror',2.8);
  report.horrorDark=await inspect();
  await page.screenshot({path:resolve(out,'08-horror-complete-failure-1917x906.png')});
  await setLighting('horror',6.0);
  report.horrorRecovery=await inspect();
  await page.screenshot({path:resolve(out,'09-horror-partial-restore-1917x906.png')});
  await setLighting('outage');
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
  if(Object.values(report.inner.actorVisibleUv).some(x=>!x.clip))
   validationErrors.push('one or more 3D portraits did not receive a real source-alpha trim');
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
 report.ready=ready;report.errors=errors;report.validationErrors=validationErrors;report.pageErrors=pageErrors;
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
  report.outer?.lighting?.physicallyGroundedShadows<10||
  report.inner?.lighting?.physicallyGroundedShadows<10||
  report.outer?.lighting?.contactShadow!=='original-L2D-shoe-alpha-no-ellipse'||
  report.inner?.lighting?.contactShadow!=='original-L2D-shoe-alpha-no-ellipse'||
  report.horrorFlicker?.lighting?.state!=='horror'||
  report.horrorFlicker?.lighting?.levels?.[1]>.1||
  report.horrorDark?.lighting?.levels?.some(x=>x>.001)||
  report.horrorDark?.lighting?.physicallyGroundedShadows!==0||
  report.horrorDark?.lighting?.emergencyPower!==1||
  report.horrorRecovery?.lighting?.levels?.filter(x=>x===0).length<2||
  report.partial?.lighting?.state!=='partial'||
  report.partial?.lighting?.levels?.filter(x=>x===0).length<2||
  report.flicker?.lighting?.state!=='flicker'||
  report.flicker?.lighting?.levels?.[1]>.1||
  report.outage?.lighting?.state!=='outage'||
  report.outage?.lighting?.levels?.some(x=>x>.001)||
  report.outage?.lighting?.physicallyGroundedShadows!==0||
  report.outage?.lighting?.emergencyPower!==1||
  report.innerOutage?.lighting?.state!=='outage'||
  validationErrors.length||pageErrors.length)
  throw Error('Real browser visual gate failed; see screenshot and report: '+validationErrors.concat(pageErrors).join('; '));
 console.log('PASS nine real-game WebGL shots: no black circles, dual live L2D alpha shadows, scripted ballast flicker/cascade/blackout/recovery and five grounded characters');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}

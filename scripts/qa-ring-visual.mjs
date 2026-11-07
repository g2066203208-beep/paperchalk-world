/* Focused real-game screenshot proof for ONE standard battle encounter.
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
   return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===8&&s?.wallMaterial?.ready&&
    s?.roomSurfaces?.floor?.ready&&s?.roomSurfaces?.ceiling?.ready;
  },null,{timeout:150000});
  ready=true;
 }catch(e){
  errors.push('ready condition: '+e.message);
  report.l2dBoot=await page.evaluate(()=>Object.fromEntries(
   ['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4'].map(slot=>{
    const a=window.PaperchalkL2D?.get(slot);
    return [slot,{present:!!a,state:a?.root?.dataset?.l2dState||null,
     mode:a?.root?.dataset?.l2dMode||null,rootHidden:a?.root?.hidden,
     imgHidden:a?.img?.hidden,characterId:a?.img?.dataset?.characterId||null,
     clipFrame:a?.clip?.frame??null}];
   })
  ));
 }
 const inspect=()=>page.evaluate(()=>window.PaperWorldGameRingArena?.inspect?.());
 // Require actual ORIGINAL L2D updates for all four independent actors,
 // not a single almost-transparent first-frame texture that happens to count
 // as 'ready'. A stable 4+ GPU frame handshake avoids the ghost-on-load shot.
 if(ready){
  await page.waitForFunction(()=>{
   const a=window.PaperWorldGameRingArena?.inspect?.();
   return a?.l2dReady===8&&['enemy-1','enemy-2','enemy-3','enemy-4']
    .every(id=>(a.l2dFrames?.[id]||0)>=4);
  },null,{timeout:60000});
  await page.waitForTimeout(220);
 }

 const setLighting=(state,phase=null)=>page.evaluate(({state,phase})=>
  window.PaperWorldGameRingArena.setLighting(state,phase),{state,phase});
 report.outer=await inspect();
 report.initialProjectors=report.outer.lighting.shadowLampAssignments;
 report.alphaClips=report.outer.actorVisibleUv;
 const masked=report.alphaClips?.['enemy-3'];
 if(!masked?.clip||masked.clip.right-masked.clip.left>.55||
  masked.sourceMask!=='battle-only-feathered-subject-separates-opaque-clouds')
  validationErrors.push('enemy 3 opaque painted cloud still leaks outside the cropped figure');
 if(report.outer?.lighting?.shadowFilter!=='13-tap-distance-dependent-area-light-penumbra')
  throw Error('Actual WebGL scene is still using old hard-edge shadows');
 await page.screenshot({path:resolve(out,'01-outer-full-lights-1917x906.png')});
 // Actual mouse motion must ORBIT the heroine's original 3D world root while
 // rotating her body-facing ArtMesh and all real projected alpha shadows.
 // Enemy world coordinates never shift, and no scene layers are translated.
 if(ready){
  const anchors=JSON.stringify(report.outer.actors),origin=report.outer.camera.eye;
  await page.mouse.move(75,435);
  await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.cameraLook?.yawDeg< -1.2,
   null,{timeout:45000});
  report.mouseLeft=await inspect();
  await page.screenshot({path:resolve(out,'10-mouse-look-left-1917x906.png')});
  await page.mouse.move(1840,435);
  await page.waitForFunction(()=>window.PaperWorldGameRingArena?.inspect()?.cameraLook?.yawDeg>1.2,
   null,{timeout:45000});
  report.mouseRight=await inspect();
  await page.screenshot({path:resolve(out,'11-mouse-look-right-1917x906.png')});
  report.cameraOrbitProof={
   leftBoomMeters:report.mouseLeft.cameraLook.shoulderBoomMeters,
   rightBoomMeters:report.mouseRight.cameraLook.shoulderBoomMeters,
   bodyLeft:report.mouseLeft.cameraLook.heroYawDeg,
   bodyRight:report.mouseRight.cameraLook.heroYawDeg,
   endWallsLeft:report.mouseLeft.sideWalls.physicalDepth,
   endWallsRight:report.mouseRight.sideWalls.physicalDepth};
  if(report.cameraOrbitProof.endWallsLeft<16||
     report.cameraOrbitProof.endWallsRight<16)
   validationErrors.push('real 3D side walls stop before the visible shoulder orbit');

  if(JSON.stringify(report.mouseLeft.actors)!==anchors||
     JSON.stringify(report.mouseRight.actors)!==anchors)
   validationErrors.push('mouse look mutated physical character world anchors');
  const shoulderPivot=report.outer.actors.allies[0];
  const baseBoom=Math.hypot(origin.x-shoulderPivot.x,origin.z-shoulderPivot.z);
  const leftBoom=Math.hypot(report.mouseLeft.camera.eye.x-shoulderPivot.x,
   report.mouseLeft.camera.eye.z-shoulderPivot.z);
  const rightBoom=Math.hypot(report.mouseRight.camera.eye.x-shoulderPivot.x,
   report.mouseRight.camera.eye.z-shoulderPivot.z);
  if(Math.abs(leftBoom-baseBoom)>.005||Math.abs(rightBoom-baseBoom)>.005)
   validationErrors.push('camera boom detached from grounded heroine');
  if(Math.hypot(report.mouseLeft.camera.eye.x-origin.x,
     report.mouseLeft.camera.eye.z-origin.z)<.02||
     Math.hypot(report.mouseRight.camera.eye.x-origin.x,
     report.mouseRight.camera.eye.z-origin.z)<.02)
   validationErrors.push('mouse look is still a fixed eye, not a TPS orbit');
  if(report.mouseLeft.cameraLook.mode!=='hero-root-tps-shoulder-rig'||
     !report.mouseRight.cameraLook.orbitAroundHero||
     report.mouseLeft.cameraLook.heroYawDeg!==0||
     report.mouseRight.cameraLook.heroYawDeg!==0)
   validationErrors.push('camera look improperly rotates the fixed heroine');
  if(!(report.mouseLeft.cameraLook.yawDeg<-1.2&&
       report.mouseRight.cameraLook.yawDeg>1.2))
   validationErrors.push('cursor does not turn camera in the correct direction');
  await page.mouse.move(958,453);
  await page.waitForFunction(()=>Math.abs(window.PaperWorldGameRingArena?.inspect()?.cameraLook?.yawDeg||0)<.10,
   null,{timeout:45000});
 }

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
  await page.screenshot({path:resolve(out,'04-ceiling-fixtures-red-1917x906.png')});
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
  // Single encounter: restore the SAME characters and actual light fixtures
  // instead of secretly teleporting to a reverse/surround scene.
  await setLighting('on');
  await page.waitForTimeout(180);
  report.restored=await inspect();
  if(Object.values(report.restored.actorVisibleUv).some(x=>!x.clip))
   validationErrors.push('alpha crop missing after lamp restoration');
  await page.screenshot({path:resolve(out,'05-single-encounter-light-restored-1917x906.png')});
 }
 report.geometry={
  floorPanelMeters:report.outer?.ring?.floorTileMeters/2,
  ceilingPanelMeters:report.outer?.ring?.ceilingTileMeters/2,
  ceilingHeightMeters:report.outer?.ring?.ceilingHeight,
  floorRoofDepthMeters:report.outer?.ring?.surfaceDepth,
  foePositions:report.outer?.actors?.enemies?.map(a=>({x:a.x,y:a.y,z:a.z}))
 };
 // Actual runtime RGBA source captures for transparent-edge quality review.
 // Assets remain owned by L2D; only this QA artifact receives copies.
 if(ready){
  const sources=await page.evaluate(()=>{
   const result={};
   for(const [name,slot]of Object.entries({
    'enemy-1':'enemy','enemy-2':'enemy2','enemy-3':'enemy3','enemy-4':'enemy4'
   })){
    const live=window.PaperchalkL2D?.get(slot);
    const canvas=live?.canvas;
    try{result[name]=canvas?.toDataURL?.('image/png')||null}
    catch(e){result[name]=null}
   }
   return result;
  });
  for(const [id,uri]of Object.entries(sources)){
   if(typeof uri!=='string'||!uri.startsWith('data:image/png;base64,'))continue;
   writeFileSync(resolve(out,'10-source-RGBA-'+id+'.png'),
    Buffer.from(uri.slice(uri.indexOf(',')+1),'base64'));
  }
 }
 report.ready=ready;report.errors=errors;report.validationErrors=validationErrors;report.pageErrors=pageErrors;
 writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
 if(!ready||report.outer?.wallMaterial?.heightMeters!==2.85||
  report.outer?.wallMaterial?.repeats!==9||
  !report.outer?.roomSurfaces?.floor?.ready||!report.outer?.roomSurfaces?.ceiling?.ready||
  report.outer?.roomSurfaces?.floor?.vertices<15000||
  report.outer?.safety?.clear!==true||
  report.outer?.l2dReady!==8||
  report.outer?.encounterControls!==0||
  report.outer?.encounter!=='one-centered-grounded-opponents'||
  Math.abs(report.geometry.floorPanelMeters-.6)>.001||
  Math.abs(report.geometry.ceilingPanelMeters-.95)>.001||
  report.geometry.floorRoofDepthMeters!==10||
  !report.geometry.foePositions||
  Math.max(...report.geometry.foePositions.map(a=>a.x))-
   Math.min(...report.geometry.foePositions.map(a=>a.x))<3.7||
  report.outer?.lighting?.count!==6||
  report.outer?.lighting?.positions?.length!==18||
  report.outer?.safety?.gap<.055||
  report.outer?.lighting?.physicallyGroundedShadows<8||
  report.outer?.lighting?.contactShadow!=='original-L2D-shoe-alpha-no-ellipse'||
  report.horrorFlicker?.lighting?.state!=='horror'||
  report.horrorFlicker?.lighting?.levels?.[1]>.1||
  report.horrorDark?.lighting?.redMix?.[1]!==1||
  report.horrorDark?.lighting?.redMix?.[4]!==1||
  report.horrorDark?.lighting?.noDetachedRedLight!==true||
  report.horrorRecovery?.lighting?.levels?.filter(x=>x===0).length<2||
  report.partial?.lighting?.state!=='partial'||
  report.partial?.lighting?.levels?.filter(x=>x===0).length<2||
  report.flicker?.lighting?.state!=='flicker'||
  report.flicker?.lighting?.levels?.[1]>.1||
  report.outage?.lighting?.state!=='outage'||
  report.outage?.lighting?.redMix?.[1]!==1||
  report.outage?.lighting?.redMix?.[4]!==1||
  report.outage?.lighting?.noDetachedRedLight!==true||
  report.restored?.mode!=='outer'||
  validationErrors.length||pageErrors.length)
  throw Error('Real browser visual gate failed; see screenshot and report: '+validationErrors.concat(pageErrors,errors).join('; '));
 console.log('PASS true TPS camera orbit, fixed heroine world pose, original 4v4 L2D, eight real alpha shadows and red ceiling lamps');
}finally{
 await browser.close();await new Promise(ok=>server.close(ok));
}

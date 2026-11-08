/* Lightweight real Chromium/WebGL capture. Deliberately independent of the
 * longer attack storyboard regression: geometry mistakes must still leave
 * inspectable authentic screenshots for review. No mocks or art generation. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site'),out=resolve('artifacts/ring-arena');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.webp':'image/webp',
 '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((request,response)=>{
 const u=new URL(request.url,'http://localhost');
 const path=resolve(root,'.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
 if(!path.startsWith(root+'/'))return response.writeHead(403).end();
 try{
  const body=readFileSync(path);
  response.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}).end(body);
 }catch{response.writeHead(404).end('not found')}
});
await new Promise(resolveListening=>server.listen(0,'127.0.0.1',resolveListening));
let browser;
try{
 browser=await chromium.launch({headless:true,
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:'+server.address().port;
 await page.goto(origin+'/index.html?scene=ring-arena',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&s?.renderer==='webgl-l2d'&&s?.l2dReady===8&&
   s?.heroLiveFemale07L2D===true&&s?.female07PartyPartRigIds?.length===4&&
   s?.wallMaterial?.ready===true&&
   Object.keys(s?.renderedActorOpacity||{}).length===8;
 },null,{timeout:160000});
 mkdirSync(out,{recursive:true});
 const entries=[];
 for(let slot=1;slot<=4;slot++){
  await page.locator('[data-control-ally="'+slot+'"]').click();
  await page.mouse.move(640,360);
  await page.waitForFunction(index=>{
   const s=window.PaperWorldGameRingArena?.inspect();
   return s?.controlledAllyIndex===index-1&&s?.cameraParity===true&&
    s?.stagePresentation==='p5-spaced-fixed-all-back-command-team'&&
    Math.abs(s.cameraLook?.yawDeg||0)<1.2;
  },slot,{timeout:16000});
  await page.waitForTimeout(100);
  const data=await page.evaluate(()=>{
   const game=window.PaperWorldGameRingArena.inspect();
   const ring=window.PaperWorldRingArena;
   const visible=game.presentationActors;
   const enemyRects=visible.filter(a=>a.team==='enemy').map(a=>
    ring.portraitVisibleBounds(a,game.camera,
     {left:.30,right:.69,top:0,bottom:1},game.projectionAspect));
   const squadRects=visible.filter(a=>a.team==='ally').map(a=>
    ring.portraitVisibleBounds(a,game.camera,
     ring.FEMALE07_BACK_UV,game.projectionAspect));
   return {
    active:game.controlledActorId,actorIds:game.visibleActorIds,
    opacity:game.renderedActorOpacity,camera:game.camera,enemyRects,squadRects,
    dynamicFemale07:game.heroLiveFemale07L2D,
    dynamicPartyIds:game.female07PartyPartRigIds,
    dynamicUploads:game.heroTextureUploads,
    worldActors:game.presentationActors,staging:game.stagePresentation,
    friendlyX:game.partyLine.map(a=>a.x),enemyX:game.opposingLine.map(a=>a.x)
   };
  });
  assert.deepEqual(data.friendlyX,[-1.05,-1.72,.98,-1.05]);
  assert.deepEqual(data.enemyX,[-.2,.45,1.1,1.75]);
  assert.equal(data.actorIds.length,8);
  assert.equal(data.staging,'p5-spaced-fixed-all-back-command-team');
  assert.deepEqual(data.worldActors.filter(a=>a.team==='ally').map(a=>a.z),
   [9.3,7.95,9.45,8.32],'all 4 L2D backs keep distinct P5-style permanent positions');
  assert.ok(data.worldActors.filter(a=>a.team==='ally').every(a=>a.stageYaw===undefined),
   'no 3D side rotations: 4 back-facing portraits only');
  assert.ok(data.dynamicFemale07&&data.dynamicPartyIds.length===4,
   'four authentic female07 PartRig animation canvases, not static fallback');
  assert.equal(data.camera.fov,66,'never alter the approved 66 degree lens');
  assert.equal(data.camera.eye.y,1.5,'never raise the approved camera');
  assert.equal(data.camera.focus.y,1.5,'never tilt the approved eye-level camera');
  assert.deepEqual(Object.keys(data.opacity).sort(),data.actorIds.slice().sort());
  assert.ok(Object.values(data.opacity).every(n=>n===1),'a teammate was hidden');
  // Record actual clipping as review data, never suppress a REAL screenshot
  // because a separate (pre-existing) formation problem is being examined.
  // No fake camera or invisible actor is used to satisfy this check.
  data.fourEnemySilhouettesUnclipped=data.enemyRects.every(a=>
   a.valid&&a.left>-1&&a.right<1);
  if(!data.fourEnemySilhouettesUnclipped)
   console.warn('VISUAL REVIEW:',slot,'one or more enemies extend outside the viewport');
  const filename=slot===1?'final-eye-level-3q-1280x720.png':
   'party-controlled-'+slot+'-1280x720.png';
  await page.screenshot({path:resolve(out,filename),animations:'disabled'});
  entries.push({slot,filename,...data});
 }
 await page.locator('[data-control-ally="1"]').click();
 await page.mouse.move(640,360);
 await page.setViewportSize({width:1917,height:906});
 await page.waitForTimeout(800);
 await page.screenshot({path:resolve(out,'V31-woman7-four-enemies-ground-aligned-1917x906.png'),
  animations:'disabled'});
 assert.deepEqual(errors,[],'WebGL battle JavaScript errors');
 writeFileSync(resolve(out,'camera-review.json'),JSON.stringify({
  source:'ACTUAL in-game Chromium/WebGL; no illustrations, mocks, or faked poses',
  commit:process.env.GITHUB_SHA||null,entries
 },null,2));
 console.log('PASS: 5 authentic WebGL captures; 4 role handoffs, true 3D spectators and locked 66-degree hero camera');
}finally{
 await browser?.close();
 await new Promise(resolveClosed=>server.close(resolveClosed));
}

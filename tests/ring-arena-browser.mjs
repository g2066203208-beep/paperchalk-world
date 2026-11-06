/* Live browser proof: published L2D art, world-space anchors and two orbit views.
 * Saves the ACTUAL game canvas as screenshots; never substitute mock pictures.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png',
 '.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
 const path=resolve(root,'.'+name);
 if(!path.startsWith(root+'/'))return res.writeHead(403).end();
 let bytes;
 try{bytes=readFileSync(path)}catch{res.writeHead(404).end('not found');return}
 res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'});
 res.end(bytes)
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ring-arena',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?scene=ring-arena',
  {waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>{
  const s=window.PaperWorldGameRingArena?.inspect();
  return s?.active&&s.renderer==='webgl-l2d'&&s.actors.allies.length===4&&
   s.actors.enemies.length===4&&document.getElementById('ring-arena-canvas')?.width>800;
 },null,{timeout:65000});
 await page.screenshot({path:'artifacts/ring-arena/l2d-initial.png'});
 console.log('INIT',JSON.stringify(await page.evaluate(()=>{
   const r=window.PaperWorldGameRingArena?.inspect();
   return {active:r?.active,renderer:r?.renderer,l2dReady:r?.l2dReady,
     pageScene:document.querySelector('#scene')?.dataset.scene,
     sources:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
       .map(id=>{const a=window.PaperchalkL2D?.get(id);
         return {id,ready:a?.root?.dataset.l2dState,hidden:a?.root?.hidden,
           imgHidden:a?.img?.hidden,canvas:a?.canvas?.width,
           character:a?.img?.dataset.characterId}})
   };
 })));
 try{
 await page.waitForFunction(()=>{
  const r=window.PaperWorldGameRingArena?.inspect();
  return window.PaperchalkCharacterDev?.ready&&r?.l2dReady===5&&
   ['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
     .every(id=>window.PaperchalkL2D?.get(id)?.root?.dataset.l2dState==='ready');
 },null,{timeout:75000});
 }catch(error){
   await page.screenshot({path:'artifacts/ring-arena/l2d-failed-diagnostic.png'}).catch(()=>{});
   console.error('DIAG',JSON.stringify(await page.evaluate(()=>({
     scene:document.querySelector('#scene')?.dataset.scene,
     ring:window.PaperWorldGameRingArena?.inspect(),
     ready:window.PaperchalkCharacterDev?.ready,
     errors:document.getElementById('dev-character-status')?.textContent,
     actors:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
      .map(id=>{const a=window.PaperchalkL2D?.get(id);
       return {id,ready:a?.root?.dataset.l2dState,hidden:a?.root?.hidden,
        imgHidden:a?.img?.hidden,w:a?.canvas?.width,
        char:a?.img?.dataset.characterId,mode:a?.root?.dataset.l2dMode}})
   }))));
   throw error;
 }
 await page.waitForTimeout(800);
 const get=()=>page.evaluate(()=>{
  const r=window.PaperWorldGameRingArena.inspect();
  return {arena:r,
   sources:['player','ally2','ally3','ally4','enemy','enemy2','enemy3','enemy4']
    .map(id=>{const a=window.PaperchalkL2D.get(id);return {
     id,character:a.img.dataset.characterId,side:a.img.dataset.characterSide,
     animated:a.root.dataset.l2dAnimated,mode:a.root.dataset.l2dMode,
     ready:a.root.dataset.l2dState,hidden:a.root.hidden,
     canvasW:a.canvas.width,canvasH:a.canvas.height
    }})
  };
 });
 const heroinePixelSignature=()=>page.evaluate(()=>{
  const actor=window.PaperchalkL2D.get('player');
  const source=actor.clip?.type==='native'?actor.clip.img:actor.canvas;
  const c=document.createElement('canvas');c.width=48;c.height=48;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(source,0,0,48,48);
  return [...ctx.getImageData(0,0,48,48).data];
 });
 const before=await get();
 assert.equal(before.arena.mode,'outer');
 assert.equal(before.arena.shotIndex,0);
 assert.equal(before.arena.shotName,'左侧');
 assert.equal(before.arena.camera.shot,'left');
 assert.ok(Math.abs(before.arena.cameraPitchDeg)<.1,
  'outer camera must be exactly level with the battle horizon');
 assert.equal(before.arena.ring.stageType,'wide-cinematic-arc');
 assert.equal(before.arena.l2dReady,5);
 assert.equal(await page.locator('[data-shot]').count(),2,'only left and right buttons');
 assert.equal(await page.locator('[data-shot="1"]').textContent(),'右机位 ▶');
 assert.equal(await page.locator('[data-shot="2"]').count(),0,'remove center/third station');
 assert.equal(await page.locator('[data-shift]').count(),0,'remove redundant camera controls');
 assert.equal(before.sources.find(p=>p.id==='player').side,'back');
 assert.equal(before.sources.find(p=>p.id==='player').character,'protagonist');
 assert.equal(before.arena.heroine.id,'protagonist');
 assert.equal(before.arena.heroine.side,'back');
 assert.ok(before.arena.heroine.ready,'approved original L2D back must be rendered');
 assert.ok(before.arena.safety.clear&&before.arena.safety.gap>.045,
  'real transparent heroine silhouette must NOT cover opponent number one');
 assert.ok(before.sources.every(p=>!p.hidden&&p.ready==='ready'&&p.canvasW>0));
 const originalOuter=JSON.stringify(before.arena.actors);
 const approvedBackPixels=await heroinePixelSignature();
 const computed=await page.evaluate(()=>{
  const a=window.PaperWorldRingArena,scene=a.layout('outer'),c=a.camera('outer',0);
  return {hero:a.portraitBounds(scene.allies[0],c),
   heroCenter:a.project({...scene.allies[0],y:.85},c),
   enemies:scene.enemies.map(p=>a.portraitBounds(p,c)),
   cameraCount:a.CAMERA_STOPS.outer.length};
 });
 assert.equal(computed.cameraCount,2);
 assert.ok(computed.hero.valid&&computed.hero.heightFraction>.78);
 assert.ok(computed.heroCenter.x<-.50&&computed.heroCenter.x>-.82,
   'real L2D heroine center remains in near-left foreground');
 assert.ok(computed.enemies.every(b=>b.valid&&b.left>-.90&&b.right<.90));
 assert.ok(computed.hero.heightFraction>.78&&computed.hero.heightFraction<1.30,
  'heroine should feel camera-close, with intentional below-screen crop');
 const staging=await page.evaluate(()=>{
  const a=window.PaperWorldRingArena,scene=a.layout('outer'),c=a.camera('outer',0);
  return {positions:scene.enemies.map(p=>[p.x,p.z]),
   centers:scene.enemies.map(p=>a.project({...p,y:p.height*.5},c).x)};
 });
 assert.ok(Math.max(...staging.positions.map(p=>p[0]))-
  Math.min(...staging.positions.map(p=>p[0]))>=3.5);
 assert.ok(Math.max(...staging.positions.map(p=>p[1]))-
  Math.min(...staging.positions.map(p=>p[1]))>=.3,
  'enemies must visibly stagger along the shallow 3D arc');
 const sortedCenters=staging.centers.slice().sort((a,b)=>a-b);
 assert.ok(sortedCenters.slice(1).every((x,i)=>x-sortedCenters[i]>.20),
  'foe screen centers should never stack on top of each other');
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-left.png'});
 // Only on POINTER RELEASE may the camera snap to the other approved position.
 await page.mouse.move(540,240);await page.mouse.down();
 await page.mouse.move(735,240,{steps:7});
 assert.equal((await get()).arena.shotIndex,0,'no follow-pointer camera motion');
 await page.mouse.up();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().settled,null,{timeout:7000});
 const right=await get();
 assert.equal(right.arena.shotIndex,1);
 assert.equal(right.arena.shotName,'右侧');
 assert.equal(right.arena.camera.shot,'right');
 assert.ok(Math.abs(right.arena.cameraPitchDeg)<.1,
  'right shot camera must use identical low cinematic pitch');
 assert.equal(right.arena.l2dReady,5);
 assert.equal(JSON.stringify(right.arena.actors),originalOuter);
 assert.equal(right.arena.heroine.id,'protagonist');
 assert.equal(right.arena.heroine.side,'back');
 assert.ok(right.arena.safety.clear&&right.arena.safety.gap>.045,
  'right view near-hero L2D must leave all enemy sprites uncovered');
 await page.screenshot({path:'artifacts/ring-arena/l2d-outer-right.png'});
 // Extra same-direction swipe never reveals a nonexistent intermediate view.
 await page.mouse.move(540,240);await page.mouse.down();
 await page.mouse.move(735,240,{steps:5});await page.mouse.up();
 assert.equal((await get()).arena.shotIndex,1);
 await page.locator('[data-mode="inner"]').click();
 await page.waitForTimeout(350);
 const innerRight=await get();
 assert.equal(innerRight.arena.mode,'inner');
 assert.equal(innerRight.arena.shotIndex,1);
 assert.equal(innerRight.arena.camera.shot,'right');
 assert.ok(Math.abs(innerRight.arena.cameraPitchDeg)<.1,
  'inner surround shot must not be top-down');
 assert.equal(innerRight.arena.l2dReady,5);
 const originalInner=JSON.stringify(innerRight.arena.actors);
 assert.ok(innerRight.arena.safety.clear&&innerRight.arena.safety.gap>.045,
  'inner right surround must preserve readable four enemies');
 await page.screenshot({path:'artifacts/ring-arena/l2d-inner-right.png'});
 await page.locator('[data-shot="0"]').click();
 await page.waitForFunction(()=>window.PaperWorldGameRingArena.inspect().settled,null,{timeout:7000});
 const innerLeft=await get();
 assert.equal(innerLeft.arena.shotIndex,0);
 assert.equal(innerLeft.arena.camera.shot,'left');
 assert.ok(Math.abs(innerLeft.arena.cameraPitchDeg)<.1,
  'inner left camera must share low camera pitch');
 assert.equal(JSON.stringify(innerLeft.arena.actors),originalInner);
 assert.ok(innerLeft.arena.safety.clear&&innerLeft.arena.safety.gap>.045,
  'inner left surround must preserve readable four enemies');
 await page.screenshot({path:'artifacts/ring-arena/l2d-inner-left.png'});
 // Real WebGL projection across desktop and mobile viewport sizes.
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/ring-arena/desktop-1920x1080.png'});
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(300);
 await page.screenshot({path:'artifacts/ring-arena/mobile-landscape-844x390.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(300);
 const mobile=await get();
 assert.equal(JSON.stringify(mobile.arena.actors),originalInner);
 assert.equal(mobile.arena.heroine.id,'protagonist');
 assert.equal(mobile.arena.heroine.side,'back');
 assert.ok(mobile.arena.safety.clear&&mobile.arena.safety.gap>.045,
  'mobile portrait aspect must retain heroine/enemy screen-safe separation');
 assert.ok(mobile.arena.effectiveVerticalFov>=mobile.arena.camera.fov,
  'mobile portrait lens should preserve horizontal team composition');
 await page.screenshot({path:'artifacts/ring-arena/mobile-portrait-390x844.png'});
 assert.deepEqual(errors,[],'unexpected browser JavaScript errors');
 // Regression for an actual stale user-saved DEV slot: even when a previous
 // session selected another person's FRONT, the arena reload must bind the
 // approved protagonist BACK without destroying the saved assignment.
 await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('paperchalk-dev-characters-v1',1);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  try{
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('kv','readwrite');
    tx.objectStore('kv').put({id:'char-002',side:'front'},'slot:player');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
   });
  }finally{db.close()}
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{
  const a=window.PaperchalkL2D?.get('player');
  const r=window.PaperWorldGameRingArena?.inspect();
  return window.PaperchalkCharacterDev?.ready&&r?.active&&
   a?.img?.dataset.characterId==='protagonist'&&
   a?.img?.dataset.characterSide==='back'&&
   r.heroine?.ready&&r.l2dReady===5;
 },null,{timeout:85000});
 await page.waitForFunction(()=>{
  const runtime=window.PaperchalkL2D.get('player');
  return (!runtime.clip||runtime.clip.type!=='decoder'||runtime.clip.frame>=0)&&
   (!runtime.libraryPlayer||runtime.libraryPlayer.renderedFrames>2)&&
   window.PaperWorldGameRingArena.inspect().l2dFrames.hero>=3;
 },null,{timeout:30000});
 await page.waitForTimeout(250);
 const newBackPixels=await heroinePixelSignature();
 let alphaSamples=0,errorSum=0;
 for(let k=0;k<approvedBackPixels.length;k+=4){
  if(approvedBackPixels[k+3]<75)continue;
  alphaSamples++;
  for(let c=0;c<3;c++)errorSum+=Math.abs(approvedBackPixels[k+c]-newBackPixels[k+c]);
  errorSum+=Math.abs(approvedBackPixels[k+3]-newBackPixels[k+3]);
 }
 assert.ok(alphaSamples>70,'expected authentic opaque actress pixels in the first screenshot');
 const perChannelError=errorSum/(alphaSamples*4);
 assert.ok(perChannelError<54,
  'recovered rear L2D must match real original heroine pixels, not just a changed metadata id: '+perChannelError);
 const recovered=await get();
 assert.equal(recovered.arena.heroine.id,'protagonist');
 assert.equal(recovered.arena.heroine.side,'back');
 assert.ok(recovered.arena.safety.clear,'stale local character binding must not make foes disappear');
 await page.screenshot({path:'artifacts/ring-arena/after-stale-player-slot-repair.png'});
 // Opt-in art direction comparison. The canonical L2D must survive a
 // static 3/4-rear pose preview and instantly return when switched off.
 await page.setViewportSize({width:1280,height:720});
 await page.goto('http://127.0.0.1:'+server.address().port+
  '/index.html?scene=ring-arena&heroPose=level',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{
  const r=window.PaperWorldGameRingArena?.inspect();
  return r?.active&&r?.posePreviewEnabled===true&&r?.previewPose==='level'&&
   Math.abs(r?.cameraPitchDeg)<.1&&r?.lensShift===.19&&r?.l2dReady===5&&
   r?.l2dFrames?.hero>=3;
 },null,{timeout:85000});
 assert.equal(await page.locator('[data-pose="toggle"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'artifacts/ring-arena/hero-eye-level-preview-left.png'});
 await page.locator('[data-shot="1"]').click();
 await page.waitForFunction(()=>{
  const r=window.PaperWorldGameRingArena?.inspect();
  return r?.shotIndex===1&&r?.settled&&r?.l2dReady===5;
 },null,{timeout:8000});
 await page.screenshot({path:'artifacts/ring-arena/hero-eye-level-preview-right.png'});
 await page.locator('[data-pose="toggle"]').click();
 await page.waitForFunction(()=>{
  const r=window.PaperWorldGameRingArena?.inspect();
  return r?.posePreviewEnabled===false&&r?.heroine?.ready&&r?.l2dReady===5;
 },null,{timeout:30000});
 assert.equal(await page.locator('[data-pose="toggle"]').getAttribute('aria-pressed'),'false');
 await page.screenshot({path:'artifacts/ring-arena/hero-original-restored.png'});
 assert.deepEqual(errors,[],'pose preview must not introduce browser JavaScript errors');
 await page.close();
 console.log('PASS: 2 near-hero fixed cameras with back L2D and 4 uncropped foes, screen sizes, immutable world');
}finally{
 await browser.close();await new Promise(done=>server.close(done));
}
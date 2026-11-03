import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),pathname=url.pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{const data=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(data)}
  catch{res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ground',{recursive:true});
try{
 for(const cfg of [{name:'desktop',w:1280,h:720,mobile:false},{name:'mobile',w:390,h:844,mobile:true}]){
   const page=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},isMobile:cfg.mobile,hasTouch:cfg.mobile});
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   const url='http://127.0.0.1:'+server.address().port+'/index.html?scene=classroom&dev=1';
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>!!window.PaperWorldGroundPerspective&&
     !!window.PaperWorldL2DGround&&
     !!document.getElementById('dev-ground-perspective')?.textContent,null,{timeout:15000});
   // This isolated browser starts with the prologue, which deliberately hides
   // NPCs. Expose both layout slots to test the shared-floor coordinates;
   // the real game unhides them when their story scene/actor is active.
   await page.evaluate(()=>{
     document.getElementById('enemy-depth-root').hidden=false;
     document.getElementById('actor-enemy').hidden=false;
     document.getElementById('camera-player-root').hidden=false;
   });
   await page.waitForFunction(()=>document.getElementById('actor-enemy').offsetHeight>0);
   const initial=await page.evaluate(()=>({fit:window.PaperWorldGroundPerspective.inspect(),
     state:window.PaperWorldGroundPerspective.current()}));
   assert.equal(initial.fit.valid,true,JSON.stringify(initial));
   assert.ok(initial.fit.sizePercent>45&&initial.fit.sizePercent<60,
     'Default distant NPC should be about 52% of the scene, not old hardcoded 34%: '+JSON.stringify(initial));
   assert.equal(initial.state.locked,false,'Preexisting hand-placed defaults must not be silently changed');
   assert.equal(initial.state.enemy.size,34,'Editor changed saved NPC size without consent');
   const {x,y,size}=initial.state.enemy;
   // Moving the ground is a shared-parent transform, not a loose 3D grid.
   // Check REAL DOM shoes: foreground and background must travel the same
   // logical-pixel distance, leaving individually saved actor offsets intact.
   // The standalone fog-smoke workflow builds scene assets only; its
   // committed character catalog contains the heroine, not CHAR-002.
   // Bind the existing genuine CHAR-002 PNG to its real L2D renderer
   // (never display the static PNG) before testing the L2D CANVAS.
   await page.evaluate(async()=>{
     const a=window.PaperchalkL2D.get('enemy');
     if(!a.img.src){
       a.img.src='./assets/characters/char-002/front.png';
       await a.img.decode();
     }
     await window.PaperchalkL2D.refresh('enemy');
   });
   await page.waitForFunction(()=>['player','enemy'].every(id=>{
     const a=window.PaperchalkL2D?.get(id);
     return a?.root?.dataset.l2dState==='ready'&&a.canvas.width>0&&a.canvas.height>0;
   }),null,{timeout:18000});
   const floorStart=await page.evaluate(()=>{
     const view=document.getElementById('view');
     const rig=document.getElementById('dev-rig');
     const snap=id=>{
       const a=window.PaperchalkL2D.get(id);
       const rect=el=>el.getBoundingClientRect().toJSON();
       return {root:rect(a.root),canvas:rect(a.canvas),
         source:rect(a.img),mode:a.root.dataset.l2dMode,
         native:a.clip?.type==='native'?rect(a.clip.img):null,
         ground:getComputedStyle(a.root).translate,
         height:a.img.offsetHeight};
     };
     return {
       h:view.clientHeight,
       player:snap('player'),enemy:snap('enemy'),
       playerZ:getComputedStyle(rig).getPropertyValue('--dev-depth-player').trim(),
       enemyZ:getComputedStyle(rig).getPropertyValue('--dev-depth-enemy').trim(),
       floorZ:getComputedStyle(rig).getPropertyValue('--dev-depth-ground').trim()
     };
   });
   assert.ok(floorStart.player.canvas.height>0&&floorStart.enemy.canvas.height>0,
     'Expected the actual animated L2D canvas to be laid out: '+JSON.stringify(floorStart));
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-before-move.png'});
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-ground-y');
     slider.value='83';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const floorYMoved=await page.evaluate(()=>{
     const snap=id=>{
       const a=window.PaperchalkL2D.get(id);
       const rect=el=>el.getBoundingClientRect().toJSON();
       return {root:rect(a.root),canvas:rect(a.canvas),
         source:rect(a.img),native:a.clip?.type==='native'?rect(a.clip.img):null,
         ground:getComputedStyle(a.root).translate,
         height:a.img.offsetHeight};
     };
     return {player:snap('player'),enemy:snap('enemy'),
       state:window.PaperWorldGroundPerspective.current()};
   });
   const expectedShift=floorStart.h*.06;
   for(const role of ['player','enemy']){
     const before=floorStart[role],after=floorYMoved[role];
     const translation=after.ground.split(/\s+/).map(parseFloat);
     // CSS computed translate intentionally drops a trailing zero Z length.
     assert.ok(Math.abs(translation[0])<.002&&Math.abs(translation[1]-expectedShift)<.002&&
       Math.abs(translation[2]||0)<.002,
       role+' entire L2D root must inherit the shared floor translation: '+JSON.stringify(floorYMoved));
     assert.equal(after.height,before.height,
       role+' floor must NOT resize the 1024px L2D rig or restart bones');
     for(const surface of ['root','canvas','source','native']){
       if(!before[surface])continue;
       const delta=after[surface].top-before[surface].top;
       assert.ok(delta>3,
         role+' visible L2D '+surface+' stayed behind when floor moved: '+
         JSON.stringify({delta,expectedShift,before,after}));
       // The 3D DEV rig tilts the billboard in perspective: a topmost
       // root bounding box and a lower internal canvas point naturally
       // move DIFFERENT screen distances. Verify every visible render
       // surface stays registered to its source layout at the same depth.
       const canvasDelta=after.canvas.top-before.canvas.top;
       const sourceDelta=after.source.top-before.source.top;
       assert.ok(Math.abs(canvasDelta-sourceDelta)<2,
         role+' animated canvas detached from invisible layout shoe anchor: '+
         JSON.stringify({canvasDelta,sourceDelta,before,after}));
       if(surface==='native'){
         assert.ok(Math.abs(delta-canvasDelta)<12,
           role+' native V4 clip detached from its L2D parent: '+
           JSON.stringify({delta,canvasDelta,before,after}));
       }
     }
   }
   assert.equal(floorYMoved.state.enemy.y,y,'NPC relative foot anchor was overwritten');
   assert.equal(floorYMoved.state.player.y,initial.state.player.y,'Player relative foot anchor was overwritten');
   assert.equal(floorYMoved.state.enemy.size,size,'Moving the floor changed NPC stature');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-all-actors-follow-floor.png'});
   await page.locator('#dev-layer').selectOption('ground');
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-z');
     slider.value='-165';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const floorZMoved=await page.evaluate(()=>{
     const rig=document.getElementById('dev-rig');
     const value=name=>Number(getComputedStyle(rig).getPropertyValue('--dev-depth-'+name).replace('px',''));
     return {player:value('player'),enemy:value('enemy'),ground:value('ground'),
       state:window.PaperWorldGroundPerspective.current()};
   });
   assert.equal(floorZMoved.ground,-165,'Ground 3D Z slider did not move the floor');
   // The original plane depths stay authored and untouched. A separate
   // stable parent translation is responsible for carrying ALL L2D drawings
   // with the shared world-floor Z delta (avoids overwriting stored Z).
   assert.equal(floorZMoved.player,Number(floorStart.playerZ.replace('px','')),
     'The original player depth was overwritten instead of moving their parent');
   assert.equal(floorZMoved.enemy,Number(floorStart.enemyZ.replace('px','')),
     'The original NPC depth was overwritten instead of moving their parent');
   const attached=await page.evaluate(()=>['player','enemy'].map(id=>{
     const a=window.PaperchalkL2D.get(id);
     return {id,translate:getComputedStyle(a.root).translate,
       canvas:a.canvas.getBoundingClientRect().toJSON(),
       attached:a.root.dataset.groundAttached};
   }));
   for(const actor of attached){
     assert.equal(actor.attached,'true',actor.id+' is not bound to the floor');
     assert.equal(actor.translate,'0px 43.2px 50px',
       actor.id+' visible L2D root did not follow floor depth: '+JSON.stringify(attached));
     assert.ok(actor.canvas.height>0,actor.id+' L2D canvas is not drawn');
   }
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-depth-follow.png'});
   assert.equal(floorZMoved.state.enemy.z,initial.state.enemy.z,'NPC relative Z anchor was overwritten');
   assert.equal(floorZMoved.state.player.z,initial.state.player.z,'Player relative Z anchor was overwritten');
   // Restore the exact original floor. No residual offset, no change to
   // the two character transforms, and the existing calibration test follows.
   await page.evaluate(()=>{
     const depth=document.getElementById('dev-z');depth.value='-215';
     depth.dispatchEvent(new Event('input',{bubbles:true}));
     const height=document.getElementById('dev-ground-y');height.value='77';
     height.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.locator('#dev-layer').selectOption('enemy');
   await page.locator('#dev-ground-calibrate').click({timeout:15000});
   const calibrated=await page.evaluate(()=>({state:window.PaperWorldGroundPerspective.current(),
     fit:window.PaperWorldGroundPerspective.inspect(),
     stored:localStorage.getItem('paperchalk-layer-editor-v2')}));
   assert.equal(calibrated.state.locked,true,'Calibrate button did not enable ground locking');
   assert.equal(calibrated.state.enemy.x,x,'Calibration moved manually placed X');
   assert.equal(calibrated.state.enemy.y,y,'Calibration moved manually placed shoe Y');
   assert.notEqual(calibrated.state.enemy.size,size,'Calibration did not change perspective size');
   assert.ok(Math.abs(calibrated.state.enemy.size-calibrated.fit.sizePercent)<.03,
     'Projected scale does not match floor geometry: '+JSON.stringify(calibrated));
   assert.ok(calibrated.stored?.includes('"lockPerspective":1'),
     'One-click calibration did not preserve the updated floor model');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-calibrated.png'});
   // Moving the NPC shoe point is movement across one common ground plane:
   // depth and physical apparent size must update; the new foot is not moved.
   const oldHeight=calibrated.state.enemy.size;
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-y');
     slider.value='26';
     slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const shifted=await page.evaluate(()=>window.PaperWorldGroundPerspective.current());
   assert.equal(shifted.enemy.y,26);
   assert.ok(shifted.enemy.size<oldHeight,
     'Moving the NPC farther along the floor should shrink apparent stature');
   assert.equal(shifted.enemy.x,x,'Ground constraint changed horizontal placement');
   await page.locator('#dev-ground-lock').uncheck();
   assert.equal((await page.evaluate(()=>window.PaperWorldGroundPerspective.current())).locked,false);
   assert.deepEqual(errs,[],errs.join('; '));
   console.log('PASS '+cfg.name+': visibly rendered L2D canvas follows floor Y/Z; physical stature, calibration, saved coordinates');
   await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}

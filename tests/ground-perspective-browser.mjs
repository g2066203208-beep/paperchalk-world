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
   await page.waitForFunction(()=>{
     const state=window.PaperWorldL2DGround?.inspect();
     return state?.actors?.length===2&&
       state.actors.every(a=>a.detected&&Math.abs(a.errorPx)<1&&a.canvasH>0);
   },null,{timeout:25000});
   const floorStart=await page.evaluate(()=>{
     const rig=document.getElementById('dev-rig');
     const ground=window.PaperWorldL2DGround.inspect();
     const data={height:document.getElementById('view').clientHeight,
       ground,mode:'real-L2D',
       originalDepths:{player:getComputedStyle(rig).getPropertyValue('--dev-depth-player').trim(),
         enemy:getComputedStyle(rig).getPropertyValue('--dev-depth-enemy').trim()}};
     for(const role of ['player','enemy']){
       const a=window.PaperchalkL2D.get(role);
       data[role]={canvas:a.canvas.getBoundingClientRect().toJSON(),
         imgHeight:a.img.offsetHeight,translate:getComputedStyle(a.root).translate,
         mode:a.root.dataset.l2dMode};
     }
     return data;
   });
   assert.equal(floorStart.ground.actors.length,2);
   for(const a of floorStart.ground.actors){
     assert.equal(a.detected,true,a.id+' must use actual opaque L2D footwear pixels');
     assert.ok(a.soleY>.5&&a.soleY<=1,
       a.id+' foot contact is not at the bottom of the rendered L2D: '+JSON.stringify(a));
     assert.ok(Math.abs(a.worldFootY-floorStart.ground.floorY)<1,
       a.id+' is floating or buried in the 3D ground: '+JSON.stringify(a));
   }
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-shoes-snapped.png'});
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-ground-y');
     slider.value='83';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>window.PaperWorldL2DGround.state()?.y===83);
   const moved=await page.evaluate(()=>{
     const ground=window.PaperWorldL2DGround.inspect();
     const out={ground};
     for(const role of ['player','enemy']){
       const a=window.PaperchalkL2D.get(role);
       out[role]={canvas:a.canvas.getBoundingClientRect().toJSON(),
         imgHeight:a.img.offsetHeight,translate:getComputedStyle(a.root).translate};
     }
     return out;
   });
   const deltaFloor=floorStart.height*.06;
   for(const role of ['player','enemy']){
     const before=floorStart[role],after=moved[role];
     const footBefore=floorStart.ground.actors.find(a=>a.id===role);
     const footAfter=moved.ground.actors.find(a=>a.id===role);
     assert.ok(Math.abs(footAfter.worldFootY-moved.ground.floorY)<1,
       role+' L2D shoes did not remain ON the moving floor: '+JSON.stringify({footBefore,footAfter}));
     assert.ok(Math.abs(footAfter.dy-footBefore.dy-deltaFloor)<.1,
       role+' root vertical translation did not match floor displacement');
     assert.equal(after.imgHeight,before.imgHeight,role+' changed rig dimensions');
     assert.ok(after.canvas.top-before.canvas.top>2,
       role+' visible L2D ArtMesh canvas did not move with the ground');
   }
   assert.equal(initial.state.enemy.y,y,'NPC authored Y was overwritten by floor snapping');
   assert.equal(initial.state.enemy.size,size,'Floor snap changed NPC stature');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-floor-updated.png'});
   await page.locator('#dev-layer').selectOption('ground');
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-z');
     slider.value='-165';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>window.PaperWorldL2DGround.state()?.z===-165);
   const deep=await page.evaluate(()=>{
     const state=window.PaperWorldL2DGround.inspect();
     const rig=document.getElementById('dev-rig');
     return {state,
       authoredZ:['player','enemy'].map(id=>getComputedStyle(rig).getPropertyValue('--dev-depth-'+id).trim()),
       markers:[...document.querySelectorAll('.dev-shoe-contact')].map(el=>({
         role:el.dataset.actor,hidden:el.hidden,top:el.style.top,left:el.style.left
       }))};
   });
   for(const role of ['player','enemy']){
     const a=moved.ground.actors.find(v=>v.id===role);
     const b=deep.state.actors.find(v=>v.id===role);
     assert.equal(b.dz,50,role+' L2D parent did not follow ground Z');
     assert.ok(Math.abs(b.errorPx)<1,role+' detached vertically while floor moved in Z');
     assert.ok(Math.abs(b.relativeZ-a.relativeZ)<.01,
       role+' lost its Z position on the floor: '+JSON.stringify({a,b}));
     const marker=deep.markers.find(v=>v.role===role);
     assert.ok(marker&&!marker.hidden,'Missing shoe contact marker for '+role);
     assert.ok(marker.left.startsWith('calc(')&&marker.top.endsWith('px'));
   }
   assert.deepEqual(deep.authoredZ,
     [floorStart.originalDepths.player,floorStart.originalDepths.enemy],
     'Ground motion overwrote manually placed actor depths');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-both-shoes-on-plane.png'});
   await page.evaluate(()=>{
     const depth=document.getElementById('dev-z');
     depth.value='-215';depth.dispatchEvent(new Event('input',{bubbles:true}));
     const height=document.getElementById('dev-ground-y');
     height.value='77';height.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>{
     const s=window.PaperWorldL2DGround.state();
     return s?.y===77&&s?.z===-215&&s.actors.every(a=>Math.abs(a.errorPx)<1);
   });
   // Physics test of the REAL rendered L2D mesh: in 3D DEV the CSS
   // perspective camera handles Z, so mesh normalization must stay stable
   // as the enemy walks toward/away from the camera.
   await page.locator('#dev-layer').selectOption('enemy');
   const baselineAuto=await page.evaluate(()=>window.PaperWorldL2DGround.inspect());
   assert.equal(baselineAuto.autoPerspective,true,'Distance perspective must be ON by default');
   assert.ok(baselineAuto.actors.every(a=>a.perspectiveScale>0&&a.visibleFraction>.5));
   const capture=async z=>{
     await page.evaluate(value=>{
       const slider=document.getElementById('dev-z');
       slider.value=String(value);
       slider.dispatchEvent(new Event('input',{bubbles:true}));
     },z);
     await page.waitForFunction(target=>{
       const ground=window.PaperWorldL2DGround.inspect();
       return ground.actors.find(a=>a.id==='enemy')?.effectiveZ===target;
     },z);
     return page.evaluate(()=>{
       const a=window.PaperchalkL2D.get('enemy');
       const g=window.PaperWorldL2DGround.inspect();
       const actor=g.actors.find(a=>a.id==='enemy');
       return {actor,canvas:a.canvas.getBoundingClientRect().toJSON(),
         imgSize:a.img.offsetHeight,meshScale:actor.perspectiveScale};
     });
   };
   const far=await capture(-350);
   const near=await capture(-60);
   assert.ok(near.canvas.height>far.canvas.height*1.1,
     'REAL animated L2D must become visibly bigger as Z approaches camera: '+
     JSON.stringify({far,near}));
   assert.equal(far.imgSize,near.imgSize,'3D camera distance must not change original 1024 L2D proportions');
   assert.ok(Math.abs(near.actor.errorPx)<1&&Math.abs(far.actor.errorPx)<1,
     'Automatic zoom separated an NPC shoe from the ground');
   assert.ok(Math.abs(near.actor.perspectiveScale-far.actor.perspectiveScale)<.01,
     'Camera Z applied twice: DEV should only normalize original L2D size');
   assert.ok(near.actor.perspectiveScale>1.3,
     'DEV world height must normalize the undersized original enemy layer');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-l2d-near-depth.png'});
   await capture(-190);
   await page.locator('#dev-auto-depth').uncheck();
   const manual=await page.evaluate(()=>window.PaperWorldL2DGround.inspect());
   assert.equal(manual.autoPerspective,false);
   assert.ok(manual.actors.every(a=>Math.abs(a.perspectiveScale-1)<.001),
     'Disabling auto must restore the hand-authored raw L2D size');
   await page.locator('#dev-auto-depth').check();
   const enabled=await page.evaluate(()=>window.PaperWorldL2DGround.inspect());
   assert.equal(enabled.autoPerspective,true);
   const soleBefore=await page.evaluate(()=>window.PaperWorldL2DGround.inspect());
   await page.locator('#dev-ground-calibrate').click({timeout:15000});
   const calibrated=await page.evaluate(()=>({
     state:window.PaperWorldGroundPerspective.current(),
     ground:window.PaperWorldL2DGround.inspect(),
     stored:localStorage.getItem('paperchalk-layer-editor-v2')
   }));
   assert.equal(calibrated.state.autoDepth,true,'Recalibration must retain the ONE automatic camera');
   assert.equal(calibrated.state.locked,false,'The deprecated second scale solver was re-enabled');
   assert.equal(calibrated.state.enemy.x,x,'Ground calibration moved authored X');
   assert.equal(calibrated.state.enemy.y,y,'Ground calibration moved authored Y');
   assert.equal(calibrated.state.enemy.size,size,'Ground calibration rewrote the original artwork size');
   assert.ok(calibrated.stored?.includes('"modelVersion":3'),
     'Single-camera migration was not saved');
   for(const role of ['player','enemy']){
     const before=soleBefore.actors.find(a=>a.id===role);
     const after=calibrated.ground.actors.find(a=>a.id===role);
     assert.ok(Math.abs(after.worldFootY-before.worldFootY)<1,
       role+' floor foot moved during non-destructive calibration');
     assert.ok(Math.abs(after.errorPx)<1,'L2D shoe lost ground while calibrating');
   }
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-single-camera-calibrated.png'});
   // The authored image Y is a local paint offset; while automatic grounding
   // is on, shoe/ground stay fixed. Only moving WORLD Z changes perspective.
   const oldHeight=calibrated.state.enemy.size;
   const oldFoot=calibrated.ground.actors.find(a=>a.id==='enemy').worldFootY;
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-y');
     slider.value='26';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const shifted=await page.evaluate(()=>({
     state:window.PaperWorldGroundPerspective.current(),
     ground:window.PaperWorldL2DGround.inspect()
   }));
   assert.equal(shifted.state.enemy.y,26);
   assert.equal(shifted.state.enemy.size,oldHeight,
     'A foot-y correction silently rewrote the original L2D resolution');
   assert.ok(Math.abs(shifted.ground.actors.find(a=>a.id==='enemy').worldFootY-oldFoot)<1,
     'Changing a local sprite anchor detached the NPC from one common floor');
   assert.equal(shifted.state.enemy.x,x,'Ground constraint changed horizontal placement');
   assert.equal(shifted.state.autoDepth,true,'Single camera was turned off by editing shoe anchor');
   // Restore the intended modern auto-Z mode before exiting DEV: the
   // legacy one-off screen-Y calibrator explicitly disables automatic mode.
   await page.locator('#dev-auto-depth').check();
   await page.locator('#dev-exit').click();
   // DEV->game restores scene transforms and recenters the viewport; let
   // that full-stage camera motion settle before comparing local shoe pins.
   await page.waitForTimeout(600);
   const normal=await page.evaluate(()=>{
     const g=window.PaperWorldL2DGround.inspect();
     const actors=Object.fromEntries(g.actors.map(a=>[a.id,a]));
     const player=window.PaperchalkL2D.get('player');
     const enemy=window.PaperchalkL2D.get('enemy');
     return {dev:g.dev,actors,perf:window.PaperWorldL2DGround.performance(),
       player:{scale:actors.player.perspectiveScale,
         origin:getComputedStyle(player.canvas).transformOrigin,
         buffer:player.canvas.width,height:player.img.offsetHeight},
       enemy:{scale:actors.enemy.perspectiveScale,
         origin:getComputedStyle(enemy.canvas).transformOrigin,
         buffer:enemy.canvas.width,height:enemy.img.offsetHeight,
         renderer:enemy.canvas.getContext('2d').getContextAttributes?.().willReadFrequently}};
   });
   assert.equal(normal.dev,false);
   const actualRatio=(normal.enemy.height*normal.actors.enemy.visibleFraction*
      normal.enemy.scale)/
     (normal.player.height*normal.actors.player.visibleFraction*
      normal.player.scale);
   const predictedRatio=(normal.actors.enemy.physicalCm/
      normal.actors.player.physicalCm)*
     normal.actors.enemy.depthScale;
   assert.ok(Math.abs(normal.player.scale-1)<.002,
     'Heroine must remain the exact original visual-size reference');
   assert.ok(Math.abs(actualRatio-predictedRatio)<.02,
     'Enemy normal-game apparent height must match 155/162 stature and Z distance: '+
     JSON.stringify({actualRatio,predictedRatio,normal}));
   assert.ok(predictedRatio>.6&&predictedRatio<.8,
     'Second heroine cannot be reduced to toy-like 40% size');
   assert.ok(Math.abs(normal.actors.enemy.worldFootY-
      normal.actors.enemy.expectedFootY)<1,
     'Second heroine is floating above projected common floor');
   assert.equal(normal.perf.sourceReadbacks,0);
   assert.equal(normal.perf.globalSubtreeObservers,0);
   assert.equal(normal.enemy.renderer,false,
     'The active animated canvas was forced into slow CPU readback mode: '+JSON.stringify(normal));
   assert.ok(normal.perf.readbackPixels<=192*192*6,
     'Sole detection read too many pixels: '+JSON.stringify(normal.perf));
   // Animated part texture quality is tested in *actual* 2D mode, not just
   // the editor's independent CSS 3D perspective.
   const actorAt=async z=>page.evaluate(value=>{
     const rig=document.getElementById('dev-rig');
     rig.style.setProperty('--dev-depth-enemy',value+'px');
     const g=window.PaperWorldL2DGround.sync();
     const enemy=window.PaperchalkL2D.get('enemy');
     const actor=g.actors.find(v=>v.id==='enemy');
     const rect=enemy.canvas.getBoundingClientRect();
     // In nested CSS 3D perspective, bounding-box interpolation is NOT a
     // coordinate transform. Verify the actual CSS matrix maps the local
     // shoe point back onto itself; the parent camera can rotate freely.
     const sourceHeel=new DOMPoint(
       enemy.img.offsetWidth*actor.soleX,
       enemy.img.offsetHeight*actor.soleY
     );
     const projectedHeel=sourceHeel.matrixTransform(
       new DOMMatrix(getComputedStyle(enemy.canvas).transform));
     return {heelErrorX:projectedHeel.x-sourceHeel.x,
       heelErrorY:projectedHeel.y-sourceHeel.y,
       footY:actor.worldFootY,targetFootY:actor.expectedFootY,
       visibleTarget:actor.targetVisiblePx,horizonY:actor.horizonY,
       sourceHeelX:sourceHeel.x,sourceHeelY:sourceHeel.y,
       size:enemy.img.offsetHeight,buffer:enemy.canvas.width,
       scale:actor.perspectiveScale,
       transform:getComputedStyle(enemy.canvas).transform,
       canvasHeight:rect.height,
       shoeScreenY:rect.top+rect.height*actor.soleY,
       soleY:actor.soleY,
       origin:getComputedStyle(enemy.canvas).transformOrigin,
       sourceOrigin:enemy.canvas.style.transformOrigin,
       rootTranslation:getComputedStyle(enemy.root).translate,
       rootTop:enemy.root.getBoundingClientRect().top,
       rootHeight:enemy.root.offsetHeight,
       sourceOffsetTop:enemy.img.offsetTop,
       sourceBottom:enemy.img.style.bottom,
       canvasOffsetTop:enemy.canvas.offsetTop,
       canvasTopStyle:enemy.canvas.style.top,
       shoeLocalY:rect.top+rect.height*actor.soleY-enemy.root.getBoundingClientRect().top,
       rootTransform:getComputedStyle(enemy.root).transform,
       imgRect:enemy.img.getBoundingClientRect().toJSON(),
       canvasRect:rect.toJSON()};
   },z);
   const distant=await actorAt(-350);
   const close=await actorAt(-60);
   assert.ok(close.scale>distant.scale*1.1&&close.scale<3.3,
     'One pinhole camera should resize the actual 1024 L2D smoothly: '+
     JSON.stringify({distant,close}));
   assert.equal(close.size,distant.size,'Camera depth changed the original image geometry');
   assert.equal(close.buffer,distant.buffer,'Zoom should not continuously reallocate rendering buffers');
   for(const sample of [distant,close]){
     assert.ok(Math.abs(sample.heelErrorY)<.1&&Math.abs(sample.heelErrorX)<.1,
       'The actual CSS zoom matrix no longer fixes the L2D shoe coordinate: '+
       JSON.stringify({distant,close}));
   }
   assert.ok(Math.abs(close.sourceHeelY-distant.sourceHeelY)<.1,
     'The shoe source geometry changed while only camera Z was adjusted');
   assert.ok(distant.footY<close.footY&&
      Math.abs(distant.footY-distant.targetFootY)<1&&
      Math.abs(close.footY-close.targetFootY)<1,
     'Moving enemy Z must move shoes along the SAME projected ground toward/away from horizon: '+
     JSON.stringify({distant,close}));
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-sharp-normal-distance.png'});
   await actorAt(-190);
   const perfBefore=await page.evaluate(()=>window.PaperWorldL2DGround.performance());
   await page.waitForTimeout(550);
   const perfAfter=await page.evaluate(()=>window.PaperWorldL2DGround.performance());
   assert.ok(perfAfter.probeCount-perfBefore.probeCount<=1,
     'Sole scanner is still sampling the live L2D canvas every animation frame: '+
     JSON.stringify({perfBefore,perfAfter}));
   console.log('PASS '+cfg.name+' sharp-L2D scale, GPU canvas, sparse sole detection, Z distance and stationary shoe');
   assert.deepEqual(errs,[],errs.join('; '));
   console.log('PASS '+cfg.name+': both genuine L2D sole pixels touch the same floor Y, move with Y/Z, keep authored transforms');
   await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}

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
   console.log('PASS '+cfg.name+': both genuine L2D sole pixels touch the same floor Y, move with Y/Z, keep authored transforms');
   await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}

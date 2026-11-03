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
     !!document.getElementById('dev-ground-perspective')?.textContent,{timeout:15000});
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
   const floorStart=await page.evaluate(()=>{
     const root=document.getElementById('view');
     const enemy=document.getElementById('actor-enemy');
     const player=document.getElementById('actor-player');
     const rig=document.getElementById('dev-rig');
     return {
       h:root.clientHeight,playerTop:player.offsetTop,enemyTop:enemy.offsetTop,
       playerZ:getComputedStyle(rig).getPropertyValue('--dev-depth-player').trim(),
       enemyZ:getComputedStyle(rig).getPropertyValue('--dev-depth-enemy').trim(),
       floorZ:getComputedStyle(rig).getPropertyValue('--dev-depth-ground').trim()
     };
   });
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-ground-y');
     slider.value='83';slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const floorYMoved=await page.evaluate(()=>{
     const enemy=document.getElementById('actor-enemy');
     const player=document.getElementById('actor-player');
     return {playerTop:player.offsetTop,enemyTop:enemy.offsetTop,
       state:window.PaperWorldGroundPerspective.current(),
       playerBottom:player.style.bottom,enemyBottom:enemy.style.bottom};
   });
   const expectedShift=floorStart.h*.06;
   assert.ok(Math.abs(floorYMoved.playerTop-floorStart.playerTop-expectedShift)<2,
     'Player did not follow moved floor Y: '+JSON.stringify({floorStart,floorYMoved,expectedShift}));
   assert.ok(Math.abs(floorYMoved.enemyTop-floorStart.enemyTop-expectedShift)<2,
     'NPC did not follow moved floor Y: '+JSON.stringify({floorStart,floorYMoved,expectedShift}));
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
   assert.equal(floorZMoved.player,Number(floorStart.playerZ.replace('px',''))+50,
     'Player 3D depth failed to follow floor: '+JSON.stringify(floorZMoved));
   assert.equal(floorZMoved.enemy,Number(floorStart.enemyZ.replace('px',''))+50,
     'NPC 3D depth failed to follow floor: '+JSON.stringify(floorZMoved));
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
   console.log('PASS '+cfg.name+': physical stature, common-floor perspective, opt-in calibration, saved coordinates');
   await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}

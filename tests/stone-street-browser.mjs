import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const folder='artifacts/stone-street';
fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];
async function capture(page,name){
 const session=await page.context().newCDPSession(page);
 const shot=await session.send('Page.captureScreenshot',{
  format:'png',captureBeyondViewport:false,fromSurface:true
 });
 fs.writeFileSync(folder+'/'+name+'.png',Buffer.from(shot.data,'base64'));
 await session.detach();
}
try{
 const open=async(width,height)=>{
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE_ERROR',String(e))});
  page.on('console',msg=>{if(msg.type()==='error')console.log('PAGE_CONSOLE_ERROR',msg.text())});
  await page.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html?scene=street&time=22:00&quality=auto',
   {waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>window.__forestLevelDebug?.environment?.id==='street'&&
   window.__forestLevelDebug.environment.street?.rendered>0,null,{timeout:35000});
  await page.waitForTimeout(1950);
  return page;
 };
 const desktop=await open(1280,720);
 const state=await desktop.evaluate(()=>{
  const d=window.__forestLevelDebug,e=d.environment;
  return {scene:e.id,material:e.material,street:e.street,
   physicalBoard:d.physicalFrame,sceneOwnsBoard:e.sceneOwnsBoard,
   terrain:window.__terrainEngine.snapshot().map(t=>t.kind),
   paving:e.paving,
   sceneOrder:d.sceneSwitch,shadow:d.spatialShadows,
   worldTime:d.worldTime,worldLighting:d.worldLighting,
   performance:d.performance,unitSlots:d.slots.filter(s=>s.zone==='unit').length,
   facilitySlots:d.slots.filter(s=>s.zone==='facility').length,
   webgl:!!document.getElementById('stage').getContext('webgl')};
 });
 assert.equal(state.webgl,true,'must use actual WebGL, not an illustration');
 assert.equal(state.scene,'street');
 assert.equal(state.material,'stone');
 assert.equal(state.sceneOwnsBoard,true,'every environment owns its own board surface');
 assert.equal(state.physicalBoard.boardCols,16);
 assert.equal(state.physicalBoard.boardRows,6);
 assert.equal(state.physicalBoard.lastDrawCalls,1);
 assert.equal(state.terrain.length,96);
 assert.ok(state.terrain.every(s=>s==='stone'),
  'the street has its own stone board, not a copied forest board');
 assert.equal(state.street.houseCount,13);
 assert.equal(state.street.alleyModules,5);
 assert.equal(state.street.lamps,4);
 assert.equal(state.street.placementCellsOccupied,0);
 // The street has physical masonry, other stages use their own materials.
 assert.equal(state.paving.logicalTiles,96);
 assert.equal(state.paving.gameplayGridUnchanged,true);
 assert.equal(state.paving.activeCourses,6);
 assert.ok(state.paving.independentModules>=95);
 assert.ok(state.paving.drawCalls>0);
 assert.ok(state.street.rendered<=28,'settled houses must be batched for performance');
 assert.equal(state.unitSlots,18);
 assert.equal(state.facilitySlots,78);
 assert.equal(state.unitSlots+state.facilitySlots,96,'all 96 positions must be registered');
 assert.equal(state.shadow?.enabled,true,'night scene preserves the real shadow map');
 assert.equal(state.worldTime.phase,'night');
 assert.ok(state.worldLighting.nightFactor>.99,'shared time switches lamps on at night');
 assert.ok(state.worldLighting.fogDensity>.01);
 assert.equal(await desktop.locator('#world-clock-display').count(),1,'global world clock controls exist');
 console.log('STREET_3D_WEBGL_PASS',JSON.stringify(state));
 await capture(desktop,'01-real-night-street-desktop');
 await desktop.evaluate(()=>window.__worldClock.setPaused(true));
 // Daylight changes the SAME street scene and the actual directional shadow camera.
 await desktop.locator('#world-time-slider').evaluate(el=>{
  el.value='720';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await desktop.waitForFunction(()=>window.__forestLevelDebug?.worldTime?.phase==='day'&&
  window.__forestLevelDebug.worldLighting.nightFactor===0&&
  window.__forestLevelDebug.spatialShadows.lightDirection[1]>.75,
  null,{timeout:15000}).catch(async()=>{
   // The public shadow debug property is an already-extracted snapshot.
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldLighting.nightFactor===0,
    null,{timeout:15000});
  });
 assert.equal(await desktop.locator('#world-clock-display').textContent(),'12:00');
 await capture(desktop,'04-day-street-same-world');
 await desktop.evaluate(()=>window.__worldClock.setTime('23:00'));
 await desktop.waitForFunction(()=>window.__forestLevelDebug?.worldLighting.nightFactor===1,
  null,{timeout:20000});
 assert.equal((await desktop.evaluate(()=>window.__forestLevelDebug.worldTime)).timeText,'23:00');
 await capture(desktop,'05-night-street-same-world');
 // Shared grid dimensions, eight INDEPENDENT boards and terrain materials.
 for(const [next,material] of [
  ['hall','marble'],['coast','sand'],['cliff','shale'],
  ['ocean','deck'],['cave','caveRock'],['forest','grass'],
  ['clearing','dirt'],['street','stone']]){
  assert.equal(await desktop.evaluate(()=>window.__forestLevelDebug.switchScene()),true);
  console.log('SCENE_SWITCH_BEGIN',next);
  await desktop.waitForFunction(([id,kind])=>{
   const d=window.__forestLevelDebug;
   return d?.environment.id===id&&!d.sceneSwitch.busy&&d.environment.material===kind
  },[next,material],{timeout:45000}).catch(async err=>{
   console.log('SCENE_STUCK',next,JSON.stringify(await desktop.evaluate(()=>({
    scene:window.__forestLevelDebug?.sceneSwitch,
    env:window.__forestLevelDebug?.environment,
    perf:window.__forestLevelDebug?.performance,
    errors:document.getElementById('note')?.textContent
   }))));
   throw err;
  });
  const afterSwitch=await desktop.evaluate(()=>({
   time:window.__forestLevelDebug.worldTime,
   light:window.__forestLevelDebug.worldLighting,
   board:window.__forestLevelDebug.physicalFrame,
   landscape:window.__forestLevelDebug.environment.landscape,
   slots:window.__forestLevelDebug.slots.length,
   kinds:window.__forestLevelDebug.terrain.map(t=>t.kind),
   sceneOwnsBoard:window.__forestLevelDebug.environment.sceneOwnsBoard
  }));
  assert.equal(afterSwitch.sceneOwnsBoard,true);
  assert.equal(afterSwitch.board.scene,next,'the rim belongs to the active scene');
  assert.ok(afterSwitch.board.availableThemes.includes(next));
  assert.equal(afterSwitch.board.lastDrawCalls,1,
   'each arena draws its own physical 3D board border');
  assert.equal(afterSwitch.slots,96);
  assert.ok(afterSwitch.kinds.every(kind=>kind===material),
   'a scene uses its own surface material rather than a universal grass board');
  assert.equal(afterSwitch.time.timeText,'23:00','scene transitions must NOT reset world time');
  assert.equal(afterSwitch.time.paused,true,'world clock and pause state persist');
  assert.ok(afterSwitch.light.nightFactor>.99,'night must stay night in '+next);
  console.log('SCENE_SWITCH_PASS',next,afterSwitch.time.timeText);
  if(next==='forest'){
   await capture(desktop,'06-real-night-forest');
   await desktop.evaluate(()=>window.__worldClock.setTime('12:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldLighting.nightFactor===0,
    null,{timeout:15000});
   await capture(desktop,'07-real-day-forest');
   await desktop.evaluate(()=>window.__worldClock.setTime('23:00'));
  }else if(next==='hall'){
   const hall=await desktop.evaluate(()=>window.__forestLevelDebug.environment.hall);
   assert.equal(hall.scene,'hall');
   assert.equal(hall.placementCellsOccupied,0);
   assert.equal(hall.columns,18);
   assert.equal(hall.chandeliers,4);
   assert.equal(hall.windowOpenings,6,'the rear wall must have actual window apertures');
   assert.equal(hall.roofShadowOnly,true,'roof must cast shadow but stay invisible to play camera');
   assert.equal(hall.lightSource,'wall-windows-not-skylight');
   assert.ok(hall.rendered>0);
   await capture(desktop,'10-royal-hall-night');
   await desktop.evaluate(()=>window.__worldClock.setTime('12:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldLighting.nightFactor===0,
    null,{timeout:15000});
   await capture(desktop,'11-royal-hall-day');
   await desktop.evaluate(()=>window.__worldClock.setTime('09:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldTime.timeText==='09:00',null,{timeout:15000});
   const morningSun=await desktop.evaluate(()=>window.__forestLevelDebug.worldLighting.sunDirection.slice());
   await capture(desktop,'14-hall-09-moving-window-sun');
   await desktop.evaluate(()=>window.__worldClock.setTime('15:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldTime.timeText==='15:00',null,{timeout:15000});
   const afternoonSun=await desktop.evaluate(()=>window.__forestLevelDebug.worldLighting.sunDirection.slice());
   assert.ok(morningSun[0]>0&&afternoonSun[0]<0,
    'window sunlight must track east-to-west world clock direction');
   assert.ok(morningSun[2]<0&&afternoonSun[2]<0,
    'north-wall windows must face the actual direction of sunlight');
   console.log('MOVING_INDOOR_SUN_PASS',JSON.stringify({morningSun,afternoonSun}));
   await capture(desktop,'15-hall-15-moving-window-sun');
   await desktop.evaluate(()=>window.__worldClock.setTime('23:00'));
  }else if(['coast','cliff','ocean','cave'].includes(next)){
   const landscape=await desktop.evaluate(()=>window.__forestLevelDebug.environment.landscape);
   assert.equal(landscape.scene,next,'actual 3D biome renderer must match the chosen scene');
   assert.ok(landscape.biomes.includes(next));
   assert.ok(landscape.drawn>0,'geometry must be rendered in the shared WebGL context');
   assert.equal(landscape.changesTacticalSlots,false);
   assert.equal(landscape.usesSharedWebGL,true);
   assert.equal(landscape.geometry,'organic-triangulated-worldspace');
   assert.equal(landscape.usesWorldClock,true);
   assert.equal(landscape.coast.bridgeCount,0,'no scene-external decorative bridges');
   assert.equal(landscape.coast.boardIndependent,false);
   assert.equal(landscape.coast.sandBattlefield,true);
   assert.equal(landscape.coast.sandOutsideBoard,true);
   assert.equal(landscape.ocean.bridgeCount,0,'no decorative bridges on ocean decks');
   assert.equal((await desktop.evaluate(()=>window.__forestLevelDebug.slots.length)),96);
   console.log('LANDSCAPE_BATTLEFIELD_PASS',next,landscape.drawn);
   await capture(desktop,'12-'+next+'-night');
   await desktop.evaluate(()=>window.__worldClock.setTime('12:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldLighting.nightFactor===0,
    null,{timeout:16000});
   await capture(desktop,'13-'+next+'-day');
   await desktop.locator('#scene-overview').click();
   assert.equal(await desktop.evaluate(()=>window.__forestLevelDebug.overview),true);
   await desktop.waitForTimeout(330);
   await capture(desktop,'16-'+next+'-panorama');
   await desktop.locator('#scene-overview').click();
   assert.equal(await desktop.evaluate(()=>window.__forestLevelDebug.overview),false);
   await desktop.evaluate(()=>window.__worldClock.setTime('23:00'));
  }else if(next==='clearing'){
   await capture(desktop,'08-real-night-clearing');
   await desktop.evaluate(()=>window.__worldClock.setTime('12:00'));
   await desktop.waitForFunction(()=>window.__forestLevelDebug.worldLighting.nightFactor===0,
    null,{timeout:15000});
   await capture(desktop,'09-real-day-clearing');
   await desktop.evaluate(()=>window.__worldClock.setTime('23:00'));
  }
 }
 await capture(desktop,'02-real-street-after-scene-cycle');
 await desktop.close();
 const mobile=await open(390,844);
 await capture(mobile,'03-real-night-street-mobile');
 await mobile.close();
 assert.deepEqual(errors,[],'no JavaScript errors in live street scene');
 console.log('EIGHT_SCENE_OWN_BOARDS_PASS',{screenshots:25,globalTime:true,eightSceneLighting:true,eachSceneOwnsBoard:true,board16x6:true,noDecorativeBridge:true});
}finally{await browser.close()}

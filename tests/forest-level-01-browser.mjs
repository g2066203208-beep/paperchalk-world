import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder='artifacts/forest-level-01';fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];
async function screenshot(page,name){await page.screenshot({path:folder+'/'+name+'.png',fullPage:true});}
async function clickCard(page,id){
 const at=await page.evaluate(id=>window.__sceneCardHUD.pointFor(id),id);
 assert.ok(at&&Number.isFinite(at.x)&&Number.isFinite(at.y),'missing target '+id);
 await page.mouse.click(at.x,at.y);return at;
}
async function verifyBox(page,kind){
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.geometry==='single-static-seven-bay-whitebox'&&
 window.__sceneCardHUD.snapshot.visible.filter(p=>p.kind==='deck').length===7,{timeout:20000});
 const b=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
 assert.equal(b.compartments,7);
 assert.equal(b.physicalBoxes,1);
 assert.equal(b.roundedCase,true,'single rounded-corner 3D shell');
 assert.equal(b.beveledRim,true,'3D rounded hollow rim');
 assert.equal(b.fittedCardStacks,true,'seven tight, rounded, thick white stacks');
 assert.ok(b.bounds.roundedCornerRadius>b.bounds.h*.14,'rounding must be substantial');
 assert.ok(b.bounds.slotGap/b.bounds.pitch<.11,'card piles must nearly fill each slot');
 assert.ok(b.bounds.horizontalClearance>.015&&b.bounds.verticalClearance>.015);
 assert.ok(b.bounds.cardWidth/b.bounds.pitch>.87,'no tiny cards surrounded by void');
 assert.equal(b.visibleDeckPiles,7);
 assert.equal(b.hasLid,false);
 assert.equal(b.hasHinge,false);
 assert.equal(b.flipAnimationEnabled,false);
 assert.equal(b.reversibleLid,false);
 assert.ok(b.bounds.safeHorizontalMargin>.05,'box must stay within left/right safe margin');
 assert.ok(b.bounds.safeBottomMargin>.05&&b.bounds.safeBottomMargin<.35);
 assert.ok(b.bounds.horizontalClearance>Math.min(.02,b.bounds.h*.014),'card touching divider horizontally');
 assert.ok(b.bounds.verticalClearance>.02,'card touching top/bottom rail');
 const slots=b.visible.filter(p=>p.kind==='deck');
 assert.equal(slots.length,7);
 for(let i=0;i<7;i++){
  assert.equal(slots[i].y,slots[0].y,'seven bays share baseline');
  assert.ok(i===0||slots[i].x>slots[i-1].x,'seven ordered bays');
  if(i)assert.ok(Math.abs(slots[i].x-slots[i-1].x-b.bounds.pitch)<.00001);
 }
 assert.ok(b.bounds.y>=-6);
 assert.ok(b.bounds.cardHeight<b.bounds.h);
 assert.ok(b.bounds.cardWidth<b.bounds.pitch-b.bounds.divider);
 console.log('STATIC_BOX_GEOMETRY_PASS',JSON.stringify({kind,bounds:b.bounds,cardPiles:b.physicalDeckCards}));
 return b;
}
async function verifyTrayCollapsed(page,kind){
 await page.waitForFunction(()=>window.__sceneCardHUD?.collapsed===true&&
  window.__sceneCardHUD.snapshot.visible.length===0,{timeout:15000});
 const hud=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
 assert.equal(hud.collapsed,true);
 assert.equal(hud.visibleDeckPiles,0,'folded tray has no visible 3D card pile');
 assert.equal(hud.drawCalls,0,'folded tray has no 3D render calls');
 assert.equal(await page.locator('#deck-drawer-toggle').getAttribute('aria-expanded'),'false');
 console.log('SEVEN_TRAY_COLLAPSED_PASS',JSON.stringify({kind,cardMeshes:hud.renderedCardMeshes,physicalDeckCards:hud.physicalDeckCards}));
}
async function showTray(page){
 await page.locator('#deck-drawer-toggle').click();
 await page.waitForFunction(()=>window.__sceneCardHUD?.collapsed===false&&
  window.__sceneCardHUD.snapshot.visibleDeckPiles===7&&
  window.__sceneCardHUD.snapshot.visible.filter(p=>p.kind==='deck').length===7,{timeout:20000});
 assert.equal(await page.locator('#deck-drawer-toggle').getAttribute('aria-expanded'),'true');
}
async function hideTray(page){
 await page.locator('#deck-drawer-toggle').click();
 await verifyTrayCollapsed(page,'toggled-hidden');
}
async function verifyWorld(page,kind){
 await page.waitForFunction(()=>window.__terrainDebug?.tiles?.length===96&&window.__forestLevelDebug?.slots?.length===66,{timeout:35000});
 const status=await page.evaluate(()=>({
  tiles:window.__terrainDebug.tiles,
  slots:window.__forestLevelDebug.slots,
  level:window.__forestLevelDebug.state,
  camera:window.__battleCamera.snapshot()
 }));
 assert.equal(status.tiles.length,96);
 assert.equal(status.slots.filter(s=>s.zone==='unit').length,18);
 assert.equal(status.slots.filter(s=>s.zone==='facility').length,48);
 assert.deepEqual([...new Set(status.slots.filter(s=>s.zone==='unit').map(s=>s.tileC))],[6,7,8]);
 assert.deepEqual([...new Set(status.slots.filter(s=>s.zone==='facility').map(s=>s.tileC))],[1,2,3,4,10,11,12,13]);
 assert.equal(status.level.columns,3);
 assert.ok(status.camera.maxDistance>=100,'outer 16-column area must be zoomable');
 console.log('FOREST_16X6_96_VOXELS_PASS',JSON.stringify({kind,voxels:status.tiles.length,unitSlots:18,facilitySlots:48}));
}
async function verifyFixedCamera(page,kind){
 const before=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.equal(before.fixed,true,'first-step battle camera must be fixed');
 assert.ok(Math.abs(before.yaw)<1e-5,'no sideways orbit');
 assert.ok(Math.abs(before.elevation-78*Math.PI/180)<.001,'near-top-down angle');
 assert.ok(before.distance>=46,'board not cropped by near camera');
 assert.deepEqual(before.target.slice(0,1),[0]);
 const frame=await page.evaluate(()=>{
  const shots=[];
  for(let r=0;r<6;r++)for(let c=0;c<16;c++){
   const p=window.__terrainDebug.projectTile(c,r);
   const rect=document.getElementById('stage').getBoundingClientRect();
   shots.push({x:p.x/document.getElementById('stage').width*rect.width,
    y:p.y/document.getElementById('stage').height*rect.height});
  }
  const xs=shots.map(q=>q.x),ys=shots.map(q=>q.y);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),
   minY:Math.min(...ys),maxY:Math.max(...ys),
   width:document.getElementById('stage').getBoundingClientRect().width,
   height:document.getElementById('stage').getBoundingClientRect().height};
 });
 assert.ok(frame.minX>=0&&frame.maxX<=frame.width,'full 16-column board must fit horizontally');
 assert.ok(frame.minY>=0&&frame.maxY<=frame.height,'all six rows must fit vertically');
 assert.ok((frame.maxX-frame.minX)/frame.width>.80,'board must fill the width instead of a tiny center patch');
 if(kind==='desktop')assert.ok((frame.maxY-frame.minY)/frame.height>.40,
   'fixed high angle should use more of the desktop height');
 await page.evaluate(()=>{
  const c=window.__battleCamera;
  c.rotate(700,400);c.pan(-900,300);c.zoom(.25);c.reset();
 });
 await page.waitForTimeout(150);
 const after=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.deepEqual(after.eye,before.eye,'no zoom, pan, orbit or recenter movement');
 assert.deepEqual(after.target,before.target,'camera target remains fixed');
 assert.equal(after.distance,before.distance);
 console.log('FOREST_FIXED_CAMERA_PASS',JSON.stringify({kind,eye:after.eye,elevation:after.elevation,
  distance:after.distance,viewport:after.viewport,frame}));
}
async function plantTestFarm(page,flank='left'){
 const button=page.locator('#farm-test');
 await page.waitForFunction(()=>document.querySelector('[data-card-id="farm-field"] img')?.naturalWidth===704,{timeout:20000});
 assert.equal(await button.isVisible(),true,'farm test entry must remain accessible without exposing legacy HTML card toolbar');
 assert.equal(await button.isEnabled(),true,'farm test unlocks after hero deployment');
 await button.click();
 await page.waitForFunction(()=>window.__terrainDebug.tool==='farm-field',{timeout:8000});
 const target=await page.evaluate(flank=>window.__forestLevelDebug.slotPoints.find(s=>
  s.zone==='facility'&&s.side==='ally'&&s.flank===flank&&s.tileR===4&&(flank==='left'?s.tileC===4:s.tileC===10)),flank);
 assert.ok(target?.point,'missing '+flank+' 1x1 facility slot');
 const before=await page.evaluate(()=>window.__forestLevelDebug.facilities.length);
 await page.mouse.click(target.point.x,target.point.y);
 await page.waitForFunction(n=>window.__forestLevelDebug.facilities.length===n+1,before,{timeout:15000});
 const placed=await page.evaluate(()=>window.__forestLevelDebug.facilities);
 assert.equal(placed.length,1);
 assert.equal(placed[0].id,'farm-field');
 assert.equal(placed[0].flank,flank);
 assert.deepEqual(placed[0].footprint,[1,1]);
 assert.equal(placed[0].hasTexture,true,'real user artwork must be bound to physical 3D card');
 assert.equal(placed[0].tileC,flank==='left'?4:10);
 assert.equal(placed[0].tileR,4);
 assert.equal(await page.evaluate(()=>window.__terrainDebug.tool),null,'test card consumed after placement');
 assert.equal(await button.isDisabled(),true,'same physical farm facility cannot be placed twice');
 console.log('FARM_FIELD_FACILITY_PLACED',JSON.stringify({flank,placed,assetWidth:704}));
}
async function deploy(page){
 await clickCard(page,'character:woodcutter');
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.placement.selected),'woodcutter');
 const slot=await page.evaluate(()=>window.__forestLevelDebug.slotPoints.find(p=>p.side==='ally'&&p.r===0&&p.c===1));
 assert.ok(slot?.point);
 await page.mouse.click(slot.point.x,slot.point.y);
 await page.waitForFunction(()=>window.__forestLevelDebug.state.phase==='active'&&window.__sceneCardHUD.snapshot.stagedCharacterCards===0,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
}
try{
 const pc=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 pc.on('pageerror',e=>errors.push('PC '+String(e)));
 await pc.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await verifyWorld(pc,'desktop');
 await verifyTrayCollapsed(pc,'desktop-default');
 await pc.waitForTimeout(400);
 await screenshot(pc,'00-board-clear-no-deck-desktop');
 await showTray(pc);
 await verifyBox(pc,'desktop');
 await verifyFixedCamera(pc,'desktop');
 await pc.waitForTimeout(500);
 await screenshot(pc,'01-static-seven-bay-box-desktop');
 // The fixed camera shows both 16x6 flanks AT ONCE; no pan screenshots.
 await pc.waitForTimeout(500);
 await deploy(pc);
 await screenshot(pc,'02-deployed-in-static-box-desktop');
 await plantTestFarm(pc,'left');
 await pc.waitForTimeout(700);
 await screenshot(pc,'02a-farmland-installed-left-facility-desktop');
 await hideTray(pc);
 await pc.waitForTimeout(300);
 await screenshot(pc,'02b-farmland-board-clear-no-deck-desktop');
 await showTray(pc);
 await clickCard(pc,'deck:warrior');
 await pc.waitForFunction(()=>window.__forestHand.snapshot.count===1,{timeout:10000});
 await screenshot(pc,'03-static-hand-drawn-desktop');
 const hand=await pc.evaluate(()=>window.__forestHand.snapshot.hand[0].instance);
 await clickCard(pc,'hand:'+hand);
 assert.equal(await pc.evaluate(()=>window.__forestHand.selected),hand);
 assert.equal(await pc.evaluate(()=>window.__forestLevelDebug.attack('forest-foe-a')),true);
 assert.equal(await pc.evaluate(()=>window.__forestHand.snapshot.count),0);
 await pc.locator('#scene-switch').click();
 await pc.waitForFunction(()=>window.__forestLevelDebug.environment.id==='clearing'&&
   window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:15000});
 await verifyWorld(pc,'clearing');
 await verifyBox(pc,'clearing');
 await screenshot(pc,'04-static-box-scene-switch-desktop');
 await pc.locator('#scene-switch').click();
 await pc.waitForFunction(()=>window.__forestLevelDebug.environment.id==='forest'&&
   window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:15000});
 await pc.evaluate(()=>window.__forestLevelDebug.reset());
 await verifyBox(pc,'restart');
 await hideTray(pc);
 await screenshot(pc,'04a-restarted-board-with-deck-hidden');
 assert.equal(await pc.evaluate(()=>window.__forestLevelDebug.facilities.length),0,'restart clears facility placements');
 assert.equal(await pc.evaluate(()=>window.__forestLevelDebug.state.phase),'deployment');
 const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 phone.on('pageerror',e=>errors.push('PHONE '+String(e)));
 await phone.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await verifyWorld(phone,'phone');
 await verifyTrayCollapsed(phone,'phone-default');
 await screenshot(phone,'05a-board-clear-no-deck-phone');
 await showTray(phone);
 await verifyBox(phone,'phone');
 await verifyFixedCamera(phone,'phone');
 await phone.waitForTimeout(250);
 await screenshot(phone,'05-static-seven-bay-box-phone');
 await deploy(phone);
 await clickCard(phone,'deck:warrior');
 await phone.waitForFunction(()=>window.__forestHand.snapshot.count===1,{timeout:10000});
 await screenshot(phone,'06-static-hand-phone');
 // The portrait preset fits all 16 columns at the same locked 78-degree angle.
 await verifyFixedCamera(phone,'phone');
 await plantTestFarm(phone,'right');
 await phone.waitForTimeout(450);
 await screenshot(phone,'07-farmland-installed-right-facility-phone');
 await hideTray(phone);
 await phone.waitForTimeout(300);
 await screenshot(phone,'07a-farmland-board-clear-no-deck-phone');
 assert.deepEqual(errors,[]);
 console.log('ROUND_COMPACT_WHITEBOX_BROWSER_PASS',JSON.stringify({desktop:true,phone:true,sevenCompartments:true,noLid:true,noFlip:true,noClipping:true,clickDeployment:true,clickDraw:true,clickPlay:true,sceneSwitch:true,full96VoxelTerrain:true,facilitySlots:48,userOriginalArtwork:true,farmFacilityPlacement:true,deckTrayCollapsesByDefault:true,drawerRestoresSevenPhysicalPiles:true,errors}));
}finally{await browser.close();}

// Real 1920x1080 Chromium WebGL test for two-camera underground elevator.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const out='artifacts/dungeon-elevator';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_CONSOLE_ERROR',m.text())});
page.on('requestfailed',r=>console.log('BROWSER_REQUEST_FAILED',r.url(),r.failure()?.errorText));
const state=()=>page.evaluate(()=>window.DungeonElevatorDemo.getState());
const shaft=()=>page.evaluate(()=>window.DungeonElevatorDemo.getShaftState());
const settledAt=async depth=>page.waitForFunction(expected=>{const x=window.DungeonElevatorDemo.getState();return x.depth===expected&&!x.moving},depth,{timeout:15000});
try{
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-dungeon-elevator').waitFor({state:'visible'});
 await page.waitForTimeout(220);
 const pcMenu=await page.evaluate(()=>{
  const menu=document.getElementById('scene-menu-main');
  const buttons=[...menu.querySelectorAll('button')];
  const lift=document.getElementById('menu-dungeon-elevator').getBoundingClientRect();
  const stage=document.getElementById('scene').getBoundingClientRect();
  return{order:buttons.map(b=>b.id),lift:{x:lift.x,y:lift.y,right:lift.right,bottom:lift.bottom},stage:{x:stage.x,y:stage.y,right:stage.right,bottom:stage.bottom}};
 });
 assert.equal(pcMenu.order[1],'menu-dungeon-elevator','Elevator must appear immediately after Start Game');
 assert.ok(pcMenu.lift.y>=pcMenu.stage.y-2 && pcMenu.lift.bottom<=pcMenu.stage.bottom+2,'PC elevator menu button clipped: '+JSON.stringify(pcMenu));
 await page.screenshot({path:out+'/00-original-horror-game-main-menu-with-elevator-1920x1080.png'});
 console.log('PC_MAIN_MENU_ENTRY',JSON.stringify(pcMenu));
 await page.locator('#menu-dungeon-elevator').click();
 await page.waitForURL('**/dungeon-elevator/');
 errors.length=0; // main game's unrelated scene-catalog boot is not elevator runtime
 await page.locator('#viewport canvas').waitFor({state:'visible',timeout:15000});
 await page.locator('#mini-viewport canvas').waitFor({state:'visible',timeout:15000});
 await page.waitForTimeout(400);
 const layout=await page.evaluate(()=>{
  const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
  return {main:rect('primary-stage'),preview:rect('swap-camera'),shop:document.querySelector('.shop-panel').getBoundingClientRect().toJSON(),controls:document.querySelector('.control-panel').getBoundingClientRect().toJSON()};
 });
 assert.ok(layout.main.width>layout.preview.width*2,'Left main camera should dominate');
 assert.ok(layout.preview.x>=layout.main.right&&layout.shop.y>=layout.preview.bottom&&layout.controls.y>=layout.shop.bottom,'Sidebar order incorrect');
 assert.ok(layout.controls.bottom<=1080,'Controls clipped at 1080p');
 const paperStats=await page.evaluate(()=>window.DungeonElevatorDemo.getRenderStats());
 assert.ok(paperStats.meshes>=10,'Paper scene should have visible pieces');
 assert.deepEqual(Object.keys(paperStats.geometries),['PlaneGeometry'],'No solid 3D meshes allowed: '+JSON.stringify(paperStats.geometries));
 await page.waitForFunction(()=>{
  const a=Object.values(window.DungeonElevatorDemo.getRenderStats().art);
  return a.length>=7&&a.every(v=>v==='ready');
 },null,{timeout:15000});
 const initial=await state(),surface=await shaft();
 assert.equal(initial.depth,0);assert.equal(initial.view,'door');
 assert.equal(surface.floor,0);assert.equal(surface.landingVisible,false);
 assert.equal(await page.locator('#stock-grid .stock-item').count(),6);
 await page.screenshot({path:out+'/01-surface-door-white-1920x1080.png'});
 await page.locator('#swap-camera').click();
 await page.waitForTimeout(350);
 assert.equal((await state()).view,'cabin');
 await page.screenshot({path:out+'/02-inside-big-door-small-1920x1080.png'});
 await page.locator('#swap-camera').click();
 await page.waitForTimeout(350);
 await page.locator('#service-gate').click();await page.locator('#security-gate').click();
 await page.waitForTimeout(440);
 await page.locator('#down').click();
 assert.equal((await state()).depth,0,'Open doors should prevent travel');
 await page.locator('#service-gate').click();await page.locator('#security-gate').click();
 await page.locator('#down').click();
 let descending=await state(),rockA=await shaft();
 assert.equal(descending.moving,true);assert.equal(descending.depth,0);assert.equal(descending.targetDepth,1);
 assert.equal(rockA.travelVisible,true);assert.equal(rockA.landingVisible,false);
 assert.equal(rockA.direction,1);
 await page.waitForTimeout(630);
 let rockB=await shaft();
 assert.ok(rockB.scrollDistance>rockA.scrollDistance,'Descending requires upward-moving outside earth');
 await page.screenshot({path:out+'/03-descending-moving-rock-soil-1920x1080.png'});
 await settledAt(1);
 let floor1=await state(),land1=await shaft();
 assert.equal(floor1.depth,1);assert.equal(floor1.request.id,'potion');
 assert.equal(land1.travelVisible,false);assert.equal(land1.landingVisible,true);assert.equal(land1.floor,1);
 await page.locator('#service-gate').click();await page.locator('#security-gate').click();
 await page.waitForTimeout(500);
 await page.screenshot({path:out+'/04-B1-open-rock-above-below-1920x1080.png'});
 const money=floor1.coins;
 await page.locator('#sell-request').click();
 const afterTrade=await state();
 assert.equal(afterTrade.orderServed,true);
 assert.ok(afterTrade.coins>money);
 assert.equal(afterTrade.goods.find(g=>g.id==='potion').qty,4);
 await page.locator('#service-gate').click();await page.locator('#security-gate').click();
 await page.locator('#down').click();await settledAt(2);
 assert.equal((await shaft()).floor,2,'Each floor must show its own landing state');
 await page.locator('#up').click();
 let ascending=await state(),upA=await shaft();
 assert.equal(ascending.moving,true);assert.equal(upA.direction,-1);
 await page.waitForTimeout(620);
 let upB=await shaft();
 assert.ok(upB.scrollDistance<upA.scrollDistance,'Ascending requires downward-moving outside earth');
 await page.screenshot({path:out+'/05-ascending-moving-rock-soil-1920x1080.png'});
 await settledAt(1);
 await page.evaluate(()=>window.DungeonElevatorDemo.setLoad(999,5));
 await page.locator('#down').click();
 assert.equal((await state()).depth,1,'Overload must block movement');
 assert.equal((await state()).moving,false);
 await page.evaluate(()=>window.DungeonElevatorDemo.setLoad(0,0));
 await page.locator('#emergency').click();
 assert.equal((await state()).moving,true,'Emergency return animates through the shaft');
 await settledAt(0);
 const end=await state(),finalShaft=await shaft();
 assert.equal(end.emergencyUsed,true);assert.equal(end.integrity,92);
 assert.equal(finalShaft.floor,0);assert.equal(finalShaft.landingVisible,false);
 // Verify real ORIGINAL horror game main menu also exposes the elevator link on a phone.
 const homePhone=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await homePhone.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:60000});
 await homePhone.locator('#menu-dungeon-elevator').waitFor({state:'visible',timeout:20000});
 const homeMenu=await homePhone.evaluate(()=>{
  const button=document.getElementById('menu-dungeon-elevator').getBoundingClientRect();
  const scene=document.getElementById('scene').getBoundingClientRect();
  return {button:{x:button.x,y:button.y,right:button.right,bottom:button.bottom},
          scene:{x:scene.x,y:scene.y,right:scene.right,bottom:scene.bottom},
          second:[...document.querySelectorAll('#scene-menu-main button')][1].id,
          href:location.href};
 });
 assert.equal(homeMenu.second,'menu-dungeon-elevator');
 assert.ok(homeMenu.button.bottom<=390 && homeMenu.button.y>=0,'Phone main-menu lift entry off-screen: '+JSON.stringify(homeMenu));
 await homePhone.screenshot({path:out+'/00-original-horror-game-phone-menu-844x390.png'});
 await homePhone.locator('#menu-dungeon-elevator').tap();
 await homePhone.waitForURL('**/dungeon-elevator/',{timeout:12000});
 console.log('PHONE_MAIN_MENU_ENTRY',JSON.stringify(homeMenu));
 await homePhone.close();
 // Real phone landscape, NOT desktop CSS resized inside a browser window.
 const phoneErrors=[];
 const phone=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 phone.on('pageerror',e=>phoneErrors.push(String(e)));
 await phone.goto('http://127.0.0.1:8765/dungeon-elevator/',{waitUntil:'domcontentloaded',timeout:60000});
 await phone.locator('#viewport canvas').waitFor({state:'visible',timeout:15000});
 await phone.locator('#mini-viewport canvas').waitFor({state:'visible',timeout:15000});
 await phone.waitForFunction(()=>Object.values(window.DungeonElevatorDemo.getRenderStats().art).length>=7&&Object.values(window.DungeonElevatorDemo.getRenderStats().art).every(v=>v==='ready'),null,{timeout:15000});
 const phoneLayout=await phone.evaluate(()=>{
  const box=id=>{const b=document.getElementById(id).getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
  return {vw:innerWidth,vh:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
   primary:box('primary-stage'),preview:box('swap-camera'),shop:document.querySelector('.shop-panel').getBoundingClientRect().toJSON(),
   controls:document.querySelector('.control-panel').getBoundingClientRect().toJSON(),
   up:box('up'),down:box('down'),gate:box('service-gate'),emergency:box('emergency'),
   stats:window.DungeonElevatorDemo.getRenderStats()};
 });
 assert.deepEqual(Object.keys(phoneLayout.stats.geometries),['PlaneGeometry']);
 assert.ok(phoneLayout.primary.width>phoneLayout.preview.width,'Phone main view should stay larger');
 assert.ok(phoneLayout.preview.x>=phoneLayout.primary.right-1,'Preview must be in right column');
 assert.ok(phoneLayout.controls.bottom<=390,'Phone control panel clipped: '+JSON.stringify(phoneLayout));
 assert.ok(phoneLayout.scrollHeight<=390&&phoneLayout.scrollWidth<=844,'Phone must not scroll like webpage: '+JSON.stringify(phoneLayout));
 assert.ok(phoneLayout.up.height>=40&&phoneLayout.down.height>=40,'Travel touch targets too small');
 assert.ok(phoneLayout.emergency.height>=26,'Emergency button missing');
 await phone.screenshot({path:out+'/06-phone-landscape-844x390.png'});
 await phone.locator('#swap-camera').tap();
 assert.equal(await phone.evaluate(()=>window.DungeonElevatorDemo.getState().view),'cabin');
 await phone.screenshot({path:out+'/07-phone-landscape-camera-swapped-844x390.png'});
 await phone.locator('#down').tap();
 await phone.waitForFunction(()=>{const v=window.DungeonElevatorDemo.getState();return v.depth===1&&!v.moving},null,{timeout:15000});
 assert.equal(await phone.evaluate(()=>window.DungeonElevatorDemo.getShaftState().landingVisible),true);
 await phone.locator('#sell-request').tap();
 assert.equal(await phone.evaluate(()=>window.DungeonElevatorDemo.getState().orderServed),true);
 await phone.screenshot({path:out+'/08-phone-B1-trade-844x390.png'});
 await phone.close();
 const compact=await browser.newPage({viewport:{width:667,height:375},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await compact.goto('http://127.0.0.1:8765/dungeon-elevator/',{waitUntil:'domcontentloaded',timeout:60000});
 await compact.locator('#viewport canvas').waitFor({state:'visible',timeout:15000});
 const compactLayout=await compact.evaluate(()=>({
  vh:innerHeight,vw:innerWidth,
  controlsBottom:document.querySelector('.control-panel').getBoundingClientRect().bottom,
  sceneRight:document.getElementById('primary-stage').getBoundingClientRect().right,
  previewLeft:document.getElementById('swap-camera').getBoundingClientRect().left,
  scrollHeight:document.documentElement.scrollHeight,
  customerActionsBottom:document.querySelector('.customer-strip .request-actions').getBoundingClientRect().bottom,
  shopBottom:document.querySelector('.shop-panel').getBoundingClientRect().bottom,
  fullscreenRight:document.getElementById('game-fullscreen').getBoundingClientRect().right,
  backLeft:document.querySelector('.main-link').getBoundingClientRect().left,
  backRight:document.querySelector('.main-link').getBoundingClientRect().right
 }));
 assert.ok(compactLayout.controlsBottom<=375&&compactLayout.scrollHeight<=375,'Compact phone controls clipped: '+JSON.stringify(compactLayout));
 assert.ok(compactLayout.customerActionsBottom<=compactLayout.shopBottom-1,'Compact phone shop buttons clipped: '+JSON.stringify(compactLayout));
 assert.ok(compactLayout.fullscreenRight<=compactLayout.backLeft+1,'Fullscreen/back buttons overlap: '+JSON.stringify(compactLayout));
 assert.ok(compactLayout.backRight<=667,'Back button off-screen: '+JSON.stringify(compactLayout));
 await compact.screenshot({path:out+'/09-phone-compact-667x375.png'});
 await compact.close();
 const portrait=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await portrait.goto('http://127.0.0.1:8765/dungeon-elevator/',{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(await portrait.locator('#rotate-tip').isVisible(),true,'Portrait should display landscape instruction');
 await portrait.screenshot({path:out+'/10-phone-portrait-rotate.png'});
 await portrait.close();
 assert.equal(phoneErrors.length,0,'Phone errors: '+JSON.stringify(phoneErrors));
 console.log('PHONE_GAME_PROOF',JSON.stringify({phoneLayout,compactLayout,phoneErrors}));

 assert.equal(errors.length,0,'Browser page errors: '+JSON.stringify(errors));
 console.log('DUNGEON_ELEVATOR_SHAFT_PROOF',JSON.stringify({layout,initial,descending:{rockA,rockB},land1,ascending:{upA,upB},end,finalShaft,screenshots:10,errors}));
}finally{await browser.close()}

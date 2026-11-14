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
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.geometry==='seven-bay-walnut-felt-case'&&
  window.__sceneCardHUD.snapshot.visible.filter(p=>p.kind==='deck').length===
   window.__forestHand.snapshot.roster.length,{timeout:20000});
 const b=await page.evaluate(()=>window.__sceneCardHUD.snapshot);
 assert.equal(b.compartments,7);
 assert.equal(b.walnutShell,true,'one walnut shell, not a white plastic tray');
 assert.equal(b.forestFelt,true,'seven card slots must have green felt lining');
 assert.equal(b.brassInlay,true,'brass edge trim instead of an unfinished white rim');
 assert.equal(b.engravedRoleTabs,0,'no job names engraved on the case');
 assert.equal(b.printedDeckFaces,b.ownedCharacters.length);
 assert.equal(b.physicalBoxes,1);
 assert.equal(b.roundedCase,true,'single rounded-corner 3D shell');
 assert.equal(b.beveledRim,true,'3D rounded hollow rim');
 assert.equal(b.fittedCardStacks,true,'owned characters each have a real physical stack');
 assert.ok(b.bounds.roundedCornerRadius>b.bounds.h*.14,'rounding must be substantial');
 assert.ok(b.bounds.slotGap/b.bounds.pitch<.11,'card piles must nearly fill each slot');
 assert.ok(b.bounds.horizontalClearance>.015&&b.bounds.verticalClearance>.015);
 assert.ok(b.bounds.cardWidth/b.bounds.pitch>.87,'no tiny cards surrounded by void');
 assert.equal(b.visibleDeckPiles,b.ownedCharacters.length);
 assert.equal(b.emptySlots,7-b.ownedCharacters.length);
 assert.equal(b.ownedCharacters.length,kind==='level-two'?2:1);
 assert.equal(b.ownedCharacters[0].id,'woodcutter');
 if(kind==='level-two')assert.equal(b.ownedCharacters[1].id,'farmer');
 assert.equal(b.hasLid,false);
 assert.equal(b.hasHinge,false);
 assert.equal(b.flipAnimationEnabled,false);
 assert.equal(b.reversibleLid,false);
 assert.ok(b.bounds.safeHorizontalMargin>.05,'box must stay within left/right safe margin');
 assert.ok(b.bounds.safeBottomMargin>.05&&b.bounds.safeBottomMargin<.35);
 assert.ok(b.bounds.horizontalClearance>Math.min(.02,b.bounds.h*.014),'card touching divider horizontally');
 assert.ok(b.bounds.verticalClearance>.02,'card touching top/bottom rail');
 const slots=b.visible.filter(p=>p.kind==='deck');
 assert.equal(slots.length,b.ownedCharacters.length);
 for(let i=0;i<slots.length;i++){
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
  window.__sceneCardHUD.snapshot.visibleDeckPiles===window.__forestHand.snapshot.roster.length&&
  window.__sceneCardHUD.snapshot.visible.filter(p=>p.kind==='deck').length===
   window.__forestHand.snapshot.roster.length,{timeout:20000});
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
 const ground=await page.evaluate(()=>window.__forestLevelDebug.environment.ground);
 assert.ok(ground.width>=200&&ground.depth>=200,'full-screen portrait 3D floor, no background void');
 assert.ok(ground.top<-.75,'3D board must sit above forest floor for visible projected shadows');
 assert.equal(status.slots.filter(s=>s.zone==='unit').length,18);
 assert.equal(status.slots.filter(s=>s.zone==='facility').length,48);
 assert.deepEqual([...new Set(status.slots.filter(s=>s.zone==='unit').map(s=>s.tileC))],[6,7,8]);
 assert.deepEqual([...new Set(status.slots.filter(s=>s.zone==='facility').map(s=>s.tileC))],[1,2,3,4,10,11,12,13]);
 assert.equal(status.level.columns,3);
 assert.ok(Math.abs(status.camera.maxDistance-status.camera.fitDistance)<.001,
  'fitted full-board camera must be the absolute maximum zoom-out distance');
 console.log('FOREST_16X6_96_VOXELS_PASS',JSON.stringify({kind,voxels:status.tiles.length,unitSlots:18,facilitySlots:48}));
}
async function verifyCardStats(page,kind){
 await page.waitForFunction(()=>window.__forestLevelDebug?.cardStats?.layout.cachedTextures>=4,
  null,{timeout:20000});
 const info=await page.evaluate(()=>window.__forestLevelDebug.cardStats);
 const layout=info.layout;
 assert.equal(layout.attachedTo,'card-model-matrix',
  'attack and health badges must transform WITH the 3D card, never float in screen space');
 assert.equal(layout.layout,'lower-left-attack_lower-right-health');
 assert.ok(layout.anchor.attack.x<0&&layout.anchor.health.x>0);
 assert.ok(layout.anchor.attack.y<0&&layout.anchor.health.y<0);
 assert.ok(layout.anchor.attack.z>.06&&layout.anchor.health.z>.06,
  'badges sit on the face ABOVE the portrait card texture to avoid z-fighting');
 assert.equal(info.units.length,3,'both enemy cards and the hero have statistics');
 assert.equal(info.units.find(u=>u.unitId==='woodcutter').attack,3);
 assert.equal(info.units.find(u=>u.unitId==='woodcutter').currentHp,12);
 assert.ok(info.units.filter(u=>u.side==='enemy').every(u=>u.currentHp===4));
 assert.ok(!String(await page.locator('#level-hud').textContent()).includes('生命'),
  'HP now belongs to physical cards, not floating global HUD labels');
 console.log('PHYSICAL_CARD_STAT_BADGES_PASS',JSON.stringify({kind,layout,
  units:info.units.map(({unitId,attack,currentHp,maxHp})=>({unitId,attack,currentHp,maxHp}))}));
}
async function verifyFixedCamera(page,kind){
 const before=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.equal(before.fixed,true,'first-step battle camera angle is locked');
 assert.ok(Math.abs(before.yaw)<1e-5,'no sideways orbit');
 assert.ok(Math.abs(before.elevation-78*Math.PI/180)<.001,'near-top-down angle');
 assert.ok(before.distance>=46,'default board must not start cropped');
 assert.deepEqual(before.target.slice(0,1),[0]);
 assert.equal(before.maxDistance,before.fitDistance,'no zoom-out past the full-board fit');
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
 assert.ok((frame.maxX-frame.minX)/frame.width>.76,'full 16x6 board fits at default zoom');
 if(kind==='desktop')assert.ok((frame.maxY-frame.minY)/frame.height>.40,
   'high camera angle should use most of the desktop height');
 // At default zoom the user cannot orbit, pan or zoom out.
 await page.evaluate(()=>{
  const c=window.__battleCamera;
  c.rotate(700,400);c.pan(-900,300);c.zoom(12);
  const el=document.getElementById('stage'),rect=el.getBoundingClientRect();
  el.dispatchEvent(new WheelEvent('wheel',{
   deltaY:450,clientX:rect.left+rect.width*.5,
   clientY:rect.top+rect.height*.43,bubbles:true,cancelable:true
  }));
 });
 const far=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(Math.abs(far.desiredDistance-before.fitDistance)<.001,'scrolling out at fit does nothing');
 assert.deepEqual(far.pan,before.pan,'no pan at default wide view');
 // Both wheel directions work after zooming in. Original full-board fit is
 // the minimum magnification: wheel-out must stop at that exact frame.
 await page.evaluate(()=>{
  const el=document.getElementById('stage'),rect=el.getBoundingClientRect();
  el.dispatchEvent(new WheelEvent('wheel',{
   deltaY:-300,clientX:rect.left+rect.width*.5,
   clientY:rect.top+rect.height*.43,bubbles:true,cancelable:true
  }));
 });
 const requested=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(requested.desiredDistance<before.desiredDistance-1,'wheel zoom-in changes target distance');
 await page.waitForFunction(()=>document.getElementById('camera-controls').classList.contains('is-zoomed'),
  null,{timeout:9000});
 await page.evaluate(()=>{
  const el=document.getElementById('stage'),rect=el.getBoundingClientRect();
  el.dispatchEvent(new WheelEvent('wheel',{
   deltaY:100,clientX:rect.left+rect.width*.5,
   clientY:rect.top+rect.height*.43,bubbles:true,cancelable:true
  }));
 });
 const zoomedBack=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(zoomedBack.desiredDistance>requested.desiredDistance,
  'reverse wheel must zoom back out after enlarging');
 assert.ok(zoomedBack.desiredDistance<=before.fitDistance,
  'reverse wheel may not pass the original full-board fit');
 await page.evaluate(()=>{
  const el=document.getElementById('stage'),rect=el.getBoundingClientRect();
  el.dispatchEvent(new WheelEvent('wheel',{
   deltaY:-100,clientX:rect.left+rect.width*.5,
   clientY:rect.top+rect.height*.43,bubbles:true,cancelable:true
  }));
 });
 const zoomedInAgain=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(Math.abs(zoomedInAgain.desiredDistance-requested.desiredDistance)<.001,
  'symmetric wheel motion restores the same magnification');
 await page.waitForTimeout(420);
 const enlarged=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(enlarged.distance<before.distance-1,'smooth wheel zoom-in actually moves camera');
 assert.equal(enlarged.yaw,before.yaw,'zoom cannot change yaw');
 assert.equal(enlarged.elevation,before.elevation,'zoom cannot change elevation');
 assert.deepEqual(enlarged.target,before.target,'zoom does not pan by itself');
 // Explicit pan is unlocked by zoom. Oversized movement must clamp to safe
 // x/z limits computed from the board dimensions and zoom ratio.
 await page.evaluate(()=>window.__battleCamera.pan(-5000,-5000));
 const panned=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(panned.safePan.x>.1&&panned.safePan.z>.1,'zoom must unlock some safe movement');
 assert.ok(Math.abs(panned.pan[0]-before.pan[0])>.1,'drag can move camera horizontally');
 assert.ok(Math.abs(panned.pan[2]-before.pan[2])>.1,'drag can move camera vertically');
 assert.ok(Math.abs(panned.pan[0]-before.pan[0])<=panned.safePan.x+.001,'pan x cannot escape board');
 assert.ok(Math.abs(panned.pan[2]-before.pan[2])<=panned.safePan.z+.001,'pan z cannot escape board');
 // Right mouse drag is a pan gesture, never an orbit gesture.
 await page.evaluate(()=>{
  const c=window.__battleCamera;
  const down={pointerType:'mouse',pointerId:400,button:2,clientX:350,clientY:300};
  c.pointerDown(down);
  c.pointerMove({...down,clientX:540,clientY:390});
  c.pointerUp({...down,clientX:540,clientY:390});
 });
 const rightDragged=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.equal(rightDragged.yaw,before.yaw,'right drag must not rotate');
 assert.equal(rightDragged.elevation,before.elevation,'right drag must not pitch');
 assert.ok(Math.abs(rightDragged.pan[0]-before.pan[0])<=rightDragged.safePan.x+.001);
 assert.ok(Math.abs(rightDragged.pan[2]-before.pan[2])<=rightDragged.safePan.z+.001);
 // Mouse-edge scrolling is also clamped; not a free camera fly mode.
 await page.evaluate(()=>{
  const c=window.__battleCamera,rect=document.getElementById('stage').getBoundingClientRect();
  c.pointerHover({pointerType:'mouse',clientX:rect.right-1,clientY:rect.bottom-1},rect);
  for(let i=0;i<180;i++)c.edgePan(1/60,true);
  c.pointerHover(null,null);
 });
 const edge=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(Math.abs(edge.pan[0]-before.pan[0])<=edge.safePan.x+.001);
 assert.ok(Math.abs(edge.pan[2]-before.pan[2])<=edge.safePan.z+.001);
 // Reversing all the way to the original size automatically recenters,
 // and the original size remains an absolute far limit.
 await page.evaluate(()=>window.__battleCamera.zoom(100));
 const farAgain=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(Math.abs(farAgain.desiredDistance-before.fitDistance)<.001);
 assert.ok(Math.abs(farAgain.pan[0]-before.pan[0])<.001);
 assert.ok(Math.abs(farAgain.pan[2]-before.pan[2])<.001);
 // Restore precise approved layout before any card gameplay/screenshot test.
 await page.evaluate(()=>window.__battleCamera.reset());
 // Software WebGL can render at very low FPS: wait for actual damped pose,
 // not an arbitrary wall-clock interval that leaves camera partially panned.
 await page.waitForFunction(()=>{
  const q=window.__battleCamera.snapshot();
  return Math.abs(q.distance-q.fitDistance)<.003&&
   Math.abs(q.target[0])<.003&&Math.abs(q.target[2]-.70)<.003;
 },null,{timeout:9000});
 assert.equal(await page.evaluate(()=>document.getElementById('camera-controls').classList.contains('is-zoomed')),
  false,'reset button vanishes when the full tactical view is restored');
 const after=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.ok(Math.abs(after.target[0]-before.target[0])<.003&&
  Math.abs(after.target[2]-before.target[2])<.003,
  'spring reset restores the fixed camera target within subpixel tolerance');
 assert.ok(Math.abs(after.distance-before.distance)<.003,'reset restores viewport fit');
 assert.ok(Math.abs(after.pan[0]-before.pan[0])<.001);
 assert.ok(Math.abs(after.pan[2]-before.pan[2])<.001);
 console.log('FOREST_SAFE_ZOOM_IN_PAN_PASS',JSON.stringify({
  kind,defaultDistance:before.distance,zoomedDistance:enlarged.distance,
  resetDistance:after.distance,safePan:panned.safePan,viewport:after.viewport,frame
 }));
}
async function verifyCloudAndResolution(page,kind){
 const initial=await page.evaluate(()=>({
  clouds:window.__forestLevelDebug.cloudShadows,
  perf:window.__forestLevelDebug.performance
 }));
 assert.equal(initial.clouds.enabled,true,'forest cloud shadows active');
 assert.ok(initial.clouds.windWorldPerSecond[0]>0,'clouds should drift with wind');
 await page.waitForTimeout(280);
 const changed=await page.evaluate(()=>window.__forestLevelDebug.cloudShadows);
 assert.ok(changed.time>initial.clouds.time+.1,'cloud shadow sampling time updates every frame');
 assert.ok(initial.perf.renderedDevicePixelRatio>=.84,
  'adaptive resolution must not lose over 16% of native 1x detail');
 console.log('FOREST_MOVING_CLOUDS_HIDPI_PASS',JSON.stringify({kind,clouds:changed,performance:initial.perf}));
}
async function verifyRestingCardsStatic(page,kind){
 // Allow spring placement to finish; then rendered model matrices cannot change
 // until an actual play/attack/flip/move command occurs.
 await page.waitForTimeout(1200);
 const first=await page.evaluate(()=>window.__forestLevelDebug.placedCardMatrices);
 assert.ok(first?.length>0,'played cards exist on the 3D board');
 await page.waitForTimeout(520);
 const second=await page.evaluate(()=>window.__forestLevelDebug.placedCardMatrices);
 assert.deepEqual(second,first,'placed cards must not float, wobble, rotate or hover-pulse');
 console.log('FOREST_PLACED_CARDS_STATIC_PASS',JSON.stringify({kind,cards:first.length}));
}
async function verifyStage01ColorAndLighting(page,kind){
 const look=await page.evaluate(()=>window.__forestLevelDebug?.visualLook);
 assert.ok(look,'stage 01 visual-look engine registered');
 assert.equal(look.stage,6,'all six visual layers must be active');
 assert.equal(look.id,'forest');
 assert.equal(look.stage,6,'final material and illumination preset is active');
 assert.ok(Array.isArray(look.goldColor)&&look.goldColor.length===4,'metal color comes from visual engine');
 assert.ok(look.terrainSide[1]>.35,'side surfaces retain natural earth shading');
 assert.ok(look.terrainDetail>=.025&&look.terrainDetail<=.035,
  'controlled non-repeating world-space grass variation');
 assert.ok(look.terrainLight[1]>look.terrainLight[0],'green nature palette');
 assert.ok(look.terrainDark[1]>look.terrainDark[0],'green shadow palette');
 assert.ok(look.ambient>=.70&&look.ambient<=.83,'soft sky fill avoids washed-out dark patches');
 assert.ok(look.sunIntensity>.18&&look.sunIntensity<.32,'single restrained sun direction');
 assert.ok(look.background[1]>.50&&look.background[0]<.50,'forest backdrop must not be beige');
 const cam=await page.evaluate(()=>window.__battleCamera.snapshot());
 assert.equal(cam.fixed,true,'stage 01 cannot change approved camera');
 console.log('FOREST_VISUAL_STAGE06_PASS',JSON.stringify({kind,look,distance:cam.distance}));
}
async function verifySpatialShadowMap(page,kind){
 await page.waitForFunction(()=>window.__forestLevelDebug?.spatialShadows?.passes>=1,{timeout:25000});
 const stats=await page.evaluate(()=>window.__forestLevelDebug.spatialShadows);
 assert.equal(stats.enabled,true,'real WebGL framebuffer shadow system required');
 assert.equal(stats.type,'rgba8-depth-shadow-map','shadow map must use 3D depth not an ellipse');
 assert.equal(stats.actualOcclusion,true);
 assert.equal(stats.worldSpace,true);
 assert.ok(stats.castersDrawn>=30,'3D trees and stage geometry must cast real shadows');
 assert.equal(stats.width,kind==='desktop'?1024:512);
 assert.equal(stats.lastError,'');
 console.log('FOREST_SPATIAL_SHADOW_MAP_PASS',JSON.stringify({kind,...stats}));
}
async function verifySixLayerVisualEffects(page,kind,enhanced=true){
 await page.waitForFunction(()=>window.__forestLevelDebug?.visualEffects?.material?.ready===true,{timeout:18000});
 const fx=await page.evaluate(()=>window.__forestLevelDebug.visualEffects);
 assert.equal(fx.mode,enhanced?'enhanced':'baseline');
 assert.equal(fx.enabled,enhanced);
 assert.equal(fx.material.drawCallsAdded,0);
 assert.equal(fx.material.source,'procedural-fallback-anima-asset-ready');
 assert.deepEqual(fx.material.resolution,[1024,1024],'higher resolution 512-pixel individual material tiles');
 assert.equal(fx.cloudShadows.enabled,enhanced,'clouds disable with visual baseline');
 assert.equal(fx.cloudShadows.extraDrawCalls,0,'animated cloud projection has no extra draw calls');
 assert.equal(fx.cloudShadows.extraShadowPasses,0,'cloud shadows must not re-render the sun shadow map');
 if(enhanced){
  assert.ok(fx.forest.treeCount>=40,'genuinely modeled outer 3D forest');
  assert.ok(fx.forest.flowers>=100,'batched daisy clusters');
  assert.ok(fx.forest.grassBlades>=600,'3D grass tufts around the board');
  assert.ok(fx.forest.batchedMeshes<=15,'mobile-friendly merged 3D mesh groups');
  assert.equal(fx.ao,true);
  assert.equal(fx.indirectLight,true);
  assert.equal(fx.cardPaper,true);
  assert.equal(fx.toneMapping,true);
 }
 console.log('FOREST_SIX_LAYERS_PASS',JSON.stringify({kind,...fx}));
}
async function verifyPhysicalFrame(page,kind){
 await page.waitForFunction(()=>window.__forestLevelDebug?.physicalFrame?.lastDrawCalls===1,{timeout:25000});
 const mesh=await page.evaluate(()=>window.__forestLevelDebug.physicalFrame);
 assert.equal(mesh.modeled,true,'visible border must be a real 3D model');
 assert.equal(mesh.worldSpace,true,'border must share world coordinates with 96 tiles');
 assert.equal(mesh.screenOverlay,false,'never paint fake CSS game frame');
 assert.equal(mesh.geometry,'single-thin-rounded-gold-ring');
 assert.equal(mesh.color,'gold');
 assert.equal(mesh.decorations,0,'remove all gold crests, rivets, and furniture');
 assert.equal(mesh.framePieces,1);
 assert.equal(mesh.material,'directional-lit-bevelled-metal');
 assert.equal(mesh.bevelSegments,2,'rounded ring is bevelled real 3D mesh');
 assert.equal(mesh.midfieldBeam,false,'no extra middle bar');
 assert.equal(mesh.sidePlaques,false,'no extra side plaques');
 assert.equal(mesh.boardCols,16);
 assert.equal(mesh.boardRows,6);
 assert.ok(mesh.cornerRadius>=.3,'thin border still has physical rounded corners');
 assert.ok(mesh.outerWidth-mesh.boardWidth<.45,'one thin muted gold ring, no chunky yellow bar');
 assert.ok(Math.abs(mesh.railThickness-.175)<.01,'ring body must be slim');
 assert.ok(mesh.innerOpeningWidth>mesh.boardWidth,'do not overlap any terrain tile');
 assert.equal(mesh.lastDrawCalls,1,'ONE physical 3D ring only, no extra ornaments');
 assert.equal(await page.locator('#battle-ornament').count(),0,'remove floating yellow CSS frame entirely');
 assert.equal(await page.locator('.facility-rail').count(),0,'remove fake HTML side rails too');
 const layout=await page.evaluate(()=>window.__boardReferenceLayout.snapshot);
 assert.equal(layout.frameIsPhysical3D,true);
 console.log('PHYSICAL_3D_BOARD_FRAME_PASS',JSON.stringify({kind,mesh,coverageX:layout.coverageX,coverageY:layout.coverageY}));
}
async function verifyApprovedReferenceLayout(page,kind){
 await page.waitForFunction(()=>window.__boardReferenceLayout?.snapshot?.boardTiles===96,{timeout:20000});
 const m=await page.evaluate(()=>window.__boardReferenceLayout.snapshot);
 assert.equal(m.boardTiles,96,'full 16 by 6 terrain remains physical');
 // Desktop appearance MUST match the user-approved reference, not the old
 // GitHub screenshot: width ~85%, height ~66%, top margin ~11%.
 if(kind==='desktop'){
  assert.ok(m.coverageX>=.84&&m.coverageX<=.86,'reference desktop target: 85% board width');
  assert.ok(m.coverageY>=.65&&m.coverageY<=.68,'reference desktop target: 66% board height');
  assert.ok(m.top/m.viewport[1]>=.09&&m.top/m.viewport[1]<=.14,
   'reference desktop target: top margin around 11%');
  assert.ok(Math.abs((m.left+m.right)/2-m.viewport[0]/2)<=m.viewport[0]*.015,
   'board must be horizontally centered');
 }else{
  assert.ok(m.coverageX>=.84&&m.coverageX<=.90,'portrait should fit the full 16-column world');
 }
 // A complete 16-column board must be shown on a 390x844 portrait screen;
 // the desktop screenshot is the 16:9 visual target, not portrait's geometry.
 assert.ok(m.coverageY>(kind==='desktop'?.54:.13),
   'desktop should match approved composition; mobile must retain all 96 cells');
 assert.ok(m.left>=0&&m.right<=m.viewport[0],'board frame visible within horizontal viewport');
 assert.ok(m.top>=0&&m.bottom<=m.viewport[1],'board frame visible within vertical viewport');
 assert.equal(await page.locator('#deck-drawer-toggle').getAttribute('aria-expanded'),'false',
  'start with collapsed physical seven-stack drawer');
 console.log('REFERENCE_BOARD_LAYOUT_PASS',JSON.stringify({kind,frame:m}));
}
async function selectDrawnCard(page,owner,id){
 for(let attempts=0;attempts<10;attempts++){
  const found=await page.evaluate(id=>window.__forestHand.snapshot.hand.find(c=>c.id===id),id);
  if(found){
   await clickCard(page,'hand:'+found.instance);
   await page.waitForFunction(instance=>window.__forestHand.selected===instance,found.instance,{timeout:8000});
   return found;
  }
  const before=await page.evaluate(()=>window.__forestHand.snapshot.count);
  await clickCard(page,'deck:'+owner);
  await page.waitForFunction(n=>window.__forestHand.snapshot.count===n+1,before,{timeout:10000});
 }
 throw Error('Missing requested '+owner+' card: '+id);
}
async function plantFarmerCard(page,cardId,flank='left'){
 const drawn=await selectDrawnCard(page,'farmer',cardId);
 assert.equal(drawn.type,'facility','farm facility must originate in the engineer deck');
 await page.waitForFunction(id=>window.__terrainDebug.tool===id,cardId,{timeout:8000});
 const tileC=flank==='left'?4:10, tileR=4;
 const target=await page.evaluate(({tileC,tileR,flank})=>window.__forestLevelDebug.slotPoints.find(s=>
  s.zone==='facility'&&s.side==='ally'&&s.flank===flank&&s.tileC===tileC&&s.tileR===tileR),
  {tileC,tileR,flank});
 assert.ok(target?.point,'no legal facility tile');
 const before=await page.evaluate(()=>window.__forestLevelDebug.facilities.length);
 await page.mouse.click(target.point.x,target.point.y);
 await page.waitForFunction(n=>window.__forestLevelDebug.facilities.length===n+1,before,{timeout:15000});
 const placed=await page.evaluate(()=>window.__forestLevelDebug.facilities.at(-1));
 assert.equal(placed.id,cardId);
 assert.equal(placed.flank,flank);
 assert.equal(placed.tileC,tileC);
 assert.equal(placed.tileR,tileR);
 assert.equal(placed.hasTexture,true);
 assert.equal(await page.evaluate(()=>window.__terrainDebug.tool),null);
 assert.equal(await page.evaluate(instance=>window.__forestHand.snapshot.hand.some(c=>c.instance===instance),drawn.instance),false,
  'a placed farmer facility consumes the exact physical card instance');
 return placed;
}
async function deploy(page){
 await clickCard(page,'character:woodcutter');
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.placement.selected),'woodcutter');
 const slot=await page.evaluate(()=>window.__forestLevelDebug.slotPoints.find(p=>p.side==='ally'&&p.r===0&&p.c===1));
 assert.ok(slot?.point);
 await page.mouse.click(slot.point.x,slot.point.y);
 await page.waitForFunction(()=>window.__forestLevelDebug.state.phase==='active'&&window.__sceneCardHUD.snapshot.stagedCharacterCards===0,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0,
  'deployment never deals cards; player must click a class box');
}
try{
 // Exactly the same deployed hero state, at the same viewport,
 // using visual=off as a browser-rendered control. No AI mock screenshots.
 const before=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 before.on('pageerror',e=>errors.push('BEFORE '+String(e)));
 await before.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html?visual=off',
  {waitUntil:'networkidle',timeout:65000});
 await verifyWorld(before,'baseline-desktop');
 await verifySixLayerVisualEffects(before,'baseline-desktop',false);
 await showTray(before);
 await deploy(before);
 await hideTray(before);
 await before.waitForTimeout(750);
 await screenshot(before,'00-visual-before-all-six-desktop');
 await before.close();
 const pc=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 pc.on('pageerror',e=>errors.push('PC '+String(e)));
 await pc.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await verifyWorld(pc,'desktop');
 await verifyTrayCollapsed(pc,'desktop-default');
 await verifyApprovedReferenceLayout(pc,'desktop');
 await verifyStage01ColorAndLighting(pc,'desktop');
 await verifyPhysicalFrame(pc,'desktop');
 await verifySpatialShadowMap(pc,'desktop');
 await verifySixLayerVisualEffects(pc,'desktop');
 await verifyCloudAndResolution(pc,'desktop');
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
 await verifyCardStats(pc,'desktop');
 await screenshot(pc,'02-deployed-in-static-box-desktop');
 await pc.waitForTimeout(700);
 await screenshot(pc,'02a-deployed-board-desktop');
 await hideTray(pc);
 await verifyRestingCardsStatic(pc,'desktop');
 await screenshot(pc,'02b-farmland-board-clear-no-deck-desktop');
 // Two real WebGL screenshots of exactly the same board, with no mouse
 // movement or card animation. Only the world-space cloud shadow drifts.
 const cloudStart=await pc.screenshot({path:folder+'/02c-cloud-shadow-now-desktop.png'});
 await pc.waitForTimeout(3500);
 const cloudLater=await pc.screenshot({path:folder+'/02d-cloud-shadow-3s-later-desktop.png'});
 assert.notEqual(Buffer.compare(cloudStart,cloudLater),0,
  'static forest must visibly change when the cloud shadow travels');
 await verifyApprovedReferenceLayout(pc,'desktop');
 await showTray(pc);
 const attackCard=await selectDrawnCard(pc,'woodcutter','strike');
 const preAttackHand=await pc.evaluate(()=>window.__forestHand.snapshot.count);
 await screenshot(pc,'03-static-hand-drawn-desktop');
 assert.equal(await pc.evaluate(()=>window.__forestHand.selected),attackCard.instance);
 assert.equal(await pc.evaluate(()=>window.__forestLevelDebug.attack('forest-foe-a')),true);
 assert.equal(await pc.evaluate(()=>window.__forestHand.snapshot.count),preAttackHand-1);
 await pc.waitForFunction(()=>window.__forestLevelDebug.combat.animation.last?.hitFired===true,
  null,{timeout:12000});
 await pc.waitForFunction(()=>window.__forestLevelDebug.cardStats.units
   .find(u=>u.unitId==='forest-foe-a').currentHp<4,null,{timeout:10000});
 const afterHitStats=await pc.evaluate(()=>window.__forestLevelDebug.cardStats);
 assert.ok(afterHitStats.layout.cachedTextures>=5,
  'damaged enemy health creates a refreshed texture on its 3D corner plate');
 await screenshot(pc,'03a-axe-hit-impact-desktop');
 await pc.waitForFunction(()=>!window.__forestCombat.busy,null,{timeout:12000});
 const heroBeforeEnemy=await pc.evaluate(()=>window.__forestLevelDebug.state.units.find(u=>u.id==='woodcutter').currentHp);
 assert.equal(await pc.locator('#end-turn').isEnabled(),true);
 await pc.locator('#end-turn').click();
 await pc.waitForFunction(()=>window.__forestLevelDebug.state.phase==='enemy',null,{timeout:10000});
 assert.equal(await pc.locator('#combat-phase').isVisible(),false,
  'enemy phase text should never appear on screen');
 assert.equal(await pc.locator('#end-turn').isVisible(),false,
  'no waiting-for-enemy-action button or label');
 assert.equal(await pc.locator('.enemy-intent').count(),0,
  'the enemy attack/guard intention tags are entirely removed');
 await screenshot(pc,'03b-enemy-attacks-without-telegraphs-desktop');
 await pc.waitForFunction(()=>window.__forestLevelDebug.state.turn===2&&
   window.__forestLevelDebug.state.phase==='active',null,{timeout:18000});
 assert.equal(await pc.evaluate(()=>window.__forestHand.snapshot.count),preAttackHand-1,
  'a new round MUST NOT automatically draw anything');
 // The physical box is already expanded from the first round.
 assert.equal(await pc.evaluate(()=>window.__sceneCardHUD.pointFor('deck:guardian')),null,
  'no guardian character means NO guardian card pile');
 const handBeforeReDraw=await pc.evaluate(()=>window.__forestHand.snapshot.count);
 await clickCard(pc,'deck:woodcutter');
 await pc.waitForFunction(n=>window.__forestHand.snapshot.count===n+1,handBeforeReDraw,{timeout:10000});
 assert.equal(await pc.evaluate(()=>window.__forestHand.snapshot.hand.at(-1).ownerId),'woodcutter');
 const heroAfterEnemy=await pc.evaluate(()=>window.__forestLevelDebug.state.units.find(u=>u.id==='woodcutter').currentHp);
 assert.ok(heroAfterEnemy<heroBeforeEnemy,'surviving enemies deal damage only in their turn');
 await screenshot(pc,'03c-round-two-desktop');
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
 await verifyApprovedReferenceLayout(phone,'phone');
 await verifyStage01ColorAndLighting(phone,'phone');
 await verifyPhysicalFrame(phone,'phone');
 await verifySpatialShadowMap(phone,'phone');
 await verifySixLayerVisualEffects(phone,'phone');
 await verifyCloudAndResolution(phone,'phone');
 await screenshot(phone,'05a-board-clear-no-deck-phone');
 await showTray(phone);
 await verifyBox(phone,'phone');
 await verifyFixedCamera(phone,'phone');
 await phone.waitForTimeout(250);
 await screenshot(phone,'05-static-seven-bay-box-phone');
 await deploy(phone);
 await verifyCardStats(phone,'phone');
 await clickCard(phone,'deck:woodcutter');
 await phone.waitForFunction(()=>window.__forestHand.snapshot.count===1,{timeout:10000});
 await screenshot(phone,'06-static-hand-phone');
 assert.equal(await phone.evaluate(()=>window.__forestHand.snapshot.count),1,
  'on phone a single manual box tap draws exactly one, never an automatic hand');
 // The portrait preset fits all 16 columns at the same locked 78-degree angle.
 await verifyFixedCamera(phone,'phone');
 await phone.waitForTimeout(450);
 await screenshot(phone,'07-deployed-board-phone');
 await hideTray(phone);
 await verifyRestingCardsStatic(phone,'phone');
 await screenshot(phone,'07a-farmland-board-clear-no-deck-phone');
 assert.equal(await phone.locator('#end-turn').isEnabled(),true);
 assert.ok((await phone.locator('#combat-phase').textContent()).includes('回合'));
 assert.equal(await phone.locator('.enemy-intent').count(),0,
  'enemy attacks may animate but intentions are never previewed on-screen');
 // Chapter 2 is a separate level manifest, not a copy-pasted combat engine.
 // Check the actual Anima-registered farmer, two consecutive deployments and
 // independent engineer FACILITY card placement on a real WebGL scene.
 const chapter2=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 chapter2.on('pageerror',e=>errors.push('CHAPTER2 '+String(e)));
 await chapter2.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html?level=forest-02',
  {waitUntil:'networkidle',timeout:65000});
 await chapter2.waitForFunction(()=>window.__forestLevelDebug?.levelId==='forest-02',null,{timeout:35000});
 const levelTwo=await chapter2.evaluate(()=>window.__forestLevelDebug.state);
 assert.equal(levelTwo.units.filter(u=>u.side==='ally').length,2);
 assert.equal(levelTwo.units.filter(u=>u.side==='enemy').length,3);
 assert.equal(levelTwo.phase,'deployment');
 assert.ok(levelTwo.units.some(u=>u.id==='farmer'&&
  u.characterId==='farmer-engineer-farmer'&&u.role==='engineer'&&!u.deployed));
 await showTray(chapter2);
 await verifyBox(chapter2,'level-two');
 assert.equal(await chapter2.evaluate(()=>window.__sceneCardHUD.pointFor('deck:huntress')),null);
 await clickCard(chapter2,'character:woodcutter');
 const placeUnit=async(unitId,r,c)=>{
  const slot=await chapter2.evaluate(({r,c})=>window.__forestLevelDebug.slotPoints
   .find(p=>p.zone==='unit'&&p.side==='ally'&&p.r===r&&p.c===c).point,{r,c});
  await chapter2.mouse.click(slot.x,slot.y);
  await chapter2.waitForFunction(id=>window.__forestLevelDebug.state.units
   .find(u=>u.id===id).deployed===true,unitId,{timeout:15000});
 };
 await placeUnit('woodcutter',1,0);
 assert.equal(await chapter2.evaluate(()=>window.__forestLevelDebug.state.phase),'deployment',
  'the farmer must still be deployed before the encounter starts');
 await clickCard(chapter2,'character:farmer');
 await placeUnit('farmer',1,2);
 await chapter2.waitForFunction(()=>window.__forestLevelDebug.state.phase==='active',null,{timeout:10000});
 const attachedFarmer=await chapter2.evaluate(()=>window.__forestLevelDebug.cardStats.units
  .find(u=>u.unitId==='farmer'));
 assert.equal(attachedFarmer.attack,2);
 assert.equal(attachedFarmer.maxHp,10);
 assert.equal(await chapter2.locator('.enemy-intent').count(),0);
 await screenshot(chapter2,'08-second-level-farmer-and-woodcutter');
 const field=await plantFarmerCard(chapter2,'farm-field','left');
 assert.deepEqual(field.footprint,[1,1]);
 assert.equal(field.profession,'engineer');
 assert.equal(await chapter2.evaluate(()=>window.__forestLevelDebug.attack('bandit-bruiser-a')),false,
  'farmer facility card must NEVER be treated as a normal attack');
 await screenshot(chapter2,'09-farmer-physical-farm-field');
 await chapter2.locator('#end-turn').click();
 await chapter2.waitForFunction(()=>window.__forestLevelDebug.state.turn===2&&
  window.__forestLevelDebug.state.phase==='active',null,{timeout:18000});
 const life=await chapter2.evaluate(()=>window.__forestLevelDebug.essence.life);
 assert.ok(life>=1,'farm produces shared life essence at the next player upkeep');
 assert.equal(await chapter2.locator('.enemy-intent').count(),0,
  'enemy actions are never telegraphed even when bandit skills vary');
 await chapter2.close();
 // Probe a real DPR=2 backing buffer on a small mobile viewport; this used
 // to be hard-capped at 1.25 despite the device's actual pixel density.
 const retina=await browser.newPage({viewport:{width:180,height:320},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 retina.on('pageerror',e=>errors.push('RETINA '+String(e)));
 await retina.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html?quality=high',
  {waitUntil:'domcontentloaded',timeout:65000});
 await retina.waitForFunction(()=>window.__forestLevelDebug?.performance?.canvasPixels>0,{timeout:25000});
 const retinaPerf=await retina.evaluate(()=>window.__forestLevelDebug.performance);
 assert.ok(retinaPerf.renderedDevicePixelRatio>=1.95,
  'HiDPI mode must render near full physical pixels instead of stretching CSS pixels');
 assert.equal(retinaPerf.qualityMode,'high');
 console.log('FOREST_PHONE_RETINA_RENDER_PASS',JSON.stringify(retinaPerf));
 await retina.close();
 assert.deepEqual(errors,[]);
 console.log('ROUND_COMPACT_WHITEBOX_BROWSER_PASS',JSON.stringify({desktop:true,phone:true,sevenCompartments:true,noLid:true,noFlip:true,noClipping:true,clickDeployment:true,clickDraw:true,clickPlay:true,sceneSwitch:true,full96VoxelTerrain:true,facilitySlots:48,userOriginalArtwork:true,farmFacilityPlacement:true,deckTrayCollapsesByDefault:true,drawerRestoresSevenPhysicalPiles:true,physical3DFrame:true,simpleGoldRing:true,cssFrameRemoved:true,sixVisualLayers:true,realBeforeAfter:true,errors}));
}finally{await browser.close();}

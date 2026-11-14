import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/forest-level-01';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function click3D(page,id){
 const point=await page.evaluate(id=>window.__sceneCardHUD?.pointFor(id),id);
 assert.ok(point&&Number.isFinite(point.x)&&Number.isFinite(point.y),'Missing 3D hit point '+id);
 await page.mouse.move(point.x,point.y);
 await page.waitForTimeout(55);
 await page.mouse.click(point.x,point.y);
 return point;
}
async function deploy(page){
 await click3D(page,'character:woodcutter');
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.placement.selected),'woodcutter');
 const slot=await page.evaluate(()=>window.__forestLevelDebug.slotPoints.find(p=>p.side==='ally'&&p.r===0&&p.c===1));
 assert.ok(slot?.point);
 await page.mouse.click(slot.point.x,slot.point.y);
 await page.waitForFunction(()=>window.__forestLevelDebug?.state.phase==='active'&&window.__sceneCardHUD?.snapshot.stagedCharacterCards===0,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0,'Manual deployment MUST NOT deal five automatic cards');
}
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];const assetResponses=[];
 page.on('pageerror',e=>{errors.push(String(e));console.log('DESKTOP_PAGE_ERROR',String(e).slice(0,650));});
 page.on('console',m=>{if(m.type()==='error')console.log('DESKTOP_CONSOLE_ERROR',m.text().slice(0,240));});
 page.on('response',r=>{if(r.url().includes('/assets/characters/farmer-faction/'))assetResponses.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visibleDeckPiles===7&&!!window.__forestHand&&!!window.__forestLevelDebug,{timeout:20000});
 const init=await page.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,deck:window.__forestHand.snapshot,
    phase:window.__forestLevelDebug.state.phase,slots:window.__forestLevelDebug.slots.length,
    domHand:!!document.getElementById('action-hand'),viewport:{w:innerWidth,h:innerHeight}}));
 console.log('SEVEN_IDENTICAL_FACE_UP_PILES_INITIAL',JSON.stringify(init));
 assert.equal(init.slots,18);
 assert.equal(init.phase,'deployment');
 assert.equal(init.deck.count,0,'initial hand must be zero');
 assert.equal(init.hud.count,0);
 assert.equal(init.hud.visibleDeckPiles,7,'seven 3D decks in ONE bottom row');
 assert.equal(init.hud.deckArrangement,'seven-identical-bottom-row');
 assert.equal(init.hud.standaloneTurnCard,false,'remove the unrelated floating end-turn card');
 assert.equal(init.hud.visible.filter(x=>x.kind==='turn').length,0);
 assert.ok(init.hud.deckTiltRadians<-.90&&init.hud.deckTiltRadians>-1.45,
   'all seven physical piles must have a flatter matching tabletop perspective');
 assert.equal(init.hud.sameFacePrototype,true);
 const firstPile=init.hud.visible.filter(x=>x.kind==='deck');
 assert.equal(firstPile.length,7);
 assert.equal(firstPile.every(x=>Math.abs(x.y-firstPile[0].y)<.00001),true,
   'physical decks must share ONE baseline');
 assert.equal(firstPile.every((x,i)=>i===0||x.x>firstPile[i-1].x),true,
   'physical decks must be in one ordered row');

 assert.equal(init.hud.physicalDeckCards,70,'7 separate 10-card decks must each have physical face-up cards');
 assert.equal(init.hud.physicalBoxes,0,'no giant wooden box or trays');
 assert.equal(init.hud.faceUpDeck,true,'all cards face up');
 assert.equal(init.hud.coveredCardEdgeLOD,true,'hidden card faces are not redrawn 63 times');
 assert.equal(init.hud.stagedCharacterCards,1,'hero is on top of deck');
 assert.equal(init.hud.hasDomCards,false,'no webpage cards');
 assert.equal(init.domHand,false);
 assert.equal(init.hud.backgroundPanel,false);
 const objectIntro=await page.evaluate(()=>window.__forestLevelDebug.objectAnimations);
 assert.ok(objectIntro.tracked>=40,'trees, tiles and 3D cards share spring animation tracks');
 assert.ok(init.hud.animatedCardMeshes>=70,'each face-up physical card has a 3D entrance animation');
 await page.waitForTimeout(600);
 await page.screenshot({path:out+'/01-seven-decks-with-hero-desktop.png',fullPage:true});
 // The visible in-game button must actually play exit -> world replacement ->
 // staggered entrance. It is NOT enough to unit test the animation engine.
 const initialBattle=await page.evaluate(()=>({
  state:window.__forestLevelDebug.state,
  hand:window.__forestHand.snapshot,
  environment:window.__forestLevelDebug.environment
 }));
 assert.equal(initialBattle.environment.id,'forest');
 assert.equal(initialBattle.environment.material,'grass');
 assert.ok(initialBattle.environment.ground.width>=40&&initialBattle.environment.ground.depth>=45,
  'forest must have continuous modeled floor OUTSIDE the 18 tactical cells');
 const scenePerf=await page.evaluate(()=>window.__forestLevelDebug.performance);
 assert.ok(scenePerf.drawCalls<390,'covered card LOD should reduce WebGL draw calls');
 assert.ok(scenePerf.canvasPixels>0);
 console.log('FOREST_PERFORMANCE',JSON.stringify(scenePerf));
 assert.equal(await page.locator('#scene-switch').count(),1);
 await page.locator('#scene-switch').click();
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.sceneSwitch.phase),'exiting');
 assert.equal(await page.locator('#scene-switch').isDisabled(),true,'prevent interrupted scene transitions');
 await page.waitForFunction(()=>{
  const v=window.__forestLevelDebug,p=v?.objectPose('unit:forest-foe-a');
  return v?.sceneSwitch.phase==='exiting'&&p?.phase==='exit'&&p.scale<.96;
 },{timeout:12000});
 const exitPose=await page.evaluate(()=>window.__forestLevelDebug.objectPose('unit:forest-foe-a'));
 assert.equal(exitPose.phase,'exit');
 assert.ok(exitPose.scale<1&&exitPose.scale>0,'old 3D units must shrink before switching');
 await page.screenshot({path:out+'/00a-forest-all-meshes-shrink-away.png',fullPage:true});
 // Chromium GPU screenshots can take longer than the short entering phase.
 // Assert the material really changed, regardless of whether a screenshot
 // happened while the spring animation was still in flight.
 await page.waitForFunction(()=>window.__forestLevelDebug?.environment.id==='clearing',
   null,{timeout:16000});
 const newScene=await page.evaluate(()=>({
  environment:window.__forestLevelDebug.environment,
  state:window.__forestLevelDebug.state,
  hand:window.__forestHand.snapshot
 }));
 assert.equal(newScene.environment.material,'dirt','scene switch must change true world material');
 assert.ok(newScene.environment.ground.width>=40&&newScene.environment.ground.depth>=45,
  'rock clearing must also have a real surrounding 3D floor');
 assert.ok(newScene.environment.props>10,'stone clearing needs its own real 3D props');
 assert.deepEqual(newScene.state,initialBattle.state,'scene switch must NOT restart battle state');
 assert.deepEqual(newScene.hand,initialBattle.hand,'scene switch must NOT touch any action decks');
 const growPose=await page.evaluate(()=>window.__forestLevelDebug.objectPose('terrain:0:0'));
 assert.ok(['enter','steady'].includes(growPose.phase),
  'new scene terrain must be in its spring entrance or finished stable');
 await page.screenshot({path:out+'/00b-stone-clearing-meshes-growing.png',fullPage:true});
 await page.waitForFunction(()=>window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:10000});
 assert.equal(await page.locator('#scene-switch').isEnabled(),true);
 await page.screenshot({path:out+'/00c-stone-clearing-scene-complete.png',fullPage:true});
 await page.locator('#scene-switch').click();
 await page.waitForFunction(()=>window.__forestLevelDebug.sceneSwitch.phase==='idle'&&
   window.__forestLevelDebug.environment.id==='forest',{timeout:12000});
 const returned=await page.evaluate(()=>({
  environment:window.__forestLevelDebug.environment,
  state:window.__forestLevelDebug.state,
  hand:window.__forestHand.snapshot
 }));
 assert.equal(returned.environment.material,'grass','return to forest restores true grass terrain');
 assert.deepEqual(returned.state,initialBattle.state,'returning must preserve pre-deployment state');
 assert.deepEqual(returned.hand,initialBattle.hand,'returning must preserve deck order and counts');
 await page.screenshot({path:out+'/00d-returned-to-forest.png',fullPage:true});

 await deploy(page);
 await page.screenshot({path:out+'/02-seven-decks-deployed-desktop.png',fullPage:true});
 await click3D(page,'deck:warrior');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),1,'one manual click draws exactly one card');
 await page.waitForTimeout(350);
 await page.screenshot({path:out+'/03-first-manual-draw-desktop.png',fullPage:true});
 for(let i=0;i<9;i++){
  const before=await page.evaluate(()=>window.__forestHand.snapshot.count);
  await page.waitForTimeout(125);
  const at=await click3D(page,'deck:warrior');
  const after=await page.evaluate(()=>window.__forestHand.snapshot.count);
  if(after!==before+1){
   const probe=await page.evaluate(pt=>({
    hit:window.__sceneCardHUD.hit({clientX:pt.x,clientY:pt.y})?.id,
    model:window.__forestHand.snapshot
   }),at);
   console.log('MISSED_DECK_CLICK',JSON.stringify({before,after,at,probe}));
  }
  assert.equal(after,before+1,'every physical deck click must remove exactly one card');
 }
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot.visible.filter(x=>x.kind==='hand').length===10,{timeout:8000});
 const full=await page.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,hand:window.__forestHand.snapshot}));
 assert.equal(full.hand.count,10);
 assert.equal(full.hud.visible.filter(p=>p.kind==='hand').length,10);
 assert.equal(full.hud.physicalDeckCards,60,'six untouched stacks must still have ten cards each');
 await page.waitForTimeout(600); // Wait for last deck-to-hand animation to finish.
 await page.screenshot({path:out+'/04-seven-stacks-and-ten-hand-desktop.png',fullPage:true});
 const chosen=full.hand.hand[2];
 await click3D(page,'hand:'+chosen.instance);
 assert.equal(await page.evaluate(()=>window.__forestHand.selected),chosen.instance,'arbitrary third hand card must be selectable');
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.attack('forest-foe-a')),true);
 const after=await page.evaluate(()=>window.__forestHand.snapshot);
 assert.equal(after.count,9);
 assert.equal(after.locked,true);
 assert.equal(await page.evaluate(()=>window.__forestHand.draw('warrior').reason),'draw-locked');
 await page.screenshot({path:out+'/05-middle-card-played-draw-locked.png',fullPage:true});
 // Retain tactical grid, particles and win condition after render-only UI overhaul.
 const fx=await page.evaluate(()=>{
  const v=window.__forestLevelDebug;
  const ok=v.adjust(1,0,1);
  return{ok,snapshot:v.effects,pose:v.objectPose('terrain:1:0')};
 });
 assert.equal(fx.ok,true);assert.ok(fx.snapshot.particleCount>0);
 assert.equal(fx.pose.phase,'pulse','terraforming must make a 3D terrain block bounce');
 await page.waitForTimeout(850);
 let played=1;
 while(played<9){
  const alive=await page.evaluate(()=>window.__forestLevelDebug.state.units.filter(u=>u.side==='enemy'&&u.alive).map(u=>u.id));
  if(!alive.length)break;
  const hand=await page.evaluate(()=>window.__forestHand.snapshot.hand);
  assert.ok(hand.length,'Insufficient actions to win');
  assert.equal(await page.evaluate(id=>window.__forestHand.selectCard(id),hand[Math.floor(hand.length/2)].instance),true);
  assert.equal(await page.evaluate(id=>window.__forestLevelDebug.attack(id),alive[0]),true);
  played++;
 }
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.state.phase),'victory');
 const defeated=await page.evaluate(()=>window.__forestLevelDebug.objectPose('unit:forest-foe-b'));
 assert.equal(defeated.phase,'exit','defeated enemy must SHRINK before mesh removal');
 await page.waitForFunction(()=>window.__forestLevelDebug.units.filter(u=>u.side==='enemy').length===0,
   {timeout:9000});
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.units.filter(u=>u.side==='enemy').length),0,
  'defeated enemy meshes must be removed only after the exit animation');
 await page.locator('#level-retry').click();
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.state.phase),'deployment');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
 // The level's reset is synchronous; the 3D scene is rebuilt on the next frame.
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot.stagedCharacterCards===1,
   {timeout:15000});
 // Every pile is interactive in this temporary all-equal visual prototype;
 // drawing from one never removes a card from the other six physical piles.
 await deploy(page);
 const beforeByProfession=await page.evaluate(()=>({
  engineer:window.__forestHand.remainingCards('engineer').length,
  warrior:window.__forestHand.remainingCards('warrior').length
 }));
 assert.equal(beforeByProfession.engineer,10);
 assert.equal(beforeByProfession.warrior,10);
 await click3D(page,'deck:engineer');
 const afterByProfession=await page.evaluate(()=>({
  engineer:window.__forestHand.remainingCards('engineer').length,
  warrior:window.__forestHand.remainingCards('warrior').length,
  hand:window.__forestHand.snapshot.count
 }));
 assert.equal(afterByProfession.engineer,9,'each of seven visual piles is a real separate stack');
 assert.equal(afterByProfession.warrior,10,'warrior stack must not shrink when engineer was clicked');
 assert.equal(afterByProfession.hand,1);
 await page.screenshot({path:out+'/05b-independent-deck-draw-desktop.png',fullPage:true});
 assert.deepEqual(errors,[],'no desktop script errors');
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await mobile.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visibleDeckPiles===7,{timeout:20000});
 const mobileInit=await mobile.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,hand:window.__forestHand.snapshot,
   slots:window.__forestLevelDebug.slotPoints.filter(s=>s.side==='ally').map(s=>({x:s.point.x,y:s.point.y}))}));
 assert.equal(mobileInit.hand.count,0);
 const mobilePerf=await mobile.evaluate(()=>window.__forestLevelDebug.performance);
 assert.ok(mobilePerf.renderRatio<=1.26,'mobile physical resolution is capped for performance');
 assert.ok(mobilePerf.drawCalls<390);
 console.log('MOBILE_PERFORMANCE',JSON.stringify(mobilePerf));
 assert.equal(mobileInit.hud.physicalDeckCards,70);
 assert.equal(mobileInit.hud.stagedCharacterCards,1);
 assert.equal(mobileInit.hud.visible.filter(p=>p.kind==='deck').length,7);
 assert.equal(mobileInit.hud.visible.filter(p=>p.kind==='turn').length,0);
 await mobile.screenshot({path:out+'/06-seven-decks-hero-mobile.png',fullPage:true});
 assert.equal(await mobile.locator('#scene-switch').isVisible(),true,
  'mobile must expose the same scene switch button');
 await mobile.locator('#scene-switch').click();
 await mobile.waitForFunction(()=>window.__forestLevelDebug.environment.id==='clearing',
  null,{timeout:16000});
 await mobile.screenshot({path:out+'/06a-scene-transition-stone-clearing-mobile.png',fullPage:true});
 await mobile.waitForFunction(()=>window.__forestLevelDebug.sceneSwitch.phase==='idle',{timeout:10000});
 assert.equal(await mobile.evaluate(()=>window.__forestLevelDebug.environment.material),'dirt');
 await mobile.screenshot({path:out+'/06b-stone-clearing-complete-mobile.png',fullPage:true});
 await mobile.locator('#scene-switch').click();
 await mobile.waitForFunction(()=>window.__forestLevelDebug.sceneSwitch.phase==='idle'&&
  window.__forestLevelDebug.environment.id==='forest',{timeout:12000});
 assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),0);

 await deploy(mobile);
 await click3D(mobile,'deck:warrior');
 assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),1);
 await mobile.screenshot({path:out+'/07-one-card-drawn-mobile.png',fullPage:true});
 for(let i=0;i<9;i++){
  const before=await mobile.evaluate(()=>window.__forestHand.snapshot.count);
  await mobile.waitForTimeout(110);
  await click3D(mobile,'deck:warrior');
  assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),before+1,
    'mobile deck tap must draw exactly one');
 }
 assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),10);
 await mobile.waitForTimeout(600);
 await mobile.screenshot({path:out+'/08-ten-cards-mobile.png',fullPage:true});
 assert.deepEqual(mobileErrors,[],'no mobile script errors');
 console.log('FOREST_SEVEN_DECKS_BROWSER_PASS',JSON.stringify({desktop:true,mobile:true,sevenPhysicalPiles:true,identicalPrototype:true,removedFloatingTurnCard:true,
  faceUp:true,openingHand:0,noAutoDeal:true,tenHandCap:true,manualDraw:true,
  arbitraryCardPlay:true,lockAfterPlay:true,sceneSwitchButton:true,fullExitSwapEnter:true,
  reverseSceneSwitch:true,mobileSceneSwitch:true,particles:fx.snapshot.particleCount,images:assetResponses,errors}));
}finally{await browser.close();}

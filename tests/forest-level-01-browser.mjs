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
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')console.log('DESKTOP_CONSOLE_ERROR',m.text().slice(0,240));});
 page.on('response',r=>{if(r.url().includes('/assets/characters/farmer-faction/'))assetResponses.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visibleDeckPiles===1&&!!window.__forestHand&&!!window.__forestLevelDebug,{timeout:20000});
 const init=await page.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,deck:window.__forestHand.snapshot,
    phase:window.__forestLevelDebug.state.phase,slots:window.__forestLevelDebug.slots.length,
    domHand:!!document.getElementById('action-hand'),viewport:{w:innerWidth,h:innerHeight}}));
 console.log('SINGLE_FACE_UP_DECK_INITIAL',JSON.stringify(init));
 assert.equal(init.slots,18);
 assert.equal(init.phase,'deployment');
 assert.equal(init.deck.count,0,'initial hand must be zero');
 assert.equal(init.hud.count,0);
 assert.equal(init.hud.visibleDeckPiles,1,'exactly one deck, not seven');
 assert.equal(init.hud.physicalDeckCards,10,'deck has ten individual 3D action cards');
 assert.equal(init.hud.physicalBoxes,1);
 assert.equal(init.hud.faceUpDeck,true,'all cards face up');
 assert.equal(init.hud.stagedCharacterCards,1,'hero is on top of deck');
 assert.equal(init.hud.hasDomCards,false,'no webpage cards');
 assert.equal(init.domHand,false);
 assert.equal(init.hud.backgroundPanel,false);
 await page.waitForTimeout(600);
 await page.screenshot({path:out+'/01-one-deck-hero-on-top-desktop.png',fullPage:true});
 await deploy(page);
 await page.screenshot({path:out+'/02-deployed-zero-hand-desktop.png',fullPage:true});
 await click3D(page,'deck:warrior');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),1,'one manual click draws exactly one card');
 await page.waitForTimeout(350);
 await page.screenshot({path:out+'/03-first-manual-draw-desktop.png',fullPage:true});
 for(let i=0;i<9;i++)await click3D(page,'deck:warrior');
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot.count===10,{timeout:8000});
 const full=await page.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,hand:window.__forestHand.snapshot}));
 assert.equal(full.hand.count,10);
 assert.equal(full.hud.visible.filter(p=>p.kind==='hand').length,10);
 assert.equal(full.hud.physicalDeckCards,0);
 await page.screenshot({path:out+'/04-ten-front-facing-cards-desktop.png',fullPage:true});
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
 const fx=await page.evaluate(()=>{const v=window.__forestLevelDebug;return{ok:v.adjust(1,0,1),snapshot:v.effects};});
 assert.equal(fx.ok,true);assert.ok(fx.snapshot.particleCount>0);
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
 await page.locator('#level-retry').click();
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.state.phase),'deployment');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0);
 assert.deepEqual(errors,[],'no desktop script errors');
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await mobile.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visibleDeckPiles===1,{timeout:20000});
 const mobileInit=await mobile.evaluate(()=>({hud:window.__sceneCardHUD.snapshot,hand:window.__forestHand.snapshot,
   slots:window.__forestLevelDebug.slotPoints.filter(s=>s.side==='ally').map(s=>({x:s.point.x,y:s.point.y}))}));
 assert.equal(mobileInit.hand.count,0);
 assert.equal(mobileInit.hud.physicalDeckCards,10);
 assert.equal(mobileInit.hud.stagedCharacterCards,1);
 assert.equal(mobileInit.hud.visible.filter(p=>p.kind==='deck').length,1);
 await mobile.screenshot({path:out+'/06-one-deck-hero-mobile.png',fullPage:true});
 await deploy(mobile);
 await click3D(mobile,'deck:warrior');
 assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),1);
 await mobile.screenshot({path:out+'/07-one-card-drawn-mobile.png',fullPage:true});
 for(let i=0;i<9;i++)await click3D(mobile,'deck:warrior');
 assert.equal(await mobile.evaluate(()=>window.__forestHand.snapshot.count),10);
 await mobile.screenshot({path:out+'/08-ten-cards-mobile.png',fullPage:true});
 assert.deepEqual(mobileErrors,[],'no mobile script errors');
 console.log('FOREST_SINGLE_DECK_BROWSER_PASS',JSON.stringify({desktop:true,mobile:true,onePhysicalPile:true,
  faceUp:true,openingHand:0,noAutoDeal:true,tenHandCap:true,manualDraw:true,
  arbitraryCardPlay:true,lockAfterPlay:true,particles:fx.snapshot.particleCount,images:assetResponses,errors}));
}finally{await browser.close();}

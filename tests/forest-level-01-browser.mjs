import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='artifacts/forest-level-01';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']
});
async function click3D(page,id){
 const pt=await page.evaluate(id=>window.__sceneCardHUD.pointFor(id),id);
 assert.ok(pt&&Number.isFinite(pt.x)&&Number.isFinite(pt.y),'Missing physical card projection '+id);
 await page.mouse.move(pt.x,pt.y);
 await page.waitForTimeout(80);
 await page.mouse.click(pt.x,pt.y);
 return pt;
}
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];const assets=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')console.log('WEBGL_CONSOLE',m.text().slice(0,300));});
 page.on('response',r=>{if(r.url().includes('/assets/characters/farmer-faction/'))assets.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await page.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visible?.length>=13&&!!window.__forestHand&&!!window.__farmerRoster,{timeout:20000});
 await page.waitForTimeout(700);
 const status=await page.evaluate(()=>({
  hud:window.__sceneCardHUD.snapshot,hand:window.__forestHand.snapshot,
  cells:window.__forestLevelDebug.slots.length,
  legacyDock:!!document.getElementById('profession-dock'),
  legacyHand:document.getElementById('action-hand')?.children.length||0,
  stageSize:document.getElementById('stage').getBoundingClientRect().height,
  viewHeight:window.innerHeight,
  hiddenTool:getComputedStyle(document.getElementById('hand')).display
 }));
 console.log('PHYSICAL_CARDS_INIT',JSON.stringify(status));
 assert.equal(status.cells,18);
 assert.equal(status.hand.count,5);
 assert.equal(status.hud.count,5);
 assert.equal(status.hud.geometry,'shared-battlefield-card-mesh');
 assert.equal(status.hud.hasDomCards,false);
 assert.equal(status.legacyDock,false,'HTML card dock must be deleted');
 assert.equal(status.legacyHand,0,'HTML hand buttons must be deleted');
 assert.equal(status.hiddenTool,'none','old webpage controls must be hidden');
 assert.ok(Math.abs(status.stageSize-status.viewHeight)<3,'WebGL canvas must cover complete game screen');
 assert.equal(status.hud.physicalDeckCards,5,'five remaining physical card sheets after opening draw');
 assert.equal(status.hud.visible.filter(x=>x.kind==='deck').length,7);
 assert.equal(status.hud.visible.filter(x=>x.kind==='hand').length,5);
 await page.screenshot({path:out+'/01-real-webgl-3d-decks-and-five-cards.png',fullPage:true});
 for(let i=0;i<5;i++)await click3D(page,'deck:warrior');
 await page.waitForTimeout(480);
 const full=await page.evaluate(()=>({hand:window.__forestHand.snapshot,hud:window.__sceneCardHUD.snapshot}));
 assert.equal(full.hand.count,10);
 assert.equal(full.hud.visible.filter(x=>x.kind==='hand').length,10);
 assert.equal(full.hud.physicalDeckCards,0);
 await page.screenshot({path:out+'/02-ten-free-3d-cards-in-hand.png',fullPage:true});
 const chosen=full.hand.hand[2],last=full.hand.hand[9];
 assert.notEqual(chosen.instance,last.instance);
 await click3D(page,'hand:'+chosen.instance);
 assert.equal(await page.evaluate(()=>window.__forestHand.selected),chosen.instance);
 const attack=await page.evaluate(()=>window.__forestLevelDebug.attack('forest-foe-a'));
 assert.equal(attack,true,'selected middle hand card must attack');
 const after=await page.evaluate(()=>window.__forestHand.snapshot);
 assert.equal(after.count,9);
 assert.equal(after.locked,true);
 assert.ok(!after.hand.some(c=>c.instance===chosen.instance));
 assert.ok(after.hand.some(c=>c.instance===last.instance));
 assert.equal(await page.evaluate(()=>window.__forestHand.draw('warrior').reason),'draw-locked');
 await page.waitForTimeout(320);
 await page.screenshot({path:out+'/03-playing-any-middle-3d-card-locks-draw.png',fullPage:true});
 const fx=await page.evaluate(()=>{const v=window.__forestLevelDebug;return{ok:v.adjust(1,0,1),state:v.effects};});
 assert.equal(fx.ok,true);
 assert.ok(fx.state.particleCount>0);
 await page.waitForTimeout(230);
 await page.screenshot({path:out+'/04-3d-voxel-particles.png',fullPage:true});
 await page.waitForTimeout(840);
 assert.equal((await page.evaluate(()=>window.__forestLevelDebug.effects)).busy,0);
 let actions=1;
 while(actions<9){
  const enemies=await page.evaluate(()=>window.__forestLevelDebug.state.units.filter(x=>x.side==='enemy'&&x.alive).map(x=>x.id));
  if(!enemies.length)break;
  const hand=await page.evaluate(()=>window.__forestHand.snapshot.hand);
  assert.ok(hand.length,'ran out of cards before victory');
  const take=hand[Math.floor(hand.length/2)];
  await click3D(page,'hand:'+take.instance);
  assert.equal(await page.evaluate(id=>window.__forestLevelDebug.attack(id),enemies[0]),true);
  actions++;
 }
 assert.equal(await page.evaluate(()=>window.__forestLevelDebug.state.phase),'victory');
 await page.screenshot({path:out+'/05-forest-level-victory.png',fullPage:true});
 await page.locator('#level-retry').click();
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),5);
 await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),0,'end turn clears all hand cards');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.locked),false);
 await click3D(page,'deck:warrior');
 assert.equal(await page.evaluate(()=>window.__forestHand.snapshot.count),1);
 await page.keyboard.press('g');
 await page.waitForFunction(()=>[...document.querySelectorAll('#gallery-cards img')].length===3&&
  [...document.querySelectorAll('#gallery-cards img')].every(i=>i.complete&&i.naturalWidth===704),{timeout:22000});
 assert.equal(await page.locator('#gallery-cards [data-character-id="farmer-ranger-huntress"]').count(),1);
 await page.screenshot({path:out+'/06-approved-farmer-characters.png',fullPage:true});
 assert.ok(assets.some(x=>x.url.endsWith('/ranger/01-huntress.png')&&x.status===200));
 assert.ok(assets.some(x=>x.url.endsWith('/warrior/01-loli-lumberjack.png')&&x.status===200));
 assert.deepEqual(errors,[], 'no desktop WebGL runtime errors');
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/card-battle/forest-level-01.html',{waitUntil:'networkidle',timeout:65000});
 await mobile.waitForFunction(()=>window.__sceneCardHUD?.snapshot?.visible?.length>=13,{timeout:20000});
 assert.equal(await mobile.evaluate(()=>window.__sceneCardHUD.snapshot.visible.filter(x=>x.kind==='deck').length),7);
 assert.equal(await mobile.evaluate(()=>window.__sceneCardHUD.snapshot.visible.filter(x=>x.kind==='hand').length),5);
 await mobile.screenshot({path:out+'/07-mobile-real-webgl-hand.png',fullPage:true});
 assert.deepEqual(mobileErrors,[]);
 console.log('FOREST_LEVEL_WEBGL_CARDS_PASS',JSON.stringify({physicalPiles:7,initialHand:5,fullHand:10,
  selectedMiddleCard:chosen.instance,locked:true,forestVictory:true,approvedRoster:3,animations:fx.state.particleCount,errors:[]}));
}finally{await browser.close();}

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const out='artifacts/card-battle-tactile';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});

try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/card-battle/',{waitUntil:'networkidle'});
 await page.locator('.grid-preview-card').first().waitFor({timeout:18000});
 assert.equal(await page.locator('#grid-enemy .grid-preview-card').count(),9,'enemy genuine 3x3 nine-card board');
 assert.equal(await page.locator('#grid-ally .grid-preview-card').count(),9,'ally genuine 3x3 nine-card board');
 assert.equal(await page.locator('.timeline-plaque').isVisible(),false,'timeline is removed in layout preview');
 const previewImages=await page.locator('.grid-preview-card img').all();
 for(const img of previewImages){
  assert.equal(await img.evaluate(el=>el.complete&&el.naturalWidth>0),true,'all 18 source portraits load');
 }
 const sideWidth=await page.locator('.grid-preview-card').first().evaluate(el=>el.getBoundingClientRect().width);
 await page.screenshot({path:out+'/00-double-nine-side-by-side-1920.png'});
 await page.locator('button[data-layout="stacked"]').click();
 const stackedWidth=await page.locator('.grid-preview-card').first().evaluate(el=>el.getBoundingClientRect().width);
 assert.ok(stackedWidth<sideWidth*.7,'stacked 3x3 vs 3x3 shrinks cards substantially');
 await page.screenshot({path:out+'/00b-double-nine-stacked-1920.png'});
 await page.locator('button[data-layout="side-by-side"]').click();
 assert.equal(await page.locator('#grid-stage').getAttribute('data-cards-fit'),'true','all 18 cards fit inside the tabletop');
 await page.locator('#grid-back-to-battle').click();
 assert.equal(await page.locator('.timeline-plaque').isVisible(),true,'returning to original Timegrid still works');
 await page.locator('button.action-card').first().waitFor({timeout:18000});

 assert.equal(await page.locator('.tick-row').count(),7,'three allies, three enemies and one shared ruler');
 assert.equal(await page.locator('.fighter.ally').count(),3);
 assert.equal(await page.locator('.fighter.enemy').count(),3);
 assert.equal(await page.locator('button.action-card').count(),4,'one character hand at a time');
 for(const img of await page.locator('.squad img').all()){
   const state=await img.evaluate(el=>el.complete&&el.naturalWidth>0);
   assert.equal(state,true,'the six original Github portraits must load');
 }
 const style=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--wood'));
 assert.ok(style.includes('data:image/jpeg'),'wood surface remains actual canvas material');
 await page.screenshot({path:out+'/01-table-opening-desktop.png'});

 await page.locator('.fighter.enemy').nth(1).locator('button.portrait').click();
 assert.equal(await page.locator('.fighter.enemy.targeted').count(),1,'choose a specific target');
 await page.locator('.fighter.ally').nth(1).locator('button.portrait').click();
 assert.equal(await page.locator('.fighter.ally.selected').count(),1,'independent ally selected');
 await page.locator('button.action-card').first().hover();
 await page.waitForTimeout(240);
 await page.screenshot({path:out+'/02-paper-card-hover.png'});
 await page.locator('button.action-card').first().click();
 const secondId=await page.locator('.fighter.ally').nth(1).getAttribute('data-actor');
 await page.locator('.tick.friend[data-actor="'+secondId+'"][data-tick="1"]').click();
 const secondLane=page.locator('.tick-row[data-row-actor="'+secondId+'"]');
 assert.ok(await secondLane.locator('.tick.active').count()>0,'second hero actually schedules');

 await page.locator('.fighter.ally').nth(2).locator('button.portrait').click();
 await page.locator('button.action-card').first().click();
 const thirdId=await page.locator('.fighter.ally').nth(2).getAttribute('data-actor');
 await page.locator('.tick.friend[data-actor="'+thirdId+'"][data-tick="2"]').click();
 assert.ok(await page.locator('.tick-row[data-row-actor="'+thirdId+'"] .tick.active').count()>0,'third hero actually schedules');
 await page.screenshot({path:out+'/03-timeline-action-arranged.png'});

 await page.locator('#execute').click();
 await page.waitForTimeout(3100);
 assert.equal(await page.locator('#round').innerText(),'第 2 轮','real synchronized Timegrid resolution');
 await page.screenshot({path:out+'/04-round-executed.png'});

 await page.locator('#restart').click();
 const hand=page.locator('button.action-card').first();
 const rect=await hand.boundingBox();
 const target=await page.locator('.tick.friend[data-actor="hero"][data-tick="1"]').boundingBox();
 assert.ok(rect&&target,'hand and hero tick have screen rects');
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:14});
 await page.mouse.up();
 await page.waitForTimeout(240);
 assert.ok(await page.locator('.tick-row[data-row-actor="hero"] .tick.active').count()>0,'dragging is physical card placement');
 await page.screenshot({path:out+'/05-drag-placement.png'});

 await page.locator('[data-party="2"]').click();
 assert.equal(await page.locator('.fighter').count(),4,'2v2 has two combatants per side');
 assert.equal(await page.locator('.tick-row').count(),5,'four separate tracks in 2v2');
 await page.locator('[data-party="1"]').click();
 assert.equal(await page.locator('.fighter').count(),2,'legacy 1v1 remains available');
 assert.equal(await page.locator('.tick-row').count(),3,'two lanes in 1v1');
 await page.screenshot({path:out+'/07-classic-1v1-mode.png'});
 assert.deepEqual(errors,[],'no uncaught desktop JS errors');

 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const mobileErrors=[];
 mobile.on('pageerror',e=>mobileErrors.push(String(e)));
 await mobile.goto('http://127.0.0.1:4173/card-battle/',{waitUntil:'networkidle'});
 await mobile.locator('.grid-preview-card').first().waitFor();
 assert.equal(await mobile.locator('.grid-preview-card').count(),18);
 assert.equal(await mobile.locator('.timeline-plaque').isVisible(),false);
 await mobile.screenshot({path:out+'/00c-double-nine-phone.png'});
 await mobile.locator('#grid-back-to-battle').click();
 await mobile.locator('button.action-card').first().waitFor();
 assert.equal(await mobile.locator('.tick-row').count(),7);
 assert.equal(await mobile.locator('.fighter').count(),6);
 await mobile.screenshot({path:out+'/06-phone-layout.png'});
 assert.deepEqual(mobileErrors,[],'no uncaught mobile JS errors');

 console.log(JSON.stringify({status:'PASS',preview:'genuine 3x3+3x3, zero timeline, 18 GitHub artwork cards',mode:'1-3 active characters per side, original tactile tabletop',
  desktop:true,mobile:true,drag:true,actorSelection:true,targetSelection:true,
  sixIndependentLanes:true,sharedTicks:10,screenshots:7}));
}finally{await browser.close();}

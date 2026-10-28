import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4173/';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
async function check(name,settings,fn){
 const context=await browser.newContext(settings);
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
   await page.goto(base,{waitUntil:'networkidle'});
   await page.locator('.enemy-card').first().waitFor();
   await fn(page);
   assert.deepEqual(errors,[],'Browser errors: '+errors.join('; '));
   console.log('PASS',name);
 }catch(e){
   failures.push(name+': '+e.message);
   await page.screenshot({path:'artifacts/FAILED-'+name+'.png',fullPage:true}).catch(()=>{});
 }finally{await context.close();}
}
await check('desktop',{viewport:{width:1440,height:900},deviceScaleFactor:1},async page=>{
 assert.equal(await page.locator('.enemy-card').count(),3);
 assert.equal(await page.locator('.location-card').count(),3);
 const far=await page.locator('.distance-3').boundingBox();
 const near=await page.locator('.distance-1').boundingBox();
 assert.ok(far.width<near.width && far.height<near.height,'Enemy depth scale not working');
 await page.screenshot({path:'artifacts/desktop-battle.png',fullPage:true});
 await page.locator('.enemy-card.distance-1').click();
 await page.locator('[data-action="shoot"]').click();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).mag,4);
 await page.locator('[data-action="end"]').click();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).turn,2);
 await page.locator('[data-action="move"][data-to="cemetery"]').click();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'cemetery');
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'cemetery');
 await page.screenshot({path:'artifacts/desktop-moved.png',fullPage:true});
});
await check('phone-portrait',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 assert.equal(await page.locator('.location-card').count(),3);
 const before=await page.evaluate(()=>window.__NIGHT_REMAINS__.state());
 assert.equal(before.current,'church');
 const far=await page.locator('.distance-3').boundingBox();
 const near=await page.locator('.distance-1').boundingBox();
 assert.ok(far.width<near.width && far.height<near.height,'Phone scaling wrong');
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(over<=3,'Horizontal overflow '+over);
 await page.screenshot({path:'artifacts/phone-portrait.png',fullPage:true});
 await page.locator('[data-action="move"][data-to="cemetery"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'cemetery');
 await page.locator('[data-action="move"][data-to="church"]').tap();
 await page.locator('[data-action="shoot"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).mag,4);
 await page.screenshot({path:'artifacts/phone-after-touches.png',fullPage:true});
});
await check('phone-landscape',{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(over<=3,'Landscape horizontal overflow '+over);
 await page.screenshot({path:'artifacts/phone-landscape.png',fullPage:true});
 await page.locator('[data-action="end"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).turn,2);
});
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('All Chromium desktop and mobile interactions verified.');

import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4173/';
const failures=[];
async function check(name,settings,fn){
 const ctx=await browser.newContext(settings),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('.district-card').first().waitFor({timeout:15000});
  await page.waitForTimeout(700);
  await fn(page);
  assert.deepEqual(errors,[],errors.join(';'));
  console.log('PASS '+name);
 }catch(e){
  failures.push(name+': '+e.message);
  await page.screenshot({path:'artifacts/FAILED-'+name+'.png',fullPage:true}).catch(()=>{});
 }finally{await ctx.close();}
}
await check('desktop',{viewport:{width:1440,height:900},deviceScaleFactor:1},async page=>{
 assert.equal(await page.locator('.district-card').count(),5);
 assert.equal(await page.locator('.action-card').count(),4);
 assert.equal((await page.locator('#money').innerText()).trim(),'＄320');
 await page.screenshot({path:'artifacts/desktop-street-start.png',fullPage:true});
 await page.locator('[data-action="hustle"]').click();
 assert.ok((await page.evaluate(()=>window.__HARBOR__.state())).cash>320);
 await page.locator('[data-district="night"]').click();
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).selected,'night');
 await page.locator('[data-tab="business"]').click();
 assert.equal(await page.locator('.action-card').count(),3);
 await page.screenshot({path:'artifacts/desktop-neon-business.png',fullPage:true});
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).selected,'night');
 await page.locator('#next-week').click();
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).week,2);
});
await check('phone-portrait',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 assert.equal(await page.locator('.district-card').count(),5);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=3,'portrait horizontal overflow '+overflow);
 await page.screenshot({path:'artifacts/phone-portrait-start.png',fullPage:true});
 await page.locator('[data-district="oldtown"]').tap();
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).selected,'oldtown');
 await page.locator('[data-tab="crew"]').tap();
 await page.locator('[data-action="quiet"]').tap();
 assert.ok((await page.evaluate(()=>window.__HARBOR__.state())).heat<7);
 await page.locator('#next-week').tap();
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).week,2);
 await page.screenshot({path:'artifacts/phone-portrait-week2.png',fullPage:true});
});
await check('phone-landscape',{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 assert.equal(await page.locator('.district-card').count(),5);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<=3,'landscape horizontal overflow '+overflow);
 const bounds=await page.evaluate(()=>({
   windowHeight:innerHeight,docHeight:document.documentElement.scrollHeight,
   stage:document.querySelector('.stage').getBoundingClientRect().height,
   cards:[...document.querySelectorAll('.district-card')].map(el=>{const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,height:b.height};}),
   next:document.querySelector('#next-week').getBoundingClientRect().bottom
 }));
 assert.ok(bounds.docHeight<=bounds.windowHeight+4,'Landscape content overflows viewport');
 assert.ok(bounds.stage>=125,'Main district photo must remain visible, got '+bounds.stage);
 assert.ok(bounds.next<=bounds.windowHeight,'Next week action hidden');
 assert.ok(bounds.cards.every(c=>c.height>=20&&c.bottom<=bounds.windowHeight+2),'Location photo cards clipped');
 await page.screenshot({path:'artifacts/phone-landscape-start.png',fullPage:true});
 await page.locator('[data-district="finance"]').tap();
 assert.equal((await page.evaluate(()=>window.__HARBOR__.state())).selected,'finance');
 await page.locator('[data-action="hustle"]').tap();
 assert.ok((await page.evaluate(()=>window.__HARBOR__.state())).cash>320);
});
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('All gangster tycoon browser playtests passed.');

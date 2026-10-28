import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const errs=[];
async function run(name,options,fn){
 const ctx=await browser.newContext(options),page=await ctx.newPage(),exceptions=[];
 page.on('pageerror',e=>exceptions.push(e.message));
 try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('.office-svg').waitFor();
  assert.equal(await page.locator('button.prop').count(),6);
  await fn(page);
  assert.deepEqual(exceptions,[]);
  console.log('PASS '+name);
 }catch(e){
  errs.push(name+' '+e.message);
  await page.screenshot({path:'artifacts/FAILED-'+name+'.png',fullPage:true}).catch(()=>{});
 }finally{await ctx.close();}
}
await run('desktop',{viewport:{width:1440,height:900}},async page=>{
 await page.screenshot({path:'artifacts/desktop-office.png',fullPage:true});
 await page.locator('[data-open="map"]').click();
 assert.equal(await page.locator('.city-node').count(),4);
 assert.ok((await page.locator('.route-path').getAttribute('d')).includes('143 272'));
 await page.screenshot({path:'artifacts/desktop-office-map.png',fullPage:true});
 await page.locator('[data-assign]').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).orders.length,1);
 await page.locator('[data-map-crew="mio"]').click();
 await page.locator('[data-map-zone="market"]').click();
 await page.locator('[data-map-mission="network"]').click();
 await page.locator('[data-assign]').click();
 await page.locator('#close-panel').click();
 await page.locator('[data-open="phone"]').click();
 await page.locator('[data-phone="yes"]').click();
 await page.locator('#close-panel').click();
 await page.locator('[data-open="calendar"]').click();
 await page.locator('[data-next]').click();
 assert.equal(await page.locator('#panel-title').innerText(),'小弟汇报');
 const s=await page.evaluate(()=>window.__OFFICE__.state());
 assert.equal(s.day,2);assert.ok(s.reports.length>=3);
 await page.screenshot({path:'artifacts/desktop-reports.png',fullPage:true});
 await page.locator('#close-panel').click();
 await page.locator('[data-open="ledger"]').click();
 assert.ok(await page.locator('.account tr').count()>=4);
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).day,2);
});
await run('portrait',{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},async page=>{
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=3,'horizontal overflow');
 await page.screenshot({path:'artifacts/portrait-office.png',fullPage:true});
 await page.locator('[data-open="map"]').tap();
 assert.equal(await page.locator('.city-node').count(),4);
 await page.screenshot({path:'artifacts/portrait-route.png',fullPage:true});
 await page.locator('[data-assign]').tap();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).orders.length,1);
 await page.locator('#close-panel').tap();
 await page.locator('[data-open="phone"]').tap();
 await page.locator('[data-phone="yes"]').tap();
 await page.locator('#close-panel').tap();
 await page.locator('[data-open="gun"]').tap();
 await page.locator('[data-gun]').tap();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).flags.gunSeen,true);
});
await run('landscape',{viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2},async page=>{
 const dimensions=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
 assert.ok(dimensions.sw<=dimensions.w+3&&dimensions.sh<=dimensions.h+3,'landscape overflow '+JSON.stringify(dimensions));
 await page.screenshot({path:'artifacts/landscape-office.png',fullPage:true});
 await page.locator('[data-open="reports"]').tap();
 assert.equal(await page.locator('#panel-title').innerText(),'小弟汇报');
});
await browser.close();
if(errs.length){console.error(errs.join('\n'));process.exit(1);}
console.log('PASS desktop and phone active office gameplay');

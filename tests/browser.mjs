import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
async function run(label,viewport,action){
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('img.office-svg').waitFor();
  assert.ok(await page.locator('img.office-svg').evaluate(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.locator('.object-hit').count(),8);
  await action(page);
  assert.deepEqual(errors,[],'Uncaught JS exceptions');
  console.log('PASS '+label);
 }catch(e){
  failures.push(label+' :: '+e.stack);
  await page.screenshot({path:'artifacts/FAILED-'+label+'.png',fullPage:true}).catch(()=>{});
 }finally{await ctx.close();}
}
async function fireAt(page,x,y){
 const pos=await page.locator('#combat-viewport').evaluate((svg,p)=>{
  const point=svg.createSVGPoint();point.x=p[0];point.y=p[1];
  const client=point.matrixTransform(svg.getScreenCTM());
  return {x:client.x,y:client.y};
 },[x,y]);
 await page.mouse.move(pos.x,pos.y);
 await page.mouse.click(pos.x,pos.y);
}
await run('desktop-1440', {width:1440,height:900},async page=>{
 await page.screenshot({path:'artifacts/desktop-01-full-room.png',fullPage:true});
 assert.equal(await page.locator('.office-svg').evaluate(n=>getComputedStyle(n).objectFit),'contain');
 // Entire physical desk pistol is clickable. The first click lifts it into the viewport.
 await page.locator('.object-gun').click();
 assert.equal(await page.locator('#combat-root').isVisible(),true);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'aim');
 await page.screenshot({path:'artifacts/desktop-02-aim-crosshair.png',fullPage:true});
 await fireAt(page,991,300);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mag,5);
 await page.keyboard.press('r');
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).reloading,true);
 await page.waitForTimeout(850);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mag,6);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).reserve,23);
 await page.locator('#combat-start').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'fight');
 await page.screenshot({path:'artifacts/desktop-03-door-intrusion.png',fullPage:true});
 for(const [x,y] of [[999,272],[999,272],[733,289],[733,289]]){
  await fireAt(page,x,y);await page.waitForTimeout(225);
 }
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'won','all four hits must be required');
 await page.screenshot({path:'artifacts/desktop-04-combat-win.png',fullPage:true});
 await page.locator('#combat-settle').click();
 assert.equal(await page.locator('#combat-root').isVisible(),false);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).cash,280);
 // Preserved previous office gameplay
 await page.locator('.object-door').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.meta())).visitor.id,'kai');
 await page.waitForTimeout(1000);
 await page.screenshot({path:'artifacts/desktop-05-visitor.png',fullPage:true});
 await page.locator('.object-person').click();
 await page.locator('[data-visitact="hear"]').click();
 await page.locator('.object-door').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.meta())).venue,'street');
 await page.locator('[data-travel="harbor"]').click();
 await page.locator('[data-travel="office"]').click();
 await page.locator('.object-phone').click();
 for(const k of ['3','0','5'])await page.locator('[data-digit="'+k+'"]').click();
 await page.locator('[data-dial]').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.meta())).supply,1);
 await page.screenshot({path:'artifacts/desktop-06-real-dialer.png',fullPage:true});
 await page.locator('[data-phone="yes"]').click();
 await page.locator('#close-panel').click();
 await page.locator('.object-reports').click();
 await page.locator('[data-filedecision="approve"][data-case="freight"]').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).orders.length,1);
 await page.locator('#close-panel').click();
 await page.locator('.object-ledger').click();
 await page.locator('[data-budget="logistics"]').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.meta())).bonus.logistics,1);
 await page.locator('#close-panel').click();
 await page.locator('.object-calendar').click();
 await page.locator('[data-next]').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).day,2);
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'holstered');
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).day,2);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).roundsCompleted,1);
});
await run('desktop-1920',{width:1920,height:1080},async page=>{
 const m=await page.evaluate(()=>({
  img:getComputedStyle(document.querySelector('.office-svg')).objectFit,
  hit:document.querySelector('.scene-hitmap').getAttribute('preserveAspectRatio'),
  vw:innerWidth,sw:document.documentElement.scrollWidth
 }));
 assert.equal(m.img,'contain');assert.equal(m.hit,'xMidYMid meet');
 assert.ok(m.sw<=m.vw+2,'no horizontal crop');
 await page.screenshot({path:'artifacts/desktop-07-1920-full-frame.png',fullPage:true});
 await page.locator('.object-gun').click();
 await page.locator('#combat-ammo').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).reserve,36);
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).cash,160);
 await page.screenshot({path:'artifacts/desktop-08-1920-aim.png',fullPage:true});
 await page.keyboard.press('Escape');
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'holstered');
});
await run('desktop-1366',{width:1366,height:768},async page=>{
 await page.screenshot({path:'artifacts/desktop-09-1366-full-room.png',fullPage:true});
 await page.locator('.object-gun').click();
 await page.locator('#combat-start').click();
 await page.locator('#combat-retreat').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.combat())).mode,'lost');
 await page.locator('#combat-settle').click();
 assert.equal((await page.evaluate(()=>window.__OFFICE__.state())).cash,130);
 await page.locator('.object-map').click();
 assert.equal(await page.locator('.city-node').count(),4);
});
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log('DESKTOP FULL-FRAME, SHOOTING, RELOAD, ENCOUNTER, SETTLEMENT AND OFFICE E2E PASSED');

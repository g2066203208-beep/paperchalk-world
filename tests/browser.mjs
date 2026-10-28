import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4173/';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
async function run(name,settings,fn){
 const context=await browser.newContext(settings);
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.stand-card').first().waitFor();
  await fn(page);
  assert.deepEqual(errors,[],'Browser JS errors: '+errors.join(';'));
  console.log('PASS '+name);
 }catch(e){
  failures.push(name+': '+e.message);
  await page.screenshot({path:'artifacts/FAILED-'+name+'.png',fullPage:true}).catch(()=>{});
 }finally{await context.close();}
}
async function assertBoard(page){
 assert.equal(await page.locator('.lane-button').count(),5);
 assert.equal(await page.locator('.paper-card').count(),4,'Hand must have four action cards, no decorative player card');
 assert.equal(await page.locator('.left-rail').isVisible(),false,'Remove old panel/dashboard');
 const stage=await page.locator('#scene-image').evaluate(el=>({
   background:getComputedStyle(el).backgroundImage,
   height:el.getBoundingClientRect().height
 }));
 assert.ok(stage.background.includes('data:image/svg+xml'),'Original layered scenery should be loaded');
 assert.ok(stage.height>150,'Scene is too small');
 const medal=await page.locator('.lane-button').first().evaluate(el=>({
   radius:getComputedStyle(el).borderRadius,
   width:el.getBoundingClientRect().width,
   height:el.getBoundingClientRect().height
 }));
 assert.ok(medal.radius==='50%','Lane navigation should be integrated round floor medallions');
 assert.ok(Math.abs(medal.width-medal.height)<3,'Medallion must be round');
 assert.equal(await page.locator('.location-card').count(),3);
 assert.equal(await page.locator('.stand-card').count(),8);
 const near=page.locator('[data-id="h2"]'),far=page.locator('[data-id="h1"]');
 const a=await near.boundingBox(),b=await far.boundingBox();
 assert.ok(a.width>b.width&&a.height>b.height,'near card must be bigger than far card');
 assert.ok(a.y>b.y,'near card must sit lower on the table');
 const z=await page.evaluate(()=>{
  const n=document.querySelector('.stand-card[data-id="h2"]'),
        f=document.querySelector('.stand-card[data-id="h1"]');
  return [parseInt(getComputedStyle(n).zIndex),parseInt(getComputedStyle(f).zIndex)];
 });
 assert.ok(z[0]>z[1],'front card must occlude back card');
 assert.ok((await page.locator('.stand-card[data-side="rear"]').count())>0,'pincer attacker missing');
 assert.equal(await page.locator('#board-grid').count(),0); // actual SVG is .board-grid
}
await run('desktop',{viewport:{width:1440,height:900},deviceScaleFactor:1},async page=>{
 await assertBoard(page);
 await page.screenshot({path:'artifacts/desktop-diorama-church.png',fullPage:true});
 await page.locator('[data-id="h4"]').click({force:true});
 await page.locator('[data-action="shoot"]').click();
 let s=await page.evaluate(()=>window.__NIGHT_REMAINS__.state());
 assert.equal(s.mag,5);assert.equal(s.enemies.church.find(e=>e.id==='h4').hp,2);
 const original=await page.locator('[data-id="h1"]').evaluate(el=>({top:el.style.top,width:el.style.width}));
 await page.locator('[data-action="end"]').click();
 s=await page.evaluate(()=>window.__NIGHT_REMAINS__.state());
 assert.equal(s.turn,2);
 const moved=await page.locator('[data-id="h1"]').evaluate(el=>({top:el.style.top,width:el.style.width}));
 assert.notDeepEqual(original,moved,'actual card coordinates must move on end turn');
 await page.locator('[data-action="move"][data-to="cemetery"]').click();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'cemetery');
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'cemetery');
 await page.screenshot({path:'artifacts/desktop-diorama-cemetery.png',fullPage:true});
});
await run('phone-portrait',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 await assertBoard(page);
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(over<=3,'portrait horizontal overflow '+over);
 const bottom=await page.locator('.field').evaluate(el=>el.getBoundingClientRect().bottom);
 assert.ok(bottom>=844-5,'portrait scene leaves unused blank area '+(844-bottom));
 await page.screenshot({path:'artifacts/phone-diorama-portrait.png',fullPage:true});
 await page.locator('[data-action="lane"][data-lane="1"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).lane,1);
 await page.locator('[data-action="advance"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).advance,1);
 await page.locator('[data-action="retreat"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).advance,0);
 await page.locator('[data-action="end"]').tap();
 await page.locator('[data-action="move"][data-to="alley"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).current,'alley');
 await page.screenshot({path:'artifacts/phone-diorama-alley.png',fullPage:true});
});
await run('phone-landscape',{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true},async page=>{
 await assertBoard(page);
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(over<=3,'landscape horizontal overflow '+over);
 const fullHeight=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
 assert.ok(fullHeight<=4,'landscape should fit one screen, overflow '+fullHeight);
 const hand=await page.locator('[data-action="shoot"]').boundingBox();
 assert.ok(hand&&hand.y+hand.height<=392,'hand must be visible without scrolling');
 const boardH=await page.locator('#board').evaluate(el=>el.getBoundingClientRect().height);
 assert.ok(boardH>=100,'standing tabletop was squeezed away');
 await page.screenshot({path:'artifacts/phone-diorama-landscape.png',fullPage:true});
 await page.locator('[data-action="end"]').tap();
 assert.equal((await page.evaluate(()=>window.__NIGHT_REMAINS__.state())).turn,2);
});
await browser.close();
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('PASS real five-lane tabletop and mobile touch controls');

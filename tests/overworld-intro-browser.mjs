// Actual Chromium interaction + unaltered gameplay screenshots.
// Not an AI mockup. Opens main game, plays intro, handles phone and map,
// purchases goods, enters all real registered city scenes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(25000);
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
const snap=async(name)=>page.screenshot({path:path.join(out,name),fullPage:false,animations:'disabled'});
const info=()=>page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot());
const waitScene=async id=>{
 await page.waitForFunction(id=>document.getElementById('scene')?.dataset.scene===id,id);
 await page.waitForFunction(()=>document.getElementById('scene-transition')?.dataset.active==='false');
 await page.waitForTimeout(320);
};
const waitDirector=async()=>page.waitForFunction(()=>!window.PaperWorldDailyLifeUI?.director?.active?.());
const openMap=async()=>{
 await waitDirector();
 await page.locator('#quick-map').click();
 await page.locator('#pw-world-surface:not([hidden])').waitFor();
 assert.equal(await page.locator('#pw-world-surface .pw-surface-heading').innerText(),'城区地图');
};
const go=async(id,expectSrc)=>{
 await page.locator('#pw-world-surface .pw-map-pin[data-place="'+id+'"]').click();
 await page.locator('#pw-world-surface .pw-map-depart').click();
 await page.waitForFunction(id=>window.PaperWorldDailyLifeUI.snapshot().location===id,id);
 await waitScene(id);
 if(expectSrc)assert.match(await page.locator('#source').getAttribute('src'),new RegExp(expectSrc.replace(/\./g,'\\.')));
 await waitDirector();
};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').waitFor();
 await page.locator('#menu-start').click();
 await waitScene('bedroom');
 assert.match(await page.locator('#dialogue-text').innerText(),/……|睁开|天花板|做梦/);
 await snap('01-bedroom-waking.png');
 const n=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<n;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 assert.equal(await page.locator('#phone-unread-preview').isVisible(),true);
 await snap('02-phone-missed-calls.png');
 // The handset must be entirely on screen and legible (no severe clipping).
 const bounds=await page.locator('#phone-ui').boundingBox();
 assert.ok(bounds.width>=300,'Handset should occupy useful visual width on desktop: '+JSON.stringify(bounds));
 assert.ok(bounds.y>=-2&&bounds.y+bounds.height<=812,
   'Handset must fit the scene vertically: '+JSON.stringify(bounds));
 await page.locator('#phone-fingerprint').click();
 await page.locator('[data-app="信息"]').click();
 assert.equal(await page.locator('#phone-app-copy .phone-message-row').count(),3);
 await snap('03-homework-inbox.png');
 await page.locator('#phone-app-back').click();
 await page.locator('[data-app="联系人"]').click();
 await page.locator('#phone-app-copy [data-contact="female2"]').click();
 assert.match(await page.locator('#phone-app-copy').innerText(),/亲密度/);
 await snap('04-female-two-relationship.png');
 await page.locator('.phone-close').click();
 assert.equal(await page.locator('#daily-life-ui').count(),0);
 assert.equal(await page.locator('#camera-player-root').evaluate(e=>getComputedStyle(e).display),'none');
 await snap('05-quiet-bedroom.png');
 await page.locator('#overworld-scene-prompts [data-action="hall"]').click();
 await waitScene('entrance');
 await page.locator('#overworld-scene-prompts [data-action="exit"]').click();
 assert.equal(await page.locator('#pw-world-surface').isVisible(),true);
 await snap('06-full-city-map.png');
 await go('school','classroom.webp');
 assert.equal((await info()).location,'school');
 assert.ok((await info()).minute>420);
 assert.equal(await page.locator('#overworld-city-stage').isVisible(),false,
   'Actual school art must render, not placeholder label');
 await snap('07-school-classroom.png');
 await openMap();await go('convenience','convenience.svg');
 await snap('08-convenience-store.png');
 await page.locator('#overworld-scene-prompts [data-action="shop"]').click();
 assert.equal(await page.locator('#pw-world-surface .pw-surface-heading').innerText(),'便利店货架');
 await page.locator('.pw-shop-row[data-item="bread"]').click();
 const before=(await info()).money;
 await page.locator('.pw-item-use').click();
 assert.equal((await info()).money,before-18);
 await snap('09-shop-buying.png');
 await page.locator('.pw-surface-close').click();
 await page.locator('#quick-backpack').click();
 assert.equal(await page.locator('#pw-world-surface .pw-surface-heading').innerText(),'背包');
 assert.ok(await page.locator('.pw-item[data-item="keys"]').count());
 assert.ok(await page.locator('.pw-item[data-item="homework"]').count());
 await page.locator('.pw-item[data-item="homework"]').click();
 assert.match(await page.locator('.pw-item-detail').innerText(),/不能随意消耗/);
 await snap('10-real-backpack.png');
 await page.locator('.pw-surface-close').click();
 // Reach 10:00 using the ACTUAL game wait method (not changing device time).
 await page.evaluate(()=>{
   const e=window.PaperWorldDailyLifeUI.engine;
   for(let i=0;i<3&&e.snapshot().minute<600;i++)e.wait(60);
 });
 await openMap();await go('cafe','cafe.svg');
 await snap('11-cafe-scene.png');
 await openMap();await go('mall','mall.svg');
 await snap('12-shopping-mall.png');
 await openMap();await go('park','park.svg');
 await snap('13-public-park.png');
 // The UI must remain a quiet scene, not a permanent RPG dashboard.
 assert.equal(await page.locator('#daily-life-ui').count(),0);
 assert.equal(await page.locator('#overworld-scene-prompts').isVisible(),true);
 const fatal=errors.filter(x=>/ReferenceError|SyntaxError|TypeError|Uncaught/.test(x));
 assert.deepEqual(fatal,[]);
 console.log(JSON.stringify({PASS:true,phoneBounds:bounds,files:fs.readdirSync(out),
   day:(await info()).day,location:(await info()).location,errors:errors.slice(0,20)},null,2));
}finally{await browser.close()}

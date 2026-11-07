// REAL Playwright QA at landscape-phone viewport. No mock screenshots.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
page.setDefaultTimeout(25000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async file=>page.screenshot({path:path.join(out,file),fullPage:false,animations:'disabled'});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const n=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<n;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await shot('14-mobile-phone-lock.png');
 await page.locator('#phone-fingerprint').click();
 await page.waitForFunction(()=>document.querySelector('#phone-ui')?.dataset.focus==='true');
 await page.locator('[data-app="信息"]').click();
 await page.locator('#phone-app-copy .phone-chat-bubble.is-them').first().waitFor();
 const bounds=await page.locator('#phone-ui').boundingBox();
 assert.ok(bounds,'phone close-up should have a bounding box');
 assert.ok(bounds.x>=-2&&bounds.y>=-2&&bounds.x+bounds.width<=846&&bounds.y+bounds.height<=392,
   'Enlarged mobile phone must fit landscape screen: '+JSON.stringify(bounds));
 assert.equal(await page.locator('#phone-app-copy .phone-chat-bubble.is-them').count(),3);
 await shot('15-mobile-messages-focused.png');
 await page.mouse.click(32,45);
 await page.waitForFunction(()=>!window.PaperWorldQuickTools.phone.isOpen());
 await page.locator('#quick-backpack').click();
 await page.locator('#pw-world-surface:not([hidden])').waitFor();
 assert.equal(await page.locator('#pw-world-surface .pw-surface-heading').innerText(),'背包');
 await shot('16-mobile-backpack.png');
 await page.locator('#pw-world-surface .pw-surface-dim').click({position:{x:3,y:3}});
 await page.locator('#quick-map').click();
 await page.locator('#pw-world-surface:not([hidden])').waitFor();
 assert.equal(await page.locator('#pw-world-surface .pw-surface-heading').innerText(),'城区交通');
 await shot('17-mobile-city-map.png');
 assert.equal(await page.locator('.pw-photo-map-info').count(),0);
 await page.locator('.pw-transit-place[data-place="school"]').click();
 await page.locator('.pw-transit-popup:not([hidden])').waitFor();
 const mapRect=await page.locator('.pw-transit-map').boundingBox();
 const popupRect=await page.locator('.pw-transit-popup').boundingBox();
 assert.ok(popupRect.x>=mapRect.x-1&&popupRect.y>=mapRect.y-1&&
   popupRect.x+popupRect.width<=mapRect.x+mapRect.width+1&&
   popupRect.y+popupRect.height<=mapRect.y+mapRect.height+1,
   'popup anchored near photo must stay on small screen: '+JSON.stringify(popupRect));
 await shot('18-mobile-local-photo-menu.png');
 assert.deepEqual(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)),[]);
 console.log(JSON.stringify({PASS:true,viewport:'844x390',phoneFocusedBounds:bounds,screenshots:4}));
}finally{await browser.close()}

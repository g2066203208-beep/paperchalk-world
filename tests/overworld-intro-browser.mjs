// Browser regression and visual evidence: the real hosted game document,
// actual source art + UI + Live2D hooks, not a mockup or an AI redraw.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.PAPERCHALK_BROWSER_BASE || 'http://127.0.0.1:8765/';
const output = process.env.PAPERCHALK_CAPTURE_DIR || 'artifacts/overworld';
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const viewport={width:1440,height:810};
const page=await browser.newPage({viewport,deviceScaleFactor:1});
page.setDefaultTimeout(20000);
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text());});
const shot=async file=>page.screenshot({path:path.join(output,file),fullPage:false,animations:'disabled'});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').waitFor();
 assert.equal(await page.locator('#scene').getAttribute('data-scene'),'menu');
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom'&&
   !document.querySelector('#dialogue')?.hidden,{timeout:30000});
 // Wait for the black scene transition to finish before photographing the
 // actual bedroom: a screenshot during the covered phase is almost all black.
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false',
   undefined,{timeout:30000});
 assert.match(await page.locator('#dialogue-text').innerText(),/……|睁开|天花板|做梦/);
 await shot('01-bedroom-awakening.png');
 const lines=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<lines;i++){
   await page.locator('#next-line').click({timeout:7000});
 }
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.(),{timeout:9000});
 const intro=await page.evaluate(()=>window.PaperWorldOpeningState?.snapshot?.());
 assert.equal(intro.phase,'day');
 assert.equal(await page.locator('#phone-unread-preview').isVisible(),true);
 assert.match(await page.locator('#phone-unread-preview').innerText(),/6 通未接来电/);
 await shot('02-missed-calls-phone.png');
 await page.locator('#phone-fingerprint').click();
 await page.locator('[data-app="信息"]').click();
 await page.locator('#phone-app-copy .phone-message-row').first().waitFor();
 assert.equal(await page.locator('#phone-app-copy .phone-message-row').count(),3);
 assert.match(await page.locator('#phone-app-copy').innerText(),/作业写完没/);
 await shot('03-homework-messages.png');
 await page.locator('.phone-close').click();
 // Main game contains NO MMORPG-style time/money/mission dashboard.
 assert.equal(await page.locator('#daily-life-ui').count(),0,'Legacy management dashboard must not exist');
 assert.equal(await page.locator('#menu-daily-life').count(),0,'No out-of-world daily life menu');
 assert.equal(await page.locator('#overworld-scene-prompts').isVisible(),true,
   'Only quiet contextual scene actions remain');
 assert.equal(await page.locator('#camera-player-root').evaluate(el=>getComputedStyle(el).display),'none',
   'Bedroom first-person scene must not display battle cutout');
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI?.snapshot()?.day),1);
 await shot('04-quiet-bedroom.png');
 await page.locator('#overworld-scene-prompts [data-action="hall"]').click();
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI?.snapshot()?.location==='entrance');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 assert.equal(await page.locator('#scene').getAttribute('data-scene'),'entrance');
 // Departing the house deliberately enters the character's existing handset.
 await page.locator('#overworld-scene-prompts [data-action="exit"]').click();
 await page.locator('#phone-ui[data-app-name="地图"]').waitFor();
 assert.equal(await page.locator('#phone-map-art').count(),0,'No second fullscreen map');
 assert.equal(await page.locator('.phone-map-art').isVisible(),true,
   'City travel map must be inside the real in-game phone');
 assert.equal(await page.locator('.phone-map-pin').count(),6);
 await shot('05-phone-city-map.png');
 await page.locator('.phone-map-pin[data-place="school"]').click();
 await page.locator('.phone-map-depart').click();
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI?.snapshot()?.location==='school');
 const result=await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot());
 assert.equal(result.day,1);
 assert.equal(result.location,'school');
 assert.ok(result.minute>420,'Travel must consume game time');
 assert.equal(await page.locator('#overworld-city-stage').isVisible(),true,
   'Art-missing city must not retain the home-room background');
 assert.equal(await page.locator('#overworld-scene-prompts').isVisible(),true);
 assert.equal(await page.locator('#daily-life-ui').count(),0);
 await shot('06-arrived-school-quiet.png');
 const important=errors.filter(x=>/Uncaught|ReferenceError|SyntaxError|TypeError/.test(x));
 assert.equal(important.length,0,important.join('\n'));
 console.log(JSON.stringify({PASS:true,screenshots:fs.readdirSync(output),pageErrors:errors.slice(0,12),
   scene:'school',minute:result.minute,day:result.day},null,2));
}finally{
 await browser.close();
}

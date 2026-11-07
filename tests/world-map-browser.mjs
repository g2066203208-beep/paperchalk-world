/* Actual Chromium QA and screenshots for the full multi-city world map. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(16000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async name=>page.screenshot({path:path.join(out,name),timeout:25000,animations:'disabled'});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const lines=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<lines;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const result=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!result.ok)throw Error(result.reason);
 });
 await page.locator('#quick-map').click();
 const map=page.locator('.pw-world-map');
 await map.waitFor({state:'visible'});
 await page.waitForTimeout(700);
 const summary=await page.evaluate(()=>{
  const a=window.PaperWorldAtlas;
  return {cities:a.CITIES.length,pois:a.POIS.length,stories:a.SITES.length,
   regional:a.LINKS.length,metro:a.METRO_LINES.length,metroStops:a.METRO_STOPS.length,
   photoCards:document.querySelectorAll('.pw-world-city-card').length,
   poiButtons:document.querySelectorAll('.pw-world-poi').length,
   paths:document.querySelectorAll('.pw-world-transport-service').length,
   imageSources:document.querySelectorAll('.pw-world-city-photo img[src]').length};
 });
 assert.equal(summary.cities,10);
 assert.ok(summary.pois>=120);
 assert.ok(summary.stories>=45);
 assert.equal(summary.regional,14);
 assert.ok(summary.metroStops>=100);
 assert.equal(summary.photoCards,10);
 assert.equal(summary.poiButtons,summary.pois);
 assert.equal(summary.paths,summary.regional);
 assert.equal(summary.imageSources,10);
 await shot('24-world-all-region-desktop.png');
 await page.locator('.pw-world-city-card[data-city="homori"]').click();
 await page.locator('.pw-world-popup:not([hidden])').waitFor();
 assert.match(await page.locator('.pw-world-popup').innerText(),/穗森市/);
 await shot('25-world-city-popup.png');
 await page.locator('.pw-world-popup .pw-world-action').filter({hasText:'查看城区'}).click();
 await page.waitForFunction(()=>document.querySelector('.pw-world-map')?.dataset.zoom!=='region');
 await page.waitForTimeout(400);
 const visible=await page.evaluate(()=>[...document.querySelectorAll('.pw-world-poi:not([hidden])')].map(x=>x.dataset.place));
 assert.ok(visible.length>=2,'zoom reveals nearby places: '+JSON.stringify(visible));
 await shot('26-world-zoom-rural-countryside.png');
 const selected=page.locator('.pw-world-poi:not([hidden])').first();
 const id=await selected.getAttribute('data-place');
 await selected.click();
 const popup=page.locator('.pw-world-popup:not([hidden])');
 await popup.waitFor();
 assert.match(await popup.innerText(),/前往/);
 await shot('27-world-location-popup.png');
 await page.locator('.pw-world-tool.is-home').click();
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(350);
 await shot('28-world-mobile-overview.png');
 await page.locator('.pw-world-city-card[data-city="misaki"]').click();
 await page.locator('.pw-world-popup:not([hidden])').waitFor();
 await shot('29-world-mobile-city-menu.png');
 const rect=await map.boundingBox();
 await page.locator('.pw-world-tool.is-home').click();
 const start=await page.locator('.pw-world-canvas').getAttribute('style');
 await page.mouse.wheel(0,-520);
 await page.waitForTimeout(120);
 const after=await page.locator('.pw-world-canvas').getAttribute('style');
 assert.notEqual(start,after,'wheel zoom must transform world canvas');
 const x=await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().location);
 assert.equal(x,'entrance','opening map must not move hero');
 assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[]);
 console.log('WORLD MAP QA PASS',JSON.stringify({summary,chosen:id,mobile:{width:rect.width,height:rect.height},errors}));
}finally{await browser.close()}

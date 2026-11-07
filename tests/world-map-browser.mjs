/* Real Chromium proof: the whole megaregion lives inside the SAME subway
 * dot matrix, with no second map and no fake southern subway route. */
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
page.setDefaultTimeout(18000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async name=>page.screenshot({path:path.join(out,name),animations:'disabled',timeout:26000});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
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
 const map=page.locator('.pw-dot-world-map');
 await map.waitFor({state:'visible'});
 assert.equal(await page.locator('.pw-world-map,.pw-map-mode-toggle').count(),0);
 assert.equal(await page.locator('.pw-transit-grid-dot').count(),1683);
 const overview=await page.evaluate(()=>{
  const atlas=window.PaperWorldAtlas;
  return {cities:atlas.CITIES.length,pois:atlas.POIS.length,
   rumors:atlas.SITES.length,links:atlas.LINKS.length,
   cityMarkers:document.querySelectorAll('.pw-dot-city').length,
   poiMarkers:document.querySelectorAll('.pw-dot-poi').length,
   metroTracks:document.querySelectorAll('.pw-dot-planned-line').length,
   regionalSegments:document.querySelectorAll('.pw-dot-regional-lines .pw-transit-segment').length};
 });
 assert.equal(overview.cities,10);
 assert.ok(overview.pois>=120);
 assert.ok(overview.rumors>=45);
 assert.equal(overview.links,14);
 assert.equal(overview.cityMarkers,10);
 assert.ok(overview.poiMarkers>=100);
 assert.equal(overview.metroTracks,9);
 assert.ok(overview.regionalSegments>=14);
 await page.locator('.pw-dot-tool').filter({hasText:'全域'}).click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.zoom==='region');
 assert.equal(await page.locator('.pw-dot-city:not([hidden])').count(),10);
 await shot('24-dot-world-overview-desktop.png');
 await page.locator('.pw-dot-city[data-city="homori"]').click();
 const popup=page.locator('.pw-transit-popup:not([hidden])');
 await popup.waitFor();
 assert.match(await popup.innerText(),/穗森市/);
 await shot('25-dot-world-city-popup.png');
 await popup.locator('.pw-transit-menu-item.is-primary').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.zoom==='detail');
 const visible=page.locator('.pw-dot-poi:not([hidden])');
 assert.ok(await visible.count()>0,'city zoom must reveal actual point-grid destinations');
 await shot('26-dot-world-zoom-countryside.png');
 const target=visible.first();
 const chosen=await target.getAttribute('data-place');
 await target.click();
 await popup.waitFor();
 assert.match(await popup.innerText(),/前往/);
 await shot('27-dot-world-location-popup.png');
 await page.locator('.pw-dot-tool').filter({hasText:'全域'}).click();
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(350);
 assert.equal(await page.locator('.pw-dot-city:not([hidden])').count(),10);
 await shot('28-dot-world-mobile-overview.png');
 await page.locator('.pw-dot-city[data-city="misaki"]').click();
 await popup.waitFor();
 assert.match(await popup.innerText(),/岬崎市/);
 await shot('29-dot-world-mobile-city-menu.png');
 // Test wheel zoom without re-clicking the overview command beneath a
 // still-open mobile popup. The overview button was already exercised above.
 const start=await page.locator('.pw-dot-world-canvas').getAttribute('style');
 await page.mouse.wheel(0,-520);
 await page.waitForTimeout(120);
 const after=await page.locator('.pw-dot-world-canvas').getAttribute('style');
 assert.notEqual(start,after,'wheel zoom must change the same dot-canvas');
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().location),'entrance');
 assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[]);
 console.log('ONE DOT WORLD QA PASS',JSON.stringify({overview,chosen,errors}));
}finally{await browser.close()}

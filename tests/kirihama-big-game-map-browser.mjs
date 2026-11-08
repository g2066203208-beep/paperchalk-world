/* Real in-game Chromium proof for the player-facing Kirihama city atlas.
 * Captures the full-sized 15-district / 120-place map, not a fake mockup.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/kirihama-big-game-map';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
async function snap(name){
 await page.screenshot({path:path.join(out,name),animations:'disabled',timeout:48000});
}
const stats=()=>page.evaluate(()=>{
 const map=document.querySelector('.pw-dot-world-map');
 const active=selector=>[...document.querySelectorAll(selector)].filter(el=>{for(let n=el;n&&n.nodeType===1;n=n.parentElement)if(n.hidden||getComputedStyle(n).display==='none')return false;return true});
 return {scope:map?.dataset.scope,city:map?.dataset.city,
  districtCount:document.querySelectorAll('.pw-large-city-district').length,
  siteCount:document.querySelectorAll('.pw-large-city-pin').length,
  visibleSites:active('.pw-large-city-pin').length,
  districtVisible:active('.pw-large-city-district').length,
  stationCount:document.querySelectorAll('.pw-dot-local-places .pw-transit-place').length,
  metroSegments:document.querySelectorAll('.pw-dot-urban-lines .pw-transit-segment').length,
  regionalVisible:active('.pw-dot-regional-lines .pw-transit-segment').length,
  mapMode:map?.dataset.placeMapScale,
  scale:map?.dataset.cityMapZoom,
  panel:!document.querySelector('.pw-large-city-browser').hidden,
  viewport:[map?.clientWidth,map?.clientHeight]};
});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const count=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<count;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const travel=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!travel.ok)throw Error(travel.reason);
 });
 await page.locator('#quick-map').click();
 await page.locator('.pw-dot-world-map').waitFor({state:'visible'});
 assert.equal((await stats()).scope,'region');
 await page.evaluate(()=>{
  const c=document.querySelector('.pw-dot-city[data-city="kirihama"]');
  if(!c)throw Error('Kirihama city entry missing');
  c.click();
 });
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.citySites==='120');
 let x=await stats();
 await snap('01-kirihama-large-p5-style-real-game-map.png');
 assert.equal(x.scope,'city');assert.equal(x.city,'kirihama');
 assert.equal(x.districtCount,15);assert.equal(x.siteCount,120);
 assert.equal(x.stationCount,70);assert.equal(x.metroSegments,81);
 assert.equal(x.regionalVisible,0);
 assert.ok(x.visibleSites>=15,'Large map must display many real physical location pins: '+JSON.stringify(x));
 assert.ok(x.districtVisible>=4,'Large city needs area signposts visible: '+JSON.stringify(x));
 assert.equal(x.mapMode,'full-city');
 await page.locator('.pw-large-city-toggle').click();
 assert.equal((await stats()).panel,true);
 assert.equal(await page.locator('.pw-large-city-place-row').count(),120);
 await snap('02-kirihama-all-120-locations-browser.png');
 await page.locator('.pw-large-city-browser-search').fill('桐音高中');
 assert.ok((await page.locator('.pw-large-city-place-row').count())>=1,
  'search should include main school and its named sub-sites');
 await page.locator('.pw-large-city-place-row[data-place="school"]').click();
 await page.waitForFunction(()=>document.querySelector('.pw-transit-popup:not([hidden])')?.textContent.includes('桐音高中'));
 x=await stats();assert.ok(x.visibleSites>0);
 await page.locator('.pw-large-city-browser-close').click();
 await snap('03-kirihama-school-destination-on-real-map.png');
 await page.evaluate(()=>document.querySelector('.pw-large-city-district[data-district="westold"]').click());
 await page.waitForFunction(()=>document.querySelector('.pw-large-city-pin[data-district="westold"][data-label="true"]'));
 await snap('04-kirihama-old-town-neighborhood-zoom.png');
 assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError|Cannot/.test(e)),[]);
 console.log('KIRIHAMA BIG MAP CHROME PASS',JSON.stringify({stats:x,errors}));
}finally{
 await browser.close();
}

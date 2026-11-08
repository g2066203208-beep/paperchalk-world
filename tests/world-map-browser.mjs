/* Actual Chromium proof: region -> one city -> region -> different city.
 * The regional map must NEVER paint any internal subway, municipal bus,
 * access road or individual destination — at any zoom.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const dir=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
page.setDefaultTimeout(25000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async name=>page.screenshot({path:path.join(dir,name),animations:'allow',timeout:50000});
const scope=()=>page.locator('.pw-dot-world-map').getAttribute('data-scope');
const inspect=()=>page.evaluate(()=>{
 const m=document.querySelector('.pw-dot-world-map');
 const shown=selector=>[...document.querySelectorAll(selector)]
  .filter(e=>getComputedStyle(e).display!=='none'&&!e.closest('[hidden]'));
 const municipal=shown('.pw-dot-municipal-lines .pw-transit-segment');
 const access=shown('.pw-dot-access-lines .pw-transit-segment');
 const poi=shown('.pw-dot-poi');
 const local=shown('.pw-dot-local-places .pw-transit-place');
 return {scope:m.dataset.scope,city:m.dataset.city,
  regional:shown('.pw-dot-regional-lines .pw-transit-segment').length,
  metro:shown('.pw-dot-urban-lines .pw-transit-segment').length,
  municipal:municipal.map(n=>n.dataset.city),
  access:access.map(n=>n.dataset.city),
  poi:poi.map(n=>n.dataset.city),
  local:local.length,
  cityCards:shown('.pw-dot-city').map(n=>n.dataset.city),
  backVisible:!document.querySelector('.pw-dot-back').hidden};
});
const click=(query)=>page.evaluate(selector=>{
 const btn=document.querySelector(selector);
 if(!btn)throw Error('Cannot find map control '+selector);
 btn.click();
},query);
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
 await click('#quick-map');
 await page.locator('.pw-dot-world-map').waitFor({state:'visible'});
 assert.equal(await scope(),'region','game MUST open the inter-city page, not metropolitan subway');
 const atlas=await page.evaluate(()=>window.PaperWorldAtlas);
 assert.equal(atlas.CITIES.length,10);assert.ok(atlas.POIS.length>=120);
 const graph=await page.evaluate(()=>window.PaperWorldDestinationNetwork.audit());
 assert.deepEqual(graph.unreachable,[]);assert.deepEqual(graph.oneWay,[]);
 let view=await inspect();
 assert.equal(view.regional>=14,true);
 assert.equal(view.metro,0);assert.equal(view.municipal.length,0);
 assert.equal(view.access.length,0);assert.equal(view.local,0);assert.equal(view.poi.length,0);
 assert.equal(view.cityCards.length,10);assert.equal(view.backVisible,false);
 await shot('24-intercity-only-all-ten-cities-1920.png');
 // Zooming a REGIONAL map must never reveal intra-city transport.
 await page.mouse.move(850,480);
 await page.mouse.wheel(0,-620);
 await page.waitForTimeout(150);
 assert.equal(await scope(),'region');
 view=await inspect();
 assert.equal(view.metro,0);assert.equal(view.municipal.length,0);
 assert.equal(view.access.length,0);assert.equal(view.poi.length,0);
 await click('.pw-dot-tool[aria-label="查看当前层全图"]');
 // City click directly enters ONE city's transit network.
 await click('.pw-dot-city[data-city="homori"]');
 assert.equal(await scope(),'city');
 view=await inspect();
 assert.equal(view.city,'homori');assert.equal(view.regional,0);
 assert.equal(view.cityCards.length,0);assert.equal(view.metro,0);
 assert.equal(view.local,0);assert.equal(view.backVisible,true);
 assert.ok(view.municipal.length>0);
 assert.ok(view.access.length>0);
 assert.ok(view.poi.length>0);
 assert.ok(view.municipal.every(x=>x==='homori'));
 assert.ok(view.access.every(x=>x==='homori'));
 assert.ok(view.poi.every(x=>x==='homori'));
 await shot('25-homori-only-town-bus-and-stations-1920.png');
 // Zoom does not cross map levels.
 await page.mouse.wheel(0,-300);
 assert.equal(await scope(),'city');
 assert.equal((await inspect()).city,'homori');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 assert.equal((await inspect()).municipal.length,0);
 // Kirihama is the ONLY city with the operational eight-stop metro overlay.
 await click('.pw-dot-city[data-city="kirihama"]');
 view=await inspect();
 assert.equal(view.scope,'city');assert.equal(view.city,'kirihama');
 assert.equal(view.regional,0);assert.ok(view.metro>=10);
 assert.equal(view.cityCards.length,0);assert.equal(view.local,8);
 assert.ok(view.access.length>0&&view.access.every(x=>x==='kirihama'));
 assert.ok(view.poi.every(x=>x==='kirihama'));
 await shot('26-kirihama-only-real-metro-1920.png');
 // City-level "all" cannot accidentally bounce back to regional mode.
 await click('.pw-dot-tool[aria-label="查看当前层全图"]');
 assert.equal(await scope(),'city');assert.equal((await inspect()).city,'kirihama');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 await click('.pw-dot-city[data-city="shiomi"]');
 view=await inspect();
 assert.equal(view.city,'shiomi');assert.equal(view.regional,0);
 assert.equal(view.metro,0);assert.equal(view.local,0);
 assert.ok(view.municipal.length>0&&view.municipal.every(x=>x==='shiomi'));
 assert.ok(view.access.length>0&&view.access.every(x=>x==='shiomi'));
 assert.ok(view.poi.every(x=>x==='shiomi'));
 await shot('27-shiomi-only-harbor-transit-1920.png');
 // Mobile must retain the same explicit back control and city isolation.
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(100);
 assert.equal(await scope(),'city');
 await shot('28-shiomi-mobile-independent-map.png');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 view=await inspect();
 assert.equal(view.metro,0);assert.equal(view.municipal.length,0);
 assert.equal(view.access.length,0);assert.equal(view.poi.length,0);
 await shot('29-intercity-mobile-10-portals.png');
 assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[]);
 console.log('HIERARCHICAL TRANSPORT MAP PASS',JSON.stringify({graph,view,errors}));
}finally{await browser.close()}

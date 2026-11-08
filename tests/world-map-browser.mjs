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
// Software Chromium on shared CI runners can stall a framebuffer snapshot
// even while map interactions and semantic assertions are correct. Keep
// checking ALL ten map levels when an optional screenshot stalls.
const shot=async name=>{
 try{
  await page.screenshot({path:path.join(dir,name),animations:'allow',timeout:22000});
 }catch(error){
  if(!/Timeout/.test(String(error)))throw error;
  console.warn('MAP SCREENSHOT STALLED (continuing functional QA):',name);
 }
};
const scope=()=>page.locator('.pw-dot-world-map').getAttribute('data-scope');
const inspect=()=>page.evaluate(()=>{
 const m=document.querySelector('.pw-dot-world-map');
 const rendered=element=>{
  for(let n=element;n&&n.nodeType===1;n=n.parentElement)
   if(n.hidden||getComputedStyle(n).display==='none')return false;
  return true;
 };
 const shown=selector=>[...document.querySelectorAll(selector)].filter(rendered);
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
 const atlas=await page.evaluate(()=>({
  cities:window.PaperWorldAtlas.CITIES.length,
  points:window.PaperWorldAtlas.POIS.length
 }));
 assert.equal(atlas.cities,10);assert.ok(atlas.points>=120);
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
 assert.equal(view.municipal.length,0,'bus/tram must never be a metro line');
 assert.equal(view.access.length,0,'walking roads must never be a metro line');
 assert.equal(view.poi.length,0,'school, shops and rumors are not stations');
 assert.equal(await page.locator('.pw-dot-metro-no-service').isVisible(),true);
 await shot('25-homori-no-registered-subway-1920.png');
 // Zoom does not cross map levels.
 await page.mouse.wheel(0,-300);
 assert.equal(await scope(),'city');
 assert.equal((await inspect()).city,'homori');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 assert.equal((await inspect()).municipal.length,0);
 // Kirihama is the ONLY current city with a live 10-line, 70-station subway network.
 await click('.pw-dot-city[data-city="kirihama"]');
 view=await inspect();
 assert.equal(view.scope,'city');assert.equal(view.city,'kirihama');
 assert.equal(view.regional,0);assert.equal(view.metro,81); // 10 physical subway services, including the downtown ring
 assert.equal(view.cityCards.length,0);
 assert.ok(view.local>=10&&view.local<=30,
  'full city must visually show only major stations, not a dense 70-pin row: '+view.local);
 assert.equal(await page.locator('.pw-dot-local-places .pw-transit-place').count(),70,
  'all 70 real stations still exist as programmatic independent nodes');
 assert.equal(view.access.length,0);
 assert.equal(view.municipal.length,0);
 assert.equal(view.poi.length,0);
 assert.equal(await page.locator('.pw-dot-metro-legend-entry:visible').count(),10);
 assert.equal(await page.locator('.pw-dot-local-places .pw-transit-photo').count(),0,
  'city subway station labels are not unrelated tourist photos');
 // Keep the actual city metro photograph legible but affordable to capture.
 await page.setViewportSize({width:1440,height:810});
 await shot('26-kirihama-only-real-metro-1440.png');
 await page.setViewportSize({width:1920,height:1080});
 // City-level "all" cannot accidentally bounce back to regional mode.
 await click('.pw-dot-tool[aria-label="查看当前层全图"]');
 assert.equal(await scope(),'city');assert.equal((await inspect()).city,'kirihama');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 await click('.pw-dot-city[data-city="shiomi"]');
 view=await inspect();
 assert.equal(view.city,'shiomi');assert.equal(view.regional,0);
 assert.equal(view.metro,0);assert.equal(view.local,0);
 assert.equal(view.municipal.length,0);
 assert.equal(view.access.length,0);
 assert.equal(view.poi.length,0);
 await shot('27-shiomi-no-registered-subway-1920.png');
 // Exhaustively check ALL ten towns individually, including the island.
 // No other city's physical stop, route, or photo is allowed into a city.
 const cityIds=await page.evaluate(()=>window.PaperWorldAtlas.CITIES.map(c=>c.id));
 for(const id of cityIds){
  await click('.pw-dot-back');
  assert.equal(await scope(),'region');
  await click('.pw-dot-city[data-city="'+id+'"]');
  const info=await inspect();
  assert.equal(info.scope,'city');
  assert.equal(info.city,id);
  assert.equal(info.regional,0);
  assert.equal(info.cityCards.length,0);
  assert.equal(info.access.length,0,'walking road leaked into the metro view '+id);
  assert.equal(info.poi.length,0,'nonstation destination leaked into metro '+id);
  assert.equal(info.municipal.length,0,'bus/tram drawn as subway line '+id);
  if(id==='kirihama'){
   assert.equal(info.metro,81);
   assert.ok(info.local>=10&&info.local<=30,
    'overview must remain visually sparse, not show every registered stop');
  }else{
   assert.equal(info.metro,0,'invented unregistered subway in '+id);
   assert.equal(info.local,0,'invented subway station in '+id);
  }
 }
 await click('.pw-dot-back');
 await click('.pw-dot-city[data-city="shiomi"]');
 // Mobile must retain the same explicit back control and city isolation.
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(100);
 assert.equal(await scope(),'city');
 await shot('28-shiomi-mobile-no-subway.png');
 await click('.pw-dot-back');
 assert.equal(await scope(),'region');
 view=await inspect();
 assert.equal(view.metro,0);assert.equal(view.municipal.length,0);
 assert.equal(view.access.length,0);assert.equal(view.poi.length,0);
 await shot('29-intercity-mobile-10-portals.png');
 assert.deepEqual(errors.filter(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),[]);
 console.log('HIERARCHICAL TRANSPORT MAP PASS',JSON.stringify({graph,view,errors}));
}finally{await browser.close()}

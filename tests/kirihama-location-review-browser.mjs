/* Actual Chromium UI proof: the authored physical planning map stays sparse,
 * and selecting any district shows only its local places/station access. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/kirihama-location-plan';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:950},deviceScaleFactor:1});
page.setDefaultTimeout(20000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(base+'kirihama-location-plan.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#districts button').first().waitFor();
 assert.equal(await page.locator('#districts button').count(),15);
 assert.equal(await page.locator('#map .site').count(),12,
  'full city overview must show only selected district, not all 120 pinned dots');
 assert.equal(await page.locator('#site-list button').count(),12);
 assert.equal(await page.evaluate(()=>window.PaperWorldKirihamaLocationPlan.sites.length),120);
 assert.equal(await page.evaluate(()=>Object.keys(window.PaperWorldMetro.STATIONS).length),70);
 await page.screenshot({path:path.join(out,'01-120-place-city-planning-central.png'),animations:'disabled'});
 await page.locator('#districts button[data-id="river"]').click();
 assert.equal(await page.locator('#map .site').count(),8);
 assert.equal(await page.locator('#site-list button').count(),8);
 await page.screenshot({path:path.join(out,'02-river-and-subway-corridor.png'),animations:'disabled'});
 await page.locator('#districts button[data-id="underground"]').click();
 assert.equal(await page.locator('#map .site').count(),4);
 await page.locator('#search').fill('桐音高中');
 assert.equal(await page.locator('#districts button[data-id="campus"]').getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('#information').innerText(),/桐音高中/);
 assert.match(await page.locator('#information').innerText(),/学园前/);
 assert.equal(await page.locator('#map .site').count(),9);
 await page.screenshot({path:path.join(out,'03-school-at-authored-physical-location.png'),animations:'disabled'});
 const geoloc=await page.evaluate(()=>{
  const site=window.PaperWorldKirihamaLocationPlan.sites.find(x=>x.id==='school');
  return {id:site.id,stop:site.metroStationId,
   x:site.localPosition.eastM,y:site.localPosition.southM,
   walk:site.walking.distanceM};
 });
 assert.equal(geoloc.stop,'school');
 assert.ok(geoloc.walk<=1000);
 assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[]);
 console.log('KIRIHAMA STRICT LOCATIONS CHROME PASS',JSON.stringify({geoloc,
  districts:15,sites:120,stationCount:70,screenshotDir:out,errors}));
}finally{await browser.close()}

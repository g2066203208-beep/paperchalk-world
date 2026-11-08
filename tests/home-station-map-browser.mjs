/* In-game HOME STATION only: true Chromium screenshot and 3-layer navigation.
 * No mock images; use the game's actual map from opening bedroom.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const folder=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/home-station-neighborhood';
fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(26000);
async function shot(name,mandatory=false){
 try{
  await page.screenshot({path:path.join(folder,name),animations:'allow',timeout:mandatory?50000:22000});
 }catch(e){
  if(mandatory||!/Timeout/.test(String(e)))throw e;
  console.warn('Optional frame timeout: '+name);
 }
}
async function state(){
 return page.evaluate(()=>{
  const m=document.querySelector('.pw-dot-world-map');
  const root=document.querySelector('.pw-home-neighborhood-map');
  return {layer:m?.dataset.mapLayer,scope:m?.dataset.scope,city:m?.dataset.city,
   homeVisible:!!root&&!root.hidden,
   pins:root?.querySelectorAll('.pw-home-place-marker').length||0,
   list:root?.querySelectorAll('.pw-home-neighborhood-list-item').length||0,
   labels:[...root?.querySelectorAll('.pw-home-place-card text')||[]].map(n=>n.textContent),
   paths:root?.querySelectorAll('.pw-home-place-leader').length||0,
   active:root?.dataset.selectedPlace,
   otherCityPins:[...document.querySelectorAll('.pw-large-city-pin')].filter(el=>
    getComputedStyle(el).display!=='none'&&el.getClientRects().length).length,
   lines:[...document.querySelectorAll('.pw-home-map-line-labels text')].map(x=>x.textContent),
   viewBox:root?.querySelector('svg.pw-home-neighborhood-svg')?.getAttribute('viewBox')};
 });
}
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:65000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const count=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<count;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const result=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!result.ok)throw Error(result.reason);
 });
 await page.locator('#quick-map').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.mapLayer==='station');
 const s=await state();
 assert.equal(s.layer,'station');
 assert.equal(s.city,'kirihama');
 assert.equal(s.homeVisible,true);
 assert.equal(s.pins,7);
 assert.equal(s.list,7);
 assert.equal(s.paths,7);
 assert.equal(s.active,'entrance');
 assert.equal(s.otherCityPins,0,'full city 120 pins must NOT appear in home-station tier');
 assert.ok(s.labels.includes('家'),'a real home doorway must be shown');
 assert.ok(s.labels.includes('晨露家庭诊所'));
 assert.equal(await page.locator('.pw-home-neighborhood-station').innerText(),'住宅前站');
 assert.equal(await page.locator('.pw-home-neighborhood-selected-name').innerText(),'家');
 assert.equal(await page.locator('.pw-home-neighborhood-travel').isVisible(),true);
 // Coordinates must match physical master plan, not random photo-card positions.
 const realCoords=await page.evaluate(()=>{
  const plan=window.PaperWorldKirihamaLocationPlan;
  const station=window.PaperWorldMetro.STATIONS.entrance;
  const item=plan.sites.find(s=>s.id==='entrance');
  const marker=document.querySelector('.pw-home-place-marker[data-place="entrance"]');
  const r=marker.querySelector('rect:last-child');
  return {homeX:Number(r.getAttribute('x'))+6,homeY:Number(r.getAttribute('y'))+6,
   expectedX:550+item.localPosition.eastM-station.gx*900,
   expectedY:365+item.localPosition.southM-station.gy*900,
   westLine:station.lines.includes('e'),homeLine:station.lines.includes('a')};
 });
 assert.equal(realCoords.homeX,realCoords.expectedX);
 assert.equal(realCoords.homeY,realCoords.expectedY);
 assert.equal(realCoords.westLine,true);assert.equal(realCoords.homeLine,true);
 await shot('01-residential-home-station-square-dot-neighborhood-1600.png',true);
 await page.locator('.pw-home-neighborhood-list-item[data-place="khp-residential-03"]').click();
 assert.equal((await state()).active,'khp-residential-03');
 assert.match(await page.locator('.pw-home-neighborhood-selected-meta').innerText(),/593/);
 assert.equal(await page.locator('.pw-home-neighborhood-travel').isVisible(),false);
 await shot('02-home-station-clinic-location-with-pixel-tail.png');
 // Zoom must change only the local svg viewBox, not the whole-city camera.
 const oldBox=(await state()).viewBox;
 await page.locator('.pw-home-neighborhood-zoom [data-action="zoom-in"]').click();
 assert.notEqual((await state()).viewBox,oldBox);
 await page.locator('.pw-home-neighborhood-zoom [data-action="reset"]').click();
 assert.equal((await state()).viewBox,oldBox);
 await page.locator('.pw-home-neighborhood-up').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.mapLayer==='metro');
 assert.equal((await state()).homeVisible,false);
 assert.equal((await state()).scope,'city');
 assert.equal(await page.locator('.pw-dot-local-places .is-station').count(),70);
 // From the real home station node, descend to its one authored district.
 await page.evaluate(()=>document.querySelector('.pw-dot-local-places .is-station[data-place="entrance"]').click());
 await page.locator('.pw-transit-menu-item').filter({hasText:'查看住宅前站周边'}).click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.mapLayer==='station');
 assert.equal((await state()).active,'entrance');
 await page.locator('.pw-home-neighborhood-up').click();
 await page.locator('.pw-dot-back').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.mapLayer==='world');
 assert.equal((await state()).scope,'region');
 assert.deepEqual(errors.filter(e=>/ReferenceError|TypeError|SyntaxError/.test(e)),[]);
 console.log('HOME STATION PIXEL-DOT MAP BROWSER PASS',
  JSON.stringify({s,realCoords,errors,shots:folder}));
}finally{await browser.close()}

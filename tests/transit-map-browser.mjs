// Focused real-browser transit map screenshot QA. State fixture only moves from
// bedroom to the real home entrance, then all map/rail/train actions are clicks.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/overworld';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(17000);
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
const shot=async name=>page.screenshot({path:path.join(out,name),animations:'disabled',timeout:16000});
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const num=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<num;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
   window.PaperWorldQuickTools.close();
   const g=window.PaperWorldDailyLifeUI.engine;
   const result=g.travel('entrance');
   if(!result.ok)throw Error(result.reason);
 });
 await page.locator('#quick-map').click();
 const map=page.locator('.pw-transit-map');
 await map.waitFor({state:'visible'});
 assert.equal(await page.locator('.pw-photo-map-info').count(),0);
 assert.equal(await page.locator('.pw-transit-place').count(),11);
 assert.ok(await page.locator('.pw-transit-line-hit').count()>=10);
 assert.ok(await page.locator('.pw-transit-rail-glint').count()>=10);
 const gridCheck=await page.evaluate(()=>{
  const metro=window.PaperWorldMetro,geo=window.PaperWorldMetroGeometry;
  const element=document.querySelector('.pw-transit-map');
  const rect=element.getBoundingClientRect();
  const space=geo.layout(rect.width,rect.height);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const dotError=[...element.querySelectorAll('.pw-transit-grid-dot')]
   .map(n=>distance({x:+n.getAttribute('cx'),y:+n.getAttribute('cy')},
     geo.point(+n.dataset.column,+n.dataset.row,space)));
  const markerError=Object.entries(metro.STATIONS).map(([id,st])=>{
   const n=element.querySelector('.pw-transit-stop-group[data-stop="'+id+'"]');
   const p=geo.stationPoint(st,space);
   const move=n?.getAttribute('transform')?.match(/translate\\(([^,]+),([^\\)]+)\\)/);
   return move?distance(p,{x:+move[1],y:+move[2]}):999;
  });
  const photoError=[...element.querySelectorAll('.pw-transit-place[data-photograph=true]')]
   .map(n=>{
    const st=metro.STATIONS[n.dataset.place],b=n.getBoundingClientRect();
    const slot=geo.point(st.gx,st.gy-1,space);
    return distance(slot,{x:b.left+b.width/2-rect.left,y:b.top+b.height/2-rect.top});
   });
  return {grid:element.dataset.grid,cell:space.cell,
   dots:dotError.length,stations:markerError.length,photos:photoError.length,
   dotError:Math.max(...dotError),stationError:Math.max(...markerError),
   photoError:Math.max(...photoError)};
 });
 assert.equal(gridCheck.grid,'12x6');
 assert.equal(gridCheck.dots,91);
 assert.equal(gridCheck.stations,11);
 assert.equal(gridCheck.photos,6);
 assert.ok(gridCheck.dotError<.05,JSON.stringify(gridCheck));
 assert.ok(gridCheck.stationError<.05,JSON.stringify(gridCheck));
 assert.ok(gridCheck.photoError<1.5,JSON.stringify(gridCheck));
 console.log('STRICT GRID ALIGNMENT',JSON.stringify(gridCheck));
 await shot('19-transit-map-desktop.png');
 await page.locator('.pw-transit-place[data-place="school"]').click();
 await page.locator('.pw-transit-popup:not([hidden])').waitFor();
 assert.equal(await page.locator('.pw-transit-menu-item').count(),2);
 await shot('20-near-photo-actions.png');
 await page.setViewportSize({width:844,height:390});
 await page.waitForTimeout(250);
 const cardBox=await page.locator('.pw-transit-place[data-place="school"]').boundingBox();
 const popupBox=await page.locator('.pw-transit-popup:not([hidden])').boundingBox();
 assert.ok(cardBox&&popupBox,'photo and contextual menu should remain visible');
 assert.ok(popupBox.x>=cardBox.x+cardBox.width-1||
  popupBox.x+popupBox.width<=cardBox.x+1,
  'selection popup must not cover the chosen photograph');
 await shot('21-transit-map-mobile.png');
 await page.setViewportSize({width:1440,height:810});
 await page.waitForTimeout(250);
 // Click an actually visible residential-line segment in screen pixels.
 // This remains correct after the schematic reflows for a new viewport.
 const clickPoint=await page.evaluate(()=>{
   const svg=document.querySelector('.pw-transit-lines');
   const p=svg?.querySelector('.pw-transit-segment[data-line="a"][data-from="entrance"] .pw-transit-line-hit');
   if(!svg||!p)throw Error('missing colored track hit target');
   const xy=p.getPointAtLength(p.getTotalLength()*.48);
   const rect=svg.getBoundingClientRect();
   return {x:rect.x+xy.x,y:rect.y+xy.y};
 });
 await page.mouse.click(clickPoint.x,clickPoint.y);
 await page.locator('.pw-transit-popup:not([hidden])').waitFor();
 const label=await page.locator('.pw-transit-popup').innerText();
 assert.match(label,/住宅线/);
 assert.match(label,/学园前/);
 await shot('22-near-line-directions.png');
 await page.locator('.pw-transit-popup .pw-transit-menu-item.is-primary').first().click();
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.snapshot().metro?.onboard===true);
 await page.locator('#pw-metro-cabin:not([hidden])').waitFor();
 await page.waitForTimeout(400);
 await shot('23-procedural-metro-carriage.png');
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().metro.station),'entrance');
 await page.locator('#pw-metro-cabin .pw-cabin-actions button').filter({hasText:'继续乘坐'}).click();
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().metro.station),'school');
 await page.locator('#pw-metro-cabin .pw-cabin-actions button').filter({hasText:'下车'}).click();
 await page.waitForFunction(()=>window.PaperWorldDailyLifeUI.snapshot().metro?.onboard===false);
 assert.equal(await page.evaluate(()=>window.PaperWorldDailyLifeUI.snapshot().location),'school');
 assert.deepEqual(errors.filter(v=>/ReferenceError|TypeError|SyntaxError/.test(v)),[]);
 console.log(JSON.stringify({PASS:true,frames:5,endingStation:'school'}));
}finally{await browser.close()}

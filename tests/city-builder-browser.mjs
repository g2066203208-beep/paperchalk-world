import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/city-builder';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1650,height:950},deviceScaleFactor:1});
page.setDefaultTimeout(27000);
page.on('dialog',async d=>d.accept());
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function shot(name,mandatory=false){
 try{await page.screenshot({path:path.join(out,name),animations:'allow',timeout:mandatory?48000:24000})}
 catch(e){if(mandatory||!/Timeout/.test(String(e)))throw e;console.warn('Optional screenshot timed out:',name)}
}
const inspect=()=>page.evaluate(()=>{
 const b=window.PaperWorldCityBuilderStudioDebug,r=document.querySelector('.pw-city-build-studio');
 return {...b?.debug(),visible:!!r&&!r.hidden,imgs:r?.querySelectorAll('img,image').length,
  pixels:r?.querySelector('canvas')?.width,
  originalMetroStations:Object.keys(window.PaperWorldMetro.STATIONS).length}
});
async function at(gx,gy){
 const r=await page.locator('.pw-city-build-canvas').boundingBox();
 const d=await page.evaluate(()=>window.PaperWorldCityBuilderStudioDebug.model.state());
 const cell=Math.min((r.width-115)/d.width,(r.height-105)/d.height);
 return {x:r.x+r.width/2+(gx-d.width/2)*cell,
  y:r.y+r.height/2+(gy-d.height/2)*cell}
}
async function clickGrid(x,y){const p=await at(x,y);await page.mouse.click(p.x,p.y)}
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:70000});
 await page.locator('#menu-start').click();
 await page.waitForFunction(()=>document.querySelector('#scene')?.dataset.scene==='bedroom');
 await page.waitForFunction(()=>document.querySelector('#scene-transition')?.dataset.active==='false');
 const count=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
 for(let i=0;i<count;i++)await page.locator('#next-line').click();
 await page.waitForFunction(()=>window.PaperWorldQuickTools?.phone?.isOpen?.());
 await page.evaluate(()=>{
  window.PaperWorldQuickTools.close();
  const r=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!r.ok)throw Error(r.reason);
 });
 await page.locator('#quick-map').click();
 await page.locator('.pw-dot-world-map[data-map-layer="station"]').waitFor();
 await page.locator('.pw-city-build-toggle').click();
 await page.locator('.pw-city-build-studio:not([hidden])').waitFor();
 let state=await inspect();
 assert.equal(state.visible,true);
 assert.equal(state.caseId,'home');
 assert.equal(state.moduleCount,15);
 assert.equal(state.imgs,0);
 assert.ok(state.pixels>600);
 await shot('01-real-game-dot-city-module-builder.png',true);
 await page.locator('.pw-city-build-cat[data-cat="建筑"]').click();
 await page.locator('.pw-city-build-module[data-tool="home"]').click();
 await clickGrid(19,16);
 state=await inspect();
 assert.equal(state.moduleCount,16);
 const id=state.selectedId;
 assert.ok(id);
 await page.locator('.pw-city-build-action[data-action="undo"]').click();
 assert.equal((await inspect()).moduleCount,15);
 await page.locator('.pw-city-build-action[data-action="redo"]').click();
 assert.equal((await inspect()).moduleCount,16);
 await page.locator('.pw-city-build-select').click();
 const a=await at(19,16),b=await at(20,17);
 await page.mouse.move(a.x,a.y);
 await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 let piece=await page.evaluate(id=>
  window.PaperWorldCityBuilderStudioDebug.model.state().modules.find(m=>m.id===id),id);
 assert.equal(piece.x,20);assert.equal(piece.y,17);
 await page.locator('.pw-city-build-edit-actions button').filter({hasText:'旋转'}).click();
 await page.locator('.pw-city-build-name').fill('新住宅');
 await page.locator('.pw-city-build-name').press('Tab');
 piece=await page.evaluate(id=>
  window.PaperWorldCityBuilderStudioDebug.model.state().modules.find(m=>m.id===id),id);
 assert.equal(piece.angle,1);assert.equal(piece.label,'新住宅');
 await page.locator('.pw-city-build-cat[data-cat="路网"]').click();
 await page.locator('.pw-city-build-module[data-tool="road"]').click();
 for(const pt of [[6,6],[9,6],[9,11]])await clickGrid(...pt);
 const m=await page.evaluate(()=>window.PaperWorldCityBuilderStudioDebug.model);
 assert.equal(m.state().modules.filter(x=>x.type==='road').length,7);
 assert.ok(m.adjacency('road').some(j=>j.at==='9,6'&&j.ids.length>=2));
 await page.locator('.pw-city-build-canvas').press('Enter');
 await shot('02-new-houses-and-joined-road-dot-map.png');
 await page.locator('.pw-city-build-action[data-action="save"]').click();
 await page.locator('.pw-city-build-case').selectOption('kirihama');
 state=await inspect();
 assert.equal(state.moduleCount,271);
 assert.equal(state.stationCount,70);
 assert.equal(state.railCount,81);
 assert.equal(state.placeCount,120);
 await shot('03-kirihama-271-actual-editable-components.png');
 await page.locator('.pw-city-build-case').selectOption('shiomi');
 state=await inspect();assert.equal(state.railCount,0);
 await shot('04-shiomi-real-location-components-no-fake-metro.png');
 await page.locator('.pw-city-build-case').selectOption('home');
 assert.equal((await inspect()).moduleCount,18);
 assert.equal((await inspect()).originalMetroStations,70);
 await page.locator('.pw-city-build-action[data-action="close"]').click();
 assert.equal((await inspect()).visible,false);
 assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[]);
 console.log('PASS REAL DOT CITY BUILDER',JSON.stringify({state,errors}));
}finally{await browser.close()}

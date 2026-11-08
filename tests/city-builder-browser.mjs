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
  stationCount:Number(r?.dataset.stationCount)||0,
  railCount:Number(r?.dataset.railCount)||0,
  placeCount:Number(r?.dataset.placeCount)||0,
  originalMetroStations:Object.keys(window.PaperWorldMetro.STATIONS).length}
});
async function at(gx,gy){
 return page.evaluate(({gx,gy})=>{
  const node=document.querySelector('.pw-city-build-canvas');
  if(!node)throw Error('City construction canvas missing');
  const r=node.getBoundingClientRect();
  const d=window.PaperWorldCityBuilderStudioDebug.model.state();
  const cell=Math.min((r.width-115)/d.width,(r.height-105)/d.height);
  return {x:r.left+r.width/2+(gx-d.width/2)*cell,
   y:r.top+r.height/2+(gy-d.height/2)*cell};
 },{gx,gy})
}
async function clickGrid(x,y){const p=await at(x,y);await page.mouse.click(p.x,p.y)}
async function ui(selector){
 await page.evaluate(css=>{
  const b=document.querySelector(css);
  if(!b)throw Error('Missing city editor control '+css);
  b.click();
 },selector);
}
async function chooseCase(id){
 await page.evaluate(city=>{
  const select=document.querySelector('.pw-city-build-case');
  if(!select)throw Error('Missing case selector');
  select.value=city;
  select.dispatchEvent(new Event('change',{bubbles:true}));
 },id);
}
try{
 await page.goto(base+(base.includes('?')?'&':'?')+'cityBuilder=1&mapLayers=full',{waitUntil:'domcontentloaded',timeout:70000});
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
 await page.locator('.pw-dot-world-map[data-map-layer="metro"]').waitFor();
 await ui('.pw-city-build-toggle');
 await page.locator('.pw-city-build-studio:not([hidden])').waitFor();
 let state=await inspect();
 assert.equal(state.visible,true);
 assert.equal(state.caseId,'home');
 assert.equal(state.moduleCount,15);
 assert.equal(state.imgs,0);
 assert.ok(state.pixels>600);
 await shot('01-real-game-dot-city-module-builder.png',true);
 await ui('.pw-city-build-cat[data-cat="建筑"]');
 await ui('.pw-city-build-module[data-tool="home"]');
 await clickGrid(19,16);
 state=await inspect();
 assert.equal(state.moduleCount,16);
 const id=state.selectedId;
 assert.ok(id);
 await ui('.pw-city-build-action[data-action="undo"]');
 assert.equal((await inspect()).moduleCount,15);
 await ui('.pw-city-build-action[data-action="redo"]');
 assert.equal((await inspect()).moduleCount,16);
 await ui('.pw-city-build-select');
 const a=await at(19,16),b=await at(20,17);
 await page.mouse.move(a.x,a.y);
 await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
 let piece=await page.evaluate(id=>
  window.PaperWorldCityBuilderStudioDebug.model.state().modules.find(m=>m.id===id),id);
 assert.equal(piece.x,20);assert.equal(piece.y,17);
 await page.evaluate(()=>[...document.querySelectorAll('.pw-city-build-edit-actions button')].find(x=>x.textContent.includes('旋转')).click());
 await page.evaluate(()=>{
  const n=document.querySelector('.pw-city-build-name');
  n.value='新住宅';n.dispatchEvent(new Event('change',{bubbles:true}));
 });
 piece=await page.evaluate(id=>
  window.PaperWorldCityBuilderStudioDebug.model.state().modules.find(m=>m.id===id),id);
 assert.equal(piece.angle,1);assert.equal(piece.label,'新住宅');
 await ui('.pw-city-build-cat[data-cat="路网"]');
 await ui('.pw-city-build-module[data-tool="road"]');
 for(const pt of [[6,6],[9,6],[9,11]])await clickGrid(...pt);
 const roadAudit=await page.evaluate(()=>{
  const m=window.PaperWorldCityBuilderStudioDebug.model;
  return {count:m.state().modules.filter(x=>x.type==='road').length,
   joins:m.adjacency('road')};
 });
 assert.equal(roadAudit.count,7);
 assert.ok(roadAudit.joins.some(j=>j.at==='9,6'&&j.ids.length>=2));
 await page.evaluate(()=>document.querySelector('.pw-city-build-canvas')
  .dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 await shot('02-new-houses-and-joined-road-dot-map.png');
 await ui('.pw-city-build-action[data-action="save"]');
 await chooseCase('kirihama');
 state=await inspect();
 assert.equal(state.moduleCount,271);
 assert.equal(state.stationCount,70);
 assert.equal(state.railCount,81);
 assert.equal(state.placeCount,120);
 await shot('03-kirihama-271-actual-editable-components.png');
 await chooseCase('shiomi');
 state=await inspect();assert.equal(state.railCount,0);
 await shot('04-shiomi-real-location-components-no-fake-metro.png');
 await chooseCase('home');
 assert.equal((await inspect()).moduleCount,18);
 assert.equal((await inspect()).originalMetroStations,70);
 await ui('.pw-city-build-action[data-action="close"]');
 assert.equal((await inspect()).visible,false);
 assert.deepEqual(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)),[]);
 console.log('PASS REAL DOT CITY BUILDER',JSON.stringify({state,errors}));
}finally{await browser.close()}

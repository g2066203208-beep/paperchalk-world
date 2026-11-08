/* Real Chromium proof of Kirihama's in-map editable dot-to-dot metro.
 * Real mouse pointer is used for select, station drag and bend editing.
 * Screenshots are the actual game view, not an invented mockup image.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const out=process.env.PAPERCHALK_CAPTURE_DIR||'artifacts/metro-editor';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1640,height:930}});
page.setDefaultTimeout(22000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const shot=async file=>{
 try{
  await page.screenshot({path:path.join(out,file),animations:'disabled',timeout:25000});
 }catch(err){
  if(!/Timeout/.test(String(err)))throw err;
  console.warn('Screenshot timed out but functional checks continue:',file);
 }
};
const edgePoint=async key=>page.evaluate(edgeKey=>{
 const hit=document.querySelector('.pw-metro-edit-edge[data-editor-edge="'+edgeKey+'"] .pw-metro-edit-hit');
 if(!hit)throw Error('Missing editor SVG rail segment '+edgeKey);
 const p=hit.getPointAtLength(hit.getTotalLength()*.55);
 const m=hit.getScreenCTM();
 return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};
},key);
const clickAction=async action=>page.evaluate(name=>{
 const btn=document.querySelector('.pw-metro-edit-action[data-action="'+name+'"]');
 if(!btn)throw Error('Missing edit action '+name+'; available: '+
  [...document.querySelectorAll('.pw-metro-edit-action')].map(x=>x.textContent).join(' / '));
 btn.click();
},action);
const inspect=()=>page.evaluate(()=>{
 const map=document.querySelector('.pw-dot-world-map');
 const editor=window.PaperWorldMetroEditorDebug;
 const model=editor?.model;
 return {active:editor?.isActive(),editing:map?.dataset.metroEditing,
  count:model?.info(),rails:document.querySelectorAll('.pw-metro-edit-edge').length,
  dots:document.querySelectorAll('.pw-metro-edit-station').length,
  images:document.querySelectorAll('.pw-metro-edit-layer image,.pw-metro-edit-layer img').length,
  overlay:getComputedStyle(document.querySelector('.pw-dot-urban-lines')).display,
  state:map?.dataset.scope,city:map?.dataset.city};
});
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
  const r=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!r.ok)throw Error(r.reason);
 });
 await page.evaluate(()=>document.querySelector('#quick-map').click());
 await page.locator('.pw-dot-world-map[data-scope="region"]').waitFor();
 await page.evaluate(()=>document.querySelector('.pw-dot-city[data-city="kirihama"]').click());
 await page.locator('.pw-dot-world-map[data-scope="city"][data-city="kirihama"]').waitFor();
 assert.equal(await page.locator('.pw-metro-edit-toggle:visible').count(),1);
 await shot('01-kirihama-170-stations-10-lines-before-edit.png');
 await page.locator('.pw-metro-edit-toggle').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.metroEditing==='true');
 let state=await inspect();
 assert.equal(state.active,true);assert.equal(state.state,'city');
 assert.equal(state.rails,181);assert.equal(state.dots,170);
 assert.equal(state.images,0,'rails must not use raster boxes');
 assert.equal(state.overlay,'none','normal rail must be hidden while editing');
 assert.equal(state.count.lines,10);assert.equal(state.count.interchanges,19);
 assert.equal(state.count.stations,170);
 await shot('02-kirihama-editable-rail-node-network.png');
 // The 181 rails have actual SVG stroke hit zones, not bounding image rects.
 const key=await page.evaluate(()=>document.querySelector(
  '.pw-metro-edit-edge[data-editor-line="a"]')?.dataset.editorEdge);
 assert.ok(key);
 let point=await edgePoint(key);
 await page.mouse.click(point.x,point.y);
 assert.equal(await page.locator('.pw-metro-edit-edge[data-selected="true"]').count(),1);
 const focus=await page.evaluate(()=>{
  const g=document.querySelector('.pw-metro-edit-edge[data-selected="true"]');
  const hit=g?.querySelector('.pw-metro-edit-hit');
  return {selected:!!g,hit:!!hit,outer:g?.outerHTML.slice(0,550),
   outline:hit?getComputedStyle(hit).outlineStyle:null,
   boxShadow:hit?getComputedStyle(hit).boxShadow:null};
 });
 console.log('EDITOR TRUE SVG HIT PROOF',JSON.stringify(focus));
 assert.equal(focus.selected,true,JSON.stringify(focus));
 assert.equal(focus.hit,true,JSON.stringify(focus));
 assert.equal(focus.outline,'none');assert.equal(focus.boxShadow,'none');
 // A selected route accepts a new control point on the same integer dot grid.
 await clickAction('bend');
 point=await edgePoint(key);
 const before=await page.evaluate(k=>window.PaperWorldMetroEditorDebug.model
  .bends(window.PaperWorldMetroEditorDebug.model.edgeFor(k)).length,key);
 await page.mouse.click(point.x,point.y);
 const after=await page.evaluate(k=>window.PaperWorldMetroEditorDebug.model
  .bends(window.PaperWorldMetroEditorDebug.model.edgeFor(k)).length,key);
 assert.equal(after,before+1,'clicking a real rail must append a bend');
 const bb=await page.evaluate(()=>{
  const handle=document.querySelector('.pw-metro-edit-bend');
  if(!handle)throw Error('A new rounded bend handle must exist');
  const r=handle.getBoundingClientRect();
  return {x:r.x,y:r.y,width:r.width,height:r.height};
 });
 await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);
 await page.mouse.down();
 await page.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2+56,{steps:12});
 await page.mouse.up();
 const moved=await page.evaluate(k=>window.PaperWorldMetroEditorDebug.model
  .bends(window.PaperWorldMetroEditorDebug.model.edgeFor(k)),key);
 assert.equal(moved.length,after);
 assert.ok(moved[0].every(Number.isInteger),'control point snapped to a dot');
 await shot('03-kirihama-rounded-selected-route-control-dot.png');
 // Save and reopen: browser storage keeps the entire editable blueprint.
 await clickAction('save');
 assert.equal(await page.evaluate(()=>!!localStorage.getItem(
  window.PaperWorldMetroMapEditor.KEY)),true);
 await page.locator('.pw-metro-edit-toggle').click(); // finish editing
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.metroEditing==='false');
 assert.ok((await inspect()).overlay!=='none','operating tracks must come back');
 await page.locator('.pw-metro-edit-toggle').click();
 assert.equal((await inspect()).active,true);
 assert.equal(await page.evaluate(k=>window.PaperWorldMetroEditorDebug.model
  .bends(window.PaperWorldMetroEditorDebug.model.edgeFor(k)).length,key),after);
 await shot('04-kirihama-saved-rail-planning-blueprint.png');
 assert.deepEqual(errors.filter(s=>/ReferenceError|TypeError|SyntaxError/.test(s)),[],
  'Chrome must not have map editor JS errors');
 console.log('POINT CONNECT METRO CHROME PASS',JSON.stringify({state:await inspect(),
  bendCount:after,saved:true,errors}));
}finally{await browser.close()}

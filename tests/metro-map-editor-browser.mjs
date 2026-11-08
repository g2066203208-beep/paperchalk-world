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
  nodeLod:map?.dataset.editorNodeDensity,
  visibleNormalStations:document.querySelectorAll(
   '.pw-dot-local-places .is-station[data-node-visible="true"]').length,
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
 await page.locator('.pw-dot-world-map[data-scope="city"][data-city="kirihama"]').waitFor();
 // Stage-zero screenshot must show the REAL, current game with only its dot
 // lattice visible. The test then unveils legacy layers for edit regressions.
 const empty=await page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const display=selector=>{
   const el=map.querySelector(selector);return el?getComputedStyle(el).display:null;
  };
  return {mode:map.dataset.presentation,dots:map.querySelectorAll('.pw-transit-dot-matrix circle').length,
   heading:display('.pw-dot-chrome'),metro:display('.pw-dot-urban-lines'),
   pins:display('.pw-dot-local-places'),editor:display('.pw-metro-edit-toolbar'),
   svg:display('.pw-dot-rail-canvas')};
 });
 assert.equal(empty.mode,'dots-only');
 assert.ok(empty.dots>1500,'all original map dots should remain');
 for(const layer of ['heading','metro','pins','editor'])assert.equal(empty[layer],'none',JSON.stringify(empty));
 assert.notEqual(empty.svg,'none','do not hide the dot grid with its parent SVG');
 await page.waitForFunction(()=>{
  const m=document.querySelector('.pw-dot-world-map');
  return Number(m?.dataset.rippleFrames||0)>=5&&m?.dataset.fogSource==='live-world-fluid';
 },{timeout:15000});
 const waveState=()=>page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const canvas=map.querySelector('.pw-dot-wave-surface');
  const ctx=canvas.getContext('2d');
  const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let bright=0,weighted=0;
  for(let i=3;i<rgba.length;i+=4){
   if(rgba[i]>0){bright++;weighted=(weighted+(rgba[i]*(i%997)))%2147483647}
  }
  const fogLayer=map.querySelector('.pw-dot-fog-surface');
  const fogCtx=fogLayer.getContext('2d');
  const samples=[[.18,.18],[.5,.18],[.82,.18],
   [.18,.5],[.5,.5],[.82,.5],[.18,.82],[.5,.82],[.82,.82]]
   .map(([u,v])=>{
    const px=fogCtx.getImageData(Math.floor(fogLayer.width*u),
     Math.floor(fogLayer.height*v),1,1).data;
    return {r:px[0],g:px[1],b:px[2],a:px[3]};
   });
  return {frames:+map.dataset.rippleFrames,bright,weighted,
   fog:map.dataset.fogSource,rings:+map.dataset.rippleCount,
   renderer:document.querySelector('#fog')?.dataset.renderer,
   dotMode:map.dataset.dotAnimation,coverage:map.dataset.fogCoverage,
   style:map.dataset.rippleStyle,samples};
 });
 const beforeWave=await waveState();
 assert.ok(beforeWave.bright>100,'ripple dots must be painted in Canvas2D');
 assert.equal(beforeWave.dotMode,'fluid-ripples');
 assert.ok(beforeWave.rings>=1,'at least one expanding ring exists');
 assert.equal(beforeWave.coverage,'full','fog must cover the whole map');
 assert.equal(beforeWave.style,'subtle-slow');
 assert.ok(beforeWave.samples.every(p=>p.a===255&&p.r<=22&&p.g<=22&&p.b<=22),
  'entire map should be almost black with no grey opening: '+JSON.stringify(beforeWave.samples));
 await shot('00-original-game-empty-dot-canvas.png');
 await page.waitForTimeout(4800);
 const afterWave=await waveState();
 assert.ok(afterWave.frames>beforeWave.frames,'water surface must update continuously');
 assert.notEqual(afterWave.weighted,beforeWave.weighted,
  'dot alpha/radius must change over time from mathematical water ripples');
 await shot('00b-original-game-black-fog-expanding-ripples.png');
 if(process.env.PAPERCHALK_RIPPLE_GIF_CAPTURE==='1'){
  for(let i=0;i<12;i++){
   await page.waitForTimeout(700);
   await shot('ripple-frame-'+String(i).padStart(2,'0')+'.png');
  }
 }
 console.log('LIVE FLUID FOG + WATER RIPPLES CHROMIUM PROOF',JSON.stringify({beforeWave,afterWave,empty}));
 await page.evaluate(()=>document.querySelector('.pw-dot-world-map')?.classList.remove('pw-dot-empty-preview'));
 assert.equal(await page.locator('.pw-metro-edit-toggle:visible').count(),1);
 await shot('01-kirihama-70-stations-10-lines-before-edit.png');
 await page.locator('.pw-metro-edit-toggle').click();
 await page.waitForFunction(()=>document.querySelector('.pw-dot-world-map')?.dataset.metroEditing==='true');
 let state=await inspect();
 assert.equal(state.active,true);assert.equal(state.state,'city');
 assert.equal(state.rails,81);
 assert.ok(state.dots>=1&&state.dots<=30,
  'city overview must show only important editable hubs, not 70 pearl nodes: '+JSON.stringify(state));
 assert.equal(state.nodeLod,'hubs');
 assert.equal(state.images,0,'rails must not use raster boxes');
 assert.equal(state.overlay,'none','normal rail must be hidden while editing');
 assert.equal(state.count.lines,10);assert.equal(state.count.interchanges,19);
 assert.equal(state.count.stations,70);
 await shot('02-kirihama-editable-rail-node-network.png');
 // Choosing a colored route reveals and focuses that line in the real map.
 await page.evaluate(()=>document.querySelector('.pw-metro-edit-line[data-line="a"]').click());
 assert.equal(await page.locator('.pw-metro-edit-line[data-active="true"][data-line="a"]').count(),1);
 assert.equal((await inspect()).nodeLod,'selected-line');
 // The 81 rails have actual SVG stroke hit zones, not bounding image rects.
 const key=await page.evaluate(()=>document.querySelector(
  '.pw-metro-edit-edge[data-editor-line="a"]')?.dataset.editorEdge);
 assert.ok(key);
 let point=await edgePoint(key);
 await page.mouse.click(point.x,point.y);
 assert.equal(await page.locator('.pw-metro-edit-edge[data-selected="true"]').count(),1);
 state=await inspect();
 assert.equal(state.nodeLod,'selected-line');
 assert.ok(state.dots>=4&&state.dots<=24,
  'editing one route must reveal ONLY that route stations: '+JSON.stringify(state));
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

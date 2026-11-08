/* Real gameplay Chromium QA: ONE XY/Z terrain mesh, two camera modes.
 * Captures actual interactive canvas; never a fabricated tilted screenshot.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const out='artifacts/map-terrain-3d';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:650},deviceScaleFactor:1});
page.setDefaultTimeout(22000);
const errors=[];
const consoleMessages=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{
 if(m.type()==='warning'||m.type()==='error')consoleMessages.push(m.type()+': '+m.text());
});
const shot=async name=>{
 try{await page.screenshot({path:path.join(out,name),animations:'disabled',timeout:15000});return true}
 catch(e){console.warn('Software Chromium screenshot skipped:',name,String(e).slice(0,120));return false}
};
const inspect=()=>page.evaluate(()=>{
 const map=document.querySelector('.pw-dot-world-map');
 const engine=window.PaperWorldTransitMap?._terrain;
 const state=engine?.inspect();
 const canvas=map?.querySelector('.pw-dot-terrain-surface');
 const dot=map?.querySelector('.pw-dot-wave-surface');
 return {
  state,mode:map?.dataset.cameraMode,
  blend:Number(map?.dataset.cameraBlend||0),
  source:map?.dataset.terrainRenderer,
  frame:Number(map?.dataset.terrainFrame||0),
  bg:map?getComputedStyle(map).backgroundColor:null,
  fog:map?.querySelectorAll('.pw-dot-fog-surface').length,
  surface:canvas?{w:canvas.width,h:canvas.height,opacity:getComputedStyle(canvas).opacity}:null,
  dots:dot?getComputedStyle(dot).opacity:null,
  viewBox:map?.querySelector('svg.pw-dot-rail-canvas')?.getAttribute('viewBox')
 };
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
  const result=window.PaperWorldDailyLifeUI.engine.travel('entrance');
  if(!result.ok)throw Error(result.reason);
  document.querySelector('#quick-map').click();
 });
 await page.locator('.pw-dot-world-map.pw-dot-empty-preview').waitFor({state:'visible'});
 await page.waitForFunction(()=>Number(document.querySelector('.pw-dot-world-map')?.dataset.rippleFrames)>3);
 const flat=await inspect();
 assert.equal(flat.state?.world,'infinite');
 assert.equal(flat.mode,'2d');
 assert.equal(flat.source,'webgl-streamed-heightfield');
 assert.equal(await page.locator('.pw-dot-world-map').getAttribute('data-dot-world'),'infinite');
 // The 2D grid edges must be actual faint strokes, not just metadata.
 const hairline=await page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const canvas=map.querySelector('.pw-dot-wave-surface');
  const ctx=canvas.getContext('2d');
  const [left,top,ww,hh]=map.querySelector('svg.pw-dot-rail-canvas')
    .getAttribute('viewBox').split(' ').map(Number);
  const sx=canvas.width/ww,sy=canvas.height/hh;
  const gx=Math.floor((left+ww*.5)/40),gy=Math.floor((top+hh*.5)/40);
  const px=Math.round(((gx+.5)*40-left)*sx);
  const py=Math.round((gy*40-top)*sy);
  function sample(x,y){
   const a=ctx.getImageData(x-2,y-2,5,5).data;
   let total=0;for(let i=3;i<a.length;i+=4)total+=a[i];
   return total;
  }
  return {grid:map.dataset.gridMesh,along:sample(px,py),
   away:sample(px,py+12),coords:[px,py]};
 });
 assert.equal(hairline.grid,'orthogonal-hairlines');
 assert.ok(hairline.along>hairline.away,
  '2D hairline midpoint between adjacent dots must contain a visible faint stroke: '+JSON.stringify(hairline));
 assert.equal(flat.bg,'rgb(0, 0, 0)');
 assert.equal(flat.fog,0);
 assert.equal(flat.state.heightsDefined,false);
 assert.equal(await page.locator('.pw-dot-camera-toggle:visible').count(),1);
 await shot('01-real-game-flat-dot-map.png');
 // Real mutable 3D heightfield, not a DOM transform illusion.
 await page.evaluate(()=>{
  const terrain=window.PaperWorldTransitMap._terrain;
  if(!terrain.setHeight(20,13,125))throw Error('heightfield rejects terrain vertex');
  if(terrain.getHeight(20,13)!==125)throw Error('height not stored in terrain');
 });
 const raised=await inspect();
 assert.equal(raised.state.heightsDefined,true);
 await page.evaluate(()=>document.querySelector('.pw-dot-camera-toggle').click());
 console.log('AFTER 3D CLICK',JSON.stringify(await inspect()));
 await page.waitForTimeout(900);
 console.log('AFTER 3D 1.35s',JSON.stringify(await inspect()),
  'CONSOLE',JSON.stringify(consoleMessages),'PAGE_ERRORS',JSON.stringify(errors));
 try{
  await page.waitForFunction(()=>{
   const el=document.querySelector('.pw-dot-world-map');
   return el?.dataset.cameraMode==='3d'&&Number(el?.dataset.cameraBlend)>=.985;
  },{timeout:8000});
 }catch(error){
  console.error('3D transition FAILED state',JSON.stringify(await inspect()),
   'CONSOLE',JSON.stringify(consoleMessages),'PAGE_ERRORS',JSON.stringify(errors));
  throw error;
 }
 const three=await inspect();
 assert.equal(three.state.mode,'3d');
 assert.equal(three.state.world,'infinite');
 assert.ok(three.state.vertices>=400,'streamed mesh should generate many true XYZ vertices');
 assert.ok(three.state.triangles>=400,'streamed mesh should contain true triangular ground faces');
 assert.equal(three.state.meshStyle,'orthogonal-hairlines');
 assert.ok(three.state.gridEdges>500,'3D surface must connect actual terrain vertices by fine grid edges');
 assert.ok(three.state.nearTiles>0,'near grid chunks should be loaded');
 assert.ok(three.state.farTiles>0,'distant grid chunks should be streamed');
 assert.ok(three.state.pitch>.5);
 assert.ok(three.frame>0);
 assert.ok(three.surface.opacity>.9);
 assert.equal(three.state.heightsDefined,true);
 // The planar grid center/zoom are literally the same coordinates at swap.
 assert.equal(three.viewBox,flat.viewBox);
 await shot('02-real-game-3d-terrain-perspective.png');
 // Query DOM coordinates directly: software WebGL's continuously
 // composited canvas can stall Playwright locator auto-scrolling.
 const bounds=await page.evaluate(()=>document.querySelector('.pw-dot-world-map')
  .getBoundingClientRect().toJSON());
 assert.ok(bounds?.width>100&&bounds?.height>100);
 const cx=bounds.x+bounds.width*.5,cy=bounds.y+bounds.height*.5;
 await page.mouse.move(cx,cy);
 await page.mouse.down();
 await page.mouse.move(cx+140,cy+58,{steps:4});
 await page.mouse.up();
 await page.waitForTimeout(360);
 const orbited=await inspect();
 assert.ok(Math.abs(orbited.state.yaw-three.state.yaw)>.1,'drag must orbit in real 3D');
 assert.ok(Math.abs(orbited.state.pitch-three.state.pitch)>.05,'vertical drag must change elevation angle');
 await shot('03-real-game-3d-free-orbit.png');
 // A temporary terrain elevation thousands of cells outside the authored
 // 50x32 map must remain editable, and 3D streaming should follow there.
 await page.evaluate(()=>{
  const t=window.PaperWorldTransitMap._terrain;
  if(!t.setHeight(-250,-175,147)||t.getHeight(-250,-175)!==147)
   throw Error('unbounded negative terrain coordinate is not editable');
  const map=document.querySelector('.pw-dot-world-map');
  // One real keyboard pan event per lattice step; no camera bounds remain.
  for(let i=0;i<72;i++)map.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  for(let i=0;i<56;i++)map.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
 });
 await page.waitForTimeout(450);
 const farAway=await inspect();
 assert.notEqual(farAway.viewBox,orbited.viewBox,
  'camera must pan beyond the original 2000x1280 world');
 assert.notDeepEqual(farAway.state.origin,orbited.state.origin,
  '3D grid chunks must be regenerated around the remote camera');
 assert.ok(farAway.state.vertices>400,'remote 3D world must still contain a mesh');
 assert.equal(farAway.state.heightOverrides,2,
  'height edits are stored independently of the streamed viewport');
 await shot('03b-real-game-3d-infinite-world-away-from-city.png');
 // Native right-drag pans the same map world, wheel zooms that camera.
 await page.mouse.move(cx,cy);
 await page.mouse.down({button:'right'});
 await page.mouse.move(cx+80,cy-45,{steps:5});
 await page.mouse.up({button:'right'});
 await page.waitForTimeout(240);
 const panned=await inspect();
 assert.notEqual(panned.viewBox,orbited.viewBox,'right-drag should pan');
 await page.mouse.wheel(0,-220);
 await page.waitForTimeout(260);
 const zoomed=await inspect();
 assert.notEqual(zoomed.viewBox,panned.viewBox,'wheel should zoom');
 await page.evaluate(()=>{
  window.PaperWorldTransitMap._terrain.setHeight(20,13,0);
  window.PaperWorldTransitMap._terrain.setHeight(-250,-175,0);
 });
 await page.evaluate(()=>document.querySelector('.pw-dot-camera-toggle').click());
 await page.waitForFunction(()=>{
  const el=document.querySelector('.pw-dot-world-map');
  return el?.dataset.cameraMode==='2d'&&Number(el?.dataset.cameraBlend)===0;
 },{timeout:14000});
 const back=await inspect();
 assert.equal(back.state.heightsDefined,false);
 assert.equal(back.surface.opacity,'0');
 assert.equal(back.dots,'1');
 assert.equal(back.bg,'rgb(0, 0, 0)');
 await shot('04-real-game-return-to-flat-map.png');
 // A plane whose DOTS are confined to 2000x1280 will turn blank here.
 // Push the real map by thousands of world units, then check canvas pixels.
 const shifted=await page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const original=map.querySelector('svg.pw-dot-rail-canvas').getAttribute('viewBox');
  for(let i=0;i<86;i++){
   map.dispatchEvent(new KeyboardEvent('keydown',{
    key:'ArrowLeft',bubbles:true,cancelable:true
   }));
  }
  const final=map.querySelector('svg.pw-dot-rail-canvas').getAttribute('viewBox');
  return {original,final};
 });
 const previousX=Number(shifted.original.split(' ')[0]);
 const finalX=Number(shifted.final.split(' ')[0]);
 assert.ok(finalX<previousX-2000,'flat camera must leave the finite authored map freely');
 await page.waitForTimeout(380);
 const dotsOutside=await page.evaluate(()=>{
  const m=document.querySelector('.pw-dot-world-map');
  const canvas=m.querySelector('.pw-dot-wave-surface');
  const pixels=canvas.getContext('2d').getImageData(
   0,0,canvas.width,canvas.height).data;
  let visible=0;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;
  return {visible,world:m.dataset.dotWorld};
 });
 assert.equal(dotsOutside.world,'infinite');
 assert.ok(dotsOutside.visible>100,
  '2D points must continue painting well outside the original map');
 await shot('05-real-game-flat-infinite-panned-beyond-authored-world.png');
 // Exercise the ACTUAL sculpt toolbar using pointer gestures, not simply
 // invoking setHeight() internally. Verify persistence and undo/redo.
 await page.evaluate(()=>document.querySelector('.pw-terrain-edit-toggle').click());
 const toolPanel=page.locator('.pw-terrain-edit-panel');
 assert.ok(await toolPanel.isVisible(),'terrain editing panel must be in the actual game');
 assert.equal(await page.locator('.pw-terrain-edit-choice[data-op]').count(),4);
 assert.equal(await page.locator('.pw-terrain-edit-choice[data-shape]').count(),3);
 await page.evaluate(()=>{
  document.querySelector('.pw-terrain-edit-choice[data-shape="point"]').click();
  document.querySelector('.pw-terrain-edit-choice[data-op="raise"]').click();
  const step=document.querySelector('.pw-terrain-edit-setting input');
  step.value='12';step.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const box=await page.evaluate(()=>document.querySelector('.pw-dot-world-map')
  .getBoundingClientRect().toJSON());
 const start={x:box.x+box.width*.36,y:box.y+box.height*.50};
 const targetBefore=await page.evaluate(({x,y})=>{
  const m=document.querySelector('.pw-dot-world-map').getBoundingClientRect();
  return window.PaperWorldTransitMap._terrain.unproject(x-m.x,y-m.y);
 },start);
 assert.ok(targetBefore,'actual 2D cursor must map to XYZ terrain coordinates');
 await page.mouse.move(start.x,start.y);
 await page.mouse.down();await page.mouse.up();
 const afterPoint=await page.evaluate(({gx,gy})=>({
  height:window.PaperWorldTransitMap._terrain.getHeight(gx,gy),
  tool:window.PaperWorldTransitMap._terrainTools.inspect()
 }),targetBefore);
 assert.equal(afterPoint.height,12,'point brush must raise ground by 12 meters');
 assert.equal(afterPoint.tool.undo,1,'one pointer stroke creates exactly one undo entry');
 await page.evaluate(()=>document.querySelectorAll('.pw-terrain-edit-action')[0].click());
 assert.equal(await page.evaluate(({gx,gy})=>
  window.PaperWorldTransitMap._terrain.getHeight(gx,gy),targetBefore),0,'undo must restore old elevation');
 await page.evaluate(()=>document.querySelectorAll('.pw-terrain-edit-action')[1].click());
 assert.equal(await page.evaluate(({gx,gy})=>
  window.PaperWorldTransitMap._terrain.getHeight(gx,gy),targetBefore),12,'redo must restore sculpted elevation');
 // Draw the rectangular excavation and verify MULTIPLE raised/dig vertices.
 await page.evaluate(()=>{
  document.querySelector('.pw-terrain-edit-choice[data-shape="rect"]').click();
  document.querySelector('.pw-terrain-edit-choice[data-op="dig"]').click();
 });
 const rectA={x:box.x+box.width*.52,y:box.y+box.height*.38};
 const rectB={x:rectA.x+130,y:rectA.y+110};
 await page.mouse.move(rectA.x,rectA.y);
 await page.mouse.down();await page.mouse.move(rectB.x,rectB.y,{steps:6});
 await page.mouse.up();
 const digging=await page.evaluate(()=>{
  const pts=window.PaperWorldTransitMap._terrain.exportHeights();
  return {negative:pts.filter(p=>p[2]<0).length,
   stored:JSON.parse(localStorage.getItem('paperworld:terrain:heightfield:v1'))?.points?.length};
 });
 assert.ok(digging.negative>4,'rectangle drag must excavate a real area, not only one dot');
 assert.ok(digging.stored>4,'all height changes must persist to local storage');
 await shot('06-real-game-terrain-sculpt-excavation-and-tools.png');
 // Flatten a selected spot to a chosen elevation.
 await page.evaluate(()=>{
  document.querySelector('.pw-terrain-edit-choice[data-op="flatten"]').click();
  document.querySelector('.pw-terrain-edit-choice[data-shape="point"]').click();
  const target=document.querySelector('.pw-terrain-edit-target input');
  target.value='22';target.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.mouse.move(start.x,start.y);
 await page.mouse.down();await page.mouse.up();
 assert.equal(await page.evaluate(({gx,gy})=>
  window.PaperWorldTransitMap._terrain.getHeight(gx,gy),targetBefore),22,
  'flatten tool must set precise elevation');
 // Shape a distinct high plateau using the REAL rectangle+flatten UI, so
 // 3D screenshots demonstrate actual raised geometry instead of near-flat dots.
 await page.evaluate(()=>{
  document.querySelector('.pw-terrain-edit-choice[data-shape="rect"]').click();
  const target=document.querySelector('.pw-terrain-edit-target input');
  target.value='160';target.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const plateauA={x:box.x+box.width*.38,y:box.y+box.height*.56};
 const plateauB={x:plateauA.x+175,y:plateauA.y+135};
 await page.mouse.move(plateauA.x,plateauA.y);
 await page.mouse.down();await page.mouse.move(plateauB.x,plateauB.y,{steps:7});
 await page.mouse.up();
 const plateau=await page.evaluate(()=>{
  const pts=window.PaperWorldTransitMap._terrain.exportHeights();
  return pts.filter(p=>p[2]===160).length;
 });
 assert.ok(plateau>=8,'rectangle flatten should raise a visible level plateau');
 // Sculpt controls must still target real terrain points in orbit view.
 await page.evaluate(()=>document.querySelector('.pw-dot-camera-toggle').click());
 await page.waitForFunction(()=>Number(document.querySelector('.pw-dot-world-map')
  .dataset.cameraBlend)>.99);
 await page.evaluate(()=>{
  document.querySelector('.pw-terrain-edit-choice[data-shape="point"]').click();
  document.querySelector('.pw-terrain-edit-choice[data-op="raise"]').click();
  const step=document.querySelector('.pw-terrain-edit-setting input');
  step.value='35';step.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const threeDTarget={x:box.x+box.width*.33,y:box.y+box.height*.62};
 const before3D=await page.evaluate(({x,y})=>{
  const box=document.querySelector('.pw-dot-world-map').getBoundingClientRect();
  const t=window.PaperWorldTransitMap._terrain;
  const p=t.unproject(x-box.x,y-box.y);
  return {...p,height:t.getHeight(p.gx,p.gy)};
 },threeDTarget);
 assert.ok(Number.isFinite(before3D.height),'3D picking must map onto the terrain');
 await page.mouse.move(threeDTarget.x,threeDTarget.y);
 await page.mouse.down();await page.mouse.up();
 const after3D=await page.evaluate(({gx,gy})=>
  window.PaperWorldTransitMap._terrain.getHeight(gx,gy),before3D);
 assert.equal(after3D,Math.min(800,before3D.height+35),
  'mouse click in free 3D view must raise the physically projected XYZ vertex');
 await shot('07-real-game-sculpted-3d-heightfield.png');
 const edited3D=await page.evaluate(()=>({
  mode:document.querySelector('.pw-dot-world-map').dataset.cameraMode,
  heights:window.PaperWorldTransitMap._terrain.exportHeights().length,
  tool:window.PaperWorldTransitMap._terrainTools.inspect()
 }));
 assert.equal(edited3D.mode,'3d');assert.ok(edited3D.heights>4);
 await page.evaluate(()=>document.querySelector('.pw-terrain-edit-toggle').click());
 assert.equal(await page.locator('.pw-terrain-edit-panel').isVisible(),false,
  'finishing terrain edit must restore uncluttered map');
 assert.ok(!errors.some(x=>/dot-terrain-3d|dot-terrain-tools|Map dot animation disabled|TypeError|ReferenceError/i.test(x)),
  'unexpected render error: '+errors.join('\\n').slice(0,1000));
 console.log('REAL GAME SEAMLESS 2D/3D TERRAIN CAMERA VERIFIED',
  JSON.stringify({flat,raised,three,orbited,farAway,panned,zoomed,back,shifted,dotsOutside,afterPoint,digging,plateau,before3D,after3D,edited3D}));
}finally{await browser.close()}

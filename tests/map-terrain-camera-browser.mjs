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
 assert.ok(!errors.some(x=>/dot-terrain-3d|Map dot animation disabled|TypeError|ReferenceError/i.test(x)),
  'unexpected render error: '+errors.join('\\n').slice(0,1000));
 console.log('REAL GAME SEAMLESS 2D/3D TERRAIN CAMERA VERIFIED',
  JSON.stringify({flat,raised,three,orbited,farAway,panned,zoomed,back,shifted,dotsOutside}));
}finally{await browser.close()}

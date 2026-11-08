/* Real gameplay proof: solid black map with subtle moving dots, NO fog. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const base=process.env.PAPERCHALK_BROWSER_BASE||'http://127.0.0.1:8765/';
const output='artifacts/map-ripples';
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1640,height:930}});
page.setDefaultTimeout(25000);
const shot=async file=>{
 try{
  await page.screenshot({path:path.join(output,file),
   animations:'disabled',timeout:20000});
  return true;
 }catch(error){
  if(!/Timeout/.test(String(error)))throw error;
  console.warn('Screenshot timed out in software Chromium:',file);
  return false;
 }
};
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
 await page.waitForFunction(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  return +map?.dataset.rippleFrames>=5&&map?.dataset.mapBackground==='solid-black';
 },{timeout:20000});
 const sample=async()=>page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const fogCount=map.querySelectorAll('.pw-dot-fog-surface').length;
  const dc=map.querySelector('.pw-dot-wave-surface');
  const d=dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data;
  let pixels=0,sum=0;
  for(let i=3;i<d.length;i+=4){if(d[i]>0){pixels++;sum=(sum+d[i]*(i%101))%2147483647}}
  return {frames:+map.dataset.rippleFrames,background:map.dataset.mapBackground,
   fogCount,pixels,sum,
   mapBounds:map.getBoundingClientRect().toJSON(),
   backdrop:getComputedStyle(map).backgroundColor};
 });
 const before=await sample();
 assert.equal(before.background,'solid-black','no simulated map fog should remain');
 assert.equal(before.fogCount,0,'map fog canvases must have been removed');
 assert.equal(before.backdrop,'rgb(0, 0, 0)','map background must be pure #000');
 assert.ok(before.pixels>150,'animated map dots must remain visible');
 await shot('01-pure-black-subtle-dots.png');
 // A slow animation is captured several REAL seconds apart, not staged.
 let completeFrames=0;
 for(let i=0;i<4;i++){
  await page.waitForTimeout(1600);
  const saved=await shot('wave-'+String(i).padStart(2,'0')+'.png');
  if(!saved)break;
  completeFrames++;
 }
 assert.ok(completeFrames>=2,'capture at least two real frames of slow map fog');
 const after=await sample();
 assert.ok(after.frames>before.frames,'motion should continue');
 assert.notEqual(after.sum,before.sum,'dot field should move very gently');
 console.log('SOLID BLACK NO FOG AND SUBTLE DOT MOTION VERIFIED',
  JSON.stringify({before,after}));
}finally{await browser.close()}

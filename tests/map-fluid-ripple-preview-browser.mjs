/* The player's actual real-game map, not a fabricated UI mock.
 * Fast visual capture for black all-over fluid haze + nearly invisible dots.
 */
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
const shot=async file=>await page.screenshot({
 path:path.join(output,file),animations:'disabled',timeout:25000});
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
  return +map?.dataset.rippleFrames>=5&&map?.dataset.fogSource==='live-world-fluid';
 },{timeout:20000});
 const sample=async()=>page.evaluate(()=>{
  const map=document.querySelector('.pw-dot-world-map');
  const f=map.querySelector('.pw-dot-fog-surface');
  const p=f.getContext('2d');
  const colors=[[.1,.1],[.5,.1],[.9,.1],[.1,.5],[.5,.5],[.9,.5],[.1,.9],[.5,.9],[.9,.9]].map(([x,y])=>
   [...p.getImageData(Math.floor(x*f.width),Math.floor(y*f.height),1,1).data]);
  const dc=map.querySelector('.pw-dot-wave-surface');
  const d=dc.getContext('2d').getImageData(0,0,dc.width,dc.height).data;
  let pixels=0,sum=0;
  for(let i=3;i<d.length;i+=4){if(d[i]>0){pixels++;sum=(sum+d[i]*(i%101))%2147483647}}
  return {frames:+map.dataset.rippleFrames,
   fogFrames:+map.dataset.fogDensityFrames,
   fogSource:map.dataset.fogSource,coverage:map.dataset.fogCoverage,
   style:map.dataset.rippleStyle,colors,pixels,sum,
   mapBounds:map.getBoundingClientRect().toJSON(),
   backdrop:getComputedStyle(map).backgroundColor};
 });
 const before=await sample();
 assert.equal(before.coverage,'full');
 assert.equal(before.style,'subtle-slow');
 assert.ok(before.colors.every(c=>c[3]===255&&Math.max(...c.slice(0,3))<=22),
   'Full-field fog must be opaque BLACK everywhere: '+JSON.stringify(before.colors));
 assert.ok(before.pixels>150,'live map dots must be visible');
 await shot('01-full-screen-black-fog-subtle-dots.png');
 // A slow animation is captured several REAL seconds apart, not staged.
 for(let i=0;i<6;i++){
  await page.waitForTimeout(1600);
  await shot('wave-'+String(i).padStart(2,'0')+'.png');
 }
 const after=await sample();
 assert.ok(after.frames>before.frames,'motion should continue');
 assert.notEqual(after.sum,before.sum,'dot field should move very gently');
 console.log('FULL-FIELD BLACK FOG AND SUBTLE DOT MOTION VERIFIED',
  JSON.stringify({before,after}));
}finally{await browser.close()}

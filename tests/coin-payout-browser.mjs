/* Actual Chromium output: desktop, mobile & sideways real 3D coin piles.
 * Screenshot/video and runtime rigid-body collider assertions, not a mockup.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='artifacts/coin-payout-3d';fs.mkdirSync(out+'/videos',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const results=[];
for(const device of [{name:'desktop',w:1440,h:900},{name:'portrait',w:390,h:844},{name:'landscape',w:844,h:390}]){
 const ctx=await browser.newContext({viewport:{width:device.w,height:device.h},deviceScaleFactor:1,
  recordVideo:{dir:out+'/videos',size:{width:device.w,height:device.h}}});
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  const r=await page.goto('http://127.0.0.1:4173/card-battle/coin-payout-3d.html',{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await page.waitForFunction(()=>window.PaperchalkPayoutQA?.loaded,{timeout:16000});
  // Fixed timestamps via simulated physics frames, no rAF wall-clock blending.
  await page.evaluate(()=>window.PaperchalkPayoutQA.reset());
  const before=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot());
  assert.equal(before.count,0);
  assert.equal(before.facetCount,10);
  assert(before.geometryType.includes('CylinderGeometry'));
  assert.equal(before.real3D,true);
  assert(before.height<before.radius*.13);
  await page.screenshot({path:`${out}/${device.name}-00-empty-physical-table.png`});
  await page.evaluate(()=>window.PaperchalkPayoutQA.fire(120));
  const sequence=[{frames:36,name:'01-high-pressure-opening'},{frames:66,name:'02-first-gold-impacts'},
   {frames:88,name:'03-growing-real-3d-stack'}];
  const frames=[];
  for(const seq of sequence){
   await page.evaluate(n=>window.PaperchalkPayoutQA.advanceFrames(n),seq.frames);
   const s=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot());
   assert(s.count>0 && s.count<=120);
   assert.equal(s.count,s.renderInstances,'WebGL instance count must match physics collider bodies');
   await page.screenshot({path:`${out}/${device.name}-${seq.name}.png`,animations:'disabled'});
   frames.push(s);
  }
  assert(frames.at(-1).contacts>0,'must actually collide coin-to-coin with physical contact equations');
  await page.locator('#pile').click();
  await page.screenshot({path:`${out}/${device.name}-04-close-up-real-coin-pile.png`});
  await page.locator('#side').click();
  await page.screenshot({path:`${out}/${device.name}-05-side-view-true-height.png`});
  const prev=frames.at(-1).count;
  const extra=await page.evaluate(()=>window.PaperchalkPayoutQA.fire(240));
  assert.equal(extra,240);
  await page.evaluate(()=>window.PaperchalkPayoutQA.advanceFrames(100));
  const next=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot());
  assert(next.count>prev,'second batch must share persistent 3D coin pile');
  assert(next.moving>0);
  await page.screenshot({path:`${out}/${device.name}-06-second-high-energy-burst.png`});
  assert.deepEqual(errors,[], 'no fatal JS exception in live WebGL and physics');
  results.push({device:device.name,passed:true,before,frames,next});
  console.log('PASS',device.name,JSON.stringify({coins:next.count,contacts:next.contacts,peakHeight:next.peakHeight}));
 }catch(error){results.push({device:device.name,passed:false,error:String(error.stack||error),errors});
  console.error('FAIL',device.name,error);
  await page.screenshot({path:`${out}/${device.name}-FAIL.png`}).catch(()=>{});
 }finally{await ctx.close();}
}
await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
assert(results.every(x=>x.passed),'Some actual coin-payout browser runs failed');
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
  assert.equal(before.lighting.materialType,'MeshStandardMaterial','coin must receive real PBR lighting');
  assert.equal(before.lighting.pixelGoldMask,true,'gold and black ink on the original pixel coin require separate PBR metalness');
  assert.equal(before.lighting.coinReceivesShadows,true,'stacked coins should darken coins underneath, not only the basin');
  assert.equal(before.lighting.HDR,true,'scene should preserve highlights above display white');
  assert.equal(before.lighting.linearSource,true,'bloom must work before output sRGB conversion');
  assert.equal(before.lighting.realShadows,true,'machine and piled coins need actual shadow maps');
  assert.equal(before.lighting.environmentReflections,true,'gold should reflect a convolved environment');
  assert(before.lighting.bloom>.5,'film lighting must start with HDR glow');
  assert(before.bowl.left<before.bowl.right&&before.bowl.front>before.bowl.back,
    'coin catching bowl must have physical four-wall enclosure');
  assert(before.height<before.radius*.13);
  await page.screenshot({path:`${out}/${device.name}-00-empty-real-coin-basin.png`});
  await page.evaluate(()=>window.PaperchalkPayoutQA.fire(120));
  const sequence=[{frames:36,name:'01-high-pressure-opening'},{frames:66,name:'02-first-gold-impacts-in-basin'},
   {frames:88,name:'03-growing-real-3d-stack-in-basin'}];
  const frames=[];
  for(const seq of sequence){
   await page.evaluate(n=>window.PaperchalkPayoutQA.advanceFrames(n),seq.frames);
   const s=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot());
   assert(s.count>0 && s.count<=120);
   assert.equal(s.inBasin,s.count,'each coin must remain inside the 3D bowl, not spray off-screen');
   assert.equal(s.escapedEver,0,'physics must not let coins fly beyond the bowl walls');
   assert.equal(s.count,s.renderInstances,'WebGL instance count must match physics collider bodies');
   await page.screenshot({path:`${out}/${device.name}-${seq.name}.png`,animations:'disabled'});
   frames.push(s);
  }
  assert(frames.at(-1).contacts>0,'must actually collide coin-to-coin with physical contact equations');
  // Same physical game frame, camera and 120-body coin pile: compare LIGHTING only.
  await page.locator('#off').click();
  const noBloom=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot().lighting);
  assert.equal(noBloom.bloom,0);
  const without=await page.locator('#payout-view').screenshot({
   path:`${out}/${device.name}-03a-no-bloom-pbr-lighting.png`,animations:'disabled'});
  await page.locator('#strong').click();
  const strong=await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot().lighting);
  assert(strong.bloom>1.5 && strong.threshold<noBloom.threshold);
  const withGlow=await page.locator('#payout-view').screenshot({
   path:`${out}/${device.name}-03b-strong-hdr-bloom.png`,animations:'disabled'});
  assert(!without.equals(withGlow),'HDR bloom must visibly change real captured WebGL pixels');
  await page.locator('#pixel-render').click();
  assert.equal(await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot().lighting.pixelMode),true);
  await page.screenshot({path:`${out}/${device.name}-03c-downsampled-pixel-hdr.png`,animations:'disabled'});
  await page.locator('#pixel-render').click();
  await page.locator('#filmic').click();
  assert.equal(await page.evaluate(()=>window.PaperchalkPayoutQA.snapshot().lighting.look),'filmic');
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
  assert.equal(next.inBasin,next.count,'second burst must also remain inside the actual bowl');
  assert.equal(next.escapedEver,0,'all second-burst coins stay within the rim');
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
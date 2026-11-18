/* Actual Chromium whitebox QA. Real frames, real clicking, deterministic seek,
 * screenshots of the physical simulation and a full human-view WebM capture.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const OUTPUT='artifacts/slot-whitebox-motion';
fs.mkdirSync(`${OUTPUT}/videos`,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const profiles=[
 {name:'desktop-1365x900',width:1365,height:900,mobile:false},
 {name:'phone-390x844',width:390,height:844,mobile:true},
 {name:'landscape-844x390',width:844,height:390,mobile:true}
];
let failed=false;
for(const d of profiles){
 const ctx=await browser.newContext({viewport:{width:d.width,height:d.height},
  isMobile:d.mobile,hasTouch:d.mobile,deviceScaleFactor:1,
  recordVideo:{dir:`${OUTPUT}/videos`,size:{width:d.width,height:d.height}}});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/coin-whitebox-lab.html',{waitUntil:'load'});
  assert.equal(response.status(),200);
  assert(await page.locator('#start').isVisible());
  assert.equal(await page.locator('canvas#game').count(),1);
  await page.screenshot({path:`${OUTPUT}/${d.name}-00-idle.png`,fullPage:true});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.PaperchalkWhiteboxQA?.mode==='payout',null,{timeout:10000});
  await page.waitForTimeout(1600);
  assert((await page.evaluate(()=>window.PaperchalkWhiteboxQA.state.emitted))>=12,'real click must eject coins');
  const checkpoints=[360,900,1800,3200,5800,10000];
  let prev=0;
  for(const ms of checkpoints){
   const state=await page.evaluate(ms=>window.PaperchalkWhiteboxQA.seek(ms),ms);
   assert(Math.abs(state.timeMs-ms)<=5,'physics frame must be within half one 120Hz timestep');
   assert(state.emitted>=prev,'coins must exit one-by-one, never disappear');
   prev=state.emitted;
   assert(state.maxOverlap<3.0,'stack solver cannot permit major interpenetration');
   await page.screenshot({path:`${OUTPUT}/${d.name}-${ms}ms.png`,fullPage:true});
   console.log(d.name,ms,'emitted',state.emitted,'coin-collisions',state.coinImpacts,
    'sleeping',state.sleeping,'overlap',state.maxOverlap);
  }
  const end=await page.evaluate(()=>window.PaperchalkWhiteboxQA.state);
  assert.equal(end.emitted,48);
  assert(end.coinImpacts>=48 && end.sleeping>=44);
  assert.equal(end.phase,'settled');
  await page.evaluate(()=>window.PaperchalkWhiteboxQA.start(48,false));
  const a=await page.evaluate(()=>window.PaperchalkWhiteboxQA.seek(3200));
  const b=await page.evaluate(()=>window.PaperchalkWhiteboxQA.seek(3200));
  assert.deepEqual(a,b,'full browser physical stack must replay exactly');
  // Touch-sized mobile controls and close-up crop of the SAME physics frame.
  if(d.mobile&&d.width<=620){
   assert(await page.locator('#detail').isVisible(),'portrait requires enlarged pile view');
   const button=await page.locator('#many').boundingBox();
   assert(button.width>=90&&button.height>=43,'tap target too small');
  }
  await page.locator('#many').click();
  await page.waitForFunction(()=>window.PaperchalkWhiteboxQA.mode==='payout',null,{timeout:10000});
  await page.waitForTimeout(250);
  const many=await page.evaluate(()=>window.PaperchalkWhiteboxQA.seek(6000));
  assert.equal(many.emitted,76);
  assert(many.coinImpacts>76,'jackpot still needs mutual collision');
  await page.screenshot({path:`${OUTPUT}/${d.name}-76-jackpot.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS whitebox browser',d.name);
 }catch(error){
  failed=true;console.error('FAIL whitebox browser',d.name,error.stack||String(error));
  await page.screenshot({path:`${OUTPUT}/${d.name}-FAIL.png`,fullPage:true}).catch(()=>{});
 }finally{await ctx.close();}
}
await browser.close();
assert(!failed,'At least one real Chromium whitebox test failed');
/* Verified Chromium frames of the SAME 3D dispenser and real uploaded portraits.
 * Evidence is not concept art. Uses the built-in deterministic timeline seek.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='artifacts/character-card-machine';
fs.mkdirSync(out+'/videos',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader'
]});
const results=[];
for(const d of [
 {name:'desktop',width:1440,height:900},
 {name:'portrait',width:390,height:844},
 {name:'landscape',width:844,height:390}
]){
 const context=await browser.newContext({viewport:{width:d.width,height:d.height},
  deviceScaleFactor:1,recordVideo:{dir:out+'/videos',size:{width:d.width,height:d.height}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/character-card-machine.html',
   {waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.loaded,{timeout:22000});
  let initial=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.equal(initial.reelMeshes,3);
  assert.equal(initial.cardModel3D,true);
  assert.equal(initial.metallic,true);
  assert.equal(initial.HDR,true);
  assert.equal(await page.evaluate(()=>window.PaperchalkCharacterMachineQA.manifestCount),35);
  if(d.name==='landscape'){
   const layout=await page.evaluate(()=>({
    stageBottom:document.querySelector('.stage').getBoundingClientRect().bottom,
    stageTop:document.querySelector('.stage').getBoundingClientRect().top,
    controlBottom:document.querySelector('.controls').getBoundingClientRect().bottom,
    windowHeight:innerHeight
   }));
   assert(layout.stageTop>=0&&layout.stageBottom<=layout.windowHeight,
    'landscape machine must fit entirely on the viewport BEFORE button click');
   assert(layout.controlBottom<=layout.windowHeight,
    'landscape draw buttons must remain visible without a scroll');
  }
  await page.screenshot({path:out+'/'+d.name+'-00-machine-standby.png'});
  await page.locator('#draw-one').click();
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.current &&
   window.PaperchalkCharacterMachineQA?.state?.portraitLoaded,{timeout:22000});
  const stamps=[
   [400,'01-reels-fast'],
   [1550,'02-reels-brake'],
   [2100,'03-card-back-exiting-chute'],
   [2700,'04-real-card-rotation'],
   [3180,'05-hdr-reveal'],
   [3800,'06-portrait-on-card']
  ];
  let first,final;
  for(const [ms,label] of stamps){
   const stage=await page.evaluate(ms=>window.PaperchalkCharacterMachineQA.seek(ms),ms);
   if(ms===2100)assert(stage.card.visible&&stage.card.rotationY>3,
    'cardstock leaves MACHINE backside first');
   if(ms===2700)assert(stage.card.rotationY>0 && stage.card.rotationY<3.15);
   if(ms===3800)assert(stage.complete&&stage.card.rotationY<.01);
   await page.evaluate(()=>window.PaperchalkCharacterMachineQA.redraw());
   const png=await page.screenshot({path:out+'/'+d.name+'-'+label+'.png',animations:'disabled'});
   if(ms===400)first=png;if(ms===3800)final=png;
  }
  assert(!first.equals(final),'the live WebGL machine must visibly change during the sequence');
  assert(await page.locator('#card-name').isVisible(),'a REAL character must be named on reveal');
  const after=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.equal(after.revealed,true);
  assert(after.items>=1);
  assert(!errors.length,'fatal JS exceptions: '+errors.join('\n'));
  // Queue five ACTUAL new character cards, not five CSS clones.
  await page.locator('#draw-five').click();
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.queued>=4 ||
   window.PaperchalkCharacterMachineQA?.state?.starting,{timeout:3000});
  await page.screenshot({path:out+'/'+d.name+'-07-five-draws-queued.png'});
  results.push({viewport:d.name,passed:true,character:after.current,id:after.currentId,
   portraits:35,beforeCount:initial.items,afterCount:after.items,errors});
  console.log('PASS',d.name,after.current,'portrait from',after.currentId);
 }catch(e){
  results.push({viewport:d.name,passed:false,error:String(e.stack||e),errors});
  await page.screenshot({path:out+'/'+d.name+'-FAIL.png'}).catch(()=>{});
  console.error('FAIL',d.name,e.stack||e);
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
assert(results.every(r=>r.passed),'REAL character-card machine browser QA failed');

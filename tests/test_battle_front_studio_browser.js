/* Browser proof: the uploaded battle PSD is already hosted. No user file input.
 * This is a separate character, never replacing protagonist or char-002.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const URL=process.env.BATTLE_FRONT_TEST_URL||
 'http://127.0.0.1:8139/character-editor/?character=protagonist-battle-front&side=front';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
  await page.goto(URL,{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-battle-front',
   null,{timeout:30000});
  await page.waitForFunction(()=>window.PaperchalkStudio?.countSourceParts?.()===24,
   null,{timeout:45000});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active,
   null,{timeout:15000});
  const result=await page.evaluate(()=>{
   const layers=window.characterEditor.S.layers.front.filter(p=>p.sourcePart);
   const model=window.PaperchalkPartRigStudio.state.model;
   const canvas=document.querySelector('#view');
   const rgba=canvas.getContext('2d',{willReadFrequently:true})
    .getImageData(0,0,canvas.width,canvas.height).data;
   let opaque=0;
   for(let i=3;i<rgba.length;i+=4)if(rgba[i]>80)opaque++;
   return {
    id:window.PaperchalkStudio.current,
    layerCount:layers.length,
    axeOverhead:layers.find(p=>p.partId==='axe_overhead')?.visible,
    axeHeld:layers.find(p=>p.partId==='axe_held')?.visible,
    partIds:Object.keys(model?.parts||{}),
    opaque,
    status:document.querySelector('#studio-status')?.textContent,
    meshActive:window.PaperchalkPartRigStudio.state.active
   };
  });
  assert.equal(result.id,'protagonist-battle-front');
  assert.equal(result.layerCount,24);
  assert.equal(result.meshActive,true);
  assert.equal(result.partIds.length,24);
  assert.equal(result.axeOverhead,false,'duplicate overhead axe must be hidden');
  assert.equal(result.axeHeld,true,'held axe must remain in the artwork');
  assert.ok(result.opaque>1500,'original PSD character must be visibly rendered');
  assert.equal(await page.locator('#studio-battle-import-row').isVisible(),true);
  assert.equal(await page.locator('#studio-character').inputValue(),'protagonist-battle-front');
  fs.mkdirSync('artifacts/battle-front',{recursive:true});
  await page.screenshot({path:'artifacts/battle-front/01-auto-loaded-24-layers.png'});
  assert.ok(!exceptions.length,'browser exceptions: '+exceptions.join(' | '));
  // Switch to the original protagonist: the battle slot must NOT overwrite her.
  await page.locator('#studio-character').selectOption('protagonist');
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist',
   null,{timeout:30000});
  assert.equal(await page.locator('#studio-battle-import-row').isVisible(),false);
  await page.close();
  console.log('PASS browser: original battle PSD 24 PNGs auto-load with hidden duplicate axe, active mesh rig and no character override');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

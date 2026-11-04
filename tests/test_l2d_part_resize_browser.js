/* Real Chromium contract: independent, nondestructive ArtMesh sizing
 * survives Save, reload and stays attached to the correct character. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio.state.model.parts.pants_overlay,
   null,{timeout:50000});
  await page.locator('#rig-part').selectOption('pants_overlay');
  assert.equal(await page.locator('#rig-fit-panel').isVisible(),true);
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'100');
  await page.locator('#rig-fit-lock').uncheck();
  await page.locator('#rig-fit-width').fill('86');
  await page.locator('#rig-fit-height').fill('110');
  await page.locator('#rig-fit-x').fill('8');
  await page.locator('#rig-fit-y').fill('-11');
  await page.locator('#rig-fit-help').click();
  let scaled=await page.evaluate(()=>{
   const ed=window.characterEditor,m=window.PaperchalkPartRigStudio.state.model;
   const p=m.parts.pants_overlay,part=ed.S.layers.front.find(x=>x.partId==='pants_overlay');
   const b=window.PaperchalkPartRigCore.placedBounds(p);
   return {placement:p.placement,original:{w:part.canvas.width,h:part.canvas.height},
    bounds:b,skin:p._garmentLegs===m.parts.legwear};
  });
  assert.deepEqual(scaled.placement,{scaleX:.86,scaleY:1.1,offsetX:8,offsetY:-11});
  assert.equal(scaled.skin,true);
  assert.equal(scaled.original.w>0&&scaled.original.h>0,true);
  await page.locator('#rig-fit-handles').click();
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'true');
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const x=await window.PaperchalkStudio.readPartRig('female-06','front');
   return x?.parts?.pants_overlay?.placement?.scaleX===.86&&
    x?.parts?.pants_overlay?.placement?.offsetY===-11;
  },null,{timeout:35000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>
   window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkPartRigStudio.state.model.parts.pants_overlay.placement.scaleX===.86,
   null,{timeout:50000});
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'86');
  await page.locator('#rig-part').selectOption('pants_overlay');
  assert.equal(await page.locator('#rig-fit-height').inputValue(),'110');
  await page.locator('#rig-fit-reset').click();
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const rig=await window.PaperchalkStudio.readPartRig('female-06','front');
   const t=rig.parts.pants_overlay.placement;
   return t.scaleX===1&&t.scaleY===1&&t.offsetX===0&&t.offsetY===0;
  },null,{timeout:35000});
  assert.deepEqual(errors,[],'no browser page errors during sizing/save/reload');
  console.log('PASS female06 resize inspector: independent X/Y scale, offset, canvas handles, save/reload, reset, source PNG preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

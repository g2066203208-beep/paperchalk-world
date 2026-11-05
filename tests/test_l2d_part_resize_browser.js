/* Real Chromium: garment sizing belongs to the THIRD outfit, not the
 * original female-06 body. Shares weights; source pixels and rig persist. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const id='female-06-outfit-02',piece='bottomwear';
  const url='http://127.0.0.1:8134/character-editor/?character='+id+'&side=front';
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkStudio?.current==='female-06-outfit-02'&&
   window.PaperchalkPartRigStudio.state.model.parts.bottomwear?._garmentLegs===
   window.PaperchalkPartRigStudio.state.model.parts.legwear,null,{timeout:60000});
  await page.locator('#workspace-inspector-tabs [data-inspector="placement"]').click();
  await page.locator('#rig-part').selectOption(piece);
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'false');
  await page.locator('#rig-fit-handles').click();
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#rig-fit-precise').getAttribute('open'),null);
  await page.locator('#rig-fit-precise summary').click();
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'100');
  await page.locator('#rig-fit-lock').uncheck();
  for(const [name,value] of [['width','86'],['height','110'],['x','8'],['y','-11']])
   await page.locator('#rig-fit-'+name).fill(value);
  await page.locator('#rig-fit-panel .rig-fit-heading strong').click();
  const result=await page.evaluate(()=>{
   const m=window.PaperchalkPartRigStudio.state.model;
   const layer=window.characterEditor.S.layers.front.find(x=>x.partId==='bottomwear');
   return {placement:m.parts.bottomwear.placement,bound:m.parts.bottomwear._garmentLegs===m.parts.legwear,
      bitmap:{w:layer.canvas.width,h:layer.canvas.height}};
  });
  assert.deepEqual(result.placement,{scaleX:.86,scaleY:1.1,offsetX:8,offsetY:-11});
  assert.equal(result.bound,true);
  assert.ok(result.bitmap.w>0&&result.bitmap.h>0);
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const rig=await window.PaperchalkStudio.readPartRig('female-06-outfit-02','front');
   return rig?.parts?.bottomwear?.placement?.scaleX===.86&&
     rig?.parts?.bottomwear?.placement?.offsetY===-11;
  },null,{timeout:35000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06-outfit-02'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkPartRigStudio.state.model.parts.bottomwear?.placement?.scaleX===.86,
   null,{timeout:50000});
  await page.locator('#workspace-inspector-tabs [data-inspector="placement"]').click();
  await page.locator('#rig-part').selectOption(piece);
  await page.locator('#rig-fit-precise summary').click();
  assert.equal(await page.locator('#rig-fit-width').inputValue(),'86');
  assert.equal(await page.locator('#rig-fit-height').inputValue(),'110');
  assert.equal(await page.locator('#rig-fit-handles').getAttribute('aria-pressed'),'false');
  await page.locator('#rig-fit-handles').click();
  const handle=await page.evaluate(()=>{
   const S=window.characterEditor.S;
   const p=window.PaperchalkPartRigStudio.state.model.parts.bottomwear;
   const b=window.PaperchalkPartRigCore.placedBounds(p);
   const rect=document.querySelector('#stage').getBoundingClientRect();
   return {x:rect.left+S.px+(b.x+b.w)*S.zoom,y:rect.top+S.py+(b.y+b.h)*S.zoom};
  });
  await page.mouse.move(handle.x,handle.y);await page.mouse.down();
  await page.mouse.move(handle.x+16,handle.y+12,{steps:5});await page.mouse.up();
  const resized=await page.evaluate(()=>window.PaperchalkPartRigStudio.state.model.parts.bottomwear.placement.scaleX);
  assert.ok(resized>.86,'user drag handle must resize only the selected outfit');
  await page.locator('#rig-fit-reset').click();await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const rig=await window.PaperchalkStudio.readPartRig('female-06-outfit-02','front');
   const t=rig?.parts?.bottomwear?.placement;
   return t&&t.scaleX===1&&t.scaleY===1&&t.offsetX===0&&t.offsetY===0;
  },null,{timeout:35000});
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    Object.keys(window.PaperchalkPartRigStudio.state.model.parts).length===17,null,{timeout:50000});
  assert.equal(await page.evaluate(()=>!!window.PaperchalkPartRigStudio.state.model.parts.pants_overlay),false);
  assert.deepEqual(errors,[]);
  console.log('PASS third-outfit weighted pants resize/save/reload; original 17-part body unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

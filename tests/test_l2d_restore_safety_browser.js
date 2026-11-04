/* Recovery UX regression: never erase author-edited PSD textures or masks.
 * Runs against real hosted 25-source female-heroine crouch in Chromium. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dlg=>dlg.accept());
  await page.goto('http://127.0.0.1:8134/character-editor/?character=protagonist-crouch-axe&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkStudio?.countSourceParts?.()===25,
   null,{timeout:55000});
  assert.equal(await page.locator('#btnRecovery').isVisible(),true);
  await page.locator('#btnRecovery').click();
  assert.equal(await page.locator('#studio-recovery').isVisible(),true);
  const init=await page.evaluate(()=>{
   const ed=window.characterEditor,rig=window.PaperchalkPartRigStudio;
   rig.select('topwear');
   return {
    ids:ed.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId),
    placement:{...rig.state.model.parts.topwear.placement}
   };
  });
  await page.evaluate(()=>{
   const q=document.querySelector('#rig-fit-width');
   q.value='137';q.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.parts.topwear.placement.scaleX),1.37);
  await page.locator('#recover-scale').click();
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.parts.topwear.placement.scaleX),
   init.placement.scaleX,'width returns to the authoring-session baseline');
  await page.evaluate(()=>{
   const q=document.querySelector('#rig-fit-x');
   q.value='71';q.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.parts.topwear.placement.offsetX),71);
  await page.locator('#recover-position').click();
  await page.waitForFunction(target=>
   window.PaperchalkPartRigStudio?.state?.model?.parts?.topwear?.placement?.offsetX===target,
   init.placement.offsetX,{timeout:12000});
  await page.waitForTimeout(550);
  await page.evaluate(()=>{
   const q=document.querySelector('#rig-crouch-motion input[data-crouch="depth"]');
   q.value='190';q.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.crouchDynamics.depth),1.9);
  await page.locator('#recover-motion').click();
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.crouchDynamics.depth),0);
  assert.equal(await page.evaluate(()=>
   window.PaperchalkPartRigStudio.state.model.crouchDynamics.body),0);
  assert.equal(await page.evaluate(()=>window.PaperchalkPartRigStudio.canUndo()),true);
  // The entire user-created occlusion relationship and existing outfit are
  // captured as a MANUAL saved checkpoint (not the immutable source ZIP).
  const baseline=await page.evaluate(async()=>{
   const ed=window.characterEditor,rig=window.PaperchalkPartRigStudio;
   const part=ed.S.layers.front.find(p=>p.partId==='topwear');
   const mask=document.createElement('canvas');mask.width=part.canvas.width;
   mask.height=part.canvas.height;
   mask.getContext('2d').fillRect(5,7,17,17);
   rig.state.model.occlusionMasks=[{
    source:'topwear',target:'legwear_l',targets:['legwear_l'],
    direction:'behind',enabled:true,png:mask.toDataURL('image/png')
   }];
   await ed.save();await rig.save();await ed.recordManualCheckpoint();
   return {image:part.canvas.toDataURL(),mask:rig.state.model.occlusionMasks[0].png};
  });
  await page.evaluate(()=>{
   const ed=window.characterEditor,part=ed.S.layers.front.find(p=>p.partId==='topwear');
   ed.check();
   const ctx=part.canvas.getContext('2d');
   ctx.fillStyle='rgb(255,0,205)';ctx.fillRect(35,35,40,40);
   ed.autosave();
  });
  assert.notEqual(await page.evaluate(()=>
   window.characterEditor.S.layers.front.find(p=>p.partId==='topwear').canvas.toDataURL()),
   baseline.image,'create a visible wrong brush stroke');
  await page.locator('#recover-last').click();
  await page.waitForFunction(ref=>
   window.characterEditor.S.layers.front.find(p=>p.partId==='topwear')?.canvas.toDataURL()===ref,
   baseline.image,{timeout:30000});
  const after=await page.evaluate(()=>{
   const ed=window.characterEditor,rig=window.PaperchalkPartRigStudio.state.model;
   return {image:ed.S.layers.front.find(p=>p.partId==='topwear').canvas.toDataURL(),
    ids:ed.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId),
    mask:rig.occlusionMasks?.find(m=>m.source==='topwear'&&m.direction==='behind')?.png};
  });
  assert.equal(after.image,baseline.image,'restore artist-saved texture, not original stock PSD');
  assert.deepEqual(after.ids,init.ids,'no art layers deleted during recovery');
  assert.equal(after.mask,baseline.mask,'artist occlusion mask restored unchanged');
  require('node:fs').mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({path:'artifacts/character-editor/RECOVERY-EDITOR-CROUCH.png',
   fullPage:true});
  assert.deepEqual(errors,[],'browser must have no JS exceptions');
  console.log('PASS L2D restore: top recovery, position, scale, pose rest, authored PNG checkpoint and mask fidelity');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

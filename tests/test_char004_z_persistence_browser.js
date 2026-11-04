const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=char-004&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-004'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===23,
    null,{timeout:50000}).catch(async error=>{
      console.log('CHAR004 start diagnostic',await page.evaluate(()=>({
       current:window.PaperchalkStudio?.current,parts:window.characterEditor?.S.layers.front
        .filter(p=>p.sourcePart).map(p=>p.partId),
       active:window.PaperchalkPartRigStudio?.state?.active,
       model:window.PaperchalkPartRigStudio?.state?.model?.characterId,
       status:document.querySelector('#studio-status')?.textContent,
       notes:document.querySelector('#status')?.textContent,
       warnings:document.querySelector('#rig-info')?.textContent
      })),errors);throw error;
    });
  const original=await page.evaluate(()=>window.characterEditor.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId));
  assert.equal(new Set(original).size,23);
  // Switch two actual mesh layers using the same action as the user.
  const part=original[5];const idx=await page.evaluate(part=>
    window.characterEditor.S.layers.front.findIndex(x=>x.partId===part),part);
  await page.locator('#layers .layer[data-index="'+idx+'"] button').nth(1).click();
  const reordered=await page.evaluate(()=>window.characterEditor.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId));
  assert.notDeepEqual(reordered,original);
  assert.equal(new Set(reordered).size,23);
  await page.locator('#btnSave').click();
  await page.waitForFunction(async order=>{
   const rig=await window.PaperchalkStudio.readPartRig('char-004','front');
   return JSON.stringify(rig?.layerOrder)===JSON.stringify(order);
  },reordered,{timeout:22000});
  // A refresh must not classify a shuffled 23-source rig as broken and
  // restore the original stock order through ensureHostedParts().
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-004'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===23,
    null,{timeout:50000});
  const after=await page.evaluate(()=>({
   art:window.characterEditor.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId),
   rig:window.PaperchalkPartRigStudio.state.model.layerOrder
  }));
  assert.deepEqual(after.art,reordered,'published import must not reset manually changed Z stack');
  assert.deepEqual(after.rig,reordered,'saved ArtMesh Z stack must equal editor list after reload');
  assert.deepEqual(errors,[]);
  console.log('PASS CHAR004 source Z layer order remains changed after Save, hosted-repair check, reload and rig activation');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

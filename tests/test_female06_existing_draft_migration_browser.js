/* Upgrade a REAL previously saved 17-layer female-six IndexedDB project
 * without discarding any authored paint, bone state or old body layers. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:8134/character-editor/?character=female-06&side=front';
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===18,
   null,{timeout:50000});
  // Recreate the BROWSER STATE the user already had from before this fix.
  const pre=await page.evaluate(async()=>{
   const ed=window.characterEditor,studio=window.PaperchalkStudio;
   const arr=ed.S.layers.front,i=arr.findIndex(p=>p.partId==='pants_overlay');
   if(i<0)throw Error('new shorts unexpectedly not installed');
   arr.splice(i,1);
   const left=arr.find(p=>p.partId==='handwear_l');
   left.opacity=.63; // prove older user-authored paint properties survive
   await ed.save();
   const draft=JSON.parse(JSON.stringify(window.PaperchalkPartRigStudio.state.model));
   delete draft.parts.pants_overlay;
   draft.layerOrder=draft.layerOrder.filter(id=>id!=='pants_overlay');
   delete draft.deletedParts;
   await new Promise((yes,no)=>{
    const open=indexedDB.open('paperchalk-dev-characters-v1',1);
    open.onerror=()=>no(open.error);
    open.onsuccess=()=>{
     const db=open.result,tx=db.transaction('kv','readwrite');
     tx.objectStore('kv').put(draft,'part-rig:female-06:front');
     tx.oncomplete=()=>{db.close();yes()};
     tx.onerror=()=>no(tx.error);
    };
   });
   return {before:arr.filter(p=>p.sourcePart).length,
    armOpacity:left.opacity,parts:Object.keys(draft.parts).length};
  });
  assert.deepEqual(pre,{before:17,armOpacity:.63,parts:17});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===18,
   null,{timeout:50000});
  const after=await page.evaluate(()=>({
   ids:window.characterEditor.S.layers.front.filter(p=>p.sourcePart).map(x=>x.partId),
   opacity:window.characterEditor.S.layers.front.find(x=>x.partId==='handwear_l').opacity,
   bound:window.PaperchalkPartRigStudio.state.model.parts.pants_overlay
     ?._garmentLegs===window.PaperchalkPartRigStudio.state.model.parts.legwear
  }));
  assert.equal(after.ids.length,18);
  assert.equal(after.ids.filter(id=>id==='pants_overlay').length,1);
  assert.equal(after.opacity,.63,'old arm painting settings survive');
  assert.equal(after.bound,true,'pants inherit genuine body leg anchors');
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active,null,{timeout:50000});
  const count=await page.evaluate(()=>window.characterEditor.S.layers.front
   .filter(x=>x.partId==='pants_overlay').length);
  assert.equal(count,1,'repeat reload must not duplicate garment');
  assert.deepEqual(errors,[],'no browser exceptions');
  console.log('PASS female06 17→18 non-destructive migration: preserved authored opacity, original rig, bounded pants and idempotent reload');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

/* Regression: only ONE root per person; removing a genuine PSD layer must
 * survive Undo/Redo, Save, reload and the shared game ArtMesh runtime. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8134/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:870}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'character-editor/?character=char-002&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-002'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===18,
   null,{timeout:45000});

  // Mimic the real cause: old local imported drafts with DIFFERENT IDs
  // but labels that identify the SAME already-published people.
  await page.evaluate(async()=>{
   const db=await new Promise((yes,no)=>{
    const q=indexedDB.open('paperchalk-dev-characters-v1',1);
    q.onsuccess=()=>yes(q.result);q.onerror=()=>no(q.error);
   });
   const legacy=[
    {id:'legacy-female2-a',label:'女二 · 旧拆分',familyId:'legacy-female2-a',
     variantCategory:'default',front:'data:image/png;base64,AA=='},
    {id:'legacy-female2-b',label:'女二号 · 草稿',familyId:'legacy-female2-b',
     variantCategory:'default',front:'data:image/png;base64,AA=='},
    {id:'legacy-malelead-a',label:'男主角 · 旧版',familyId:'legacy-malelead-a',
     variantCategory:'default',front:'data:image/png;base64,AA=='}
   ];
   await new Promise((yes,no)=>{
    const tx=db.transaction('kv','readwrite');
    tx.objectStore('kv').put(legacy,'imported');
    tx.oncomplete=yes;tx.onerror=()=>no(tx.error);
   });db.close();
  });
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-002'&&
   window.PaperchalkPartRigStudio?.state?.active,null,{timeout:45000});
  const personTree=await page.locator('#studio-character-tree .character-family>summary').allTextContents();
  assert.equal(personTree.filter(t=>t==='女二').length,1,
    'three old female-two records must produce exactly one person root');
  assert.equal(personTree.filter(t=>t==='男主角').length,1,
    'old male-lead draft must not become a second person root');
  assert.equal(personTree.filter(t=>/旧拆分|旧版|草稿/.test(t)).length,0,
    'historical local artwork is not a top-level person');

  const before=await page.evaluate(()=>({
   ids:window.characterEditor.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId),
   rig:Object.keys(window.PaperchalkPartRigStudio.state.model.parts)
  }));
  assert.ok(before.ids.includes('mouth'),'authentic CHAR-002 mouth must exist');
  const ix=await page.evaluate(()=>window.characterEditor.S.layers.front.findIndex(p=>p.partId==='mouth'));
  await page.locator('#layers .layer[data-index="'+ix+'"] .layer-delete').click();
  await page.waitForFunction(()=>
   !window.PaperchalkPartRigStudio.state.model.parts.mouth&&
   window.PaperchalkPartRigStudio.state.model.deletedParts?.includes('mouth'));
  assert.equal(await page.evaluate(()=>window.characterEditor.S.layers.front.some(p=>p.partId==='mouth')),false,
   'the source PNG layer must actually disappear');
  await page.locator('#workspace-quick-more > summary').click();
  await page.locator('#easy-undo').click();
  await page.waitForFunction(()=>
   window.characterEditor.S.layers.front.some(p=>p.partId==='mouth')&&
   !!window.PaperchalkPartRigStudio.state.model.parts.mouth);
  await page.locator('#workspace-quick-more > summary').click();
  await page.locator('#easy-redo').click();
  await page.waitForFunction(()=>
   !window.characterEditor.S.layers.front.some(p=>p.partId==='mouth')&&
   !window.PaperchalkPartRigStudio.state.model.parts.mouth);
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const saved=await window.PaperchalkStudio.readPartRig('char-002','front');
   return saved?.deletedParts?.includes('mouth')&&
     !saved.parts?.mouth;
  },null,{timeout:25000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-002'&&
   window.PaperchalkPartRigStudio?.state?.active,null,{timeout:45000});
  const after=await page.evaluate(()=>({
   art:window.characterEditor.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId),
   rig:Object.keys(window.PaperchalkPartRigStudio.state.model.parts),
   deleted:window.PaperchalkPartRigStudio.state.model.deletedParts||[]
  }));
  assert.equal(after.art.includes('mouth'),false,
   'refresh must NOT silently reimport deleted PSD source mesh');
  assert.equal(after.rig.includes('mouth'),false,
   'refresh must NOT resurrect the source bone');
  assert.ok(after.deleted.includes('mouth'));
  assert.equal(after.art.length,before.ids.length-1);
  assert.deepEqual(errors,[],'browser JS exceptions');
  console.log('PASS: unique person roots, true source delete, Undo/Redo, rig persistence, reload');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

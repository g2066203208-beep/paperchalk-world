/* The formerly labelled male-lead "new outfit" is his approved FRONT.
 * It must render as the ONE char-003 actor, without uploading anything.
 * A legacy URL may redirect, but it may not create a duplicate wardrobe.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const BASE='http://127.0.0.1:8134/character-editor/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'?character=char-003&side=front',{waitUntil:'load'});
  try{
   await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-003'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===17,
    null,{timeout:18000});
  }catch(error){
   console.error('MALE-LEAD FRONT DIAGNOSTIC',await page.evaluate(()=>({
    current:window.PaperchalkStudio?.current,
    label:window.PaperchalkStudio?.list?.get('char-003')?.label,
    rig:window.PaperchalkStudio?.list?.get('char-003')?.l2dModule?.front?.rig,
    source:window.characterEditor?.S.layers.front.filter(x=>x.sourcePart).map(x=>x.partId),
    state:window.PaperchalkPartRigStudio?.state?.active,
    status:document.querySelector('#studio-status')?.textContent,
    href:location.href
   })),errors);
   throw error;
  }
  const result=await page.evaluate(()=>{
   const row=window.PaperchalkStudio.list.get('char-003');
   const model=window.PaperchalkPartRigStudio.state.model;
   return {label:row.label,source:row.l2dModule?.front?.rig?.sourceCharacterId,
    rigUrl:row.l2dModule?.front?.rig?.url,
    actual:window.characterEditor.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId),
    parts:Object.keys(model.parts||{}).length,
    identity:model.characterId,
    shoulders:[model.parts.handwear_left.kind,model.parts.handwear_right.kind],
    hair:model.parts.front_hair.kind,
    group:[...document.querySelectorAll('.character-family[data-family="char-003"]')].length,
    fakeOutfit:[...document.querySelectorAll('[data-category="outfit"] button')].some(x=>
     x.dataset.character==='char-003-outfit-02')
   };
  });
  assert.equal(result.label,'男主角');
  assert.equal(result.source,'char-003-outfit-02',
   'retain original 17-artmesh PSD provenance');
  assert.match(result.rigUrl,/char-003-outfit-02\/front\.rig\.json$/);
  assert.equal(result.identity,'char-003','render under canonical male-lead ID');
  assert.equal(result.parts,17);
  assert.deepEqual(result.shoulders,['arm-left','arm-right']);
  assert.equal(result.hair,'hair');
  assert.equal(result.group,1);
  assert.equal(result.fakeOutfit,false,'do not show male lead front as clothes');
  for(const id of ['handwear_left','handwear_right','topwear','face','legwear','footwear'])
   assert.ok(result.actual.includes(id),'missing authentic male-lead ArtMesh '+id);
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>
   Object.keys((await window.PaperchalkStudio.readPartRig('char-003','front'))?.parts||{}).length===17,
   null,{timeout:25000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-003'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===17,
   null,{timeout:45000});
  await page.goto(BASE+'?character=char-003-outfit-02&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-003'&&
   window.PaperchalkPartRigStudio?.state?.active,
   null,{timeout:45000});
  assert.equal(await page.locator('.character-family[data-family="char-003"]').count(),1);
  assert.equal(await page.locator('#studio-character option[value="char-003-outfit-02"]').count(),0);
  assert.deepEqual(errors,[], 'no JS errors during male front and redirected old URL');
  console.log('PASS male-lead canonical FRONT: 17 original source PSD ArtMeshes, no wardrobe duplicate, proper hands, saved rig and legacy URL');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

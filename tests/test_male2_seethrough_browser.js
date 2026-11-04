/* 16 authentic-seethrough slot + import + live ArtMesh + local persistence.
 * Synthetic test images validate the importer without shipping dummy art. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=male2&side=front',
    {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='male2'&&
    window.PaperchalkStudio.list.has('male2'),null,{timeout:35000});
  assert.equal(await page.locator('#studio-character-tree').textContent().then(s=>s.includes('男二')),true);
  const directVisible=await page.locator('.male2-direct-import').isVisible();
  if(!directVisible)console.log('MALE2 TREE DIAGNOSTIC',await page.evaluate(()=>({
   current:window.PaperchalkStudio?.current,
   male:window.PaperchalkStudio?.list?.get('male2'),
   tree:[...document.querySelectorAll('.character-family')].map(el=>({
    open:el.open,active:el.classList.contains('active'),
    name:el.querySelector('summary')?.textContent,
    import:!!el.querySelector('.male2-direct-import')})),
   importCount:document.querySelectorAll('.male2-direct-import').length,
   hidden:document.querySelector('.male2-direct-import')?.hidden,
   bodyPane:document.body.dataset.studioPane,
   computed:document.querySelector('.male2-direct-import')?.getBoundingClientRect().toJSON()
  })));
  assert.equal(directVisible,true);
  const created=await page.evaluate(async()=>{
   const names=['nose','head','back hair','ears','footwear','legwear','neck',
    'topwear','handwear','face','eyewhite','irides','eyelash','eyebrow','mouth','front hair'];
   const extra=['bottomwear','earwear','eyewear','headwear','neckwear','objects','tail','wings'];
   const files=[],enc=new TextEncoder(),ed=window.characterEditor;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
   async function png(name,filled){
    const c=canvas.getContext('2d');c.clearRect(0,0,1024,1024);
    if(filled){
     const index=names.indexOf(name),x=400+(index%4)*10,y=20+index*55;
     c.fillStyle='rgb('+((index*27)%240)+',120,150)';
     c.fillRect(x,y,95,25);
    }
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    files.push({path:name+'.png',data:new Uint8Array(await blob.arrayBuffer())});
   }
   for(const name of names)await png(name,true);
   for(const name of extra)await png(name,false);
   await png('src_img',true);await png('reconstruction',true);
   const zip=ed.zip(files);
   await window.PaperchalkStudio.importComponentArchive(
    new File([zip],'seethrough-synthetic-layers.zip',{type:'application/zip'}));
   return {count:ed.S.layers.front.filter(p=>p.sourcePart).length,
    ids:ed.S.layers.front.filter(p=>p.sourcePart).map(p=>p.partId),
    inputName:zip.size};
  });
  assert.equal(created.count,16,'do not animate 8 zero-alpha placeholder layers');
  assert.ok(created.ids.includes('handwear')&&created.ids.includes('footwear'));
  assert.ok(!created.ids.includes('src_img')&&!created.ids.includes('reconstruction'));
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
    Object.keys(window.PaperchalkPartRigStudio.state.model.parts||{}).length===16,
    null,{timeout:35000});
  const rig=await page.evaluate(()=>{
   const s=window.PaperchalkPartRigStudio.state;
   return {hand:s.model.parts.handwear.kind,parent:s.model.parts.handwear.parentId,
    hair:s.model.parts.front_hair.kind,sole:s.model.parts.footwear.parentId,
    modelId:s.model.characterId,rigParts:Object.keys(s.model.parts).length};
  });
  assert.deepEqual(rig,{
   hand:'arm-combined',parent:'torso',hair:'hair',sole:'ground',modelId:'male2',rigParts:16
  });
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const model=await window.PaperchalkStudio.readPartRig('male2','front');
   return Object.keys(model?.parts||{}).length===16;
  },null,{timeout:30000});
  fs.mkdirSync('artifacts/male2',{recursive:true});
  await page.screenshot({path:'artifacts/male2/new-slot-16-part-rig.png'});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
    window.PaperchalkStudio?.current==='male2'&&
    window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===16,
    null,{timeout:35000});
  // The prebuilt male2_l2d_module.zip should also import without manual
  // extraction, preserving its tuned rig for the same male2 family.
  await page.evaluate(async()=>{
   const ed=window.characterEditor,studio=window.PaperchalkStudio,
    rig=window.PaperchalkPartRigStudio.state.model,enc=new TextEncoder();
   const meta={schema:1,characterId:'male2',canvas:[1024,1024],
    layers:{front:[],back:[]}};
   const inner=[];
   for(const p of ed.S.layers.front.filter(p=>p.sourcePart)){
    const id=p.partId,blob=await new Promise(resolve=>p.canvas.toBlob(resolve,'image/png'));
    const path='front/'+id+'.png';
    inner.push({path,data:new Uint8Array(await blob.arrayBuffer())});
    meta.layers.front.push({id,partId:id,name:p.name,role:'psd-part',file:path,
     x:p.x,y:p.y,visible:true,opacity:1});
   }
   inner.push({path:'layers.json',data:enc.encode(JSON.stringify(meta))});
   const innerZip=ed.zip(inner);
   const outer=ed.zip([
    {path:'male2/front-rig-editable-parts.zip',
     data:new Uint8Array(await innerZip.arrayBuffer())},
    {path:'male2/front.rig.json',data:enc.encode(JSON.stringify(rig))},
    {path:'male2/module.json',data:enc.encode(JSON.stringify({schema:1,id:'male2'}))}
   ]);
   await studio.importComponentArchive(
    new File([outer],'male2_l2d_module.zip',{type:'application/zip'}));
  });
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
   Object.keys(window.PaperchalkPartRigStudio.state.model.parts||{}).length===16);
  assert.deepEqual(errors,[]);
  console.log('PASS male2 raw SeeThrough + installable module ZIP: 16 source parts, original standalone rig, save and reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

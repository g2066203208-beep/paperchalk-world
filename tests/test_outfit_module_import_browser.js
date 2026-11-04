const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=char-003-outfit-02&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='char-003-outfit-02',
   null,{timeout:35000});
  assert.ok(await page.locator('#studio-character-tree').textContent().then(s=>s.includes('新衣服')));
  const partIds=['earwear','headwear','handwear_left','handwear_right','neck','footwear',
   'legwear','back_hair','topwear','eyelash','eyebrow','ears','face','nose','mouth','irides','front_hair'];
  await page.evaluate(async ids=>{
   const core=window.PaperchalkPartRigCore,editor=window.characterEditor,
    studio=window.PaperchalkStudio,enc=new TextEncoder();
   const manifest={schema:1,characterId:'char-003-outfit-02',
    canvas:[1024,1024],layers:{front:[],back:[]}};
   const files=[];
   for(const [idx,id] of ids.entries()){
    const c=document.createElement('canvas');c.width=80;c.height=24;
    const ctx=c.getContext('2d');ctx.fillStyle='rgb(100,150,200)';
    ctx.fillRect(0,0,80,24);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));
    files.push({path:'front/'+id+'.png',data:new Uint8Array(await blob.arrayBuffer())});
    manifest.layers.front.push({id,partId:id,name:id,role:'psd-part',
     x:400,y:10+idx*52,visible:true,opacity:1,file:'front/'+id+'.png'});
   }
   files.push({path:'layers.json',data:enc.encode(JSON.stringify(manifest))});
   const partZip=editor.zip(files),parts=manifest.layers.front.map(p=>({
    partId:p.id,name:p.id,x:p.x,y:p.y,canvas:{width:80,height:24},sourcePart:true
   }));
   const rig=core.project(parts,'char-003-outfit-02','front');
   rig.layerOrder=[...ids];rig.motionQualityProfile='source-psd-v1';
   const whole=editor.zip([
    {path:'char-003-outfit-02/module.json',data:enc.encode(JSON.stringify({schema:1,id:'char-003-outfit-02'}))},
    {path:'char-003-outfit-02/front.rig.json',data:enc.encode(JSON.stringify(rig))},
    {path:'char-003-outfit-02/front-rig-editable-parts.zip',data:new Uint8Array(await partZip.arrayBuffer())}
   ]);
   await studio.importComponentArchive(new File([whole],'char003-outfit.zip',{type:'application/zip'}));
  },partIds);
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
   Object.keys(window.PaperchalkPartRigStudio.state.model.parts||{}).length===17,
   null,{timeout:35000});
  const rigInfo=await page.evaluate(()=>{
   const m=window.PaperchalkPartRigStudio.state.model;
   return {left:m.parts.handwear_left.kind,right:m.parts.handwear_right.kind,
    hair:m.parts.front_hair.kind,identity:m.characterId};
  });
  assert.deepEqual(rigInfo,{left:'arm-left',right:'arm-right',hair:'hair',identity:'char-003-outfit-02'});
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const m=await window.PaperchalkStudio.readPartRig('char-003-outfit-02','front');
   return Object.keys(m?.parts||{}).length===17;
  },null,{timeout:25000});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===17,
   null,{timeout:35000});
  assert.deepEqual(errors,[]);
  console.log('PASS male-lead wardrobe 17 ArtMeshes, split sleeves, generic module import, save/reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

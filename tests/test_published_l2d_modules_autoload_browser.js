const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [id,count,required] of [
   ['male2',16,['handwear','footwear','topwear']],
   ['char-003',17,['handwear_left','handwear_right','topwear','face','legwear']],
   ['female-06-outfit-02',17,['handwear_l','handwear_r','topwear','bottomwear','footwear','front_hair']]
  ]){
   const page=await browser.newPage({viewport:{width:1366,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8134/character-editor/?character='+id+'&side=front',
     {waitUntil:'load'});
   await page.waitForFunction(([id,count])=>
     window.PaperchalkStudio?.current===id&&
     window.PaperchalkPartRigStudio?.state?.active===true&&
     window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===count,
     [id,count],{timeout:50000});
   const result=await page.evaluate(()=>{
    const m=window.PaperchalkPartRigStudio.state.model;
    const parts=window.characterEditor.S.layers.front.filter(p=>p.sourcePart);
    return {id:m.characterId,modelParts:Object.keys(m.parts).length,
     artCount:parts.length,role:parts.map(p=>p.role),
     names:parts.map(p=>p.partId)};
   });
   assert.equal(result.id,id);
   assert.equal(result.modelParts,count);
   assert.equal(result.artCount,count);
   assert.ok(result.role.every(x=>x==='psd-part'));
   for(const part of required)assert.ok(result.names.includes(part),id+' missing '+part);
   assert.deepEqual(errors,[],id+' page error');
   console.log('PASS published '+id+' has '+count+' real PNG ArtMeshes and active rig without any manual upload');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

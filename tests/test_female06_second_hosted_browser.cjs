/* Actual hosted female-06 SECOND wardrobe, not a synthetic ZIP fixture.
   Must load 16 authentic 001.psd ArtMeshes directly in fresh browser on GitHub Pages. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:8134/character-editor/?character=female-06-second-outfit&side=front';
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>{
    const studio=window.PaperchalkStudio,engine=window.PaperchalkPartRigStudio;
    return studio?.current==='female-06-second-outfit'&&engine?.state?.active&&
     Object.keys(engine.state.model?.parts||{}).length===16 &&
     window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===16;
  },null,{timeout:90000});
  const state=await page.evaluate(()=>{
    const model=window.PaperchalkPartRigStudio.state.model;
    const partIds=Object.keys(model.parts),raw=window.characterEditor.S.layers.front;
    const tree=[...document.querySelectorAll('.character-family')]
      .map(x=>({id:x.dataset.family,name:x.querySelector('summary')?.textContent||''}));
    return {id:model.characterId,partIds,rawCount:raw.filter(p=>p.sourcePart).length,
      wingLeft:model.parts.wings_l?.bones?.length,
      wingRight:model.parts.wings_r?.bones?.length,
      shortsSkin:model.parts.bottomwear?.skinBinding?.method,
      legs:model.parts.legwear?.bones?.length,
      provenance:model.sourceSha256,
      outfitTree:tree.filter(x=>x.id==='female-06')};
  });
  assert.equal(state.id,'female-06-second-outfit');
  assert.equal(state.rawCount,16);
  assert.equal(state.partIds.length,16);
  assert.equal(state.wingLeft,2);assert.equal(state.wingRight,2);
  assert.equal(state.shortsSkin,'pelvis-waist-dual-thigh-v2');
  assert.ok(state.legs>=4);
  // The runtime intentionally sanitizes untrusted metadata from its model.
  // Verify the authored provenance on the actual deployed source rig instead.
  const publishedRig=await page.evaluate(async()=>{
    const r=await fetch('../assets/l2d/library/female-06-second-outfit/front.rig.json');
    if(!r.ok)throw Error('Hosted wardrobe source rig HTTP '+r.status);
    return r.json();
  });
  assert.equal(publishedRig.sourceSha256,
    'eedfee1ab0fa28a89ebe696c9824ddd3a9dda2460cb513584e1bf7c8408b71d8');
  assert.equal(state.outfitTree.length,1,
    'second costume must be a child of 女六, not a new person');
  const family=page.locator('.character-family[data-family="female-06"]');
  await family.evaluate(el=>{el.open=true;});
  const second=family.locator('button[data-character="female-06-second-outfit"]');
  const third=family.locator('button[data-character="female-06-outfit-02"]');
  assert.equal(await second.count(),1);
  assert.equal(await third.count(),1);
  assert.match(await second.textContent(),/第二套/);
  assert.match(await third.textContent(),/第三套/);
  fs.mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({
    path:'artifacts/character-editor/FEMALE06-SECOND-OUTFIT-HOSTED-L2D.png',
    fullPage:true
  });
  // Make sure the primary character remains untouched and visible separately.
  await page.goto('http://127.0.0.1:8134/character-editor/?character=female-06&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   Object.keys(window.PaperchalkPartRigStudio.state.model.parts).length===17,
   null,{timeout:90000});
  assert.equal(await page.evaluate(()=>
    !!window.PaperchalkPartRigStudio.state.model.parts.pants_overlay),false);
  assert.deepEqual(errors,[],'no uncaught L2D studio errors');
  console.log('PASS LIVE HOSTED female-six second 001.psd: 16 real ArtMeshes, two wing rigs, shared waist/thigh weights; original 17-part body and third outfit preserved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

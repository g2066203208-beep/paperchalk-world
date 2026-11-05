/* Live Chromium QA: the ORIGINAL female-06 uses new PSD shorts;
 * her replacement clothes retain two independently rooted shoulder sleeves.
 * Build-character-catalog installs source ZIPs before this test runs. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8134/character-editor/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'?character=female-06&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===18,
    null,{timeout:50000});
  const current=await page.evaluate(()=>{
   const m=window.PaperchalkPartRigStudio.state.model;
   const short=window.characterEditor.S.layers.front.find(p=>p.partId==='pants_overlay');
   const core=window.PaperchalkPartRigCore;
   const idle={...m.idleProfile,joints:{hands:1,hips:8,shoulders:6}};
   const leg=m.parts.legwear,pants=m.parts.pants_overlay;
   const torso=m.parts.topwear;
   let waistError=0,hemError=0,torsoSeamError=0,travel=0;
   for(const t of [0,.4,1,2,3.8,6.5,9.4]){
    const pose=core.humanPoseAt(pants,t,idle);
    for(const u of [.16,.5,.84]){
     for(const v of [.03,.16,.33,.56,.74,.92,.98]){
      const rest=core.placedRestPoint(pants,{
       x:pants.x+u*pants.w,y:pants.y+v*pants.h});
      const q=core.warpPoint(pants,u,v,t,null,idle);
      if(v<=.33){
       const hip=core.hipPoint(rest,pose);
       waistError=Math.max(waistError,Math.hypot(q.x-hip.x,q.y-hip.y));
       if(v===.03){
        const belly=core.parentPoint(torso,rest,t,idle);
        torsoSeamError=Math.max(torsoSeamError,Math.hypot(q.x-belly.x,q.y-belly.y));
       }
      }else if(v>=.92){
       const thigh=core.parentPoint(leg,rest,t,idle);
       hemError=Math.max(hemError,Math.hypot(q.x-thigh.x,q.y-thigh.y));
      }
      travel=Math.max(travel,Math.hypot(q.x-rest.x,q.y-rest.y));
     }
    }
   }
   const graph=m.bodyHierarchy?.graph;
   return {partCount:Object.keys(m.parts).length,shortFound:!!short,
    shortImage:short?.canvas.width>0,
    source:m.characterId,sourcePart:pants.skinBinding?.target,
    parent:pants.parentId,skin:pants.skinBinding?.method,
    bound:pants._garmentLegs===leg,
    shoulders:m.bodyHierarchy?.shoulder,
    graphPelvis:graph?.shortsWaist?.parent,
    graphLeft:graph?.shortsLeftHem?.parent,
    graphRight:graph?.shortsRightHem?.parent,
    waistError,hemError,torsoSeamError,travel};
  });
  assert.equal(current.partCount,18);
  assert.equal(current.shortFound,true);
  assert.equal(current.shortImage,true);
  assert.equal(current.sourcePart,'legwear');
  assert.equal(current.bound,true);
  assert.deepEqual(await page.evaluate(()=>window.PaperchalkPartRigStudio.state.model.parts.pants_overlay.placement),
   {scaleX:1.2,scaleY:1,offsetX:-15,offsetY:-17});
  assert.equal(current.parent,'pelvis');
  assert.equal(current.skin,'pelvis-waist-dual-thigh-v2');
  assert.equal(current.graphPelvis,'pelvis');
  assert.equal(current.graphLeft,'leftHip');
  assert.equal(current.graphRight,'rightHip');
  assert.ok(current.waistError<.03,'waist must follow pelvis exactly');
  assert.ok(current.torsoSeamError<.03,'waist and torso hem must share same movement');
  assert.ok(current.hemError<.03,'shorts hems must follow real two-leg IK');
  assert.ok(current.travel>1.0,'must test actual nonzero hip motion');
  fs.mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({
   path:'artifacts/character-editor/FEMALE06-ORIGINAL-WITH-SKINBOUND-SHORTS.png',
   fullPage:true
  });
  await page.goto(BASE+'?character=female-06-outfit-02&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06-outfit-02'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===17,
    null,{timeout:50000});
  const arms=await page.evaluate(()=>{
   const p=window.PaperchalkPartRigStudio.state.model.parts;
   return ['handwear_l','handwear_r'].map(id=>({
    id,kind:p[id]?.kind,parent:p[id]?.parentId,
    root:p[id]?.bones[0]?.head,second:p[id]?.bones[1]?.parent,
    pivot:p[id]?.pivot
   }));
  });
  assert.deepEqual(arms.map(x=>x.kind),['arm-left','arm-right']);
  assert.ok(arms.every(x=>x.parent==='torso'));
  assert.ok(arms.every(x=>x.root?.y<.15&&x.second==='shoulder'));
  // Screenshot both the actual animated ArtMeshes AND the corrected nested
  // character tree, so clothing is not mistaken for a duplicate person.
  const studioTree=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.character-family')];
    return nodes.map(el=>({id:el.dataset.family,name:el.querySelector('summary')?.textContent}));
  });
  const canonical=['protagonist','char-003','char-002','male2','char-004','char-006','female-06'];
  assert.deepEqual(studioTree.filter(n=>canonical.includes(n.id)).map(n=>n.id),canonical);
  assert.equal(studioTree.find(n=>n.id==='char-006')?.name,'女五');
  assert.equal(studioTree.find(n=>n.id==='female-06')?.name,'女六');
  const six=page.locator('.character-family[data-family="female-06"]');
  assert.equal(await six.count(),1);
  await six.evaluate(el=>{el.open=true;el.scrollIntoView({block:'nearest'});});
  assert.equal(await six.locator('[data-category="outfit"] button[data-character="female-06-outfit-02"]').count(),1);
  assert.match(await six.locator('[data-category="outfit"] button[data-character="female-06-outfit-02"]').textContent(),/第三套 · 橙棕外套/);
  await page.screenshot({
   path:'artifacts/character-editor/FEMALE06-NEW-CLOTHES-FIXED-ARMS.png',
   fullPage:true
  });
  assert.deepEqual(errors,[],'browser should have no uncaught errors');
  console.log('PASS FEMALE-06 pelvis-welded shorts waistband '+current.waistError.toFixed(5)+'px; torso seam '+current.torsoSeamError.toFixed(5)+'px; both leg hems '+current.hemError.toFixed(5)+'px; 2 independent sleeves parented');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

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
   const targets=[[450,450],[500,460],[547,450],[450,540],[540,540]];
   let max=0,travel=0;
   for(const t of [0,.4,1,2,3.8,6.5,9.4]){
    for(const [x,y] of targets){
     const q=core.warpPoint(pants,(x-pants.x)/pants.w,(y-pants.y)/pants.h,t,null,idle);
     const rest=core.placedRestPoint(pants,{x,y});
     const r=core.warpPoint(leg,(rest.x-leg.x)/leg.w,(rest.y-leg.y)/leg.h,t,null,idle);
     max=Math.max(max,Math.hypot(q.x-r.x,q.y-r.y));
     travel=Math.max(travel,Math.hypot(q.x-rest.x,q.y-rest.y));
    }
   }
   return {partCount:Object.keys(m.parts).length,shortFound:!!short,
    shortImage:short?.canvas.width>0,
    source:m.characterId,sourcePart:m.parts.pants_overlay.skinBinding?.target,
    bound:m.parts.pants_overlay._garmentLegs===m.parts.legwear,
    shoulders:m.bodyHierarchy?.shoulder,max,travel};
  });
  assert.equal(current.partCount,18);
  assert.equal(current.shortFound,true);
  assert.equal(current.shortImage,true);
  assert.equal(current.sourcePart,'legwear');
  assert.equal(current.bound,true);
  assert.deepEqual(await page.evaluate(()=>window.PaperchalkPartRigStudio.state.model.parts.pants_overlay.placement),
   {scaleX:1.2,scaleY:1,offsetX:-15,offsetY:-17});
  assert.ok(current.max<.03,'pants hem must not pull away from real legs');
  assert.ok(current.travel>1.0,'must test actual nonzero motion');
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
  await page.screenshot({
   path:'artifacts/character-editor/FEMALE06-NEW-CLOTHES-FIXED-ARMS.png',
   fullPage:true
  });
  assert.deepEqual(errors,[],'browser should have no uncaught errors');
  console.log('PASS FEMALE-06 original body + source PSD shorts share dynamic leg IK; max '+current.max.toFixed(5)+' px, moved '+current.travel.toFixed(2)+' px; 2 independent outfit sleeves correctly parented');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

/* Real Chromium: original female-six is UNALTERED, clothing binds by
 * skin weights within THIRD outfit, absolutely no body clipping.
 * Two sleeves are still separately weighted to their shoulders. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8134/character-editor/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE+'?character=female-06&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06'&&
   window.PaperchalkPartRigStudio?.state?.active&&
   window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===17,
   null,{timeout:60000});
  const original=await page.evaluate(()=>{
   const editor=window.characterEditor,rig=window.PaperchalkPartRigStudio.state.model;
   return {parts:Object.keys(rig.parts),sourceParts:editor.S.layers.front
     .filter(p=>p.sourcePart).map(p=>p.partId),hasClip:
     /clipBodyUnderGarment/.test(window.PaperchalkPartRigCore.draw.toString())};
  });
  assert.equal(original.parts.length,17);
  assert.equal(original.sourceParts.length,17);
  assert.ok(!original.parts.includes('pants_overlay'));
  assert.ok(!original.sourceParts.includes('pants_overlay'));
  assert.equal(original.hasClip,false);
  fs.mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({path:'artifacts/character-editor/FEMALE06-ORIGINAL-UNMODIFIED.png',fullPage:true});

  await page.goto(BASE+'?character=female-06-outfit-02&side=front',{waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='female-06-outfit-02'&&
    window.PaperchalkPartRigStudio?.state?.active&&
    window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===17,
    null,{timeout:60000});
  const current=await page.evaluate(()=>{
    const core=window.PaperchalkPartRigCore,m=window.PaperchalkPartRigStudio.state.model;
    const pants=m.parts.bottomwear,legs=m.parts.legwear;
    const idle=structuredClone(m.idleProfile);idle.joints.hips=8;idle.joints.shoulders=6;
    let waistError=0,hemError=0,travel=0;
    for(const t of [0,.4,1,2,3.8,6.5,9.4]){
      const pose=core.humanPoseAt(pants,t,idle);
      for(const u of [.16,.5,.84])for(const v of [.03,.16,.30,.53,.76,.9,.98]){
        const rest=core.placedRestPoint(pants,{x:pants.x+u*pants.w,y:pants.y+v*pants.h});
        const actual=core.warpPoint(pants,u,v,t,null,idle);
        if(v<=.30){const hip=core.hipPoint(rest,pose);
          waistError=Math.max(waistError,Math.hypot(actual.x-hip.x,actual.y-hip.y));}
        if(v>=.9){const low=core.parentPoint(legs,rest,t,idle);
          hemError=Math.max(hemError,Math.hypot(actual.x-low.x,actual.y-low.y));}
        travel=Math.max(travel,Math.hypot(actual.x-rest.x,actual.y-rest.y));
      }
    }
    return {partCount:Object.keys(m.parts).length,
      bottom:pants.skinBinding?.method,source:pants.skinBinding?.target,
      parent:pants.parentId,bound:pants._garmentLegs===legs,
      waistError,hemError,travel,
      sleeves:['handwear_l','handwear_r'].map(id=>({
        parent:m.parts[id]?.parentId,kind:m.parts[id]?.kind,
        root:m.parts[id]?.bones[0]?.head,second:m.parts[id]?.bones[1]?.parent
      }))};
  });
  assert.equal(current.partCount,17);
  assert.equal(current.bottom,'pelvis-waist-dual-thigh-v2');
  assert.equal(current.source,'legwear');
  assert.equal(current.parent,'pelvis');
  assert.equal(current.bound,true);
  assert.ok(current.waistError<.03);
  assert.ok(current.hemError<.03);
  assert.ok(current.travel>1);
  assert.deepEqual(current.sleeves.map(x=>x.kind),['arm-left','arm-right']);
  assert.ok(current.sleeves.every(x=>x.parent==='torso'&&x.root?.y<.15&&x.second==='shoulder'));
  const tree=await page.evaluate(()=>[...document.querySelectorAll('.character-family')]
   .map(el=>({id:el.dataset.family,name:el.querySelector('summary')?.textContent})));
  const canon=['protagonist','char-003','char-002','male2','char-004','char-006','female-06'];
  assert.deepEqual(tree.filter(n=>canon.includes(n.id)).map(n=>n.id),canon);
  assert.equal(tree.find(n=>n.id==='char-006')?.name,'女五');
  assert.equal(tree.find(n=>n.id==='female-06')?.name,'女六');
  const six=page.locator('.character-family[data-family="female-06"]');
  assert.equal(await six.count(),1);
  await six.evaluate(el=>{el.open=true;el.scrollIntoView({block:'nearest'});});
  assert.match(await six.locator('[data-category="outfit"] button[data-character="female-06-outfit-02"]').textContent(),/第三套/);
  await page.screenshot({path:'artifacts/character-editor/FEMALE06-THIRD-COSTUME-WEIGHTED.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS FEMALE06 pristine 17-piece BASE; third costume pants share pelvis/thigh vertex skin; no clipping; full legs visible');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

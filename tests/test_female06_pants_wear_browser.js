/* Female-six standalone THIRD wardrobe is now the ONLY base L2D.
 * Test the actual hosted 17 ArtMesh PNGs and pelvis/thigh skin in Chromium. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:920}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:8134/character-editor/?character=female-06&side=front';
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>{
   const studio=window.PaperchalkStudio,state=window.PaperchalkPartRigStudio?.state;
   return studio?.current==='female-06'&&state?.active&&
    Object.keys(state.model?.parts||{}).length===17&&
    window.characterEditor?.S.layers.front.filter(p=>p.sourcePart).length===17;
  },null,{timeout:90000});
  const result=await page.evaluate(()=>{
   const core=window.PaperchalkPartRigCore,model=window.PaperchalkPartRigStudio.state.model;
   const pants=model.parts.bottomwear,legs=model.parts.legwear;
   const idle=structuredClone(model.idleProfile);idle.joints.hips=8;idle.joints.shoulders=6;
   let waistError=0,hemError=0,travel=0;
   for(const t of [0,.4,1,2,3.8,6.5,9.4]){
    const pose=core.humanPoseAt(pants,t,idle);
    for(const u of [.16,.5,.84])for(const v of [.03,.16,.30,.53,.76,.9,.98]){
     const rest=core.placedRestPoint(pants,{x:pants.x+u*pants.w,y:pants.y+v*pants.h});
     const actual=core.warpPoint(pants,u,v,t,null,idle);
     if(v<=.30){
      const hip=core.hipPoint(rest,pose);
      waistError=Math.max(waistError,Math.hypot(actual.x-hip.x,actual.y-hip.y));
     }
     if(v>=.9){
      const low=core.parentPoint(legs,rest,t,idle);
      hemError=Math.max(hemError,Math.hypot(actual.x-low.x,actual.y-low.y));
     }
     travel=Math.max(travel,Math.hypot(actual.x-rest.x,actual.y-rest.y));
    }
   }
   const group=document.querySelector('.character-family[data-family="female-06"]');
   return {
    count:Object.keys(model.parts).length,
    characterId:model.characterId,
    sourceParts:window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length,
    backgroundOrigin:group?.querySelector('summary')?.textContent,
    oldSecond:document.querySelectorAll('[data-character="female-06-second-outfit"]').length,
    oldThird:document.querySelectorAll('[data-character="female-06-outfit-02"]').length,
    wardrobeSection:group?.querySelectorAll('[data-category="outfit"] button').length||0,
    rawModel:window.PaperchalkStudio.list.get('female-06'),
    waistError,hemError,travel,
    parent:pants.parentId,
    method:pants.skinBinding?.method,
    target:pants.skinBinding?.target,
    reference:pants._garmentLegs===legs,
    noBodyClipping:!/clipBodyUnderGarment/.test(core.draw.toString()),
    sleeves:['handwear_l','handwear_r'].map(id=>({
     parent:model.parts[id]?.parentId,kind:model.parts[id]?.kind,
     first:model.parts[id]?.bones[0]?.head,second:model.parts[id]?.bones[1]?.parent
    }))
   };
  });
  assert.equal(result.characterId,'female-06');
  assert.equal(result.count,17);
  assert.equal(result.sourceParts,17);
  assert.equal(result.backgroundOrigin,'女六');
  assert.equal(result.oldSecond,0);
  assert.equal(result.oldThird,0);
  assert.equal(result.wardrobeSection,0,'third costume is BASE, not a wardrobe');
  assert.equal(result.rawModel?.variantCategory,'default');
  assert.equal(result.parent,'pelvis');
  assert.equal(result.method,'pelvis-waist-dual-thigh-v2');
  assert.equal(result.target,'legwear');
  assert.equal(result.reference,true);
  assert.ok(result.waistError<.03&&result.hemError<.03&&result.travel>1);
  assert.equal(result.noBodyClipping,true);
  assert.deepEqual(result.sleeves.map(x=>x.kind),['arm-left','arm-right']);
  assert.ok(result.sleeves.every(x=>x.parent==='torso'&&x.first?.y<.15&&x.second==='shoulder'));
  fs.mkdirSync('artifacts/character-editor',{recursive:true});
  await page.screenshot({path:'artifacts/character-editor/FEMALE06-ONLY-THIRD-AS-BASE.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS real Chromium: female-six third-orange costume is the sole base, 17 ArtMeshes, waist/pelvis/thigh and sleeves connected, no wardrobe duplicates');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

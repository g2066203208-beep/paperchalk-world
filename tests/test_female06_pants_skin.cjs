/* Female-six body hierarchy: ground -> pelvis -> torso and both hips.
 * The garment root must be pelvis, with lower shorts sides skinned to each leg. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const folder=path.join(__dirname,'../site/assets/l2d/library');
const r=JSON.parse(fs.readFileSync(path.join(folder,'female-06/front.rig.json')));
const outfit=JSON.parse(fs.readFileSync(path.join(folder,'female-06-outfit-02/front.rig.json')));
assert.equal(r.parts.pants_overlay.kind,'pants-bound');
assert.equal(r.parts.pants_overlay.parentId,'pelvis','shorts waistband PRIMARY parent');
assert.equal(r.parts.pants_overlay.skinBinding.method,'pelvis-waist-dual-thigh-v2');
assert.deepEqual(r.parts.pants_overlay.skinBinding.transition,[.42,.84]);
assert.equal(r.parts.pants_overlay.skinBinding.target,'legwear');
assert.deepEqual(r.parts.pants_overlay.placement,{scaleX:1.2,scaleY:1,offsetX:-15,offsetY:-17});
assert.equal(r.parts.pants_overlay.bones.length,0,'no independent animated pants bones');
assert.equal(r.parts.legwear.bones.length,4,'two source knee/ankle chains');
assert.equal(new Set(r.layerOrder).size,r.layerOrder.length);
assert.equal(Object.keys(r.parts).length,18);
const src=Object.values(r.parts).map(p=>({
 partId:p.id,name:p.name,x:p.x,y:p.y,sourcePart:true,
 canvas:{width:p.w,height:p.h}
}));
const model=core.project(src,'female-06','front',r);
const pants=model.parts.pants_overlay,legs=model.parts.legwear,torso=model.parts.topwear;
assert.equal(pants._garmentLegs,legs,'secondary skin target references real body leg object');
const rig=model.bodyHierarchy;
assert.ok(rig,'source body must have actual full-body hierarchy');
assert.equal(rig.graph.pelvis.parent,'ground');
assert.equal(rig.graph.torso.parent,'pelvis');
assert.equal(rig.graph.head.parent,'neck');
assert.equal(rig.graph.leftKnee.parent,'leftHip');
assert.equal(rig.graph.rightKnee.parent,'rightHip');
assert.equal(rig.graph.shortsWaist.parent,'pelvis');
assert.equal(rig.graph.shortsLeftHem.parent,'leftHip');
assert.equal(rig.graph.shortsRightHem.parent,'rightHip');
assert.equal(core.parentRole(pants),'garment');
assert.equal(core.parentRole(legs),'legs');
assert.equal(core.parentRole(torso),'torso');
for(const id of ['wings_l','wings_r']){
 if(!model.parts[id])continue;
 assert.equal(model.parts[id].parentId,'torso',id+' must be parented to upper body');
 assert.equal(core.parentRole(model.parts[id]),'shoulder',id+' should inherit shoulder/chest');
}
// Changing the scale or position of pants cannot ever move the ROOT SKELETON.
const edited=JSON.parse(JSON.stringify(r));
edited.parts.pants_overlay.placement={scaleX:1.45,scaleY:.66,offsetX:150,offsetY:-120};
const editedBody=core.project(src,'female-06','front',edited);
assert.deepEqual(editedBody.bodyHierarchy.pelvis,rig.pelvis,'source-body hip root is independent of shorts');
assert.deepEqual(editedBody.bodyHierarchy.graph.leftHip.rest,rig.graph.leftHip.rest);
assert.deepEqual(editedBody.bodyHierarchy.graph.rightHip.rest,rig.graph.rightHip.rest);
const idle=JSON.parse(JSON.stringify(model.idleProfile));
idle.joints.hips=8;idle.joints.shoulders=8;idle.breath.amount=3;
let traveled=0,maxWaist=0,maxHem=0;
for(let frame=0;frame<42;frame++){
 const phase=frame*.37,pose=core.humanPoseAt(pants,phase,idle);
 for(const u of [.18,.5,.82]){
  for(const v of [.03,.18,.38,.58,.75,.9,.97]){
   const rest=core.placedRestPoint(pants,{x:pants.x+u*pants.w,y:pants.y+v*pants.h});
   const actual=core.warpPoint(pants,u,v,phase,null,idle);
   const expected=core.parentPoint(pants,rest,phase,idle);
   assert.ok(Math.hypot(actual.x-expected.x,actual.y-expected.y)<.001,
    'no second garment oscillator or duplicate hip transform');
   if(v<=.38){
    const hip=core.hipPoint(rest,pose);
    const err=Math.hypot(actual.x-hip.x,actual.y-hip.y);
    maxWaist=Math.max(maxWaist,err);
    assert.ok(err<.001,'shorts waist is EXACT welded pelvis child');
    if(v===.03){
     const belly=core.parentPoint(torso,rest,phase,idle);
     assert.ok(Math.hypot(belly.x-actual.x,belly.y-actual.y)<.001,
      'torso hem and shorts waist MUST inherit identical hip transform');
    }
   }
   if(v>=.9){
    const thigh=core.parentPoint(legs,rest,phase,idle);
    const err=Math.hypot(actual.x-thigh.x,actual.y-thigh.y);
    maxHem=Math.max(maxHem,err);
    assert.ok(err<.001,'lower shorts must inherit true left/right leg IK');
   }
   traveled=Math.max(traveled,Math.hypot(actual.x-rest.x,actual.y-rest.y));
  }
 }
 // Local mesh / cloth bending at the lower torso must vanish at the hip
 // seam; this tests REAL ArtMesh warp, not only parent relationship metadata.
 const lower={x:torso.x+torso.w*.5,y:torso.y+torso.h*.97};
 const lowerWarp=core.warpPoint(torso,.5,.97,phase,null,idle);
 const lowerHip=core.hipPoint(lower,core.humanPoseAt(torso,phase,idle));
 const lowerError=Math.hypot(lowerWarp.x-lowerHip.x,lowerWarp.y-lowerHip.y);
 assert.ok(lowerError<.01,'torso lower edge has detached from root pelvis: '+lowerError);
 for(const c of [rig.left,rig.right]){
  const sole={x:c.ankle.x,y:c.ankle.y};
  const actual=core.parentPoint(legs,sole,phase,idle);
  assert.ok(Math.hypot(actual.x-sole.x,actual.y-sole.y)<.001,'foot must stay planted');
 }
}
assert.ok(traveled>2,'animation must test real nonzero hip motion');
for(const side of ['l','r']){
 const p=outfit.parts['handwear_'+side];
 assert.ok(p.bones.length>=2&&p.parentId==='torso','sleeves inherit shoulders');
}
console.log('PASS female06 true full-body pelvis hierarchy: 882 waistband/hem vertices, 42 frames, root independent of pants scale, original feet planted; max waist '+maxWaist.toFixed(4)+'px hem '+maxHem.toFixed(4)+'px movement '+traveled.toFixed(2)+'px');

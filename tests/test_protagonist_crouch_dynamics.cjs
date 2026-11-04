/* Actual 25-layer crouch source: exact constraints, not a screenshot-only QA.
 * All sampled positions are measured in the 1024x1024 authored PSD stage.
 * Run AFTER scripts/build_character_catalog.py installs archived ZIP modules.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const raw=JSON.parse(fs.readFileSync('site/assets/l2d/library/protagonist-crouch-axe/front.rig.json','utf8'));
const source=Object.values(raw.parts).map(p=>({
 sourcePart:true,partId:p.id,name:p.name,x:p.x,y:p.y,
 canvas:{width:p.w,height:p.h}
}));
assert.equal(raw.characterId,'protagonist-crouch-axe');
assert.equal(source.length,25);
const model=core.project(source,'protagonist-crouch-axe','front',raw);
assert.equal(Object.keys(model.parts).length,25);
assert.equal(model.crouchDynamics.version,1);
assert.ok(core.CROUCH_KEYS.every(id=>model.parts[id]._crouchDynamics===model.crouchDynamics));
const p=model.parts;
const rest=(pt)=>({x:pt[0],y:pt[1]});
const warp=(part,point,t)=>core.warpPoint(part,
 (point.x-part.x)/part.w,(point.y-part.y)/part.h,t,null,model.idleProfile);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const phases=[0,.4,.85,1.25,1.8,2.4,3,4.2,5.6,7];
let maxGripError=0,maxSoleError=0,hemTravel=0,legTravel=0,toeTravel=0,axeTravel=0;
const contact=core.CROUCH_CONTACTS;
for(const t of phases){
 const axe=p.axe;
 for(const [handId,grip] of [
  ['handwear_l',contact.left.grip],['handwear_r',contact.right.grip]]){
  const hand=p[handId];
  // BOTH distinct glove bitmaps must inherit the same whole-shaft
  // transform at the exact pixels touching the grip.
  const A=warp(axe,grip,t),H=warp(hand,grip,t);
  const error=gap(A,H);
  maxGripError=Math.max(maxGripError,error);
  assert.ok(error<.001,handId+' grip detached at phase '+t+': '+error);
  for(const delta of [{x:3,y:-2},{x:-2,y:4}]){
   const nearby={x:grip.x+delta.x,y:grip.y+delta.y};
   const error=gap(warp(axe,nearby,t),warp(hand,nearby,t));
   assert.ok(error<.2,handId+' fingers detach near axe shaft '+t+' '+error);
  }
 }
 // Axe is an unbroken RIGID body: arbitrary distant points retain length.
 const weaponA=rest([90,220]),weaponB=rest([885,603]);
 const distance=gap(warp(axe,weaponA,t),warp(axe,weaponB,t));
 assert.ok(Math.abs(distance-gap(weaponA,weaponB))<.0001,'axe shaft must not bend');
 axeTravel=Math.max(axeTravel,gap(warp(axe,weaponB,t),weaponB));
 const garment=p.topwear;
 const waist={x:garment.x+garment.w*.5,y:garment.y+garment.h*.33};
 const hem={x:garment.x+garment.w*.84,y:garment.y+garment.h*.97};
 assert.ok(gap(warp(garment,waist,t),waist)<.001,'waist seam detached');
 const flutter=gap(warp(garment,hem,t),hem);
 hemTravel=Math.max(hemTravel,flutter);
 assert.ok(flutter<9,'bottom coat too strong / clips through legs');
 for(const id of ['legwear_l','legwear_r']){
  const leg=p[id],ankle={x:leg.x+leg.w*.5,y:leg.y+leg.h*.92};
  assert.ok(gap(warp(leg,ankle,t),ankle)<.001,'ankle drift '+id);
  const knee={x:leg.x+leg.w*.5,y:leg.y+leg.h*.51};
  legTravel=Math.max(legTravel,gap(warp(leg,knee,t),knee));
 }
 for(const id of ['footwear_l','footwear_r']){
  const shoe=p[id];
  for(const uv of [.1,.5,.9]){
   const sole={x:shoe.x+shoe.w*uv,y:shoe.y+shoe.h*.99};
   const error=gap(warp(shoe,sole,t),sole);
   maxSoleError=Math.max(maxSoleError,error);
   assert.ok(error<.001,id+' sole floating '+error+' at phase '+t);
  }
  const collar={x:shoe.x+shoe.w*.5,y:shoe.y+shoe.h*.12};
  assert.ok(gap(warp(shoe,collar,t),collar)<.001,'shoe ankle drifts');
  const toe={x:shoe.x+shoe.w*.55,y:shoe.y+shoe.h*.62};
  toeTravel=Math.max(toeTravel,gap(warp(shoe,toe,t),toe));
 }
}
assert.ok(hemTravel>2,'skirt and coat tails must visibly move');
assert.ok(legTravel>.65,'knees must carry dynamic weight');
assert.ok(toeTravel>.25,'shoe upper leather must show subtle articulation');
assert.ok(axeTravel>2,'axe and BOTH hands need visible but restrained idle motion');
// Absolute rest at phase 0, and a zero-strength pose, preserve source EXACT.
for(const id of core.CROUCH_KEYS){
 const part=p[id],q={x:part.x+part.w*.6,y:part.y+part.h*.7};
 assert.ok(gap(warp(part,q,0),q)<.001,id+' must start on original PNG coordinates');
}
const saved={version:1,cloth:0,axe:0,legs:0,feet:0};
model.crouchDynamics=saved;core.bindCrouchDynamics(model);
for(const id of core.CROUCH_KEYS){
 const part=p[id],q={x:part.x+part.w*.6,y:part.y+part.h*.7};
 assert.ok(gap(warp(part,q,2.4),q)<.001,id+' zero-strength must preserve source');
}
const restored=core.project(source,'protagonist-crouch-axe','front',{
 ...raw,crouchDynamics:{version:1,cloth:1.25,axe:.8,legs:.65,feet:.4}
});
assert.equal(restored.crouchDynamics.cloth,1.25);
assert.equal(restored.crouchDynamics.axe,.8);
assert.equal(restored.crouchDynamics.legs,.65);
assert.equal(restored.crouchDynamics.feet,.4);
const unrelated=core.project(source,'test-actor','front',raw);
assert.ok(!unrelated.crouchDynamics,'other characters must never receive crouch motion');
assert.ok(!unrelated.parts.axe._crouchDynamics);
console.log('PASS CROUCH 25 PSD ArtMeshes: both hands glued to rigid axe (<'+
 maxGripError.toFixed(5)+'px); shoe soles grounded (<'+maxSoleError.toFixed(5)+
 'px); hem '+hemTravel.toFixed(2)+'px; axe '+axeTravel.toFixed(2)+
 'px; knee '+legTravel.toFixed(2)+'px; toe '+toeTravel.toFixed(2)+
 'px; 10 phases / independent UI saved strengths / restored rest pose');

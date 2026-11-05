/* FEMALE-06: source body must remain pristine. Wardrobe trousers ONLY
 * use continuous per-vertex pelvis+left/right-thigh skin weights.
 * There is no body alpha scissor, no overlay injection, no bitmap resize. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const root=path.join(__dirname,'../site/assets/l2d/library');
const read=(name)=>JSON.parse(fs.readFileSync(path.join(root,name,'front.rig.json'),'utf8'));
const base=read('female-06'),third=read('female-06-outfit-02');
assert.equal(base.characterId,'female-06');
assert.equal(Object.keys(base.parts).length,17,'ORIGINAL 17 source ArtMeshes only');
assert.equal(base.parts.pants_overlay,undefined,'never inject shorts into BASE');
assert.equal(base.wearableSource,undefined,'base must have NO previous composite-overlay provenance');
assert.ok(!base.layerOrder.includes('pants_overlay'));
assert.ok(fs.existsSync(path.join(root,'female-06/front.png')));
assert.ok(!fs.existsSync(path.join(root,'female-06/front/pants_overlay.png')));
const pants=third.parts.bottomwear,legs=third.parts.legwear;
assert.ok(pants&&legs,'third costume pants and legs exist');
assert.equal(pants.skinBinding.method,'pelvis-waist-dual-thigh-v2');
assert.equal(pants.skinBinding.target,'legwear');
assert.equal(pants.skinBinding.waistLock,1);
assert.deepEqual(pants.skinBinding.transition,[.35,.80]);
assert.equal(pants.parentId,'pelvis');
assert.equal(pants.bones.length,0,'no independently animated trousers causing a detached waist');
assert.equal(third.weightBindingVersion,'third-outfit-skin-weight-v1');
assert.equal(third.parts.handwear_l.parentId,'torso');
assert.equal(third.parts.handwear_r.parentId,'torso');
const makeSrc=rig=>Object.values(rig.parts).map(p=>({
 partId:p.id,name:p.name,x:p.x,y:p.y,sourcePart:true,
 canvas:{width:p.w,height:p.h}
}));
const baseModel=core.project(makeSrc(base),'female-06','front',base);
assert.equal(Object.keys(baseModel.parts).length,17);
const outfit=core.project(makeSrc(third),'female-06-outfit-02','front',third);
const garment=outfit.parts.bottomwear,body=outfit.parts.legwear;
assert.equal(garment._garmentLegs,body,'pants must inherit actual outfit legs by reference');
assert.equal(core.parentRole(garment),'garment');
assert.equal(core.parentRole(outfit.parts.topwear),'torso');
const idle=JSON.parse(JSON.stringify(outfit.idleProfile));
idle.joints.hips=8;idle.joints.shoulders=8;idle.breath.amount=2;
let travel=0,maxWaistError=0,maxHemError=0;
for(let f=0;f<42;f++){
 const phase=f*.37,pose=core.humanPoseAt(garment,phase,idle);
 assert.ok(pose?.rig?.pelvis,'costume needs physical pelvis hierarchy');
 for(const u of [.15,.35,.5,.65,.85]){
  for(const v of [.02,.16,.30,.43,.57,.69,.87,.96]){
   const basePoint={x:garment.x+garment.w*u,y:garment.y+garment.h*v};
   const rest=core.placedRestPoint(garment,basePoint);
   const actual=core.warpPoint(garment,u,v,phase,null,idle);
   const hip=core.hipPoint(rest,pose);
   const thigh=core.parentPoint(body,rest,phase,idle);
   const weight=Math.max(0,Math.min(1,(v-.35)/(.80-.35)));
   // Cubic smoothstep implements continuous joint weighting.
   const t=weight*weight*(3-2*weight);
   const target={x:hip.x+(thigh.x-hip.x)*t,y:hip.y+(thigh.y-hip.y)*t};
   const error=Math.hypot(actual.x-target.x,actual.y-target.y);
   assert.ok(error<.005,'outfit trousers must share pelvis-to-thigh vertex weights');
   if(v<=.30)maxWaistError=Math.max(maxWaistError,Math.hypot(actual.x-hip.x,actual.y-hip.y));
   if(v>=.87)maxHemError=Math.max(maxHemError,Math.hypot(actual.x-thigh.x,actual.y-thigh.y));
   travel=Math.max(travel,Math.hypot(actual.x-rest.x,actual.y-rest.y));
  }
 }
}
assert.ok(travel>1,'42 animation frames must exercise live body skinning');
assert.ok(maxWaistError<.005&&maxHemError<.005);
const engine=fs.readFileSync(path.join(__dirname,'../site/l2d/part-rig.js'),'utf8');
assert.ok(!engine.includes('clipBodyUnderGarment('),'body pixels may NEVER be clipped');
assert.ok(!engine.includes('garmentTuckGeometry('),'do not distort sprite silhouettes');
console.log('PASS female6 original BASE 17 textures untouched; third wardrobe weighted to shared pelvis/thighs across 1680 animated vertices; no body clipping/painting');

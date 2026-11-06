/* Exact non-destructive per-PartMesh placement and shared garment skinning. */
'use strict';
const assert=require('node:assert/strict');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const art=[{partId:'testfabric',name:'garment',x:100,y:200,
 sourcePart:true,canvas:{width:200,height:100}}];
const original=core.project(art,'test-fitting','front');
const basis=original.parts.testfabric;
const identity=core.placedBounds(basis);
assert.deepEqual(identity,{x:100,y:200,w:200,h:100});
const modified=JSON.parse(JSON.stringify(original));
modified.parts.testfabric.placement={scaleX:1.5,scaleY:.8,offsetX:20,offsetY:-10};
const model=core.project(art,'test-fitting','front',modified),p=model.parts.testfabric;
assert.deepEqual(p.placement,{scaleX:1.5,scaleY:.8,offsetX:20,offsetY:-10});
const bounds=core.placedBounds(p);
for(const [u,v] of [[0,0],[.1,.87],[.5,.5],[1,1]]){
 const original={x:p.x+u*p.w,y:p.y+v*p.h};
 const placed=core.placedRestPoint(p,original);
 const restored=core.unplacedRestPoint(p,placed);
 assert.ok(Math.hypot(original.x-restored.x,original.y-restored.y)<1e-9,
  'bone/paint selection must invert exact authored scale and offset');
}
assert.ok(Math.abs(bounds.x-70)<.00001);
assert.ok(Math.abs(bounds.y-191.6)<.00001);
assert.ok(Math.abs(bounds.w-300)<.00001);
assert.ok(Math.abs(bounds.h-80)<.00001);
for(const [u,v] of [[0,0],[.5,.5],[1,1]]){
 const rest=core.placedRestPoint(p,{x:p.x+u*p.w,y:p.y+v*p.h});
 const screen=core.warpPoint(p,u,v,0,null,null);
 assert.ok(Math.hypot(rest.x-screen.x,rest.y-screen.y)<1e-6,'no-pose exact layout');
}
assert.deepEqual({x:p.x,y:p.y,w:p.w,h:p.h},{x:100,y:200,w:200,h:100},
 'editing may not resample or move original PNG coordinates');
const normalized=core.sanitize({...p,placement:{
 scaleX:50,scaleY:-10,offsetX:9e9,offsetY:-9e9}},basis);
assert.deepEqual(normalized.placement,{scaleX:4,scaleY:.25,offsetX:1024,offsetY:-1024},
 'invalid user adjustments should not break canvases');
console.log('PASS isolated PartMesh scale X/Y + offsets, clamping, immutable pixels and UVs');

const fs=require('node:fs');
const folder='site/assets/l2d/library/female-06/front.rig.json';
if(fs.existsSync(folder)){
 const base=JSON.parse(fs.readFileSync(folder,'utf8'));
 const source=Object.values(base.parts).map(x=>({partId:x.id,name:x.name,
  x:x.x,y:x.y,sourcePart:true,canvas:{width:x.w,height:x.h}}));
 const female=core.project(source,'female-06','front',base);
 const shorts=female.parts.bottomwear,legs=female.parts.legwear;
 assert.ok(shorts&&legs&&shorts._garmentLegs===legs);
 shorts.placement={scaleX:.82,scaleY:1.11,offsetX:9,offsetY:-12};
 const idle=structuredClone(female.idleProfile);
 idle.joints.hips=6;idle.joints.shoulders=5;idle.breath.amount=2;
 for(let frame=0;frame<30;frame++){
  const phase=frame*.35;
  for(const [u,v] of [[.1,.1],[.5,.1],[.85,.45],[.25,.9],[.75,.95]]){
   const at=core.placedRestPoint(shorts,{x:shorts.x+u*shorts.w,y:shorts.y+v*shorts.h});
   const pant=core.warpPoint(shorts,u,v,phase,null,idle);
   const pose=core.humanPoseAt(shorts,phase,idle);
   const body=v<=.35?core.hipPoint(at,pose):
    v>=.80?core.parentPoint(legs,at,phase,idle):
    core.garmentPoint(shorts,at,pose);
   assert.ok(Math.hypot(pant.x-body.x,pant.y-body.y)<.025,
    'shorts top MUST follow pelvis; hem follows legs while resizing');
   assert.equal(shorts.parentId,'pelvis');
  }
 }
 console.log('PASS female-six THIRD OUTFIT garment weight transfer uses pelvis and two original thigh bones across 150 samples');
}

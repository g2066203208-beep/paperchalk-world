/* The base female-six and fitted shorts MUST share the SAME deformation
 * at each point of the upper leg. This test does not use screenshots as
 * false evidence: it checks actual 2D ArtMesh positions over many frames. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../site/l2d/part-rig.js');
const core=globalThis.PaperchalkPartRigCore;
const base=path.join(__dirname,'../site/assets/l2d/library/female-06');
const outfit=path.join(__dirname,'../site/assets/l2d/library/female-06-outfit-02');
const r=JSON.parse(fs.readFileSync(path.join(base,'front.rig.json'),'utf8'));
const o=JSON.parse(fs.readFileSync(path.join(outfit,'front.rig.json'),'utf8'));
assert.equal(r.parts.pants_overlay.kind,'pants-bound');
assert.deepEqual(r.parts.pants_overlay.placement,{scaleX:1.2,scaleY:1,offsetX:-15,offsetY:-17});
assert.equal(r.parts.pants_overlay.parentId,'legwear');
assert.deepEqual(r.parts.pants_overlay.skinBinding.target,'legwear');
assert.equal(r.parts.pants_overlay.bones.length,0,
 'shorts cannot have independent oscillating joints');
assert.equal(r.parts.legwear.bones.length,4,'use real left/right knee/ankle bones');
assert.equal(Object.keys(r.parts).length,18,'add one garment, do not replace original');
assert.equal(new Set(r.layerOrder).size,r.layerOrder.length);
assert.deepEqual(o.parts.handwear_l.kind,'arm-left');
assert.deepEqual(o.parts.handwear_r.kind,'arm-right');
assert.ok(o.parts.handwear_l.pivot.x>.70,'screen-left shoulder attaches at right edge');
assert.ok(o.parts.handwear_r.pivot.x<.30,'screen-right shoulder attaches at left edge');
assert.ok(o.parts.handwear_l.bones[0].head.y<.15);
assert.ok(o.parts.handwear_r.bones[0].head.y<.15);
for(const side of ['l','r'])assert.equal(o.parts['handwear_'+side].bones.length,2);
const src=Object.values(r.parts).map(p=>({
 partId:p.id,name:p.name||p.id,x:p.x,y:p.y,
 sourcePart:true,canvas:{width:p.w,height:p.h}
}));
const model=core.project(src,'female-06','front',r);
const trousers=model.parts.pants_overlay,legs=model.parts.legwear;
assert.equal(trousers._garmentLegs,legs,'garment must reference SAME leg mesh object');
assert.ok(model.bodyHierarchy,'original female6 bare feet are planted ground anchors');
assert.equal(core.parentRole(trousers),'garment');
assert.equal(core.parentRole(legs),'legs');
const idle=JSON.parse(JSON.stringify(model.idleProfile));
idle.joints.hips=8;idle.joints.shoulders=8;idle.breath.amount=2;
const samples=[[445,430],[500,433],[557,430],
 [435,470],[490,485],[552,460],
 [444,535],[498,530],[560,540],[455,566],[540,566]];
let maxError=0,moved=0;
for(let n=0;n<32;n++){
 const phase=n*.41;
 for(const [x,y] of samples){
  const uvP=[(x-trousers.x)/trousers.w,(y-trousers.y)/trousers.h];
  const rest=core.placedRestPoint(trousers,{x,y});
  const uvL=[(rest.x-legs.x)/legs.w,(rest.y-legs.y)/legs.h];
  const p=core.warpPoint(trousers,uvP[0],uvP[1],phase,null,idle);
  const l=core.warpPoint(legs,uvL[0],uvL[1],phase,null,idle);
  const error=Math.hypot(p.x-l.x,p.y-l.y);
  maxError=Math.max(maxError,error);
  assert.ok(error<.025,
   'shorts detached from leg at '+x+','+y+' phase '+phase+': '+error);
  moved=Math.max(moved,Math.hypot(p.x-rest.x,p.y-rest.y));
 }
}
assert.ok(moved>2,'test must exercise actual nonzero hip and leg movement');
console.log('PASS female06: 18 ArtMeshes, fitted shorts follow 2-leg area weights across 32 dynamic phases / 352 sample vertices; max separation '+maxError.toFixed(5)+' px, motion '+moved.toFixed(2)+' px; sleeves rooted at real shoulders');

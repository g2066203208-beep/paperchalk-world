/* Verify the real uploaded CHAR-004 source is a 23-part, parented coat rig.
 * No generated art; two derived panels must remain tied to real wrist meshes.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const library=path.join(base,'site/assets/l2d/library/char-004');
const rig=JSON.parse(fs.readFileSync(path.join(library,'front.rig.json'),'utf8'));
const moduleInfo=JSON.parse(fs.readFileSync(path.join(library,'module.json'),'utf8'));
const coreSrc=fs.readFileSync(path.join(base,'site/l2d/part-rig.js'),'utf8');
const root={};
const core=new Function('window',coreSrc+';return window.PaperchalkPartRigCore;')(root);
assert.equal(rig.characterId,'char-004');
assert.equal(rig.sourcePsdLayerCount,21);
assert.equal(Object.keys(rig.parts).length,23);
assert.equal(moduleInfo.familyId,'char-004');
assert.equal(moduleInfo.label,'女三');
assert.equal(rig.motionQualityProfile,'coat-grip-parented-v1');
assert.equal(Object.keys(moduleInfo.views.front.rig.textures).length,23);
const z=rig.layerOrder;
const before=(a,b)=>assert.ok(z.indexOf(a)<z.indexOf(b),a+' must be BEHIND '+b);
before('topwear','coat_left');
before('topwear','coat_right');
before('coat_left','legwear');
before('coat_right','legwear');
before('topwear','neck');
before('legwear','neck');
before('coat_left','handwear_r');
before('coat_right','handwear_l');
for(const id of ['coat_left','coat_right']){
 const panel=rig.parts[id],link=panel.followGrip;
 assert.equal(panel.parentId,'torso');
 assert.ok(panel.kind.startsWith('coat-panel-'));
 assert.equal(panel.bones.length,2);
 assert.equal(panel.bones[1].parent,panel.bones[0].id);
 assert.ok(rig.parts[link.partId],id+' must link a real arm');
 assert.equal(rig.parts[link.partId].parentId,'torso');
 assert.ok(link.point.x>=0&&link.point.x<=1&&link.point.y>=0&&link.point.y<=1);
}
for(const id of ['handwear_r','handwear_l']){
 const part=rig.parts[id];
 assert.equal(part.bones.length,3);
 assert.deepEqual(part.bones.map(x=>x.id),['shoulder','elbow','wrist']);
 assert.deepEqual(part.bones.map(x=>x.parent),[null,'shoulder','elbow']);
 assert.ok(part.kind.startsWith('arm-coat-'));
}
const pairs=Object.entries(rig.parts).map(([id,p])=>({
 sourcePart:true,partId:id,name:p.name,x:p.x,y:p.y,canvas:{width:p.w,height:p.h}}));
const model=core.project(pairs,'char-004','front',rig);
assert.deepEqual(model.layerOrder,z);
assert.equal(model.animationGraph.root,'root');
assert.ok(model.bodyHierarchy,'feet must root the pelvis/torso/neck hierarchy');
assert.equal(model.parts.coat_left._gripParent,model.parts.handwear_r);
assert.equal(model.parts.coat_right._gripParent,model.parts.handwear_l);
assert.equal(Object.keys(model.parts.coat_left).includes('_gripParent'),false);
const idle=model.idleProfile,periods=[0,1.1,2.2,3.3,4.4,5.5,6.6];
function travel(id,uv){
 const part=model.parts[id];
 const positions=periods.map(t=>core.warpPoint(part,uv.x,uv.y,t,null,idle));
 assert.ok(positions.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)),id+' invalid warp');
 const p=positions[0];
 return Math.max(...positions.map(q=>Math.hypot(q.x-p.x,q.y-p.y)));
}
const leftHand=travel('handwear_r',{x:.86,y:.12});
const rightHand=travel('handwear_l',{x:.44,y:.095});
const leftHem=travel('coat_left',{x:.38,y:.955});
const rightHem=travel('coat_right',{x:.69,y:.97});
const feet=travel('footwear',{x:.5,y:.82});
assert.ok(leftHand>.10&&rightHand>.10,'both wrists must animate');
assert.ok(leftHem>.20&&rightHem>.20,'both coat hems must animate independently');
assert.ok(Math.max(leftHand,rightHand)<25,'do not detach gripping fingers');
assert.ok(Math.max(leftHem,rightHem)<40,'avoid giant rubber coat swings');
assert.ok(feet<.01,'shoe sole may not slide while standing');
console.log('PASS CHAR-004 parented coat, grip and planted feet',{leftHand,rightHand,leftHem,rightHem,feet});

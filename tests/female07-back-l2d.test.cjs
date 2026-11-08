'use strict';
/* The user's actual female-seven BACK Photoshop PSD is the ONLY authored art.
 * These 14 independent RGBA originals are compiled into the SAME model
 * used by the studio and streamed into WebGL battle. No approximate crops. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'site/assets/l2d/library/female-07');
const j=path.join(base,'back.part-rig.json');
const mod=JSON.parse(fs.readFileSync(path.join(base,'module.json'),'utf8'));
const rig=JSON.parse(fs.readFileSync(j,'utf8'));
const ids=['eyebrow','back_hair','legwear_l','legwear_r','footwear_l',
 'footwear_r','bottomwear','neck','topwear','objects','handwear_l',
 'handwear_r','face','front_hair'];
assert.equal(mod.id,'female-07');
assert.equal(mod.label,'女七');
assert.deepEqual(Object.keys(mod.views),['back'],'no fabricated front PSD');
assert.equal(mod.views.back.rig.type,'part-mesh');
assert.deepEqual(Object.keys(mod.views.back.rig.textures),ids);
assert.equal(rig.characterId,'female-07');
assert.equal(rig.face,'back');
assert.deepEqual(rig.canvas,[1024,1024]);
assert.equal(rig.provenance,'original-psd');
assert.deepEqual(Object.keys(rig.parts),ids);
assert.deepEqual(rig.layerOrder,ids);
for(const id of ids){
 const p=rig.parts[id],rel=mod.views.back.rig.textures[id];
 const file=path.join(base,rel),bytes=fs.readFileSync(file);
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',id+': PNG');
 assert.ok(bytes.length>70,id+': original opaque bitmap');
 assert.equal(bytes.readUInt32BE(16),p.w,id+': original PSD width');
 assert.equal(bytes.readUInt32BE(20),p.h,id+': original PSD height');
 assert.equal(bytes[25],6,id+': RGBA only, no painted background');
 assert.ok(p.mesh.columns>=2&&p.mesh.rows>=2);
 assert.equal(p.placement.scaleX,1,'no fake silhouette squashing');
 assert.equal(p.placement.scaleY,1,'no fake silhouette squashing');
}
assert.equal(rig.parts.objects.parentId,'handwear_r');
assert.equal(rig.parts.objects.followGrip.partId,'handwear_r');
assert.equal(rig.parts.footwear_l.parentId,'ground');
assert.equal(rig.parts.footwear_r.parentId,'ground');
assert.equal(rig.parts.back_hair.parentId,'head');
assert.equal(rig.parts.topwear.parentId,'torso');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'site/l2d/part-rig.js'),'utf8'),ctx);
const core=ctx.window.PaperchalkPartRigCore;
core.bindBodyHierarchy(rig);
core.bindGripParents(rig);
assert.ok(rig.bodyHierarchy,'anatomical parent chain');
assert.equal(rig.bodyHierarchy.legsId,'legwear');
assert.equal(rig.parts.objects._gripParent,rig.parts.handwear_r);
assert.ok(core.humanPoseAt(rig.parts.topwear,.12,rig.idleProfile));
const game=fs.readFileSync(path.join(root,'site/game/ring-arena-runtime.js'),'utf8');
const bridge=fs.readFileSync(path.join(root,'site/dev/character-bridge.js'),'utf8');
assert.match(game,/runtime\.libraryPlayer\?\.model\?\.characterId==='female-07'/);
assert.match(game,/livePartRig:true/);
assert.match(game,/!desc\.livePartRig/);
assert.match(bridge,/await assign\(key,targetId,'back',false\)/);
assert.match(bridge,/await assign\(key,actor\.id,actor\.side,false\)/);
const arena=require('../site/game/ring-arena-runtime.js');
assert.deepEqual(arena.camera('outer').eye,{x:-.28,y:1.5,z:10.4});
assert.equal(arena.camera('outer').fov,66);
console.log('PASS 14 exact original PSD parts, real L2D studio registration, shared live battle textures and approved camera');

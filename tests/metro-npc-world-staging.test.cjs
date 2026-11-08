'use strict';
/* Real metro camera + world-ground 2.5D staging checks. This test does NOT
   approve/revive the rejected trio art or create any visual NPC. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const staging=require('../site/game/metro-npc-staging.js');
const arena=require('../site/game/ring-arena-runtime.js');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../site/game/scene-environments.js'),'utf8'),context);
const metro=context.window.PaperWorldEnvironments.get('metro');
const camera=metro.camera;
const make=(slot,height=1.61,approved=false)=>staging.derive({
 id:slot.id,slot,height,art:{crownY:.025,soleY:.982,soleX:.5,widthScale:1,approved},renderReady:approved
});
test('every 2.5D waiting slot has a valid unique floor-world anchor',()=>{
 const slots=staging.CONFIG.slots,ids=new Set();
 for(const [i,slot] of slots.entries()){
  assert.equal(slot.y,0);
  assert.ok(!ids.has(slot.id));ids.add(slot.id);
  const actor=make(slot,[1.54,1.61,1.68][i]);
  assert.equal(actor.ok,true);
  assert.equal(actor.actor.approved,false);
 }
});
test('physical height and distance determine projected head/sole pixels, not CSS size',()=>{
 const a=make(staging.CONFIG.slots[1]);
 const result=staging.screenMetrics(a.actor,{camera,aspect:16/9,project:arena.project});
 assert.equal(result.ok,true);
 assert.equal(result.inHorizontalFov,true);
 assert.ok(result.visibleHeightFraction>.55&&result.visibleHeightFraction<.80,
  'expected human proportions within this real metro lens');
 // The environment intentionally crops the physical floor off screen.
 // Never move feet up in a DOM overlay to pretend they contact that floor.
 assert.equal(result.footCroppedByFixedCamera,true);
 assert.ok(result.screen.footY>1);
 const near={...a.actor,z:a.actor.z+.20},far={...a.actor,z:a.actor.z-.20};
 const mNear=staging.screenMetrics(near,{camera,aspect:16/9,project:arena.project});
 const mFar=staging.screenMetrics(far,{camera,aspect:16/9,project:arena.project});
 assert.ok(mNear.visibleHeightFraction>mFar.visibleHeightFraction);
});
test('camera, actor height, and z-depth produce correct scale for tall and short mob',()=>{
 const slot=staging.CONFIG.slots[0];
 const small=staging.screenMetrics(make(slot,1.54).actor,{camera,project:arena.project});
 const tall=staging.screenMetrics(make(slot,1.68).actor,{camera,project:arena.project});
 assert.ok(tall.visibleHeightFraction>small.visibleHeightFraction);
 assert.ok(tall.screen.crownY<small.screen.crownY);
});
test('rejected art cannot leak into render candidates even with valid world positions',()=>{
 const slot=staging.CONFIG.slots[1],unapproved={
 id:'NPC-G001',slot,height:1.61,
 art:{crownY:.025,soleY:.982,soleX:.5,widthScale:1,approved:false,production:false}
 };
 const invalid=staging.approvedActors({records:[unapproved],camera,project:arena.project});
 assert.deepEqual(invalid,[]);
 const valid=staging.approvedActors({records:[{...unapproved,
  art:{...unapproved.art,approved:true,production:true}}],camera,project:arena.project});
 assert.equal(valid.length,1);
 assert.equal(valid[0].x,slot.x);assert.equal(valid[0].y,0);
});
test('missing alpha bounds and impossible footprints fail safely',()=>{
 assert.equal(staging.derive({id:'x',slot:staging.CONFIG.slots[0],height:1.6}).ok,false);
 assert.equal(staging.validate({x:0,y:0,z:8.39,height:1.6,soleY:.5,crownY:.7,soleX:.5}).ok,false);
 assert.equal(staging.validate({x:6,y:0,z:8.39,height:1.6,soleY:.95,crownY:.04,soleX:.5}).ok,false);
});

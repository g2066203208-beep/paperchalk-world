import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPES,generateRig,validateRig,poseRig,solveTwoBone,rigToJSON,bounds} from '../site/rig.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('each topology has a rooted, ordered parent-child hierarchy',()=>{
 for(const t of TYPES){
  for(let seed=1;seed<=15;seed++){
   const rig=generateRig(t.id,seed,{size:95+seed%6,limbs:90+seed%9});
   const check=validateRig(rig);
   assert.ok(check.bones>=14,t.id+' has meaningful skeletal segments');
   assert.equal(check.roots,1);
   assert.equal(new Set(rig.bones.map(b=>b.id)).size,rig.bones.length);
   const byId=new Map(rig.bones.map(b=>[b.id,b]));
   for(const b of rig.bones){
    if(b.parent){
     assert.ok(byId.has(b.parent));
     assert.ok(b.length>0,t.id+' '+b.id+' has zero length');
     assert.ok(Math.abs(b.length-dist(b,byId.get(b.parent)))<.11);
    }
   }
   const poses=[poseRig(rig,0),poseRig(rig,.21),poseRig(rig,1.39)];
   for(const pose of poses){
    assert.equal(pose.size,rig.bones.length);
    for(const pt of pose.values())assert.ok(Number.isFinite(pt.x)&&Number.isFinite(pt.y));
   }
   assert.ok(Number.isFinite(bounds(rig).maxX));
  }
 }
});
test('identical genome produces exactly identical anatomy, differing seeds vary',()=>{
 const a=generateRig('quadruped',2026,{size:110,limbs:75});
 const b=generateRig('quadruped',2026,{size:110,limbs:75});
 assert.deepEqual(a,b);
 const c=generateRig('quadruped',2027,{size:110,limbs:75});
 assert.notDeepEqual(a.bones,c.bones);
 assert.equal(JSON.parse(rigToJSON(a)).format,'creature-rig-v1');
});
test('analytic two-bone solver preserves lengths and reaches an in-range target',()=>{
 const origin={x:0,y:0};
 for(const target of [{x:10,y:70},{x:-45,y:43},{x:0,y:-60}]){
  for(const bend of [-1,1]){
   const result=solveTwoBone(origin,target,50,45,bend);
   assert.ok(result.reachable);
   assert.ok(Math.abs(dist(origin,result.mid)-50)<1e-6);
   assert.ok(Math.abs(dist(result.mid,result.end)-45)<1e-6);
   assert.ok(dist(result.end,target)<1e-6);
  }
 }
 const far=solveTwoBone(origin,{x:250,y:0},50,45,1);
 assert.equal(far.reachable,false);
 assert.ok(Math.abs(dist(origin,far.mid)-50)<1e-3);
 assert.ok(Math.abs(dist(far.mid,far.end)-45)<1e-3);
});
test('IK effectors respect bone length during walk and dragging',()=>{
 for(const t of TYPES.filter(t=>t.id!=='serpent')){
  const rig=generateRig(t.id,17);
  for(const time of [.0,.25,.49,.87]){
   const pose=poseRig(rig,time);
   for(const chain of rig.chains){
    const a=pose.get(chain.root),b=pose.get(chain.mid),c=pose.get(chain.end);
    assert.ok(Math.abs(dist(a,b)-chain.l1)<.02,t.id+' '+chain.mid);
    assert.ok(Math.abs(dist(b,c)-chain.l2)<.02,t.id+' '+chain.end);
   }
  }
  const chain=rig.chains[0],a=rig.bones.find(b=>b.id===chain.root);
  const pose=poseRig(rig,0,{play:false,drag:{id:chain.end,x:a.x+15,y:a.y+45}});
  assert.ok(Math.abs(dist(pose.get(chain.root),pose.get(chain.mid))-chain.l1)<.02);
  assert.ok(Math.abs(dist(pose.get(chain.mid),pose.get(chain.end))-chain.l2)<.02);
 }
});
test('serpent vertebrae keep all spine links rigid during wave motion',()=>{
 const rig=generateRig('serpent',33);
 for(const t of [.15,.34,.8,1.17]){
  const pose=poseRig(rig,t);
  for(const b of rig.bones.filter(b=>b.id.startsWith('spine-')||b.id==='tail-tip')){
   const d=dist(pose.get(b.id),pose.get(b.parent));
   assert.ok(Math.abs(d-b.length)<.12,b.id+' should not stretch '+d+'/'+b.length);
  }
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const doc=JSON.parse(readFileSync(new URL('../site/design/scene-interaction-contract.v1.json',import.meta.url),'utf8'));
const rect=(r)=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>0&&r[3]>0;
test('scene specification is an explicit design target, not an inaccurate claim about current build',()=>{
 assert.equal(doc.status,'DESIGN_TARGET_NOT_CURRENT_BUILD');
 assert.equal(doc.world.width,1200);assert.equal(doc.world.height,670);
 assert.equal(doc.camera.portrait.panStopsX.length,3);
 assert.equal(doc.camera.safeArea.minTapCssPx,44);
 assert.equal(doc.assetRules.exportScale,2);
});
test('all five scenes have exact coordinates, drawing depth, pivot, asset ID and interaction action',()=>{
 assert.deepEqual(Object.keys(doc.scenes).sort(),['alley','docks','labor','market','office']);
 const names=new Set();
 let count=0;
 for(const [sceneId,scene] of Object.entries(doc.scenes)){
   assert.ok(scene.camera&&scene.ambient);
   for(const obj of scene.objects){
     assert.ok(typeof obj.id==='string'&&typeof obj.label==='string');
     const key=sceneId+'/'+obj.id;assert.ok(!names.has(key),key);names.add(key);
     assert.ok(obj.asset.endsWith('.webp')||obj.asset.endsWith('.json'));
     assert.ok(rect(obj.rect),key);
     const [x,y,w,h]=obj.rect;
     assert.ok(x>=0&&y>=0&&x+w<=doc.world.width&&y+h<=doc.world.height,key+' outside world canvas');
     assert.ok(Number.isInteger(obj.layer)&&obj.layer>=0&&obj.layer<=12,key+' z');
     assert.ok(Array.isArray(obj.pivot)&&obj.pivot.length===2,key+' pivot');
     if(obj.interaction){
       assert.ok(obj.hit&&obj.hit.type==='alpha-polygon',key+' requires hit geometry');
       assert.ok(obj.hit.localPoints.length>=4,key+' polygon');
       assert.ok(obj.hit.localPoints.every(([u,v])=>u>=0&&v>=0&&u<=w&&v<=h),key+' polygon outside asset');
       assert.equal(obj.hit.minTapCssPx,44);
       assert.ok(obj.hit.animationPresets.length>=2,key+' needs animation');
       assert.ok(obj.hit.soundCue);
       assert.ok(obj.hit.firstFeedbackBudgetMs<=16);
     }else assert.equal(obj.hit,null,key+' background cannot capture clicks');
     assert.ok(obj.pivot[0]>=x&&obj.pivot[0]<=x+w&&obj.pivot[1]>=y&&obj.pivot[1]<=y+h,key+' pivot outside visual');
     if(obj.interaction)assert.match(obj.interaction,/^[a-z]+[.-][a-z-]+$/,key+' unknown input naming');
     count++;
   }
 }
 assert.equal(count,55);
 const office=doc.scenes.office.objects;
 assert.ok(office.some(o=>o.id==='door'&&o.interaction==='travel.open-map'));
 assert.ok(office.some(o=>o.id==='telephone'&&o.interaction==='phone.pickup'));
 assert.ok(office.some(o=>o.id==='city_map'&&o.interaction==='map.unfold'));
 assert.ok(office.some(o=>o.id==='kai'&&o.interaction==='dialogue.kai'));
});
test('21 views have positioned rectangles and UI input methods; no permanently offscreen critical element in design',()=>{
 assert.equal(doc.ui.length,21);
 const ids=new Set();
 for(const x of doc.ui){
   assert.ok(!ids.has(x.id),x.id);ids.add(x.id);
   assert.ok(rect(x.rect),x.id);
   const [px,py,w,h]=x.rect;
   assert.ok(px>=0&&py>=0&&px+w<=1200&&py+h<=670,x.id);
   assert.ok(['overlay','anchor','effect'].includes(x.mode),x.id);
   assert.ok(x.detail.length>12,x.id);
 }
 assert.ok(doc.camera.portrait.noSemanticTargetsOffscreen);
 assert.equal(doc.camera.portrait.panStopsX[0],0);
 assert.equal(doc.camera.portrait.panStopsX.at(-1),800);
});
test('24 animation response and timing tokens plus multi-layer rig are specified',()=>{
 assert.equal(Object.keys(doc.animations).length,24);
 for(const [id,t] of Object.entries(doc.animations)){
   const duration=Object.entries(t).filter(([key,value])=>key.endsWith('Ms')&&Number.isFinite(value)).map(([,value])=>value)[0];
   assert.ok(Number.isFinite(duration)&&duration>0,id+' has no numeric timing');
 }
 assert.equal(doc.animations.tapDown.firstFeedbackMs,16);
 assert.equal(doc.animations.dialogueType.charactersPerSecond,34);
 assert.equal(doc.animations.mapUnfold.folds,3);
 assert.equal(doc.rig.layers.length,19);
 assert.ok(doc.rig.states.includes('handOver'));
 assert.ok(doc.rig.states.includes('walk'));
 assert.ok(doc.assetRules.pivotMetadataRequired);
 assert.ok(doc.assetRules.hitPolygonRequired);
});

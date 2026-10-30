import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../site/pixel-lab/'+p,import.meta.url),'utf8');
test('Only native converter and complete-figure training are primary',()=>{
 const index=read('index.html');
 assert.equal((index.match(/class="route"/g)||[]).length,2);
 assert.match(index,/href="\.\/repixelize\.html"/);
 assert.match(index,/href="\.\/fullbody-learning\.html"/);
 assert.match(index,/D「雾樱玻璃」/);
 assert.doesNotMatch(index,/href="\.\/face-parts\.html"/);
 assert.doesNotMatch(index,/href="\.\/fullbody-16\.html"/);
});
test('System02 focuses on actual complete fullbody 384x512 canvases',()=>{
 const page=read('fullbody-learning.html'),legacy=read('learn.html');
 assert.match(page,/384×512/);
 assert.match(page,/id="original"/);
 assert.match(page,/id="model"/);
 assert.match(page,/id="pixelDetail"/);
 assert.ok(page.includes("const BASE='./fullbody-learning/'"));
 assert.ok(page.includes("fetch(BASE+'report.json'"));
 assert.match(legacy,/url=\.\/fullbody-learning\.html/);
 for(const link of ['face-parts.html','face-general.html','motion-prior.html','fullbody-16.html']){
  assert.ok(!page.includes('href="./'+link+'"'),"No face/tiny-sprite/template detours in current training: "+link);
 }
});
test('Current real model evidence admits limitations and counts real identities',()=>{
 const r=JSON.parse(read('fullbody-learning/report.json'));
 assert.equal(r.native_model_grid.join('x'),'384x512');
 assert.equal(r.trained_actual_full_canvas,true);
 assert.equal(r.training_independent_identities,1);
 assert.equal(r.new_distinct_fullbody_characters_generated,0);
 assert.equal(r.novel_fullbody_generator_trained,false);
 assert.equal(r.identity_data_gate_passed,false);
 assert.equal(r.records.length,3);
 assert.deepEqual(r.records.map(x=>x.train),[true,true,false]);
});
test('System01 true palette and grid stays intact',()=>{
 const p=read('repixelize.html');
 assert.match(p,/const W=384,H=512,P=\[\[57,54,87\],\[242,165,194\],\[169,186,233\],\[255,245,230\]\]/);
 assert.match(p,/id="gridToggle" type="checkbox" checked/);
});

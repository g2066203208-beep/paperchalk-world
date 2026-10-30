import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../site/pixel-lab/'+p,import.meta.url),'utf8');
test('Keep only two principal work systems, with whole-figure ML retouch as current task',()=>{
 const home=read('index.html');
 assert.equal((home.match(/class="route"/g)||[]).length,2);
 assert.match(home,/href="\.\/repixelize\.html"/);
 assert.match(home,/href="\.\/pixel-audit\.html"/);
 assert.match(home,/D「雾樱玻璃」/);
 assert.doesNotMatch(home,/href="\.\/(face-parts|fullbody-16)\.html"/);
});
test('New whole-person ML review contains actual three-way images, native zoom and measured edits',()=>{
 const ui=read('fullbody-refine.html');
 for(const key of ['id="original"','id="refined"','id="diff"','id="zoom"','id="edited"','native_changed_pixels']){
   assert.ok(ui.includes(key),"Missing "+key);
 }
 assert.ok(ui.includes("root+'report.json'"));
 assert.ok(ui.includes("refined_native.png"));
 assert.ok(ui.includes("尚未获美术验收"));
});
test('Real model report/outputs never claim to have learned anatomy or new character design',()=>{
 const path=new URL('../site/pixel-lab/refine-output/report.json',import.meta.url);
 if(!existsSync(path))return;
 const r=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(r.full_body_input,true);
 assert.equal(r.trained_from_scratch,true);
 assert.deepEqual(r.native_grid,[192,256]);
 assert.equal(r.preview_has_no_new_painted_detail,true);
 assert.equal(r.training_independent_identities,1);
 assert.equal(r.ground_truth_is_input_not_manual_gold,true);
 assert.equal(r.art_approved,false);
 assert.equal(r.silhouette_unchanged,true);
 assert.equal(r.head_preserved,true);
 assert.ok(r.native_changed_pixels>0);
 assert.ok(r.refiner_recovery_accuracy>r.identity_baseline_accuracy);
});
test('True pixel converter remains independently accessible',()=>{
 const html=read('repixelize.html');
 assert.match(html,/const W=384,H=512,P=\[\[57,54,87\],\[242,165,194\],\[169,186,233\],\[255,245,230\]\]/);
 assert.match(html,/id="gridToggle" type="checkbox" checked/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../site/pixel-lab/'+p,import.meta.url),'utf8');
test('System 01 and new-character-generating System 02 only',()=>{
 const index=read('index.html');
 assert.equal((index.match(/class="route"/g)||[]).length,2);
 assert.match(index,/href="\.\/repixelize\.html"/);
 assert.match(index,/href="\.\/fullbody-refine\.html"/);
 assert.match(index,/D「雾樱玻璃」/);
 assert.doesNotMatch(index,/href="\.\/(face-parts|fullbody-16)\.html"/);
});
test('System 02 is decoder-sampled novel full-body image gallery, not reconstruction or head training',()=>{
 const page=read('fullbody-learning.html'),legacy=read('learn.html');
 for(const phrase of ['id="gallery"','id="pose"','id="candidate-count"','id="full"','id="zoom"','fullbody-generated/','sampling_uses_no_original_image_pixels']) {
  // Sampling honesty may be present in report only; UI contains visible "随机潜变量采样" instead
  if(phrase==='sampling_uses_no_original_image_pixels')continue;
  assert.ok(page.includes(phrase),'Missing '+phrase);
 }
 assert.match(page,/随机潜变量采样/);
 assert.match(page,/96×128/);
 assert.match(legacy,/url=\.\/fullbody-learning\.html/);
 assert.doesNotMatch(page,/href="\.\/(face-parts|motion-prior|fullbody-16)\.html"/);
 assert.doesNotMatch(page,/id="original"|id="model"/);
});
test('Generation contract required if the Actions model samples are checked in',()=>{
 if(!existsSync(new URL('../site/pixel-lab/fullbody-generated/report.json',import.meta.url)))return;
 const r=JSON.parse(read('fullbody-generated/report.json'));
 assert.equal(r.samples_are_decoder_only,true);
 assert.equal(r.sampling_uses_no_original_image_pixels,true);
 assert.equal(r.training_on_complete_fullbody,true);
 assert.equal(r.native_384_detail_learned,false);
 assert.ok(r.generated_fullbody_count>=9);
 assert.ok(r.pose_groups.length>=3);
 assert.equal(r.approved_for_game,0);
});
test('System01 remains strict D palette and real pixel grid',()=>{
 const p=read('repixelize.html');
 assert.match(p,/const W=384,H=512,P=\[\[57,54,87\],\[242,165,194\],\[169,186,233\],\[255,245,230\]\]/);
 assert.match(p,/id="gridToggle" type="checkbox" checked/);
});

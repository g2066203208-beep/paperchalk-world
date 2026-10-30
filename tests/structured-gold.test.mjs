import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../site/pixel-lab/structured-gold/',import.meta.url);
const read=p=>readFileSync(new URL(p,base));
test('structural redraw has real native indexed pixels, editable trace and ten handwritten anatomical labels',()=>{
 const report=JSON.parse(read('gold-report.json').toString('utf8'));
 const ml=JSON.parse(read('parts-ml-report.json').toString('utf8'));
 const trace=JSON.parse(read('trace.json').toString('utf8'));
 assert.equal(report.strokes,77);
 assert.equal(trace.calls.length,77);
 assert.equal(trace.labels.length,10);
 assert.deepEqual(report.native_grid,[192,256]);
 assert.equal(report.original_tiny_pixel_total,1461);
 assert.equal(report.tiny_pixel_total,100);
 assert.ok(report.reduction_vs_original_pct>90);
 assert.equal(report.artist_game_approval,false);
 assert.equal(report.semantic_ground_truth_exists_only_for_this_manual_redraw,true);
 assert.equal(ml.independent_training_identities,1);
 assert.equal(ml.not_general_purpose_semantic_understanding,true);
 assert.ok(ml.synthetic_foreground_accuracy>.57);
 for(const png of ['hostess_gold_native_192x256.png','parts-index.png','parts-model-prediction.png']){
   const bytes=read(png);
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(bytes.readUInt32BE(16),192);
   assert.equal(bytes.readUInt32BE(20),256);
 }
 assert.equal(read('hostess_gold_native_192x256.png')[25],3,'indexed PNG with no blended RGB colors');
});
test('main PixelLab routes to authored and ML labelled fullbody inspection',()=>{
 const home=readFileSync(new URL('../site/pixel-lab/index.html',import.meta.url),'utf8');
 const page=readFileSync(new URL('../site/pixel-lab/structured-redraw.html',import.meta.url),'utf8');
 assert.match(home,/href="\.\/structured-redraw\.html"/);
 for(const x of ['id="before"','id="after"','id="zoom"','id="parts"','id="ml"','parts-model-prediction.png']){
   assert.ok(page.includes(x),x);
 }
 assert.match(page,/未通过游戏美术验收/);
});

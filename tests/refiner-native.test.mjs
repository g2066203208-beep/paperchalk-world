import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../site/pixel-lab/refine-output/',import.meta.url);
const read=p=>readFileSync(new URL(p,base));
const report=JSON.parse(read('report.json').toString('utf8'));
function png(path){
 const b=read(path);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length};
}
test('Model output is genuine indexed native PNG and 2x preview not native detail',()=>{
 const raw=png('source_native.png'),out=png('refined_native.png'),preview=png('refined_preview_384x512.png');
 assert.deepEqual([raw.width,raw.height],[192,256]);
 assert.deepEqual([out.width,out.height],[192,256]);
 assert.deepEqual([preview.width,preview.height],[384,512]);
 assert.notDeepEqual(read('refined_native.png'),read('source_native.png'));
 assert.ok(report.native_changed_pixels>0 && report.native_changed_pixels<150);
 assert.ok(report.source_sha256!==report.output_sha256);
 assert.equal(report.preview_has_no_new_painted_detail,true);
});
test('No false approval and real independent synthetic-noise validation',()=>{
 assert.equal(report.qa_passed,true);
 assert.equal(report.art_approved,false);
 assert.equal(report.trained,true);
 assert.equal(report.training_independent_identities,1);
 assert.equal(report.ground_truth_is_input_not_manual_gold,true);
 assert.equal(report.silhouette_unchanged,true);
 assert.equal(report.head_preserved,true);
 assert.ok(report.refiner_recovery_accuracy>report.identity_baseline_accuracy);
 assert.equal(report.edits.length,report.native_changed_pixels);
});

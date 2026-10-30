import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../site/pixel-lab/',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
test('system02 opens real individual-pixel evidence and acknowledges unknown anatomy',()=>{
 const page=read('pixel-audit.html'),home=read('index.html');
 assert.match(read("structured-redraw.html"),/href="\.\/pixel-audit\.html"/);
 for(const id of ['id="source"','id="output"','id="audit"','id="detail"','id="reason"'])assert.ok(page.includes(id),id);
 for(const field of ['before_role','neighbor_votes','surrounding_support','policy_score','region_hypothesis','semantic_understanding_achieved'])assert.ok(page.includes(field),field);
});
test('every changed 192x256 pixel is explained and QA remains unapproved',()=>{
 const r=JSON.parse(read('semantic-output/report.json'));
 const ledger=JSON.parse(read('semantic-output/edit-reasons.json'));
 assert.equal(r.trained_policy,true);
 assert.equal(r.semantic_understanding_achieved,false);
 assert.equal(r.diffusion_trained,false);
 assert.equal(r.art_approved,false);
 assert.deepEqual(r.native_grid,[192,256]);
 assert.equal(r.total_pixels,49152);
 assert.equal(ledger.accepted.length,r.native_changed_pixels);
 assert.ok(r.clusters_after.small_component_pixels<r.clusters_before.small_component_pixels);
 for(const e of ledger.accepted){
   assert.ok(e.x>=0&&e.x<192&&e.y>=80&&e.y<256);
   assert.ok(e.neighbor_votes>=5&&e.surrounding_support>=12);
   assert.equal(e.actual_object_semantics_known,false);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../site/pixel-lab/'+p,import.meta.url),'utf8');
test('Only two primary systems and D palette are visible',()=>{
 const index=read('index.html');
 assert.equal((index.match(/class="route"/g)||[]).length,2);
 assert.match(index,/href="\.\/repixelize\.html"/);
 assert.match(index,/href="\.\/learn\.html"/);
 assert.match(index,/D「雾樱玻璃」/);
});
test('System 02 contains V3 native details and V2 coarse study, no obsolete training',()=>{
 const p=read('learn.html');
 assert.match(p,/id="v3-native"/);
 assert.match(p,/native-detail-v3\.js/);
 assert.match(p,/id="pixel-v2"/);
 assert.match(p,/diffusion-v2-gallery\.js/);
 assert.ok(p.indexOf('id="v3-native"')<p.indexOf('id="pixel-v2"'),'Full-res art comes first');
 for(const x of ['pixel-lab.js','characters.html','flat4-learning.html','discrete-diffusion.html','style2\/training_report.json'])
   assert.ok(!p.includes(x),'Removed legacy URL still linked: '+x);
});
test('System 01 strict four colors and true pixel grid',()=>{
 const p=read('repixelize.html');
 assert.match(p,/const W=384,H=512,P=\[\[57,54,87\],\[242,165,194\],\[169,186,233\],\[255,245,230\]\]/);
 assert.match(p,/id="gridToggle" type="checkbox" checked/);
});
test('Standing sample is an immutable master, not a trained legacy MLP',()=>{
 const p=read('d-standing.html');
 assert.match(p,/id="gridVisible" checked/);
 assert.match(p,/id="dAvatar" src="\.\/d-standing-v1-384x512\.png"/);
 assert.ok(!p.includes('d-standing-v1-neural-weights.npz'));
});

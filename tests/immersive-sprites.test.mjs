import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('every interactive office object is an independent source sprite',()=>{
 const e=read('site/scenes/explore.js');
 const files=['telephone','map','folder','ledger','deed','newspaper'];
 for(const name of files){
  assert.match(e,new RegExp(name+'\\.svg'));
  assert.match(read('site/assets/props/'+name+'.svg'),/<svg[^>]+viewBox/);
 }
 assert.ok(!e.includes("['inspect','barewall'"));
 assert.ok(!e.includes("['inspect','window'"));
 assert.ok(!e.includes("['inspect','factory'"));
 assert.ok(!e.includes("['inspect','crane'"));
 assert.ok(e.includes("scene-object"));
});
test('landscape layout has a dedicated compact mode, no UI narration / decorative walls',()=>{
 const css=read('site/scenes/scene-focus.css');
 assert.match(css,/orientation:landscape/);
 assert.match(css,/max-height:520px/);
 assert.match(css,/\.explore-head,\.explore-hint,\.explore-status\{display:none/);
 assert.match(css,/\.scene-object img/);
 const doc=read('site/index.html');
 assert.ok(doc.includes('./scenes/scene-focus.css'));
});

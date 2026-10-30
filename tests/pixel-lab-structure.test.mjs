import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../site/pixel-lab/'+p,import.meta.url),'utf8');
test('Pixel Lab home has exactly two systems, with D as the one approved palette',()=>{
 const html=read('index.html');
 assert.equal((html.match(/class="route"/g)||[]).length,2);
 assert.match(html,/href="\.\/repixelize\.html"/);
 assert.match(html,/href="\.\/learn\.html"/);
 assert.match(html,/D「雾樱玻璃」/);
 assert.ok(!html.includes('NEW EXPERIMENT'),'No cluttered promo links');
});
test('converter is D native strict 4-color, and grid defaults ON',()=>{
 const html=read('repixelize.html');
 assert.match(html,/const W=384,H=512,P=\[\[57,54,87\],\[242,165,194\],\[169,186,233\],\[255,245,230\]\]/);
 assert.match(html,/id="gridToggle" type="checkbox" checked/);
 assert.match(html,/id="pixelZoom"/);
 assert.match(html,/d-standing-v1-384x512\.png/);
});
test('D sample has default visible real grid microscope and original export separately',()=>{
 const html=read('d-standing.html');
 const js=read('native-grid.js');
 assert.match(html,/id="gridVisible" checked/);
 assert.match(html,/id="nativeGrid" width="384" height="384"/);
 assert.match(html,/id="dAvatar" src="\.\/d-standing-v1-384x512\.png"/);
 assert.match(html,/mountNativeGrid/);
 assert.match(js,/ctx\.drawImage\(source,originX,originY,n,n,0,0,SIZE,SIZE\)/);
 assert.match(js,/ctx\.stroke\(\)/);
 assert.match(js,/pixelHex/);
});
test('learning system presents model limitations instead of claiming ability to draw full commercial game art',()=>{
 const html=read('learn.html');
 assert.match(html,/研究阶段/);
 assert.match(html,/人物、场景和道具/);
 assert.match(html,/尚不能独立绘制商业成品级/);
 assert.match(html,/href="\.\/characters\.html"/);
 assert.match(html,/class="workspace"/);
});

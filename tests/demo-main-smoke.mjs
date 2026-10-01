import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync('index.html','utf8');
const demo=fs.readFileSync('visual-demo.html','utf8');

assert.equal(index,demo,'root index.html must remain an exact copy of visual-demo.html');
assert.ok(fs.existsSync('legacy-main.html'),'retired legacy main entry must remain archived');
assert.match(index,/Paperchalk 纸艺世界视觉 Demo/);
assert.match(index,/纸艺世界视觉 Demo v12\.32/);
assert.match(index,/import \* as THREE from '\.\/vendor\/three\/three\.module\.js'/);
assert.match(index,/\.\/assets\/player\/protagonist\.webp/);
assert.match(index,/PerspectiveCamera\(36/);
assert.match(index,/let yaw=\.02,pitch=\.18,dist=19\.2/);
assert.match(index,/DPR_CAP=innerWidth<760\?1\.05:1\.22/);
assert.match(index,/Paper003/);
assert.match(index,/受光体积雾/);
assert.match(index,/标准立方体/);
assert.match(index,/动态纸雾/);

console.log('DEMO_MAIN_STATIC_OK');

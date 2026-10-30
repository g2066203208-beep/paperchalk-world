import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const site=new URL('../site/character-lab/',import.meta.url);
test('Deprecated vector atelier is not an active parallel workshop',()=>{
 const html=readFileSync(new URL('index.html',site),'utf8');
 assert.match(html,/角色实验室已归档/);
 assert.match(html,/pixel-lab\/learn\.html/);
 assert.doesNotMatch(html,/CHARACTER\s*\/\s*ATELIER/);
 assert.equal(existsSync(new URL('app.js',site)),false);
 assert.equal(existsSync(new URL('style.css',site)),false);
});

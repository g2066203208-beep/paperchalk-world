import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const loc=new URL('../site/pixel-lab/assets/hostess-20261030-D-192x256.png',import.meta.url);
const b=readFileSync(loc);
const chunks=()=>{let p=8,list=[];while(p<b.length){const len=b.readUInt32BE(p),typ=b.toString('ascii',p+4,p+8);list.push({typ,value:b.subarray(p+8,p+8+len)});p+=12+len;if(typ==='IEND')break;}return list};
test('New fullbody image is real native 192x256 palette PNG, not RGB fake pixels',()=>{
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const list=chunks(),head=list.find(x=>x.typ==='IHDR').value,palette=list.find(x=>x.typ==='PLTE').value;
 assert.equal(head.readUInt32BE(0),192);
 assert.equal(head.readUInt32BE(4),256);
 assert.equal(head[9],3);
 assert.deepEqual(Array.from(palette.subarray(0,15)),[0,0,0,57,54,87,242,165,194,169,186,233,255,245,230]);
 assert.equal(list.find(x=>x.typ==='tRNS')?.value[0],0);
 assert.ok(list.some(x=>x.typ==='IDAT'));
});
test('New character gallery is clickable but does not overwrite previous candidate',()=>{
 const html=readFileSync(new URL('../site/pixel-lab/index.html',import.meta.url),'utf8');
 assert.match(html,/href="\.\/hostess-20261030\.html"/);
 assert.match(html,/href="\.\/hostess-redraw\.html"/);
 const page=readFileSync(new URL('../site/pixel-lab/hostess-20261030.html',import.meta.url),'utf8');
 assert.match(page,/id="figure"/);assert.match(page,/id="zoom"/);assert.match(page,/未经美术验收|未经美术|美术验收尚未通过|未替换游戏正式角色/);
});

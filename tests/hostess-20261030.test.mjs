import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
test('Both source-reference WEBP and native D palette PNG are real checked-in binaries',()=>{
 const ref=readFileSync(new URL('../site/pixel-lab/assets/hostess-20261030-reference-384x512.webp',import.meta.url));
 const png=readFileSync(new URL('../site/pixel-lab/assets/hostess-20261030-D-192x256.png',import.meta.url));
 const sha=x=>createHash('sha256').update(x).digest('hex');
 assert.equal(ref.toString('ascii',0,4),'RIFF');
 assert.equal(ref.toString('ascii',8,12),'WEBP');
 assert.equal(sha(ref),'164e52c2d4e14cbc7c6645580f07d09bd97177aad703d3ed7ca6ba8987698de0');
 assert.equal(sha(png),'cb0cc31f4dd57ba10c6865a68f822a9f9e71fbf80b08765a72156884f44baefb');
 const prov=JSON.parse(readFileSync(new URL('../site/pixel-lab/assets/hostess-20261030-provenance.json',import.meta.url)));
 assert.equal(prov.reference_in_repo,true);
 assert.equal(prov.source_image_in_repo,false);
 assert.equal(prov.art_approved,false);
});
test('New character gallery is clickable but does not overwrite previous candidate',()=>{
 const html=readFileSync(new URL('../site/pixel-lab/index.html',import.meta.url),'utf8');
 assert.match(html,/href="\.\/hostess-20261030\.html"/);
 assert.match(html,/href="\.\/hostess-redraw\.html"/);
 const page=readFileSync(new URL('../site/pixel-lab/hostess-20261030.html',import.meta.url),'utf8');
 assert.match(page,/id="figure"/);assert.match(page,/id="version"/);assert.match(page,/reference-384x512\.webp/);assert.match(page,/id="zoom"/);assert.match(page,/未经美术验收|未经美术|美术验收尚未通过|未替换游戏正式角色/);
});

test('Latest character is NOT approved: review report is version-locked to the PNG source',()=>{
 const r=JSON.parse(readFileSync(new URL('../site/pixel-lab/assets/hostess-20261030-quality.json',import.meta.url),'utf8'));
 const b=readFileSync(new URL('../site/pixel-lab/assets/hostess-20261030-D-192x256.png',import.meta.url));
 assert.equal(r.sha256,createHash('sha256').update(b).digest('hex'));
 assert.deepEqual(r.native_grid,[192,256]);
 assert.equal(r.foreground_pixels,16724);
 assert.equal(r.tiny_4_connected_1_to_3_pixels,1206);
 assert.equal(r.isolated_singletons,617);
 assert.equal(r.perfect_pixel_pass,false);
 assert.equal(r.manual_art_approved,false);
 assert.equal(r.new_character_training_applied,false);
 assert.equal(r.release_gate_passed,false);
 const page=readFileSync(new URL('../site/pixel-lab/hostess-20261030-quality.html',import.meta.url),'utf8');
 assert.match(page,/4连通|四连通/);
 assert.match(page,/id="heat"/);
 assert.match(page,/r\.perfect_pixel_pass/);
 const home=readFileSync(new URL('../site/pixel-lab/index.html',import.meta.url),'utf8');
 assert.match(home,/href="\.\/hostess-20261030-quality\.html"/);
});

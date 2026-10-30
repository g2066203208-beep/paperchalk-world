import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=new URL('../site/pixel-lab/assets/hostess-redraw-v1-192x256.png',import.meta.url);
const png=readFileSync(source);
function chunks(){
 let pos=8,list=[];
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 while(pos<png.length){
  const n=png.readUInt32BE(pos),type=png.toString('ascii',pos+4,pos+8);
  list.push({type,value:png.subarray(pos+8,pos+8+n)});pos+=n+12;
  if(type==='IEND')break;
 }return list;
}
test('new original hostess is stored as 192x256 indexed PNG, never anti-aliased',()=>{
 const cs=chunks(),ih=cs.find(z=>z.type==='IHDR')?.value;
 assert.ok(ih);
 assert.equal(ih.readUInt32BE(0),192);
 assert.equal(ih.readUInt32BE(4),256);
 assert.equal(ih[8],8,'one indexed pixel exactly one palette entry');
 assert.equal(ih[9],3,'indexed PNG must not store fake blended RGB pixels');
 const palette=cs.find(z=>z.type==='PLTE')?.value;
 assert.deepEqual(Array.from(palette),[0,0,0,57,54,87,242,165,194,169,186,233,255,245,230]);
 assert.deepEqual(Array.from(cs.find(z=>z.type==='tRNS')?.value||[]),[0]);
 assert.ok(cs.find(z=>z.type==='IDAT')?.value.length>500);
});
test('new fullbody candidate is visible from PixelLab but old 16 remain unapproved',()=>{
 const home=readFileSync(new URL('../site/pixel-lab/index.html',import.meta.url),'utf8');
 const viewer=readFileSync(new URL('../site/pixel-lab/hostess-redraw.html',import.meta.url),'utf8');
 assert.match(home,/href="\.\/hostess-redraw\.html"/);
 assert.match(viewer,/hostess-redraw-v1-192x256\.png/);
 assert.match(viewer,/尚未通过人工美术验收/);
 assert.match(home,/美术批准0\/16/);
});

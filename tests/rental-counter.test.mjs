import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

test('the real rental counter asset is a four-ink, unfiltered-by-GPT PNG checked into the game',()=>{
 const file=readFileSync('site/game/art/rental-counter-4ink.png');
 assert.ok(file.byteLength>1000&&file.byteLength<12000,'the real compact pixel image ships with the game');
 assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(file.readUInt32BE(16),188);
 assert.equal(file.readUInt32BE(20),334);
 assert.equal(file[24],2,'2-bit indexed palette, one of four RGB inks per source pixel');
 assert.equal(file[25],3,'PNG must use palette-color not RGBA approximation');
 const chunks=[];let offset=8;
 while(offset<file.length){
  const len=file.readUInt32BE(offset),kind=file.toString('ascii',offset+4,offset+8);
  if(offset+len+12>file.length)throw Error('Corrupt PNG chunk '+kind);
  chunks.push({kind,data:file.subarray(offset+8,offset+8+len)});
  offset+=len+12;if(kind==='IEND')break;
 }
 const plte=chunks.find(x=>x.kind==='PLTE');
 assert.ok(plte,'PNG palette required');
 assert.deepEqual([...plte.data],[57,54,87,242,165,194,169,186,233,255,245,230]);
 const compressed=Buffer.concat(chunks.filter(x=>x.kind==='IDAT').map(x=>x.data));
 const scanlines=inflateSync(compressed);
 assert.equal(scanlines.length,334*(1+Math.ceil(188*2/8)));
 const intro=readFileSync('site/game/intro.js','utf8');
 assert.ok(intro.includes('game/art/rental-counter-4ink.png'));
 assert.match(intro,/imageSmoothingEnabled=false/);
 assert.ok(intro.includes('counterScene(ctx,W,H)'));
 assert.match(intro,/APPROACH_SECONDS/,'intro/owner entrance remains playable');
});

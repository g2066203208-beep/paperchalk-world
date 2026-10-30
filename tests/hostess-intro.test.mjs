import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
test('hostess art: lossless indexed PNG in exactly four official colors',()=>{
 const js=readFileSync('site/game/hostess-pixel.js','utf8');
 const match=js.match(/base64,([A-Za-z0-9+/=]+)/);
 assert.ok(match&&match[1].length>4000);
 const png=Buffer.from(match[1],'base64');
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let offset=8;const chunks=[];
 while(offset+12<=png.length){
  const len=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);
  assert.ok(offset+12+len<=png.length,'complete PNG chunk');
  chunks.push({type,data:png.subarray(offset+8,offset+8+len)});
  offset+=12+len;if(type==='IEND')break;
 }
 assert.equal(offset,png.length);
 const h=chunks.find(x=>x.type==='IHDR').data;
 assert.deepEqual([h.readUInt32BE(0),h.readUInt32BE(4),h[8],h[9]],[192,256,8,3]);
 const pal=chunks.find(x=>x.type==='PLTE').data;
 assert.equal(pal.subarray(0,12).toString('hex'),'393657f2a5c2a9bae9fff5e6');
 const data=inflateSync(Buffer.concat(chunks.filter(x=>x.type==='IDAT').map(x=>x.data)));
 let read=0,prev=Buffer.alloc(192),count=[0,0,0,0];
 for(let y=0;y<256;y++){
  const mode=data[read++],row=Buffer.from(data.subarray(read,read+192));read+=192;
  for(let x=0;x<192;x++){
   const a=x?row[x-1]:0,b=prev[x],c=x?prev[x-1]:0;
   if(mode===1)row[x]=(row[x]+a)&255;
   else if(mode===2)row[x]=(row[x]+b)&255;
   else if(mode===3)row[x]=(row[x]+Math.floor((a+b)/2))&255;
   else if(mode===4){
    const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
    row[x]=(row[x]+(da<=db&&da<=dc?a:db<=dc?b:c))&255;
   }else assert.equal(mode,0);
   assert.ok(row[x]<4,'only four palette indexes');
   count[row[x]]++;
  }
  prev=row;
 }
 assert.equal(read,data.length);
 assert.deepEqual(count,[35489,6369,3192,4102]);
});
test('intro implements silhouette, pixel-rigid breathing, dialogue and slower scene change',()=>{
 const code=readFileSync('site/game/intro.js','utf8');
 const menu=readFileSync('site/game/menu.js','utf8');
 assert.match(code,/function buildMask\(/);
 assert.match(code,/out\.data\[p\]=136;out\.data\[p\+1\]=136;out\.data\[p\+2\]=136/);
 assert.match(code,/imageSmoothingEnabled=false/);
 assert.match(code,/SILHOUETTE_END=\.88,REVEAL_END=1\.85/);
 assert.match(code,/function breatheSprite\(/);
 assert.match(code,/phase\*\.95\*weight>\.58\?1:0/);
 assert.match(code,/Math\.floor\(w\*revealFraction\/2\)\*2/);
 assert.match(code,/function onTap\(/);
 assert.match(code,/auto&&wait>=1\.55/);
 assert.match(menu,/switchScene\('intro'\)/);
 assert.match(menu,/CLOSE_TIME=\.56,OPEN_TIME=\.62/);
 assert.match(menu,/intro\.update\(dt\)/);
 assert.match(menu,/intro\.onTap\(p\.x,p\.y,W,H\)/);
});

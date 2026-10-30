import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

test('the desk is its own alpha-transparent, FOUR-INK asset with zero props',()=>{
 const png=readFileSync('site/game/art/counter-clean-4ink.png');
 assert.ok(png.byteLength>=100&&png.byteLength<6000);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const W=png.readUInt32BE(16),H=png.readUInt32BE(20),bpp=png[24],kind=png[25];
 assert.deepEqual([W,H,bpp,kind],[192,84,8,6],'a genuine RGBA sprite not a merged screen');
 let p=8;const data=[];
 while(p+12<=png.length){
  const len=png.readUInt32BE(p),tag=png.toString('ascii',p+4,p+8);
  assert.ok(p+len+12<=png.length);
  if(tag==='IDAT')data.push(png.subarray(p+8,p+8+len));
  p+=len+12;if(tag==='IEND')break;
 }
 const raw=inflateSync(Buffer.concat(data)),stride=W*4;
 assert.equal(raw.length,H*(stride+1));
 let offset=0,prev=new Uint8Array(stride),solid=0,clear=0;
 const palette=new Set(['57,54,87','242,165,194','169,186,233','255,245,230']);
 for(let y=0;y<H;y++){
  const filter=raw[offset++],row=new Uint8Array(stride);
  for(let j=0;j<stride;j++){
   const v=raw[offset++],a=j>=4?row[j-4]:0,b=prev[j],c=j>=4?prev[j-4]:0;
   let predictor=0;
   if(filter===1)predictor=a;
   else if(filter===2)predictor=b;
   else if(filter===3)predictor=Math.floor((a+b)/2);
   else if(filter===4){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);predictor=da<=db&&da<=dc?a:db<=dc?b:c}
   else assert.equal(filter,0);
   row[j]=(v+predictor)&255;
  }
  for(let j=0;j<stride;j+=4){
   const alpha=row[j+3];assert.ok(alpha===0||alpha===255,'no semitransparent anti-alias pixels');
   if(alpha){assert.ok(palette.has([row[j],row[j+1],row[j+2]].join(',')),'exact four official inks');solid++}
   else clear++;
  }
  prev=row;
 }
 assert.ok(solid>8000,'desk exists');
 assert.ok(clear>1800,'desk is a transparent independent sprite, not a whole-screen picture');
});

test('intro composites original independent hostess in front of plain ink, desk in front of her',()=>{
 const intro=readFileSync('site/game/intro.js','utf8');
 assert.ok(intro.includes("import {HOSTESS_PNG,HOSTESS_WIDTH,HOSTESS_HEIGHT}"));
 assert.ok(intro.includes('game/art/counter-clean-4ink.png'));
 assert.ok(intro.includes('game/art/hostess-original-4ink.png'),'hostess must be a standalone image asset');
 const owner=readFileSync('site/game/art/hostess-original-4ink.png');
 const embedded=readFileSync('site/game/hostess-pixel.js','utf8').match(/base64,([A-Za-z0-9+/=]+)/)?.[1];
 assert.ok(embedded,'the original character must be retained');
 assert.ok(owner.equals(Buffer.from(embedded,'base64')),'standalone hostess PNG must be byte-for-byte original');

 assert.doesNotMatch(intro,/rental-counter-4ink\.png|counterScene\(/,'must not draw the old merged full-screen scene');
 assert.match(intro,/ctx\.drawImage\(source,0,0,HOSTESS_WIDTH,HOSTESS_HEIGHT,px,py,sw,sh\);\s*drawCounter\(ctx,W,H\)/,'owner then foreground desk');
 assert.match(intro,/function world\(W,H\)\{R\(0,0,W,H,COL\.ink\)\}/);
 assert.ok(intro.includes('independentLayers'));
 assert.match(intro,/imageSmoothingEnabled=false/,'pixel-perfect nearest neighbor sampling');
});

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
test('owner approaches from distance, breathing vertically, then starts shop rental',()=>{
 const intro=readFileSync('site/game/intro.js','utf8');
 const menu=readFileSync('site/game/menu.js','utf8');
 const lease=readFileSync('site/game/lease.js','utf8');
 const html=readFileSync('site/index.html','utf8');
 assert.match(intro,/APPROACH_SECONDS=2\.8/);
 assert.match(intro,/depth=\.24\+\.76\*p/);
 assert.match(intro,/const breathing=t>=APPROACH_SECONDS\?Math\.round\(2\*Math\.sin/);
 assert.doesNotMatch(intro,/out\.data\[p\]=136|phase\*\.95\*weight|SILHOUETTE_END/);
 assert.match(intro,/function portraitLayers\(/);
 assert.match(intro,/imageSmoothingEnabled=false/);
 assert.ok(intro.includes('老板娘')&&intro.includes('店铺')&&intro.includes('租期'));
 assert.doesNotMatch(intro,/欢迎来到 PAPERWORLD|故事还在慢慢展开/);
 assert.match(intro,/CHAR_PER_SEC=10/);
 assert.match(intro,/function computeExteriorMask\(/);
 assert.match(intro,/function portraitLayers\(/);
 assert.match(intro,/if\(outside\[i\]\)continue/);
 assert.doesNotMatch(intro,/AUTO_PAUSE|autoBtn|next\(true\)|dwell/);
 assert.doesNotMatch(html,/id="pw-dialogue-auto"/);
 assert.match(html,/手动对话 · 点击继续/);
 assert.match(menu,/switchScene\('lease'\)/);
 assert.match(menu,/createLeaseUI\(/);
 assert.match(html,/id="pw-register"/);
 assert.match(html,/id="pw-nickname"/);
 assert.match(html,/id="pw-shopName"/);
 assert.match(lease,/localStorage\.setItem/);
 assert.match(lease,/step=4;render/);
 assert.match(lease,/avatar\(/);
 assert.match(lease,/const rates=/);
});
test('native form has all character and rental fields, and accessible IME controls',()=>{
 const html=readFileSync('site/index.html','utf8');
 for(const name of ['nickname','pronouns','origin','hair','outfit','shopName','business','district','term'])assert.ok(html.includes('name="'+name+'"'));
 for(const id of ['pw-lease','pw-dialogue','pw-receipt','pw-next','pw-prev','pw-form-errors','pw-avatar'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('不需要真实姓名或联系方式'));
 const css=readFileSync('site/game/stage.css','utf8');
 assert.match(css,/perspective:800px/);
 assert.match(css,/touch-action:pan-y/);
 assert.match(css,/--ink:#393657;--pink:#F2A5C2;--blue:#A9BAE9;--paper:#FFF5E6/);
 assert.doesNotMatch(css,/backdrop-filter|filter:blur/);
});

test('masked face retains enclosed deep-purple pupil, not globally alpha-keyed ink',()=>{
 const source=readFileSync('site/game/intro.js','utf8');
 const start=source.indexOf('function computeExteriorMask(data,w,h){');
 const end=source.indexOf('function portraitLayers(image){',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function('INK',source.slice(start,end).replace(/\bexport\s*$/,'')+';return computeExteriorMask')([57,54,87]);
 const w=17,h=17,data=new Uint8ClampedArray(w*h*4);
 const ink=[57,54,87],skin=[255,245,230];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  // cream filled face 4..12, with dark pupil 7..9 / 7..9.
  // one dark pixel contour crack at top must not flood into the pupil.
  const isFace=x>=4&&x<=12&&y>=4&&y<=12;
  const pupil=x>=7&&x<=9&&y>=7&&y<=9;
  const color=isFace&&!pupil?skin:ink;
  const i=(y*w+x)*4;data.set([...color,255],i);
 }
 const ext=fn(data,w,h);
 assert.equal(ext[0],1,'external corner is transparent');
 assert.equal(ext[8*w+8],0,'center of pupil stays opaque');
 assert.equal(ext[6*w+6],0,'skin stays opaque');
 assert.equal(ext[2*w+8],1,'sky outside face is removed');
});

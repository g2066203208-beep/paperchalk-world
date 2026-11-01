import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PALETTES,analyzePixelData,convertToFourColors,originalExample} from '../site/pixel-lab/character-ai/four-colour-core.mjs';
const data=JSON.parse(readFileSync('site/pixel-lab/character-ai/style-study-artists.json','utf8'));
test('original artist reference facts are preserved and do not claim AI rights',()=>{
 const a=data.artists.find(x=>x.artist.id==='tofupxl');
 assert.ok(a);assert.equal(a.artist.country.startsWith('England'),true);
 assert.equal(a.works.find(x=>x.id==='four-colour-portraits').palette_colors_verified,4);
 assert.equal(a.works.find(x=>x.id==='fallen').palette_colors_verified,32);
 assert.match(a.works[0].remote_thumbnail_url,/^https:\/\/pixeljoint\.com\/files\/icons\/full\//);
 assert.match(a.works[0].source_evidence_cn,/4色/);
 assert.equal(a.rights.training_images_approved,0);assert.equal(a.rights.anima_artist_tag,'unverified');
 assert.equal(a.rights.can_auto_download_originals_for_training,false);
 for(const w of a.works){assert.match(w.url,/^https:\/\//);assert.equal(w.training_permission,'not_verified')}
});
test('three project-original palettes have exactly four distinct legal hex colors',()=>{
 for(const p of Object.values(PALETTES)){assert.equal(p.colors.length,4);assert.equal(new Set(p.colors).size,4);for(const c of p.colors)assert.match(c,/^#[0-9a-f]{6}$/i)}
});
test('original independent exercise produces strict on-palette nontransparent pixels',()=>{
 for(const p of Object.values(PALETTES)){const x=originalExample(p.colors),qa=analyzePixelData(x);
  assert.deepEqual(qa.size,[64,96]);assert.equal(qa.semi,0);assert.ok(qa.colors>=3&&qa.colors<=4);assert.equal(qa.colorBudgetPass,true);assert.equal(qa.visualArtApproved,false);
  assert.match(x.provenance,/original-software-exercise/)}
});
test('area sampling results are hard RGB on exactly four options and binary alpha, in every target size',()=>{
 const x=originalExample();
 for(const [w,h] of [[64,96],[96,144],[128,192],[192,256],[256,384]]){
  const out=convertToFourColors({rgba:x.data,width:x.width,height:x.height,outWidth:w,outHeight:h,palette:PALETTES.fogsakura.colors});
  const qa=analyzePixelData(out);assert.equal(qa.colorBudgetPass,true);assert.equal(qa.alphaBinary,true);assert.deepEqual(qa.size,[w,h]);
  const used=qa.colorList.map(x=>x.hex);
  assert.ok(used.every(x=>PALETTES.fogsakura.colors.map(v=>v.toLowerCase()).includes(x)));
  assert.equal(out.data.length,w*h*4);
 }
});
test('transparent and mixed RGBA are handled without off-palette colors',()=>{
 const src=Uint8ClampedArray.from([200,0,0,255,0,255,0,128,0,0,0,0,255,255,255,255]);
 const out=convertToFourColors({rgba:src,width:2,height:2,outWidth:64,outHeight:96});
 const qa=analyzePixelData(out);assert.equal(qa.semi,0);assert.ok(qa.transparent>0);assert.ok(qa.opaque>0);assert.equal(qa.colorBudgetPass,true);
});
test('invalid palettes and source resolutions rejected',()=>{
 const x=originalExample();
 assert.throws(()=>convertToFourColors({rgba:x.data,width:64,height:96,palette:['#111111','#111111','#222222','#333333']}));
 assert.throws(()=>convertToFourColors({rgba:x.data,width:64,height:96,outWidth:85}));
 assert.throws(()=>analyzePixelData({data:new Uint8ClampedArray(4),width:20,height:20}));
});

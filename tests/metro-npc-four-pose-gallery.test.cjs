'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p).toString('utf8'));
const base='site/assets/characters/metro/npc-m003/';
function png(pathname){
 const b=read(pathname);
 assert.ok(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),pathname);
 return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),bitDepth:b[24],colorType:b[25]};
}
test('Metro NPC gallery replaces both old 3-view male and female records with four-pose remakes',()=>{
 const gallery=json('site/data/npc/metro-character-gallery.v1.json');
 assert.deepEqual(gallery.characters.map(x=>x.id),['NPC-M001','NPC-M002','NPC-M003']);
 const first=gallery.characters.slice(0,2);
 assert.ok(first.every(x=>x.approval==='rebuild_required'&&x.image===null));
 for(const name of ['metro-commuter-npc-m001.v1.json','metro-commuter-npc-m002-draft.v1.json'])
  assert.equal(fs.existsSync(path.join(root,'site/data/npc/',name)),false);
 for(const id of ['m001','m002']){
  const info=json('site/data/npc/metro-commuter-npc-'+id+'-four-pose-draft.v2.json');
  assert.equal(info.state,'REDRAW_REQUIRED_FOUR_POSE');
  assert.equal(info.render.ready,false);
  assert.equal(info.production.viewOrder.length,4);
  assert.match(info.production.positivePrompt,/SECOND: exact ninety-degree left side profile standing still/i);
  assert.match(info.production.positivePrompt,/THIRD: exact back view standing still/i);
  assert.match(info.production.positivePrompt,/FOURTH: exact front view/i);
  assert.match(info.production.positivePrompt,/@akipekostyle/);
 }
});
test('approved M003 original and all RGBA poses are real GitHub files, not placeholders',()=>{
 const data=json('site/data/npc/metro-commuter-npc-m003.v2.json');
 assert.equal(data.id,'NPC-M003');
 assert.equal(data.state,'USER_APPROVED_FOUR_POSE_IMAGE');
 const original=read(base+'approved-four-poses.png');
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),data.approvedArt.sha256);
 assert.deepEqual(png(base+'approved-four-poses.png'),{width:1472,height:1024,bitDepth:8,colorType:2});
 const atlas=png(base+'four-pose-atlas-rgba.png');
 assert.deepEqual(atlas,{width:1664,height:1024,bitDepth:8,colorType:6});
 const sprites=['front-standing.png','side-standing.png','back-standing.png','special-front-seated-reading.png'];
 for(const name of sprites)assert.deepEqual(png(base+name),{width:416,height:1024,bitDepth:8,colorType:6});
 assert.equal(data.render.hasRealAlpha,true);
 assert.equal(data.render.ready,false,'art registration is not a claim of live gameplay implementation');
 assert.match(data.production.positivePrompt,/FOURTH: exact front view sitting on an invisible seat/i);
 assert.match(data.production.positivePrompt,/jacket over brown sweater over beige shirt/i);
});

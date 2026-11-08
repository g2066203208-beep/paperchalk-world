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
 assert.match(data.production.positivePrompt,/character sheet, multiple views/i);
 assert.match(data.production.positivePrompt,/FOURTH: EXACT FRONT VIEW, sitting on an invisible seat/i);
 assert.match(data.production.positivePrompt,/The jacket is worn open over the sweater vest in every pose/i);
 assert.match(data.production.negativePrompt,/three-quarter view in first pose, front view in second pose/i);
 assert.equal(data.production.promptTextStatus,'verbatim_text_received_from_user_2026-11-08');
 assert.equal(data.production.imageGenerationMetadataStatus,'unverified_png_info_not_inspected');
 assert.ok(data.production.previousRewrittenPrompt.positivePrompt);
 assert.ok(fs.existsSync(path.join(root,data.production.userProvidedVerbatimPromptPath)));
});

test('next NPC-M001 V3 is a strict four-panel Anima prompt, not approved artwork',()=>{
 const gallery=json('site/data/npc/metro-character-gallery.v1.json');
 const entry=gallery.characters.find(x=>x.id==='NPC-M001');
 assert.equal(entry.record,'metro-commuter-npc-m001-four-pose-draft.v4.json');
 assert.equal(entry.approval,'rebuild_required');
 assert.equal(entry.image,null);
 const info=json('site/data/npc/'+entry.record);
 assert.equal(info.state,'REDRAW_REQUIRED_FOUR_POSE');
 assert.equal(info.production.status,'prompt_v4_personality_proposal_awaiting_user_review_and_anima_image');
 assert.equal(info.production.checkpoint,'Anima Base');
 assert.deepEqual(info.production.viewOrder,[
  'front_static_standing',
  'strict_90deg_side_static_standing_facing_left',
  'back_static_standing',
  'unique_frontal_special_action'
 ]);
 for(const label of ['FIRST: EXACT FRONT VIEW','SECOND: EXACT 90 DEGREE LEFT SIDE PROFILE VIEW','THIRD: EXACT BACK VIEW','FOURTH: EXACT FRONT VIEW']) assert.ok(info.production.positivePrompt.includes(label));
 assert.match(info.production.positivePrompt,/EXACT 90 DEGREE LEFT SIDE PROFILE VIEW/i);
 assert.match(info.production.positivePrompt,/THIRD: EXACT BACK VIEW/i);
 assert.match(info.production.positivePrompt,/FOURTH: EXACT FRONT VIEW/i);
 assert.match(info.production.positivePrompt,/exactly the same young adult man/i);
 assert.match(info.production.positivePrompt,/no chair/i);
 assert.match(info.production.positivePrompt,/white background/i);
 assert.ok(info.production.negativePrompt.length>100);
 assert.equal(info.render.ready,false);
 assert.equal(info.render.approvedSource,null);
 assert.equal(info.render.hasRealAlpha,false);
 for(const p of [
  'docs/NPC-M001_ANIMA_FOUR_POSE_PERSONALITY_V4_20261108.md',
  'docs/NPC_FOUR_POSE_DEVELOPMENT_WHITEPAPER_V1_20261108.md'
 ]) assert.ok(fs.existsSync(path.join(root,p)),p);
});

test('M001 own lived-in fourth pose and personality differ from approved M003',()=>{
 const info=json('site/data/npc/metro-commuter-npc-m001-four-pose-draft.v4.json');
 assert.equal(info.special.direction,'strict_front');
 assert.equal(info.special.status,'character_concept_proposal_not_user_approved');
 assert.match(info.production.positivePrompt,/supports his cheek/);
 assert.match(info.production.positivePrompt,/worn dark-olive fabric lunch bag/);
 assert.match(info.production.positivePrompt,/trying not to fall asleep/);
 assert.doesNotMatch(info.production.positivePrompt,/holding an open newspaper/);
 assert.equal(info.render.ready,false);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const data = read('site/data/npc/civilians/gallery.v1.json');

test('all seven ordinary civilians including SG01 are in one roster; originals are committed',()=>{
  assert.deepEqual(data.characters.map(c=>c.id),['NPC-C001','NPC-C002','NPC-C003','NPC-C004','NPC-M003','NPC-C005','NPC-SG01']);
  assert.equal(new Set(data.characters.map(c=>c.id)).size,7);
  const expected = {
    'NPC-C001': ['a98113e0612058b9d8fccfee28c9f88223be4f8de4c90e8fe938dc0cbb718ba5', 678018],
    'NPC-C002': ['a319c5ebc3e9b236010a1c31b2bccfb1f7e96668eaa3211b3b35bfde17cb2291', 733253],
    'NPC-C003': ['7037e692d122e8022140320a4e5f4e430c134da6aac26f3852d6410a4acfeade', 636544],
    'NPC-C004': ['9ac68f4ca8a642054c0e65e1382eab66ca87d16a12fc83bdcf2876ad3f56453c', 668427],
    'NPC-C005': ['136e12649d8fa8d04e409a28601727c348ac4d2addf7f458bc7bc776d707f533', 585412]
  };
  for(const id of Object.keys(expected)){
    const item=data.characters.find(c=>c.id===id);
    assert.ok(item,id);
    assert.equal(item.source.path,`site/assets/characters/civilians/${id.toLowerCase()}/three-view-original.png`);
    assert.equal(item.source.sha256,expected[id][0]);
    assert.equal(item.source.bytes,expected[id][1]);
    assert.equal(item.source.committedToRepository,true);
    assert.deepEqual(item.source.dimensions,[1024,1024]);
    assert.deepEqual(item.source.actualImageLeftToRight,['side_left','front','back']);
    assert.equal(item.source.mode,'RGB');
    assert.ok(fs.existsSync(path.join(ROOT,item.source.path)),`missing binary: ${item.source.path}`);
    const src = fs.readFileSync(path.join(ROOT,item.source.path));
    assert.equal(crypto.createHash('sha256').update(src).digest('hex'),item.source.sha256);
    assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${src.length}\0`),src])).digest('hex'),item.source.gitBlobSha);
    assert.equal(item.production.registeredForGame,true,'trial art should be linked to the runtime');
    assert.equal(item.production.gameApproved,false);
    assert.equal(item.production.hasRealAlpha,true,'RGB master must produce real RGBA game views');
    for (const state of ['communicate','rest','death'])
      assert.equal(item.states[state].status,'not_drawn');
  }
});

test('approved subway reader M003 remains included as a civilian, without asset duplication',()=>{
  const elder=data.characters.find(c=>c.id==='NPC-M003');
  const original=read('site/data/npc/metro-commuter-npc-m003.v2.json');
  const legacy=read('site/data/npc/metro-character-gallery.v1.json');
  assert.equal(elder.source.path,original.approvedArt.assetPath);
  assert.equal(elder.source.sha256,original.approvedArt.sha256);
  assert.ok(fs.existsSync(path.join(ROOT,elder.source.path)));
  const elderSrc=fs.readFileSync(path.join(ROOT,elder.source.path));
  assert.equal(crypto.createHash('sha256').update(elderSrc).digest('hex'),elder.source.sha256);
  assert.equal(elder.source.committedToRepository,true);
  assert.deepEqual(elder.source.actualImageLeftToRight,['front','side_left','back','seated_reading']);
  assert.equal(elder.states.rest.path,original.render.sprites.special);
  assert.equal(elder.production.hasRealAlpha,true);
  assert.equal(elder.production.artApproved,true);
  assert.equal(elder.production.gameApproved,false);
  assert.equal(elder.production.registeredForGame,true,'previously accepted elder should enter first NPC test');
  assert.ok(legacy.characters.some(c=>c.id==='NPC-M003' && c.approval==='four_pose_reference_approved'));
  for (const f of [original.render.transparentSpriteAtlas,...Object.values(original.render.sprites)]) {
    assert.ok(fs.existsSync(path.join(ROOT,f)),`missing M003 approved asset ${f}`);
  }
});

test('six-front comparison production script references all six actual characters',()=>{
  const p=path.join(ROOT,'scripts/build_civilian_front_comparison.py');
  const txt=fs.readFileSync(p,'utf8');
  for(const id of ['NPC-M003','NPC-C003','NPC-C001','NPC-C004','NPC-C002','NPC-C005'])
    assert.ok(txt.includes(id),id);
  assert.ok(fs.existsSync(path.join(ROOT,'site/assets/characters/civilians/npc-front-comparison-20261108.png')));
  assert.ok(fs.existsSync(path.join(ROOT,'site/assets/characters/civilians/npc-front-comparison-20261108.jpg')));
});


test('SG01 schoolgirl uploaded original is actually present, correctly hashed and not game-registered',()=>{
  const npc=data.characters.find(c=>c.id==='NPC-SG01');
  assert.ok(npc);
  assert.equal(npc.sceneGroup,'heroine_school_trio');
  assert.equal(npc.source.path,'site/assets/characters/civilians/schoolgirls/sg01/three-view-original.png');
  assert.deepEqual(npc.source.actualImageLeftToRight,['side_left','front','back']);
  assert.deepEqual(npc.source.dimensions,[1024,1024]);
  assert.equal(npc.source.mode,'RGB');
  assert.equal(npc.source.committedToRepository,true);
  const p=path.join(ROOT,npc.source.path);
  assert.ok(fs.existsSync(p));
  const bytes=fs.readFileSync(p);
  assert.equal(bytes.length,623012);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'32687ac374ccdb7f3ffb830a9a005a6a70ffa294f6fa570e06776d392d60121a');
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),'4f1443d9d6fcd83829ea77cd837365c01152c1e8');
  assert.equal(npc.production.sourceImageUserAccepted,true);
  assert.equal(npc.production.gameApproved,false);
  assert.equal(npc.production.hasRealAlpha,true);
  assert.equal(npc.production.registeredForGame,true);
  assert.deepEqual(data.schoolTrio.roster,['NPC-SG01','NPC-SG02','NPC-SG03']);
  assert.equal(data.schoolTrio.planned.find(x=>x.id==='NPC-SG02').status,'user_visually_accepted_candidate_source_not_committed');
});

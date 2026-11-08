'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const json = p => JSON.parse(fs.readFileSync(path.join(ROOT, p),'utf8'));
const data = json('site/data/npc/civilians/gallery.v1.json');

test('civilian gallery includes all three new commuters and the existing approved elderly M003', () => {
  assert.deepEqual(data.characters.map(c=>c.id), ['NPC-C001','NPC-C002','NPC-C003','NPC-M003']);
  assert.equal(new Set(data.characters.map(c=>c.id)).size,4);
  const pending = data.characters.filter(c=>/^NPC-C\d{3}$/.test(c.id));
  assert.equal(pending.length,3);
  for(const item of pending){
    assert.equal(item.source.committedToRepository,false);
    assert.equal(item.production.registeredForGame,false);
    assert.equal(item.production.gameApproved,false);
    assert.equal(item.production.hasRealAlpha,false);
    assert.deepEqual(item.source.actualImageLeftToRight,['side_left','front','back']);
    assert.deepEqual(item.source.dimensions,[1024,1024]);
    assert.equal(item.source.mode,'RGB');
    assert.match(item.source.sha256,/^[a-f0-9]{64}$/);
    for (const state of ['communicate','rest','death'])
      assert.equal(item.states[state].status,'not_drawn');
  }
});

test('elderly M003 is a civilian; cross-linked, not reissued or duplicated',()=>{
  const elderly = data.characters.find(c=>c.id==='NPC-M003');
  const canonicalPath = 'site/data/npc/metro-commuter-npc-m003.v2.json';
  const original = json(canonicalPath);
  const historical = json('site/data/npc/metro-character-gallery.v1.json');
  assert.equal(elderly.canonicalRecord,canonicalPath);
  assert.equal(elderly.source.path,original.approvedArt.assetPath);
  assert.equal(elderly.source.sha256,original.approvedArt.sha256);
  assert.equal(elderly.source.committedToRepository,true);
  assert.deepEqual(elderly.source.actualImageLeftToRight,['front','side_left','back','seated_reading']);
  assert.equal(elderly.production.hasRealAlpha,true);
  assert.equal(elderly.production.artApproved,true);
  assert.equal(elderly.production.gameApproved,false);
  assert.equal(elderly.production.registeredForGame,false);
  assert.equal(elderly.states.rest.path,original.render.sprites.special);
  assert.ok(historical.characters.some(c=>c.id==='NPC-M003' && c.approval==='four_pose_reference_approved'));
  assert.equal(elderly.production.sprites.front,original.render.sprites.front);
  assert.equal(elderly.production.sprites.back,original.render.sprites.back);
});

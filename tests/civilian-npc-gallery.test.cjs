'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/npc/civilians/gallery.v1.json'),'utf8'));

test('civilian gallery is separate from metro-npc M and story CHAR identities', () => {
  assert.deepEqual(data.characters.map(c=>c.id), ['NPC-C001','NPC-C002','NPC-C003']);
  const unique = new Set(data.characters.map(c => c.id));
  assert.equal(unique.size, data.characters.length);
  for (const item of data.characters) {
    assert.match(item.id,/^NPC-C\d{3}$/);
    assert.equal(item.production.registeredForGame,false);
    assert.equal(item.production.gameApproved,false);
    assert.equal(item.production.hasRealAlpha,false);
    assert.equal(item.production.heightMeters,null);
    assert.deepEqual(item.source.actualImageLeftToRight,['side_left','front','back']);
    assert.deepEqual(item.source.dimensions,[1024,1024]);
    assert.equal(item.source.mode,'RGB');
    assert.match(item.source.sha256,/^[a-f0-9]{64}$/);
    assert.equal(item.states.communicate.status,'not_drawn');
    assert.equal(item.states.rest.status,'not_drawn');
    assert.equal(item.states.death.status,'not_drawn');
    const png = path.join(ROOT,item.source.path);
    if(item.source.committedToRepository){
      assert.ok(fs.existsSync(png),item.id+' claims a GitHub PNG that does not exist');
    }
  }
});

test('approved elderly metro NPC-M003 remains separate from civilians and untouched',()=>{
  const gallery = JSON.parse(fs.readFileSync(path.join(ROOT,'site/data/npc/metro-character-gallery.v1.json'),'utf8'));
  assert.ok(gallery.characters.some(c=>c.id==='NPC-M003' && c.approval==='four_pose_reference_approved'));
  assert.ok(!data.characters.some(c=>c.id==='NPC-M003'));
});

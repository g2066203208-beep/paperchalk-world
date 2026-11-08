'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

// This test intentionally retains the historical filename: existing CI jobs
// already execute it. User revoked BOTH visual references for production.
test('rejected NPC-G001 1024 sources remain intact in historical archive, not game assets',()=>{
 for(const name of ['joy','surprise']){
  const active=path.join(root,'site/assets/characters/npc-g001',name+'-1024.png');
  const archived=path.join(root,'docs/rejected-art/npc-g001',name+'-1024.png');
  assert.equal(fs.existsSync(active),false,name+' must not be shipped as approved NPC artwork');
  assert.ok(fs.existsSync(archived),name+' historical image must be preserved');
  const b=fs.readFileSync(archived);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','archive must remain PNG');
  assert.equal(b.readUInt32BE(16),1024,'historical width must not change');
  assert.equal(b.readUInt32BE(20),1024,'historical height must not change');
  assert.equal(b.readUInt8(25),6,'historical RGBA alpha retained');
 }
});

test('no rejected NPC-G001 art is loaded into metro with screen CSS overlays',()=>{
 const js=read('site/game/metro-cabin.js'),css=read('site/game/metro-cabin.css');
 const html=read('site/index.html');
 const life=read('site/game/npc-life-sim.js');
 for(const term of ['joy-1024.png','surprise-1024.png','npc-g001-emotions-','loadDefaultNpcArt','openNpcComparison']){
  assert.ok(!js.includes(term),'metro-cabin cannot load rejected art or activate deprecated QA: '+term);
 }
 assert.ok(!css.includes('.pw-npc-qa-stage img'),'percentage-based pasted NPC overlay must be gone');
 assert.ok(!html.includes('npc-g001-hd-1024-20261108'),'stale page version must be invalidated');
 assert.ok(life.includes("artStatus:'rejected-needs-redesign'"));
});

test('NPC appearance approval is explicitly revoked; world staging stays non-rendering',()=>{
 const info=JSON.parse(read('site/data/npc/reaction-actors.v1.json'));
 const cast=info.groups.find(g=>g.id==='NPC-G001');
 assert.equal(cast.status,'art_rejected_needs_npc_redesign');
 assert.equal(cast.artReview.imageApproved,false);
 assert.equal(cast.artReview.gameArtApproved,false);
 const staging=require('../site/game/metro-npc-staging.js');
 assert.deepEqual(staging.approvedActors({records:[]}),[]);
});

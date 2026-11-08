'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

test('NPC-G001 approved emotion sources remain native full-resolution transparent sprites',()=>{
 for(const name of ['joy','surprise']){
  const p=path.join(root,'site/assets/characters/npc-g001',name+'-1024.png');
  assert.ok(fs.existsSync(p),name+' 1024 source missing');
  const b=fs.readFileSync(p);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG header required');
  assert.equal(b.readUInt32BE(16),1024,name+' width downscaled');
  assert.equal(b.readUInt32BE(20),1024,name+' height downscaled');
  assert.equal(b.readUInt8(25),6,'RGBA transparency required; do not paint the white background into the metro');
 }
 assert.equal(fs.existsSync(path.join(root,'site/assets/characters/npc-g001/emotion-joy-surprise-preview.avif')),false,
 '192px thumbnail must not ship as the NPC source');
});

test('metro QA loads exact 1024 resources, not dynamic low-resolution matte',()=>{
 const src=fs.readFileSync(path.join(root,'site/game/metro-cabin.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'site/game/metro-cabin.css'),'utf8');
 const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
 for(const asset of ['joy-1024.png','surprise-1024.png'])assert.ok(src.includes(asset),asset+' must be autoloaded');
 assert.ok(src.includes('img.src=source'),'metro QA must load full source directly');
 assert.ok(!src.includes("emotion-joy-surprise-preview.avif"),'do not load 192px thumbnail');
 assert.ok(!css.includes('brightness(.84) saturate(.9) contrast(1.06)'),'do not darken/smear NPC artwork');
 assert.ok(html.includes('npc-g001-hd-1024-20261108'),'HTML must invalidate old preview script/cache');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../studio/assets/player/coolbones');
const manifest=JSON.parse(await fs.readFile(path.join(root,'player.json'),'utf8'));

test('Coolbones player import contains the authored skeleton and gameplay actions',async()=>{
  assert.equal(manifest.format,'coolbones-runtime-v1');
  assert.equal(manifest.name,'magic_g');
  assert.equal(manifest.bones.length,16);
  assert.ok(manifest.bones.some(bone=>bone.id==='upper_body'&&bone.parentId==='body'));
  assert.equal(manifest.slots.length,31);
  assert.ok(manifest.attachments.some(attachment=>attachment.id==='front-hair'));
  for(const animation of ['ark_relax','ark_move','ark_interact','amiya_run']){
    assert.ok(manifest.animations[animation]);
    assert.ok(manifest.animations[animation].frames.length>1);
    assert.ok(manifest.animations[animation].duration>0);
  }
  for(const image of manifest.images){const stat=await fs.stat(path.join(root,'images',image.file));assert.ok(stat.size>0,image.file);}
});

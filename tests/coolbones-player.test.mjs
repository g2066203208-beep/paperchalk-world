import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../studio/assets/player/spine');
const data=JSON.parse(await fs.readFile(path.join(root,'magic_g.json'),'utf8'));

test('native Coolbones import keeps the lossless Spine 4.3 package',async()=>{
  assert.equal(data.skeleton.name,'magic_g');
  assert.equal(data.skeleton.spine,'4.3');
  assert.equal(data.bones.length,16);
  assert.equal(data.slots.length,37);
  const skin=Object.values(data.skins).find(item=>item.name==='default');
  assert.ok(skin?.attachments);
  const mesh=Object.values(skin.attachments).map(group=>Object.values(group)).flat().find(item=>item.type==='mesh');
  assert.ok(mesh?.triangles?.length>0);
  assert.ok(mesh?.vertices?.length>0);
  for(const name of ['10_明日方舟原动作/Move','10_明日方舟原动作/Relax','10_明日方舟原动作/Interact','20_参考扩展动作/Run']){
    assert.ok(data.animations[name],name);
  }
  const atlas=await fs.readFile(path.join(root,'magic_g.atlas'),'utf8');
  assert.match(atlas,/images\/front-hair\.png/);
  const images=await fs.readdir(path.join(root,'images'));
  assert.equal(images.filter(file=>file.endsWith('.png')).length,38);
  assert.ok((await fs.stat(path.join(root,'spine43.js'))).size>500_000);
});

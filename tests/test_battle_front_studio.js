/* Regression: female protagonist's battle PSD is an isolated L2D studio role.
 * The uploaded binary textures live in the user's imported ZIP, not the repo.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const studio=read('site/character-editor/studio.js');
const rig=read('site/l2d/part-rig.js');
const guide=read('docs/l2d/PROTAGONIST_BATTLE_FRONT_PSD_QA.md');
const game=read('site/index.html');
new Function(studio);
new Function(rig);
assert.match(studio,/BATTLE_FRONT_ID='protagonist-battle-front'/);
assert.match(studio,/list\.set\(BATTLE_FRONT_ID/);
assert.match(studio,/studio-battle-import-row/);
assert.match(studio,/studio-battle-import/);
assert.match(studio,/24 层独立工程/);
assert.match(studio,/data\.characterId!==BATTLE_FRONT_ID/);
assert.match(studio,/await storePartRig\(binding\)/);
assert.match(studio,/paperchalk:studio-ready-to-edit/);
assert.match(studio,/if\(currentId===BATTLE_FRONT_ID\)\{[\s\S]{0,200}message\('✓ 战斗正面分层与骨骼已保存/,
 'battle source saved locally without changing the canonical game slot');
assert.match(studio,/await put\('slot:'\+slot/);
assert.match(studio,/if\(currentId===BATTLE_FRONT_ID\)[\s\S]{0,230}throw Error\('战斗正面请导入/);
const known=['back_hair','axe_overhead','axe_held','legwear','footwear',
  'handwear_r','handwear_l','bottomwear','topwear','eyewhite_l','eyewhite_r',
  'irides_l','irides_r','eyelash_l','eyelash_r','front_hair'];
for(const id of known)assert.match(rig,new RegExp(' '+id+':\\['),
  'must have explicit part category: '+id);
assert.match(guide,/源 PSD 为 \*\*1024 × 1024\*\*/);
assert.match(guide,/图层 \*\*23 层\*\*/);
assert.match(guide,/保留源图层/);
assert.doesNotMatch(game,/protagonist-battle-front|battle-front-l2d/,
 'the incomplete character must NOT be installed into the main game');
console.log('PASS battle-front studio role isolation, safe ZIP importer, 24-part bone mappings and no original-hero override');

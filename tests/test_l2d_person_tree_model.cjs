/* Deterministic, browser-independent identity/asset taxonomy contract. */
'use strict';
const assert=require('node:assert/strict');
const model=require('../site/character-editor/person-tree-model.js');
const catalog=[
 {id:'protagonist',label:'女主角',front:'hero-front.webp',back:'hero-back.webp',
  l2dModule:{front:{renderer:'part-mesh',rig:{partCount:20},actions:['idle','combat']}}},
 {id:'protagonist-battle-front',label:'女主角 · 战斗正面（同人物动作子集）',
  familyId:'protagonist',variantCategory:'combat',
  front:'battle-source.png',l2dModule:{front:{rig:{partCount:24}}}},
 {id:'protagonist-sleepwear',label:'女主 · 睡衣正面分层',familyId:'protagonist',
  variantCategory:'default',front:'sleepwear.png',
  l2dModule:{front:{rig:{partCount:19}}}},
 {id:'hero-old-001',label:'女主角 · 旧拆分',front:'old-001.png',familyId:'hero-old-001'},
 {id:'hero-old-002',label:'女主 · 第2版',front:'old-002.png'},
 {id:'char-002',label:'女二号',front:'female-two.png'},
 {id:'char-002-psd-v1',label:'女二 · 原始 PSD',front:'female-two-original.png'},
 {id:'char-003',label:'男主角',front:'approved-17-artmeshes.png',
  l2dModule:{front:{rig:{partCount:17,sourceCharacterId:'char-003-outfit-02'}}}},
 {id:'old-male',label:'男主角 · 旧版',front:'male-legacy.png'},
 {id:'male2',label:'男二',front:'male-two.png'},
 {id:'char-004',label:'女三',front:'female-three.png'},
 {id:'char-003-outfit-02',label:'男主 · 新衣服',familyId:'char-003',
  variantCategory:'outfit',front:'new-suit.png',l2dModule:{front:{rig:{partCount:17}}}},
 {id:'char-008-outfit-02',label:'女老师 · 新衣服（待导入）',
  familyId:'char-006',variantCategory:'outfit',
  editorOnly:true,front:'data:image/svg+xml,placeholder'},
 {id:'char-006',label:'女五 · 女老师',front:'teacher.png'},
 {id:'class-teacher-geography-candidate',label:'历史女老师别名',familyId:'char-006',editorOnly:true},
 {id:'female-06',label:'女六 · 原始彩绘＋黑色短裤',front:'base-female-six.png',
   l2dModule:{front:{rig:{partCount:18}}}},
 {id:'female-06-outfit-02',label:'女六 · 橙棕外套黑色短裤',
   familyId:'female-06',variantCategory:'outfit',front:'outfit-female-six.png',
   l2dModule:{front:{rig:{partCount:17}}}}
];
const roots=model.makeTree(catalog,'protagonist');
const ids=roots.map(row=>row.family);
assert.equal(new Set(ids).size,ids.length,'never duplicate person root');
assert.equal(ids.filter(id=>id==='protagonist').length,1);
const heroine=roots.find(row=>row.family==='protagonist');
assert.equal(heroine.primary.id,'protagonist','canonical standing rig is the ONLY base');
assert.deepEqual(heroine.faces,{front:true,back:true});
assert.deepEqual(heroine.actions.map(x=>x.action),['combat'],
 'canonical battle is one local action, not a second model');
assert.deepEqual(heroine.outfits.map(x=>x.id),['protagonist-sleepwear']);
assert.ok(heroine.sources.some(x=>x.id==='protagonist-battle-front'&&x.type==='source'));
assert.ok(heroine.sources.some(x=>x.id==='hero-old-001'&&x.type==='legacy'));
assert.ok(heroine.sources.some(x=>x.id==='hero-old-002'&&x.type==='legacy'));
assert.equal(heroine.sources.some(x=>x.id==='protagonist-sleepwear'),false,
 'approved wardrobe is never mixed into source archive');
assert.equal(roots.find(x=>x.family==='char-002').sources.filter(
 x=>x.id==='char-002-psd-v1').length,1);
assert.equal(roots.find(x=>x.family==='char-003').sources.filter(
 x=>x.id==='old-male').length,1);
assert.deepEqual(roots.find(x=>x.family==='char-003').outfits.map(x=>x.id),[],
 'approved male front must not be duplicated in wardrobe');
assert.equal(roots.find(x=>x.family==='char-003').primary.id,'char-003');
assert.ok(roots.find(x=>x.family==='char-003').sources.some(x=>
 x.id==='char-003-outfit-02'&&x.type==='source'),
 'old module ID retained only as source provenance, never outfit');
assert.equal(roots.find(x=>x.family==='char-006')
 .outfits.length,0,'unimported wardrobes are not presented as playable');
assert.ok(roots.find(x=>x.family==='char-006')
 .sources.some(x=>x.type==='pending'));
assert.deepEqual(ids,['protagonist','char-003','char-002','male2','char-004','char-006','female-06'],
 'visible cast must alternate 女主/男主, 女二/男二, 女三/男三 and preserve female five/six');
assert.deepEqual(roots.map(x=>x.name),
 ['女主','男主','女二','男二','女三','女五','女六'],
 'all canon roots use single short names, not descriptions or suffixes');
const femaleSix=roots.find(x=>x.family==='female-06');
assert.deepEqual(femaleSix.outfits.map(x=>x.id),['female-06-outfit-02']);
assert.equal(femaleSix.outfits[0].label,'第二套 · 橙棕外套');
assert.equal(roots.filter(x=>x.family==='female-06').length,1,
 'female-six second outfit must never become an extra person node');
assert.ok(ids.indexOf('protagonist')<ids.indexOf('char-002'));
assert.equal(ids.filter(id=>id==='char-006').length,1,'female five and teacher must share one actor root');
assert.equal(model.familyOf({id:'class-teacher-geography-candidate'}),'char-006');
assert.equal(model.familyOf({id:'male2',label:'男二',familyId:'char-016'}),'male2');
assert.equal(model.familyOf({id:'temp',label:'女二 · 旧拆分'}),'char-002');
assert.equal(model.familyOf({id:'temp',label:'男主角 · 旧版'}),'char-003');
assert.equal(model.familyOf({id:'protagonist-sleepwear'}),'protagonist');
assert.deepEqual(model.makeTree(catalog,'protagonist').map(x=>x.family),ids,
 'stable order on repeated render without relying on Map insertion');
console.log('PASS person taxonomy: one actor, canonical rig actions, wardrobe, folded PSD/archive, provenance, identity, stable order');

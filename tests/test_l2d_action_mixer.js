/* Canonical heroine family, correct PSD Z-stack, and in-place part-only action transitions. */
'use strict';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const coreScript=read('site/l2d/part-rig.js');
const root={};
const core=new Function('window',coreScript+';return window.PaperchalkPartRigCore;')(root);
const base='site/assets/l2d/library/protagonist-battle-front/';
const layers=JSON.parse(read(base+'layers.json')).layers.front;
const rig=JSON.parse(read(base+'front.rig.json'));
const module=JSON.parse(read(base+'module.json'));
const catalog=JSON.parse(read('site/characters.catalog.json'));
const expected=['back_hair','legwear','footwear','axe_overhead','bottomwear',
 'neck','topwear','axe_held','handwear_r','handwear_l','ears_r','ears_l',
 'face','eyewhite_r','eyewhite_l','irides_r','irides_l','eyelash_r',
 'eyelash_l','eyebrow_r','eyebrow_l','mouth','front_hair','headwear'];
assert.deepEqual(Array.from(core.BATTLE_FRONT_STACK),expected);
assert.deepEqual(layers.map(x=>x.id),expected);
assert.deepEqual(Object.keys(rig.parts),expected);
assert.deepEqual(Object.keys(module.views.front.rig.textures),expected);
assert.equal(module.familyId,'protagonist');
assert.equal(catalog.characters.find(x=>x.id==='protagonist-battle-front').familyId,'protagonist');
assert.equal(rig.parts.topwear.parentId,'torso','jacket must not follow head bone');
assert.equal(rig.parts.handwear_r.pivot.x,0.86,'arm pivot must be at shoulder, not bitmap center');
assert.equal(layers.find(x=>x.id==='axe_overhead').visible,false,'duplicate axe remains hidden');
assert.ok(expected.indexOf('face')<expected.indexOf('eyewhite_r'));
assert.ok(expected.indexOf('eyewhite_r')<expected.indexOf('irides_r'));
assert.ok(expected.indexOf('irides_r')<expected.indexOf('eyelash_r'));
assert.ok(expected.indexOf('topwear')<expected.indexOf('axe_held'));
assert.ok(expected.indexOf('axe_held')<expected.indexOf('handwear_l'));
const faceBefore=JSON.stringify(rig.parts.face);
assert.equal(core.actionPart(rig,'axe_held',0).opacity,1);
assert.equal(core.setAction(rig,'idle',0),true);
assert.equal(core.actionPart(rig,'axe_held',0).opacity,1);
assert.ok(Math.abs(core.actionPart(rig,'axe_held',210).opacity-.5)<1e-10);
assert.equal(core.actionPart(rig,'axe_held',420).opacity,0);
assert.equal(core.actionPart(rig,'handwear_r',420).angle,-4);
assert.equal(core.actionPart(rig,'handwear_l',420).angle,43);
assert.equal(core.actionPart(rig,'face',420).angle,0);
assert.equal(core.actionPart(rig,'face',420).opacity,1);
assert.equal(core.setAction(rig,'combat',210),true);
assert.ok(Math.abs(core.actionPart(rig,'axe_held',210).opacity-.5)<1e-10,
 'quick reverse must continue from current interpolated pose, not jump');
assert.equal(JSON.stringify(rig.parts.face),faceBefore,'action cannot mutate shared face mesh');
assert.deepEqual(Array.from(core.actionNames(rig)).map(p=>p.id),['idle','combat']);
assert.equal(core.setAction({characterId:'other',face:'front',parts:{}},'combat',0),false);
const library=read('site/l2d/library-player.js');
assert.match(library,/function setAction\(slot,name\)/);
assert.match(library,/PaperchalkL2DLibrary=\{attach,detach:stop,setAction,getAction,/);
console.log('PASS heroine character family, battle PSD Z-stack, fixed shoulder anchors, and smooth partial action switching');

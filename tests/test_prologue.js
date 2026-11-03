/* Deterministic contract for Paperchalk World's first-person prologue.
 * Run with node tests/test_prologue.js; no external npm dependency.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const prologueSource=text('site/game/prologue.js');
const html=text('site/index.html');
const style=text('site/game/prologue.css');
new Function(prologueSource);
const client={};
vm.runInNewContext(prologueSource,{window:client,console});
const prologue=client.PaperWorldPrologue;
assert.ok(prologue,'exposes first-person scripted module');
assert.ok(prologue.lines.length>=50,'script must be a complete narrative, not placeholder 3-lines');
assert.equal(prologue.lines[0].speaker,'环境');
assert.ok(prologue.lines.some(x=>x.text.includes('清扫记录')));
assert.ok(prologue.lines.some(x=>x.text.includes('栗棕马尾')));
assert.ok(prologue.lines.some(x=>x.text.includes('未登记人员')));
const choice=prologue.lines.find(x=>x.choices);
assert.ok(choice&&choice.choices.length===2);
assert.equal(prologue.choose(choice,'shadow'),true);
assert.equal(prologue.choices().entrance,'shadow');
const alternate=prologue.lines.find(x=>x.variants);
assert.ok(alternate);
assert.notEqual(prologue.textFor(alternate),alternate.text);
prologue.reset();
assert.equal(prologue.choices().entrance,undefined);
prologue.restoreChoices({entrance:'knock'});
assert.equal(prologue.choices().entrance,'knock');
prologue.restoreChoices({entrance:'injected-value'});
assert.equal(prologue.choices().entrance,undefined,'reject invalid saved choices');
assert.ok(html.indexOf('game/prologue.js')<html.indexOf('const legacyClassroomLines'),
 'narrative module must load before game inline script');
assert.match(html,/cameraPlayer\.hidden=isPrologue\?true:!hasPlayer/);
assert.match(html,/enemyDepth\.hidden=isPrologue\?true:!def\.layers\.enemy/);
assert.match(html,/paperchalk-prologue-v1/);
assert.match(html,/if\(!storyMode\|\|stage\.dataset\.scene!=='classroom'\)return;/);
assert.match(html,/function renderPrologueChoice/);
assert.match(html,/PaperWorldPrologue\?\.cue\?\.\(dialogueIndex\)/);
assert.match(style,/#view\.prologue-first-person #camera-player-root/);
assert.match(prologueSource,/dev\.assign\('enemy','char-002','front',false\)/,
 'story casting cannot persist or overwrite the DEV NPC assignment');
assert.doesNotMatch(prologueSource,/location\.assign|localStorage\.setItem/);
console.log('PASS: first-person prologue data, choices, slots, save isolation, and load order');

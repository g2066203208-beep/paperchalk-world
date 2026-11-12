/* Regression suite for the automatic scene registry. Run after catalog build. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const catalog = JSON.parse(fs.readFileSync('site/scene-catalog.generated.json', 'utf8'));
const scope = {window: {}};
vm.runInNewContext(fs.readFileSync('site/scene-modules.js', 'utf8'), scope);
const api = scope.window.PAPERWORLD_SCENE_MODULES;
assert.equal(api.schema, 2);
const rooms = api.buildRegistry(catalog.scenes);
// Deleted scene families must not return to the live registry.
assert.equal(Object.keys(rooms).length,3+catalog.scenes.length+1+2);
assert.equal(rooms['city-street'].kind,'open-air-3d');
assert.equal(rooms['city-street'].layers.player,false);
assert.equal(rooms['city-street'].layers.fog,false);
assert.equal(rooms['city-street'].image,'./assets/city-street/streetscape.svg');
assert.ok(fs.existsSync('site/game/city-street-stage.js'));
assert.ok(fs.existsSync('site/assets/city-street/asphalt-material.svg'));
assert.ok(fs.existsSync('site/assets/city-street/shopfront-a.svg'));
for(const id of ['paper-ocean','convenience','cafe','mall','park'])
  assert.equal(rooms[id],undefined,'deleted scene: '+id);
assert.equal(rooms['school-corridor'].kind,'five-face-3d');
assert.equal(rooms['school-corridor'].layers.player,false);
assert.equal(rooms['school-corridor'].layers.fog,true);
assert.match(rooms['school-corridor'].alt,/27米/);
for(const [id,asset] of [['school','./assets/classroom.webp']]){
  assert.equal(rooms[id].type,'environment','location scene type: '+id);
  assert.equal(rooms[id].image,asset);
  assert.equal(rooms[id].layers.player,false,'first-person city scene has no back combat cutout');
  assert.equal(rooms[id].layers.fog,true);
  assert.ok(fs.existsSync('site/'+asset.slice(2)), 'missing city stage art: '+id);
}
// An approved city image dropped in assets/scenes MUST replace its blockout
// while inheriting the exact same fog/transition engine and no cutout actor.
const schoolPhoto={id:'school',file:'school.webp',title:'学校实景',
  width:1024,height:576,version:'123456789abc'};
const approved=api.buildRegistry([...catalog.scenes,schoolPhoto]);
assert.equal(approved.school.image,'./assets/scenes/school.webp');
assert.equal(approved.school.kind,'surface-world');
assert.equal(approved.school.layers.player,false);
assert.equal(approved.school.layers.fog,true);
assert.equal(approved.school.effects.fixedScreenFog,true);
assert.equal(approved.school.effects.darkSceneTransition,true);
assert.throws(()=>api.buildRegistry([...catalog.scenes,schoolPhoto,schoolPhoto]),/duplicated/);
assert.equal(rooms['classroom-box'].kind,'five-face-3d');
assert.equal(rooms['classroom-box'].layers.player,true);
assert.equal(rooms['classroom-box'].layers.enemy,true);
assert.equal(rooms['classroom-box'].layers.fog,true);
assert.equal(rooms['classroom-box'].image,'./assets/classroom.webp');
assert.equal(rooms.menu.layers.player, false);
assert.equal(rooms.classroom.layers.player, true);
assert.equal(rooms.classroom.layers.enemy, true);
assert.equal(Object.hasOwn(rooms,'protagonist'),false,'NO standalone portrait scene');
assert.ok(Object.isFrozen(rooms));
for (const e of catalog.scenes) {
  const scene = rooms[e.id];
  assert.ok(scene,'room missing from runtime scene registry: '+e.id);
  assert.equal(scene.type, 'environment');
  assert.equal(scene.layers.player,true);
  assert.equal(scene.layers.enemy,false);
  assert.equal(scene.layers.fog,true);
  assert.equal(scene.effects.fixedScreenFog,true);
  assert.equal(scene.effects.tiltBackgroundOnly,true);
  assert.equal(scene.effects.darkSceneTransition,true);
  assert.equal(scene.effects.preserveUserSettings,true);
  assert.equal(scene.width,e.width);
  assert.equal(scene.height,e.height);
  assert.equal(scene.version,e.version);
  assert.equal(scene.image,'./assets/scenes/'+e.file);
  assert.ok(fs.existsSync('site/assets/scenes/'+e.file));
}
assert.throws(()=>api.buildRegistry([{...catalog.scenes[0],id:'protagonist'}]),/Invalid/);
assert.throws(()=>api.buildRegistry([catalog.scenes[0],catalog.scenes[0]]),/duplicated/);
assert.throws(()=>api.buildRegistry([{...catalog.scenes[0],file:'../bad.webp'}]),/Invalid/);
const h=fs.readFileSync('site/index.html','utf8');
assert.match(h,/PAPERWORLD_SCENE_MODULES\.buildRegistry/);
assert.match(h,/scene-catalog\.generated\.js/);
assert.match(h,/scene-modules\.js/);
assert.match(h,/const TILT_KEY='paperchalk-tilt-v1'/);
assert.match(h,/const SAVE_KEY='paperchalk-scene-v1'/);
assert.match(h,/const EDITOR_KEY='paperchalk-layer-editor-v2'/);
assert.match(h,/const FOG_KEY=/);
require('./scene-camera.test.cjs');
console.log('PASS: '+catalog.scenes.length+' image-driven rooms, shared effects/layers, persistent user settings and guarded routes');

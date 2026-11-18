import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {CARD_DRAW_MS,evaluateCardSequence,smooth} from '../site/card-battle/motion/character-card-sequence.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=path=>readFileSync(resolve(root,path),'utf8');
const manifest=JSON.parse(file('site/data/art/seven-card-groups.v1.json'));
const present=['wonder-circus','crimson-vampires','monster-hunters','witch-workshop','demon-merchant'];
const cards=[];
for(const group of manifest.groups){
 if(!present.includes(group.id))continue;
 assert.equal(group.roster.length,7,group.id+' should contain 7 approved people');
 for(const card of group.roster){
  assert.notEqual(card.original_png_committed,false,'never use uncommitted portrait');
  const p='site/assets/characters/'+group.id+'/'+card.file;
  assert(existsSync(resolve(root,p)),'actual portrait image absent: '+p);
  cards.push({id:group.id+'/'+card.file,name:card.name});
 }
}
assert.equal(cards.length,35);
assert.equal(new Set(cards.map(c=>c.id)).size,35);
assert.equal(CARD_DRAW_MS,3800);
const s0=evaluateCardSequence(0),s1200=evaluateCardSequence(1200);
const s1750=evaluateCardSequence(1750),s1770=evaluateCardSequence(1770);
const s2120=evaluateCardSequence(2120),s2500=evaluateCardSequence(2500);
const s2990=evaluateCardSequence(2990),s3200=evaluateCardSequence(3200);
const s3800=evaluateCardSequence(3800);
assert.equal(s0.phase,'spin');
assert(s0.card.rotationY>3,'card must begin showing its BACK');
assert.equal(s0.card.visible,false,'no card in front of chute before release');
assert.equal(s1750.card.visible,false,'no premature floating portrait');
assert(s1770.card.visible,'physical cardstock emerges AFTER door unlock');
assert(s1770.card.rotationY>3,'card exits BACK-FIRST, no leaked character identity');
assert(s1770.card.rotationX< -1.3,'card leaves the narrow opening nearly FLAT, not as a vertical teleport');
assert(s2120.card.z>s1770.card.z,'card moves physically away from cabinet');
assert(s2120.card.scale>.95,'coin-like tiny pop-out is forbidden: card back must be visibly large during ejection');
assert(s2120.card.rotationX>s1770.card.rotationX,'card visibly lifts from near-horizontal into the reveal');
assert(s2500.card.rotationY<s1770.card.rotationY,'flips toward the viewer');
assert(s2990.card.rotationY<.001,'reveal must finish facing the viewer');
assert(s3200.card.reveal>.9,'glow happens on actual reveal, not before');
assert.equal(s3800.phase,'hold');
assert.equal(s3800.complete,true);
assert.equal(s3800.card.visible,true);
assert(s3800.card.scale>1.4,'final portrait must be large and legible');
for(let ms=0;ms<=CARD_DRAW_MS;ms+=10){
 const a=evaluateCardSequence(ms);
 assert(a.reels.every(Number.isFinite));
 assert(a.card.scale>0.6 && a.card.scale<1.6);
 assert(Number.isFinite(a.card.y)&&Number.isFinite(a.card.z));
 assert(a.door>=0 && a.door<=1);
 assert(a.card.reveal>=0 && a.card.reveal<=1);
 assert(a.flash>=0 && a.flash<=1);
}
for(let i=0;i<3;i++){
 const stop=[1160,1380,1600][i];
 assert(Math.abs(evaluateCardSequence(stop).reels[i]/(2*Math.PI)-Math.round(evaluateCardSequence(stop).reels[i]/(2*Math.PI)))<1e-7,
  'stopped mechanical reels should land exactly on an aligned emblem');
}
assert.equal(smooth(-1),0);assert.equal(smooth(2),1);
const html=file('site/card-battle/character-card-machine.html');
const runtime=file('site/card-battle/motion/character-card-machine.mjs');
const menu=file('site/index.html');
for(const token of ['draw-one','draw-five','faction','collection','machine-canvas','skip','glow']){
 assert(html.includes('id="'+token+'"'),'the scene must wire '+token);
}
assert(runtime.includes('THREE.WebGLRenderer'));
assert(runtime.includes('cardRoot.rotateY'));
assert(runtime.includes('new THREE.Texture(artwork)'),'the preserved original character image or safely matted art must remain a real WebGL texture');
assert(runtime.includes('mattePortraitBackground'),'an opaque white photo rectangle must not cover the antique burgundy card stock');
assert(runtime.includes('post.render(scene,camera)'));
assert(runtime.includes('queueDraw(5)'));
assert(runtime.includes('paperchalk-character-pulls-v1'));
assert(menu.includes('menu-character-card-machine')&&menu.includes('character-card-machine.html'));
console.log('PASS character-card 3D machine: 35 real artworks, actual menu, physical card choreography, flip timing and reproducibility');

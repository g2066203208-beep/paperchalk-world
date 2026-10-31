import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAMES,CATEGORIES,storeLink,galleryLink} from '../site/learning-library/games.js';
const read=path=>readFileSync(path,'utf8');
const seeded=JSON.parse(read('site/learning-library/seed-screenshots.json'));
const built=JSON.parse(read('site/learning-library/screenshots.json'));
test('all SIX priority study games are registered with verified Steam app IDs',()=>{
 const requested=[914800,1663220,2470300,239030,1451940,447530];
 assert.deepEqual(GAMES.filter(g=>g.core).map(g=>g.id),requested);
 assert.ok(GAMES.length>=20,'expand beyond core to a sizeable research library');
 assert.equal(new Set(GAMES.map(g=>g.id)).size,GAMES.length);
 assert.ok(GAMES.every(g=>g.id>0&&g.title&&g.cn&&g.focus.length>=16&&g.tags.length>=2));
 assert.ok(CATEGORIES.includes('柜台')&&CATEGORIES.includes('文件')&&CATEGORIES.includes('UI'));
 for(const g of GAMES){assert.match(storeLink(g.id),new RegExp('/'+g.id+'/'));assert.match(galleryLink(g.id),/steamcommunity/)}
});
test('true-gameplay evidence is never an AI render, capsule, banner or a fake image URL',()=>{
 const data=seeded.games;
 const required=[914800,1663220,2470300,239030,1451940,447530];
 for(const id of required){
  assert.ok(data[id].length>=2,'2+ carefully sourced real game images required for '+id);
 }
 let count=0;
 for(const [id,files] of Object.entries(data)){
  assert.ok(GAMES.some(g=>g.id===Number(id)),'source game ID must be in catalog');
  for(const shot of files){
   assert.ok(shot.url.startsWith('https://')&&shot.source.startsWith('https://'));
   assert.ok(shot.label&&shot.sourceKind==='curated-gameplay-evidence');
   assert.doesNotMatch(shot.url,/header\.|capsule|library_hero|concept|cover\.jpg/i);
   count++;
  }
 }
 assert.ok(count>=18);
 assert.deepEqual(built.games,data);
});
test('actual gallery is responsive and wired from the real PAPERWORLD menu',()=>{
 const html=read('site/learning-library/index.html'),css=read('site/learning-library/gallery.css'),
  app=read('site/learning-library/gallery.js'),menu=read('site/game/menu.js'),
  main=read('site/index.html'),stage=read('site/game/stage.css');
 for(const id of ['photos','viewer','search','categories','game-list','official-source','more','total-images'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const action of ['openViewer','updateViewer','galleryLink','sourceKind','loadImages','currentPhotos'])
  assert.ok(app.includes(action),action);
 assert.match(css,/@media\(max-width:730px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.ok(main.includes('./learning-library/'));
 assert.ok(stage.includes('pw-reference-library-link'));
 assert.ok(menu.includes('gameReferenceLink.hidden=state!==\'menu\''));
});
test('harvester only accepts documented source records; not generated thumbnails',()=>{
 const js=read('scripts/collect-game-reference-shots.mjs');
 assert.ok(js.includes('store.steampowered.com/api/appdetails'));
 assert.ok(js.includes('screenshot'));
 assert.ok(js.includes('official-steam-store'));
 assert.ok(js.includes('SOURCE_UNAVAILABLE'));
 assert.ok(js.includes('seed-screenshots.json'));
 assert.ok(js.includes('Steam store returned no verified screenshots'));
});

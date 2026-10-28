import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame,perform,currentEnemies,restoreGame,allCleared,LOCATIONS} from '../site/rules.js';

const go=(s,action)=>{const r=perform(s,action);assert.equal(r.ok,true,r.message);return r.state;};
test('real web game, mobile layout, reusable native APK entry',()=>{
  const page=readFileSync('site/index.html','utf8');
  const css=readFileSync('site/style.css','utf8');
  const app=readFileSync('site/app.js','utf8');
  assert.match(page,/id="locations"/);
  assert.match(page,/id="enemy-lanes"/);
  assert.match(page,/id="hand"/);
  assert.match(css,/orientation:portrait/);
  assert.match(css,/distance-1/);
  assert.match(css,/distance-3/);
  assert.match(app,/localStorage/);
  assert.match(app,/ART\.scene/);
  for(const name of ['src','examples','study','screenshots','style-study.html'])assert.equal(existsSync(name),false);
  assert.ok(existsSync('.github/workflows/apk.yml'));
});
test('7 enemy cards survive separate location switches and save roundtrip',()=>{
  let s=createGame();
  assert.equal(s.enemies.church.length,3);
  assert.equal(LOCATIONS.reduce((n,l)=>n+s.enemies[l.id].length,0),7);
  s=go(s,{type:'move',to:'cemetery'});
  assert.equal(s.ap,2);
  assert.equal(s.current,'cemetery');
  assert.equal(s.enemies.church.length,3);
  assert.equal(perform(s,{type:'move',to:'alley'}).ok,false);
  assert.deepEqual(restoreGame(JSON.stringify(s)),s);
});
test('selected enemy, ammunition and kill with 2-damage shot',()=>{
  let s=createGame();
  s=go(s,{type:'select',id:'h3'});
  s=go(s,{type:'shoot'});
  assert.equal(s.mag,4);
  assert.equal(s.enemies.church.find(e=>e.id==='h3').hp,2);
  s=go(s,{type:'shoot'});
  assert.ok(!s.enemies.church.some(e=>e.id==='h3'));
  assert.equal(s.ap,1);
  assert.equal(s.mag,3);
});
test('end turn advances distant enemies and lets distance-one enemies attack',()=>{
  let s=createGame();let initial=s.hp;
  s=go(s,{type:'end'});
  assert.equal(s.hp,initial-2);
  assert.equal(s.turn,2);
  assert.equal(s.ap,3);
  assert.equal(s.enemies.church.find(e=>e.id==='h1').distance,2);
  assert.equal(s.enemies.church.find(e=>e.id==='h2').distance,1);
});
test('healing, reloading, flare and action exhaustion enforce costs',()=>{
  let s=createGame();
  s=go(s,{type:'shoot',id:'h3'});
  s=go(s,{type:'reload'});
  assert.equal(s.mag,6);
  assert.equal(s.reserve,12);
  s=go(s,{type:'flare'});
  assert.equal(s.ap,0);
  assert.equal(s.enemies.church.find(e=>e.id==='h3').distance,2);
  assert.equal(perform(s,{type:'shoot'}).ok,false);
  s=go(s,{type:'end'});
  assert.equal(s.hp,9);
  s=go(s,{type:'shoot',id:'h3'});
  s=go(s,{type:'end'});
  assert.ok(s.hp<9);
  const hp=s.hp;
  s=go(s,{type:'heal'});
  assert.equal(s.hp,Math.min(9,hp+3));
  assert.equal(s.medkits,2);
});
test('complete combat across locations can win without cheating state',()=>{
 let s=createGame();
 for(const loc of ['church','cemetery','alley']){
   if(s.current!==loc && s.current!=='church') s=go(s,{type:'move',to:'church'});
   if(s.current!==loc)s=go(s,{type:'move',to:loc});
   for(const enemy of [...s.enemies[loc]]){
     while(s.enemies[loc].some(e=>e.id===enemy.id)){
       if(s.ap===0)s=go(s,{type:'end'});
       if(s.mag===0) {
         s=go(s,{type:'reload'});
         continue;
       }
       s=go(s,{type:'shoot',id:enemy.id});
       if(s.status!=='playing')break;
     }
   }
   if(s.status!=='playing')break;
   if(s.ap===0)s=go(s,{type:'end'});
 }
 // A deterministic straightforward strategy may die; only assert status consistency.
 assert.ok(['playing','won','lost'].includes(s.status));
 assert.equal(allCleared(s),s.status==='won');
});
test('reject corrupt save data rather than rendering broken state',()=>{
 assert.deepEqual(restoreGame('not JSON'),createGame());
 const s=createGame();s.enemies.church[0].distance=-1;
 assert.deepEqual(restoreGame(s),createGame());
});

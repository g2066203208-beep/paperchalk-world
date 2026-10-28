import test from 'node:test';
import assert from 'node:assert/strict';
import {initialGame} from '../site/engine.js';
import {initialOffice} from '../site/office-features.js';
import {freshCombat,normalizeCombat,draw,holster,beginEncounter,reload,finishReload,fire,enemyTick,retreat,settle,signalEncounter,buyAmmo} from '../site/combat.js';

test('gun draws immediately, shoots single rounds and detects practice board',()=>{
 let s=freshCombat();
 assert.equal(s.mode,'holstered');s=draw(s).combat;
 assert.equal(s.mode,'aim');
 const miss=fire(s,550,250);assert.equal(miss.ok,true);assert.equal(miss.hit,false);
 s=miss.combat;assert.equal(s.mag,5);assert.equal(s.shots,1);
 const hit=fire(s,991,300);assert.equal(hit.ok,true);assert.equal(hit.hit,true);
 assert.equal(hit.combat.mag,4);assert.equal(hit.combat.hits,1);
 assert.equal(holster(hit.combat).combat.mode,'holstered');
});
test('no infinite magazines: reload draws from finite reserve',()=>{
 let s=draw(freshCombat()).combat;
 for(let i=0;i<6;i++)s=fire(s,991,300).combat;
 assert.equal(s.mag,0);assert.equal(s.reserve,24);
 assert.equal(fire(s,991,300).ok,false,'dryfire does not grant new round');
 s=reload(s).combat;assert.equal(s.reloading,true);
 assert.equal(fire(s,991,300).ok,false,'no fire while reloading');
 s=finishReload(s).combat;assert.equal(s.mag,6);assert.equal(s.reserve,18);
 assert.equal(s.reloading,false);
});
test('enemies have HP and correct chest hitboxes, enemies retaliate',()=>{
 let s=draw(freshCombat()).combat;
 const r=beginEncounter(s,1,2);assert.equal(r.ok,true);s=r.combat;
 assert.equal(s.mode,'fight');assert.equal(s.enemies.length,2);
 assert.equal(holster(s).ok,false,'cannot instantly hide a live encounter');
 let miss=fire(s,300,100);s=miss.combat;assert.equal(miss.hit,false);
 const before=s.hp;s=enemyTick(s).combat;assert.ok(s.hp<before);
 for(const [x,y] of [[999,272],[999,272],[733,289],[733,289]]){
  const rr=fire(s,x,y);assert.equal(rr.ok,true,rr.message);s=rr.combat;
 }
 assert.equal(s.mode,'won');assert.equal(s.knockdowns,2);
 assert.equal(s.hits,4);assert.equal(s.mag,1);
 assert.equal(beginEncounter(s,1,2).ok,false,'only one encounter per day');
});
test('battle settlement rewrites campaign economy and persists',()=>{
 let s=draw(freshCombat()).combat;s=beginEncounter(s,1,2).combat;
 for(const [x,y] of [[999,272],[999,272],[733,289],[733,289]])s=fire(s,x,y).combat;
 const base=initialGame(),m=initialOffice();
 const r=settle(s,base,m);assert.equal(r.ok,true);
 assert.equal(r.state.cash,280);assert.equal(r.state.respect,6);assert.equal(r.state.heat,24);
 assert.equal(r.combat.mode,'holstered');assert.equal(r.combat.roundsCompleted,1);
 assert.deepEqual(normalizeCombat(JSON.parse(JSON.stringify(r.combat))),r.combat);
 assert.equal(settle(r.combat,r.state,m).ok,false,'no double reward');
});
test('retreat has persistent repair cost; ammo purchase real cost',()=>{
 let s=draw(freshCombat()).combat;s=beginEncounter(s,1,1).combat;
 s=retreat(s).combat;assert.equal(s.mode,'lost');
 const r=settle(s,initialGame(),initialOffice());
 assert.equal(r.state.cash,130);assert.equal(r.state.heat,17);
 const restock=buyAmmo(freshCombat(),initialGame());
 assert.equal(restock.ok,true);assert.equal(restock.state.cash,160);assert.equal(restock.combat.reserve,36);
 assert.equal(restock.state.ledger[0].amount,-30);
});
test('battle alert only once per danger day; rejects corrupt state',()=>{
 let s=freshCombat();
 s=signalEncounter(s,2,18);assert.equal(s.alert,true);assert.equal(s.alertDay,2);
 s=beginEncounter(draw(s).combat,1,2).combat;
 assert.equal(s.alert,false);
 const saved=signalEncounter(s,2,18);assert.equal(saved.alert,false);
 assert.deepEqual(normalizeCombat(null),freshCombat());
 assert.deepEqual(normalizeCombat({version:1,mag:-20,mode:'aim',reserve:0,hp:80,enemies:[]}),freshCombat());
});

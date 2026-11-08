'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
globalThis.Timegrid=require('../site/combat-lab/engine.js');
const bridge=require('../site/game/ring-arena-timegrid.js');
const G=globalThis.Timegrid;
assert.equal(G.ROUND,10);
const b=bridge.createBattle(12292),g=b.game;
assert.deepEqual(g.actors.map(a=>a.side),[...'aaaabbbb'].map(x=>x==='a'?'ally':'enemy'));
assert.deepEqual(b.game.actors.map(a=>bridge.displayId(a.id)),
 ['hero','ally-2','ally-3','ally-4','enemy-1','enemy-2','enemy-3','enemy-4']);
assert.ok(g.actors.every(a=>a.actions.every(act=>act.source!=='ai')),'no automated ally choices');
const planned=[];
for(let i=1;i<=4;i++){
 b.setRole(i);const actor=b.controlled();const c=actor.hand.find(x=>G.CARD[x.key].type==='attack');
 if(c){const a=b.schedule(c.uid,i, 'enemy-'+i);planned.push([actor.id,a.id,a.start]);}
 else b.autoplan();
}
assert.equal(b.game.controlledId,'ai-mage');
assert.ok(b.game.actors.slice(0,4).some(a=>a.actions.length>0));
const original=JSON.stringify(b.game),pv=b.preview();
assert.equal(JSON.stringify(b.game),original,'preview is read-only and deterministic');
assert.equal(pv.actors.length,8);
assert.equal(b.execute(),true);
assert.equal(b.playback,true);
const sequence=[];b.onChange(x=>{if(x.tick)sequence.push(x)});
for(let n=0;n<70&&b.playback;n++)b.advance(.15);
assert.equal(b.playback,false);
assert.ok(sequence.length>=1&&sequence.length<=10);
assert.equal(b.game.round,1);
assert.ok(b.game.actors.some(a=>a.hp<a.maxHp)||b.game.actors.some(a=>a.energy>0));
assert.equal(b.progress,0);
assert.ok(sequence.every(s=>s.actors.length===8&&s.tickInRound>=1&&s.tickInRound<=10));
assert.ok(sequence.every(s=>s.activeActions.every(a=>a.visualId&&a.targetVisualId)));
const fresh=bridge.createBattle(8);
assert.ok(fresh.setRole(0)===false);
assert.ok(fresh.setRole(3));
assert.equal(fresh.controlled().id,'ai-guard');
const origin=G.create({classId:'axe',encounterId:'corridor'});
assert.ok(origin.actors[0].hand.length>0,'legacy combat lab unaffected');
const main=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'../site/game/ring-arena-runtime.js'),'utf8');
assert.match(main,/ring-arena-timegrid\.js/);
assert.match(main,/ring-arena-timegrid\.css/);
assert.match(runtime,/PaperWorldRingTimegrid/);
assert.match(runtime,/combatTimegrid\.advance\(dt\)/);
console.log('PASS ring arena actual 4v4 Timegrid ten-tick cards, four controllers and game integration');

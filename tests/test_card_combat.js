/* Card combat: deterministic turn mechanics and two-sided team reactions.
 * npm-free: run node tests/test_card_combat.js
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('site/game/combat-engine.js');
new Function(source);
const env={window:{}};
vm.runInNewContext(source,env);
const E=env.window.PaperWorldCombat;
assert.equal(E.VERSION,1);
const battle=E.create({seed:42});
const start=battle.snapshot();
assert.equal(start.phase,'player');
assert.equal(start.energy,4);
assert.equal(start.hand.length,5);
assert.equal(start.allies.length,2);
assert.equal(start.enemies.length,3);
assert.equal(start.intents.length,3);
assert.ok(start.intents.every(x=>x.actorId&&x.targetId&&x.label));
assert.ok(start.hand.every(x=>x.cardId&&x.name&&Number.isInteger(x.cost)&&x.type));
const attackerCard=start.hand.find(x=>x.type==='attack');
assert.ok(attackerCard);
let action=battle.play(attackerCard.uid,'shade');
assert.equal(action.ok,true);
let snap=action.snapshot;
assert.equal(snap.stats.allyAssists,1,'ally must automatically follow up');
assert.ok(snap.events.some(x=>x.kind==='attack'&&x.side==='ally'));
assert.ok(snap.events.some(x=>x.kind==='assist'&&x.side==='ally'));
assert.ok(snap.events.some(x=>x.kind==='chain'&&x.side==='ally'));
assert.equal(snap.allies.find(x=>x.id!=='hero').rp,0,'reaction charge consumed');
const previousEnergy=snap.energy;
const invalid=battle.play('not-on-hand','shade');
assert.equal(invalid.ok,false);
assert.equal(battle.snapshot().energy,previousEnergy,'invalid card must not consume energy');
const invalidTarget=battle.play(snap.hand[0].uid,'not-a-real-target');
assert.equal(invalidTarget.ok,false);
assert.equal(battle.snapshot().energy,previousEnergy,'invalid target must not consume energy');
const enemyTurn=battle.endTurn();
assert.equal(enemyTurn.ok,true);
snap=enemyTurn.snapshot;
assert.equal(snap.round,2);
assert.equal(snap.phase,'player');
assert.ok(snap.stats.enemyAssists>=1,'enemies must support their teammates as well');
assert.ok(snap.events.some(x=>x.kind==='assist'&&x.side==='enemy'));
assert.ok(snap.allies.some(x=>x.hp<x.maxHp),'enemy damage actually applied');
assert.equal(snap.energy,4,'energy refills next turn');
assert.equal(snap.hand.length,5,'draws a new hand each round');
// Exactly one reaction per team member, no recursive infinite chain.
const triple=E.create({seed:8,allies:[...E.FRIENDS,
 {id:'third',name:'援军',hp:52,assist:7}],deck:['cut','cut','cut','cut','cut']});
action=triple.play(triple.snapshot().hand[0].uid,'rift');
assert.equal(action.ok,true);
assert.equal(action.snapshot.stats.allyAssists,2,
 'one lead attack should trigger TWO independent allies in a 3-member squad');
assert.deepEqual(Array.from(action.snapshot.allies,x=>x.rp),[1,0,0]);
action=triple.play(action.snapshot.hand[0].uid,'echo');
assert.equal(action.snapshot.stats.allyAssists,2,
 'spent reactions must not retrigger until explicitly refreshed');
const noCombo=E.create({seed:9,enemies:[{id:'solo',name:'独体',hp:85,assist:4}],
 deck:['cut','cut','cut','cut','cut']});
noCombo.endTurn();
assert.equal(noCombo.snapshot().stats.enemyAssists,0,'one enemy cannot assist itself');
// Guard and healing have target checks and cannot cross-faction.
const defense=E.create({seed:3,deck:['quick','quick','quick','quick','quick']});
action=defense.play(defense.snapshot().hand[0].uid,'partner');
assert.equal(action.ok,true);
assert.equal(action.snapshot.allies.find(x=>x.id==='partner').shield,12);
const badGuard=defense.play(action.snapshot.hand[0].uid,'shade');
assert.equal(badGuard.ok,false,'cannot shield enemy targets');
// Victory/defeat stable and no negative HP even on overkill.
const finish=E.create({seed:5,
 enemies:[{id:'mini',name:'目标',hp:2,assist:4}],
 deck:['cut','cut','cut','cut','cut']});
action=finish.play(finish.snapshot().hand[0].uid,'mini');
assert.equal(action.snapshot.phase,'won');
assert.equal(action.snapshot.enemies[0].hp,0);
assert.equal(finish.endTurn().ok,false,'game ends permanently until reset');
finish.reset();
assert.equal(finish.snapshot().phase,'player');
// Stress deterministic draws and resource bounds across many complete fights.
for(let seed=1;seed<=40;seed++){
 const fight=E.create({seed});
 let state=fight.snapshot();
 for(let round=0;round<25&&state.phase==='player';round++){
  for(let n=0;n<8&&state.phase==='player';n++){
   const c=state.hand.find(x=>x.type==='attack'&&x.cost<=state.energy&&
      state.allies.some(u=>u.id===x.owner&&u.hp>0));
   if(!c)break;
   const t=state.enemies.filter(x=>x.hp>0).sort((a,b)=>a.hp-b.hp)[0];
   if(!t)break;
   const outcome=fight.play(c.uid,t.id);
   assert.equal(outcome.ok,true);
   state=outcome.snapshot;
  }
  if(state.phase==='player')state=fight.endTurn().snapshot;
  for(const unit of [...state.allies,...state.enemies]){
   assert.ok(unit.hp>=0&&unit.hp<=unit.maxHp,'HP cap');
   assert.ok(unit.shield>=0&&unit.shield<=99,'shield cap');
   assert.ok(unit.rp>=0&&unit.rp<=2,'reaction cap');
  }
 }
 assert.ok(['won','lost'].includes(state.phase),'battle should resolve');
 assert.ok(state.stats.allyAssists>=1&&state.stats.enemyAssists>=0);
}
const html=read('site/index.html');
const ui=read('site/game/combat-ui.js');
const css=read('site/game/combat.css');
new Function(ui);
assert.match(html,/game\/combat-engine\.js/);
assert.match(html,/game\/combat-ui\.js/);
assert.match(html,/game\/combat\.css/);
assert.match(ui,/data-portrait/,'battle reuses live L2D meshes');
assert.match(ui,/dev\.assign\(slot,id,'front',false\)/,'temporary portrait must never write the DEV slot');
assert.doesNotMatch(ui,/localStorage\.setItem|indexedDB\.open/);
assert.match(css,/#pw-combat\[hidden\]/);
console.log('PASS 2 vs 3 card battle, two-sided multi-member reactions, guard, win/loss, 40 full runs and non-destructive live L2D integration');

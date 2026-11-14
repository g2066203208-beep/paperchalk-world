'use strict';
// Pure Node regression for the reusable battle-turn controller.
// No DOM, WebGL, browser, forest rendering or timers required.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const window={};
const context=vm.createContext({window,Math,Map,Set,Array,Object,Number,Error});
for(const pathPart of [
 'engine/level-engine.js','levels/forest-01.js',
 'engine/profession-decks.js','engine/combat-choreography.js',
 'engine/combat-turn-controller.js'
]){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../site/card-battle/',pathPart),'utf8'),
  context,{filename:pathPart});
}
const level=window.PaperchalkLevelEngine.create('forest-01',{
 cols:16,rows:6,center:(c,r)=>({x:c*2.65,z:r*3.34}),
 cell:()=>({height:0}),canAdjust:()=>true
},{physicalColumns:[6,7,8]});
const model=window.PaperchalkProfessionDecks.create({maxHand:10,
 ownedCharacters:[{id:'woodcutter',name:'伐木少女',profession:'warrior'}],seed:618231});
const choreography=window.PaperchalkCombatChoreography.create();
let selected=null;
const hand={
 get selected(){return selected;},
 get snapshot(){return model.snapshot();},
 clearSelection(){selected=null;},
 consumeForTarget(targetId){
  if(!selected)return null;
  const r=model.play(selected);selected=null;
  if(!r.ok)return null;
  return{damage:r.card.power,targetId,
   block:r.card.id==='guard-blow'?2:0,pierce:r.card.id==='sunder'};
 },
 nextTurn:()=>model.nextTurn()
};
const hits=[],messages=[];
const controller=window.PaperchalkCombatTurnController.create({
 level,animation:choreography,hand:()=>hand,
 locateCard:id=>{const u=level.getUnit(id);return u?{x:u.c,y:0,z:u.r}:null;},
 pointFor:c=>({...c}),
 onChanged:()=>{},onDamage:r=>hits.push(r),onGuard:()=>{},onNotice:t=>messages.push(t)
});
assert.equal(level.phase,'deployment');
assert.equal(model.snapshot().count,0,'no auto opening cards');
assert.equal(level.deploy('woodcutter',0,1).ok,true);
assert.equal(controller.playerAttack('woodcutter','forest-foe-a',1),false,
 'cannot attack before manually drawing and selecting a card');
const one=model.draw('woodcutter');
assert.equal(one.ok,true,'player taps the physical warrior box');
selected=one.card.instance;
const hpBefore=level.getUnit('forest-foe-a').currentHp;
assert.equal(controller.playerAttack('woodcutter','forest-foe-a',1),true);
assert.equal(model.snapshot().count,0,'exactly one manual card consumed');
assert.equal(controller.endTurn(1.1),false,'cannot end turn in the middle of a hit');
controller.update(1.20);
assert.equal(level.getUnit('forest-foe-a').currentHp,hpBefore,
 'game logic must not apply damage during anticipation');
controller.update(1.23);
assert.equal(level.getUnit('forest-foe-a').currentHp,hpBefore-one.card.power,
 'damage only applied on the hit frame');
assert.equal(hits.length,1);
controller.update(1.85);
assert.equal(level.turn,1,'a player attack cannot automatically advance the round');
assert.equal(level.getUnit('woodcutter').currentHp,12,
 'enemies must wait for end-turn, not retaliate after every attack');
assert.equal(controller.endTurn(2),true);
assert.equal(level.phase,'enemy');
assert.equal(controller.playerAttack('woodcutter','forest-foe-b',2.1),false,
 'cannot play hand cards during the enemy phase');
for(let t=2.1;t<7;t+=.05)controller.update(t);
assert.equal(level.turn,2);
assert.equal(level.phase,'active');
assert.equal(model.snapshot().count,0,'NO auto draw on player round two');
assert.ok(!messages.some(x=>x.includes('自动摸')));
assert.ok(messages.some(x=>x.includes('自行摸牌')));
assert.equal(level.getUnit('woodcutter').currentHp,10,
 'each surviving enemy gets one attack during its own turn');
assert.equal(model.snapshot().classes.find(c=>c.id==='warrior').discardCount,1,
 'played class card enters its discard pile after the round');
// Six slots stay empty. No nonexistent character class may produce a card.
assert.equal(model.snapshot().roster.length,1);
assert.equal(model.draw('guardian').reason,'locked-character');
assert.equal(model.draw('engineer').reason,'locked-character');
assert.equal(model.draw('medic').reason,'locked-character');
assert.equal(model.draw('woodcutter').ok,true);
assert.equal(model.snapshot().count,1);
assert.equal(model.snapshot().manualDraw,true);
controller.reset();assert.equal(controller.busy,false);
console.log('COMBAT_TURN_CONTROLLER_PASS reusable_headless_rules impact_damage enemy_queue manual_0_draw next_round');

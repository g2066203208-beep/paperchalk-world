'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const file of ['engine/card-registry.js','data/card-packs.js',
 'engine/profession-decks.js','engine/level-engine.js','engine/bandit-roster.js',
 'levels/forest-01.js','levels/forest-02.js','ui/forest-hand.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/',file),'utf8'),ctx,{filename:file});
}
const W=ctx.window,grid={
 cols:16,rows:6,center:(c,r)=>({x:c,z:r}),cell:()=>({height:0})};
const createLevel=id=>W.PaperchalkLevelEngine.create(id,grid,{physicalColumns:[6,7,8]});
const firstLevel=createLevel('forest-01');
const first=W.PaperchalkForestHand.create({level:firstLevel,maxHand:10});
assert.deepEqual(Array.from(first.snapshot.roster.map(r=>r.id)),['woodcutter']);
assert.equal(first.snapshot.count,0);
assert.equal(first.draw('woodcutter').reason,'not-player-turn');
assert.equal(firstLevel.deploy('woodcutter',1,1).ok,true);
const wCard=first.draw('woodcutter');
assert.ok(wCard.ok,'first level can manually draw woodcutter');
assert.equal(first.snapshot.count,1);
assert.equal(first.draw('farmer').reason,'locked-character');
assert.equal(first.selectCard(wCard.card.instance),true);
assert.equal(first.selected,wCard.card.instance);
assert.equal(first.onDeployment().count,1,'deployment never resets the player pile');
const secondLevel=createLevel('forest-02');
const hand=W.PaperchalkForestHand.create({
 level:secondLevel,maxHand:10,seed:618232,
 characterRegistry:{get:id=>({portrait:'/assets/'+id+'.png'})}});
assert.deepEqual(Array.from(hand.snapshot.roster.map(r=>r.id)),['woodcutter','farmer']);
assert.equal(hand.snapshot.roster[0].slot,0);
assert.equal(hand.snapshot.roster[1].slot,1);
assert.ok(hand.snapshot.roster[1].portrait.includes('farmer-engineer-farmer'));
assert.equal(secondLevel.deploy('woodcutter',1,0).ok,true);
assert.equal(hand.draw('farmer').reason,'not-player-turn');
assert.equal(secondLevel.deploy('farmer',1,2).ok,true);
const card=hand.draw('farmer');assert.ok(card.ok);
assert.equal(card.card.type,'facility');
assert.equal(hand.selectCard(card.card.instance),true);
assert.equal(hand.consumeSelected('attack'),null,'facility is not an attack');
assert.equal(hand.consumeSelected('facility')?.instance,card.card.instance);
assert.equal(hand.snapshot.count,0);
for(let i=0;i<10;i++)assert.ok(hand.draw('farmer').ok);
assert.equal(hand.snapshot.count,10);
assert.equal(hand.draw('woodcutter').reason,'hand-full');
console.log('CHARACTER_HAND_INJECTION_PASS deck_per_owner manual_draw no_debug_dependency');

'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const file of ['engine/card-registry.js','data/card-packs.js',
 'engine/profession-decks.js','engine/farmer-facilities.js','engine/card-effect-engine.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/',file),'utf8'),ctx,{filename:file});
}
const W=ctx.window;
const owned=[
 {id:'woodcutter',profession:'warrior',characterId:'farmer-warrior-loli-lumberjack'},
 {id:'farmer',profession:'engineer',characterId:'farmer-engineer-farmer'}
];
const deck=W.PaperchalkProfessionDecks.create({ownedCharacters:owned,maxHand:10});
const facilities=W.PaperchalkFarmerFacilities.create();
let selected=null;
const blocked={};
const level={phase:'active',
 getUnit:id=>owned.find(c=>c.id===id)?
  {...owned.find(c=>c.id===id),alive:true,deployed:true,side:'ally'}:null,
 grantBlock(id,n){blocked[id]=(blocked[id]||0)+n;return n;}};
const hand={
 get selected(){return selected;},
 selectedCard(){return deck.snapshot().hand.find(c=>c.instance===selected)||null;},
 consumeSelected(type){
  const c=this.selectedCard();
  if(!c||c.type!==type)return null;
  const result=deck.play(c.instance);
  if(!result.ok)return null;
  selected=null;return result.card;
 }
};
const effects=W.PaperchalkCardEffectEngine.create({
 level,hand:()=>hand,facilities,catalog:W.PaperchalkCardCatalog});
assert.equal(effects.playUtility().reason,'no-action-card');
const pull=(owner,id)=>{
 for(let i=0;i<10;i++){
  const c=deck.snapshot().hand.find(c=>c.ownerId===owner&&c.id===id);
  if(c)return c;
  const drawn=deck.draw(owner);
  assert.equal(drawn.ok,true);
 }
 throw Error('card not found: '+id);
};
const farm=pull('farmer','farm-field');selected=farm.instance;
const made=effects.placeFacility({tileC:4,tileR:4,flank:'left'},[
 {tileC:4,tileR:4}]);
assert.ok(made.ok);
assert.equal(deck.snapshot().hand.some(c=>c.instance===farm.instance),false);
const illegal=pull('farmer','plant-tree');selected=illegal.instance;
assert.equal(effects.placeFacility({tileC:4,tileR:4,flank:'left'},[
 {tileC:4,tileR:4}]).reason,'occupied');
assert.equal(deck.snapshot().hand.some(c=>c.instance===illegal.instance),true,
 'failed placement must never consume a card');
const tree=effects.placeFacility({tileC:4,tileR:5,flank:'left'},[
 {tileC:4,tileR:5}]);
assert.equal(tree.ok,true);
assert.equal(facilities.snapshot.facilities.length,2);
// Clear unplayed farm hand to make room for all four offensive woodcutter
// skills. This test intentionally does not give the warrior a "lumber" card.
for(const c of deck.snapshot().hand.slice())deck.play(c.instance);
assert.equal(W.PaperchalkCardCatalog.get('lumber'),null);
for(const attackId of ['strike','heavy-strike','cleave','diagonal-slash']){
 const attack=pull('woodcutter',attackId);selected=attack.instance;
 const activeTree=facilities.snapshot.facilities.find(f=>f.cardId==='plant-tree');
 const target=activeTree||facilities.place('plant-tree',
  {tileC:5,tileR:5,flank:'left'},[{tileC:5,tileR:5}]).facility;
 const before=facilities.snapshot.facilities.find(f=>f.id===target.id);
 const hit=effects.attackFacility(target.id);
 assert.ok(hit.ok,'every woodcutter attack can chop: '+attackId);
 assert.equal(hit.damage,Math.min(attack.power,before.hp));
 assert.equal(deck.snapshot().hand.some(c=>c.instance===attack.instance),false);
 if(hit.destroyed)assert.equal(hit.amount,3);
 else assert.equal(hit.amount,0,'no material until the tree falls');
}
assert.ok(facilities.snapshot.essence.material>=3,
 'felling a tree with a normal attack grants shared materials');
const guard=pull('woodcutter','guard');selected=guard.instance;
assert.equal(effects.attackFacility(tree.facility.id).reason,'not-an-attack');
const protectedActor=effects.playUtility();
assert.equal(protectedActor.type,'guard');
assert.equal(blocked.woodcutter,3);
assert.equal(effects.interactFacility(made.facility.id).reason,'no-action-card');
console.log('CARD_EFFECT_ENGINE_PASS attackable_trees_no_lumber_card full_normal_attack_support');

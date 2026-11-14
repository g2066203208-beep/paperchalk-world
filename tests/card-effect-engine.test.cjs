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
 getUnit:id=>owned.find(c=>c.id===id)?{id,alive:true,deployed:true,side:'ally'}:null,
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
const lumber=pull('woodcutter','lumber');
selected=lumber.instance;
const felled=effects.interactFacility(tree.facility.id);
assert.ok(felled.ok,'registered lumberjack interaction must destroy planted tree');
assert.equal(felled.amount,3);
assert.equal(facilities.snapshot.essence.material,3);
assert.equal(facilities.snapshot.facilities.length,1);
const guard=pull('woodcutter','guard');selected=guard.instance;
const protectedActor=effects.playUtility();
assert.equal(protectedActor.type,'guard');
assert.equal(blocked.woodcutter,3);
assert.equal(effects.interactFacility(made.facility.id).reason,'no-action-card');
console.log('CARD_EFFECT_ENGINE_PASS typed_canonical_actions rollback_on_failure local_interactions');

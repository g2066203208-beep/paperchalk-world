'use strict';
// The physical case has SEVEN slots but only OWNED characters get piles.
// Character acquisition order fills slots LEFT TO RIGHT; unowned = EMPTY.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
for(const file of ['engine/card-registry.js','data/card-packs.js','engine/profession-decks.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,
  '../site/card-battle/',file),'utf8'),ctx,{filename:file});
}
const Engine=ctx.window.PaperchalkProfessionDecks;
const woodcutter={id:'woodcutter',characterId:'farmer-warrior-loli-lumberjack',name:'伐木少女',profession:'warrior'};
const farmer={id:'farmer',characterId:'farmer-engineer-farmer',name:'农夫',profession:'engineer'};
const ranger={id:'huntress',name:'猎户少女',profession:'ranger'};
const first=Engine.create({maxHand:10,ownedCharacters:[woodcutter],seed:618231});
const a=first.snapshot();
assert.equal(a.count,0,'no automatic opening hand');
assert.equal(a.roster.length,1,'first chapter has only one acquired character');
assert.equal(a.roster[0].id,'woodcutter');
assert.equal(a.roster[0].slot,0);
assert.equal(a.roster[0].deckCount,10);
assert.equal(a.classes.filter(c=>c.unlocked).length,1);
assert.equal(first.draw('farmer').reason,'locked-character','farmer not acquired in chapter one');
assert.equal(first.draw('guardian').reason,'locked-character','empty slot is not a fake class pile');
assert.equal(first.remainingCards('guardian').length,0);
for(let i=0;i<10;i++)assert.equal(first.draw('woodcutter').ok,true,'player-click draw '+i);
assert.equal(first.snapshot().count,10,'shared hand cap');
assert.equal(first.draw('woodcutter').reason,'hand-full');
const chosen=first.snapshot().hand[4];
assert.equal(chosen.ownerId,'woodcutter','hand cards preserve their character owner');
assert.equal(first.play(chosen.instance).ok,true);
assert.equal(first.snapshot().count,9);
assert.equal(first.snapshot().locked,false,'playing does not prevent later drawing');
assert.equal(first.draw('woodcutter').reason,'box-empty','no fake extra card generation');
const kept=first.snapshot().hand.map(c=>c.instance).join('|');
first.nextTurn();
assert.equal(first.snapshot().turn,2);
assert.equal(first.snapshot().hand.map(c=>c.instance).join('|'),kept,
 'unspent hand remains and no automatic turn draw');
assert.equal(first.draw('woodcutter').ok,true,'used card recycled only after next turn');
first.reset();
assert.equal(first.snapshot().count,0);

const second=Engine.create({maxHand:10,ownedCharacters:[woodcutter,farmer],seed:618232});
assert.deepEqual(Array.from(second.snapshot().roster.map(c=>c.id)),['woodcutter','farmer']);
assert.deepEqual(Array.from(second.snapshot().roster.map(c=>c.slot)),[0,1]);
assert.equal(second.snapshot().roster.length,2);
assert.equal(second.snapshot().classes.filter(c=>c.unlocked).length,2);
assert.equal(second.remainingCards('woodcutter').length,10);
assert.equal(second.remainingCards('farmer').length,10);
assert.deepEqual([...new Set(second.remainingCards('farmer').map(c=>c.id))].sort(),
 ['farm-field','plant-tree','scarecrow','water-well','windmill'].sort());
assert.ok(second.remainingCards('farmer').every(c=>c.type==='facility'));
assert.equal(first.remainingCards('woodcutter').filter(c=>c.id==='lumber').length,2);
assert.equal(second.remainingCards('ranger').length,0,'huntress stays empty until acquired');
assert.equal(second.draw('farmer').ok,true,'farmer owns functional engineer deck');
assert.equal(second.snapshot().hand[0].profession,'engineer');
assert.equal(second.snapshot().hand[0].ownerId,'farmer');
assert.equal(second.draw('woodcutter').ok,true);
assert.equal(second.snapshot().hand[1].ownerId,'woodcutter');
assert.equal(second.remainingCards('farmer').length,9);
assert.equal(second.remainingCards('woodcutter').length,9);
second.nextTurn();
assert.equal(second.snapshot().count,2,'no auto-discard or auto-deal');
const third=Engine.create({ownedCharacters:[woodcutter,farmer,ranger]});
assert.equal(third.snapshot().roster[2].slot,2);
assert.equal(third.snapshot().roster[2].id,'huntress');
const twins=Engine.create({ownedCharacters:[
 {id:'warrior-a',profession:'warrior'},
 {id:'warrior-b',profession:'warrior'}
]});
assert.equal(twins.snapshot().roster.length,2,'multiple same-class characters own separate decks');
twins.draw('warrior-a');
assert.equal(twins.remainingCards('warrior-a').length,7);
assert.equal(twins.remainingCards('warrior-b').length,8);
assert.ok(twins.remainingCards('warrior-b').every(c=>c.id!=='lumber'),'伐木 cannot appear in other warriors');
assert.throws(()=>Engine.create({ownedCharacters:Array.from({length:8},(_,i)=>({
 id:'warrior-'+i,profession:'warrior'
}))}),/seven/i);
console.log('OWNED_CHARACTER_DECKS_PASS 1_slot_ch1 2_slots_ch2 six_and_five_empty seven_cap no_fake_piles manual_draw');

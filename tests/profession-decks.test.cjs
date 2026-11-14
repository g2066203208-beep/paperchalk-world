'use strict';
// Every card is drawn only by explicit PLAYER click on a class pile.
// Ten is the total shared hand capacity, never ten per profession.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({window:{},Math,Map,Set,Array,Object,Number,Error});
vm.runInContext(fs.readFileSync(path.join(__dirname,
 '../site/card-battle/engine/profession-decks.js'),'utf8'),ctx);
const Engine=ctx.window.PaperchalkProfessionDecks;
const model=Engine.create({maxHand:10,unlocked:['warrior'],seed:618231});
assert.equal(model.snapshot().count,0,'NO automatic opening hand');
assert.equal(model.snapshot().manualDraw,true);
assert.equal(model.snapshot().maxHand,10);
assert.equal(model.draw('engineer').reason,'locked-class');
for(let i=0;i<10;i++)assert.equal(model.draw('warrior').ok,true,'repeated manual box click '+i);
assert.equal(model.snapshot().count,10);
assert.equal(model.draw('warrior').reason,'hand-full');
const initial=model.snapshot().hand,selected=initial[3];
assert.equal(model.play(selected.instance).ok,true,'play any manually drawn hand card');
assert.equal(model.snapshot().count,9);
assert.equal(model.snapshot().locked,false,'playing a card never disables voluntary drawing');
assert.equal(model.draw('warrior').reason,'box-empty',
 'no invented duplicate cards while the used card is in this turn');
assert.equal(model.draw('warrior',{special:true}).reason,'box-empty');
const retained=model.snapshot().hand.map(c=>c.instance);
model.nextTurn();
assert.equal(model.snapshot().turn,2);
assert.equal(model.snapshot().count,9,'unused cards remain in hand between turns');
assert.deepEqual(model.snapshot().hand.map(c=>c.instance),retained,'no automatic turn discard');
assert.equal(model.snapshot().classes.find(c=>c.id==='warrior').discardCount,1);
assert.equal(model.draw('warrior').ok,true,'played card becomes drawable after reshuffle when pile empties');
assert.equal(model.snapshot().count,10,'can manually refill to 10, never auto');
model.reset();
assert.equal(model.snapshot().turn,1);
assert.equal(model.snapshot().count,0,'reset never deals any opening cards');

const seven=Engine.create({maxHand:10,prototypeAllClasses:true,seed:618231});
const initialSeven=seven.snapshot();
assert.equal(initialSeven.classes.length,7);
assert.equal(initialSeven.count,0);
assert.equal(initialSeven.classes.filter(c=>c.unlocked&&c.deckCount===10).length,7);
const tempOrder=seven.remainingCards('warrior').map(c=>c.id).join('|');
for(const cls of initialSeven.classes)
 assert.equal(seven.remainingCards(cls.id).map(c=>c.id).join('|'),tempOrder,
  'temporary deck art/order stays consistent but each box remains independent');
// Mix all seven independent physical boxes in the SAME shared hand.
for(const cls of initialSeven.classes)assert.equal(seven.draw(cls.id).ok,true,cls.id);
assert.equal(seven.draw('warrior').ok,true);
assert.equal(seven.draw('ranger').ok,true);
assert.equal(seven.draw('engineer').ok,true);
assert.equal(seven.snapshot().count,10);
assert.equal(new Set(seven.snapshot().hand.map(c=>c.profession)).size,7);
assert.equal(seven.draw('guardian').reason,'hand-full');
const played=seven.snapshot().hand[0];
assert.equal(seven.play(played.instance).ok,true);
assert.equal(seven.snapshot().count,9);
assert.equal(seven.draw('guardian').ok,true,
 'after playing, the player may still manually draw another card');
assert.equal(seven.snapshot().count,10);
const preserved=seven.snapshot().hand.map(c=>c.instance);
seven.nextTurn();
assert.deepEqual(seven.snapshot().hand.map(c=>c.instance),preserved);
assert.equal(seven.snapshot().count,10,'zero automatic cards on next turn');
assert.equal(seven.snapshot().classes.find(c=>c.id===played.profession).discardCount,1);
assert.ok(!('discard' in seven),'player cannot arbitrarily discard without a card effect');
console.log('PROFESSION_DECKS_MANUAL_DRAW_PASS seven_boxes mixed_ten_hand zero_autodeal preserve_hand draw_after_play');

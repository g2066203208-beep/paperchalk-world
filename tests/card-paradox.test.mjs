import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,loadGame,makeDeck,detectHand,scoreHand,selection,play,discardSelected,proceed,purchase,reroll,levelUp,preview,sortHand,moveJoker,BLINDS,JOKERS} from '../site/card-game/engine.mjs';
function cards(ranks,suits=[0,1,2,3,0]){return ranks.map((rank,i)=>({id:'test'+i,rank,suit:suits[i]}))}
function handName(rs,ss){return detectHand(cards(rs,ss)).id}
test('53? no: initial physical deck has exactly 52 unique cards and fixed seeded shuffle',()=>{
 const a=createGame(83173),b=createGame(83173);
 assert.deepEqual(a,b);
 assert.equal(makeDeck().length,52);
 assert.equal(a.hand.length,8);
 assert.equal(a.hand.length+a.deck.length+a.discard.length,52);
 assert.equal(a.hands,4);assert.equal(a.discards,3);
 assert.equal(a.money,8);assert.equal(a.blind,0);
});
test('all nine valid poker categories including wheel straight and royal-high straight flush',()=>{
 assert.equal(handName([2]),'high');
 assert.equal(handName([7,7,3,5,12]),'pair');
 assert.equal(handName([7,7,4,4,12]),'twoPair');
 assert.equal(handName([7,7,7,5,12]),'three');
 assert.equal(handName([2,3,4,5,6]),'straight');
 assert.equal(handName([1,2,3,4,5]),'straight');
 assert.equal(handName([1,10,11,12,13]),'straight');
 assert.equal(handName([2,4,6,9,12],[0,0,0,0,0]),'flush');
 assert.equal(handName([2,2,2,3,3]),'full');
 assert.equal(handName([2,2,2,2,3]),'four');
 assert.equal(handName([1,2,3,4,5],[2,2,2,2,2]),'straightFlush');
 assert.equal(handName([1,10,11,12,13],[1,1,1,1,1]),'straightFlush');
});
test('A high card counts as 11 rather than an empty scoring subset',()=>{
 const c=cards([1,3,6,8,10]);
 const r=scoreHand(c);
 assert.equal(r.id,'high');
 assert.equal(r.scoredIds.length,1);
 assert.equal(r.scoredIds[0],c[0].id);
 assert.equal(r.chips,8+11);
});
test('joker scoring is ordered additive/multiplicative and does not silently duplicate',()=>{
 const pair=cards([6,6]);
 const a=scoreHand(pair,['lantern','mirror','gear']);
 const b=scoreHand(pair,['gear','lantern','mirror']);
 assert.equal(a.score,b.score);
 assert.equal(a.mult,7);
 assert.equal(a.chips,16+12+14);
 const twoPair=cards([6,6,9,9]);
 const ab=scoreHand(twoPair,['lantern','mirror']);
 const ba=scoreHand(twoPair,['mirror','lantern']);
 assert.notEqual(ab.score,ba.score,'multiplication order must affect result');
 assert.equal(ab.mult,(2+5)*2);
 assert.equal(ba.mult,2*2+5);
 assert.deepEqual(scoreHand(pair,['lantern','lantern']),scoreHand(pair,['lantern']));
});
test('selection, discard, draw, 5-card cap, and persistent deck uniqueness',()=>{
 const g=createGame(88);const original=g.hand.map(c=>c.id);
 for(const card of g.hand.slice(0,5))assert.equal(selection(g,card.id),true);
 assert.equal(selection(g,g.hand[5].id),false);
 assert.equal(g.selected.length,5);
 assert.equal(discardSelected(g),true);assert.equal(g.discards,2);
 assert.equal(g.hand.length,8);
 assert.equal(g.selected.length,0);
 assert.ok(original.some(id=>!g.hand.some(c=>c.id===id)));
 assert.equal(new Set([...g.hand,...g.deck,...g.discard].map(c=>c.id)).size,52);
 assert.equal(loadGame(JSON.stringify(g)).phase,'battle');
 assert.equal(discardSelected(g),false);
 sortHand(g,'rank');sortHand(g,'suit');
 assert.equal(g.hand.length,8);
});
test('winning a blind enters shop, buying joker, leveling up and continuing restores entire deck',()=>{
 const g=createGame(42);
 g.jokers=['lantern','gear','star']; // injected as legal owned deck to test deterministic action order
 g.score=BLINDS[0].target-1;
 const id=g.hand[0].id;
 selection(g,id);
 const before=preview(g);
 assert.ok(before.score>1);
 const result=play(g);
 assert.equal(result.ok,true);assert.equal(result.won,true);assert.equal(g.phase,'shop');
 assert.equal(g.stats.won,1);assert.ok(g.money>8);
 assert.equal(new Set([...g.hand,...g.deck,...g.discard].map(c=>c.id)).size,52);
 const sell=g.shop[0];
 if(sell){
  g.money=100;
  const count=g.jokers.length;
  assert.equal(purchase(g,sell),true);
  assert.equal(g.jokers.length,count+1);
  assert.equal(purchase(g,sell),false);
  assert.equal(levelUp(g),true);
  assert.equal(reroll(g),true);
 }
 assert.equal(proceed(g),true);assert.equal(g.phase,'battle');assert.equal(g.blind,1);
 assert.equal(g.hand.length,8);
 assert.equal(new Set([...g.hand,...g.deck,...g.discard].map(c=>c.id)).size,52);
 assert.doesNotThrow(()=>loadGame(JSON.stringify(g)));
});
test('end of run can transition to victory only after last shop, and loss after no remaining hands',()=>{
 const g=createGame(70);g.blind=8;g.phase='shop';
 assert.equal(proceed(g),true);
 assert.equal(g.phase,'victory');
 const loss=createGame(71);loss.hands=1;
 selection(loss,loss.hand[0].id);
 const r=play(loss);
 assert.equal(r.lost,true);assert.equal(loss.phase,'lost');
});
test('saved-state validation prevents duplicate or invalid cards and false selected IDs',()=>{
 const g=createGame(42);
 assert.throws(()=>loadGame('{}'));
 const corrupt=JSON.parse(JSON.stringify(g));corrupt.deck[0]=corrupt.hand[0];
 assert.throws(()=>loadGame(corrupt),/牌组验证失败/);
 const selected=JSON.parse(JSON.stringify(g));selected.selected=['doesntExist'];
 assert.throws(()=>loadGame(selected),/选牌记录/);
 const joker=JSON.parse(JSON.stringify(g));joker.jokers=['foreign'];
 assert.throws(()=>loadGame(joker),/小丑牌无效/);
});
test('all original jokers unique and the content is replayable over 9 distinct blinds',()=>{
 assert.equal(JOKERS.length,12);assert.equal(new Set(JOKERS.map(j=>j.id)).size,12);
 assert.equal(BLINDS.length,9);assert.equal(BLINDS.filter(b=>b.boss).length,3);
 assert.ok(BLINDS.every((b,i)=>!i||b.target>BLINDS[i-1].target));
});

test('reorder special cards alters score, respects edges and survives persistence',()=>{
 const g=createGame(20261101);
 g.jokers=['lantern','mirror'];
 const combo=cards([6,6,9,9]);
 const before=scoreHand(combo,g.jokers).score;
 assert.equal(moveJoker(g,'mirror',-1),true);
 assert.deepEqual(g.jokers,['mirror','lantern']);
 assert.notEqual(scoreHand(combo,g.jokers).score,before);
 assert.equal(loadGame(JSON.stringify(g)).jokers[0],'mirror');
 assert.equal(moveJoker(g,'mirror',-1),false);
 assert.equal(moveJoker(g,'invalid',1),false);
 assert.equal(moveJoker(g,'mirror',0),false);
});

import assert from 'node:assert/strict';
import {
 SEAT_COUNT,HAND_LIMIT,makeDuel,deployHero,drawFromHero,
 playAction,endRound,getPlayableTarget,getSnapshot
} from '../site/card-battle/engine/seven-seat-duel.mjs';
const roster=side=>Array.from({length:7},(_,i)=>({
 id:side+':'+(i+1),name:side+'人物'+(i+1),art:'/assets/characters/test/'+side+'-'+i+'.png'
}));
const allies=roster('friend'),enemies=roster('opponent');
const s=makeDuel(allies,enemies);
assert.equal(SEAT_COUNT,7);assert.equal(HAND_LIMIT,10);
assert.equal(s.allySeats.length,7);assert.equal(s.enemySeats.length,7);
assert.deepEqual(s.enemySeats.map(Boolean),[false,true,false,true,false,true,false]);
assert.equal(s.hand.length,0,'start with zero action cards');
assert.equal(drawFromHero(s,allies[0].id).ok,false,'cannot draw from undeployed hero');
assert.equal(endRound(s).ok,false,'must deploy first');
assert.equal(deployHero(s,allies[0].id,7).ok,false,'seat 8 is invalid');
assert.equal(deployHero(s,allies[0].id,3).ok,true);
assert.equal(deployHero(s,allies[0].id,4).ok,false,'same hero cannot deploy twice');
assert.equal(deployHero(s,allies[1].id,3).ok,false,'taken seat cannot be overwritten');
assert.equal(deployHero(s,allies[1].id,2).ok,true);
assert.equal(s.energy,2);
assert.equal(s.decks[allies[0].id].unlocked,true);
assert.equal(s.decks[allies[1].id].unlocked,true);
assert.equal(s.decks[allies[2].id].unlocked,false);
assert.equal(drawFromHero(s,allies[2].id).ok,false);
for(let i=0;i<10;i++){
 const res=drawFromHero(s,allies[i%2].id);
 assert.equal(res.ok,true,'manual draw '+i+': '+res.message);
}
assert.equal(s.hand.length,10);
assert.equal(drawFromHero(s,allies[0].id).ok,false,'no 11th hand card');
assert.deepEqual([...new Set(s.hand.map(c=>c.ownerId))].sort(),
 [allies[0].id,allies[1].id].sort());
const damage=s.hand.find(c=>c.kind==='damage'&&c.cost===1);
assert(damage,'requires inexpensive attack');
const length=s.hand.length,energy=s.energy;
assert.equal(getPlayableTarget(s,damage.id,'enemy',0),false);
assert.equal(playAction(s,damage.id,'enemy',0).ok,false);
assert.equal(s.hand.length,length);assert.equal(s.energy,energy);
const foe=s.enemySeats[1],foeHp=foe.hp;
assert.equal(getPlayableTarget(s,damage.id,'enemy',1),true);
assert.equal(playAction(s,damage.id,'enemy',1).ok,true);
assert(foe.hp<foeHp,'actual enemy takes damage');
assert.equal(s.hand.length,length-1);
assert(s.decks[damage.ownerId].discard.some(c=>c.id===damage.id));
const heal=s.hand.find(c=>c.kind==='heal'&&c.cost===1);
assert(heal,'an actual heal card is in hand');
const hurtHp=foe.hp;
assert.equal(playAction(s,heal.id,'enemy',1).ok,true,'healing opposing unit is allowed');
assert(foe.hp>hurtHp,'enemy heal affects actual HP');
assert.equal(s.energy,0);
const handBefore=s.hand.length,enemyTarget=s.allySeats[2],hpBefore=enemyTarget.hp;
assert.equal(endRound(s).ok,true);
assert.equal(s.round,2);assert.equal(s.energy,4);
assert.equal(s.hand.length,handBefore,'end turn must NOT auto draw');
assert(enemyTarget.hp<hpBefore,'enemy round must cause actual damage');
const friendlyFire=s.hand.find(c=>c.kind==='damage'&&c.cost<=s.energy);
assert(friendlyFire,'a second damage card exists');
const ourUnit=s.allySeats[3],ourHp=ourUnit.hp;
assert.equal(playAction(s,friendlyFire.id,'ally',3).ok,true,'can target ally');
assert(ourUnit.hp<ourHp,'friendly fire changes HP');
const snap=getSnapshot(s);
assert.equal(snap.seats.ally.length,7);
assert.equal(snap.seats.enemy.length,7);
assert.equal(snap.decks[allies[2].id].unlocked,false);
assert.equal(snap.hand.length,handBefore-1);
assert.throws(()=>makeDuel(allies.slice(1),enemies),/seven-character/);
console.log('PASS 7+7 seats, deploy-to-unlock individual decks, no automatic draw, 10 hand, ally/enemy targets, real HP and turns');
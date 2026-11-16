/* Rule-derived motion event contract: no DOM and no mock attacks. */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("site/card-battle/engine/snowbound-journey.js","utf8");
const context={window:{}};vm.runInNewContext(source,context);
const newGame=(hero="marksman")=>{const g=context.window.PaperchalkSnowbound.create();g.startFresh();g.selectHero(hero);return g;};
const g=newGame(),initial=g.selectNode(0);
assert.equal(g.view(),"battle");
assert(initial.visualEvents.some(e=>e.type==="battleIntro"),"battle intro has semantic entry event");
assert.equal(initial.visualEvents.find(e=>e.type==="battleIntro").hand.length,5,"initial five-card draw is captured");
const b=g.state().run.battle;
const target=b.foes[0],beforeHP=target.hp;
const offense=["hit","pierce","freeze","weaken","all"];
let attackIndex=b.hand.findIndex(c=>offense.includes(g.ITEMS.find(d=>d.id===c.id)?.kind));
if(attackIndex<0)throw Error("expected at least one attack in deterministic first hand");
const played=g.play(attackIndex,target.uid);
assert(played.ok);
const hit=played.visualEvents.find(e=>e.type==="itemHit");
assert(hit,"played attack creates ItemHit event");
assert.equal(hit.hpBefore,beforeHP);
assert.equal(hit.hpAfter,Math.max(0,hit.hpBefore-hit.damage),"damage event matches actual HP delta when unshielded");
assert.equal(hit.lethal,hit.hpAfter<=0,"lethal flag matches HP");
assert.equal(g.state().run.battle.playsLeft,0);
let attackCues=[],rounds=0;
for(;rounds<8&&g.view()==="battle";rounds++){
 const out=g.endTurn();
 assert(out.ok);
 if(out.visualEvents)attackCues.push(...out.visualEvents.filter(e=>e.type==="attack"));
 if(attackCues.length>=2)break;
}
assert(attackCues.length>=1,"auto attack emits at least one ordered event");
for(const e of attackCues){
 assert(e.actorId&&e.targetId,"attacks require stable actor/target ID");
 assert.equal(e.hpAfter,Math.max(0,e.hpBefore-e.damage),"HP transition matches resolved damage");
 assert.equal(e.lethal,e.hpAfter<=0,"lethal matches zero HP");
 assert(["friendly","enemy"].includes(e.actorSide));
}
console.log("PASS semantic battle intro, card hit, auto attack and HP/kill causal snapshots",attackCues.length);
const g2=newGame();g2.selectNode(0);
const oldSlot=g2.state().run.battle.allies[0].slot;
const id=g2.state().run.battle.allies[0].uid;
const moved=g2.move(id,3);
assert.equal(moved.visualEvents[0].type,"move");
assert.equal(moved.visualEvents[0].fromSlot,oldSlot);
assert.equal(moved.visualEvents[0].toSlot,3);
const redrawn=g2.redraw();
assert(redrawn.visualEvents.some(e=>e.type==="redraw"));
console.log("PASS movement and redraw semantic events");
const shop=newGame();
shop.selectNode(0);shop.finishNode();
shop.selectNode(0);shop.claim(0);
const shopEvent=shop.selectNode(0);
assert.equal(shop.view(),"shop");
const item=shop.state().run.offers[0],cashBefore=shop.state().run.gold,deckBefore=shop.state().run.deck.length;
const result=shop.buy(0);
assert(result.ok,"first item should be affordable");
assert.equal(result.visualEvents[0].type,"shopPurchase");
assert.equal(result.visualEvents[0].price,item.price);
assert.equal(shop.state().run.gold,cashBefore-item.price);
assert.equal(shop.state().run.deck.length,deckBefore+1);
const duplicate=shop.buy(0);
assert.equal(duplicate.ok,false);
assert.equal(shop.state().run.gold,cashBefore-item.price,"second purchase cannot charge twice");
const insufficient=shop.buy(1);
assert.equal(insufficient.ok,false);
console.log("PASS atomic buy, one-time item addition, duplicate and insufficient funds");
const party=newGame();
party.selectNode(0);party.finishNode();
party.selectNode(0);party.claim(0);
const recruited=party.state().run.companions[0];
party.selectNode(0);party.leaveEvent();
party.selectNode(0);
assert.equal(party.view(),"battle");
const ally=party.state().run.battle.allies.find(x=>!x.leader);
assert(ally&&ally.template===recruited,"rescued human companion enters battlefield");
const recalled=party.recall(ally.uid);
assert(recalled.ok&&recalled.visualEvents[0].type==="recall");
assert(!party.state().run.battle.allies.some(x=>x.uid===ally.uid));
const summoned=party.summon(recruited,3);
assert(summoned.ok&&summoned.visualEvents[0].type==="summon");
const deployed=party.state().run.battle.allies.find(x=>x.template===recruited);
assert(deployed&&deployed.uid!==ally.uid&&deployed.slot===3);
assert.equal(party.state().run.battle.playsLeft,0,"summon spends this turn's action");
assert.equal(party.summon(recruited,4).ok,false,"already deployed companion cannot duplicate");
assert.equal(party.recall(party.state().run.battle.allies.find(x=>x.leader).uid).ok,false,"leader cannot be recalled");
console.log("PASS companion recall, legal summon, duplicate guard, turn cost and leader immunity");

// Save/reload must not reset the serial allocator to an already live ID.
// In the old engine a recalled/recruited companion could reuse 'ally-1'
// (which belongs to an existing unit), confusing targeting and motion.
const preSave=newGame();preSave.selectNode(0);
const fixture=preSave.state();
fixture.run.companions=["medic"];
const existingIds=new Set([...fixture.run.battle.allies,...fixture.run.battle.foes].map(x=>x.uid));
const restored=context.window.PaperchalkSnowbound.create(fixture);
const savedSummon=restored.summon("medic",3);
assert.equal(savedSummon.ok,true,"reloaded battle must permit legal companion summon");
const newUid=savedSummon.visualEvents.find(x=>x.type==="summon")?.actorId;
assert(newUid&&!existingIds.has(newUid),
 "reloaded summon must never reuse an existing ally or foe UID");
const liveIds=[...restored.state().run.battle.allies,...restored.state().run.battle.foes].map(x=>x.uid);
assert.equal(new Set(liveIds).size,liveIds.length,"all live combat IDs must be globally unique");
console.log("PASS saved battle preserves unique unit identity across subsequent summons");

console.log("PASS ALL SEMANTIC EVENT RULES");

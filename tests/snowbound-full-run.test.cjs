'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('site/card-battle/engine/snowbound-journey.js','utf8');
const root={};new Function('window',source)(root);
const api=root.PaperchalkSnowbound;
assert.equal(api.HEROES.length,3);
assert.equal(api.ZONES.length,3);
function fullRun(heroId){
 const game=api.create();game.startFresh();
 assert(game.selectHero(heroId).ok);
 let battles=0,shops=0,recruits=0,regions=new Set(),iterations=0;
 while(iterations++<420){
  const s=game.state(),run=s.run;
  if(s.screen==='result')break;
  if(s.screen==='map'){
   assert(run.zone<3,'zone within range');
   assert(game.selectNode(0).ok,'map event opens');
  }else if(s.screen==='battle'){
   const b=run.battle;
   const attacks=['pierce','silver','bolt','burst','snow','frost'];
   if(!b.hand.length||
      b.hand.every(c=>['guard','herb','tea'].includes(c.id))&&run.health>run.maxHealth*.75){
     assert(game.redraw().ok);continue;
   }
   let index=b.hand.findIndex(c=>attacks.includes(c.id));
   if(run.health<run.maxHealth*.6){
    const heal=b.hand.findIndex(c=>['herb','tea'].includes(c.id));if(heal>=0)index=heal;
   }
   if(index<0)index=0;
   if(b.playsLeft){
     const target=b.foes.filter(f=>f.hp>0).sort((a,b)=>a.hp-b.hp)[0];
     assert(game.play(index,target?.uid).ok,'card played');
   }
   if(game.view()==='battle')assert(game.endTurn().ok,'turn completed');
  }else if(s.screen==='battle-clear'){
   battles++;regions.add(run.zone);
   assert(game.afterBattle().ok,'battle reward resolves');
  }else if(['recruit','treasure','charm','camp','forge'].includes(s.screen)){
   if(s.screen==='recruit')recruits++;
   assert(game.claim(0).ok,'reward claimed');
  }else if(s.screen==='shop'){
   shops++;
   const idx=run.offers.findIndex(x=>x.price<=run.gold);
   if(idx>=0){
    const goldBefore=run.gold;
    assert(game.buy(idx).ok,'shop item purchased');
    assert(game.state().run.gold<goldBefore,'purchase deducts coins');
   }
   assert(game.leaveEvent().ok);
  }else throw Error('unreachable screen '+s.screen);
 }
 const final=game.state();
 assert.equal(final.screen,'result','run ends at result');
 assert.equal(final.run.result.won,true,heroId+' clears all three acts');
 assert.equal(final.run.zone,3,'run exits third zone');
 assert.equal(battles,6,'each zone has battle and boss fight');
 assert.equal(regions.size,3,'visits all zones');
 assert.equal(recruits,1,'recruitment event occurs');
 assert.equal(shops,1,'store visit occurs');
 assert(final.run.companions.length>=1,'companion joins permanently');
 assert(final.run.charms.length>=1,'charm joins permanently');
 return {heroId,battles,shops,recruits,turns:final.run.turns,damage:final.run.damageDealt};
}
const results=['frostwitch','warden'].map(fullRun);
console.log('Snowbound 3-zone complete victory and persistent campaign inventory:',JSON.stringify(results));

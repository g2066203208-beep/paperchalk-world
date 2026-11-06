const assert=require('node:assert/strict'),fs=require('fs'),G=require('../engine.js'),C=require('../campaign.js');
const data=[];let runs=0,clears=0,avgStages=0,earned=0,bought=0;
for(const [cls,d]of Object.entries(G.CLASS))for(const styleId of Object.keys(d.styles)){
 let completed=0,rewardCards=0,shopCards=0,stages=0;
 for(let seed=0;seed<8;seed++){
  runs++;const r=C.start({classId:cls,styleId,seed:9001+seed*711+Object.keys(G.CLASS).indexOf(cls)*103});
  for(let floor=0;floor<5;floor++){
   const g=C.newBattle(r);let turns=0;
   while(g.phase==='planning'&&turns++<12){G.autoPlan(g,'tactical');G.simulateRound(g)}
   if(g.phase!=='win')break;
   C.win(r,g);
   // pick a strategic card: favor comparable efficiency; actual draws remain random.
   const candidates=r.pending.choices.map(k=>({k,c:G.CARD[k]}));
   const chosen=candidates.sort((a,b)=>((b.c.damage||0)*b.c.a+(b.c.guard||0)*.55+(b.c.mark||0)*2+(b.c.bleed||0)*2)/G.cLen(b.c)-((a.c.damage||0)*a.c.a+(a.c.guard||0)*.55+(a.c.mark||0)*2+(a.c.bleed||0)*2)/G.cLen(a.c))[0].k;
   const old=C.cardCount(r);C.choose(r,chosen);assert.equal(C.cardCount(r),old+1);rewardCards++;
   const heal=r.shop.findIndex(x=>x.kind==='heal'&&!x.sold&&r.gold>=x.cost);
   const affordable=r.shop.findIndex(x=>x.kind==='card'&&!x.sold&&r.gold>=x.cost);
   if(heal>=0 && r.hp < r.maxHp*.7){C.buy(r,heal);}
   else if(affordable>=0){C.buy(r,affordable);shopCards++;}
   stages++;
   const nxt=C.next(r);if(!nxt){completed++;break;}
  }
 }
 data.push({classId:cls,styleId,fullClear:completed,completedStages:stages,rewardCards,shopCards});
 clears+=completed;avgStages+=stages;earned+=rewardCards;bought+=shopCards;
}
const out={version:'1.6',runs,clears,clearPct:Math.round(clears/runs*100),completedStages:avgStages,rewardCards:earned,shopCards:bought,group:data};
fs.writeFileSync(__dirname+'/../RUN_OPT_V16_RESULTS.json',JSON.stringify(out,null,2));
console.log(out);

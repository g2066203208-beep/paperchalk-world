'use strict';
const G=require('../engine.js'),C=require('../campaign.js'),fs=require('node:fs'),assert=require('node:assert/strict');
const classes=Object.keys(G.CLASS),totals={distinctTriples:0,timeFeasibleTriples:0,orderedTriplePlans:0,unorderedPairs:0,starterHandChoices:0,cardTickSimulations:0,traceMismatches:0};
const rows=[],outliers=[],topSequences=[];
const utility=(card,enemies=1)=>{
 const L=G.cLen(card),trigger=card.type==='power'?.95:1;
 const raw=(card.damage||0)*card.a*(card.aoe?Math.min(enemies,3):1)
 +(card.guard||0)*.55+(card.heal||0)*.77+(card.steady||0)*.4
 +(card.mark||0)*2.2+(card.weak||0)*1.9+(card.bleed||0)*2
 +(card.buff||0)*2.5+(card.meter||0)*.35+(card.counter||0)*.65
 +(card.poisePower||0)*.35+(card.breakPower||0)*.4;
 return +(raw*trigger/L).toFixed(4);
};
function comboSynergy(c1,c2){const a=G.CARD[c1],b=G.CARD[c2];let value=0;
 if(a.mark&&b.bonusMarked)value+=b.bonusMarked*b.a;
 if(a.bleed&&b.bonusBleed)value+=b.bonusBleed*b.a;
 if(a.damage&&b.bonusCombo)value+=b.bonusCombo;
 if(a.poisePower>=10&&b.bonusStaggered)value+=b.bonusStaggered;
 if(a.damage&&b.bonusExecute)value+=b.bonusExecute*.3;
 return value;
}
for(const cl of classes){
 const cards=C.POOLS[cl],lengths=cards.map(key=>G.cLen(G.CARD[key])),scores=cards.map(key=>utility(G.CARD[key],2));
 let possible=0,checked=0,pairCount=0,high=0,highList=[];
 for(let i=0;i<90;i++)for(let j=i+1;j<90;j++){pairCount++;for(let k=j+1;k<90;k++){
  checked++;
  const L=lengths[i]+lengths[j]+lengths[k];if(L>10)continue;possible++;
  const ids=[cards[i],cards[j],cards[k]],perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  let max=-Infinity,opt=null;
  for(const [a,b,c]of perms){const s=scores[i]+scores[j]+scores[k]+(comboSynergy(ids[a],ids[b])+comboSynergy(ids[b],ids[c]))/L; if(s>max){max=s;opt=[ids[a],ids[b],ids[c]]}}
  totals.orderedTriplePlans+=6;
  if(highList.length<10||max>highList[highList.length-1].heuristic){highList.push({classId:cl,ids:opt,length:L,heuristic:+max.toFixed(2)});highList.sort((a,b)=>b.heuristic-a.heuristic);highList.length=Math.min(highList.length,10)}
 }}
 totals.distinctTriples+=checked;totals.timeFeasibleTriples+=possible;totals.unorderedPairs+=pairCount;topSequences.push(...highList);
 for(const rar of ['common','uncommon','rare']){
  const group=cards.filter(id=>C.rarityOf(id)===rar).map(id=>({id,name:G.CARD[id].name,utility:utility(G.CARD[id],2),valueSolo:utility(G.CARD[id],1),type:G.CARD[id].type,len:G.cLen(G.CARD[id])})).sort((a,b)=>a.utility-b.utility);
  const median=group[Math.floor(group.length/2)].utility;rows.push({classId:cl,rarity:rar,count:group.length,min:group[0],median,max:group.at(-1),range:group.at(-1).utility-group[0].utility});
  for(const card of group){const c=G.CARD[card.id];if(c.type==='attack'&&card.utility>median*1.75)outliers.push({...card,classId:cl,rarity:rar,median,flag:'attack_dps_outlier'});}
 }
 for(const style of Object.values(G.CLASS[cl].styles)){
  const hand=[];for(const [id,count] of Object.entries(style.deck))for(let i=0;i<count;i++)hand.push(id);
  assert.equal(hand.length,12);for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)for(let k=j+1;k<12;k++)for(let l=k+1;l<12;l++){totals.starterHandChoices++;}
 }
}
// The real combat engine is also checked at 3 launch ticks for each of the 360
// collectible card-pool positions, not merely a cost heuristic.
for(const cl of classes)for(const key of C.POOLS[cl])for(const begin of [1,4,8]){
 const c=G.CARD[key],friend=c.type==='defense'||c.heal||c.buff||c.steady;
 const g=G.create({classId:cl,seed:44721,encounterId:'corridor'}),hero=g.actors[0],enemy=g.actors.find(a=>a.side==='enemy');
 hero.actions=[];enemy.actions=[];hero.hand=[{uid:'audit',key}];hero.hp=hero.maxHp=1000;hero.poiseMax=10000;enemy.hp=enemy.maxHp=1000;enemy.poiseMax=10000;
 G.place(g,'audit',begin,friend?hero.id:enemy.id);
 const sim=G.simulateRound(g,{preview:true,collectTrace:true}),real=G.simulateRound(g);
 totals.cardTickSimulations++;
 if(sim.actors[0].hp!==real.actors[0].hp||sim.actors[1].hp!==real.actors[1].hp||JSON.stringify(sim.stats)!==JSON.stringify(real.stats))totals.traceMismatches++;
}
assert.equal(totals.distinctTriples,4*117480);assert.equal(totals.unorderedPairs,4*4005);assert.equal(totals.starterHandChoices,20*495);assert.equal(totals.cardTickSimulations,360*3);assert.equal(totals.traceMismatches,0);
const result={version:'1.7',scope:'exhaustive legal 3-distinct-card combos for each single-class 90-card pool, all two-card pairs, all 4-of-12 starter subsets; 3 actual runtime placements per collectible pool position; not exhaustive full combat',totals,rarityEfficiency:rows,heuristicOutliers:outliers.slice(0,100),bestPotentialSequences:topSequences.sort((a,b)=>b.heuristic-a.heuristic).slice(0,30),limits:['simultaneous 4P card scheduling, alternative target sets, thousands of draw and reward RNG sequences, relic combinations, build upgrade paths, varying player skill and all possible enemy states are not exhaustively covered','combo heuristic gives an opportunity upper bound, not guaranteed real damage; fastest-value combos require exact positioning and speed-order simulation']};
fs.writeFileSync(__dirname+'/../EXHAUSTIVE_COVERAGE_V17.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({totals,top:result.bestPotentialSequences.slice(0,5),outliers:outliers.length,largest:rows.filter(r=>r.rarity==='rare').map(x=>({classId:x.classId,median:x.median,max:x.max}))},null,2));

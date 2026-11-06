/* Deterministic, reproducible campaign tests, not a proof of perfect balance. */
const G=require('../engine.js'),C=require('../campaign.js'),fs=require('fs'),path=require('path');
const POLICIES=['damage','survival','balanced','random'];
const COUNT=Number(process.env.RUN_SEEDS||24),MAX_ROUNDS=Number(process.env.RUN_MAX_ROUNDS||15);
function value(key,policy){const c=G.CARD[key],len=G.cLen(c);const d=(c.damage||0)*c.a*(c.aoe?1.45:1)/len,g=(c.guard||0)/len,h=(c.heal||0)/len;return policy==='damage'?d*2+g*.15+h*.05:policy==='survival'?d*.6+g*1.6+h*1.5:d*1.2+g*.8+h*1.2+(c.mark||0)*1.2;}
function shopPolicy(r,policy){for(let i=0;i<r.shop.length;i++){const x=r.shop[i];if(x.kind==='heal'&&r.hp<r.maxHp*(policy==='damage'?.38:.7)&&r.gold>=x.cost)try{C.buy(r,i)}catch{} }
 const relic=r.shop.findIndex(x=>x.kind==='relic'&&r.gold>=x.cost);if(relic>=0&&(policy==='survival'||policy==='balanced'||r.gold>25)){try{C.buy(r,relic)}catch{}}
 const cards=r.shop.map((x,i)=>({...x,i})).filter(x=>x.kind==='card'&&r.gold>=x.cost).sort((x,y)=>value(y.key,policy)-value(x.key,policy));if(cards.length){try{C.buy(r,cards[0].i)}catch{}}
 const upgrades=r.shop.findIndex(x=>x.kind==='upgrade'&&r.gold>=x.cost);const target=Object.keys(r.deck).filter(k=>!k.endsWith('+')).sort((a,b)=>value(b,policy)-value(a,policy))[0];if(upgrades>=0&&target)try{C.buy(r,upgrades,target)}catch{};
}
function simulate(classId,styleId,policy,seed){const run=C.start({classId,styleId,seed,team:true});const stats=[];while(run.stage<5){const game=C.newBattle(run);let rounds=0;while(game.phase==='planning'&&rounds++<MAX_ROUNDS){G.autoPlan(game,policy==='random'?'novice':'tactical');G.simulateRound(game);}
 if(game.phase==='planning'){stats.push({stage:run.stage,result:'timeout',rounds});break;}
 if(game.phase==='lost'){stats.push({stage:run.stage,result:'lost',rounds});break;}
 const e=C.win(run,game);stats.push({stage:run.stage,result:'win',rounds,rank:e.rank,score:e.points,remainingHP:run.hp});const chosen=policy==='random'?e.choices[(seed+run.stage)%3]:e.choices.slice().sort((a,b)=>value(b,policy)-value(a,policy))[0];C.choose(run,chosen);shopPolicy(run,policy);C.next(run);}
 return {won:run.state==='complete',stagesWon:run.completed.length,details:stats,hp:run.hp,deck:C.cardCount(run),relics:run.relics.length,gold:run.gold};
}
const rows=[],byStage={};const started=Date.now();for(const [cl,info]of Object.entries(G.CLASS))for(const styleId of Object.keys(info.styles))for(const policy of POLICIES){const data=[];for(let i=0;i<COUNT;i++)data.push(simulate(cl,styleId,policy,10021+i*733));const group={classId:cl,styleId,policy,samples:COUNT,fullWin:data.filter(x=>x.won).length,avgStages:data.reduce((a,b)=>a+b.stagesWon,0)/COUNT,avgFinalHp:data.reduce((a,b)=>a+b.hp,0)/COUNT,avgDeck:data.reduce((a,b)=>a+b.deck,0)/COUNT,avgRelics:data.reduce((a,b)=>a+b.relics,0)/COUNT};rows.push(group);for(const r of data)for(const d of r.details){const k=[cl,styleId,policy,d.stage].join('/');(byStage[k]??=[]).push(d.result);}}
const summary={version:'0.5',seedCount:COUNT,policies:POLICIES,definition:'solo 5-stage roguelike; AI tactical/novice; no human playtest',simulatedRuns:rows.length*COUNT,encounterResults:Object.fromEntries(Object.entries(byStage).map(([k,v])=>[k,{games:v.length,win:v.filter(x=>x==='win').length,lost:v.filter(x=>x==='lost').length,timeout:v.filter(x=>x==='timeout').length}])),byArchetype:rows,elapsedMs:Date.now()-started};
const fp=path.join(__dirname,'../balance-team-v05.json');fs.writeFileSync(fp,JSON.stringify(summary,null,2));console.log('RUNS',summary.simulatedRuns,'elapsed',summary.elapsedMs);for(const r of rows)console.log(r.classId,r.styleId,r.policy,`fullWin:${r.fullWin}/${r.samples}`,`avgStages:${r.avgStages.toFixed(2)}`);

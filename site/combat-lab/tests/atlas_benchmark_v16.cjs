const fs=require('fs'),G=require('../engine.js'),C=require('../campaign.js');
const rows=[],fights=['corridor','twins','siege','surround','boss'],N=8;
for(const [cl,cls]of Object.entries(G.CLASS))for(const [styleId,style]of Object.entries(cls.styles))for(const team of [false,true]){
 let wins=0,turns=0,damage=0,blocked=0,staggered=0,timedOut=0;
 for(const fight of fights)for(let seed=0;seed<N;seed++){
  const r=C.start({classId:cl,styleId,team,seed:17600+seed*127+fights.indexOf(fight)*811,startEncounter:fight});
  const g=C.newBattle(r);let n=0;while(g.phase==='planning'&&n++<12){G.autoPlan(g,'tactical');G.simulateRound(g)}
  if(g.phase==='win')wins++;else if(g.phase==='planning')timedOut++;
  turns+=g.turns;damage+=g.stats.damage;blocked+=g.stats.blocks;staggered+=g.stats.staggers;
 }
 rows.push({classId:cl,styleId,name:style.name,team,battles:fights.length*N,wins,winRate:Math.round(100*wins/(fights.length*N)),avgTurns:Math.round(100*turns/(fights.length*N))/100,avgDamage:Math.round(damage/(fights.length*N)),avgBlocks:Math.round(blocked/(fights.length*N)),avgStaggers:Math.round(100*staggered/(fights.length*N))/100,timedOut});
}
const result={version:'1.6',method:'fixed-seed tactical auto plan, single isolated battle across five enemy configurations',seedCount:24,styles:20,totalBattles:rows.reduce((a,x)=>a+x.battles,0),rows};
if(process.argv.includes('--json'))fs.writeFileSync(__dirname+'/../BALANCE_V16_RESULTS.json',JSON.stringify(result,null,2));
console.table(rows.map(x=>({class:x.classId,build:x.styleId,team:x.team?'4P':'1P',win:x.winRate,rounds:x.avgTurns,stagger:x.avgStaggers})));
console.log('simulated',result.totalBattles,'battles');

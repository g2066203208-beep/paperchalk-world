const G=require('../engine.js'),C=require('../campaign.js');
const table=[];let total=0;
const fights=['corridor','twins','siege','surround','boss'];
for(const [cls,cd] of Object.entries(G.CLASS))for(const style of Object.keys(cd.styles)){
 for(const team of [false,true])for(const fight of fights){let wins=0,losses=0,timeouts=0,turns=0,hp=0,stagger=0,breaks=0,canceled=0;
 for(let k=0;k<20;k++){
  const g=G.runAuto({classId:cls,styleId:style,encounterId:fight,team,campaignBalance:true,seed:12010+k*97},'tactical',12);
  wins+=g.phase==='win';losses+=g.phase==='lost';timeouts+=g.phase==='timeout';turns+=g.turns;hp+=Math.max(0,g.actors[0].hp)/g.actors[0].maxHp;
  stagger+=g.stats.staggers;breaks+=g.stats.breaks;canceled+=g.stats.canceledActions;total++;
 }
 table.push({classId:cls,style,team,encounter:fight,wins,losses,timeouts,rounds:+(turns/20).toFixed(2),health:+(hp/20).toFixed(2),stagger:stagger/20,breaks:breaks/20,canceled:canceled/20});
 }
 }
console.log('fights',total);
const summary={fights:total,byStyle:[]};
for(const [cls,cd] of Object.entries(G.CLASS))for(const style of Object.keys(cd.styles)){
 const rows=table.filter(x=>x.classId===cls&&x.style===style);const solo=rows.filter(x=>!x.team),team=rows.filter(x=>x.team);
 summary.byStyle.push({cls,style,soloWins:solo.reduce((s,x)=>s+x.wins,0),teamWins:team.reduce((s,x)=>s+x.wins,0),soloTimeouts:solo.reduce((s,x)=>s+x.timeouts,0),teamTimeouts:team.reduce((s,x)=>s+x.timeouts,0),staggerPerBattle:+(rows.reduce((s,x)=>s+x.stagger,0)/rows.length).toFixed(2),meanCancel:+(rows.reduce((s,x)=>s+x.canceled,0)/rows.length).toFixed(2)});
}
console.log(JSON.stringify(summary,null,2));
const fs=require('fs'),path=require('path');fs.writeFileSync(path.resolve(__dirname,'../BALANCE_V15_RESULTS.json'),JSON.stringify({config:{seeds:20,encounters:fights,classes:8,modes:2,roundCap:12},table,summary},null,2)+'\n');
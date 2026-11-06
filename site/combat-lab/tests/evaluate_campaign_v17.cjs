'use strict';
const G=require('../engine.js'),C=require('../campaign.js'),fs=require('node:fs');
const n=Number(process.argv[2]||24),profile=process.argv[3]||'candidate',seedStart=Number(process.argv[4]||70001);
const presets={
 candidate:{healBase:15,healScoreDivisor:10,healMissingFraction:.09,stageHealReduction:1},
 conservative:{healBase:16,healScoreDivisor:10,healMissingFraction:.09,stageHealReduction:1},
 baseline:{healBase:6,healScoreDivisor:15,healMissingFraction:0,stageHealReduction:0},
 generous:{healBase:20,healScoreDivisor:10,healMissingFraction:.1,stageHealReduction:1}
};
if(!presets[profile])throw Error('Unknown profile '+profile);Object.assign(C.RUN_BALANCE,presets[profile]);
function score(key,style){const c=G.CARD[key],len=G.cLen(c);const raw=((c.damage||0)*c.a*(c.aoe?1.7:1)+(c.guard||0)*.52+(c.heal||0)*.82+(c.steady||0)*.38+(c.mark||0)*2+(c.bleed||0)*2.2+(c.poisePower||0)*.33+(c.meter||0)*.30+(c.bonusCombo||0)*1.05+(c.bonusMarked||0)*.92)/len;return raw+(style==='archetype'&&c.archetype?2.2:0)}
function choose(run,mode){if(mode==='novice')return run.pending.choices[0];const list=run.pending.choices.slice();list.sort((a,b)=>score(b,mode)-score(a,mode));return list[0]}
function runOne(classId,styleId,team,seed,mode){const run=C.start({classId,styleId,team,seed}),life=[];let turns=0,stages=0,shopHeal=0,upgrades=0,finishes=0,scoreSum=0;
for(let floor=0;floor<5;floor++){
const game=C.newBattle(run);let num=0;while(game.phase==='planning'&&num++<12){G.autoPlan(game,mode==='novice'?'novice':'tactical');G.simulateRound(game)}turns+=game.turns;
if(game.phase!=='win')break;
C.win(run,game);stages++;life.push(run.hp);scoreSum+=run.lastResult.points;if(game.finisherBy)finishes++;
const card=choose(run,mode);C.choose(run,card);
const healIdx=run.shop.findIndex(x=>x.kind==='heal'&&!x.sold&&run.gold>=x.cost);
if(healIdx>=0 &&run.hp<run.maxHp*(mode==='novice'?.65:.78)){C.buy(run,healIdx);shopHeal++}
else if(mode!=='novice') {const ix=run.shop.findIndex(x=>x.kind==='upgrade'&&!x.sold&&run.gold>=x.cost);if(ix>=0){const arr=Object.keys(run.deck).filter(k=>!k.endsWith('+'));arr.sort((a,b)=>score(b,mode)-score(a,mode));if(arr.length){C.buy(run,ix,arr[0]);upgrades++}}}
if(floor<4)C.next(run);
}
return {clear:stages===5,stages,turns,shopHeal,upgrades,finishes,score:stages?scoreSum/stages:0,life:life.length?life.reduce((x,y)=>x+y,0)/life.length:0};}
const rows=[];for(const [cl,d]of Object.entries(G.CLASS))for(const style of Object.keys(d.styles))for(const team of [false,true])for(const policy of ['tactical','novice']){
const r=[];for(let i=0;i<n;i++){const seed=seedStart+i*311+Object.keys(G.CLASS).indexOf(cl)*5309+Object.keys(d.styles).indexOf(style)*1249;r.push(runOne(cl,style,team,seed,policy))}
const mean=k=>r.reduce((a,b)=>a+b[k],0)/n;
rows.push({classId:cl,styleId:style,team,policy,runs:n,wins:r.reduce((a,b)=>a+Number(b.clear),0),clear:mean('clear'),stages:mean('stages'),turns:mean('turns'),life:mean('life'),score:mean('score'),shopHeal:mean('shopHeal'),upgrades:mean('upgrades'),finishes:mean('finishes')});
}
const summaries=[];for(const team of [false,true])for(const policy of ['tactical','novice']){const subset=rows.filter(x=>x.team===team&&x.policy===policy);const avg=k=>subset.reduce((a,b)=>a+b[k],0)/subset.length;const pct=subset.map(x=>x.clear);summaries.push({team,policy,clear:avg('clear'),stages:avg('stages'),range:[Math.min(...pct),Math.max(...pct)],classRates:Object.fromEntries(Object.keys(G.CLASS).map(cl=>[cl,subset.filter(x=>x.classId===cl).reduce((s,x)=>s+x.clear,0)/5]))});}
const data={version:'1.7',profile,n,seedStart,runs:rows.length*n,parameter:{...C.RUN_BALANCE},summaries,rows};
const outfile=__dirname+'/../BALANCE_CAMPAIGN_V17_'+profile+'_'+seedStart+'.json';fs.writeFileSync(outfile,JSON.stringify(data,null,2));
console.log(JSON.stringify({outfile,n,runs:data.runs,summaries},null,2));

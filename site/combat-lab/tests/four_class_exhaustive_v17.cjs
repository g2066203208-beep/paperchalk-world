// Exhaust all 90^4 one-card-per-class sets in a FIXED ally order.
// A fast algebraic stress proxy, not full 10-tick world simulation.
const fs=require('node:fs'),G=require('../engine.js'),C=require('../campaign.js');
const keys=['axe','gun','guard','mage'],pool=keys.map(k=>C.POOLS[k]);
const util=c=>{const L=G.cLen(c);return ((c.damage||0)*c.a*(c.aoe?1.6:1)+(c.guard||0)*.55+(c.heal||0)*.7+(c.mark||0)*2.2+(c.bleed||0)*1.5+(c.poisePower||0)*.35+(c.buff||0)*2.5+(c.meter||0)*.25)/L};
const vals=pool.map(set=>set.map(id=>util(G.CARD[id]))),pair=[];
function syn(a,b){return (a.mark&&b.bonusMarked?b.bonusMarked*b.a:0)+(a.bleed&&b.bonusBleed?b.bonusBleed*b.a:0)+(a.damage&&b.bonusCombo?b.bonusCombo:0)+(a.poisePower>=10&&b.bonusStaggered?b.bonusStaggered:0)}
for(let x=0;x<3;x++){const matrix=[];for(let a=0;a<90;a++){const line=new Float64Array(90);for(let b=0;b<90;b++)line[b]=syn(G.CARD[pool[x][a]],G.CARD[pool[x+1][b]])*.3;matrix.push(line)}pair.push(matrix)}
let count=0,best=-1,bestIds=[],above=0;
for(let a=0;a<90;a++)for(let b=0;b<90;b++){const ab=vals[0][a]+vals[1][b]+pair[0][a][b];for(let c=0;c<90;c++){const abc=ab+vals[2][c]+pair[1][b][c];for(let d=0;d<90;d++){const score=abc+vals[3][d]+pair[2][c][d];count++;if(score>40)above++;if(score>best){best=score;bestIds=[pool[0][a],pool[1][b],pool[2][c],pool[3][d]]}}}}
if(count!==65610000)throw Error('not exhaustive: '+count);const result={version:'1.7',scope:'one card from each 90-card class pool, fixed class order axe/gun/guard/mage, no draw order/slots/relics/targets/timing simulation',combinations:count,bestProxy:+best.toFixed(4),maxProxyCardIds:bestIds,aboveProxy40:above,note:'Upper-bound potential only. Some cards cannot simultaneously target the same actor, and game timing can prevent proposed combos; do not treat this as a true win-rate or metagame balance guarantee.'};fs.writeFileSync(__dirname+'/../CROSS_CLASS_65M_V17.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

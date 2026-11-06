/* Paperchalk Timegrid Roguelike v0.5: deterministic run progression + rewards + shop. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.Timegrid);if(typeof module==='object'&&module.exports)module.exports=api;root.TimegridRun=api;})(typeof globalThis!=='undefined'?globalThis:this,function(G){'use strict';
const REWARDS={C:{common:92,uncommon:8,rare:0},B:{common:76,uncommon:24,rare:0},A:{common:52,uncommon:43,rare:5},S:{common:32,uncommon:53,rare:15},SS:{common:18,uncommon:49,rare:33}};
const RANK_GOLD={C:0,B:2,A:5,S:8,SS:12};
const STAGES=['corridor','twins','siege','surround','boss'];
const RARITY={
 reversal:'uncommon',cut:'common',slash:'common',stance:'common',feint:'common',sidestep:'common',heavy:'uncommon',cleave:'uncommon',whirl:'uncommon',brace:'uncommon',sweep:'rare',
 respite:'uncommon',shot:'common',bulletguard:'common',cover:'common',focus:'uncommon',burst:'uncommon',suppress:'uncommon',aim:'rare',buckshot:'rare',
 steady:'common',jab:'common',bash:'common',guardwall:'common',rally:'common',counter:'uncommon',smash:'uncommon',shockwave:'rare',
 pulse:'common',steady:'common',ward:'common',remedy:'common',seal:'uncommon',rupture:'uncommon',echo:'uncommon',trance:'rare',nova:'rare'
};
const POOLS={
 axe:['cut','slash','stance','feint','sidestep','heavy','cleave','whirl','brace','sweep','reversal'],
 gun:['shot','sidestep','bulletguard','cover','focus','burst','suppress','aim','buckshot','respite'],
 guard:['jab','bash','guardwall','rally','counter','smash','shockwave','sidestep','steady'],
 mage:['pulse','ward','remedy','seal','rupture','echo','trance','nova','sidestep','steady']
};
const RELICS={
 guard_plus:{name:'守夜徽章',text:'所有防御牌的共享格挡值 +4',cost:17},
 attack_plus:{name:'锈红吊坠',text:'每次攻击生效格伤害 +2',cost:19},
 break_plus:{name:'碎甲刻印',text:'每次命中增加2破防压力（仅有防御时）',cost:16},
 calm_bell:{name:'回响怀表',text:'角色每次主动格挡后额外降低3点硬直积累',cost:17},
 poise_strike:{name:'裂隙骨针',text:'攻击命中时额外造成2点硬直压力（仍受抗失稳保护）',cost:19},
 extra_hand:{name:'整理背包',text:'每次换手和新回合的手牌上限 +1',cost:18},
 round_regen:{name:'暖茶瓶',text:'每回合开始回复2生命',cost:18},
 meter_regen:{name:'旧电池',text:'每回合开始绝杀能量 +5',cost:18}
};
const rarityWeight={common:1,uncommon:2,rare:3};
function rng(run){run.random=(Math.imul(run.random,1664525)+1013904223)>>>0;return run.random/4294967296;}
function takeRandom(run,items){return items[Math.floor(rng(run)*items.length)];}
function rarity(run,rank,cap='rare'){
 const ranks=['common','uncommon','rare'],weights={...REWARDS[rank]};for(let i=ranks.indexOf(cap)+1;i<3;i++)weights[ranks[i]]=0;
 let n=rng(run)*100;for(const key of ranks){n-=weights[key]||0;if(n<0)return key;}return cap;
}
function copyDeck(obj){return Object.fromEntries(Object.entries(obj).filter(([k,n])=>n>0).map(([k,n])=>[k,n]));}
function start({classId='axe',styleId='strike',team=false,seed=34193,startEncounter='corridor'}={}){
 if(!G.CLASS[classId])throw Error('未知职业');const chosen=G.CLASS[classId].styles[styleId]||Object.values(G.CLASS[classId].styles)[0],index=Math.max(0,STAGES.indexOf(startEncounter));
 return{version:'0.5',classId,styleId:Object.keys(G.CLASS[classId].styles).find(k=>G.CLASS[classId].styles[k]===chosen),team,seed,random:seed>>>0,deck:copyDeck(chosen.deck),maxHp:G.CLASS[classId].hp,hp:G.CLASS[classId].hp,energy:60,gold:0,relics:[],stage:index,completed:[],pending:null,shop:[],rerolls:0,state:'fight',lastResult:null};
}
function newBattle(run){if(run.stage>=STAGES.length)throw Error('肉鸽通关');run.state='fight';return G.create({classId:run.classId,styleId:run.styleId,encounterId:STAGES[run.stage],seed:(run.seed+run.stage*9127)>>>0,team:run.team,demoEnergy:run.energy,deckSpec:run.deck,maxHp:run.maxHp,heroHp:run.hp,relics:run.relics,campaignBalance:true});}
function weightedCard(run,rank,excluded=new Set(),pool=POOLS[run.classId]){
 const candidates=pool.filter(k=>!excluded.has(k));if(!candidates.length)throw Error('奖励池无可选牌');
 const cap=run.stage===0?'uncommon':'rare';let rar=rarity(run,rank,cap);
 for(let attempt=0;attempt<3;attempt++){const matching=candidates.filter(k=>RARITY[k]===rar);if(matching.length)return takeRandom(run,matching);rar=rar==='rare'?'uncommon':rar==='uncommon'?'common':'rare';}
 return takeRandom(run,candidates);
}
function cardReward(run,rank,count=3){const excluded=new Set(),choices=[];for(let i=0;i<count;i++){let key=weightedCard(run,rank,excluded);excluded.add(key);choices.push(key);}return choices;}
function win(run,game){if(game.phase!=='win')throw Error('战斗尚未胜利');if(run.state!=='fight')throw Error('战斗已经结算');const hero=game.actors.find(a=>a.id==='hero'),s=game.score||G.scoreResult(game),fin=game.finisherBy===hero.id;
 run.energy=hero.energy;run.hp=Math.max(1,hero.hp);const award=10+run.stage*3+RANK_GOLD[s.rank]+(fin?4:0);run.gold+=award;
 const recover=Math.min(run.maxHp-run.hp,6+Math.floor(s.points/15));run.hp+=recover;
 const choices=cardReward(run,s.rank,3);run.pending={rank:s.rank,points:s.points,choices,bonusGold:award,recover,finisher:fin};run.lastResult={...s,award,recover,choices};run.completed.push({stage:run.stage,rank:s.rank,score:s.points,bonusGold:award,recover,finisher:fin});run.state='reward';return run.pending;
}
function choose(run,key){if(run.state!=='reward')throw Error('没有可选奖励');if(key!==null&&!run.pending.choices.includes(key))throw Error('无效奖励牌');if(key)run.deck[key]=(run.deck[key]||0)+1;else run.gold+=2;run.pending.chosen=key;run.state='shop';generateShop(run);return run;}
function generateShop(run){const used=new Set(),cardPool=POOLS[run.classId],availableRelic=Object.keys(RELICS).filter(x=>!run.relics.includes(x));let offers=[];
 for(let i=0;i<3;i++){let key=takeRandom(run,cardPool.filter(k=>!used.has(k)));used.add(key);offers.push({kind:'card',key,name:G.CARD[key].name,description:G.CARD[key].desc||'',cost:RARITY[key]==='rare'?15:RARITY[key]==='uncommon'?10:6,rarity:RARITY[key],sold:false});}
 if(availableRelic.length){const rel=takeRandom(run,availableRelic);offers.push({kind:'relic',key:rel,name:RELICS[rel].name,description:RELICS[rel].text,cost:RELICS[rel].cost,sold:false});}
 offers.push({kind:'heal',key:'heal',name:'急救绷带',description:'立即恢复18点生命（不超过上限）',cost:8,sold:false});
 offers.push({kind:'upgrade',key:'upgrade',name:'磨砺卡牌',description:'选择1张非升级卡永久提升效能',cost:12,sold:false});
 offers.push({kind:'remove',key:'remove',name:'清理废牌',description:'从牌组永久移除1张牌',cost:10,sold:false});
 run.shop=offers;return offers;
}
function upgradeKey(key){if(key.endsWith('+'))return key;const original=G.CARD[key];if(!original||original.type==='finisher'||original.type==='system')throw Error('这张牌不能升级');const newKey=key+'+';if(!G.CARD[newKey]){const c={...original,name:original.name+' ＋',desc:original.desc+' · 已强化'};if(c.damage)c.damage+=Math.max(2,Math.ceil(c.damage*.23));if(c.guard)c.guard+=Math.max(3,Math.ceil(c.guard*.24));if(c.heal)c.heal+=3;if(c.mark)c.mark+=1;if(c.breakPower)c.breakPower+=2;if(c.weak)c.weak+=1;if(c.counter)c.counter+=2;G.CARD[newKey]=c;RARITY[newKey]=RARITY[key];}return newKey;}
function buy(run,index,target=null){if(run.state!=='shop')throw Error('只有商店阶段能购买');const item=run.shop[index];if(!item||item.sold)throw Error('商品已经卖出');if(run.gold<item.cost)throw Error('金币不足');
 if(item.kind==='relic'&&run.relics.length>=4)throw Error('遗物最多4件');
 if(item.kind==='upgrade'&&(!target||!run.deck[target]||target.endsWith('+')))throw Error('请选择可升级的普通卡');
 if(item.kind==='remove'&&(!target||!run.deck[target]||Object.values(run.deck).reduce((a,b)=>a+b,0)<=7))throw Error('不能删除：牌库最低保留7张');
 if(item.kind==='heal'&&run.hp>=run.maxHp)throw Error('生命已满');
 run.gold-=item.cost;item.sold=true;
 if(item.kind==='card')run.deck[item.key]=(run.deck[item.key]||0)+1;
 if(item.kind==='relic'){run.relics.push(item.key);if(item.key==='extra_hand'){} }
 if(item.kind==='heal')run.hp=Math.min(run.maxHp,run.hp+18);
 if(item.kind==='upgrade'){const k=upgradeKey(target);run.deck[target]--;if(!run.deck[target])delete run.deck[target];run.deck[k]=(run.deck[k]||0)+1;}
 if(item.kind==='remove'){run.deck[target]--;if(!run.deck[target])delete run.deck[target];}
 return item;
}
function reroll(run){if(run.state!=='shop')throw Error('只有商店阶段可刷新');const cost=3+run.rerolls*2;if(run.gold<cost)throw Error('金币不足');run.gold-=cost;run.rerolls++;const old=run.shop.filter(x=>!x.sold&&x.kind==='card');const used=new Set();for(const item of old){const pool=POOLS[run.classId].filter(k=>!used.has(k));const key=takeRandom(run,pool);used.add(key);item.key=key;item.name=G.CARD[key].name;item.description=G.CARD[key].desc||'';item.rarity=RARITY[key];item.cost=RARITY[key]==='rare'?15:RARITY[key]==='uncommon'?10:6;}return run.shop;}
function next(run){if(run.state!=='shop')throw Error('先完成奖励结算');run.stage++;run.rerolls=0;run.shop=[];run.pending=null;if(run.stage>=STAGES.length){run.state='complete';return null;}return newBattle(run);}
function rarityOf(key){return RARITY[key.replace(/\+$/,'')]||'common';}
function cardCount(run){return Object.values(run.deck).reduce((a,b)=>a+b,0);}
return{STAGES,REWARDS,RANK_GOLD,RARITY,POOLS,RELICS,rarityOf,cardCount,start,newBattle,win,choose,generateShop,buy,reroll,next,upgradeKey,cardReward};
});
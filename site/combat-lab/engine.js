/* Paperchalk World: Timegrid Combat Engine v0.4 — browser + Node, deterministic seed. */
(function(root,factory){const result=factory();if(typeof module==='object'&&module.exports)module.exports=result;root.Timegrid=result;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ROUND=10,HAND=4,SHUFFLE_EMPTY=1,SHUFFLE_FORCED=2,BREAK_TICKS=3,FAINT_TICKS=6,STAGGER_TICKS=2,POISE_DECAY=4,POISE_GRACE=2,FINISHER_NEED=100;
const BALANCE={soloEnemyHp:0.78,soloEnemyDamage:0.55,teamEnemyHp:2.72,teamEnemyDamage:1.4};
// Distinct presets keep solo viable without making 4v4 trivial. These are V1.5
// benchmark parameters, not a claim of final human-tested balance.
const ENCOUNTER_SCALING={
 solo:{corridor:{hp:1.00,damage:.78,cap:1},twins:{hp:1.28,damage:.92,cap:2},siege:{hp:1.21,damage:.89,cap:2},surround:{hp:1.26,damage:.93,cap:2},boss:{hp:.98,damage:.78,cap:1}},
 team:{corridor:{hp:3.0,damage:1.5},twins:{hp:3.25,damage:1.65},siege:{hp:3.6,damage:1.72},surround:{hp:2.85,damage:1.5},boss:{hp:3.50,damage:1.85}}
};
const COLORS={attack:'#d45c62',defense:'#4e95cc',skill:'#4aae99',power:'#9a75c4',special:'#d79b53',finisher:'#e6b968',system:'#81909e'};
const CARD={
 sweep:{name:'长斧横扫·全体',type:'attack',w:1,a:1,r:2,damage:9,aoe:true,charge:10,desc:'全体敌人各9伤害，较长后摇'},
 buckshot:{name:'散射·全体',type:'attack',w:1,a:1,r:2,damage:9,aoe:true,charge:10,desc:'全体敌人各9伤害'},
 shockwave:{name:'盾墙震荡·全体',type:'attack',w:2,a:1,r:2,damage:8,aoe:true,breakPower:2,charge:12,desc:'全体敌人各8伤害，追加2破防压力'},
 nova:{name:'群星共振·全体',type:'attack',w:1,a:2,r:2,damage:6,aoe:true,charge:6,desc:'全体敌人连续2格各5伤害'},
 cut:{name:'快速斩击',type:'attack',w:0,a:1,r:1,damage:8,charge:9,desc:'即刻伤害，后摇1'},
 slash:{name:'斧柄横扫',type:'attack',w:1,a:1,r:1,damage:12,charge:12,desc:'12伤害，前后摇各1'},
 heavy:{name:'破甲重斩',type:'attack',w:2,a:1,r:1,damage:20,charge:17,pierce:3,desc:'重伤害，穿透3防御'},
 whirl:{name:'连续回旋',type:'attack',w:1,a:3,r:1,damage:6,charge:5,desc:'连续3格、每格6伤害'},
 cleave:{name:'裂地猛击',type:'attack',w:2,a:1,r:1,damage:13,charge:15,breakPower:5,desc:'对防御额外5破防压力'},
 stance:{name:'举斧格挡',type:'defense',w:0,a:3,r:0,guard:13,charge:9,desc:'持续3格，共享13防御值'},
 brace:{name:'谨慎防御',type:'defense',w:0,a:3,r:1,guard:16,charge:9,desc:'持续3格，16防御值'},
 sidestep:{name:'侧身闪避',type:'defense',w:0,a:1,r:1,dodge:true,charge:9,desc:'生效格免疫伤害，后摇1'},
 feint:{name:'佯攻',type:'skill',w:0,a:1,r:1,damage:4,mark:2,charge:8,desc:'4伤害，目标获得2层标记'},
 shot:{name:'快速点射',type:'attack',w:0,a:1,r:1,damage:10,charge:9,desc:'行动快速，1格生效'},
 burst:{name:'三连射',type:'attack',w:1,a:3,r:1,damage:7,charge:5,desc:'连续3格各7伤害'},
 aim:{name:'精确狙击',type:'attack',w:2,a:1,r:1,damage:22,charge:17,pierce:2,desc:'蓄力2格的高伤射击'},
 focus:{name:'目标标记',type:'skill',w:0,a:1,r:1,mark:3,charge:10,desc:'目标获得3层标记，下次受击+3'},
 cover:{name:'烟幕掩护',type:'defense',w:0,a:3,r:1,guard:14,charge:10,desc:'持续3格，共享14防御'},
 bulletguard:{name:'紧急掩体',type:'defense',w:0,a:2,r:0,guard:13,charge:8,desc:'立即掩护2格'},
 suppress:{name:'压制射击',type:'attack',w:1,a:2,r:1,damage:6,breakPower:3,charge:7,desc:'连续2格打击防御'},
 bash:{name:'盾击',type:'attack',w:1,a:1,r:1,damage:13,breakPower:4,charge:12,desc:'更擅长打破敌人防御'},
 guardwall:{name:'坚固防线',type:'defense',w:0,a:4,r:1,guard:16,charge:12,desc:'持续4格，共享16防御值'},
 counter:{name:'反击架势',type:'defense',w:0,a:3,r:1,guard:12,counter:6,charge:11,desc:'格挡成功反击6伤害'},
 smash:{name:'盾墙冲击',type:'attack',w:2,a:1,r:1,damage:18,breakPower:5,charge:16,desc:'蓄力盾击与破防'},
 rally:{name:'恢复呼吸',type:'skill',w:0,a:1,r:1,heal:7,charge:7,desc:'立即回复7生命'},
 jab:{name:'短距离刺击',type:'attack',w:0,a:1,r:1,damage:8,charge:8,desc:'轻快出手'},
 pulse:{name:'异象冲击',type:'attack',w:1,a:1,r:1,damage:15,charge:12,desc:'单次灵能冲击'},
 echo:{name:'共振波',type:'attack',w:1,a:3,r:1,damage:8,charge:5,desc:'持续三格的波动'},
 rupture:{name:'失衡术',type:'skill',w:1,a:1,r:1,damage:14,breakPower:8,charge:14,desc:'对防御造成额外8压力'},
 remedy:{name:'应急治疗',type:'skill',w:0,a:1,r:1,heal:7,charge:9,desc:'回复7生命'},
 seal:{name:'弱化咒印',type:'skill',w:0,a:1,r:1,weak:2,charge:10,desc:'目标接下来2次攻击各-3'},
 ward:{name:'薄暮防护',type:'defense',w:0,a:3,r:0,guard:14,charge:9,desc:'立刻防御，持续3格'},
 trance:{name:'精神凝聚',type:'power',w:1,a:1,r:1,buff:3,charge:12,desc:'随后攻击伤害+3，持续2次'},
 fin_axe:{name:'断月·绝杀',type:'finisher',w:2,a:1,r:2,damage:27,charge:0,condition:'enemyHp',desc:'要求能量100，攻击27，绝杀收尾高评分'},
 fin_gun:{name:'瞬影·绝杀',type:'finisher',w:1,a:2,r:1,damage:14,charge:0,desc:'连续2格各14伤害'},
 fin_guard:{name:'壁垒·绝杀',type:'finisher',w:1,a:1,r:2,damage:28,charge:0,desc:'重盾击28伤害'},
 fin_mage:{name:'静默·绝杀',type:'finisher',w:1,a:2,r:2,damage:14,charge:0,desc:'连续2格各14伤害'},
 e_claw:{name:'爪击',type:'attack',w:1,a:1,r:1,damage:8},
 e_double:{name:'撕咬连段',type:'attack',w:1,a:2,r:1,damage:5},
 e_lunge:{name:'突袭',type:'attack',w:2,a:1,r:1,damage:13},
 e_hide:{name:'外壳防御',type:'defense',w:0,a:3,r:1,guard:13},
 e_mantle:{name:'坚壳防线',type:'defense',w:0,a:3,r:1,guard:18},
 e_smash:{name:'碾压',type:'attack',w:2,a:1,r:2,damage:16},
 e_nail:{name:'痛击',type:'attack',w:1,a:1,r:1,damage:10},
 e_roar:{name:'异变咆哮',type:'attack',w:2,a:2,r:1,damage:8},
 e_guard:{name:'邪壳防护',type:'defense',w:0,a:3,r:1,guard:19},
 e_wound:{name:'虚空噬咬',type:'attack',w:1,a:2,r:1,damage:9},
 e_shock:{name:'晕厥冲击',type:'skill',w:2,a:1,r:1,damage:7,faint:6},
};
// The stun meter is independent of guard. Guard penetration can also create
// poise pressure, but a successful dodge creates no contact.
for(const [id,pressure] of Object.entries({
  cut:2,slash:4,heavy:8,whirl:3,cleave:7,sweep:4,
  shot:2,burst:2,aim:7,suppress:5,buckshot:3,
  jab:2,bash:7,smash:9,shockwave:7,
  pulse:4,echo:3,rupture:11,nova:3,
  e_claw:3,e_double:2,e_lunge:7,e_smash:9,e_nail:5,e_roar:3,e_wound:4,e_shock:7
}))CARD[id].poisePower=pressure;
CARD.steady={name:'稳固呼吸',type:'skill',w:0,a:1,r:1,steady:14,charge:7,
  desc:'给友方降低14点硬直积累；对失稳后的队友也可提供支援'};
CARD.reversal={name:'断势冲击',type:'attack',w:1,a:1,r:1,damage:8,poisePower:10,charge:8,
  desc:'8伤害与10点额外硬直压迫，适合配合队友打出失稳窗口'};
CARD.respite={name:'回稳屏障',type:'defense',w:0,a:2,r:1,guard:11,steady:6,charge:8,
  desc:'2格防御11点，进入作用格时降低目标6点硬直积累'};
const CLASS={
 axe:{name:'女主 · 斧卫',icon:'🪓',hp:77,fin:'fin_axe',styles:{
  strike:{name:'裂甲猛攻',description:'慢速重击、主动打穿防御',deck:{cut:2,slash:2,heavy:2,cleave:1,sweep:1,stance:1,feint:1,sidestep:1,reversal:1}},
  tempo:{name:'回旋连击',description:'多段攻击与快速衔接',deck:{cut:3,slash:1,whirl:2,heavy:1,sweep:1,stance:2,feint:1,sidestep:1}}
 }},
 gun:{name:'女二 · 枪手',icon:'🔫',hp:77,fin:'fin_gun',styles:{
  tempo:{name:'快速连射',description:'低前摇与持续射击',deck:{shot:3,burst:2,aim:1,focus:1,buckshot:1,cover:1,bulletguard:1,sidestep:1,respite:1}},
  precision:{name:'精准狙击',description:'标记与蓄力狙击',deck:{shot:2,aim:2,focus:2,suppress:1,buckshot:1,cover:1,bulletguard:1,sidestep:1,respite:1}}
 }},
 guard:{name:'男主 · 守护',icon:'🛡️',hp:74,fin:'fin_guard',styles:{
  fortress:{name:'反击铁壁',description:'厚实格挡与反击',deck:{jab:2,bash:2,guardwall:2,counter:2,smash:2,shockwave:1,steady:1}},
  crush:{name:'破势护卫',description:'盾击破防与稳健推进',deck:{jab:2,bash:3,smash:2,guardwall:2,counter:1,shockwave:1,steady:1}}
 }},
 mage:{name:'女三 · 调律',icon:'✦',hp:71,fin:'fin_mage',styles:{
  control:{name:'失衡调律',description:'控制防御与弱化敌人',deck:{pulse:2,rupture:2,echo:1,seal:2,ward:2,nova:1,remedy:1,steady:1}},
  sustain:{name:'共振支援',description:'持续伤害与回复',deck:{pulse:1,echo:3,rupture:1,seal:1,ward:2,nova:1,remedy:2,trance:1}}
 }}
};
// Same-tick initiative: higher speed resolves first; ties share a damage batch.
// Speed affects order, never the number of occupied timeline ticks.
const SPEED={default:6,quick:9,focused:8,heavy:4};
for(const [key,card] of Object.entries(CARD)){
  card.speed=card.speed??(card.type==='defense'?8:card.w===0?9:card.w===1?6:4);
}
CARD.focus.speed=10; CARD.feint.speed=9; CARD.shot.speed=10;
CARD.fin_axe.speed=5;CARD.fin_gun.speed=9;CARD.fin_guard.speed=5;CARD.fin_mage.speed=7;
const ENCOUNTERS={
 corridor:{name:'走廊袭击 · 基础',difficulty:1,enemies:[{id:'stalker',name:'走廊追猎者',hp:65,patterns:[['e_claw',4],['e_double',8]],rotation:[['e_lunge',5],['e_claw',9]],guardPeriod:3}]},
 twins:{name:'双影围攻 · 标准',difficulty:2,enemies:[{id:'stalker1',name:'潜行体',hp:47,patterns:[['e_claw',4],['e_double',8]],rotation:[['e_double',3],['e_claw',8]]},{id:'armor',name:'甲壳异变体',hp:60,patterns:[['e_hide',2],['e_nail',7]],rotation:[['e_mantle',3],['e_smash',8]]}]},
 siege:{name:'三重围猎 · 困难',difficulty:3,enemies:[{id:'stalker1',name:'扑杀体',hp:48,patterns:[['e_double',4],['e_lunge',9]],rotation:[['e_claw',5],['e_double',8]]},{id:'armor',name:'重甲异变体',hp:62,patterns:[['e_mantle',3],['e_nail',8]],rotation:[['e_hide',2],['e_smash',8]]},{id:'stalker2',name:'潜影体',hp:42,patterns:[['e_claw',5],['e_double',9]],rotation:[['e_double',4],['e_lunge',9]]}]},
  surround:{name:'四影围城 · 团队极限',difficulty:5,enemies:[{id:'s1',name:'裂爪体',hp:42,patterns:[['e_claw',4],['e_double',9]],rotation:[['e_double',4],['e_lunge',9]]},{id:'s2',name:'破门异变体',hp:49,patterns:[['e_hide',2],['e_nail',7]],rotation:[['e_mantle',3],['e_claw',9]]},{id:'s3',name:'潜影蠕行体',hp:39,patterns:[['e_double',5],['e_claw',9]],rotation:[['e_claw',4],['e_double',8]]},{id:'s4',name:'夜雾吞噬体',hp:52,patterns:[['e_guard',2],['e_wound',8]],rotation:[['e_lunge',6],['e_claw',10]]}]},
 boss:{name:'深夜首领 · Boss',difficulty:4,enemies:[{id:'boss',name:'黑雾主宰',hp:150,patterns:[['e_guard',2],['e_roar',7]],rotation:[['e_wound',5],['e_shock',9]],guardPeriod:2},{id:'minor',name:'雾中残影',hp:46,patterns:[['e_claw',5],['e_double',9]],rotation:[['e_lunge',6]]}]}
};
function rng(seed){let n=(seed>>>0)||1;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function shuffle(array,rand){for(let i=array.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[array[i],array[j]]=[array[j],array[i]];}return array;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function cLen(c){return c.w+c.a+c.r;}
function phase(card,start,t){const i=t-start;if(i<0||i>=cLen(card))return null;return i<card.w?'windup':i<card.w+card.a?'active':'recovery';}
function makeActor(id,side,name,hp,fin){
  const poiseMax=side==='enemy'?Math.max(24,Math.min(42,Math.round(hp*.36))):id.includes('guard')?36:id.includes('mage')?24:id.includes('gun')?26:30;
  return{id,side,name,hp,maxHp:hp,relics:[],fin,energy:0,dead:false,stunUntil:0,
    poise:0,poiseMax,poiseImmuneUntil:0,lastPoiseHit:-1,staggerCount:0,
    marked:0,weak:0,bleed:0,lastHitTick:-10,lastHitBy:null,buff:0,buffHits:0,breaks:0,damageDealt:0,damageTaken:0,blocked:0,kills:0,
    actions:[],hand:[],draw:[],discard:[],exhaust:[],lockedUntil:-1};
}
function addDeck(actor,def,rand){let uid=0;for(const [card,n]of Object.entries(def))for(let i=0;i<n;i++)actor.draw.push({uid:actor.id+'-c'+(uid++),key:card});shuffle(actor.draw,rand);}
function drawHand(actor,rand){const limit=HAND+(actor.relics?.includes('extra_hand')?1:0);while(actor.hand.length<limit){if(!actor.draw.length){if(!actor.discard.length)break;actor.draw=shuffle(actor.discard.splice(0),rand);}actor.hand.push(actor.draw.pop());}}
function create(opts={}){const options={classId:opts.classId||'axe',styleId:opts.styleId||'strike',encounterId:opts.encounterId||'corridor',team:!!opts.team,seed:opts.seed===undefined?86420:opts.seed,campaignBalance:!!opts.campaignBalance,controlAllies:!!opts.controlAllies,
partySize:Number.isInteger(opts.partySize)?Math.max(1,Math.min(4,opts.partySize)):null,
enemySize:Number.isInteger(opts.enemySize)?Math.max(1,Math.min(4,opts.enemySize)):null};const rand=rng(options.seed);
let cd=CLASS[options.classId],style=cd.styles[options.styleId]||Object.values(cd.styles)[0],actors=[];
const main=makeActor('hero','ally',cd.name,opts.maxHp||cd.hp,cd.fin);main.hp=Math.max(1,Math.min(main.maxHp,opts.heroHp||main.maxHp));main.energy=opts.demoEnergy===undefined?55:opts.demoEnergy;main.relics=(opts.relics||[]).slice();if(opts.deckSpec){addDeck(main,opts.deckSpec,rand);}else addDeck(main,style.deck,rand);drawHand(main,rand);actors.push(main);
if(options.team){for(const key of Object.keys(CLASS).filter(x=>x!==options.classId).slice(0,options.partySize===null?3:Math.max(0,options.partySize-1))){const c=CLASS[key];let a=makeActor('ai-'+key,'ally',c.name,c.hp,c.fin);const st=Object.values(c.styles)[0];addDeck(a,st.deck,rand);drawHand(a,rand);actors.push(a);}}
let encounterEnemies=ENCOUNTERS[options.encounterId].enemies;
const tier=ENCOUNTER_SCALING[options.team?'team':'solo'][options.encounterId];
if(options.campaignBalance&&!options.team)encounterEnemies=encounterEnemies.slice(0,tier.cap||2);
// Explicit optical tabletop party sizes are opt-in; legacy 4v4 callers stay unchanged.
if(options.enemySize!==null)encounterEnemies=encounterEnemies.slice(0,options.enemySize);
for(const en of encounterEnemies){
 const hpMultiplier=options.campaignBalance?tier.hp:(options.team?1.7:1);
 const a=makeActor('enemy-'+en.id,'enemy',en.name,Math.round(en.hp*hpMultiplier),null);
 a.pattern=en;a.enemyDamageScale=options.campaignBalance?tier.damage:1;actors.push(a);
}
const game={options,controlledId:'hero',round:0,now:0,phase:'planning',actors,log:[],events:[],winner:null,finisherBy:null,score:null,turns:0,stats:{shuffle:0,attacks:0,blocks:0,breaks:0,staggers:0,faints:0,canceledActions:0,damage:0,heal:0,playerHit:0,finishers:0},nextUid:0,randState:options.seed>>>0};
// Persist deterministic RNG state through an explicit incrementing generator (not Math.random).
prepareRound(game);return game;
}
function gameRand(game){game.randState=(Math.imul(game.randState,1664525)+1013904223)>>>0;return game.randState/4294967296;}
function drawGame(actor,game){return drawHand(actor,()=>gameRand(game));}
function actorsOf(game,side){return game.actors.filter(a=>a.side===side&&!a.dead);}
// Opt-in four-hero 3D battle controller. Legacy combat-lab remains hero-only.
function player(game){return game.options?.controlAllies?game.actors.find(a=>a.id===game.controlledId&&a.side==='ally')||game.actors[0]:game.actors[0];}
function setControlled(game,id){if(!game.options?.controlAllies&&id!=='hero')throw Error('本模式只能控制主角');const actor=game.actors.find(a=>a.id===id&&a.side==='ally');if(!actor)throw Error('无效我方角色');game.controlledId=id;return actor;}
function isBusy(actor,start,end,ex=null){if(start<actor.stunUntil)return true;return actor.actions.some(a=>!a.canceled&&a!==ex&&a.start<end&&a.start+cLen(CARD[a.card])>start);}
function scheduleAction(game,actor,card,start,target,source,locked=false,uid=null){const c=CARD[card];if(!c)throw Error('Unknown card '+card);if(start<game.now||start>=game.now+ROUND)throw Error('此回合只能从当前10格内开始');const end=start+cLen(c);if(isBusy(actor,start,end))throw Error('该角色时间格被占用');const already=actor.actions.filter(a=>!a.canceled&&a.start>=game.now&&a.start<game.now+ROUND);
if(end>game.now+ROUND&&already.some(a=>a.start>start))throw Error('跨回合的必须是最右端动作');
if(already.some(a=>a.start+cLen(CARD[a.card])>game.now+ROUND&&a.start<start))throw Error('跨界动作后不能再安排新卡');
const action={id:'a'+(++game.nextUid),card,start,target,source,locked,uid,guardLeft:(c.guard||0)+(c.guard&&actor.side==='ally'&&actor.relics?.includes('guard_plus')?4:0),canceled:false,started:false,done:false};actor.actions.push(action);actor.actions.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));return action;}
function place(game,uid,startRelative,targetId){if(game.phase!=='planning')throw Error('不是规划阶段');const a=player(game);if(a.dead||a.stunUntil>game.now+startRelative)throw Error('角色失能');if(!Number.isInteger(startRelative)||startRelative<1||startRelative>10)throw Error('请选择T1～T10');const ix=a.hand.findIndex(c=>c.uid===uid);if(ix<0)throw Error('手牌未找到');const card=a.hand[ix],c=CARD[card.key];const start=game.now+startRelative-1;/* 洗牌只锁已放动作，不锁时间格；新牌能倒填任何空格。洗牌耗时是真实成本。 */if(!c)throw Error('无效卡牌');if(c.type==='finisher')throw Error('绝杀为单独槽位');const friend=!!(c.type==='defense'||c.heal||c.buff||c.steady);const dest=targetId||(friend?a.id:actorsOf(game,'enemy')[0]?.id);const t=game.actors.find(x=>x.id===dest);if(!t||t.dead||t.side!==(friend?'ally':'enemy'))throw Error(friend?'请拖到我方角色轨道':'请拖到敌方目标轨道');const action=scheduleAction(game,a,card.key,start,dest,'hand',false,card.uid);a.hand.splice(ix,1);return action;}
function moveAction(game,actionId,startRelative,targetId){
 if(game.phase!=='planning')throw Error('不是规划阶段');
 const hero=player(game),act=hero.actions.find(a=>a.id===actionId);
 if(!act||act.locked||act.start<game.now)throw Error('只有洗牌前已经放好的动作才被锁定；新牌可在旧空位自由移动');
 if(!Number.isInteger(startRelative)||startRelative<1||startRelative>ROUND)throw Error('目标时间必须在1—10格内');
 const card=CARD[act.card],friend=card.type==='defense'||card.heal||card.buff||card.steady||act.source==='shuffle';
 const dest=targetId||act.target,target=game.actors.find(a=>a.id===dest);
 if(!target||target.dead||target.side!==(friend?'ally':'enemy'))throw Error('目标轨道不符合卡牌类型');
 const start=game.now+startRelative-1,end=start+cLen(card);
 if(start<hero.stunUntil||isBusy(hero,start,end,act))throw Error('此处有其他动作占用');
 const other=hero.actions.filter(a=>a!==act&&!a.canceled&&a.start>=game.now&&a.start<game.now+ROUND);
 if(end>game.now+ROUND&&other.some(a=>a.start>start))throw Error('跨轮卡必须是时间轴最右一张');
 if(other.some(a=>a.start+cLen(CARD[a.card])>game.now+ROUND&&a.start<start))throw Error('其他跨轮动作后不能追加');
 const prevS=act.start,prevT=act.target;act.start=start;act.target=dest;
 if(act.source==='finisher'){
   const status=finisherCondition(game,start,dest,act);
   if(!status.ok){act.start=prevS;act.target=prevT;throw Error(status.message);}
 }
 hero.actions.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));return act;
}
function remove(game,actionId){const a=player(game);const i=a.actions.findIndex(a=>a.id===actionId);if(i<0)throw Error('未找到卡牌');const act=a.actions[i];if(act.locked)throw Error('洗牌前已经放好的卡牌已锁定；新牌可移动、取下，也可填前面的空位');if(act.start<game.now)throw Error('跨回合动作不可移除');if(act.source==='hand')a.hand.push({uid:act.uid,key:act.card});a.actions.splice(i,1);return act;}
function shuffleHand(game,relative){if(game.phase!=='planning')throw Error('不是规划阶段');const a=player(game);const start=game.now+relative-1;const cost=a.hand.length?SHUFFLE_FORCED:SHUFFLE_EMPTY;if(!Number.isInteger(relative)||relative<1||relative>10)throw Error('请选择T1～T10');const prev=a.actions.filter(x=>!x.canceled&&x.start<game.now+ROUND);
const latest=prev.reduce((m,x)=>Math.max(m,x.start+cLen(CARD[x.card])),Math.max(game.now,a.lockedUntil+1));if(start<latest)throw Error('洗牌只能排在已安排动作之后；不能回到过去');if(start>=game.now+ROUND)throw Error('当前回合没有洗牌空间');if(!a.draw.length&&!a.discard.length&&!a.hand.length)throw Error('本轮牌库已被预留，请到下一回合自动补牌');
const c=cost===1?'shuffle1':'shuffle2';// synthetic card definitions fixed time
if(!CARD[c])CARD[c]={name:cost===1?'空手换手':'主动重整',type:'system',w:0,a:cost,r:0,desc:'抽取新手牌'};
const act=scheduleAction(game,a,c,start,a.id,'shuffle',true);
// The shuffle step commits previous cards. Simulate those completed before the draw at the hand boundary.
for(const p of prev){p.locked=true;} // 已排牌仍为预留资源，直到执行结算才进入弃牌堆；避免一轮内重抽重复卡。
if(a.hand.length){for(const c of a.hand)a.discard.push(c);a.hand=[];}
a.lockedUntil=start+cost-1;drawGame(a,game);act.grantedCards=a.hand.map(c=>({...c}));game.stats.shuffle++;return act;
}
function finisherCondition(game,start,destId,excludeAction=null){
 const enemy=game.actors.find(a=>a.id===destId),hero=player(game);
 if(!enemy||enemy.side!=='enemy'||enemy.dead)return{ok:false,message:'请选择有效敌人'};
 const temp=clone(game);const caster=player(temp);
 if(excludeAction)player.actions=player.actions.filter(a=>a.id!==excludeAction.id);
 const projected=start>game.now?simulateRound(temp,{preview:false,stopAt:start-1}):temp;
 const target=projected.actors.find(a=>a.id===destId),who=player(projected);
 if(who.dead)return{ok:false,message:'预计绝杀开始前施术者已倒下'};
 if(!target||target.dead)return{ok:false,message:'绝杀开始前目标已被击败'};
 if(who.energy<FINISHER_NEED)return{ok:false,message:'到该时间格时绝杀能量不足（预计 '+who.energy+'/100）'};
 if(target.hp>Math.ceil(target.maxHp*0.55)&&target.marked<=0&&target.stunUntil<=start)return{ok:false,message:'绝杀启动条件：到该格目标尚未标记/破防，且生命大于55%'};
 return{ok:true,energy:who.energy,targetHp:target.hp,marked:target.marked};
}
function placeFinisher(game,relative,targetId){
 if(game.phase!=='planning')throw Error('不是规划阶段');
 if(!Number.isInteger(relative)||relative<1||relative>ROUND)throw Error('请选择时间格');
 const a=player(game),start=game.now+relative-1;
 if(a.actions.some(x=>!x.canceled&&x.source==='finisher'&&x.start>=game.now))throw Error('本轮已有一张绝杀牌');
 const condition=finisherCondition(game,start,targetId);
 if(!condition.ok)throw Error(condition.message);
 return scheduleAction(game,a,a.fin,start,targetId,'finisher',false);
}
function enemyTarget(game,source){const ls=actorsOf(game,'ally');if(!ls.length)return null;return ls[(game.round+source.id.length)%ls.length].id;}
function enemySchedule(game){const base=game.now;for(const e of actorsOf(game,'enemy')){let pat=e.pattern;if(!pat)continue;let entries=(game.round%2?pat.rotation:pat.patterns)||[];for(const [key,relative]of entries){const start=base+relative-1,c=CARD[key];if(start<e.stunUntil||isBusy(e,start,start+cLen(c)))continue;const target=c.type==='defense'?e.id:enemyTarget(game,e);try{scheduleAction(game,e,key,start,target,'enemy',true);}catch{}}
}}
function scoreCard(card,enemyNext){const c=CARD[card],len=cLen(c);let score=(c.damage||0)*c.a/Math.max(1,len)*1.4+(c.guard||0)/Math.max(1,len)*0.65+(c.heal||0)*0.7+(c.mark||0)*2.1+(c.breakPower||0)*0.65+(c.poisePower||0)*0.3+(c.steady||0)*0.2+(c.bleed||0)*1.7+(c.meter||0)*.25+(c.buff||0)*1.8+(c.bonusCombo||0)*.45+(c.bonusMarked||0)*.38;return score;}
function aiSchedule(game){
 if(game.options?.controlAllies)return; // four real party members are manually planned via camera switching
 // NPC allies use their own clock.  Defensive/healing cards may protect an
 // endangered teammate; never consume the target ally's scheduled time slots.
 const allies=actorsOf(game,'ally'),foes=actorsOf(game,'enemy');
 const threats=[];
 for(const e of foes)for(const action of e.actions){
  if(action.canceled)continue;
  const card=CARD[action.card];if(!card.damage)continue;
  for(let tick=action.start+card.w;tick<action.start+card.w+card.a;tick++){
   for(const target of (card.aoe?allies:allies.filter(a=>a.id===action.target))){
    threats.push({tick,targetId:target.id,damage:card.damage});
   }
  }
 }
 for(const actor of allies.filter(x=>x.id!=='hero')){
  let next=game.now+1,scheduled=0;
  const hand=actor.hand.slice().sort((a,b)=>scoreCard(b.key)-scoreCard(a.key));
  for(const inst of hand){
   const card=CARD[inst.key],friendly=card.type==='defense'||card.heal||card.buff||card.steady;
   const targets=friendly?(card.dodge?[actor]:allies):foes;
   let best=null;
   for(let start=next;start<game.now+ROUND;start++){
    if(start<actor.stunUntil||isBusy(actor,start,start+cLen(card)))continue;
    const active=Array.from({length:card.a},(_,i)=>start+card.w+i);
    for(const target of targets){
     let val=scoreCard(inst.key);
     if(card.guard||card.dodge){
      const incoming=threats.filter(x=>x.targetId===target.id&&active.includes(x.tick));
      const danger=incoming.reduce((sum,x)=>sum+x.damage,0);
      val+=Math.min(danger,card.guard||danger||0)*1.5;
      if(incoming.length===0)val-=11;
      if(target.id==='hero'&&incoming.length>0)val+=3;
     }
     if(card.heal)val+=target.maxHp-target.hp>8?Math.min(14,(target.maxHp-target.hp)*.3):-18;
     if(card.steady)val+=target.poise>target.poiseMax*.45?9:-9;
     if(card.damage){val+=(foes.length>1&&card.aoe?7:0);val+=Math.max(0,12-target.hp)*.2;}
     if(card.mark&&target.marked>0)val-=2;
     if(card.buff&&target.id==='hero')val+=2;
     if(start+card.w>=game.now+ROUND)val-=8;
     if(best===null||val>best.val)best={start,target,val};
    }
   }
   if(!best)continue;
   if(card.type==='defense'&&best.val<4)continue;
   try{
    scheduleAction(game,actor,inst.key,best.start,best.target.id,'ai',true,inst.uid);
    actor.hand=actor.hand.filter(z=>z.uid!==inst.uid);
    scheduled++;next=best.start+cLen(card);
    if(next>=game.now+ROUND||scheduled>=4)break;
   }catch{}
  }
 }
}
function prepareRound(game){if(game.phase==='win'||game.phase==='lost')return;game.phase='planning';game.now=game.round*ROUND;
for(const a of game.actors){a.actions=a.actions.filter(x=>!x.canceled&&x.start+cLen(CARD[x.card])>game.now);a.lockedUntil=game.now-1;if(a.side==='ally'&&!a.dead){drawGame(a,game);if(a.id==='hero'&&a.relics?.includes('round_regen'))a.hp=Math.min(a.maxHp,a.hp+2);if(a.id==='hero'&&a.relics?.includes('meter_regen'))a.energy=Math.min(100,a.energy+5);}}
enemySchedule(game);aiSchedule(game);}
function findDefense(game,actor,t,attackSpeed=0){
 // A shield placed on an ally's small lane protects that ally while occupying caster time.
 return game.actors.flatMap(owner=>owner.actions.filter(a=>!a.canceled&&a.target===actor.id&&a.start<=t&&phase(CARD[a.card],a.start,t)==='active'&&CARD[a.card].type==='defense'&&(a.start+CARD[a.card].w<t||(CARD[a.card].speed||0)>=attackSpeed))).sort((a,b)=>(CARD[b.card].speed||0)-(CARD[a.card].speed||0))[0];
}
function actorHitBuff(actor,c,t){let n=(c.damage||0)+(actor.buffHits>0?actor.buff:0);if(actor.weak>0)n=Math.max(1,n-3);if(actor.side==='enemy'&&actor.enemyDamageScale)n=Math.max(1,Math.round(n*actor.enemyDamageScale));return n;}
function conditionalDamage(card,attacker,target,tick){let extra=0;if(target.marked>0)extra+=card.bonusMarked||0;if(target.bleed>0)extra+=card.bonusBleed||0;if(target.stunUntil>tick)extra+=card.bonusStaggered||0;if(target.hp>0&&target.hp<=target.maxHp*.35)extra+=card.bonusExecute||0;if(attacker.hp<=attacker.maxHp*.45)extra+=card.bonusLowHp||0;if(target.lastHitTick===tick-1)extra+=card.bonusCombo||0;if(target.actions.some(a=>!a.canceled&&phase(CARD[a.card],a.start,tick)==='windup'))extra+=card.bonusWindup||0;return extra;}

function log(game,t,message,kind='info'){const item={t:t+1,text:message,kind};game.events.push(item);if(game.log.length<600)game.log.push(item);}
// Fixed-slot control: only the current action and future actions that overlap
// the recovery window are canceled. No action is shifted. A later non-overlap
// action remains at its original tick, even if a previous action was canceled.
function interrupt(game,target,t,cause,faint=false){
 const duration=faint?FAINT_TICKS:cause==='stagger'?STAGGER_TICKS:BREAK_TICKS;
 const end=t+duration;
 // The original recovery may already be in progress; extending it only cancels
 // newly overlapping actions; it never drags other actions forward.
 target.stunUntil=Math.max(target.stunUntil,end);
 target.poise=0;target.poiseImmuneUntil=Math.max(target.poiseImmuneUntil,target.stunUntil+POISE_GRACE);
 target.breaks++;game.stats.breaks++;
 if(faint)game.stats.faints++;
 if(cause==='stagger'){game.stats.staggers++;target.staggerCount++;}
 let canceled=0;
 for(const ac of target.actions){
  if(ac.canceled)continue;
  const acEnd=ac.start+cLen(CARD[ac.card]);
  if(ac.start<target.stunUntil&&acEnd>t){
   ac.canceled=true;ac.canceledAt=t;ac.cancelReason=cause;canceled++;
   if(game.previewCanceled)game.previewCanceled.push({actorId:target.id,actionId:ac.id,tick:t,start:ac.start,reason:cause});
  }
 }
 game.stats.canceledActions+=canceled;
 const state=faint?'晕倒':cause==='stagger'?'失稳':'破防';
 log(game,t,target.name+' '+state+'！恢复'+duration+'格，只取消重叠的'+canceled+'项动作','break');
}
function applyPoise(game,target,t,damage,blocked,pressure){
 if(target.dead)return;
 // Every connecting hit freezes passive decay. A full guard absorbs most of
 // the impact; a dodge never reaches this function.
 target.lastPoiseHit=t;
 if(t<target.stunUntil||t<target.poiseImmuneUntil)return;
 const impact=Math.ceil(damage*.48)+Math.ceil(blocked*.14)+pressure;
 if(impact<=0)return;
 target.poise=Math.min(target.poiseMax,target.poise+impact);
 if(target.poise>=target.poiseMax)interrupt(game,target,t,'stagger');
}
function simulateRound(input,{preview=false,stopAt=null,collectTrace=false}={}){
 const game=preview?clone(input):input;
 if(collectTrace){game.trace=[];game.previewCanceled=[];}
 game.events=[];const aEnd=game.now+ROUND;
 const endTick=stopAt===null?aEnd-1:Math.min(stopAt,aEnd-1);
 // A projection of the state just before this round starts is valid.
 for(let tick=game.now;tick<=endTick;tick++){
  const active=[];
  const contacted=new Set();
  for(const actor of game.actors){
   if(actor.dead||tick<actor.stunUntil)continue;
   for(const action of actor.actions){
    if(action.canceled||!phase(CARD[action.card],action.start,tick))continue;
    const card=CARD[action.card];
    if(tick===action.start){
     action.started=true;
     if(action.source==='finisher'){
      const enemy=game.actors.find(a=>a.id===action.target);
      if(actor.energy<FINISHER_NEED||!enemy||enemy.dead||enemy.hp>Math.ceil(enemy.maxHp*.55)&&enemy.marked<=0&&enemy.stunUntil<=tick){
       action.canceled=true;log(game,tick,actor.name+' 绝杀发动失败：条件在行动时未满足','info');continue;
      }
      actor.energy-=FINISHER_NEED;game.stats.finishers++;
      log(game,tick,actor.name+' 发动 '+card.name+'！','finish');
     }
    }
    if(phase(card,action.start,tick)==='active')active.push({actor,action,card});
   }
  }
  // Highest-speed actions win genuine same-tick races. Equal-speed hits remain simultaneous.
  const speeds=[...new Set(active.map(x=>x.card.speed||6))].sort((a,b)=>b-a);
  for(const speed of speeds){
   const tier=active.filter(x=>(x.card.speed||6)===speed&&!x.actor.dead&&!x.action.canceled&&tick>=x.actor.stunUntil);
   if(!tier.length)continue;
   for(const {actor,action,card} of tier){
    const first=tick===action.start+card.w;
    const dest=game.actors.find(x=>x.id===action.target);
    if(first&&card.heal&&dest&&!dest.dead){const delta=Math.min(card.heal,dest.maxHp-dest.hp);dest.hp+=delta;game.stats.heal+=delta;if(delta){actor.energy=Math.min(100,actor.energy+(card.charge||0));log(game,tick,actor.name+' 为 '+dest.name+' 回复 '+delta+'生命','heal');}}
    if(first&&card.buff&&dest&&!dest.dead){dest.buff=card.buff;dest.buffHits=2;log(game,tick,actor.name+' 强化 '+dest.name,'skill');}
    if(first&&card.steady&&dest&&!dest.dead){const previous=dest.poise;dest.poise=Math.max(0,dest.poise-card.steady);
      actor.energy=Math.min(100,actor.energy+(card.charge||0));
      log(game,tick,actor.name+' 为 '+dest.name+' 稳固硬直 '+(previous-dest.poise),'skill');}
    if(first&&card.mark&&dest&&!dest.dead){dest.marked+=card.mark;actor.energy=Math.min(100,actor.energy+(card.charge||0));log(game,tick,dest.name+' 获得标记 '+card.mark,'skill');}
    if(first&&card.weak&&dest&&!dest.dead){dest.weak+=card.weak;actor.energy=Math.min(100,actor.energy+(card.charge||0));log(game,tick,dest.name+' 被弱化','skill');}
    if(first&&card.meter){actor.energy=Math.min(100,actor.energy+card.meter);log(game,tick,actor.name+' 积累绝杀能量 '+card.meter,'skill');}
    if(first&&card.cleanse&&dest&&!dest.dead){dest.weak=0;dest.bleed=0;log(game,tick,actor.name+' 清除 '+dest.name+' 的负面状态','heal');}
    if(first&&card.recoil){actor.hp=Math.max(1,actor.hp-card.recoil);log(game,tick,actor.name+' 承受反噬 '+card.recoil,'damage');}
    if(first&&card.bleed&&!card.damage&&dest&&!dest.dead){dest.bleed=Math.min(18,(dest.bleed||0)+card.bleed);log(game,tick,dest.name+' 裂伤+'+card.bleed,'skill');}
   }
   const groups=new Map();
   for(const {actor,action,card} of tier){
    if(!card.damage||actor.dead||action.canceled)continue;
    const targets=card.aoe?actorsOf(game,actor.side==='ally'?'enemy':'ally'):[game.actors.find(x=>x.id===action.target)].filter(Boolean);
    for(const dest of targets){
     if(dest.dead)continue;
     let raw=actorHitBuff(actor,card,tick)+conditionalDamage(card,actor,dest,tick);
     if(actor.side==='ally'&&actor.relics?.includes('attack_plus'))raw+=2;
     if(dest.marked>0)raw+=3;
     const hit={actor,dest,raw,pierce:card.pierce||0,pressure:(card.breakPower||0)+(actor.relics?.includes('break_plus')?2:0),finisher:card.type==='finisher',action,card};
     if(!groups.has(dest.id))groups.set(dest.id,[]);groups.get(dest.id).push(hit);
    }
   }
   const outcomes=[];
   for(const [targetId,list] of groups){
    const dest=game.actors.find(a=>a.id===targetId);if(!dest||dest.dead)continue;
    const defense=findDefense(game,dest,tick,speed),total=list.reduce((sum,h)=>sum+h.raw,0);
    const guardAvailable=defense?defense.guardLeft:0,dodge=defense&&CARD[defense.card].dodge;
    let blocked=0,damage=total,broken=false;
    if(dodge){blocked=total;damage=0;}
    else if(defense){
     const bypass=list.reduce((sum,h)=>sum+Math.min(h.raw,h.pierce),0);
     const guardable=total-bypass,pressure=list.reduce((sum,h)=>sum+h.pressure,0);
     blocked=Math.min(guardAvailable,guardable);damage=total-blocked;
     defense.guardLeft=Math.max(0,guardAvailable-guardable-pressure);
     broken=guardAvailable>0&&guardable+pressure>=guardAvailable;
    }
    outcomes.push({dest,hpBefore:dest.hp,damage,blocked,list,broken,defense,pressure:list.reduce((sum,h)=>sum+(h.card.poisePower||0)+(h.dest.marked>0?2:0)+(h.actor.relics?.includes('poise_strike')?2:0),0)});
   }
   // Equal-speed damage is committed as one batch before breaks cancel future actions.
   for(const {dest,damage,blocked,list} of outcomes){
    dest.hp=Math.max(0,dest.hp-damage);dest.damageTaken+=damage;dest.blocked+=blocked;
    game.stats.damage+=damage;game.stats.blocks+=blocked;
    const shareSum=list.reduce((sum,x)=>sum+x.raw,0);
    for(const hit of list){
     if(dest.marked>0)dest.marked--;
     if(hit.actor.weak>0)hit.actor.weak--;
     if(hit.actor.buffHits>0)hit.actor.buffHits--;
     hit.actor.damageDealt+=Math.round(damage*hit.raw/Math.max(1,shareSum));
     if(hit.actor.side==='ally'&&(damage>0||blocked>0))hit.actor.energy=Math.min(100,hit.actor.energy+(hit.card.charge||0));
     if(damage>0&&hit.card.bleed&&tick===hit.action.start+hit.card.w){dest.bleed=Math.min(18,(dest.bleed||0)+hit.card.bleed);}
    }
    if(blocked&&dest.side==='ally'){dest.energy=Math.min(100,dest.energy+Math.min(12,5+Math.ceil(blocked/3)));if(dest.relics?.includes('calm_bell'))dest.poise=Math.max(0,dest.poise-3);}
    if(damage)log(game,tick,list.map(h=>h.actor.name).join('、')+' → '+dest.name+'：'+damage+'伤害'+(blocked?'（抵消'+blocked+'）':''),'damage');
    if(damage>0){dest.lastHitTick=tick;dest.lastHitBy=list.map(h=>h.actor.id).join(',');}
    else if(blocked)log(game,tick,dest.name+' 格挡 '+blocked,'block');
    if(dest.hp<=0){dest.dead=true;log(game,tick,dest.name+' 被击败','death');}
   }
   for(const result of outcomes){
    if((result.damage>0||result.blocked>0)&&!result.defense?.dodge)contacted.add(result.dest.id);
    if(result.broken&&!result.dest.dead)interrupt(game,result.dest,tick,'guard',false);
    if(!result.broken&&(!result.defense||!CARD[result.defense.card].dodge))
      applyPoise(game,result.dest,tick,result.damage,result.blocked,result.pressure);
    if(result.blocked>0&&result.defense&&CARD[result.defense.card].counter){
     const attacker=result.list.find(h=>!h.actor.dead)?.actor,counter=CARD[result.defense.card].counter;
     if(attacker){attacker.hp=Math.max(0,attacker.hp-counter);attacker.damageTaken+=counter;result.dest.damageDealt+=counter;applyPoise(game,attacker,tick,counter,0,2);
       if(!attacker.hp){attacker.dead=true;log(game,tick,attacker.name+' 被反击击败','death');}
       else log(game,tick,result.dest.name+' 反击 '+attacker.name+' '+counter,'damage');}
    }
   }
   for(const {actor,action,card} of tier){
    if(actor.dead||action.canceled)continue;
    if(card.faint&&tick===action.start+card.w){const dest=game.actors.find(a=>a.id===action.target);if(dest&&!dest.dead)interrupt(game,dest,tick,'status',true);}
   }
   // A finisher earns the special ending only if it delivered the killing blow.
   if(!actorsOf(game,'enemy').length){
    const candidates=outcomes.flatMap(x=>{const total=x.list.reduce((sum,h)=>sum+h.raw,0),finRaw=x.list.filter(h=>h.finisher).reduce((sum,h)=>sum+h.raw,0);const finEffective=x.damage*finRaw/Math.max(1,total);return x.dest.dead&&x.hpBefore>x.damage-finEffective?x.list.filter(h=>h.finisher):[];});
    if(candidates.length)game.finisherBy=candidates[0].actor.id;
   }
   for(const actor of game.actors)if(actor.dead)for(const action of actor.actions)if(action.start+cLen(CARD[action.card])>tick)action.canceled=true;
  }
  // End-of-tick persistent bleeding: dealt only after speed-tier attacks; cap prevents
  // runaway stacking. Poison/bleed is deterministic in preview and execution.
  for(const actor of game.actors){if(actor.dead||!actor.bleed)continue;const loss=Math.min(6,Math.ceil(actor.bleed/2));actor.bleed--;actor.hp=Math.max(0,actor.hp-loss);actor.damageTaken+=loss;game.stats.damage+=loss;log(game,tick,actor.name+' 裂伤 '+loss,'damage');if(!actor.hp){actor.dead=true;for(const ac of actor.actions)if(ac.start+cLen(CARD[ac.card])>tick)ac.canceled=true;log(game,tick,actor.name+' 因裂伤倒下','death');}}
  // Decay at the end of each quiet tick, including during recovery.
  for(const actor of game.actors){if(actor.dead)continue;
    if(!contacted.has(actor.id))actor.poise=Math.max(0,actor.poise-POISE_DECAY);
  }
  if(collectTrace){game.trace.push({tick:tick+1,actors:game.actors.map(a=>({id:a.id,hp:a.hp,energy:a.energy,marked:a.marked,bleed:a.bleed,weak:a.weak,dead:a.dead,stunUntil:a.stunUntil,poise:a.poise,poiseMax:a.poiseMax,poiseImmuneUntil:a.poiseImmuneUntil})),events:game.events.filter(e=>e.t===tick+1).map(e=>({...e}))});}
  if(!actorsOf(game,'enemy').length||!actorsOf(game,'ally').length)break;
 }
 if(stopAt!==null)return game;
 game.turns++;
 for(const a of game.actors.filter(a=>a.side==='ally')){
  for(const act of a.actions){if(!act.uid||act._processed||act.source==='enemy')continue;
   const finished=act.start+cLen(CARD[act.card])<=aEnd||act.canceled;if(!finished)continue;
   act._processed=true;
   const inDraw=a.draw.some(x=>x.uid===act.uid),inDiscard=a.discard.some(x=>x.uid===act.uid),inHand=a.hand.some(x=>x.uid===act.uid);
   if(!(inDraw||inDiscard||inHand)){if(act.canceled&&!act.started)a.hand.push({uid:act.uid,key:act.card});else if(CARD[act.card].exhaust)a.exhaust.push({uid:act.uid,key:act.card});else a.discard.push({uid:act.uid,key:act.card});}
  }
 }
 const enemies=actorsOf(game,'enemy'),team=actorsOf(game,'ally');
 if(!enemies.length){game.phase='win';game.winner='ally';game.score=scoreResult(game);log(game,Math.min(aEnd-1,game.now+9),'战斗结束！结算评分 '+game.score.rank,'win');}
 else if(!team.length){game.phase='lost';game.winner='enemy';game.score=scoreResult(game);}
 else{game.round++;prepareRound(game);}
 return game;
}
function scoreResult(game){const living=game.actors.filter(a=>a.side==='ally'),baseHealth=living.reduce((sum,a)=>sum+a.maxHp,0),remain=living.reduce((sum,a)=>sum+a.hp,0);const efficiency=Math.max(4,20-Math.max(0,game.turns-2)*3);const survival=Math.round(25*remain/baseHealth);const tactics=Math.min(35,8+game.stats.blocks/7+game.stats.breaks*4+game.stats.heal/5);const finisher=game.finisherBy?20:0;const pts=Math.min(100,Math.round(efficiency+survival+tactics+finisher));const rank=pts>=90?'SS':pts>=76?'S':pts>=61?'A':pts>=42?'B':'C';const prob={SS:[8,22,70],S:[20,35,45],A:[38,42,20],B:[55,35,10],C:[75,22,3]}[rank];return{points:pts,rank,rewardProb:prob,finisherBy:game.finisherBy,breakdown:{efficiency,survival,tactics,finisher},range:'仅限当前关卡奖励池'};}
function autoPlan(game,policy='tactical'){if(game.phase!=='planning')return game;const hero=player(game);const enemies=actorsOf(game,'enemy');if(!enemies.length)return game;
let tries=0;while(tries++<12){const cards=hero.hand.slice();if(!cards.length){const next=earliestShuffle(game);if(next>10)break;try{shuffleHand(game,next);}catch{break;}continue;}
let best=null;
for(const inst of cards){const card=CARD[inst.key];for(let relative=1;relative<=10;relative++){
 const start=game.now+relative-1,end=start+cLen(card);if(start<hero.stunUntil||isBusy(hero,start,end))continue;
 const overlapping=hero.actions.some(a=>!a.canceled&&a.start<game.now+10&&a.start+cLen(CARD[a.card])>game.now+10&&a.start<start);if(overlapping)continue;
 const allies=actorsOf(game,'ally'),friendly=card.type==='defense'||card.heal||card.buff||card.steady;
 const options=friendly?(card.dodge?[hero]:allies):enemies;
 const actives=Array.from({length:card.a},(_,i)=>start+card.w+i);
 for(const chosenTarget of options){
  let score=scoreCard(inst.key);
  if(card.guard||card.dodge){
   const incoming=enemies.flatMap(e=>e.actions.filter(a=>!a.canceled&&CARD[a.card].damage&&(a.target===chosenTarget.id||CARD[a.card].aoe)).flatMap(a=>Array.from({length:CARD[a.card].a},(_,i)=>({tick:a.start+CARD[a.card].w+i,damage:CARD[a.card].damage})))).filter(h=>actives.includes(h.tick));
   const protectedDamage=incoming.reduce((x,y)=>x+y.damage,0);
   score+=Math.min(protectedDamage,card.guard||protectedDamage)*1.35;
   if(!incoming.length)score-=12;
   if(chosenTarget.id==='hero'&&incoming.length)score+=2;
  }
  if(card.heal)score+=chosenTarget.maxHp-chosenTarget.hp>8?Math.min(12,(chosenTarget.maxHp-chosenTarget.hp)*.35):-25;
  if(card.steady)score+=chosenTarget.poise>chosenTarget.poiseMax*.55?9:-8;
  if(card.damage){score+=Math.max(0,10-chosenTarget.hp)*.12;if(policy==='novice')score=score*.90+gameRand(game)*4;}
  if(card.mark)score+=5+(chosenTarget.marked>0?0:2);
  if(card.buff&&chosenTarget.id==='hero')score+=2;
  if(end>game.now+10)score-=1.5*(end-(game.now+10));
  if(relative<=2&&policy==='novice')score+=2;
 if(best===null||score>best.score)best={inst,relative,score,target:chosenTarget.id};
 }
 }}
 if(!best)break;
 if(best.score<0)break;
 try{place(game,best.inst.uid,best.relative,best.target);}catch{break;}
 // Avoid overcommitting weak hands; allow artificial idle gaps.
 if(hero.actions.filter(a=>a.start>=game.now).length>=6)break;
}
if(hero.energy>=100&&enemies.some(e=>e.hp<=35)){const e=enemies.find(e=>e.hp<=35);for(let i=1;i<=10;i++){try{placeFinisher(game,i,e.id);break;}catch{}}}
return game;}
function earliestShuffle(game){const a=player(game);const last=a.actions.filter(x=>!x.canceled&&x.start<game.now+ROUND).reduce((m,x)=>Math.max(m,x.start+cLen(CARD[x.card])),Math.max(game.now,a.lockedUntil+1));return last-game.now+1;}
function runAuto(opts,policy='tactical',maxRounds=14){const game=create(opts);while(game.phase==='planning'&&game.round<maxRounds){autoPlan(game,policy);simulateRound(game);}if(game.phase==='planning')game.phase='timeout';return game;}
return{ROUND,HAND,CARD,CLASS,ENCOUNTERS,COLORS,BALANCE,ENCOUNTER_SCALING,FINISHER_NEED,BREAK_TICKS,FAINT_TICKS,STAGGER_TICKS,POISE_DECAY,POISE_GRACE,cLen,phase,predictHit:actorHitBuff,create,place,remove,moveAction,finisherCondition,shuffleHand,placeFinisher,simulateRound,scoreResult,autoPlan,runAuto,earliestShuffle,actorsOf,aiSchedule,clone,player,setControlled};
});

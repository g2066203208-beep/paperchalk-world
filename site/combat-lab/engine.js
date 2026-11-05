/* Paperchalk World: Timegrid Combat Engine v0.4 — browser + Node, deterministic seed. */
(function(root,factory){const result=factory();if(typeof module==='object'&&module.exports)module.exports=result;root.Timegrid=result;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ROUND=10,HAND=4,SHUFFLE_EMPTY=1,SHUFFLE_FORCED=2,BREAK_TICKS=3,FAINT_TICKS=6,FINISHER_NEED=100;
const COLORS={attack:'#d45c62',defense:'#4e95cc',skill:'#4aae99',power:'#9a75c4',special:'#d79b53',finisher:'#e6b968',system:'#81909e'};
const CARD={
 cut:{name:'快速斩击',type:'attack',w:0,a:1,r:1,damage:6,charge:9,desc:'即刻伤害，后摇1'},
 slash:{name:'斧柄横扫',type:'attack',w:1,a:1,r:1,damage:10,charge:12,desc:'10伤害，前后摇各1'},
 heavy:{name:'破甲重斩',type:'attack',w:2,a:1,r:1,damage:18,charge:17,pierce:3,desc:'重伤害，穿透3防御'},
 whirl:{name:'连续回旋',type:'attack',w:1,a:3,r:1,damage:6,charge:5,desc:'连续3格、各5伤害'},
 cleave:{name:'裂地猛击',type:'attack',w:2,a:1,r:1,damage:13,charge:15,breakPower:5,desc:'对防御额外5破防压力'},
 stance:{name:'举斧格挡',type:'defense',w:0,a:3,r:0,guard:13,charge:9,desc:'持续3格，共享13防御值'},
 brace:{name:'谨慎防御',type:'defense',w:0,a:3,r:1,guard:16,charge:9,desc:'持续3格，16防御值'},
 sidestep:{name:'侧身闪避',type:'defense',w:0,a:1,r:1,dodge:true,charge:9,desc:'生效格免疫伤害，后摇1'},
 feint:{name:'佯攻',type:'skill',w:0,a:1,r:1,damage:4,mark:2,charge:8,desc:'4伤害，目标获得2层标记'},
 shot:{name:'快速点射',type:'attack',w:0,a:1,r:1,damage:9,charge:9,desc:'行动快速，1格生效'},
 burst:{name:'三连射',type:'attack',w:1,a:3,r:1,damage:6,charge:5,desc:'连续3格各5伤害'},
 aim:{name:'精确狙击',type:'attack',w:2,a:1,r:1,damage:20,charge:17,pierce:2,desc:'蓄力2格的高伤射击'},
 focus:{name:'目标标记',type:'skill',w:0,a:1,r:1,mark:3,charge:10,desc:'目标获得3层标记，下次受击+3'},
 cover:{name:'烟幕掩护',type:'defense',w:0,a:3,r:1,guard:14,charge:10,desc:'持续3格，共享12防御'},
 bulletguard:{name:'紧急掩体',type:'defense',w:0,a:2,r:0,guard:13,charge:8,desc:'立即掩护2格'},
 suppress:{name:'压制射击',type:'attack',w:1,a:2,r:1,damage:6,breakPower:3,charge:7,desc:'连续2格打击防御'},
 bash:{name:'盾击',type:'attack',w:1,a:1,r:1,damage:12,breakPower:4,charge:12,desc:'更擅长打破敌人防御'},
 guardwall:{name:'坚固防线',type:'defense',w:0,a:4,r:1,guard:21,charge:12,desc:'持续4格，共享23防御'},
 counter:{name:'反击架势',type:'defense',w:0,a:3,r:1,guard:15,counter:8,charge:11,desc:'格挡成功对攻击者反击5'},
 smash:{name:'盾墙冲击',type:'attack',w:2,a:1,r:1,damage:18,breakPower:5,charge:16,desc:'蓄力盾击与破防'},
 rally:{name:'恢复呼吸',type:'skill',w:0,a:1,r:1,heal:7,charge:7,desc:'立即回复7生命'},
 jab:{name:'短距离刺击',type:'attack',w:0,a:1,r:1,damage:8,charge:8,desc:'轻快出手'},
 pulse:{name:'异象冲击',type:'attack',w:1,a:1,r:1,damage:13,charge:12,desc:'单次灵能冲击'},
 echo:{name:'共振波',type:'attack',w:1,a:3,r:1,damage:7,charge:5,desc:'持续三格的波动'},
 rupture:{name:'失衡术',type:'skill',w:1,a:1,r:1,damage:12,breakPower:8,charge:14,desc:'对防御造成额外8压力'},
 remedy:{name:'应急治疗',type:'skill',w:0,a:1,r:1,heal:9,charge:9,desc:'回复9生命'},
 seal:{name:'弱化咒印',type:'skill',w:0,a:1,r:1,weak:2,charge:10,desc:'目标接下来2次攻击各-3'},
 ward:{name:'薄暮防护',type:'defense',w:0,a:3,r:0,guard:16,charge:9,desc:'立刻防御，持续3格'},
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
const CLASS={
 axe:{name:'女主 · 斧卫',icon:'🪓',hp:68,fin:'fin_axe',styles:{
  strike:{name:'裂甲猛攻',description:'慢速重击、主动打穿防御',deck:{cut:2,slash:3,heavy:2,cleave:1,stance:2,feint:1,sidestep:1}},
  tempo:{name:'回旋连击',description:'多段攻击与快速衔接',deck:{cut:3,slash:2,whirl:2,heavy:1,stance:2,feint:1,sidestep:1}}
 }},
 gun:{name:'女二 · 枪手',icon:'🔫',hp:70,fin:'fin_gun',styles:{
  tempo:{name:'快速连射',description:'低前摇与持续射击',deck:{shot:4,burst:2,aim:1,focus:1,cover:2,bulletguard:1,sidestep:1}},
  precision:{name:'精准狙击',description:'标记与蓄力狙击',deck:{shot:3,aim:2,focus:2,suppress:1,cover:2,bulletguard:1,sidestep:1}}
 }},
 guard:{name:'男主 · 守护',icon:'🛡️',hp:78,fin:'fin_guard',styles:{
  fortress:{name:'反击铁壁',description:'厚实格挡与反击',deck:{jab:3,bash:2,guardwall:2,counter:2,smash:2,rally:1}},
  crush:{name:'破势护卫',description:'盾击破防与稳健推进',deck:{jab:3,bash:3,smash:2,guardwall:2,counter:1,rally:1}}
 }},
 mage:{name:'女三 · 调律',icon:'✦',hp:73,fin:'fin_mage',styles:{
  control:{name:'失衡调律',description:'控制防御与弱化敌人',deck:{pulse:3,rupture:2,echo:1,seal:2,ward:2,remedy:1,trance:1}},
  sustain:{name:'共振支援',description:'持续伤害与回复',deck:{pulse:2,echo:3,rupture:1,seal:1,ward:2,remedy:2,trance:1}}
 }}
};
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
function makeActor(id,side,name,hp,fin){return{id,side,name,hp,maxHp:hp,fin,energy:0,dead:false,stunUntil:0,marked:0,weak:0,buff:0,buffHits:0,breaks:0,damageDealt:0,damageTaken:0,blocked:0,kills:0,actions:[],hand:[],draw:[],discard:[],exhaust:[],lockedUntil:-1};}
function addDeck(actor,def,rand){let uid=0;for(const [card,n]of Object.entries(def))for(let i=0;i<n;i++)actor.draw.push({uid:actor.id+'-c'+(uid++),key:card});shuffle(actor.draw,rand);}
function drawHand(actor,rand){while(actor.hand.length<HAND){if(!actor.draw.length){if(!actor.discard.length)break;actor.draw=shuffle(actor.discard.splice(0),rand);}actor.hand.push(actor.draw.pop());}}
function create(opts={}){const options={classId:opts.classId||'axe',styleId:opts.styleId||'strike',encounterId:opts.encounterId||'corridor',team:!!opts.team,seed:opts.seed===undefined?86420:opts.seed};const rand=rng(options.seed);
let cd=CLASS[options.classId],style=cd.styles[options.styleId]||Object.values(cd.styles)[0],actors=[];
const main=makeActor('hero','ally',cd.name,cd.hp,cd.fin);main.energy=opts.demoEnergy===undefined?55:opts.demoEnergy;addDeck(main,style.deck,rand);drawHand(main,rand);actors.push(main);
if(options.team){for(const key of Object.keys(CLASS).filter(x=>x!==options.classId)){const c=CLASS[key];let a=makeActor('ai-'+key,'ally',c.name,c.hp,c.fin);const st=Object.values(c.styles)[0];addDeck(a,st.deck,rand);drawHand(a,rand);actors.push(a);}}
for(const en of ENCOUNTERS[options.encounterId].enemies){const a=makeActor('enemy-'+en.id,'enemy',en.name,Math.round(en.hp*(options.team?1.7:1)),null);a.pattern=en;actors.push(a);}
const game={options,round:0,now:0,phase:'planning',actors,log:[],events:[],winner:null,finisherBy:null,score:null,turns:0,stats:{shuffle:0,attacks:0,blocks:0,breaks:0,faints:0,damage:0,heal:0,playerHit:0,finishers:0},nextUid:0,randState:options.seed>>>0};
// Persist deterministic RNG state through an explicit incrementing generator (not Math.random).
prepareRound(game);return game;
}
function gameRand(game){game.randState=(Math.imul(game.randState,1664525)+1013904223)>>>0;return game.randState/4294967296;}
function drawGame(actor,game){return drawHand(actor,()=>gameRand(game));}
function actorsOf(game,side){return game.actors.filter(a=>a.side===side&&!a.dead);}
function isBusy(actor,start,end,ex=null){if(start<actor.stunUntil)return true;return actor.actions.some(a=>!a.canceled&&a!==ex&&a.start<end&&a.start+cLen(CARD[a.card])>start);}
function scheduleAction(game,actor,card,start,target,source,locked=false,uid=null){const c=CARD[card];if(!c)throw Error('Unknown card '+card);if(start<game.now||start>=game.now+ROUND)throw Error('此回合只能从当前10格内开始');const end=start+cLen(c);if(isBusy(actor,start,end))throw Error('该角色时间格被占用');const already=actor.actions.filter(a=>!a.canceled&&a.start>=game.now&&a.start<game.now+ROUND);
if(end>game.now+ROUND&&already.some(a=>a.start>start))throw Error('跨回合的必须是最右端动作');
if(already.some(a=>a.start+cLen(CARD[a.card])>game.now+ROUND&&a.start<start))throw Error('跨界动作后不能再安排新卡');
const action={id:'a'+(++game.nextUid),card,start,target,source,locked,uid,guardLeft:c.guard||0,canceled:false,started:false,done:false};actor.actions.push(action);actor.actions.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));return action;}
function place(game,uid,startRelative,targetId){if(game.phase!=='planning')throw Error('不是规划阶段');const a=game.actors[0];if(a.dead||a.stunUntil>game.now+startRelative)throw Error('角色失能');if(!Number.isInteger(startRelative)||startRelative<1||startRelative>10)throw Error('请选择T1～T10');const ix=a.hand.findIndex(c=>c.uid===uid);if(ix<0)throw Error('手牌未找到');const card=a.hand[ix],c=CARD[card.key];const start=game.now+startRelative-1;const earliest=Math.max(game.now,a.lockedUntil+1);if(start<earliest)throw Error('洗牌锁定前无法倒填新牌');if(!c)throw Error('无效卡牌');if(c.type==='finisher')throw Error('绝杀为单独槽位');const dest=c.type==='defense'||c.heal||c.buff?a.id:targetId||actorsOf(game,'enemy')[0]?.id;const t=game.actors.find(x=>x.id===dest);if(!t||t.dead)throw Error('请先选择有效目标');const action=scheduleAction(game,a,card.key,start,dest,'hand',false,card.uid);a.hand.splice(ix,1);return action;}
function remove(game,actionId){const a=game.actors[0];const i=a.actions.findIndex(a=>a.id===actionId);if(i<0)throw Error('未找到卡牌');const act=a.actions[i];if(act.locked||act.start<=a.lockedUntil)throw Error('洗牌前排程已锁定');if(act.start<game.now)throw Error('跨回合动作不可移除');if(act.source==='finisher')a.energy=act.meterBefore;else if(act.source==='hand')a.hand.push({uid:act.uid,key:act.card});a.actions.splice(i,1);return act;}
function shuffleHand(game,relative){if(game.phase!=='planning')throw Error('不是规划阶段');const a=game.actors[0];const start=game.now+relative-1;const cost=a.hand.length?SHUFFLE_FORCED:SHUFFLE_EMPTY;if(!Number.isInteger(relative)||relative<1||relative>10)throw Error('请选择T1～T10');const prev=a.actions.filter(x=>!x.canceled&&x.start<game.now+ROUND);
const latest=prev.reduce((m,x)=>Math.max(m,x.start+cLen(CARD[x.card])),Math.max(game.now,a.lockedUntil+1));if(start<latest)throw Error('洗牌只能排在已安排动作之后；不能回到过去');if(start>=game.now+ROUND)throw Error('当前回合没有洗牌空间');
const c=cost===1?'shuffle1':'shuffle2';// synthetic card definitions fixed time
if(!CARD[c])CARD[c]={name:cost===1?'空手换手':'主动重整',type:'system',w:0,a:cost,r:0,desc:'抽取新手牌'};
const act=scheduleAction(game,a,c,start,a.id,'shuffle',true);
// The shuffle step commits previous cards. Simulate those completed before the draw at the hand boundary.
for(const p of prev){p.locked=true;if(p.uid&&!a.discard.some(x=>x.uid===p.uid)&&!a.draw.some(x=>x.uid===p.uid))a.discard.push({uid:p.uid,key:p.card});}
if(a.hand.length){for(const c of a.hand)a.discard.push(c);a.hand=[];}
a.lockedUntil=start+cost-1;drawGame(a,game);act.grantedCards=a.hand.map(c=>({...c}));game.stats.shuffle++;return act;
}
function placeFinisher(game,relative,targetId){if(game.phase!=='planning')throw Error('不是规划阶段');const a=game.actors[0],dest=game.actors.find(x=>x.id===targetId);if(a.energy<FINISHER_NEED)throw Error('绝杀能量不足');if(!dest||dest.dead||dest.side!=='enemy')throw Error('请选择敌人');if(dest.hp>Math.ceil(dest.maxHp*0.55)&&dest.marked<=0&&dest.stunUntil<=game.now)throw Error('绝杀启动条件：目标血量≤55%，或已被标记、处于破防状态');const start=game.now+relative-1;if(start<=a.lockedUntil)throw Error('洗牌前的排程已锁定');const act=scheduleAction(game,a,a.fin,start,targetId,'finisher',false);act.meterBefore=a.energy;a.energy-=100;return act;}
function enemyTarget(game,source){const ls=actorsOf(game,'ally');if(!ls.length)return null;return ls[(game.round+source.id.length)%ls.length].id;}
function enemySchedule(game){const base=game.now;for(const e of actorsOf(game,'enemy')){let pat=e.pattern;if(!pat)continue;let entries=(game.round%2?pat.rotation:pat.patterns)||[];for(const [key,relative]of entries){const start=base+relative-1,c=CARD[key];if(start<e.stunUntil||isBusy(e,start,start+cLen(c)))continue;const target=c.type==='defense'?e.id:enemyTarget(game,e);try{scheduleAction(game,e,key,start,target,'enemy',true);}catch{}}
}}
function scoreCard(card,enemyNext){const c=CARD[card],len=cLen(c);let score=(c.damage||0)*c.a/Math.max(1,len)*1.4+(c.guard||0)/Math.max(1,len)*0.65+(c.heal||0)*0.7+(c.mark||0)*2.1+(c.breakPower||0)*0.65;return score;}
function aiSchedule(game){for(const a of actorsOf(game,'ally').filter(x=>x.id!=='hero')){
  let next=game.now+1,hand=a.hand.slice();const enemyHits=actorsOf(game,'enemy').flatMap(e=>e.actions.filter(act=>CARD[act.card].damage).map(act=>act.start+CARD[act.card].w));
  let order=hand.sort((x,y)=>scoreCard(y.key)-scoreCard(x.key));let scheduled=0;
  for(const inst of order){const c=CARD[inst.key];const possibles=[];for(let t=next;t<game.now+ROUND;t++){
    if(t<a.stunUntil||isBusy(a,t,t+cLen(c)))continue;let val=scoreCard(inst.key);const ticks=Array.from({length:c.a},(_,i)=>t+c.w+i);
    if(c.guard){const covered=ticks.filter(k=>enemyHits.some(h=>Math.abs(k-h)<1)).length;val+=covered*9;if(!covered)val-=8;}
    if(c.heal)val+=(a.maxHp-a.hp>8?7:-15);
    if(c.damage&&t>=game.now+9)val-=6;
    possibles.push({t,val});
  }
  possibles.sort((a,b)=>b.val-a.val||a.t-b.t);if(!possibles.length)continue;
  if(c.type==='defense'&&possibles[0].val<3)continue;
  const start=possibles[0].t;const target=c.type==='defense'||c.heal||c.buff?a.id:actorsOf(game,'enemy')[0]?.id;
  if(!target)continue;try{scheduleAction(game,a,inst.key,start,target,'ai',true,inst.uid);a.hand=a.hand.filter(z=>z.uid!==inst.uid);scheduled++;next=start+cLen(c);if(next>=game.now+ROUND||scheduled>=4)break;}catch{}
  }
}}
function prepareRound(game){if(game.phase==='win'||game.phase==='lost')return;game.phase='planning';game.now=game.round*ROUND;
for(const a of game.actors){a.actions=a.actions.filter(x=>!x.canceled&&x.start+cLen(CARD[x.card])>game.now);a.lockedUntil=game.now-1;if(a.side==='ally'&&!a.dead&&a.id!=='hero'&&a.hand.length===0)drawGame(a,game);}
enemySchedule(game);aiSchedule(game);}
function findDefense(actor,t){return actor.actions.find(a=>!a.canceled&&a.start<=t&&phase(CARD[a.card],a.start,t)==='active'&&CARD[a.card].type==='defense');}
function actorHitBuff(actor,c,t){let n=(c.damage||0)+(actor.buffHits>0?actor.buff:0);if(actor.weak>0)n=Math.max(1,n-3);return n;}
function log(game,t,message,kind='info'){const item={t:t+1,text:message,kind};game.events.push(item);if(game.log.length<600)game.log.push(item);}
function interrupt(game,target,t,cause,faint=false){const duration=faint?FAINT_TICKS:BREAK_TICKS;target.stunUntil=Math.max(target.stunUntil,t+duration);target.breaks++;game.stats.breaks++;if(faint)game.stats.faints++;for(const ac of target.actions){if(!ac.canceled&&(ac.start+cLen(CARD[ac.card])>t)){ac.canceled=true;ac.canceledAt=t;}}
log(game,t,target.name+(faint?' 晕倒':' 破防')+'！后续动作中断，失能'+duration+'格','break');}
function simulateRound(input,{preview=false}={}){const game=preview?clone(input):input;game.events=[];const aEnd=game.now+ROUND;
for(let tick=game.now;tick<aEnd;tick++){
 const active=[],groups=new Map();const alive=game.actors.filter(a=>!a.dead&&tick>=a.stunUntil);
 for(const actor of alive){for(const action of actor.actions){if(action.canceled||!phase(CARD[action.card],action.start,tick))continue;const card=CARD[action.card];if(tick===action.start){action.started=true;if(action.source==='finisher'){game.stats.finishers++;log(game,tick,actor.name+' 发动 '+card.name+'！','finish');}}
 if(phase(card,action.start,tick)==='active')active.push({actor,action,card});}}
 // First activate support actions; defensive states are detected from active tracks regardless of order.
 for(const item of active){const {actor,action,card}=item;const first=tick===action.start+card.w;if(card.heal&&first){const delta=Math.min(card.heal,actor.maxHp-actor.hp);actor.hp+=delta;game.stats.heal+=delta;if(delta){actor.energy=Math.min(100,actor.energy+(card.charge||0));log(game,tick,actor.name+' 回复 '+delta+'生命','heal');}}
 if(card.buff&&first){actor.buff=card.buff;actor.buffHits=2;}
 if(card.mark&&first){const dest=game.actors.find(x=>x.id===action.target);if(dest&&!dest.dead){dest.marked+=card.mark;actor.energy=Math.min(100,actor.energy+(card.charge||0));log(game,tick,dest.name+' 获得标记 '+card.mark,'skill');}}
 if(card.weak&&first){const dest=game.actors.find(x=>x.id===action.target);if(dest&&!dest.dead){dest.weak+=card.weak;actor.energy=Math.min(100,actor.energy+(card.charge||0));}}}
 const hits=[];for(const {actor,action,card}of active){if(!card.damage||!actor||actor.dead)continue;const dest=game.actors.find(x=>x.id===action.target);if(!dest||dest.dead)continue;
 let raw=actorHitBuff(actor,card,tick);if(dest.marked>0)raw+=3;hits.push({actor,dest,raw,pierce:card.pierce||0,pressure:card.breakPower||0,finisher:card.type==='finisher',action,card});}
 // Simultaneous batch. Evaluate all hits from alive-at-tick-start actors before applying HP death.
 for(const h of hits){const k=h.dest.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(h);}
 const outcomes=[];for(const [targetId,list]of groups){const dest=game.actors.find(a=>a.id===targetId);if(!dest||dest.dead)continue;const defense=findDefense(dest,tick);let guardAvailable=defense?defense.guardLeft:0;const dodge=defense&&CARD[defense.card].dodge;const total=list.reduce((s,h)=>s+h.raw,0);
 let protectedAmount=0,damage=0;
 if(dodge){protectedAmount=total;damage=0;}
 else if(defense){const bypass=list.reduce((s,h)=>s+Math.min(h.raw,h.pierce),0),guardable=total-bypass;const pressure=list.reduce((s,h)=>s+h.pressure,0);protectedAmount=Math.min(guardAvailable,guardable);damage=total-protectedAmount;defense.guardLeft=Math.max(0,guardAvailable-guardable-pressure);
 if(guardAvailable>0&&guardable+pressure>=guardAvailable){outcomes.push({type:'break',dest,actor:list[0].actor});}}
 else damage=total;
 outcomes.push({type:'damage',dest,damage,blocked:protectedAmount,list});
 }
 for(const result of outcomes){if(result.type!=='damage')continue;const {dest,damage,blocked,list}=result;dest.hp=Math.max(0,dest.hp-damage);dest.damageTaken+=damage;dest.blocked+=blocked;game.stats.damage+=damage;game.stats.blocks+=blocked;
 for(const h of list){if(h.dest.marked>0)h.dest.marked--;if(h.actor.weak>0)h.actor.weak--;if(h.actor.buffHits>0)h.actor.buffHits--;h.actor.damageDealt+=Math.round(damage*h.raw/Math.max(1,list.reduce((s,x)=>s+x.raw,0)));if(h.actor.side==='ally'&&(damage>0||blocked>0)){h.actor.energy=Math.min(100,h.actor.energy+(h.card.charge||0));}}
 if(blocked&&dest.side==='ally')dest.energy=Math.min(100,dest.energy+Math.min(12,5+Math.ceil(blocked/3)));if(damage)log(game,tick,list.map(h=>h.actor.name).join('、')+' → '+dest.name+'：'+damage+'伤害'+(blocked?'（抵消'+blocked+'）':''),'damage');else if(blocked)log(game,tick,dest.name+' 格挡 '+blocked,'block');
 if(dest.hp<=0){dest.dead=true;log(game,tick,dest.name+' 被击败','death');const winner=list.find(h=>h.finisher);if(winner&&actorsOf(game,'enemy').every(e=>e.dead))game.finisherBy=winner.actor.id;}}
 for(const o of outcomes){if(o.type==='break'&&!o.dest.dead)interrupt(game,o.dest,tick,'guard',false);}
 // Counter-defense retaliates only when it actually absorbed damage; avoids zero-cost passive damage.
 for(const o of outcomes){if(o.type!=='damage'||o.blocked<=0)continue;const defend=findDefense(o.dest,tick),counter=defend?CARD[defend.card].counter||0:0;if(!counter)continue;const attacker=o.list.find(h=>!h.actor.dead)?.actor;if(attacker){attacker.hp=Math.max(0,attacker.hp-counter);attacker.damageTaken+=counter;o.dest.damageDealt+=counter;if(attacker.hp===0){attacker.dead=true;log(game,tick,attacker.name+' 被反击击败','death');}else log(game,tick,o.dest.name+' 反击 '+attacker.name+'，造成'+counter+'伤害','damage');}}
 for(const {actor,action,card} of active){if(actor.dead||action.canceled)continue;if(card.faint&&tick===action.start+card.w){const dest=game.actors.find(a=>a.id===action.target);if(dest&&!dest.dead)interrupt(game,dest,tick,'status',true);}}
 // Meter is earned only from effective damage, real blocking, healing or debuffs; idle guarding gives zero charge.
 for(const actor of game.actors){if(actor.dead){for(const act of actor.actions)if(act.start+cLen(CARD[act.card])>tick)act.canceled=true;}}
 if(!actorsOf(game,'enemy').length||!actorsOf(game,'ally').length)break;
}
game.turns++;
// If a planned refill never completed because of interruption, its forecast hand must not survive.
for(const a of game.actors.filter(a=>a.side==='ally')){
 const aborted=a.actions.filter(x=>x.source==='shuffle'&&x.canceled&&x.canceledAt<x.start+cLen(CARD[x.card])-1);
 const deny=new Set(aborted.flatMap(x=>(x.grantedCards||[]).map(c=>c.uid)));
 if(deny.size){const pool=new Map();for(const x of a.hand.concat(a.draw,a.discard))if(deny.has(x.uid))pool.set(x.uid,x);for(const action of a.actions)if(action.uid&&deny.has(action.uid))pool.set(action.uid,{uid:action.uid,key:action.card});a.hand=a.hand.filter(x=>!deny.has(x.uid));a.draw=a.draw.filter(x=>!deny.has(x.uid));a.discard=a.discard.filter(x=>!deny.has(x.uid));for(const x of pool.values())a.draw.unshift(x);log(game,aEnd-1,a.name+' 的换手被打断，新牌预览撤销','break');}
}
// Finalize cards for completed segments. Reserved cards from interrupted plan go back to hand if possible.
for(const a of game.actors.filter(a=>a.side==='ally')){
 for(const act of a.actions){if(!act.uid||act._processed||act.source==='enemy')continue;
 const finished=act.start+cLen(CARD[act.card])<=aEnd || act.canceled;
 if(!finished)continue;act._processed=true;
 const inDraw=a.draw.some(x=>x.uid===act.uid),inDiscard=a.discard.some(x=>x.uid===act.uid),inHand=a.hand.some(x=>x.uid===act.uid);
 if(!(inDraw||inDiscard||inHand)){if(act.canceled&&!act.started)a.hand.push({uid:act.uid,key:act.card});else a.discard.push({uid:act.uid,key:act.card});}
 }
}
const enemies=actorsOf(game,'enemy'),team=actorsOf(game,'ally');
if(!enemies.length){game.phase='win';game.winner='ally';game.score=scoreResult(game);log(game,Math.min(aEnd-1,game.now+9),'战斗结束！结算评分 '+game.score.rank,'win');}
else if(!team.length){game.phase='lost';game.winner='enemy';game.score=scoreResult(game);}
else{game.round++;prepareRound(game);}
return game;}
function scoreResult(game){const living=game.actors.filter(a=>a.side==='ally'),baseHealth=living.reduce((sum,a)=>sum+a.maxHp,0),remain=living.reduce((sum,a)=>sum+a.hp,0);const efficiency=Math.max(4,20-Math.max(0,game.turns-2)*3);const survival=Math.round(25*remain/baseHealth);const tactics=Math.min(35,8+game.stats.blocks/7+game.stats.breaks*4+game.stats.heal/5);const finisher=game.finisherBy?20:0;const pts=Math.min(100,Math.round(efficiency+survival+tactics+finisher));const rank=pts>=90?'SS':pts>=76?'S':pts>=61?'A':pts>=42?'B':'C';const prob={SS:[8,22,70],S:[20,35,45],A:[38,42,20],B:[55,35,10],C:[75,22,3]}[rank];return{points:pts,rank,rewardProb:prob,finisherBy:game.finisherBy,breakdown:{efficiency,survival,tactics,finisher},range:'仅限当前关卡奖励池'};}
function autoPlan(game,policy='tactical'){if(game.phase!=='planning')return game;const hero=game.actors[0];const enemies=actorsOf(game,'enemy');if(!enemies.length)return game;
let tries=0;while(tries++<12){const cards=hero.hand.slice();if(!cards.length){const next=earliestShuffle(game);if(next>10)break;try{shuffleHand(game,next);}catch{break;}continue;}
let best=null;
for(const inst of cards){const card=CARD[inst.key];for(let relative=1;relative<=10;relative++){
 const start=game.now+relative-1,end=start+cLen(card);if(start<=hero.lockedUntil||start<hero.stunUntil||isBusy(hero,start,end))continue;
 const overlapping=hero.actions.some(a=>!a.canceled&&a.start<game.now+10&&a.start+cLen(CARD[a.card])>game.now+10&&a.start<start);if(overlapping)continue;
 const attackTicks=enemies.flatMap(e=>e.actions.filter(a=>CARD[a.card].damage&&a.target===hero.id).flatMap(a=>Array.from({length:CARD[a.card].a},(_,i)=>a.start+CARD[a.card].w+i)));
 const actives=Array.from({length:card.a},(_,i)=>start+card.w+i);
 let score=scoreCard(inst.key);if(card.guard||card.dodge){const threats=actives.filter(t=>attackTicks.includes(t)).length;score+=threats*(card.dodge?19:13);if(!threats)score-=12;}
 if(card.damage){const alive=enemies[0];score+=Math.max(0,10-alive.hp)*.12;if(policy==='novice')score=score*.5+gameRand(game)*14;}
 if(card.heal)score+=hero.hp<hero.maxHp-8?10:-25;
 if(card.mark)score+=5;
 if(end>game.now+10)score-=1.5*(end-(game.now+10));
 if(relative<=2&&policy==='novice')score+=2;
 if(best===null||score>best.score)best={inst,relative,score};
 }}
 if(!best)break;
 if(best.score<0)break;
 try{place(game,best.inst.uid,best.relative,enemies[0].id);}catch{break;}
 // Avoid overcommitting weak hands; allow artificial idle gaps.
 if(hero.actions.filter(a=>a.start>=game.now).length>=6)break;
}
if(hero.energy>=100&&enemies.some(e=>e.hp<=35)){const e=enemies.find(e=>e.hp<=35);for(let i=1;i<=10;i++){try{placeFinisher(game,i,e.id);break;}catch{}}}
return game;}
function earliestShuffle(game){const a=game.actors[0];const last=a.actions.filter(x=>!x.canceled&&x.start<game.now+ROUND).reduce((m,x)=>Math.max(m,x.start+cLen(CARD[x.card])),Math.max(game.now,a.lockedUntil+1));return last-game.now+1;}
function runAuto(opts,policy='tactical',maxRounds=14){const game=create(opts);while(game.phase==='planning'&&game.round<maxRounds){autoPlan(game,policy);simulateRound(game);}if(game.phase==='planning')game.phase='timeout';return game;}
return{ROUND,HAND,CARD,CLASS,ENCOUNTERS,COLORS,FINISHER_NEED,BREAK_TICKS,FAINT_TICKS,cLen,phase,create,place,remove,shuffleHand,placeFinisher,simulateRound,scoreResult,autoPlan,runAuto,earliestShuffle,actorsOf,clone};
});
/* 猎人 vs 吸血鬼：可复测的 1v1 规则内核。
 * 战场三条路线，预告意图、3 AP、弹药、格挡、银弹封疗。
 * 不依赖 WebGL、DOM、自动出牌或随机怪物攻击。
 */
(function(root){
'use strict';
const MAX_HP=30, BOSS_HP=46, MAX_AMMO=6;
const CARD_LIST=Object.freeze([
 {id:'quick',name:'速射',en:'SNAP SHOT',cost:1,ammo:1,kind:'attack',damage:5,detail:'5伤害 · 同线+2',mark:'✦'},
 {id:'silver',name:'银弹',en:'SILVER ROUND',cost:2,ammo:1,kind:'attack',damage:9,pierce:true,silver:true,detail:'9伤害 · 穿透护盾，封疗2回合',mark:'✧'},
 {id:'focus',name:'稳住呼吸',en:'FOCUS',cost:1,kind:'focus',detail:'蓄力+3 · 下一次射击增伤',mark:'◎'},
 {id:'burst',name:'连发',en:'DOUBLE TAP',cost:2,ammo:2,kind:'attack',damage:12,detail:'12伤害 · 消耗2弹',mark:'⟡'},
 {id:'guard',name:'借势格挡',en:'BRACE',cost:1,kind:'guard',block:6,detail:'获得6点本回合护盾',mark:'▣'},
 {id:'reload',name:'快速装填',en:'RELOAD',cost:1,kind:'reload',detail:'装入3发子弹',mark:'⟳'},
 {id:'critical',name:'破绽狙击',en:'VITAL SHOT',cost:3,ammo:2,kind:'attack',damage:16,detail:'16伤害 · 同线+2',mark:'⊕'},
 {id:'roll',name:'翻滚',en:'EVASION',cost:1,kind:'roll',detail:'移至安全路线 · 获得2护盾',mark:'↝'},
 {id:'mark',name:'识破幻影',en:'REVEAL',cost:1,kind:'focus',detail:'蓄力+3 · 识破敌方行动',mark:'◉'}
]);
const INDEX=Object.freeze(Object.fromEntries(CARD_LIST.map(c=>[c.id,c])));
const ROTATION=['quick','focus','silver','guard','burst','quick','reload','critical','roll','silver','mark','burst','quick','guard','critical','silver','focus','reload','quick','roll','burst','silver','guard','quick'];
const LANES=['左翼','中路','右翼'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function intent(turn,heroLane,vampLane,heroHP){
 const n=(turn-1)%5;
 if(n===0)return {kind:'strike',title:'血爪 · 猎杀',text:'锁定'+LANES[heroLane]+'，结束回合时对该路造成7伤害。换位可闪避。',lane:heroLane,damage:7,symbol:'✕'};
 if(n===1)return {kind:'ward',title:'血雾 · 结界',text:'吸血鬼将获得8护盾，并向相邻路线移动。银弹可以穿透护盾。',lane:vampLane,block:8,symbol:'◇'};
 if(n===2)return {kind:'swarm',title:'夜翼 · 蝠群',text:'覆盖全部路线的5伤害。换位无法闪避，使用格挡减少损失。',lane:null,damage:5,symbol:'✣'};
 if(n===3)return {kind:'drain',title:'深红 · 汲血',text:'锁定'+LANES[heroLane]+'，造成8伤害并恢复生命。银弹可封锁恢复。',lane:heroLane,damage:8,symbol:'◆'};
 return {kind:'flit',title:'残影 · 换位',text:'吸血鬼转移到另一条路线，获得4护盾。趁此调整弹药和站位。',lane:vampLane,block:4,symbol:'↝'};
}
function create(){
 let s,queue=[],cursor=0,used=[],history=[];
 function report(type,text,extra={}){history.unshift({type,text,turn:s.turn,...extra});history=history.slice(0,28);return {type,text,...extra};}
 function draw(count){
  const result=[];let guard=0;
  while(result.length<count&&guard++<50){
   if(cursor>=queue.length){
    const refill=used.length?used.splice(0):ROTATION.slice();
    queue=refill;cursor=0;
   }
   const id=queue[cursor++];
   if(!id)break;
   result.push(id);
  }
  return result;
 }
 function updateIntent(){s.intent=intent(s.turn,s.hunter.lane,s.vampire.lane,s.hunter.hp);}
 function reset(){
  queue=ROTATION.slice();cursor=0;used=[];history=[];
  s={phase:'player',turn:1,ap:3,maxAP:3,plays:0,moves:0,dodges:0,seconds:0,
   hunter:{hp:MAX_HP,maxHp:MAX_HP,block:0,ammo:4,maxAmmo:MAX_AMMO,lane:1,focus:0},
   vampire:{hp:BOSS_HP,maxHp:BOSS_HP,block:0,lane:1,silver:0},
   hand:[],intent:null,result:null};
  s.hand=draw(5);updateIntent();report('start','夜路遭遇 · 猎人对上了血族小公主');
  return snapshot();
 }
 function snapshot(){return JSON.parse(JSON.stringify({...s,history}));}
 function fail(reason){return {ok:false,reason,events:[],state:snapshot()};}
 function done(events){return {ok:true,events,state:snapshot()};}
 function checkEnd(events){
  if(s.vampire.hp<=0){
   s.vampire.hp=0;s.phase='victory';
   s.result={title:'狩猎成功',subtitle:'银色的枪响划破了夜色。'};
   events.push(report('victory','猎人获胜 · 吸血鬼撤离了夜路'));
  }else if(s.hunter.hp<=0){
   s.hunter.hp=0;s.phase='defeat';
   s.result={title:'狩猎失败',subtitle:'天亮之前，还有再试一次的机会。'};
   events.push(report('defeat','猎人倒下 · 本次挑战失败'));
  }
 }
 function move(lane){
  if(s.phase!=='player')return fail('现在不是你的行动阶段');
  if(!Number.isInteger(lane)||lane<0||lane>2)return fail('请选择一条可抵达的路线');
  if(lane===s.hunter.lane)return fail('猎人已经站在这条路线');
  if(s.ap<1)return fail('行动点不足，结束回合即可推进');
  s.ap--;s.moves++;s.hunter.lane=lane;
  const ev=[report('move','猎人移动到'+LANES[lane],{lane})];
  return done(ev);
 }
 function canPlay(id){
  const card=INDEX[id];if(!card)return '没有这张战术牌';
  if(s.phase!=='player')return '目前无法行动';
  if(!s.hand.includes(id))return '这张牌不在手牌里';
  if(s.ap<card.cost)return '行动点不足';
  if(s.hunter.ammo<(card.ammo||0))return '弹药不足 · 可使用装填牌';
  return null;
 }
 function play(id){
  const reason=canPlay(id);if(reason)return fail(reason);
  const c=INDEX[id],h=s.hunter,v=s.vampire,ev=[];
  s.ap-=c.cost;s.plays++;h.ammo-=c.ammo||0;
  const index=s.hand.indexOf(id);s.hand.splice(index,1);used.push(id);
  if(c.kind==='attack'){
   const bonus=h.lane===v.lane?2:-2;
   const amount=Math.max(1,c.damage+bonus+h.focus);
   h.focus=0;
   const blocked=c.pierce?0:Math.min(v.block,amount);
   if(!c.pierce)v.block-=blocked;
   const actual=Math.min(v.hp,Math.max(0,amount-blocked));
   v.hp-=actual;
   if(c.silver)v.silver=2;
   ev.push(report('shot',c.name+' · 命中 '+actual+' 点'+(blocked?'（护盾抵消'+blocked+'）':''),{amount:actual,blocked,from:h.lane,to:v.lane,silver:!!c.silver}));
  }else if(c.kind==='focus'){
   h.focus=clamp(h.focus+3,0,6);ev.push(report('focus','猎人瞄准 · 下次射击额外伤害 +'+h.focus,{amount:h.focus}));
  }else if(c.kind==='guard'){
   h.block+=c.block;ev.push(report('guard','猎人举起掩护 · 护盾 +'+c.block,{amount:c.block}));
  }else if(c.kind==='reload'){
   const n=Math.min(MAX_AMMO-h.ammo,3);h.ammo+=n;ev.push(report('reload','填入 '+n+' 发弹药',{amount:n}));
  }else if(c.kind==='roll'){
   const danger=s.intent.lane;
   const safe=[0,1,2].filter(l=>l!==h.lane&&l!==danger);
   h.lane=safe.length?safe[0]:(h.lane+1)%3;
   h.block+=2;s.moves++;
   ev.push(report('move','猎人翻滚至'+LANES[h.lane]+' · 格挡 +2',{lane:h.lane}));
  }
  checkEnd(ev);return done(ev);
 }
 function endTurn(){
  if(s.phase!=='player')return fail('当前无法结束回合');
  s.phase='enemy';const ev=[],h=s.hunter,v=s.vampire,i=s.intent;
  ev.push(report('enemy-turn','吸血鬼行动 · '+i.title));
  if(i.kind==='strike'||i.kind==='drain'||i.kind==='swarm'){
   const dodged=i.lane!==null&&h.lane!==i.lane;
   if(dodged){
    s.dodges++;ev.push(report('dodge','成功闪避 · '+i.title+'落空',{lane:h.lane}));
   }else{
    const blocked=Math.min(h.block,i.damage);h.block-=blocked;
    const damage=Math.max(0,i.damage-blocked);
    h.hp=Math.max(0,h.hp-damage);
    ev.push(report('hurt',i.title+' · '+(damage?'受到 '+damage+' 伤害':'护盾完全抵挡'),{amount:damage,blocked}));
    if(i.kind==='drain'&&damage>0){
     if(v.silver>0)ev.push(report('sealed','银弹生效 · 阻止汲血恢复'));
     else {const healed=Math.min(4,v.maxHp-v.hp);v.hp+=healed;ev.push(report('heal','吸血鬼恢复 '+healed+' 生命',{amount:healed}));}
    }
   }
  }else if(i.kind==='ward'){
   v.block+=8;v.lane=(v.lane+1)%3;ev.push(report('ward','血雾展开 · 护盾 +8，移至'+LANES[v.lane],{amount:8,lane:v.lane}));
  }else if(i.kind==='flit'){
   v.block+=4;v.lane=(v.lane+2)%3;ev.push(report('ward','暗影闪现 · 护盾 +4，移至'+LANES[v.lane],{amount:4,lane:v.lane}));
  }
  checkEnd(ev);
  if(s.phase==='defeat')return done(ev);
  if(v.silver>0)v.silver--;
  h.block=0;s.turn++;s.ap=s.maxAP;
  // The vampire's temporary defense lasts until the next player attack;
  // ward from earlier cycles does not accumulate without bound.
  if((s.turn-1)%5===0)v.block=Math.max(0,v.block-2);
  if(s.hand.length)used.push(...s.hand);s.hand=draw(5);s.phase='player';
  updateIntent();ev.push(report('turn','第 '+s.turn+' 回合 · 新抽取5张战术牌'));
  return done(ev);
 }
 reset();
 return Object.freeze({reset,snapshot,move,play,endTurn,canPlay,cardList:CARD_LIST,lanes:LANES});
}
root.PaperchalkHunterVampireDuel=Object.freeze({version:'1.0.0',create,CARD_LIST,LANES});
})(window);
/* Paperchalk World — deterministic shared chain-combat rules.
 * Both factions use exactly the same damage, guard, mark and follow-up system.
 * Pure state engine: no DOM, IndexedDB or L2D side effects.
 */
(function(root,factory){
'use strict';
const api=factory();
if(root)root.PaperWorldCombat=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const VERSION=1;
const cap=(x,a,b)=>Math.max(a,Math.min(b,x));
const FRIENDS=Object.freeze([
 {id:'hero',name:'女主',hp:74,assist:6,role:'主攻'},
 {id:'partner',name:'女二',hp:62,assist:5,role:'连携'}
]);
const FOES=Object.freeze([
 {id:'shade',name:'窥视者',hp:38,assist:4,role:'游击'},
 {id:'echo',name:'回响体',hp:42,assist:5,role:'标记'},
 {id:'rift',name:'裂隙体',hp:46,assist:5,role:'防守'}
]);
const CARD_TYPES=Object.freeze({
 cut:{name:'迅斩',owner:'hero',type:'attack',cost:1,power:9,icon:'slash',text:'造成 9 伤害；队友有响应次数则追击。'},
 pierce:{name:'破势',owner:'hero',type:'attack',cost:2,power:16,expose:1,icon:'break',text:'造成 16 伤害，令敌人易伤；可连携。'},
 mark:{name:'锁定',owner:'partner',type:'attack',cost:1,power:5,mark:2,icon:'mark',text:'造成 5 伤害并施加 2 层标记；队友追击增伤。'},
 chase:{name:'追袭',owner:'partner',type:'attack',cost:1,power:8,icon:'slash',text:'造成 8 伤害；队友有响应次数则追击。'},
 quick:{name:'迎击',owner:'hero',type:'guard',cost:1,shield:12,icon:'guard',target:'friend',text:'为一位队员获得 12 护盾。'},
 cover:{name:'掩护',owner:'partner',type:'guard',cost:1,shield:10,icon:'guard',target:'friend',reaction:1,text:'获得 10 护盾，并恢复其 1 次连携响应。'},
 link:{name:'呼应',owner:'partner',type:'tactic',cost:1,shield:4,icon:'link',target:'all-friends',reaction:1,text:'全队获得 4 护盾，并各恢复 1 次连携响应。'},
 heal:{name:'整备',owner:'hero',type:'heal',cost:2,heal:10,icon:'heal',target:'friend',text:'为一位队员恢复 10 生命。'}
});
const DEFAULT_DECK=Object.freeze([
 'cut','cut','cut','cut','pierce','pierce','quick','quick','heal',
 'mark','mark','mark','chase','chase','chase','cover','cover','link'
]);
function makeUnit(item,side){
 if(!item||typeof item.id!=='string'||!item.id.trim()||
    typeof item.name!=='string'||!Number.isFinite(item.hp)||item.hp<=0)
  throw new Error('Invalid fighter');
 return {id:item.id,name:item.name,side,hp:item.hp,maxHp:item.hp,
   shield:0,mark:0,expose:0,assist:cap(Number(item.assist)||4,1,30),
   role:item.role||'',rp:1};
}
function create(opts={}){
 const allies=(opts.allies||FRIENDS).map(x=>makeUnit(x,'ally'));
 const enemies=(opts.enemies||FOES).map(x=>makeUnit(x,'enemy'));
 if(!allies.length||!enemies.length||[...allies,...enemies].length>10)
  throw new Error('Invalid squad size');
 const ids=new Set([...allies,...enemies].map(x=>x.id));
 if(ids.size!==allies.length+enemies.length)throw new Error('Fighter IDs must be unique');
 const byId=id=>[...allies,...enemies].find(u=>u.id===id);
 const roster=side=>side==='ally'?allies:enemies;
 const living=side=>roster(side).filter(x=>x.hp>0);
 const playable=side=>living(side).length>0;
 const listeners=new Set();
 let state,seed=(Number.isInteger(opts.seed)?opts.seed:20261103)>>>0;
 if(seed===0)seed=1;
 const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 const shuffle=xs=>{for(let i=xs.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;};
 function emit(event){
  const entry={id:++state.sequence,round:state.round,...event};
  state.events.push(entry);
  if(state.events.length>90)state.events.shift();
 }
 function checkEnd(){
  if(!playable('enemy')){state.phase='won';emit({kind:'result',text:'战斗胜利'});return true;}
  if(!playable('ally')){state.phase='lost';emit({kind:'result',text:'队伍全灭'});return true;}
  return false;
 }
 const hasEnded=()=>state.phase==='won'||state.phase==='lost';
 function draw(n=1){
  let count=0;
  while(count<n&&state.hand.length<7){
   if(!state.drawPile.length){
    if(!state.discard.length)break;
    state.drawPile=shuffle(state.discard.splice(0));
    emit({kind:'shuffle',text:'弃牌堆洗回牌库'});
   }
   const card=state.drawPile.pop();
   // A downed ally's cards cannot strand the hand.
   if(!byId(CARD_TYPES[card.type]?.owner)?.hp){
     state.exhaust.push(card);continue;
   }
   state.hand.push(card);count++;
  }
  return count;
 }
 function unitSummary(u){return {...u,alive:u.hp>0};}
 function snapshot(){
  return {
   version:VERSION,round:state.round,phase:state.phase,energy:state.energy,
   maxEnergy:state.maxEnergy,allies:allies.map(unitSummary),enemies:enemies.map(unitSummary),
   hand:state.hand.map(c=>({...c,...CARD_TYPES[c.type],cardId:c.type})),
   drawCount:state.drawPile.length,discardCount:state.discard.length,exhaustCount:state.exhaust.length,
   intents:state.intents.map(x=>({...x})),events:state.events.map(x=>({...x})),
   sequence:state.sequence,stats:{...state.stats}
  };
 }
 function notify(){
  const snap=snapshot();
  for(const listener of listeners)try{listener(snap)}catch(e){/* isolate UI */ }
  return snap;
 }
 function subscribe(fn){
  if(typeof fn!=='function')throw new TypeError('subscribe callback required');
  listeners.add(fn);return()=>listeners.delete(fn);
 }
 function damage(attacker,target,raw,kind,chainId){
  if(!target||target.hp<=0)return;
  const bonus=target.expose?Math.ceil(raw*.25):0;
  const total=Math.max(0,Math.round(raw+bonus));
  const absorbed=Math.min(target.shield,total);
  target.shield-=absorbed;
  const done=Math.min(target.hp,total-absorbed);
  target.hp-=done;
  state.stats[attacker.side==='ally'?'allyDamage':'enemyDamage']+=done;
  emit({kind,side:attacker.side,actor:attacker.id,target:target.id,
    amount:done,absorbed,chainId,shield:target.shield,hp:target.hp,
    text:attacker.name+' → '+target.name+' '+done+(absorbed?'（格挡 '+absorbed+'）':'')});
  if(target.hp===0)emit({kind:'down',side:target.side,actor:target.id,
    text:target.name+' 倒下'});
 }
 function shield(actor,target,amount,kind='guard'){
  if(target.hp<=0)return;
  const gain=cap(Math.round(amount),0,99);
  target.shield=cap(target.shield+gain,0,99);
  emit({kind,side:actor.side,actor:actor.id,target:target.id,amount:gain,
    text:actor.name+' → '+target.name+' 护盾 +'+gain});
 }
 function restoreReaction(actor,target,n){
  if(target.hp<=0)return;
  const prior=target.rp;
  target.rp=cap(target.rp+n,0,2);
  if(target.rp>prior)emit({kind:'ready',side:actor.side,actor:target.id,amount:target.rp-prior,
    text:target.name+' 连携响应已就绪'});
 }
 function mark(actor,target,n){
  if(target.hp<=0)return;
  target.mark=cap(target.mark+n,0,4);
  emit({kind:'mark',side:actor.side,actor:actor.id,target:target.id,amount:n,
    text:target.name+' 获得标记 ×'+target.mark});
 }
 function reactionChain(actor,target,chainId){
  if(target.hp<=0)return;
  // Shared by BOTH sides, including three- or four-member teams.
  // Follow-ups never recursively trigger other follow-ups: hard combo limit.
  let count=0;
  for(const mate of living(actor.side)){
   if(mate.id===actor.id||mate.rp<=0||target.hp<=0)continue;
   mate.rp--;
   const marked=target.mark>0?3:0;
   const boost=target.expose>0?1:0;
   damage(mate,target,mate.assist+marked+boost,'assist',chainId);
   state.stats[mate.side==='ally'?'allyAssists':'enemyAssists']++;
   if(target.hp>0&&target.mark>0)target.mark=Math.max(0,target.mark-1);
   count++;
   if(count>=4)break;
  }
  if(count)emit({kind:'chain',side:actor.side,actor:actor.id,target:target.id,
    count,chainId,text:(actor.side==='ally'?'我方':'敌方')+' '+(count+1)+' 人连携'});
 }
 function attack(actor,target,power,options={}){
  if(actor.hp<=0||target.hp<=0)return;
  const chainId=++state.chainId;
  damage(actor,target,power,'attack',chainId);
  if(target.hp>0&&options.mark)mark(actor,target,options.mark);
  if(target.hp>0&&options.expose){
   target.expose=cap(target.expose+options.expose,0,3);
   emit({kind:'expose',side:actor.side,actor:actor.id,target:target.id,
     text:target.name+' 易伤'});
  }
  if(target.hp>0&&options.combo!==false)reactionChain(actor,target,chainId);
 }
 function buildIntents(){
  const result=[];
  const targets=living('ally');
  if(!targets.length)return result;
  for(let i=0;i<enemies.length;i++){
   const actor=enemies[i];if(actor.hp<=0)continue;
   const choice=(state.round+i)%4;
   let kind,power=0;
   if(i===1&&choice!==3){kind='mark';power=4;}
   else if(choice===3){kind='guard';}
   else{kind='strike';power=actor.id==='shade'?7:actor.id==='rift'?8:6;}
   // Published intent is stable for this full player turn.
   // Choice of target is explicit and telegraphed; no RNG is used after reveal.
   const target=targets[(state.round+i)%targets.length];
   result.push({actorId:actor.id,targetId:kind==='guard'?actor.id:target.id,
     kind,power,label:kind==='guard'?'守势':kind==='mark'?'标记突袭':'攻击',
     willCombo:kind!=='guard'&&living('enemy').some(u=>u.id!==actor.id)});
  }
  return result;
 }
 function startPlayerRound(first=false){
  if(!first)state.round++;
  if(checkEnd())return;
  for(const u of living('ally'))u.rp=1;
  for(const u of living('ally'))u.shield=0; // guards persist through the enemy turn
  for(const u of living('enemy'))u.expose=Math.max(0,u.expose-1);
  state.phase='player';state.energy=state.maxEnergy;
  state.intents=buildIntents();
  draw(5);
  emit({kind:'round',side:'ally',text:'第 '+state.round+' 回合 · 我方行动'});
 }
 function reset(){
  seed=(Number.isInteger(opts.seed)?opts.seed:20261103)>>>0||1;
  const units=[...(opts.allies||FRIENDS),...(opts.enemies||FOES)];
  for(const u of [...allies,...enemies]){
   const item=units.find(x=>x.id===u.id);
   u.hp=u.maxHp=item.hp;u.shield=0;u.mark=0;u.expose=0;u.rp=1;
  }
  const deck=(opts.deck||DEFAULT_DECK);
  if(!Array.isArray(deck)||deck.some(x=>!CARD_TYPES[x]))throw new Error('Invalid deck');
  const ownerPresent=id=>allies.some(a=>a.id===id);
  if(deck.some(id=>!ownerPresent(CARD_TYPES[id].owner)))throw new Error('Card owner missing from ally squad');
  const drawPile=shuffle(deck.map((type,index)=>({uid:'c'+index,type})));
  state={round:1,phase:'player',energy:4,maxEnergy:4,hand:[],drawPile,
    discard:[],exhaust:[],events:[],sequence:0,chainId:0,intents:[],
    stats:{allyDamage:0,enemyDamage:0,allyAssists:0,enemyAssists:0}};
  startPlayerRound(true);
  return notify();
 }
 function eligibleTargets(card){
  if(!card)return [];
  const kind=card.target||(card.type==='attack'?'foe':card.type==='tactic'?'all-friends':'friend');
  if(kind==='foe')return living('enemy').map(x=>x.id);
  if(kind==='friend')return living('ally').map(x=>x.id);
  if(kind==='self')return byId(card.owner)?.hp>0?[card.owner]:[];
  if(kind==='all-friends')return ['all'];
  return [];
 }
 function canPlay(uid,target){
  if(state.phase!=='player')return {ok:false,reason:'当前不是出牌阶段'};
  const cardInHand=state.hand.find(x=>x.uid===uid);
  if(!cardInHand)return {ok:false,reason:'卡牌不在手中'};
  const card=CARD_TYPES[cardInHand.type],actor=byId(card.owner);
  if(!actor||actor.hp<=0)return {ok:false,reason:'出牌队员已经倒下'};
  if(state.energy<card.cost)return {ok:false,reason:'能量不足'};
  const targets=eligibleTargets(card);
  if(target===undefined||target===null)return {ok:false,reason:'选择目标',targets};
  if(!targets.includes(target))return {ok:false,reason:'无效目标',targets};
  const help=card.type==='attack'?living('ally').filter(x=>x.id!==actor.id&&x.rp>0).map(x=>x.id):[];
  return {ok:true,targets,helpers:help};
 }
 function play(uid,target){
  const verdict=canPlay(uid,target);
  if(!verdict.ok)return {...verdict,snapshot:snapshot()};
  const i=state.hand.findIndex(x=>x.uid===uid);
  const played=state.hand.splice(i,1)[0];
  const card=CARD_TYPES[played.type],actor=byId(card.owner);
  state.energy-=card.cost;state.discard.push(played);
  emit({kind:'card',side:'ally',actor:actor.id,target,cardId:played.type,
    text:actor.name+' · '+card.name});
  if(card.type==='attack'){
   attack(actor,byId(target),card.power,{mark:card.mark||0,expose:card.expose||0});
  }else if(card.type==='guard'){
   const unit=byId(target);
   shield(actor,unit,card.shield);
   if(card.reaction)restoreReaction(actor,unit,card.reaction);
  }else if(card.type==='heal'){
   const unit=byId(target);
   const healed=Math.min(unit.maxHp-unit.hp,card.heal);
   unit.hp+=healed;
   emit({kind:'heal',side:'ally',actor:actor.id,target:unit.id,amount:healed,
     text:actor.name+' → '+unit.name+' 回复 '+healed});
  }else if(card.type==='tactic'){
   for(const unit of living('ally')){
    shield(actor,unit,card.shield);
    restoreReaction(actor,unit,card.reaction);
   }
  }
  checkEnd();
  return {ok:true,played:played.type,snapshot:notify()};
 }
 function endTurn(){
  if(state.phase!=='player')return {ok:false,reason:'不能结束当前阶段',snapshot:snapshot()};
  state.discard.push(...state.hand.splice(0));
  state.phase='enemy';
  emit({kind:'round',side:'enemy',text:'敌方行动'});
  for(const u of living('enemy'))u.rp=1;
  for(const u of living('enemy'))u.shield=0;
  for(const u of living('ally'))u.expose=Math.max(0,u.expose-1);
  const actions=state.intents.slice();
  for(const intent of actions){
   if(hasEnded())break;
   const actor=byId(intent.actorId);
   if(!actor||actor.hp<=0)continue;
   if(intent.kind==='guard')shield(actor,actor,10);
   else{
    // A fallen original target is redirected to another living ally.
    // The redirection is logged explicitly, never invisible.
    const target=byId(intent.targetId)?.hp>0?
      byId(intent.targetId):living('ally')[0];
    if(!target)break;
    emit({kind:'intent',side:'enemy',actor:actor.id,target:target.id,
      text:actor.name+' · '+intent.label});
    attack(actor,target,intent.power,{mark:intent.kind==='mark'?2:0});
   }
   checkEnd();
  }
  if(!hasEnded())startPlayerRound();
  return {ok:true,snapshot:notify()};
 }
 reset();
 return Object.freeze({
  VERSION,FRIENDS,FOES,CARD_TYPES,DEFAULT_DECK,
  snapshot,subscribe,play,canPlay,endTurn,reset,eligibleTargets
 });
}
return Object.freeze({VERSION,FRIENDS,FOES,CARD_TYPES,DEFAULT_DECK,create});
});
// Seven-seat blackjack-table tactical card battle: gameplay-only logic.
// Whitebox: deliberately independent from older 3x3 forest and 3D dispenser.
// The collection roster owns cards; no unsummoned character can draw.
export const SEAT_COUNT=7;
export const HAND_LIMIT=10;
export const ACTION_CATALOG=Object.freeze([
 {key:'strike',name:'突击',cost:1,kind:'damage',power:3,description:'对目标造成 3 点伤害'},
 {key:'guard',name:'架势',cost:1,kind:'shield',power:3,description:'使目标获得 3 点护盾'},
 {key:'heal',name:'恢复',cost:1,kind:'heal',power:4,description:'使目标恢复 4 点生命'},
 {key:'heavy',name:'强攻',cost:2,kind:'damage',power:6,description:'对目标造成 6 点伤害'},
 {key:'ritual',name:'援护',cost:1,kind:'shield',power:2,description:'使目标获得 2 点护盾'}
]);
const fail=message=>({ok:false,message});
const cloneUnit=(entry,index,side)=>({
 id:`${side}:${entry.id}`,rosterIndex:index,name:entry.name,
 hp:side==='ally'?18+index%3*2:11+index%3*3,
 maxHp:side==='ally'?18+index%3*2:11+index%3*3,
 shield:0,side,art:entry.art||'',alive:true
});
export function makeDuel(heroes,enemies){
 if(!Array.isArray(heroes)||heroes.length!==7||!Array.isArray(enemies)||enemies.length!==7)
  throw Error('Two complete seven-character rosters required');
 if([...heroes,...enemies].some(x=>!x.id||!x.name||!x.art))
  throw Error('Every character must use its real name, ID and artwork');
 const enemySeats=Array(7).fill(null);
 [1,3,5].forEach(i=>enemySeats[i]=cloneUnit(enemies[i],i,'enemy'));
 const decks=Object.fromEntries(heroes.map((h,i)=>[h.id,{
  ownerId:h.id,ownerName:h.name,unlocked:false,drawPile:Array.from({length:10},(_,j)=>({
   id:`${h.id}:action:${j}`,ownerId:h.id,ownerName:h.name,
   ...ACTION_CATALOG[(j+i)%ACTION_CATALOG.length]
  })),discard:[]
 }]));
 return {
  version:1,round:1,phase:'player',energy:4,maxEnergy:4,
  allySeats:Array(7).fill(null),enemySeats,heroes:heroes.map(x=>({...x,deployed:false})),
  enemies:enemies.map(x=>({...x})),decks,hand:[],history:[],turnEvents:[],
  result:null,seq:0
 };
}
const group=(s,side)=>side==='ally'?s.allySeats:side==='enemy'?s.enemySeats:null;
const live=(s,side)=>group(s,side).filter(x=>x&&x.alive&&x.hp>0);
const message=(s,msg)=>{s.history.unshift(msg);s.history.length=Math.min(14,s.history.length);return {ok:true,message:msg,state:s};};
const canPlay=s=>s.phase==='player'&&!s.result;
function checkEnd(s){
 if(live(s,'enemy').length===0){s.result='victory';s.phase='done';return '胜利！七席牌桌上的敌人已经被击败'}
 if(!live(s,'ally').length&&s.heroes.every(h=>h.deployed)){
  s.result='defeat';s.phase='done';return '失败。所有已取得人物均已失去战斗能力'
 }
 return null;
}
export function deployHero(s,heroId,index){
 if(!canPlay(s))return fail('目前不是可部署阶段');
 if(!Number.isInteger(index)||index<0||index>=SEAT_COUNT)return fail('必须选择己方七个卡位之一');
 const hero=s.heroes.find(x=>x.id===heroId);
 if(!hero)return fail('人物卡不在当前队伍里');
 if(hero.deployed)return fail('这张人物卡已经上场');
 if(s.allySeats[index])return fail('这个卡位已经有角色');
 if(s.energy<1)return fail('行动点不足，结束回合恢复');
 const unit=cloneUnit(hero,s.heroes.indexOf(hero),'ally');
 s.allySeats[index]=unit;hero.deployed=true;s.energy--;
 s.decks[hero.id].unlocked=true;
 s.turnEvents=[{type:'deploy',side:'ally',index,unitId:unit.id}];
 return message(s,`${hero.name}进入第${index+1}席：专属卡组已解锁（点击牌堆手动抽牌）`);
}
export function drawFromHero(s,heroId){
 if(!canPlay(s))return fail('当前不能抽牌');
 const deck=s.decks[heroId];
 if(!deck||!deck.unlocked)return fail('先打出这张人物卡，才能使用其专属卡组');
 if(!live(s,'ally').some(x=>x.id===`ally:${heroId}`))return fail('人物已经退场，专属卡组暂不可使用');
 if(s.hand.length>=HAND_LIMIT)return fail('共享手牌已达到 10 张上限');
 if(!deck.drawPile.length){
  if(!deck.discard.length)return fail('这名人物的卡组已用尽');
  deck.drawPile=deck.discard.splice(0).reverse();
 }
 const card=deck.drawPile.shift();s.hand.push(card);
 s.turnEvents=[{type:'draw',ownerId:heroId,cardId:card.id}];
 return message(s,`${deck.ownerName}抽到「${card.name}」· 共享手牌 ${s.hand.length}/10`);
}
function applyDamage(unit,power){
 const blocked=Math.min(unit.shield,power);
 unit.shield-=blocked;
 const damage=Math.min(unit.hp,Math.max(0,power-blocked));
 unit.hp-=damage;unit.alive=unit.hp>0;
 return {blocked,damage};
}
export function playAction(s,cardId,side,index){
 if(!canPlay(s))return fail('现在不能打出行动牌');
 if(!Number.isInteger(index)||index<0||index>=SEAT_COUNT||!group(s,side))
  return fail('请点击敌方或己方的有效人物卡位');
 const handIndex=s.hand.findIndex(x=>x.id===cardId),card=s.hand[handIndex];
 if(!card)return fail('请先从已解锁的角色牌堆摸牌');
 const own=live(s,'ally').find(x=>x.id===`ally:${card.ownerId}`);
 if(!own)return fail('所属人物已退场，这张卡目前不能用');
 const target=group(s,side)[index];
 if(!target||!target.alive||target.hp<=0)return fail('空卡位或倒下的人物不能成为目标');
 if(s.energy<card.cost)return fail(`行动点不足，需要 ${card.cost} 点`);
 s.energy-=card.cost;s.hand.splice(handIndex,1);
 const ev={type:card.kind,cardId,side,index,ownerId:card.ownerId,amount:card.power};
 let result='';
 if(card.kind==='damage'){
  const hit=applyDamage(target,card.power);
  ev.amount=hit.damage;ev.blocked=hit.blocked;
  result=`造成 ${hit.damage} 伤害${hit.blocked?`（护盾吸收 ${hit.blocked}）`:''}`;
 }else if(card.kind==='shield'){
  target.shield=Math.min(99,target.shield+card.power);
  result=`增加 ${card.power} 护盾`;
 }else if(card.kind==='heal'){
  const healed=Math.max(0,Math.min(card.power,target.maxHp-target.hp));
  target.hp+=healed;result=`恢复 ${healed} 生命`;
 }
 s.decks[card.ownerId].discard.push(card);
 const ending=checkEnd(s);
 s.turnEvents=[ev];
 return message(s,`${card.ownerName}·${card.name} → ${side==='enemy'?'敌':'我'}方${index+1}席 ${target.name}：${result}${ending?' · '+ending:''}`);
}
export function endRound(s){
 if(!canPlay(s))return fail('现在不能结束回合');
 if(!live(s,'ally').length)return fail('请先部署至少一名队友');
 const events=[],allies=live(s,'ally');
 // The enemy never displays fake next-turn intentions, matching legacy rules.
 for(const [index,unit] of s.enemySeats.entries()){
  if(!unit||!unit.alive||!allies.some(x=>x.alive))continue;
  const pool=allies.filter(x=>x.alive);
  const target=pool[(index+s.round)%pool.length];
  const power=1+(index%3);
  const hit=applyDamage(target,power);
  const targetIndex=s.allySeats.indexOf(target);
  events.push({type:'damage',side:'ally',index:targetIndex,
   attacker:unit.name,amount:hit.damage,blocked:hit.blocked});
 }
 s.round++;s.maxEnergy=4;s.energy=s.maxEnergy;
 s.turnEvents=events;
 const ending=checkEnd(s);
 return message(s,`第 ${s.round} 回合开始。敌方完成 ${events.length} 次行动；行动点重置为 4。${ending?' '+ending:''} 不自动摸牌。`);
}
export function getPlayableTarget(s,cardId,side,index){
 const c=s.hand.find(x=>x.id===cardId);
 const target=group(s,side)?.[index];
 return !!(canPlay(s)&&c&&target&&target.alive&&target.hp>0&&
   s.energy>=c.cost&&live(s,'ally').some(x=>x.id===`ally:${c.ownerId}`));
}
export function getSnapshot(s){
 return {round:s.round,energy:s.energy,phase:s.phase,result:s.result,
  seats:{ally:s.allySeats.map(x=>x?.name||null),enemy:s.enemySeats.map(x=>x?.name||null)},
  hand:s.hand.map(x=>({id:x.id,ownerId:x.ownerId,name:x.name})),
  decks:Object.fromEntries(Object.entries(s.decks).map(([id,d])=>[id,{unlocked:d.unlocked,remaining:d.drawPile.length,discard:d.discard.length}])),
  health:{ally:s.allySeats.map(x=>x?.hp??null),enemy:s.enemySeats.map(x=>x?.hp??null)}};
}

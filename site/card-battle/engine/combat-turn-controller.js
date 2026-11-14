/* Paperchalk combat turn controller.
 * Reusable and headless: no document, no WebGL, no forest names/art.
 * Composition: a level rules engine + choreography + manual card-hand
 * adapter + scene callbacks. The renderer only maps these events to art.
 *
 * Phases: deploy -> player actions and voluntary draws -> endTurn ->
 * sequenced enemy intents -> next player turn (NO AUTO DRAW).
 */
(function(root){'use strict';
function create(options={}){
 const {level,animation,hand,locateCard,pointFor,onChanged=()=>{},
  onDamage=()=>{},onGuard=()=>{},onDefeated=()=>{},onFinished=()=>{},
  onNotice=()=>{},canAct=()=>true}=options;
 if(!level||!animation||!hand||!locateCard||!pointFor)
  throw Error('Combat controller requires level, animation, hand and card pose adapter');
 let nextEnemyAt=0;
 const currentHand=()=>typeof hand==='function'?hand():hand;
 const actorPoint=id=>{
  const card=locateCard(id);
  return card?pointFor(card):null;
 };
 function emitChange(){onChanged(level.snapshot());}
 function reset(){
  animation.reset();nextEnemyAt=0;
 }
 function endTurn(at){
  if(level.phase!=='active'||animation.busy||!canAct())return false;
  const result=level.endTurn();
  if(!result.ok)return false;
  currentHand()?.clearSelection?.();
  nextEnemyAt=at+.30;
  emitChange();onNotice('敌方回合 · 敌人依次行动');
  return true;
 }
 function playerAttack(attackerId,targetId,at){
  if(level.phase!=='active'||animation.busy||!canAct())return false;
  const actor=level.getUnit(attackerId),target=level.getUnit(targetId);
  const from=actorPoint(attackerId),to=actorPoint(targetId);
  if(!actor?.alive||!actor.deployed||actor.side!=='ally'||
   !target?.alive||!target.deployed||target.side!=='enemy'||!from||!to)return false;
  const cards=currentHand();
  if(!cards?.selected)return false;
  const selected=cards.snapshot.hand.find(c=>c.instance===cards.selected);
  if(!selected)return false;
  // Consume once, after all target/busy checks pass, and resolve HP on impact.
  const action=cards.consumeForTarget(targetId);
  if(!action)return false;
  const started=animation.start({
   attackerId,targetId,from,to,kind:'attack',at,
   damage:action.damage,
   onImpact:()=>{
    const result=level.actAttack(attackerId,targetId,{
     power:action.damage,block:action.block,pierce:action.pierce
    });
    if(!result.ok)return;
    onDamage({attackerId,targetId,...result});
    if(result.blockGained)onGuard({unitId:attackerId,block:result.blockGained});
    if(result.defeated)onDefeated({unitId:targetId,side:'enemy'});
    emitChange();
   },
   onFinish:()=>{
    emitChange();
    if(level.phase==='victory')onFinished(level.snapshot());
    else onNotice('出牌结算完成 · 可继续摸牌、出牌或结束回合');
   }
  });
  if(started)emitChange();
  return started;
 }
 function update(at){
  animation.update(at);
  if(level.phase!=='enemy'||animation.busy||!canAct()||at<nextEnemyAt)return;
  const state=level.snapshot(),queue=state.enemyQueue;
  if(!queue.length){
   const turn=level.beginPlayerTurn();
   if(turn.ok){
    // Tell the card model that the round advanced; it only moves used cards
    // into discard. It does NOT create hand cards or auto-draw.
    currentHand()?.nextTurn?.();
    emitChange();
    onNotice('第 '+turn.turn+' 回合 · 点击职业牌盒自行摸牌');
   }
   return;
  }
  const id=queue[0],unit=level.getUnit(id);
  if(!unit?.alive){
   level.resolveEnemyAction(id);nextEnemyAt=at+.12;emitChange();return;
  }
  const intent=level.enemyIntents().find(i=>i.unitId===id);
  const from=actorPoint(id);
  const candidates=state.units.filter(u=>u.side==='ally'&&u.alive&&u.deployed)
   .sort((a,b)=>Math.abs(a.c-unit.c)-Math.abs(b.c-unit.c)||
    Math.abs(a.r-unit.r)-Math.abs(b.r-unit.r)||a.c-b.c);
  const victim=candidates[0],guard=intent?.kind==='guard';
  const to=guard?from:actorPoint(victim?.id);
  if(!from||!to){
   level.resolveEnemyAction(id);nextEnemyAt=at+.12;emitChange();return;
  }
  animation.start({
   attackerId:id,targetId:guard?id:victim.id,
   from,to,kind:guard?'guard':'attack',damage:intent?.damage||0,at,
   onImpact:()=>{
    const result=level.resolveEnemyAction(id);
    if(!result.ok)return;
    if(result.kind==='guard')onGuard({unitId:id,block:result.block});
    else if(result.targetId){
     onDamage({attackerId:id,targetId:result.targetId,...result});
     if(result.defeated)onDefeated({unitId:result.targetId,side:'ally'});
    }
    emitChange();
   },
   onFinish:()=>{
    nextEnemyAt=at+.24;
    emitChange();
    if(level.phase==='defeat')onFinished(level.snapshot());
   }
  });
  emitChange();
 }
 return Object.freeze({
  reset,endTurn,playerAttack,update,
  get busy(){return animation.busy||level.phase==='enemy';},
  get snapshot(){return{phase:level.phase,turn:level.turn,
   animation:animation.snapshot,nextEnemyAt};}
 });
}
root.PaperchalkCombatTurnController=Object.freeze({version:'1.0.0',create});
})(window);

/* Headless typed card effect executor.
 * Player action cards are registered data; rules live in one reusable service.
 * Browser scene code only chooses targets, places 3D meshes and shows feedback.
 * No DOM, no animations, no forest-specific role/name branches.
 */
(function(root){'use strict';
function create({level,hand,facilities,catalog}={}){
 if(!level||typeof hand!=='function'||!facilities||!catalog)
  throw Error('Card effect engine requires level, hand, facilities and registry');
 const current=()=>hand();
 const fail=reason=>({ok:false,reason});
 function selected(){
  const h=current();
  if(!h||level.phase!=='active'||!h.selectedCard?.())return null;
  const c=h.selectedCard();
  const actor=level.getUnit(c.ownerId);
  if(!actor?.deployed||!actor?.alive||actor.side!=='ally')return null;
  const registered=catalog.get(c.id);
  if(!registered||registered.type!==c.type)return null;
  return {card:c,actor};
 }
 function playUtility(){
  const action=selected();if(!action)return fail('no-action-card');
  const {card,actor}=action;
  if(!['guard','resource'].includes(card.type))return fail('not-utility');
  const h=current();
  const consumed=h.consumeSelected(card.type);
  if(!consumed)return fail('not-in-hand');
  if(card.type==='guard'){
   const block=level.grantBlock(actor.id,card.block||0);
   return {ok:true,type:'guard',ownerId:actor.id,card,block};
  }
  const essence=card.essence,amount=facilities.grant(essence,card.amount||0);
  return{ok:true,type:'resource',ownerId:actor.id,card,essence,amount};
 }
 function placeFacility(slot,tiles){
  const action=selected();if(!action)return fail('no-action-card');
  const {card}=action;
  if(card.type!=='facility')return fail('not-facility');
  const registered=catalog.get(card.id);
  if(registered.characterId!==card.characterId||
   registered.profession!==card.profession)return fail('wrong-owner');
  const placed=facilities.place(card.id,slot,tiles);
  if(!placed.ok)return placed;
  const consumed=current().consumeSelected('facility');
  if(!consumed){
   facilities.remove(placed.facility.id);
   return fail('not-in-hand');
  }
  return{ok:true,type:'facility',card:consumed,facility:placed.facility};
 }
 // Generic player's offensive card can interact with destructible scenery.
 // The permission belongs to the CHARACTER's role/identity, not a special
 // resource card. The same attack instance can target an enemy OR a tree.
 function attackFacility(id){
  const action=selected();if(!action)return fail('no-action-card');
  const {card,actor}=action;
  if(card.type!=='attack')return fail('not-an-attack');
  if(actor.characterId!=='farmer-warrior-loli-lumberjack')
   return fail('character-cannot-chop');
  const target=facilities.snapshot.facilities.find(f=>f.id===id);
  if(!target)return fail('unknown-facility');
  if(target.cardId!=='plant-tree')return fail('not-a-tree');
  const power=Number.isFinite(card.power)?Math.floor(card.power):0;
  if(power<=0)return fail('invalid-attack');
  const consumed=current().consumeSelected('attack');
  if(!consumed)return fail('not-in-hand');
  const result=facilities.damage(id,power);
  if(!result.ok)return result;
  const gained=result.destroyed?facilities.grant('material',3):0;
  return {ok:true,type:'facility-attack',ownerId:actor.id,
   card:consumed,target,damage:result.damage,remainingHp:result.remainingHp,
   destroyed:result.destroyed,essence:'material',amount:gained};
 }
 function interactFacility(id){
  const action=selected();if(!action)return fail('no-action-card');
  const {card}=action;
  const target=facilities.snapshot.facilities.find(f=>f.id===id);
  if(!target)return fail('unknown-facility');
  const rule=catalog.get(card.id)?.interactions?.find(x=>x.cardId===target.cardId);
  if(!rule)return fail('no-card-interaction');
  if(!rule.destroy||!rule.grant||!rule.grant.essence||!Number.isInteger(rule.grant.amount))
   return fail('invalid-interaction');
  const consumed=current().consumeSelected(card.type);
  if(!consumed)return fail('not-in-hand');
  facilities.remove(id);
  const gained=facilities.grant(rule.grant.essence,rule.grant.amount);
  return{ok:true,type:'interaction',card:consumed,target,consumedFacilityId:id,
   essence:rule.grant.essence,amount:gained};
 }
 return Object.freeze({playUtility,placeFacility,attackFacility,interactFacility,
  selected,get catalog(){return catalog.snapshot;},version:'1.1.0-attack-environment'});
}
root.PaperchalkCardEffectEngine=Object.freeze({version:'1.1.0',create});
})(window);

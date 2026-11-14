/* Headless card-hand adapter. All draws are initiated by clicking one of seven
 * independent physical class boxes. One shared 10-card cap; no automatic deals.
 * Current placeholder card faces are independent of engine draw rules.
 */
(function(root){
'use strict';
const factory=root.PaperchalkProfessionDecks;
if(!factory)throw Error('Profession model missing');
const units=root.__forestLevelDebug?.state?.units||[];
const activeJobs=units.filter(u=>u.side==='ally').map(u=>u.role).filter(Boolean);
const model=factory.create({maxHand:10,prototypeAllClasses:true,
 unlocked:activeJobs.length?activeJobs:['warrior'],seed:618231});
let selectedInstance=null;
function snapshot(){return model.snapshot();}
function selectedCard(){return snapshot().hand.find(c=>c.instance===selectedInstance)||null;}
function selectCard(instance){
 if(!snapshot().hand.some(c=>c.instance===instance))return false;
 selectedInstance=selectedInstance===instance?null:instance;
 return true;
}
function draw(profession,opts){
 if(root.__forestLevelDebug?.state.phase!=='active')return {ok:false,reason:'not-player-turn'};
 if(root.__forestCombat?.busy)return{ok:false,reason:'combat-animation'};
 return model.draw(profession,opts);
}
function consumeForTarget(targetId){
 if(!selectedInstance||root.__forestLevelDebug?.state.phase!=='active'||root.__forestCombat?.busy)return null;
 const card=selectedCard();
 if(!card){selectedInstance=null;return null;}
 const result=model.play(selectedInstance);
 if(!result.ok)return null;
 selectedInstance=null;
 return{damage:result.card.power,card:result.card,targetId,
  block:result.card.id==='guard-blow'?2:0,
  pierce:result.card.id==='sunder'};
}
function reset(){selectedInstance=null;return model.reset();}
function onDeployment(){
 selectedInstance=null;
 // No automatic hand: the player must click the physical class box to draw.
 return model.reset();
}
function nextTurn(){
 if(root.__forestLevelDebug?.state?.phase!=='active')return false;
 selectedInstance=null;
 return model.nextTurn(); // no auto draw, no forced discard of unused cards
}
root.__forestHand=Object.freeze({
 consumeForTarget,reset,onDeployment,nextTurn,selectCard,draw,
 clearSelection(){selectedInstance=null;},
 remainingCards:profession=>model.remainingCards(profession),
 get selected(){return selectedInstance;},
 get snapshot(){return model.snapshot();},
 // Compatibility for existing tests and older tutorial shortcuts.
 selectTop(profession){
  const card=snapshot().hand.find(c=>c.profession===profession);
  return card?selectCard(card.instance):false;
 }
});
})(window);

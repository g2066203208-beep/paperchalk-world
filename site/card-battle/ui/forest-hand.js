/* Headless card-hand adapter: only acquired, level-owned character cards
 * generate physical piles. Slots are packed left-to-right; the other
 * seven-bay locations stay empty and noninteractive.
 */
(function(root){
'use strict';
const factory=root.PaperchalkProfessionDecks;
if(!factory)throw Error('Profession model missing');
const units=root.__forestLevelDebug?.state?.units||[];
const ownedCharacters=units.filter(u=>u.side==='ally').map(u=>({
 id:u.id,name:u.name,profession:u.role,characterId:u.characterId,
 portrait:root.PaperchalkCharacterRegistry?.get(u.characterId)?.portrait||null
}));
const model=factory.create({maxHand:10,ownedCharacters,seed:618231});
let selectedInstance=null;
function snapshot(){return model.snapshot();}
function selectedCard(){return snapshot().hand.find(c=>c.instance===selectedInstance)||null;}
function selectCard(instance){
 if(root.__forestLevelDebug?.state.phase!=='active'||root.__forestCombat?.busy)return false;
 if(!snapshot().hand.some(c=>c.instance===instance))return false;
 selectedInstance=selectedInstance===instance?null:instance;
 return true;
}
function draw(profession,opts){
 if(root.__forestLevelDebug?.state.phase!=='active')return {ok:false,reason:'not-player-turn'};
 if(root.__forestCombat?.busy)return{ok:false,reason:'combat-animation'};
 return model.draw(profession,opts);
}
function consumeSelected(expectedType){
 if(root.__forestLevelDebug?.state.phase!=='active'||root.__forestCombat?.busy)return null;
 const card=selectedCard();
 if(!card||card.type!==expectedType)return null;
 const result=model.play(card.instance);
 if(!result.ok)return null;
 selectedInstance=null;return result.card;
}
function consumeForTarget(targetId){
 if(!selectedInstance||root.__forestLevelDebug?.state.phase!=='active'||root.__forestCombat?.busy)return null;
 const card=selectedCard();
 if(!card){selectedInstance=null;return null;}
 if(card.type&&card.type!=='attack')return null;
 const result=model.play(selectedInstance);
 if(!result.ok)return null;
 selectedInstance=null;
 return{damage:result.card.power,card:result.card,targetId,
  block:0,
  shape:result.card.shape||'single',
  pierce:result.card.id==='sunder'};
}
function reset(){selectedInstance=null;return model.reset();}
function onDeployment(){
 // Deployment never resets cards already drawn from the character's own pile.
 selectedInstance=null;
 return model.snapshot();
}
function nextTurn(){
 if(root.__forestLevelDebug?.state?.phase!=='active')return false;
 selectedInstance=null;
 return model.nextTurn(); // no auto draw, no forced discard of unused cards
}
root.__forestHand=Object.freeze({
 consumeForTarget,consumeSelected,selectedCard,reset,onDeployment,nextTurn,selectCard,draw,
 clearSelection(){selectedInstance=null;},
 remainingCards:ownerId=>model.remainingCards(ownerId),
 get selected(){return selectedInstance;},
 get snapshot(){return model.snapshot();},
 // Compatibility for existing tests and older tutorial shortcuts.
 selectTop(profession){
  const card=snapshot().hand.find(c=>c.profession===profession);
  return card?selectCard(card.instance):false;
 }
});
})(window);
